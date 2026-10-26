//Washing in the day time and in the night
//Night washing
import { getAlgorithmByName, GetDeviceId } from "@/server/databaseapi";
import {
  execute_dailyStart,
  sendWasherCommand,
} from "@/server/algorithms/comon_algs";
import { logger } from "@/logger";
import { algorithmlogger } from "@/algorithm_logger";
export class Algorithm7 {
  constructor() {} // eslint-disable-line @typescript-eslint/no-empty-function

  async execute(user_id = "U093BTK78TV", algorithm_name: string) {
    //logger.debug("Executing Algorithm 7 for user:", user_id);
    algorithmlogger.debug("Executing Algorithm 7", "algorithm7", user_id);
    if (algorithm_name !== "algorithm7") return;

    //logger.debug("Processing user:", user_id);
    const algorithm = await getAlgorithmByName(user_id, "algorithm7");
    if (!algorithm) return;
    if (algorithm.status !== 1) return;

    //logger.debug("Algorithm settings:", algorithm);
    algorithmlogger.debug(
      "Algorithm settings:",
      "algorithm7",
      user_id,
      algorithm,
    );
    const device_id = await GetDeviceId(user_id, "washer");
    if (!device_id) return;

    const night_washing_start = algorithm.night_start;
    const day_washing_start = algorithm.day_start;

    void execute_dailyStart(
      user_id,
      "washer",
      day_washing_start,
      device_id,
      sendWasherCommand,
      "algorithm7",
    );
    void execute_dailyStart(
      user_id,
      "washer",
      night_washing_start,
      device_id,
      sendWasherCommand,
      "algorithm7",
    );
  }
}
