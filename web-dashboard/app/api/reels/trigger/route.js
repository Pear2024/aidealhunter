import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const GITHUB_PAT = process.env.GITHUB_PAT;
        if (!GITHUB_PAT) {
            return NextResponse.json({ error: "Missing GITHUB_PAT environment variable. Please add it to your Vercel settings." }, { status: 400 });
        }

        const response = await fetch('https://api.github.com/repos/Pear2024/aidealhunter/actions/workflows/medical_video_cron.yml/dispatches', {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `Bearer ${GITHUB_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ref: 'main' })
        });

        if (response.ok) {
            return NextResponse.json({ success: true, message: "Signal sent! GitHub Action is starting up now." });
        } else {
            const errBody = await response.text();
            console.error("GitHub API Error:", errBody);
            return NextResponse.json({ error: "Failed to communicate with GitHub API." }, { status: 500 });
        }

    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
