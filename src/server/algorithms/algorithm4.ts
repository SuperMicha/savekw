//Night washing
import { getAlgorithmByName, GetDeviceId } from "@/server/databaseapi";
import {
  execute_dailyStart,
  sendWasherCommand,
} from "@/server/algorithms/comon_algs";
import { logger } from "@/logger";
import { algorithmlogger } from "@/algorithm_logger";
export class Algorithm4 {
  constructor() {} // eslint-disable-line @typescript-eslint/no-empty-function

  async execute(user_id = "U093BTK78TV", algorithm_name: string) {
    //logger.debug("Executing Algorithm 4 for user:", user_id);
    algorithmlogger.debug("Executing Algorithm 4", "algorithm4", user_id);
    if (algorithm_name !== "algorithm4") return;

    //logger.debug("Processing user:", user_id);
    const algorithm = await getAlgorithmByName(user_id, "algorithm4");
    if (!algorithm) return;
    if (algorithm.status !== 1) return;

    //logger.debug("Algorithm settings:", algorithm);
    algorithmlogger.debug(
      "Algorithm settings:",
      "algorithm4",
      user_id,
      algorithm,
    );

    const device_id = await GetDeviceId(user_id, "washer");
    if (!device_id) return;

    const night_washing_start = algorithm.night_start;
    void execute_dailyStart(
      user_id,
      "washer",
      night_washing_start,
      device_id,
      sendWasherCommand,
      "algorithm4",
    );
  }
}
