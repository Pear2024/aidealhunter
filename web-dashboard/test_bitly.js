import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function getStats() {
    const headers = { 'Authorization': `Bearer ${process.env.BITLY_ACCESS_TOKEN}`, 'Content-Type': 'application/json' };
    
    // 1. Get User/Group Info
    const userRes = await fetch('https://api-ssl.bitly.com/v4/user', { headers });
    const userData = await userRes.json();
    console.log("User Data:", userData.default_group_guid);
    
    // 2. List Bitlinks
    const groupGuid = userData.default_group_guid;
    const linksRes = await fetch(`https://api-ssl.bitly.com/v4/groups/${groupGuid}/bitlinks`, { headers });
    const linksData = await linksRes.json();
    console.log("Bitlinks count:", linksData.links ? linksData.links.length : 0);
    
    // 3. Get metrics for first link
    if (linksData.links && linksData.links.length > 0) {
        const link = linksData.links[0];
        console.log("First Link ID:", link.id, "Target:", link.long_url);
        
        const clicksRes = await fetch(`https://api-ssl.bitly.com/v4/bitlinks/${link.id}/clicks/summary`, { headers });
        const clicksData = await clicksRes.json();
        console.log("Clicks for this link:", clicksData.total_clicks);
    }
}
getStats();
