import { db } from "@/server/db";
import { getLogLevel, LogLevel } from "@/logger";

/**
 * 🔍 Визначає клас, метод, файл і номер рядка виклику через stack trace
 */
function getCallerInfo() {
  const err = new Error();
  if (!err.stack) return {};

  const stack = err.stack.split("\n").map((s) => s.trim());
  const callerLine = stack[3] || "";

  // Приклад рядка: at ClassName.methodName (path/to/file.ts:123:45)
  const regex = /at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?$/;
  const match = callerLine.match(regex);

  if (!match) {
    return { raw: callerLine };
  }

  const [, func, file, line, col] = match;

  let className: string | undefined;
  let methodName: string | undefined;

  if (func && func.includes(".")) {
    const parts = func.split(".");
    className = parts[0];
    methodName = parts[1];
  } else {
    methodName = func || undefined;
  }

  return {
    file,
    line: Number(line),
    col: Number(col),
    class: className,
    method: methodName,
    raw: callerLine,
  };
}

function parseLogArgs(args: unknown[]) {
  const [message, name, user_id, metadata] = args;

  return {
    message: message ? String(message) : "",
    name: name ? String(name) : undefined,
    user_id: user_id ? String(user_id) : undefined,
    metadata: typeof metadata === "object" && metadata !== null ? metadata as Record<string, unknown> : {},
  };
}

/**
 * 💾 Зберегти лог у БД
 */
async function saveALogToDB(
  name: string,
  user_id?: string,
  level?: string,
  message?: string,
  metadata?: Record<string, unknown>,
) {
  if (!name || name.length === 0) return;

  try {
    await db.algorithmLog.create({
      data: {
        algorithm: name,
        level: level ?? "info",
        message: message ?? "",
        userId: user_id,
        executionId: "",
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    await db.algorithmLog.deleteMany({
      where: { createdAt: { lt: fiveDaysAgo } },
    });
  } catch (err) {
    console.error("❌ Failed to save log to DB:", err);
    console.error("Message:", message);
  }
}

/**
 * 🏭 Фабрика функцій логування
 */
 function makeLogFunction(
  levelName: string,
  logLevel: LogLevel,
  consoleFn: (...d: any[]) => void,
) {
  return async (...args: unknown[]) => {
    if (getLogLevel() < logLevel) return;

   const { name, user_id, message, metadata } = parseLogArgs(args);
   
    //const caller = getCallerInfo();

    // Лог у консоль
    consoleFn(
      `[${levelName.toUpperCase()}]`,
      message,
      metadata,
    );

    // об’єднане metadata з caller info
    const fullMeta = {
      ...metadata
     
    };

    await saveALogToDB(name||"", user_id, levelName, message, fullMeta);
  };
}

/**
 * 🪵 Основний логер алгоритмів
 */
export const algorithmlogger = {
  error: makeLogFunction("error", LogLevel.ERROR, console.error),
  warn: makeLogFunction("warn", LogLevel.WARN, console.warn),
  info: makeLogFunction("info", LogLevel.INFO, console.info),
  debug: makeLogFunction("debug", LogLevel.DEBUG, console.log),
};
