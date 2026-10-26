// Use require to avoid "Cannot find module 'node-cron' or its corresponding type declarations."
// Installing proper types or the package is recommended for a permanent fix.

import { logger, setAlgorithmContext, clearAlgorithmContext } from "@/logger";
import { TaskRunner } from "./taskrunner";
import { GetSystemSetting, SetSystemSetting } from "@/server/databaseapi";
//import { Algorithm1 } from './algorithms/algorithm1';
import { Algorithm1 } from "@/server/algorithms/algorithm1";
import { Algorithm2 } from "@/server/algorithms/algorithm2";
import { Algorithm3 } from "@/server/algorithms/algorithm3";
import { Algorithm4 } from "@/server/algorithms/algorithm4";
import { Algorithm5 } from "@/server/algorithms/algorithm5";
import { Algorithm6 } from "@/server/algorithms/algorithm6";
import { Algorithm7 } from "@/server/algorithms/algorithm7";
import { Algorithm8 } from "@/server/algorithms/algorithm8";
import { Algorithm9 } from "@/server/algorithms/algorithm9";
import { customalg } from "@/server/algorithms/customalg";
import { getsunactivity } from "@/server/algorithms/sunactivity";
import { WeatherService } from "@/server/parthnersapi/wetherapi";
import {checkmains} from "@/server/algorithms/checkmains";
// node-cron: schedules cron tasks. Install with `npm install node-cron`.
import cron from "node-cron";
import { string } from "zod";
/**
 * Планировщик
 * Запускает задачи по расписанию на основе алгоритмов из БД
 */
class Scheduler {
  private isRunning = false;

  private runners: Record<string, TaskRunner> = {};
  private cronTasks: any[] = [];
  private algorithmsMap: any[];
  private weather: WeatherService;
  constructor() {
    this.weather = new WeatherService();

    this.algorithmsMap = [
      {
        name: "algorithm1",
        interval: this.getCronIntervals("9m"),
        handler: async (userId: string) => {
         
          try {
            const alg1 = new Algorithm1();
            await alg1.execute(userId, "algorithm1");
          } finally {
           
          }
        },
      },
      {
        name: "algorithm2",
        interval: this.getCronIntervals("10m"),
        handler: async (userId: string) => {
         
          try {
            const alg1 = new Algorithm2();
            await alg1.execute(userId, "algorithm2");
          } finally {
            
          }
        },
      },
      {
        name: "algorithm3",
        interval: this.getCronIntervals("11m"),
        handler: async (userId: string) => {
         
          try {
            const alg1 = new Algorithm3();
            await alg1.execute(userId, "algorithm3");
          } finally {
            
          }
        },
      },
      {
        name: "algorithm4",
        interval: this.getCronIntervals("12m"),
        handler: async (userId: string) => {
         
          try {
            const alg1 = new Algorithm4();
            await alg1.execute(userId, "algorithm4");
          } finally {
          
          }
        },
      },
      {
        name: "algorithm5",
        interval: this.getCronIntervals("13m"),
        handler: async (userId: string) => {
       
          try {
            const alg1 = new Algorithm5();
            await alg1.execute(userId, "algorithm5");
          } finally {
         
          }
        },
      },
      {
        name: "algorithm6",
        interval: this.getCronIntervals("14m"),
        handler: async (userId: string) => {
;
          try {
            const alg1 = new Algorithm6();
            await alg1.execute(userId, "algorithm6");
          } finally {
      
          }
        },
      },
      {
        name: "algorithm7",
        interval: this.getCronIntervals("15m"),
        handler: async (userId: string) => {

          try {
            const alg1 = new Algorithm7();
            await alg1.execute(userId, "algorithm7");
          } finally {
        
          }
        },
      },
      {
        name: "algorithm8",
        interval: this.getCronIntervals("16m"),
        handler: async (userId: string) => {
  
          try {
            const alg1 = new Algorithm8();
            await alg1.execute(userId, "algorithm8");
          } finally {
        
          }
        },
      },
      {
        name: "algorithm9",
        interval: this.getCronIntervals("17m"),
        handler: async (userId: string) => {
    
          try {
            const alg1 = new Algorithm9();
            await alg1.execute(userId, "algorithm9");
          } finally {
        
          }
        },
      },
      {
        name: "weather_check",
        interval: this.getCronIntervals("30m"), // Змінено з 30s на 30m (30 хвилин)
        handler: async (userId: string) => {
        
          try {
            await this.weather.GetUserWeather(userId);
          } finally {
           
          }
        },
      },
      {
        name: "Getsunactivity",
        interval: this.getCronIntervals("30d"),
        handler: async (userId: string) => {

          try {
            const get_sunactivity = new getsunactivity();
            await get_sunactivity.execute(userId);
          } finally {
     
          }
        },
      },
      {
        name: "custom_alg",
        interval: this.getCronIntervals("1h"),
        handler: async (userId: string) => {
   
          try {
            const algcustom = new customalg();
            await algcustom.execute(userId, "custom");
          } finally {
      
          }
        },
      },
      {
        name: "check_mains",
        interval: this.getCronIntervals("1m"),
        handler: async (userId: string) => {
   
          try {
            const check_mains = new checkmains();
            await check_mains.execute(userId);
          } finally {
      
          }
        },
      },
    ];
  }

  /**
   * Перезапуск cron jobs (зупиняє і знову запускає з новими інтервалами)
   */
  async restartCronJobs() {
    logger.debug("🔄 Restarting cron jobs...");

    // Зупиняємо всі поточні tasks
    for (const task of this.cronTasks) {
      task.stop();
    }
    this.cronTasks = [];

    // Завантажуємо збережені інтервали з БД
    const savedIntervals =
      (await GetSystemSetting("scheduler_intervals")) || {};
    logger.debug("📋 Loaded intervals from DB:", savedIntervals);

    // Застосовуємо збережені інтервали
    for (const alg of this.algorithmsMap) {
      if (savedIntervals[alg.name]) {
        try {
          alg.interval = this.getCronIntervals(savedIntervals[alg.name]);
          logger.debug(
            `✅ Applied saved interval for ${alg.name}: ${savedIntervals[alg.name]}`,
          );
        } catch (err) {
          logger.warn(
            `⚠️ Invalid saved interval for ${alg.name}, using current`,
          );
        }
      }
    }

    // Створюємо нові cron jobs
    for (const alg of this.algorithmsMap) {
      const runner = this.runners[alg.name];
      if (!runner) continue;

      const task = cron.schedule(alg.interval, async () => {
        logger.debug(`Executing ${alg.name} (${alg.interval})`);
        try {
          await runner.executeAll();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error(`Failed ${alg.name}:`, msg);
        }
      });
      this.cronTasks.push(task);
    }

    console.log("✅ Cron jobs restarted successfully");
  }

  /**
   * Запуск планировщика
   * Вызывается один раз при старте сервера
   */
  async start() {
    if (this.isRunning) {
      logger.warn("⚠️ Scheduler is already running");

      return;
    }

    try {
      // Завантажуємо збережені інтервали з БД
      const savedIntervals =
        (await GetSystemSetting("scheduler_intervals")) || {};

      // Дефолтні інтервали - 999 днів (фактично вимкнено), якщо не знайдено в БД
      const defaultIntervals: Record<string, string> = {
        algorithm1: "999d",
        algorithm2: "999d",
        algorithm3: "999d",
        algorithm4: "999d",
        algorithm5: "999d",
        algorithm6: "999d",
        algorithm7: "999d",
        algorithm8: "999d",
        algorithm9: "999d",
        weather_check: "999d",
        Getsunactivity: "999d",
        custom_alg: "999d",
      };

      // Додаємо тільки відсутні ключі (не перезаписуємо існуючі!)
      let needsSave = false;
      for (const [algName, defaultInterval] of Object.entries(
        defaultIntervals,
      )) {
        if (!savedIntervals[algName]) {
          savedIntervals[algName] = defaultInterval;
          needsSave = true;
          logger.info(
            `📋 Added default interval for ${algName}: ${defaultInterval} (effectively disabled)`,
          );
        }
      }

      // Зберігаємо в БД тільки якщо додали нові ключі
      if (needsSave) {
        await SetSystemSetting("scheduler_intervals", savedIntervals);
        logger.info(
          "✅ Missing default intervals saved to DB (999 days = disabled)",
        );
      }

      logger.debug("📋 Loaded intervals from DB:", savedIntervals);

      // Застосовуємо збережені інтервали
      for (const alg of this.algorithmsMap) {
        if (savedIntervals[alg.name]) {
          try {
            alg.interval = this.getCronIntervals(savedIntervals[alg.name]);
            logger.debug(
              `✅ Applied saved interval for ${alg.name}: ${savedIntervals[alg.name]}`,
            );
          } catch (err) {
            logger.warn(
              `⚠️ Invalid saved interval for ${alg.name}, using default`,
            );
          }
        }
      }

      // Ініціалізуємо WeatherService перед запуском планувальника
      await this.weather.init();
      logger.debug("🚀 Starting scheduler...");
      for (const alg of this.algorithmsMap) {
        const runner = new TaskRunner(alg);
        this.runners[alg.name] = runner;

        // 🔹 Плануємо запуск відповідно до інтервалу

        const task = cron.schedule(alg.interval, async () => {
          logger.debug(`Executing ${alg.name} (${alg.interval})`);
          try {
            await runner.executeAll();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`Failed ${alg.name}:`, msg);
          }
        });
        this.cronTasks.push(task);
      }
      logger.debug("✅ Scheduler started for all algorithms.");

      // ******** Кирил, вставь свой код запуска планировщика здесь ********

      this.isRunning = true;
      console.log("✅ Scheduler started successfully");
    } catch (error) {
      logger.error("❌ Failed to start scheduler:", error);
      // Не встановлюємо isRunning = true при помилці
      throw error;
    }
  }

  /**
   * Остановка планировщика
   * Вызывается при graceful shutdown
   */
  stop() {
    if (!this.isRunning) {
      logger.debug("⚠️ Scheduler is not running");
      return;
    }

    console.log("🛑 Stopping scheduler...");
    logger.debug("🛑 Stopping all cron jobs...");
    for (const task of this.cronTasks) {
      task.stop();
    }
    this.cronTasks = [];
    this.isRunning = false;
    logger.debug("✅ Scheduler stopped");
  }

  getCronIntervals(interval: string) {
    if (typeof interval !== "string")
      throw new Error("Interval must be a string");

    const trimmed = interval.trim().toLowerCase();

    // 🔹 Секунди
    if (/^\d+\s*(s|sec|seconds?)$/.test(trimmed)) {
      const n = parseInt(trimmed);
      if (n < 1 || n > 59) throw new Error("Seconds must be between 1–59");
      return `*/${n} * * * * *`; // cron з секундами (node-cron підтримує)
    }

    // 🔹 Хвилини
    if (/^\d+\s*(m|min|minutes?)$/.test(trimmed)) {
      const n = parseInt(trimmed);
      if (n < 1 || n > 59) throw new Error("Minutes must be between 1–59");
      return `*/${n} * * * *`;
    }

    // 🔹 Години
    if (/^\d+\s*(h|hr|hours?)$/.test(trimmed)) {
      const n = parseInt(trimmed);
      if (n < 1 || n > 23) throw new Error("Hours must be between 1–23");
      return `0 */${n} * * *`;
    }

    // 🔹 Дні
    if (/^\d+\s*(d|day|days?)$/.test(trimmed)) {
      const n = parseInt(trimmed);
      if (n < 1 || n > 31) throw new Error("Days must be between 1–31");
      return `0 0 */${n} * *`;
    }

    // 🔹 Раз на тиждень
    if (/^(w|week|weekly)$/.test(trimmed)) {
      return `0 0 * * 0`; // щонеділі
    }

    throw new Error(`Unsupported interval format: ${interval}`);
  }

  /**
   * Проверка статуса планировщика
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
    };
  }

  /**
   * Отримати інформацію про всі алгоритми
   */
  async getAlgorithmsInfo() {
    // Завантажуємо збережені інтервали з БД для відображення оригінального формату
    const savedIntervals =
      (await GetSystemSetting("scheduler_intervals")) || {};

    return this.algorithmsMap.map((alg) => {
      const runner = this.runners[alg.name];
      // Використовуємо збережений інтервал з БД, якщо є, інакше конвертуємо cron назад
      const originalInterval =
        savedIntervals[alg.name] || this.getIntervalDisplay(alg.interval);

      return {
        name: alg.name,
        displayName: this.getDisplayName(alg.name),
        interval: originalInterval, // Показуємо оригінальний формат (30s, 10m тощо)
        enabled: runner?.isEnabled ?? true,
        lastRun: runner?.lastRun,
        status: runner?.status ?? "idle",
      };
    });
  }

  /**
   * Отримати людський вигляд назви алгоритму
   */
  private getDisplayName(name: string): string {
    const displayNames: Record<string, string> = {
      algorithm1: "Алгоритм 1",
      algorithm2: "Алгоритм 2",
      algorithm3: "Алгоритм 3",
      algorithm4: "Алгоритм 4",
      algorithm5: "Алгоритм 5",
      algorithm6: "Алгоритм 6",
      algorithm7: "Алгоритм 7",
      algorithm8: "Алгоритм 8",
      algorithm9: "Алгоритм 9",
      weather_check: "Перевірка погоди",
      Getsunactivity: "Активність сонця",
      custom_alg: "Користувацький алгоритм",
    };
    return displayNames[name] ?? name;
  }

  /**
   * Конвертувати cron в людський вигляд
   */
  private getIntervalDisplay(cronExpression: string): string {
    // Приклади: "*\/9 * * * *" -> "кожні 9 хв"
    const minuteMatch = /\*\/(\d+) \* \* \* \*/.exec(cronExpression);
    if (minuteMatch) return `кожні ${minuteMatch[1]} хв`;

    const hourMatch = /0 \*\/(\d+) \* \* \*/.exec(cronExpression);
    if (hourMatch) return `кожні ${hourMatch[1]} год`;

    const dayMatch = /0 0 \*\/(\d+) \* \*/.exec(cronExpression);
    if (dayMatch) return `кожні ${dayMatch[1]} дн`;

    const secondMatch = /\*\/(\d+) \* \* \* \* \*/.exec(cronExpression);
    if (secondMatch) return `кожні ${secondMatch[1]} сек`;

    return cronExpression;
  }

  /**
   * Увімкнути/вимкнути алгоритм
   */
  async toggleAlgorithm(algorithmName: string, enabled: boolean) {
    const runner = this.runners[algorithmName];
    if (!runner) {
      throw new Error(`Algorithm ${algorithmName} not found`);
    }

    runner.setEnabled(enabled);
    logger.info(
      `🔄 Algorithm ${algorithmName} ${enabled ? "enabled" : "disabled"}`,
    );
  }

  /**
   * Запустити алгоритм вручну для всіх користувачів
   */
  async runAlgorithmManually(algorithmName: string) {
    // Автоматично запустити scheduler якщо ще не запущено
    if (!this.isRunning) {
      await this.start();
    }

    const runner = this.runners[algorithmName];
    if (!runner) {
      throw new Error(`Algorithm ${algorithmName} not found`);
    }

    logger.info(`▶️ Manually running ${algorithmName}...`);
    await runner.executeAll();
    logger.info(`✅ Manual run completed for ${algorithmName}`);
  }

  /**
   * Оновити інтервал алгоритму
   */
  async updateAlgorithmInterval(algorithmName: string, newInterval: string) {
    const algConfig = this.algorithmsMap.find((a) => a.name === algorithmName);
    if (!algConfig) {
      throw new Error(`Algorithm ${algorithmName} not found`);
    }

    // Валідація інтервалу
    const cronExpression = this.getCronIntervals(newInterval);

    // Зберігаємо в БД
    const currentIntervals =
      (await GetSystemSetting("scheduler_intervals")) || {};
    currentIntervals[algorithmName] = newInterval;
    await SetSystemSetting("scheduler_intervals", currentIntervals);

    // Оновлюємо конфігурацію в пам'яті
    algConfig.interval = cronExpression;

    logger.info(
      `✅ Interval for ${algorithmName} updated to ${newInterval} (${cronExpression}) and saved to DB`,
    );
    logger.warn("⚠️ Restart server to apply cron schedule changes.");
  }

  /**
   * Забезпечити що scheduler запущено (викликається автоматично при потребі)
   */
  async ensureStarted() {
    if (!this.isRunning) {
      await this.start();
    }
  }
}

// Экспортируем singleton
export const scheduler = new Scheduler();

// Автоматично запускаємо scheduler при імпорті (для dev режиму)
if (process.env.NODE_ENV !== "test") {
  scheduler.start().catch((err) => {
    console.error("Failed to auto-start scheduler:", err);
  });
}
