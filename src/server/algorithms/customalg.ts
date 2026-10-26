// Placeholder for user-specific custom algorithms.
//
// This module is intentionally empty: it used to hold an experimental
// eWeLink integration wired to a single hard-coded account. The credentials
// were removed before open-sourcing. Implement your own logic here and read
// every secret from the environment or from the `system_settings` table.
import { logger } from "@/logger";

export class customalg {
  constructor() {} // eslint-disable-line @typescript-eslint/no-empty-function

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(user_id: string, algorithm_name: string) {
    logger.debug("customalg is a no-op placeholder", {
      user_id,
      algorithm_name,
    });
    return;
  }
}
