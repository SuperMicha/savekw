//Boiler working on day defined time and during the night if no solar hours avaliable for the next day
//Night DishWashing
import {
  getAlgorithmByName,
  GetUserProperty,
  getGeneralSettingsByUserId,
  GetDeviceStatuses,
  SaveDeviceStatus,
  GetDeviceId,
} from "@/server/databaseapi";
import {
  execute_timeRangeControl,
  sendBoilerCommand,
} from "@/server/algorithms/comon_algs";
import { logger } from "@/logger";
import { algorithmlogger } from "@/algorithm_logger";

export class Algorithm6 {
  constructor() {} // eslint-disable-line @typescript-eslint/no-empty-function

  async execute(user_id = "U093BTK78TV", algorithm_name: string) {
    // logger.debug("Executing Algorithm 6 for user:", user_id);
    algorithmlogger.debug("Executing Algorithm 6", "algorithm6", user_id);

    if (algorithm_name !== "algorithm6") return;

    //logger.debug("Processing user:", user_id);
    const algorithm = await getAlgorithmByName(user_id, "algorithm6");
    if (!algorithm) return;
    if (algorithm.status !== 1) return;

    algorithmlogger.debug(
      "Algorithm settings:",
      "algorithm6",
      user_id,
      algorithm,
    );

    const device_id = await GetDeviceId(user_id, "boiler");
    if (!device_id) return;

    const boiler_night_start = algorithm.night_start;
    const boiler_night_end = algorithm.night_end;
    const boiler_day_start = algorithm.day_start;
    const boiler_day_end = algorithm.day_end;
    // --- Отримання прогнозу ---
    algorithmlogger.debug(
      "Fetching sun forecast data...",
      "algorithm6",
      user_id,
    );
    const userData = await GetUserProperty(user_id, "sun_forecast");
    if (!userData?.value) return;
    let parsed;
    try {
      parsed = JSON.parse(userData.value);
    } catch (err) {
      console.error("JSON parse error:", err);
      return null;
    }

    const today_forecast = parsed?.[0] ?? {};
    const tomorrow_forecast = parsed?.[1] ?? {};
    const sunnyHoursToday = today_forecast.sunnyHours ?? 0;
    const sunnyHoursTomorrow = tomorrow_forecast.sunnyHours ?? 0;

    // logger.debug("Today forecast:", today_forecast);
    // logger.debug("Tomorrow forecast:", tomorrow_forecast);
    algorithmlogger.debug(
      "Today forecast:",
      "algorithm6",
      user_id,
      today_forecast,
    );
    algorithmlogger.debug(
      "Tomorrow forecast:",
      "algorithm6",
      user_id,
      tomorrow_forecast,
    );

    // --- Отримуємо загальні налаштування алгоритмів ---
    const general_settings = await getGeneralSettingsByUserId(user_id);

    if (!general_settings) return;
    //logger.debug("General settings:", general_settings);
    algorithmlogger.debug(
      "General settings:",
      "algorithm6",
      user_id,
      general_settings,
    );
    const threshold = general_settings.sunny_hours_threshold ?? 4;

    const now = new Date();
    const hour = now.getHours();
    const isNightTime =
      boiler_night_start < boiler_night_end
        ? hour >= boiler_night_start && hour <= boiler_night_end
        : hour >= boiler_night_start || hour <= boiler_night_end; // якщо ніч переходить через північ

    if (!isNightTime) {
      //logger.debug("Стартує денний алгоритм");
      algorithmlogger.debug("Стартує денний алгоритм", "algorithm6", user_id);
      void execute_timeRangeControl(
        user_id,
        "boiler",
        boiler_day_start,
        boiler_day_end,
        device_id,
        sendBoilerCommand,
        "algorithm6",
      );
      return;
    }
    // --- Логіка нічного циклу ---
    // logger.debug("Стартує логіка нічного циклу");
    algorithmlogger.debug(
      "Стартує логіка нічного циклу",
      "algorithm6",
      user_id,
    );
    const dev_stats = (await GetDeviceStatuses(user_id, "boiler")) || [];
    const dev_stat = dev_stats[0] || {};
    const currentStatus = dev_stat.status ?? "off";
    logger.debug("Sun hours:");
    logger.debug(sunnyHoursToday);
    logger.debug("Threshold:");
    logger.debug(threshold);
    if (sunnyHoursToday < threshold) {
      // Якщо прогноз слабкий — вмикаємо контроль

      //logger.debug("🌙 Прогноз низький ");
      algorithmlogger.debug(
        "🌙 Прогноз низький -застосовуємо нічний режим",
        "algorithm6",
        user_id,
      );
      void execute_timeRangeControl(
        user_id,
        "boiler",
        boiler_night_start,
        boiler_night_end,
        device_id,
        sendBoilerCommand,
        "algorithm6",
      );
    } else {
      // Якщо прогноз став сонячним — вимикаємо, тільки якщо він ще працює
      if (isNightTime && currentStatus === "on") {
        // logger.debug("🌤 Прогноз покращився → вимикаємо бойлер (1 раз)");
        algorithmlogger.debug(
          "🌤 Прогноз покращився → вимикаємо бойлер (1 раз)",
          "algorithm6",
          user_id,
        );

        const success = await sendBoilerCommand(user_id, "off", device_id);

        const currentHour = now.getHours();
        const currentKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${currentHour}`;

        dev_stat.user_id = user_id;
        dev_stat.device_type = "boiler";
        dev_stat.device_id = device_id || "";
        dev_stat.last_control_time = currentKey;

        if (success) {
          dev_stat.status = "off";
          await SaveDeviceStatus(dev_stat);
          //logger.debug(`✅ Boiler Вимкнено о ${currentHour}`);
          algorithmlogger.debug(
            `✅ Boiler Вимкнено о ${currentHour}`,
            "algorithm6",
            user_id,
          );
        } else {
          //console.error(`⚠️ Не вдалося вимкнути boiler`);
          algorithmlogger.error(
            `⚠️ Не вдалося вимкнути boiler`,
            "algorithm6",
            user_id,
          );
        }
      } else {
        //logger.debug("🌤 Бойлер уже вимкнений — команду off не дублюємо");
        algorithmlogger.debug(
          "🌤 Бойлер уже вимкнений — команду off не дублюємо",
          "algorithm6",
          user_id,
        );
      }
    }
  }
}
