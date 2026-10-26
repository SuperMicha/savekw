// 📄 logger.ts

import { db } from "@/server/db";

export enum LogLevel {
  OFF = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

// 🔧 Поточний рівень логування
let currentLevel: LogLevel = LogLevel.DEBUG;

// ⚙️ Допоміжна функція для установки рівня ззовні
export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

export function getLogLevel() {
  return currentLevel;
}

// Context для алгоритмів (встановлюється перед запуском)
let algorithmContext: {
  algorithmName?: string;
  userId?: string;
  executionId?: string;
} = {};

/**
 * Встановити контекст для логування алгоритму
 */
export function setAlgorithmContext(context: {
  algorithmName?: string;
  userId?: string;
  executionId?: string;
}) {
  algorithmContext = context;
}

/**
 * Очистити контекст після виконання алгоритму
 */
export function clearAlgorithmContext() {
  algorithmContext = {};
}

/**
 * Зберегти лог в БД (асинхронно, не блокує виконання)
 */
async function saveLogToDB(
  level: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  // Якщо немає контексту алгоритму - не пишемо в БД
  if (!algorithmContext.algorithmName) {
    return;
  }

  try {
    await db.algorithmLog.create({
      data: {
        algorithm: algorithmContext.algorithmName,
        level,
        message,
        userId: algorithmContext.userId,
        executionId: algorithmContext.executionId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // Автоматично видаляємо старі логи (старше 5 днів)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    await db.algorithmLog.deleteMany({
      where: {
        createdAt: {
          lt: fiveDaysAgo,
        },
      },
    });
  } catch (err) {
    // Якщо не можемо записати в БД - виводимо помилку в консоль
    console.error("❌ Failed to save log to DB:", err);
    console.error("Context:", algorithmContext);
    console.error("Message:", message);
  }
}

// 🪵 Основний логер
export const logger = {
  error: (...args: unknown[]) => {
    if (currentLevel >= LogLevel.ERROR) {
      console.error("❌ [ERROR]", ...args);
      const message = args.map((a) => String(a)).join(" ");
      void saveLogToDB("error", message);
    }
  },

  warn: (...args: unknown[]) => {
    if (currentLevel >= LogLevel.WARN) {
      console.warn("⚠️ [WARN]", ...args);
      const message = args.map((a) => String(a)).join(" ");
      void saveLogToDB("warn", message);
    }
  },

  info: (...args: unknown[]) => {
    if (currentLevel >= LogLevel.INFO) {
      console.info("ℹ️ [INFO]", ...args);
      const message = args.map((a) => String(a)).join(" ");
      void saveLogToDB("info", message);
    }
  },

  debug: (...args: unknown[]) => {
    if (currentLevel >= LogLevel.DEBUG) {
      console.log("🐛 [DEBUG]", ...args);
      const message = args.map((a) => String(a)).join(" ");
      void saveLogToDB("debug", message);
    }
  },
};
