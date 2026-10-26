//Boiler working only on the night
import { getAlgorithmByName, GetDeviceId } from "@/server/databaseapi";
import {
  execute_timeRangeControl,
  sendBoilerCommand,
} from "@/server/algorithms/comon_algs";
import { logger } from "@/logger";
import { algorithmlogger } from "@/algorithm_logger";
export class Algorithm3 {
  constructor() {} // eslint-disable-line @typescript-eslint/no-empty-function

  async execute(user_id = "U093BTK78TV", algorithm_name: string) {
    //logger.debug("Executing Algorithm 3 for user:", user_id);
    algorithmlogger.debug("Executing Algorithm 3", "algorithm3", user_id);
    if (algorithm_name !== "algorithm3") return;

    //logger.debug("Processing user:", user_id);
    const algorithm = await getAlgorithmByName(user_id, "algorithm3");
    if (!algorithm) return;
    if (algorithm.status !== 1) return;

    //logger.debug("Algorithm settings:", algorithm);
    algorithmlogger.debug(
      "Algorithm settings:",
      "algorithm3",
      user_id,
      algorithm,
    );

    const device_id = await GetDeviceId(user_id, "boiler");
    if (!device_id) return;

    const boiler_night_end = algorithm.night_end;
    const boiler_night_start = algorithm.night_start;

    void execute_timeRangeControl(
      user_id,
      "boiler",
      boiler_night_start,
      boiler_night_end,
      device_id,
      sendBoilerCommand,
      "algorithm3",
    );
  }
}
