//Discharge battery at day time, charge in the night using night tarif based on the weather data
//Night tarif start, day tarif start
// algorithm1.js
import {
  getAlgorithmByName,
  getGeneralSettingsByUserId,
  GetUserProperty,
  GetDeviceId,
} from "@/server/databaseapi";
import {
  execute_dailyStart,
  InvertorSolarMode,
  InvertorUtiltyMode,
} from "@/server/algorithms/comon_algs";
import { logger } from "@/logger";
import { algorithmlogger } from "@/algorithm_logger";

export class Algorithm1 {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  async execute(user_id = "U093BTK78TV", algorithm_name: string) {
    //logger.debug("Executing Algorithm 1 for user:", user_id);
    algorithmlogger.debug("Executing Algorithm 1", "algorithm1", user_id);

    if (algorithm_name !== "algorithm1") return;

    const algorithm = await getAlgorithmByName(user_id, "algorithm1");
    if (!algorithm) return;
    if (algorithm.status !== 1) return;

    //logger.debug("Algorithm settings:", algorithm);
    algorithmlogger.debug(
      "Algorithm settings:",
      "algorithm1",
      user_id,
      algorithm,
    );
    const device_id = await GetDeviceId(user_id, "invertor");
    if (!device_id) return;

    const {
      out_priority_sun,
      charge_priority_sun,
      out_priority_nosun,
      charge_priority_nosun,
    } = algorithm;

    // --- Отримання прогнозу ---
    //logger.debug("Fetching sun forecast data...");
    algorithmlogger.debug(
      "Fetching sun forecast data...",
      "algorithm1",
      user_id,
    );
    const userData = await GetUserProperty(user_id, "sun_forecast");
    if (!userData?.value) return;
    let parsed;
    try {
      parsed = JSON.parse(userData.value);
    } catch (err) {
      //console.error("JSON parse error:", err);
      algorithmlogger.error(
        "Fetching sun forecast data-JSON parse error",
        "algorithm1",
        user_id,
      );
      return null;
    }

    const today_forecast = parsed?.[0] ?? {};
    const tomorrow_forecast = parsed?.[1] ?? {};
    const sunnyHoursToday = today_forecast.sunnyHours ?? 0;
    const sunnyHoursTomorrow = tomorrow_forecast.sunnyHours ?? 0;

    //logger.debug("Today forecast:", today_forecast);
    //logger.debug("Tomorrow forecast:", tomorrow_forecast);
    algorithmlogger.debug(
      "Today forecast:",
      "algorithm1",
      user_id,
      today_forecast,
    );
    algorithmlogger.debug(
      "Tomorrow forecast:",
      "algorithm1",
      user_id,
      tomorrow_forecast,
    );
    // --- Отримуємо загальні налаштування алгоритмів ---
    const general_settings = await getGeneralSettingsByUserId(user_id);

    if (!general_settings) return;
    //logger.debug("General settings:", general_settings);
    algorithmlogger.debug(
      "General settings:",
      "algorithm1",
      user_id,
      general_settings,
    );
    const threshold = general_settings.sunny_hours_threshold ?? 4;
    const night_tarif_start = general_settings.night_tarif_start ?? 22;
    const night_tarif_end = general_settings.day_tarif_start ?? 6;

    algorithmlogger.debug("Run daaily check", "algorithm1", user_id);
    // --- Ранковий запуск ---
    await execute_dailyStart(
      user_id,
      "invertor",
      night_tarif_end,
      device_id,
      (user_id, command, device_id) =>
        InvertorSolarMode(
          user_id,
          "Solar mode",
          device_id,
          out_priority_sun,
          charge_priority_sun,
        ),
      "algorithm1",
    );

    // --- Вибір прогнозу для нічного тарифу ---
    const useTomorrowForecast = night_tarif_start >= 18; // якщо старт після 18:00
    const relevantSunnyHours = useTomorrowForecast
      ? sunnyHoursTomorrow
      : sunnyHoursToday;

    // --- Якщо мало сонця — активуємо нічний режим ---
    if (relevantSunnyHours < threshold) {
      // logger.debug("🌙 Прогноз малосонячний — активуємо Utility mode");
      algorithmlogger.debug(
        "🌙 Прогноз малосонячний — активуємо Utility mode",
        "algorithm1",
        user_id,
      );

      await execute_dailyStart(
        user_id,
        "invertor",
        night_tarif_start,
        device_id,
        (user_id, command, device_id) =>
          InvertorUtiltyMode(
            user_id,
            "Utility mode",
            device_id,
            out_priority_nosun,
            charge_priority_nosun,
          ),
        `algorithm1`,
      );
    } else {
      //logger.debug("☀️ Сонячних годин достатньо — нічний режим не активується");
      algorithmlogger.debug(
        "☀️ Сонячних годин достатньо — нічний режим не активується",
        "algorithm1",
        user_id,
      );
    }
  }
}
