//Dishwashing at the day time and at the night
import { getAlgorithmByName, GetDeviceId } from "@/server/databaseapi";
import {
  execute_dailyStart,
  sendDishWasherCommand,
} from "@/server/algorithms/comon_algs";
import { logger } from "@/logger";
import { algorithmlogger } from "@/algorithm_logger";
export class Algorithm8 {
  constructor() {} // eslint-disable-line @typescript-eslint/no-empty-function

  async execute(user_id = "U093BTK78TV", algorithm_name: string) {
    //logger.debug("Executing Algorithm 8 for user:", user_id);
    algorithmlogger.debug("Executing Algorithm 8", "algorithm8", user_id);

    if (algorithm_name !== "algorithm8") return;

    //logger.debug("Processing user:", user_id);
    const algorithm = await getAlgorithmByName(user_id, "algorithm8");
    if (!algorithm) return;
    if (algorithm.status !== 1) return;

    //logger.debug("Algorithm settings:", algorithm);
    algorithmlogger.debug(
      "Algorithm settings:",
      "algorithm8",
      user_id,
      algorithm,
    );
    const device_id = await GetDeviceId(user_id, "dishwasher");
    if (!device_id) return;

    const night_washing_start = algorithm.night_start;
    const day_washing_start = algorithm.day_start;

    void execute_dailyStart(
      user_id,
      "dishwasher",
      day_washing_start,
      device_id,
      sendDishWasherCommand,
      "algorithm8",
    );
    void execute_dailyStart(
      user_id,
      "dishwasher",
      night_washing_start,
      device_id,
      sendDishWasherCommand,
      "algorithm8",
    );
  }
}
