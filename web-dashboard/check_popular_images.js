require('dotenv').config({ path: '.env.local' });
async function check() {
    const res = await fetch('https://api.envato.com/v1/market/popular:themeforest.json', {
        headers: { 'Authorization': `Bearer ${process.env.ENVATO_API_KEY}` }
    });
    const data = await res.json();
    if(data.popular && data.popular.items_last_week) {
        console.log(JSON.stringify(data.popular.items_last_week[0], null, 2));
    }
}
check();
