//Boiler working only on the night

import { logger } from "@/logger";
import { Smartessapi } from "../parthnersapi/smartessapi";
import { algorithmlogger } from "@/algorithm_logger";
import { Telegramapi } from "../parthnersapi/telegram";
import { GetDeviceStatuses, SaveDeviceStatus, getGeneralSettingsByUserId, } from "@/server/databaseapi";
import { SmartLifeAPI } from "@/server/parthnersapi/smartlifeapi";

export class checkmains {
    constructor() { } // eslint-disable-line @typescript-eslint/no-empty-function

    async execute(user_id = "U093BTK78TV") {
        algorithmlogger.debug("Executing checking mains for user:", "check_mains", user_id);
        const general_settings = await getGeneralSettingsByUserId(user_id);
        if (general_settings?.voltage_guard == "Invertor") {
            await this.checkMainsOnInvertor(user_id);
        }
        else if (general_settings?.voltage_guard == "SmartPlug") {
            await this.checkMainsOnSmartPlug(user_id);
        }
    }

    async checkMainsOnInvertor(user_id: string) {
        const smartess = new Smartessapi();
        await smartess.init();
        const ess_data = await smartess.GetESSdata(user_id);
        if (ess_data.err != 0) {
            algorithmlogger.error("Помилка при отриманні данних з інвертора", "check_mains", user_id, ess_data);
            return;
        }
        algorithmlogger.debug("Отримання данних з інвертора", "check_mains", user_id, ess_data);
        const voltage = await smartess.GetGridValue(ess_data, "Grid Voltage");

        const dev_stats = (await GetDeviceStatuses(user_id, "VoltageGuard")) ?? [];
        const dev_stat = dev_stats[0] ?? { user_id: user_id, device_type: "VoltageGuard", device_id: "", status: "normal" };

        const telegram = new Telegramapi();
        await telegram.init();

        if (voltage >= 200 && voltage <= 240) {
            algorithmlogger.debug("Напруга в нормі:" + voltage, "check_mains", user_id, voltage);
            if (dev_stat.status == "normal") return;
            if (dev_stat.status == "warning") {
                const result = await telegram.sendTelegramMessage(
                    user_id,
                    "Напруга в нормі: " + voltage + "В"
                );
                algorithmlogger.debug("Відправка повідомлення користувачу user:", "check_mains", user_id, result);
                dev_stat.status = "normal"
            }

            await SaveDeviceStatus(dev_stat);
            return;
        }

        if (dev_stat.status == "warning") return;


        const result = await telegram.sendTelegramMessage(
            user_id,
            "Напруга мережі поза нормою: " + voltage + "В"
        );
        algorithmlogger.debug("Відправка повідомлення користувачу user:", "check_mains", user_id, result);
        dev_stat.status = "warning"
        await SaveDeviceStatus(dev_stat);
    }



    async checkMainsOnSmartPlug(user_id: string) {

        const smsls = new SmartLifeAPI();
        const response = await smsls.Discovery(user_id);

        const dev_stats = (await GetDeviceStatuses(user_id, "VoltageGuard")) ?? [];
        const dev_stat = dev_stats[0] ?? {
            user_id,
            device_type: "VoltageGuard",
            device_id: "",
            status: "normal"
        };
        const device_id = dev_stat.device_id;
        // Перевірка правильного поля header.code
        if (!response.header || response.header.code !== "SUCCESS") {
            algorithmlogger.error("Помилка при отриманні данних з смарт розетки", "check_mains", user_id, response);
            return;
        }

        algorithmlogger.debug("Отримання данних з смарт розетки", "check_mains", user_id, response);

        const devices = response.payload.devices.filter((dev: any) => dev.id === device_id);

        if (devices.length === 0) {
            algorithmlogger.error("Не знайдено пристрій смарт розетки для перевірки", "check_mains", user_id, device_id);
            return;
        }

        const device = devices[0];
        const statusOnline = device.data.online === true;
        const telegram = new Telegramapi();
        await telegram.init();

        // --- ЛОГІКА СТАТУСІВ ---

        if (statusOnline) {
            // Статус: живлення ОК
            if (dev_stat.status !== "normal") {

                dev_stat.status = "normal";
                await SaveDeviceStatus(dev_stat);

                const result = await telegram.sendTelegramMessage(
                    user_id,
                    "Розетка в мережі (живлення присутнє)"
                );

                algorithmlogger.debug("Розетка в мережі (живлення присутнє)", "check_mains", user_id, result);
            }

            return;
        }

        // Якщо offline
        if (dev_stat.status !== "warning") {

            dev_stat.status = "warning";
            await SaveDeviceStatus(dev_stat);

            const result = await telegram.sendTelegramMessage(
                user_id,
                "Розетка офлайн (живлення відсутнє)"
            );

            algorithmlogger.debug("Розетка офлайн (живлення відсутнє)", "check_mains", user_id, result);
        }
    }



}
