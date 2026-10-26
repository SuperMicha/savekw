import { getAllUsers } from "@/server/databaseapi";
import { logger } from "@/logger";
export class TaskRunner {
  concurrencyLimit: number;
  writeQueue: Promise<void>;
  algorithm: any;
  isEnabled: boolean;
  lastRun?: Date;
  status: "idle" | "running" | "error";

  constructor(algorithm: any, concurrencyLimit = 10) {
    this.algorithm = algorithm; // { name, handler }
    this.concurrencyLimit = concurrencyLimit;
    this.writeQueue = Promise.resolve(); // для серійного запису
    this.isEnabled = true; // за замовчуванням увімкнуто
    this.status = "idle";
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  async queueWrite(fn: () => any) {
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        await fn();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("Write failed:", message);
      }
    });
    return this.writeQueue;
  }

  async executeAll() {
    // Якщо алгоритм вимкнено - не виконуємо
    if (!this.isEnabled) {
      logger.debug(`⏸️ ${this.algorithm.name} is disabled, skipping`);
      return;
    }

    this.status = "running";
    this.lastRun = new Date();

    try {
      const users = await getAllUsers();
      const activeTasks = [];
      logger.debug(
        `🚀 Starting ${this.algorithm.name} for ${users.length} users`,
      );

      for (const user of users) {
        // Додаємо користувача до асинхронної черги
        const task = this.algorithm
          .handler(user.id, this.queueWrite.bind(this))
          .catch((err: any) =>
            console.error(
              `Error in ${this.algorithm.name} for user ${user.id}:`,
              err.message,
            ),
          );

        activeTasks.push(task);

        // Контроль кількості паралельних обробок
        if (activeTasks.length >= this.concurrencyLimit) {
          await Promise.race(activeTasks);
          for (let i = activeTasks.length - 1; i >= 0; i--) {
            if (activeTasks[i].done) activeTasks.splice(i, 1);
          }
        }
      }

      await Promise.allSettled(activeTasks);
      logger.debug(`✅ ${this.algorithm.name} done for ${users.length} users`);
      this.status = "idle";
    } catch (err) {
      this.status = "error";
      logger.error(`❌ ${this.algorithm.name} failed:`, err);
      throw err;
    }
  }
}
