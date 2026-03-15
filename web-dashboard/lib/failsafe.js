export async function sendTelegramAlert(message) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.warn('⚠️ Agent 12 (Failsafe) Warning: Missing Telegram Credentials, cannot send alert.');
        return false;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `🚨 *AI Deal Hunter Failsafe Alert*\n\n${message}`,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            console.error('⚠️ Agent 12: Failed to send Telegram alert:', await response.text());
            return false;
        }
        console.log('🛡️ Agent 12: Telegram alert dispatched successfully.');
        return true;
    } catch (e) {
        console.error('⚠️ Agent 12: Telegram alert network error:', e.message);
        return false;
    }
}

export async function withRetry(fn, retries = 2, delayMs = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`🛡️ Agent 12 retrying after error: ${error.message} (Attempt ${i + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}
