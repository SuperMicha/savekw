//Night DishWashing
import { getAlgorithmByName, GetDeviceId } from "@/server/databaseapi";
import {
  execute_dailyStart,
  sendDishWasherCommand,
} from "@/server/algorithms/comon_algs";
import { logger } from "@/logger";
import { algorithmlogger } from "@/algorithm_logger";
export class Algorithm5 {
  constructor() {} // eslint-disable-line @typescript-eslint/no-empty-function

  async execute(user_id = "U093BTK78TV", algorithm_name: string) {
    //logger.debug("Executing Algorithm 5 for user:", user_id);
    algorithmlogger.debug("Executing Algorithm 5", "algorithm5", user_id);

    if (algorithm_name !== "algorithm5") return;

    //logger.debug("Processing user:", user_id);
    const algorithm = await getAlgorithmByName(user_id, "algorithm5");
    if (!algorithm) return;
    if (algorithm.status !== 1) return;

    //logger.debug("Algorithm settings:", algorithm);
    algorithmlogger.debug(
      "Algorithm settings:",
      "algorithm5",
      user_id,
      algorithm,
    );
    const device_id = await GetDeviceId(user_id, "dishwasher");
    if (!device_id) return;

    const night_dishwashing_start = algorithm.night_start;
    void execute_dailyStart(
      user_id,
      "dishwasher",
      night_dishwashing_start,
      device_id,
      sendDishWasherCommand,
      "algorithm5",
    );
  }
}
