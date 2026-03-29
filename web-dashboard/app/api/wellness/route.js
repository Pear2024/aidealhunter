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
        2. Clinical Diagnosis & Standard Medication: Suggest what the medical issue might be. Recommend STANDARD western over-the-counter (OTC) or prescription medications (e.g., Ibuprofen, Melatonin, SSRIs, Omeprazole, etc.) that a doctor would normally prescribe for this. IMPORTANT: Whenever you mention a specific pharmaceutical drug or medicine, you MUST wrap its name in an HTML hyperlink to its search page on the PDR website (e.g., <a href="https://www.pdr.net/search-results?q=[DRUG_NAME]" target="_blank" style="color:#3b82f6; text-decoration:underline;">[DRUG_NAME]</a>). Do not link to any other site.
        3. The Holistic Breakthrough (The Pitch): Transition by stating that ongoing pharmaceutical use often treats only superficial symptoms and has side effects.
        4. Recommend 'Three International': Present a specific Three International product as the cutting-edge, root-cause cellular solution for patients seeking a holistic, non-pharmaceutical path. You MUST emphasize that "Three International products are officially listed in the PDR (Prescribers' Digital Reference)". IMPORTANT: When you recommend a Three product, you MUST include this exact clickable HTML link right after it: <a href="https://www.pdr.net/search-results?q=Three" target="_blank" style="color: #10b981; font-weight: bold; text-decoration: underline;">(Verify Three Products on PDR.net)</a>. Highlight their "Liposomal Absorption Technology".
           - Three Products available: 
             * Vitalité (Peak Energy & Core Nutrition)
             * Imúne (Immune Support & Gut Health)
             * Éternel (Anti-Aging, Antioxidants, Cellular repair)
             * Revíve (Joint, Muscle, Skin Recovery)
             * Purífi (Full Body Detox & Cleanse)
             * Collagène (Marine Collagen for Skin, Hair, Nails)
             * Sleep (Natural Sleep & Brain Recovery)
        5. Free Volunteer Nurse Support: Emphasize that they do not have to go through this health journey alone. Offer a free consultation by instructing them to "Call or Text our Free Volunteer Nurse at 951-249-1521 for personalized support and medical guidance." Format this prominently using an HTML call-out box or bold text (e.g. <div style="background:#f0fdf4; border-left:4px solid #10b981; padding:12px; margin: 15px 0;"><strong>📞 Free Volunteer Nurse Consultation:</strong> 951-249-1521</div>).
        6. Structure the output clearly using HTML formatting for easy rendering. Use <h2>, <h3>, <strong>, <ul>, and <p> tags.
        7. End with a button link in HTML: <a href="https://Nipa3.threeinternational.com" target="_blank" style="display:inline-block; padding:12px 24px; background-color:#10b981; color:white; border-radius:8px; text-decoration:none; font-weight:bold; margin-top:20px;">Explore the Holistic Alternative</a>`;

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

        return NextResponse.json({ success: true, diagnosis: responseText });

    } catch (error) {
        console.error("AI Diagnosis Error:", error);
        return NextResponse.json({ success: false, error: 'Failed to process diagnosis.' }, { status: 500 });
    }
}
