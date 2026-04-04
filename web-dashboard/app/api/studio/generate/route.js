import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { product = "Éternel", productDesc = "Anti-aging and Cellular Resveratrol", audience = "Overworked Executives" } = body;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Act as an elite Hollywood commercial director and a master viral TikTok/Reels copywriter. 
      I need a highly viral 45-second cinematic ad script specifically optimized for Google Flow (Veo 3) AI Video Generator.
      
      Product to sell: ${product} (${productDesc})
      Target Audience / Pain Point: ${audience}
      
      Create a 4-scene storyboard. 
      Rules for Video Prompts: Must be highly descriptive, indicating camera angle, lighting, aesthetic (e.g., Unreal Engine 5, 8k, cinematic, photorealistic). If there's a transition, specify "Use SceneBuilder Jump To". Avoid policy violations (NO swallowing pills, NO blood, NO needles).
      
      Return ONLY a valid JSON object with the following structure:
      {
        "title": "Ad Title",
        "rationale": "Why this ad will go viral",
        "scenes": [
          {
            "scene": 1,
            "concept": "The Hook",
            "video_prompt": "Prompt for Google Flow...",
            "audio_prompt": "Prompt for background audio/music...",
            "voiceover": "The spoken voiceover script..."
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
