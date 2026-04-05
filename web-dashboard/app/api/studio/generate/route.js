import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { symptom = "Fatigue", audience = "Overworked Executives" } = body;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Act as an elite Hollywood commercial director and a master viral TikTok/Reels copywriter. 
      I need a highly viral 20-second cinematic ad script specifically optimized for Google Flow (Veo 3) AI Video Generator.
      
      Target Audience / Demographic: ${audience}
      Symptom / Pain Point: ${symptom}
      
      CRITICAL RULE (CURIOSITY GAP): Do NOT mention any specific product name, pill, or supplement. The goal of this ad is NOT to sell a product directly. The goal is to agitate their pain point, introduce a vague but powerful "cellular/clinical scientific breakthrough", and force them to click the link to take a "Free Clinical AI Assessment" at Nadania Wellness to find their customized cure.
      
      CRITICAL RULE (PACING): You MUST slice the advertisement into exactly 4 scenes, where EACH scene is strictly a 5-second block (0-5s, 5-10s, 10-15s, 15-20s). Do not make them any longer.
      
      CRITICAL RULE (CHARACTER CONSISTENCY): If the camera is focusing on a specific human, you MUST define their exact name, age, and appearance vividly in Scene 1. In all subsequent scenes (Scene 2, 3, 4), you MUST explicitly write "[Same Person]" when referencing them, so the AI Video generator maintains character consistency.
      
      Create a 4-scene storyboard. 
      Rules for Video Prompts: Must be highly descriptive, indicating camera angle, lighting, aesthetic.
      Scene 4 Voiceover MUST end with a strong Call to Action to visit Nadania Wellness for the Free AI Assessment.

      {
        "title": "Ad Title",
        "rationale": "Why this ad will go viral",
        "scenes": [
          {
            "scene": 1,
            "timestamp": "0-5s",
            "concept": "The Hook",
            "video_prompt": "Prompt for Google Flow...",
            "audio_prompt": "Prompt for background audio/music...",
            "voiceover": "The spoken voiceover script (Max 5 seconds of speaking!)..."
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return NextResponse.json(JSON.parse(text));
  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate AI Ad concept." }, { status: 500 });
  }
}
