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
        1. Calculate & Shock: Based on their inputs (Real Age: ${realAge}, Stress: ${stressLevel}, Energy: ${energyLevel}, Sleep: ${sleepQuality}, Diet: ${dietHabits}), generate a "Cellular Age". If their habits are poor, make their Cellular Age 5-15 years OLDER than their real age. If average, 2-5 years older. If perfect, equal or slightly younger.
        2. Format: Start exactly with standard HTML:
           <div style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px;">
              <h2 style="font-size: 1.5rem; color: #64748b; margin-bottom: 5px;">Chronological Age: ${realAge}</h2>
              <h1 style="font-size: 3rem; color: #ef4444; font-weight: 900; line-height: 1;">True Cellular Age: [CALCULATED_AGE]</h1>
           </div>
        3. Explain Risk: In 2-3 short, clinical sentences (Native US English), explain WHY their cells are aging faster (mentioning 'Oxidative Stress' or 'Chronic Inflammation').
        4. The Solution (Three International): Explain that standard drug-store vitamins cannot penetrate the cell membrane. Recommend exactly ONE primary product from Three International based on their inputs:
           - If Stress/Aging focus: Éternel (Resveratrol, CoQ10, Glutathione). PDR Link: <a href="https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24467" target="_blank" style="color: #10b981; font-weight: bold;">(Verify Éternel on PDR.net)</a>
           - If Energy/Diet focus: Vitalité (72 Trace Minerals, Omega-3). PDR Link: <a href="https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24471" target="_blank" style="color: #10b981; font-weight: bold;">(Verify Vitalité on PDR.net)</a>
           Mention "Liposomal Absorption Technology" ensuring 95% cellular delivery.
        5. Contact Callout: Conclude with this block:
           <div style="background:#f8fafc; border-left:4px solid #3b82f6; padding:12px; margin: 15px 0;"><strong>📞 Speak to our Cellular Health Advisor (Free):</strong> Call or Text 951-249-1521 to discuss your cellular reversal plan.</div>
        6. CTA Button: End with: <a href="https://threeinternational.com/en/ShopProducts/1712892" target="_blank" style="display:inline-block; padding:12px 24px; background-color:#3b82f6; color:white; border-radius:8px; text-decoration:none; font-weight:bold; margin-top:10px;">Begin Cellular Reversal Now</a>
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
