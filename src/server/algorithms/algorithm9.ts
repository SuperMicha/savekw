//Зарядка електромобіля вночі

import { getAlgorithmByName, GetDeviceId } from "@/server/databaseapi";
import {
  execute_timeRangeControl,
  sendBoilerCommand,
} from "@/server/algorithms/comon_algs";
import { logger } from "@/logger";
import { algorithmlogger } from "@/algorithm_logger";
export class Algorithm9 {
  constructor() {} // eslint-disable-line @typescript-eslint/no-empty-function

  async execute(user_id = "U093BTK78TV", algorithm_name: string) {
    //logger.debug("Executing Algorithm 9 for user:", user_id);
    algorithmlogger.debug("Executing Algorithm 9", "algorithm9", user_id);
    if (algorithm_name !== "algorithm9") return;

    //logger.debug("Processing user:", user_id);
    const algorithm = await getAlgorithmByName(user_id, "algorithm9");
    if (!algorithm) return;
    if (algorithm.status !== 1) return;

    //logger.debug("Algorithm settings:", algorithm);
    algorithmlogger.debug(
      "Algorithm settings:",
      "algorithm9",
      user_id,
      algorithm,
    );
    const device_id = await GetDeviceId(user_id, "CarCharger");
    if (!device_id) return;

    const night_end = algorithm.night_end;
    const night_start = algorithm.night_start;

    void execute_timeRangeControl(
      user_id,
      "boiler", //Use the same plug type as boiler to reuse sendBoilerCommand function
      night_start,
      night_end,
      device_id,
      sendBoilerCommand,
      "algorithm9",
    );
  }
}
