import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, phone, source } = body;

        if (!name || !phone) {
            return NextResponse.json({ success: false, error: 'Name and phone are required.' }, { status: 400 });
        }

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (botToken && chatId) {
            const message = `🚨 <b>NEW NURSE CALLBACK LEAD!</b> 🚨\n\n📌 <b>Source:</b> ${source}\n👤 <b>Name:</b> ${name}\n📞 <b>Phone:</b> ${phone}\n\n<i>#NadaniaLead</i>`;
            
            const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
            
            const tgResponse = await fetch(tgUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            if (!tgResponse.ok) {
                console.error("Telegram API Error:", await tgResponse.text());
            }
        } else {
             console.warn("Telegram tokens missing. Lead only processed on frontend.");
        }

        return NextResponse.json({ success: true, message: "Lead processed successfully" });
    } catch (error) {
        console.error("Nurse Lead API Error:", error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
