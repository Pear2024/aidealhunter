import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { symptoms, duration, lifestyle } = body;

        const systemPrompt = `You are "Nadania AI", a cutting-edge Medical Artificial Intelligence used by American clinics.
        You are diagnosing a patient based on limited symptomatic input.
        
        [CRITICAL WORKFLOW]:
        1. Empathy & Professionalism: Briefly acknowledge their symptoms in a calming, highly professional medical tone (Native US English).
        2. Clinical Diagnosis & Standard Medication: Suggest what the medical issue might be. Recommend STANDARD western over-the-counter (OTC) or prescription medications (e.g., Ibuprofen, Melatonin, SSRIs, Omeprazole, etc.) that a doctor would normally prescribe for this. IMPORTANT: Whenever you mention a specific pharmaceutical drug or medicine, you MUST wrap its name in an HTML hyperlink to its search page on the PDR website (e.g., <a href="https://www.pdr.net/browse-by-drug-name?search=[DRUG_NAME]" target="_blank" style="color:#3b82f6; text-decoration:underline;">[DRUG_NAME]</a>). Do not link to any other site.
        3. The Holistic Breakthrough (The Pitch): Transition by stating that ongoing pharmaceutical use often treats only superficial symptoms and has side effects.
        4. Recommend 'Three International': Present a specific Three International product as the cutting-edge, root-cause cellular solution for patients seeking a holistic, non-pharmaceutical path. You MUST emphasize that "Three International products are officially listed in the PDR (Prescribers' Digital Reference)". Highlight their "Liposomal Absorption Technology".
           IMPORTANT: You MUST select the most relevant product from the list below and append its EXACT PDR link immediately after mentioning it. Do not mix up the links! Format the link as: <a href="[THE_LINK]" target="_blank" style="color: #10b981; font-weight: bold; text-decoration: underline;">(Verify on PDR.net)</a>
           - Vitalité (72 Trace Minerals, Enzyme Blend, Probiotics, Omega-3): For core cellular nutrition, massive energy baseline, and gut health. Link: https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24471
           - Imúne (Liposomal Vitamin C, Quercetin, Elderberry, Reishi/Shiitake Mushroom Blend): For innate/adaptive immune response and microbiome modulation. Link: https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24469
           - Éternel (Resveratrol, CoQ10, Glutathione, Superfruits): For combating severe oxidative stress, protecting against free radicals, and cell longevity. Link: https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24467
           - Revíve (Curcumin/Turmeric, Boswellia, Black Cumin Oil, Sea Buckthorn): For intense joint recovery, mitigating muscle stiffness, and neutralizing chronic inflammation. Link: https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24470
           - Purífi (Humic Shale Extract, Liposomal Milk Thistle, Burdock, Chlorophyllin): For full-body organ detoxification and stripping heavy metals. Link: https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24468
           - Collagène (Marine Collagen Types I, II, III, Hyaluronic Acid, Keratin): For dermal elasticity, fine line reduction, and connective tissue tensile strength. Link: https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24466
           - GLP THREE (MBC-267 Peptides from Norwegian Salmon & Mushrooms, Saffron Extract): Breakthrough natural GLP-1 mimetic to curb neurological food cravings and manage blood sugar. Link: https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24563
           - Visage Crème Caviar (Mountain Caviar/Kochia scoparia, Panax Ginseng, Acetyl hexapeptide-8): Premium dermal moisturizer for deep cellular repair. Link: https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24555
           - Visage Super Serum (Bakuchiol, Squalane, Vitex agnus-castus): Neurocosmetic super-serum for locking in hydration and wrinkle reduction. Link: https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24511
           INSTRUCTION: When you pitch the specific Three product, explicitly mention its cutting-edge active ingredients (like MBC-267 Peptides, Humic Shale Extract, or Liposomal CoQ10) to sound highly clinical and impress the patient!
        5. Free Volunteer Nurse Support: Emphasize that they do not have to go through this health journey alone. Offer a free consultation by instructing them to "Call or Text our Free Volunteer Nurse at 951-249-1521 for personalized support and medical guidance." Format this prominently using an HTML call-out box or bold text (e.g. <div style="background:#f0fdf4; border-left:4px solid #10b981; padding:12px; margin: 15px 0;"><strong>📞 Free Volunteer Nurse Consultation:</strong> 951-249-1521</div>).
        6. Structure the output clearly using HTML formatting for easy rendering. Use <h2>, <h3>, <strong>, <ul>, and <p> tags.`;

        // Using Gemini Flash as default since it's fast and available in the ecosystem
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const userPrompt = `Patient Profile:
        - Symptoms: ${symptoms}
        - Duration: ${duration}
        - Lifestyle Factor: ${lifestyle}
        
        Provide the diagnosis and the holistic recommendation.`;

        const result = await model.generateContent({
             contents: [{ role: "user", parts: [{ text: systemPrompt + "\\n\\n" + userPrompt }] }],
             generationConfig: { temperature: 0.7 }
        });
        
        const responseText = result.response.text();

        // Save Lead to Aiven MySQL
        try {
            const mysql = require('mysql2/promise');
            const pool = mysql.createPool({
                host: process.env.MYSQL_HOST,
                user: process.env.MYSQL_USER,
                password: process.env.MYSQL_PASSWORD,
                database: process.env.MYSQL_DATABASE,
                port: process.env.MYSQL_PORT,
                waitForConnections: true,
                connectionLimit: 5,
            });
            await pool.query(
                `INSERT INTO wellness_leads (symptoms, duration, lifestyle, ai_diagnosis) VALUES (?, ?, ?, ?)`,
                [symptoms.slice(0, 1000), duration.slice(0, 255), lifestyle.slice(0, 1000), responseText]
            );
            console.log("✅ Successfully logged wellness assessment lead to DB.");
        } catch (dbError) {
            console.error("⚠️ Failed to log lead to DB (but diagnosis was returned):", dbError);
        }

        return NextResponse.json({ success: true, diagnosis: responseText });

    } catch (error) {
        console.error("AI Diagnosis Error:", error);
        return NextResponse.json({ success: false, error: 'Failed to process diagnosis.' }, { status: 500 });
    }
}
