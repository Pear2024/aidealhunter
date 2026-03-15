const titles = [
  'MUSETEX ATX PC Case, 3 x 120mm Fans Preinstalled, 360MM RAD Support, 270° Full View Tempered Glass Gaming PC Case with Type-C, Mid Tower ATX Computer Case, Black, Y6',
  'GameSir - Super Nova Wireless Gaming Controller Nintendo Switch & Switch 2/PC/iOS/Android, Hall Effect Stick/Trigger Charging Dock - Red/White $30 at BestBuy',
  'HyperX CloudX Stinger 2 Wired Gaming Headset for Xbox (White) $20 + Free Shipping',
  '$298.00: VIZIO 65" Class 4K Series LED Smart TV, QuickFit® Compatible',
  'Get Trend Friends TV Show Heated Blanket Electric, Queen Size (90” x 90”) - $39.89'
];

for (const title of titles) {
    let extracted = { title: title };
    const priceMatch = title.match(/\$([0-9,.]+)/);
    if (priceMatch) {
       console.log('✅ MATCH:', priceMatch[1], '->', title);
       extracted.discount_price = parseFloat(priceMatch[1].replace(/,/g, ''));
       const installmentMatch = title.match(/(?:Or\s)?(\$[0-9.,]+\/mo(?:\s\([0-9]+\s*mo\))?)/i);
       if (installmentMatch) extracted.installment_plan = installmentMatch[1];
       extracted.title = title.replace(/\$([0-9,.]+)/, '').replace(/(?:Or\s)?(\$[0-9.,]+\/mo(?:\s\([0-9]+\s*mo\))?)/i, '').replace(/ at Amazon| at Best Buy| at Walmart| at Target/i, '').trim();
       console.log('Final Title:', extracted.title, 'Price:', extracted.discount_price);
    } else {
       console.log('❌ FAIL:', title);
    }
}
