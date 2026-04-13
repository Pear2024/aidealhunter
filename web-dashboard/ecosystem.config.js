module.exports = {
  apps: [
    {
      name: "health-reels-engine",
      script: "./generate_health_reel.js",
      cron_restart: "0 */4 * * *",
      autorestart: false,
      watch: false,
      time: true,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      }
    },
    {
      name: "graph-observer",
      script: "./cron_graph_observer.js",
      cron_restart: "15 * * * *", // รันหลังชั่วโมง 15 นาที
      autorestart: false,
      watch: false,
      time: true,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      }
    },
    {
      name: "revenue-predictor",
      script: "./revenue_predictor.js",
      cron_restart: "30 * * * *", // รันหลัง observer 15 นาที (เผื่อไว้กรณีไม่ถูก trigger ตรงๆ)
      autorestart: false,
      watch: false,
      time: true,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      }
    },
    {
      name: "promote-winners",
      script: "./promote_winners.js",
      cron_restart: "45 23 * * *", // กวาดโพสต์ยิงแอดตอนก่อนเที่ยงคืนวันละรอบ
      autorestart: false,
      watch: false,
      time: true,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      }
    }
  ]
};
