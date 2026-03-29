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
        2. Clinical Diagnosis & Standard Medication: Suggest what the medical issue might be. Recommend STANDARD western over-the-counter (OTC) or prescription medications (e.g., Ibuprofen, Melatonin, SSRIs, Omeprazole, etc.) that a doctor would normally prescribe for this.
        3. The Holistic Breakthrough (The Pitch): Transition by stating that ongoing pharmaceutical use often treats only superficial symptoms and has side effects.
        4. Recommend 'Three International': Present a specific Three International product as the cutting-edge, root-cause cellular solution for patients seeking a holistic, non-pharmaceutical path. You MUST emphasize that "Three International products are officially listed in the PDR (Prescribers' Digital Reference / Physicians' Desk Reference)", which proves their clinical efficacy and safety. Highlight their "Liposomal Absorption Technology".
           - Three Products available: 
             * Vitalité (Peak Energy & Core Nutrition)
             * Imúne (Immune Support & Gut Health)
             * Éternel (Anti-Aging, Antioxidants, Cellular repair)
             * Revíve (Joint, Muscle, Skin Recovery)
             * Purífi (Full Body Detox & Cleanse)
             * Collagène (Marine Collagen for Skin, Hair, Nails)
             * Sleep (Natural Sleep & Brain Recovery)
        5. Structure the output clearly using HTML formatting for easy rendering. Use <h2>, <h3>, <strong>, <ul>, and <p> tags.
        6. End with a button link in HTML: <a href="https://Nipa3.threeinternational.com" target="_blank" style="display:inline-block; padding:12px 24px; background-color:#10b981; color:white; border-radius:8px; text-decoration:none; font-weight:bold; margin-top:20px;">Explore the Holistic Alternative</a>`;

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
