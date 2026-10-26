//Boiler working only on the night

import { logger } from "@/logger";
import { Smartessapi } from "../parthnersapi/smartessapi";

export class getsunactivity {
  constructor() {} // eslint-disable-line @typescript-eslint/no-empty-function

  async execute(user_id = "U093BTK78TV") {
    logger.debug("Executing Algorithm custom for user:", user_id);
    return;

    // if (user_id != 'ebd80cbd-e827-4600-8253-8e10ac89415c') return;
    logger.debug("Processing user:", user_id);
    const smartess = new Smartessapi();
    await smartess.init();
    //const result= await smartess.authRequest(user_id);
    //const result= await smartess.Discovery(user_id);
    const result = await smartess.GetPvChart(user_id, this.getPreviousDate());
  }

  getPreviousDate() {
    const today = new Date();
    today.setDate(today.getDate() - 1); // віднімаємо один день
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
