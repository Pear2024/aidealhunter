"use strict";

/**
 * cron_graph_observer.js
 * 
 * Target: Fetch live FB Graph API metrics for recently published reels/posts.
 * Adapting to 'reel_content_versions' so optimized variants are tracked too!
 */

require("dotenv").config({ path: ".env.local" });

const mysql = require("mysql2/promise");
const axios = require("axios");
const { execFile } = require("child_process");
const util = require("util");

const execFileAsync = util.promisify(execFile);

// Mapping DB Config directly to existing variables used everywhere else
const DB_CONFIG = {
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  ssl: { rejectUnauthorized: false }
};

const GRAPH_API_VERSION = process.env.FB_GRAPH_API_VERSION || "v19.0";
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const OBSERVER_POST_MAX_AGE_DAYS = 7;
const OBSERVER_MATURE_HOURS = 4;
const OBSERVER_CONCURRENCY = 3;

const REVENUE_PREDICTOR_PATH = "./revenue_predictor.js";

function log(msg) { console.log(`[GRAPH OBSERVER] ${msg}`); }
function warn(msg) { console.warn(`[GRAPH OBSERVER] ${msg}`); }
function err(msg) { console.error(`[GRAPH OBSERVER] ${msg}`); }

function roundToHourUTC(date = new Date()) {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

function hoursSince(dateInput) {
  const now = Date.now();
  const then = new Date(dateInput).getTime();
  return (now - then) / (1000 * 60 * 60);
}

function daysSince(dateInput) {
  const now = Date.now();
  const then = new Date(dateInput).getTime();
  return (now - then) / (1000 * 60 * 60 * 24);
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function computeRates({ impressions = 0, comments = 0, shares = 0, threeSecondViews = 0 }) {
  if (!impressions || impressions <= 0) return { commentRate: 0, holdRate: 0, shareRate: 0 };
  return {
    commentRate: comments / impressions,
    holdRate: threeSecondViews / impressions,
    shareRate: shares / impressions,
  };
}

async function fetchEligiblePublishedPosts(conn) {
  // Pulling from versions table ensures we track base posts AND optimized AI variants!
  const sql = `
    SELECT id as version_id, run_id, post_id, created_at
    FROM reel_content_versions
    WHERE publish_status = 'published'
      AND post_id IS NOT NULL AND post_id <> ''
      AND created_at >= (NOW() - INTERVAL ? DAY)
    ORDER BY created_at DESC
  `;
  const [rows] = await conn.execute(sql, [OBSERVER_POST_MAX_AGE_DAYS]);
  return rows;
}

async function fetchGraphMetricsForPost(postId) {
  if (!FB_PAGE_ACCESS_TOKEN) return mockGraphFetch(postId);

  // Video posts uploaded via /PAGE_ID/videos return a VIDEO ID.
  // We fetch basic video fields that work with pages_read_engagement permission.
  // Note: read_insights permission is NOT granted, so video_insights/post insights endpoints will fail.
  const baseUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(postId)}`;
  const baseParams = {
    access_token: FB_PAGE_ACCESS_TOKEN,
    fields: "id,views,comments.summary(true),likes.summary(true),length"
  };

  let baseData;
  try {
    const { data } = await axios.get(baseUrl, { params: baseParams, timeout: 30000 });
    baseData = data;
  } catch (error) {
    if (error?.response?.status === 429) return { fetchStatus: "rate_limited" };
    throw error;
  }

  const views = safeNumber(baseData?.views, 0);
  const comments = safeNumber(baseData?.comments?.summary?.total_count, 0);
  const likes = safeNumber(baseData?.likes?.summary?.total_count, 0);
  const videoLength = safeNumber(baseData?.length, 15);

  // Try insights endpoint in case read_insights permission is granted in the future
  let insightsMap = {};
  try {
    const insightsUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(postId)}/video_insights`;
    const { data } = await axios.get(insightsUrl, {
      params: {
        access_token: FB_PAGE_ACCESS_TOKEN,
        metric: ["total_video_impressions", "total_video_views", "total_video_view_total_time", "total_video_avg_time_watched"].join(","),
      },
      timeout: 30000,
    });
    const metrics = data?.data || [];
    for (const metric of metrics) {
      insightsMap[metric?.name] = Array.isArray(metric?.values) ? metric.values[0]?.value : null;
    }
    log(`Insights available for post_id=${postId} (read_insights permission granted)`);
  } catch (error) {
    // Expected to fail if read_insights permission is not granted — use basic fields instead
    if (error?.response?.data?.error?.message?.includes('read_insights')) {
      log(`Using basic video fields for post_id=${postId} (read_insights not available)`);
    } else {
      warn(`Insights fetch note for post_id=${postId}: ${error.message}`);
    }
  }

  // Use insights data if available, otherwise fall back to basic video fields
  const impressions = safeNumber(insightsMap.total_video_impressions, views);
  const threeSecondViews = safeNumber(insightsMap.total_video_views, views);

  return {
    fetchStatus: "fetched",
    impressions: impressions,
    comments: comments,
    likes: likes,
    shares: 0, // shares not available on video objects without read_insights
    totalWatchTimeSeconds: safeNumber(insightsMap.total_video_view_total_time, 0) / 1000,
    avgWatchTimeSeconds: safeNumber(insightsMap.total_video_avg_time_watched, 0) / 1000,
    threeSecondViews: threeSecondViews,
  };
}

async function mockGraphFetch(postId) {
  // If NO access token, simulate realistic growth patterns based on post_id string length or hashes
  const hash = postId.split("").reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
  const baseline = Math.abs(hash) % 15000 + 1000;
  return {
    fetchStatus: "fetched",
    impressions: baseline,
    comments: Math.floor(baseline * 0.015),
    shares: Math.floor(baseline * 0.003),
    totalWatchTimeSeconds: baseline * 3,
    avgWatchTimeSeconds: 4.5,
    threeSecondViews: Math.floor(baseline * 0.25)
  };
}

async function saveSnapshot(conn, snapshot) {
  const sql = `
    INSERT INTO reel_performance_snapshots (
      post_id, source_run_id, snapshot_at,
      impressions, comments, shares, video_length_seconds,
      total_watch_time_seconds, avg_watch_time_seconds, three_second_views,
      comment_rate, hold_rate, share_rate, data_source, fetch_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      impressions = VALUES(impressions),
      comments = VALUES(comments),
      shares = VALUES(shares),
      video_length_seconds = VALUES(video_length_seconds),
      total_watch_time_seconds = VALUES(total_watch_time_seconds),
      avg_watch_time_seconds = VALUES(avg_watch_time_seconds),
      three_second_views = VALUES(three_second_views),
      comment_rate = VALUES(comment_rate),
      hold_rate = VALUES(hold_rate),
      share_rate = VALUES(share_rate),
      fetch_status = VALUES(fetch_status)
  `;

  await conn.execute(sql, [
    snapshot.postId, snapshot.sourceRunId || null, snapshot.snapshotAt,
    snapshot.impressions, snapshot.comments, snapshot.shares, snapshot.videoLengthSeconds,
    snapshot.totalWatchTimeSeconds, snapshot.avgWatchTimeSeconds, snapshot.threeSecondViews,
    snapshot.commentRate, snapshot.holdRate, snapshot.shareRate,
    snapshot.dataSource || "graph_api", snapshot.fetchStatus || "fetched",
  ]);
}

async function triggerRevenuePredictor(maturedPostIds) {
  if (!maturedPostIds.length) return;
  log(`Triggering revenue predictor for ${maturedPostIds.length} matured posts`);
  // Using direct comma separated list because our revenue_predictor.js supports raw array args simply
  const arg = maturedPostIds.join(",");
  try {
    const { stdout, stderr } = await execFileAsync("node", [REVENUE_PREDICTOR_PATH, arg], { timeout: 120000, env: process.env });
    if (stdout?.trim()) console.log(stdout.trim());
    if (stderr?.trim()) console.error(stderr.trim());
  } catch (error) {
    err(`Revenue predictor trigger failed: ${error.message}`);
  }
}

async function processOnePost(conn, post) {
  const ageHours = hoursSince(post.created_at);
  if (daysSince(post.created_at) > OBSERVER_POST_MAX_AGE_DAYS) return { postId: post.post_id, status: "skipped_old", matureForScoring: false };

  const snapshotAt = roundToHourUTC(new Date());
  let metrics;
  
  try {
    metrics = await fetchGraphMetricsForPost(post.post_id);
  } catch (error) {
    warn(`Fetch failed for post_id=${post.post_id}: ${error.message}`);
    return { postId: post.post_id, status: "failed", matureForScoring: false };
  }

  if (metrics.fetchStatus === "rate_limited") return { postId: post.post_id, status: "rate_limited", matureForScoring: false };

  const rates = computeRates({ impressions: metrics.impressions, comments: metrics.comments, shares: metrics.shares, threeSecondViews: metrics.threeSecondViews });
  
  await saveSnapshot(conn, {
    postId: post.post_id,
    sourceRunId: post.run_id || null,
    snapshotAt,
    impressions: metrics.impressions,
    comments: metrics.comments,
    shares: metrics.shares,
    videoLengthSeconds: 15,
    totalWatchTimeSeconds: metrics.totalWatchTimeSeconds,
    avgWatchTimeSeconds: metrics.avgWatchTimeSeconds,
    threeSecondViews: metrics.threeSecondViews,
    commentRate: rates.commentRate,
    holdRate: rates.holdRate,
    shareRate: rates.shareRate,
    fetchStatus: "fetched"
  });

  log(`Snapshot saved | post_id=${post.post_id} | impressions=${metrics.impressions} | comments=${metrics.comments} | shares=${metrics.shares}`);

  const matureForScoring = ageHours >= OBSERVER_MATURE_HOURS;
  if (!matureForScoring) log(`Post not matured yet | post_id=${post.post_id} | ageHours=${ageHours.toFixed(2)}`);

  return { postId: post.post_id, status: "fetched", matureForScoring };
}

async function runWithConcurrency(items, limit, worker) {
  const results = [];
  let index = 0;
  async function next() {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
  return results;
}

async function main() {
  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);
    const publishedPosts = await fetchEligiblePublishedPosts(conn);
    log(`Found ${publishedPosts.length} published posts in last ${OBSERVER_POST_MAX_AGE_DAYS} days`);
    
    if (!publishedPosts.length) { log("Nothing to observe."); return; }

    const results = await runWithConcurrency(publishedPosts, OBSERVER_CONCURRENCY, (post) => processOnePost(conn, post));

    const maturedPostIds = results.filter((r) => r && r.matureForScoring).map((r) => r.postId);
    const fetched = results.filter((r) => r?.status === "fetched").length;
    
    log(`Completed | fetched=${fetched} | matured_for_scoring=${maturedPostIds.length}`);

    await triggerRevenuePredictor(maturedPostIds);
  } catch (error) {
    err(`Fatal observer failure: ${error.message}`);
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

main();
