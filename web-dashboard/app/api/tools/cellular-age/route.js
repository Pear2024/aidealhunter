import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { realAge, stressLevel, energyLevel, sleepQuality, dietHabits } = body;

        const systemPrompt = `You are the Nadania 'Cellular Age Calculator' Expert System.
        Your goal is to evaluate the user's chronological age against their lifestyle parameters to calculate their "True Cellular Age".
        
        [INSTRUCTIONS]:
        1. Calculate & Benchmark: Based on their inputs (Real Age: ${realAge}, Stress: ${stressLevel}, Energy: ${energyLevel}, Sleep: ${sleepQuality}, Diet: ${dietHabits}), generate their "True Cellular Age". If their habits are poor, calculate it 5-15 years OLDER than their real age. If average, 1-4 years older. If perfect, 2-5 years YOUNGER than their real age.
        2. Format - The Header: Start exactly with standard HTML. You MUST dynamically choose the color and message based on the result:
           - If their Cellular Age is OLDER than their Real Age, use RED (#ef4444) and write "⚠️ Warning: Accelerated Cellular Aging Detected".
           - If their Cellular Age is YOUNGER or EQUAL, use GREEN (#10b981) and write "✅ Excellent: Optimal Cellular Health Detected".
           Use this template carefully:
           <div style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; background: #f8fafc; padding: 30px; border-radius: 15px;">
              <h2 style="font-size: 1.2rem; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Chronological Age: ${realAge}</h2>
              <h1 style="font-size: 3.5rem; color: [RED_OR_GREEN_HEX]; font-weight: 900; line-height: 1; margin: 10px 0;">Biological Age: [CALCULATED_AGE]</h1>
              <p style="color: [RED_OR_GREEN_HEX]; font-weight: bold; font-size: 1.1rem; margin-top: 10px;">[WARNING_OR_SUCCESS_MESSAGE]</p>
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #cbd5e1; font-size: 0.95rem; color: #475569;">
                 <strong>Optimal Range:</strong> Your goal should be a Biological Age of [RealAge - 2] to [RealAge - 8] years old.
              </div>
           </div>
        3. Format - Diagnostic Methodology: Directly below the header, add a brief, highly professional "Calculation Methodology" box. Mention that this AI assessment is a heuristic based on 3 pillars of Anti-Aging Science: Telomere Attrition (stress/sleep), Mitochondrial Dysfunction (energy), and Oxidative Stress/Allostatic Load (diet/lifestyle). Make it sound extremely credible and clinical.
           Example HTML structure:
           <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 25px; font-size: 0.9rem; color: #475569; border: 1px solid #e2e8f0;">
              <strong>🔬 Scientific Methodology:</strong> This assessment correlates your lifestyle biomarkers using heuristic proxies for <em>Telomere Attrition</em>, <em>Mitochondrial Efficiency</em>, and <em>Oxidative Stress</em>.
           </div>
        4. Format - The Clinical Analysis: Provide a detailed, 2-paragraph medical explanation in Native US English. Explain WHY their age is what it is. If they are younger, praise their habits but explain how modern life still causes micro-stressors. If older, explain 'Oxidative Stress', 'Telomere Shortening', and 'Chronic Inflammation'.
        5. Format - Biomarker Breakdown: Create a bulleted list analyzing their specific weak points:
           <ul style="list-style-type: none; padding: 0; margin-bottom: 30px;">
             <li style="margin-bottom: 10px; padding: 15px; background: #fff1f2; border-left: 4px solid #ef4444; border-radius: 4px; color: #1f2937;"><strong>🩸 Energy & Mitochondria:</strong> [Analyze their energy input]</li>
             <li style="margin-bottom: 10px; padding: 15px; background: #fff1f2; border-left: 4px solid #ef4444; border-radius: 4px; color: #1f2937;"><strong>🧠 Stress & Cortisol:</strong> [Analyze their stress input]</li>
           </ul>
        6. The Solution (Three International): Explain that standard drug-store vitamins are destroyed in the stomach and cannot penetrate the cell membrane. Recommend exactly ONE primary product from Three International based on their inputs:
           - If Stress/Aging focus: <strong>Éternel</strong> (Resveratrol, CoQ10, Glutathione). Sales Page Link: <a href="https://bit.ly/nadaniawellness-eternel" target="_blank" style="color: #10b981; font-weight: bold; text-decoration: underline;">(Click Here to Read Clinical Review & See PDR Info)</a>
           - If Energy/Diet/Gut focus: <strong>Vitalité</strong> (72 Trace Minerals, Omega-3). Sales Page Link: <a href="https://bit.ly/nadaniawellness-vitalite" target="_blank" style="color: #10b981; font-weight: bold; text-decoration: underline;">(Click Here to Read Clinical Review & See PDR Info)</a>
           Mention "Liposomal Absorption Technology" ensuring 95% cellular delivery bypassing the digestive tract.
        7. Strict HTML Formatting: You MUST wrap the entire response in raw HTML tags (<h2>, <p>, <ul>, <li>, <strong>, <a>) for beautiful rendering. Use standard CSS inline styles where applicable. Do NOT use markdown code blocks or backticks. Start immediately with the HTML.
        `;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const result = await model.generateContent({
             contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
             generationConfig: { temperature: 0.8 }
        });
        
        const responseText = result.response.text();

        // Implicitly log tool usage as leads
        try {
            const pool = mysql.createPool({
                host: process.env.MYSQL_HOST,
                user: process.env.MYSQL_USER,
                password: process.env.MYSQL_PASSWORD,
                database: process.env.MYSQL_DATABASE,
                port: process.env.MYSQL_PORT,
                waitForConnections: true,
                connectionLimit: 5,
            });
            const symptomString = `[TOOL: Cellular Age] Age:${realAge}, Stress:${stressLevel}, Energy:${energyLevel}, Sleep:${sleepQuality}, Diet:${dietHabits}`;
            await pool.query(
                `INSERT INTO wellness_leads (symptoms, duration, lifestyle, ai_diagnosis) VALUES (?, ?, ?, ?)`,
                [symptomString, "Tool Evaluation", "Free Tool Generation", responseText]
            );
        } catch (dbError) {
            console.error("DB Error processing tool lead:", dbError);
        }

        return NextResponse.json({ success: true, diagnosis: responseText });

    } catch (error) {
        console.error("Tool Execution Error:", error);
        return NextResponse.json({ success: false, error: 'Failed to calculate cellular age.' }, { status: 500 });
    }
}
