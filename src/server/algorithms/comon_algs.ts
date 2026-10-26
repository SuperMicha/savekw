import { GetDeviceStatuses, SaveDeviceStatus } from "@/server/databaseapi";
import { SmartLifeAPI } from "@/server/parthnersapi/smartlifeapi";
import { Smartessapi } from "../parthnersapi/smartessapi";
import { algorithmlogger } from "@/algorithm_logger";

import { logger } from "@/logger";
export function isInRange(currentHour = 0, startHour = 0, endHour = 0) {
  if (startHour < endHour) {
    // Звичайний діапазон у межах однієї доби
    return currentHour >= startHour && currentHour < endHour;
  } else {
    // Діапазон через північ (наприклад, 23 → 7)
    return currentHour >= startHour || currentHour < endHour;
  }
}

export async function InvertorSolarMode(
  user_id = "",
  command = "",
  device_id = "",
  out_priority = "1",
  charge_priority = "1",
) {
  logger.debug("Turn invertor in Solar mode", command, device_id);
  const smartESS = new Smartessapi();
  await smartESS.init();
  return await smartESS.setMode(
    user_id,
    device_id,
    out_priority,
    charge_priority,
  );
}

export async function InvertorUtiltyMode(
  user_id = "",
  command = "",
  device_id = "",
  out_priority = "1",
  charge_priority = "1",
) {
  logger.debug("Turn invertor in Utility mode", command, device_id);
  const smartESS = new Smartessapi();
  await smartESS.init();
  return await smartESS.setMode(
    user_id,
    device_id,
    out_priority,
    charge_priority,
  );
}

export async function sendWasherCommand(
  user_id = "",
  command = "",
  device_id = "",
) {
  logger.debug("sendWasherCommand", command, device_id);
  const smsls = new SmartLifeAPI();
  return await smsls.sendWasherCommand(user_id, command, device_id);
}

export async function sendDishWasherCommand(
  user_id = "",
  command = "",
  device_id = "",
) {
  logger.debug("sendDishWasherCommand", command, device_id);
  const smsls = new SmartLifeAPI();
  return await smsls.sendDishWasherCommand(user_id, command, device_id);
}

export async function sendBoilerCommand(
  user_id = "",
  command = "",
  device_id = "",
) {
  logger.debug("sendBoilerCommand", user_id, command);
  const smsls = new SmartLifeAPI();
  return await smsls.sendBoilerCommand(user_id, command, device_id);
}

export async function execute_dailyStart(
  user_id = "2",
  device_type = "boiler",
  target_hour = 7,
  device_id = "",
  controlFunc = sendBoilerCommand,
  algorithm_name = "unknown",
): Promise<void> {
  try {
    // 1️⃣ Поточна дата і час
    const now = new Date();
    const currentHour = now.getHours();
    const currentDateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${currentHour}`;

    // 2️⃣ Отримуємо статус пристрою

    const dev_stats = (await GetDeviceStatuses(user_id, device_type)) ?? [];
    const dev_stat = dev_stats[0] ?? {};
    logger.debug(dev_stat);
    const lastControl = dev_stat.last_control_time;
    dev_stat.device_id = device_id ?? "";
    // 3️⃣ Якщо вже вмикали сьогодні — виходимо
    if (lastControl === currentDateKey) {
      //logger.debug(`✅ ${device_type} вже вмикався ${lastControl}`);
      algorithmlogger.debug(
        `${device_type} вже вмикався ${lastControl}`,
        algorithm_name,
        user_id,
      );
      return;
    }

    // 4️⃣ Якщо настав час для запуску
    if (currentHour === target_hour) {
      //logger.debug(`🚀 Викликаю команду для ${device_type}`);
      algorithmlogger.debug(
        `🚀 Викликаю команду для ${device_type}`,
        algorithm_name,
        user_id,
      );
      const success = await controlFunc(user_id, "on", device_id);

      if (success) {
        // Оновлюємо статус
        dev_stat.user_id = user_id;
        dev_stat.device_type = device_type;
        //dev_stat.device_id = dev_stat.device_id || "1";
        dev_stat.status = "on";
        dev_stat.last_control_time = currentDateKey;
        await SaveDeviceStatus(dev_stat);

        //logger.debug(`🔥 ${device_type} увімкнено о ${target_hour}:00`);
        algorithmlogger.debug(
          `${device_type} увімкнено о ${target_hour}:00`,
          algorithm_name,
          user_id,
        );
      } else {
        // console.error(`⚠️ Не вдалося увімкнути ${device_type}`);
        algorithmlogger.error(
          `⚠️ Не вдалося увімкнути ${device_type}`,
          algorithm_name,
          user_id,
        );
      }
    } else {
      //logger.debug(`⏳ Ще не час (${currentHour}:00, потрібно ${target_hour}:00)`;
      algorithmlogger.debug(
        `⏳ Ще не час (${currentHour}:00, потрібно ${target_hour}:00)`,
        algorithm_name,
        user_id,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    //console.error("execute_dailyStart failed:", message);
    algorithmlogger.error(
      `execute_dailyStart failed: ${message}`,
      algorithm_name,
      user_id,
    );
  }
}

export async function execute_timeRangeControl(
  user_id = "2",
  device_type = "boiler",
  start_time = 23,
  end_time = 7,
  device_id = "",
  controlFunc = sendBoilerCommand,
  algorithm_name = "unknown",
): Promise<void> {
  try {
    // 1️⃣ Поточна дата/час
    const now = new Date();
    const currentHour = now.getHours();
    const currentKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${currentHour}`;

    // 2️⃣ Отримуємо останній статус пристрою
    const dev_stats = (await GetDeviceStatuses(user_id, device_type)) ?? [];
    const dev_stat = dev_stats[0] ?? {};

    const lastControlKey = dev_stat.last_control_time;
    const lastStatus = dev_stat.status ?? "off";

    // 3️⃣ Перевірка, щоб не виконувати двічі в ту ж годину
    if (lastControlKey === currentKey) {
      //logger.debug(`⏳ ${device_type}: вже перевірено в ${currentHour}:00`);
      algorithmlogger.debug(
        `${device_type}: вже перевірено в ${currentHour}:00`,
        algorithm_name,
        user_id,
      );
      return;
    }

    const shouldBeOn = isInRange(currentHour, start_time, end_time);

    // 5️⃣ Формуємо оновлення запису
    dev_stat.user_id = user_id;
    dev_stat.device_type = device_type;
    dev_stat.device_id = device_id || "";
    dev_stat.last_control_time = currentKey;

    // 6️⃣ Виконуємо команду якщо треба змінити стан
    if (shouldBeOn && lastStatus !== "on") {
      const success = await Promise.resolve(
        controlFunc(user_id, "on", device_id),
      );
      if (success) {
        dev_stat.status = "on";
        await SaveDeviceStatus(dev_stat);
        //logger.debug(`✅ ${device_type} увімкнено о ${currentHour}:00`);
        algorithmlogger.debug(
          `${device_type} увімкнено о ${currentHour}:00`,
          algorithm_name,
          user_id,
        );
      } else {
        // logger.debug(`⚠️ Не вдалося увімкнути ${device_type}`);
        algorithmlogger.error(
          `⚠️ Не вдалося увімкнути ${device_type}`,
          algorithm_name,
          user_id,
        );
      }
    } else if (!shouldBeOn && lastStatus !== "off") {
      const success = await Promise.resolve(
        controlFunc(user_id, "off", device_id),
      );
      if (success) {
        dev_stat.status = "off";
        void SaveDeviceStatus(dev_stat);
        //logger.debug(`💤 ${device_type} вимкнено о ${currentHour}:00`);
        algorithmlogger.debug(
          `${device_type} вимкнено о ${currentHour}:00`,
          algorithm_name,
          user_id,
        );
      } else {
        //logger.debug(`⚠️ Не вдалося вимкнути ${device_type}`);
        algorithmlogger.error(
          `⚠️ Не вдалося вимкнути ${device_type}`,
          algorithm_name,
          user_id,
        );
      }
    } else {
      //logger.debug(`🔁 ${device_type} вже в правильному стані (${lastStatus})`);
      algorithmlogger.debug(
        `${device_type} вже в правильному стані (${lastStatus})`,
        algorithm_name,
        user_id,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    //console.error("execute_timeRangeControl failed:", message);
    algorithmlogger.error(
      `execute_timeRangeControl failed: ${message}`,
      algorithm_name,
      user_id,
    );
  }
}
