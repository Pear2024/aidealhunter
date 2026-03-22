require('dotenv').config({ path: '.env.local' });

async function checkWeee() {
    console.log("Pinging RapidAPI SayWeee Endpoint...");
    try {
        const url = 'https://weee-grocery-api-sayweee-com-browsing-searching-details.p.rapidapi.com/search?zipcode=77494&keyword=wagyu&limit=5&offset=0';
        const options = {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'weee-grocery-api-sayweee-com-browsing-searching-details.p.rapidapi.com'
            }
        };

        const res = await fetch(url, options);
        const data = await res.json();
        console.log("=== SAYWEEE RAPIDAPI RESPONSE ===");
        if(data && data.object && data.object.length > 0) {
            const topItem = data.object[0];
            console.log(JSON.stringify(topItem, null, 2));
        } else {
            console.log(data);
        }
    } catch(e) {
        console.error("RapidAPI Error:", e);
    }
}
checkWeee();
