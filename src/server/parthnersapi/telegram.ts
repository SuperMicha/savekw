import {
    AddSystemLog,
    GetSystemSetting,
    getGeneralSettingsByUserId,
    setUserProperty,
    GetUserProperty
} from "@/server/databaseapi";


export class Telegramapi {
    private token: string | undefined;

    constructor() { }

    async init() {
        this.token = await GetSystemSetting("telegram_token");
    }

    async sendTelegramMessage(user_id: string, text: string) {
        const token = this.token;
        const chatId = await GetUserProperty(user_id, "telegram_chat_id");
        
        if (!chatId) {

            return { "err": "chat ID not set" };
        }

        const url = `https://api.telegram.org/bot${token}/sendMessage`;

        const body = {
            chat_id: chatId,
            text: text,
            parse_mode: "HTML"
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return data;
    }

    generateTelegramLink(botUsername = "savekw_bot") {
        const code = [...crypto.randomUUID().replace(/-/g, "")]
            .sort(() => Math.random() - 0.5)
            .join("")
            .substring(0, 10);

        return {
            link: `https://t.me/${botUsername}?start=bind_${code}`,
            code: code
        };
    }

    async waitForBindMessage(user_Id:string, code: string, timeoutMs = 15000) {
        const start = Date.now();
        const targetPrefix = `/start ${code}`;

        let offset = 0;

        while (Date.now() - start < timeoutMs) {

            const res = await fetch(`https://api.telegram.org/bot${this.token}/getUpdates?offset=${offset}&timeout=5`);
            const data = await res.json();

            if (!data.ok) throw new Error("Telegram getUpdates error");

            for (const upd of data.result) {
                offset = upd.update_id + 1;

                if (upd.message && upd.message.text && upd.message.text.startsWith(targetPrefix)) {
                    await setUserProperty(user_Id, "telegram_chat_id", upd.message.chat.id.toString());

                    return {

                        chatId: upd.message.chat.id,
                        userId: upd.message.from.id,
                        updateId: upd.update_id
                    };
                }
            }

            // трішки почекаємо, щоб не спамити Telegram
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return null; // timed out
    }

}