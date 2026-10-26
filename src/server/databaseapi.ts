import { db } from "@/server/db";
import { logger } from "@/logger";
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";

// Список свойств, которые требуют шифрования
const ENCRYPTED_PROPERTIES = ["smart_ess_creds", "smart_life_creds"];

/**
 * Ініціалізує профіль нового користувача значеннями за замовчуванням
 * Викликається ОДИН РАЗ при першому успішному sign in
 */
export async function EnsureUserProfile(
  userId: string,
  userEmail: string,
): Promise<{ isNewUser: boolean }> {
  if (!userId) {
    logger.error("❌ EnsureUserProfile: userId is required");
    throw new Error("userId is required");
  }

  try {
    // ПЕРЕВІРКА: чи існує contract - індикатор ініціалізованого профілю
    const contractExists = await db.userProperties.findUnique({
      where: {
        userId_property: {
          userId: userId,
          property: "contract",
        },
      },
      select: { property: true },
    });

    // Якщо contract існує - профіль вже ініціалізовано
    if (contractExists) {
      logger.debug(
        `✅ User profile already initialized for ${userEmail} (${userId})`,
      );
      return { isNewUser: false };
    }

    // ІНІЦІАЛІЗАЦІЯ НОВОГО КОРИСТУВАЧА
    logger.debug(
      `🆕 Initializing profile for new user ${userEmail} (${userId})`,
    );

    // Використовуємо email як дефолтне ім'я
    const userName = userEmail.split("@")[0] || "User";

    // Генеруємо contract (формат: YYMMDDHH24MISS)
    const date = new Date();
    const contract =
      date.getFullYear().toString().slice(-2) +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      date.getDate().toString().padStart(2, "0") +
      date.getHours().toString().padStart(2, "0") +
      date.getMinutes().toString().padStart(2, "0") +
      date.getSeconds().toString().padStart(2, "0");

    // Отримуємо default_appliances з system_settings
    const defaultAppliances = await GetSystemSetting("default_appliances");
    const defaultAppliancesStr =
      typeof defaultAppliances === "string"
        ? defaultAppliances
        : JSON.stringify(defaultAppliances ?? []);

    // Список всіх properties з їх значеннями за замовчуванням
    const defaultProperties: Array<{ property: string; value: string }> = [
      { property: "contract", value: contract },
      { property: "user_name", value: userName },
      { property: "setup_options", value: "" },
      { property: "sun_forecast", value: "" },
      { property: "location", value: "" },
      { property: "user_appliances", value: defaultAppliancesStr },
      { property: "algorithms", value: "" },
      { property: "smart_life_creds", value: "" },
      { property: "smart_ess_creds", value: "" },
      { property: "smart_ess_devices", value: "" },
      { property: "smart_ess_fields", value: "" },
      { property: "output_priority_options", value: "" },
      { property: "charge_source_priority_options", value: "" },
      { property: "phone_number", value: "" },
    ];

    // Створюємо всі properties одним запитом
    await db.userProperties.createMany({
      data: defaultProperties.map((prop) => ({
        userId: userId,
        property: prop.property,
        value: prop.value,
      })),
      skipDuplicates: true,
    });

    // Логуємо створення профілю
    void AddSystemLog(
      userId,
      "EnsureUserProfile",
      "profile_initialized",
      "new_user",
      null,
      `Created ${defaultProperties.length} default properties`,
    ).catch((err) => {
      logger.error(`Failed to log profile initialization`, err);
    });

    logger.debug(
      `✅ Profile initialized for new user ${userEmail} with ${defaultProperties.length} properties`,
    );

    return { isNewUser: true };
  } catch (err) {
    logger.error("❌ Failed to initialize user profile:", err);
    throw err;
  }
}

/* Отримує список всіх користувачів (id та email)
 * Використовується scheduler, admin панель, тощо
 */
export async function getAllUsers(): Promise<
  Array<{ id: string; email: string }>
> {
  try {
    const users = await db.$queryRaw<Array<{ id: string; email: string }>>`
      SELECT id::text, email
      FROM users
      WHERE email IS NOT NULL
      ORDER BY created_at DESC
    `;

    return users;
  } catch (err) {
    logger.error("Failed to get users from database:", err);
    throw err;
  }
}

/* Отримує користувача за ID
 */
export async function getUserById(
  userId: string,
): Promise<{ id: string; email: string } | null> {
  try {
    const [user] = await db.$queryRaw<Array<{ id: string; email: string }>>`
      SELECT id::text, email
      FROM users
      WHERE id = ${userId}::uuid
      AND email IS NOT NULL
    `;

    return user ?? null;
  } catch (err) {
    logger.error("Failed to get user from database:", err);
    throw err;
  }
}

/* Перевіряє чи існує користувач з даним email
 */
export async function userExistsByEmail(email: string): Promise<boolean> {
  try {
    const [user] = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(
        SELECT 1 FROM users WHERE email = ${email}
      ) as exists
    `;

    return user?.exists ?? false;
  } catch (err) {
    logger.error("Failed to check user existence:", err);
    return false;
  }
}

/* Отримує кількість користувачів
 */
export async function getUsersCount(): Promise<number> {
  try {
    const [result] = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM users
      WHERE email IS NOT NULL
    `;

    return Number(result?.count ?? 0);
  } catch (err) {
    logger.error("Failed to get users count:", err);
    return 0;
  }
}

export async function getAlgorithmsByUserId(
  userId: string,
): Promise<any[] | null> {
  try {
    const userProp = await db.userProperties.findFirst({
      where: {
        userId: userId,
        property: "algorithms",
      },
      select: {
        value: true,
      },
    });

    if (!userProp?.value) return null;

    let parsed;
    try {
      parsed = JSON.parse(userProp.value);
    } catch (err) {
      logger.error("JSON parse error:", err);
      return null;
    }

    if (!parsed?.algorithms) return null;
    return parsed.algorithms;
  } catch (err) {
    logger.error("Failed to get algorithms from database:", err);
    throw err;
  }
}

export async function getGeneralSettingsByUserId(userId: string): Promise<any> {
  try {
    const userProp = await db.userProperties.findFirst({
      where: {
        userId: userId,
        property: "algorithms",
      },
      select: {
        value: true,
      },
    });

    if (!userProp?.value) return null;

    let parsed;
    try {
      parsed = JSON.parse(userProp.value);
    } catch (err) {
      logger.error("JSON parse error:", err);
      return null;
    }

    if (!parsed?.general_settings) return null;
    return parsed.general_settings;
  } catch (err) {
    logger.error("Failed to get general_settings from database:", err);
    throw err;
  }
}

export async function getAlgorithmByName(userId: string, algName: string) {
  try {
    const record = await db.userProperties.findFirst({
      where: {
        userId: userId,
        property: "algorithms",
      },
      select: {
        value: true,
      },
    });

    //logger.debug('Algorithm record:', record);
    if (!record?.value) return null;

    let parsed;
    try {
      parsed = JSON.parse(record.value);
    } catch (err) {
      logger.error("JSON parse error:", err);
      return null;
    }

    if (!parsed?.algorithms || !Array.isArray(parsed.algorithms)) return null;

    const alg = parsed.algorithms.find(
      (a: { name: string }) => a.name === algName,
    );
    logger.debug("Found algorithm:", alg);
    return alg ?? null;
  } catch (err) {
    logger.error("Failed to get algorithm from database:", err);
    throw err;
  }
}

export async function GetJSONUserProperty(
  userId: string,
  propertyName: string,
) {
  try {
    const record = await db.userProperties.findFirst({
      where: {
        userId: userId,
        property: propertyName,
      },
      select: {
        value: true,
      },
    });

    if (!record?.value) return null;

    let valueToparse = record.value;

    // Дешифруем, если это зашифрованное свойство
    if (
      ENCRYPTED_PROPERTIES.includes(propertyName) &&
      isEncrypted(record.value)
    ) {
      try {
        valueToparse = decrypt(record.value);
        logger.debug(
          `✅ Decrypted property "${propertyName}" for user ${userId}`,
        );
      } catch (err) {
        logger.error(`❌ Failed to decrypt property "${propertyName}":`, err);
        // Возвращаем null если не можем дешифровать
        return null;
      }
    }

    let parsed;
    try {
      parsed = JSON.parse(valueToparse);
    } catch (err) {
      logger.error("JSON parse error:", err);
      return null;
    }

    return parsed ?? null;
  } catch (err) {
    logger.error("Failed to get property from database:", err);
    throw err;
  }
}

export async function GetUserProperty(userId: string, propertyName: string) {
  try {
    const record = await db.userProperties.findFirst({
      where: {
        userId: userId,
        property: propertyName,
      },
      select: {
        value: true,
        updatedAt: true,
      },
    });

    if (!record?.value) return null;

    return {
      value: record.value,
      updatedAt: record.updatedAt,
    };
  } catch (err) {
    logger.error("Failed to get property from database:", err);
    throw err;
  }
}

export async function setUserProperty(
  userId: string,
  propertyName: string,
  value: any,
): Promise<boolean> {
  try {
    if (!userId || !propertyName) {
      logger.error("❌ setUserProperty: Missing userId or propertyName");
      return false;
    }

    // Перетворюємо об'єкт у JSON-рядок
    let jsonValue = typeof value === "string" ? value : JSON.stringify(value);

    // Шифруем, если это чувствительное свойство
    if (ENCRYPTED_PROPERTIES.includes(propertyName)) {
      try {
        jsonValue = encrypt(jsonValue);
        logger.debug(
          `🔐 Encrypted property "${propertyName}" for user ${userId}`,
        );
      } catch (err) {
        logger.error(`❌ Failed to encrypt property "${propertyName}":`, err);
        return false;
      }
    }

    // Створюємо або оновлюємо запис (UPSERT)
    await db.userProperties.upsert({
      where: {
        userId_property: {
          userId: userId,
          property: propertyName,
        },
      },
      update: {
        value: jsonValue,
      },
      create: {
        userId: userId,
        property: propertyName,
        value: jsonValue,
      },
    });

    logger.debug(`✅ Property "${propertyName}" saved for user ${userId}`);
    return true;
  } catch (err) {
    logger.error("❌ Failed to set property in database:", err);
    return false;
  }
}

export async function GetDeviceStatuses(
  userId: string,
  deviceType: string,
): Promise<any[] | null> {
  try {
    const records = await db.$queryRaw<Array<Record<string, any>>>`
      SELECT *
      FROM device_statuses
      WHERE user_id = ${userId}
      AND device_type = ${deviceType}
    `;

    if (records?.length === 0) return null;

    // Якщо в таблиці є JSON-рядки — парсимо їх
    const parsedRecords = records.map((rec: Record<string, any>) => {
      const result: Record<string, any> = { ...rec };
      for (const key of Object.keys(result)) {
        if (typeof result[key] === "string") {
          try {
            const maybeJson = JSON.parse(result[key]);
            if (typeof maybeJson === "object") result[key] = maybeJson;
          } catch {
            // ігноруємо не-JSON поля
          }
        }
      }
      return result;
    });

    return parsedRecords;
  } catch (err) {
    logger.error("Failed to get device statuses:", err);
    throw err;
  }
}

export async function SaveDeviceStatus(dev_stat: {
  user_id: string;
  device_type: string;
  device_id?: string;
  status?: string;
  last_control_time?: string;
}): Promise<boolean> {
  const { user_id, device_type, device_id, status, last_control_time } =
    dev_stat;

  try {
    await db.$transaction(async (tx: any) => {
      // Шукаємо перший запис за комбінацією
      const existing = await tx.deviceStatus.findFirst({
        where: {
          user_id,
          device_type,
          device_id: device_id ?? null,
        },
      });

      if (existing) {
        // Оновлюємо тільки передані поля
        await tx.deviceStatus.update({
          where: { id: existing.id },
          data: {
            ...(status !== undefined ? { status } : {}),
            ...(last_control_time !== undefined ? { last_control_time } : {}),
          },
        });
      } else {
        // Створюємо новий запис, якщо не знайдено
        await tx.deviceStatus.create({
          data: {
            user_id,
            device_type,
            device_id: device_id ?? null,
            status,
            last_control_time,
          },
        });
      }
    });

    return true;
  } catch (err) {
    logger.error("❌ Failed to save device status:", err);
    return false;
  }
}

export async function GetDeviceId(user_id = "", device_type = "") {
  try {
    const appliances = GetJSONUserProperty(user_id, "user_appliances");
    if (!appliances) {
      logger.error(`❌ No appliances found for user ${user_id}`);
      return null;
    }
    const device = (await appliances).find(
      (o: { control_api: string; type: any }) =>
        //o.type == device_type && o.control_api == "smart_ess",
      o.type == device_type,
    );
    if (!device) {
      logger.error(
        `❌ No device of type ${device_type} found for user ${user_id}`,
      );
      return null;
    }
    return device.control_device_id;
    /*
        // Отримуємо всі алгоритми користувача
        const algorithms = await getAlgorithmsByUserId(user_id) || [];

        // Знаходимо потрібний за типом пристрою
        const activeAlgorithm = algorithms.find(
            (o: any) => Array.isArray(o.appliances_required) && o.appliances_required.includes(device_type)
        );

        if (!activeAlgorithm) {
            console.warn(`⚠️ Алгоритм не знайдено для користувача ${user_id} (${device_type})`);
            return null;
        }

        logger.debug("🔹 Знайдено алгоритм:", activeAlgorithm.device_id);
        return activeAlgorithm.device_id;
*/
  } catch (e) {
    logger.error("❌ Помилка пошуку алгоритму:", e);
    return null;
  }
}

export async function GetSystemSetting(key: string): Promise<any> {
  try {
    if (!key) {
      logger.error("❌ GetSystemSetting: Missing key");
      return null;
    }

    const record = await db.systemSettings.findUnique({
      where: { key },
      select: { value: true },
    });

    if (!record?.value) return null;

    // Якщо значення схоже на JSON — пробуємо розпарсити
    try {
      const parsed = JSON.parse(record.value);
      return parsed ?? null;
    } catch {
      return record.value; // якщо це звичайний рядок
    }
  } catch (err) {
    logger.error("❌ Failed to get system setting:", err);
    throw err;
  }
}

export async function SetSystemSetting(
  key: string,
  value: string | object,
): Promise<void> {
  try {
    if (!key) {
      logger.error("❌ SetSystemSetting: Missing key");
      throw new Error("Missing key");
    }

    const stringValue =
      typeof value === "string" ? value : JSON.stringify(value);

    await db.systemSettings.upsert({
      where: { key },
      update: { value: stringValue },
      create: { key, value: stringValue },
    });

    logger.debug(`✅ System setting saved: ${key}`);
  } catch (err) {
    logger.error("❌ Failed to set system setting:", err);
    throw err;
  }
}

export async function AddSystemLog(
  userid: string | null,
  source: string,
  type: string,
  valuename: string,
  previousvalue: string | null,
  currentvalue: string | null,
) {
  try {
    // 1️⃣ Додаємо новий запис
    await db.$executeRaw`
      INSERT INTO syslog (userid, source, type, valuename, previousvalue, currentvalue, created_at)
      VALUES (${userid}, ${source}, ${type}, ${valuename}, ${previousvalue}, ${currentvalue}, CURRENT_TIMESTAMP)
    `;

    // 2️⃣ Видаляємо старі записи, якщо їх більше 200
    await db.$executeRaw`
      DELETE FROM syslog
      WHERE id IN (
        SELECT id FROM syslog
        WHERE userid = ${userid}
        ORDER BY created_at ASC
        LIMIT GREATEST((SELECT COUNT(*) - 200 FROM syslog WHERE userid = ${userid}), 0)
      )
    `;

    logger.debug(`📝 SysLog saved: ${type} (${valuename})`);
  } catch (err) {
    logger.error("❌ Failed to write syslog:", err);
  }
}

/**
 * Отримує системний журнал користувача у вигляді масиву JSON-об'єктів
 * @param userid - ідентифікатор користувача
 * @param limit - максимальна кількість записів (за замовчуванням 200)
 */
export async function GetSysLog(userid: string, limit = 200) {
  try {
    if (!userid) {
      throw new Error("User ID is required");
    }

    const logs = await db.$queryRaw<Array<Record<string, any>>>`
      SELECT *
      FROM syslog
      WHERE userid = ${userid}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return logs; // масив JSON-об'єктів
  } catch (err) {
    logger.error("❌ Failed to load syslog:", err);
    return [];
  }
}
