const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const pdfParse = require('pdf-parse');
const pdfImgConvert = require('pdf-img-convert');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const AIMLAPI_KEY = process.env.AIMLAPI_KEY;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

// Log function
function log(msg) { console.log(`[ThreePDF] ${msg}`); }

async function scrapePDFLinks() {
    log("Launch Puppeteer Browser...");
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    // Login
    log("Navigating to Three International login...");
    await page.goto("https://office.threeinternational.com/", { waitUntil: 'networkidle2' });
    
    // The inputs are generally standard on WP or custom CMS
    log("Typing Credentials... (Nipa3)");
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    const textInputs = await page.$$('input[type="text"]');
    for (let input of textInputs) {
        // try to find generic username field
        await input.type('Nipa3'); 
    }
    
    await page.waitForSelector('input[type="password"]');
    await page.type('input[type="password"]', 'Glory@2025');
    
    log("Submitting Login...");
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 8000)); // Wait 8s for AJAX login to complete or redirect
    
    log("Navigating to Resources...");
    await page.goto("https://office.threeinternational.com/resources/resourcelist", { waitUntil: 'networkidle2', timeout: 30000 }).catch(e=>log("Nav timeout but continuing..."));
    
    log("Waiting for React components to load PDFs into DOM...");
    await new Promise(r => setTimeout(r, 15000)); // Give it 15 solid seconds to load all library assets

    // Scrape all PDF anchors
    const pdfUrls = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.map(a => a.href).filter(href => href && (href.toLowerCase().endsWith('.pdf') || href.includes('threemedia.earth')));
    });
    
    await browser.close();
    
    // Filter duplicates and only real PDFs
    const uniquePdfs = [...new Set(pdfUrls)].filter(url => url.endsWith('.pdf'));
    log(`Found ${uniquePdfs.length} total PDFs in the vault.`);
    return uniquePdfs;
}

async function uploadToImgBB(buffer) {
    if (!IMGBB_API_KEY) throw new Error("Missing IMGBB_API_KEY");
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append("image", blob, "pdf_page_1.jpg");
    
    const res = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data.data.url; 
}

async function summarizeWithAIML(text, filename) {
    log("Sending Text to AIMLAPI (GPT-4o) for Thai Summary...");
    const prompt = `You are a professional Medical Health expert for Nadania Wellness. We just downloaded an official scientific PDF from Three International called: ${filename}.
    Here is the extracted raw text from the document (it may be messy):
    ---
    ${text.substring(0, 15000)}
    ---
    TASK: Read this document and write an engaging, easy-to-understand Facebook post in **NATIVE US ENGLISH**. 
    Highlight the incredible wellness benefits, key science, or product info. Use emojis.
    Make it sound extremely premium, health-focused, and inviting for American consumers.
    End with a clear, soft-sell Call-To-Action inviting them to try the Free AI Health Diagnosis App to see what their body needs: "🩺 Curious about your own cellular health? Try our Free AI Medical Assessment today: https://nadaniadigitalllc.com/wellness". DO NOT include any sales or affiliate links.`;

    const res = await axios.post('https://api.aimlapi.com/v1/chat/completions', {
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }]
    }, { headers: { 'Authorization': `Bearer ${AIMLAPI_KEY}` } });
    
    return res.data.choices[0].message.content.trim();
}

async function postToFacebook(imageUrl, caption) {
    log("Publishing to Facebook Page as a Photo Post...");
    const fbPayload = {
        message: caption,
        url: imageUrl, 
        access_token: FB_ACCESS_TOKEN
    };
    const fbResponse = await axios.post(`https://graph.facebook.com/v19.0/${FB_PAGE_ID}/photos`, fbPayload);
    log(`✅ Posted to Facebook! Post ID: ${fbResponse.data.id}`);
}

async function main() {
    try {
        log("--- Three International Automated PDF Reader Started ---");
        const links = await scrapePDFLinks();
        if (links.length === 0) throw new Error("No PDFs found on the page.");
        
        // Pick the first English or general PDF, you can add logic to rotate/randomize
        const targetPdf = links.find(l => l.includes('Product-Price-Sheet') || l.includes('Dossier') || l.includes('Focus-Study')) || links[0];
        log(`Selected Document to Read: ${targetPdf}`);
        
        // Download PDF
        log("Downloading PDF into memory...");
        const pdfRes = await axios.get(targetPdf, { responseType: 'arraybuffer' });
        const pdfBuffer = Buffer.from(pdfRes.data);
        
        const filenameMatched = targetPdf.split('/').pop();
        
        // Extract Text
        log("Extracting Text via PDF-Parse...");
        const data = await pdfParse(pdfBuffer);
        const extractedText = data.text;
        
        // Extract Image of First Page
        log("Extracting First Page as Image via PDF-Img-Convert...");
        const outputImages = await pdfImgConvert.convert(pdfBuffer, { width: 1200, page_numbers: [1] });
        const firstPageBuffer = Buffer.from(outputImages[0]);
        
        // Upload to ImgBB
        log("Uploading extracted PDF page to ImgBB...");
        const hostedImageUrl = await uploadToImgBB(firstPageBuffer);
        log(`Public Image URL ready: ${hostedImageUrl}`);
        
        // Summarize
        const socialCaption = await summarizeWithAIML(extractedText, filenameMatched);
        log("Generated Thai Caption!");
        console.log(socialCaption);
        
        // Post to FB
        await postToFacebook(hostedImageUrl, socialCaption);
        
        log("--- FINISHED SUCCESSFULLY ---");
        process.exit(0);
    } catch(err) {
        log(`❌ ERROR: ${err.message}`);
        console.error(err);
        process.exit(1);
    }
}

main();
