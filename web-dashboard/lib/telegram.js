const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8496126366:AAHfGKbMH2Fq_xQmXUMKMNBDO70C02s29xA';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8189986883';

export async function sendTelegramAlert(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
    } catch (error) {
        console.error("Failed to send Telegram alert:", error);
    }
}
