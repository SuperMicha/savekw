//Discharge battery at day time, charge in the night using night tarif no weather data
import {
  getAlgorithmByName,
  getGeneralSettingsByUserId,
  GetDeviceId,
} from "@/server/databaseapi";
import {
  execute_dailyStart,
  InvertorSolarMode,
  InvertorUtiltyMode,
} from "@/server/algorithms/comon_algs";
import { logger } from "@/logger";
import { algorithmlogger } from "@/algorithm_logger";
export class Algorithm2 {
  constructor() {} // eslint-disable-line @typescript-eslint/no-empty-function

  async execute(user_id = "U093BTK78TV", algorithm_name: string) {
    //logger.debug("Executing Algorithm 2 for user:", user_id);
    await algorithmlogger.debug("Executing Algorithm 2", "algorithm2", user_id);

    if (algorithm_name !== "algorithm2") return;

    //logger.debug("Processing user:", user_id);
    const algorithm = await getAlgorithmByName(user_id, "algorithm2");
    if (!algorithm) return;
    if (algorithm.status !== 1) return;

    //logger.debug("Algorithm settings:", algorithm);
    algorithmlogger.debug(
      "Algorithm settings:",
      "algorithm2",
      user_id,
      algorithm,
    );
    const device_id = await GetDeviceId(user_id, "invertor");
    if (!device_id) return;

    const {
      out_priority_charge,
      charge_priority_charge,
      out_priority_discharge,
      charge_priority_discharge,
    } = algorithm;

    // --- Отримуємо загальні налаштування алгоритмів ---
    const general_settings = await getGeneralSettingsByUserId(user_id);

    if (!general_settings) return;
    //logger.debug("General settings:", general_settings);
    algorithmlogger.debug(
      "General settings:",
      "algorithm2",
      user_id,
      general_settings,
    );

    const night_tarif_start = general_settings.night_tarif_start ?? 22;
    const night_tarif_end = general_settings.day_tarif_start ?? 6;

    //logger.debug("Run user Algorithm 2");

    await execute_dailyStart(
      user_id,
      "invertor",
      night_tarif_start,
      device_id,
      (user_id, command, device_id) =>
        InvertorSolarMode(
          user_id,
          "Utility mode",
          device_id,
          out_priority_charge,
          charge_priority_charge,
        ),
      "algorithm2",
    );

    await execute_dailyStart(
      user_id,
      "invertor",
      night_tarif_end,
      device_id,
      (user_id, command, device_id) =>
        InvertorUtiltyMode(
          user_id,
          "Solar mode",
          device_id,
          out_priority_discharge,
          charge_priority_discharge,
        ),
      "algorithm2",
    );
  }
}
