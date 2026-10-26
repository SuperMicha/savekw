/**
 * Типы и константы для оборудования пользователя
 */

// Типы оборудования
export const APPLIANCE_TYPES = {
  ENERGY_METER: "energy_meeter",
  SOLAR_PANEL: "solar_panel",
  INVERTOR: "invertor",
  DISHWASHER: "dishwasher",
  WASHER: "washer",
  BOILER: "boiler",
  CAR_CHARGER: "CarCharger",
} as const;

export type ApplianceType =
  (typeof APPLIANCE_TYPES)[keyof typeof APPLIANCE_TYPES];

// Лейблы на украинском языке
export const APPLIANCE_LABELS: Record<ApplianceType, string> = {
  [APPLIANCE_TYPES.ENERGY_METER]: "Двотарифний лічильник",
  [APPLIANCE_TYPES.SOLAR_PANEL]: "Сонячні панелі",
  [APPLIANCE_TYPES.INVERTOR]: "Інвертор з АКБ",
  [APPLIANCE_TYPES.DISHWASHER]: "Посудомийка",
  [APPLIANCE_TYPES.WASHER]: "Пральна Машина",
  [APPLIANCE_TYPES.BOILER]: "Бойлер",
  [APPLIANCE_TYPES.CAR_CHARGER]: "Розетка для зарядки електромобіля",
};

// Описи пристроїв для SmartLife (control_api: "smart_life")
export const SMARTLIFE_DEVICE_DESCRIPTIONS: Partial<
  Record<ApplianceType, string>
> = {
  [APPLIANCE_TYPES.DISHWASHER]:
    "Натискач кнопок Cubetouch для керування посудомийною машиною",
  [APPLIANCE_TYPES.WASHER]:
    "Натискач кнопок Cubetouch для керування пральною машиною",
  [APPLIANCE_TYPES.BOILER]: "Wi-Fi розетка Tuya для керування роботою бойлера",
  [APPLIANCE_TYPES.CAR_CHARGER]: "Wi-Fi розетка Tuya для зарядки електромобіля",
};

// Порядок отображения в форме
export const APPLIANCE_ORDER: ApplianceType[] = [
  APPLIANCE_TYPES.ENERGY_METER,
  APPLIANCE_TYPES.DISHWASHER,
  APPLIANCE_TYPES.WASHER,
  APPLIANCE_TYPES.BOILER,
  APPLIANCE_TYPES.INVERTOR,
  APPLIANCE_TYPES.SOLAR_PANEL,
  APPLIANCE_TYPES.CAR_CHARGER,
];

// Интерфейс для одного элемента оборудования
export interface ApplianceItem {
  type: ApplianceType;
  status: boolean;
  control_device_id?: string;
  control_api?: string;
}

// Массив всех оборудований
export type AppliancesData = ApplianceItem[];

// Значения по умолчанию (fallback если system_settings пустий)
export const FALLBACK_DEFAULT_APPLIANCES: AppliancesData = APPLIANCE_ORDER.map(
  (type) => ({
    type,
    status: false,
    control_device_id: "",
    control_api: "",
  }),
);

/**
 * Отримує дефолтні appliances з system_settings або використовує fallback
 * @param systemSettingsValue - значення з system_settings.default_appliances
 * @returns масив ApplianceItem з усіма необхідними полями
 */
export function getDefaultAppliances(
  systemSettingsValue?: unknown,
): AppliancesData {
  if (!systemSettingsValue) {
    return [...FALLBACK_DEFAULT_APPLIANCES];
  }

  try {
    // Якщо це вже масив - використовуємо його
    const parsed = Array.isArray(systemSettingsValue)
      ? systemSettingsValue
      : JSON.parse(systemSettingsValue as string);

    if (!Array.isArray(parsed)) {
      return [...FALLBACK_DEFAULT_APPLIANCES];
    }

    // Валідуємо структуру
    const isValid = parsed.every(
      (item: unknown) =>
        typeof item === "object" &&
        item !== null &&
        "type" in item &&
        "status" in item &&
        typeof (item as { status: unknown }).status === "boolean",
    );

    if (!isValid) {
      return [...FALLBACK_DEFAULT_APPLIANCES];
    }

    // Мап з дефолтними значеннями для відсутніх полів
    return parsed.map((item: Partial<ApplianceItem>) => ({
      type: item.type!,
      status: item.status!,
      control_device_id: item.control_device_id ?? "",
      control_api: item.control_api ?? "",
    }));
  } catch (error) {
    console.error("Failed to parse default_appliances:", error);
    return [...FALLBACK_DEFAULT_APPLIANCES];
  }
}

// Хелпер для парсинга JSON из БД
export function parseAppliancesData(
  value: string | null,
  systemSettingsValue?: unknown,
): AppliancesData {
  const defaultAppliances = getDefaultAppliances(systemSettingsValue);

  if (!value) {
    return defaultAppliances;
  }

  if (!value) {
    return defaultAppliances;
  }

  try {
    const parsed = JSON.parse(value) as AppliancesData;

    // Валидация структуры
    if (!Array.isArray(parsed)) return defaultAppliances;

    // Проверяем что все элементы имеют правильную структуру
    const isValid = parsed.every(
      (item) =>
        typeof item === "object" &&
        "type" in item &&
        "status" in item &&
        typeof item.status === "boolean",
    );

    if (!isValid) return defaultAppliances;

    // Мердж с дефолтными значениями (на случай добавления новых типов)
    const parsedTypes = new Set(parsed.map((item) => item.type));
    const merged = [...parsed];

    // Добавляем отсутствующие типы из дефолтів
    defaultAppliances.forEach((defaultItem) => {
      if (!parsedTypes.has(defaultItem.type)) {
        merged.push(defaultItem);
      }
    });

    // Сортируем по APPLIANCE_ORDER
    return merged.sort((a, b) => {
      return APPLIANCE_ORDER.indexOf(a.type) - APPLIANCE_ORDER.indexOf(b.type);
    });
  } catch (error) {
    console.error("Failed to parse appliances data:", error);
    return defaultAppliances;
  }
}

// Хелпер для сериализации в JSON для БД
export function stringifyAppliancesData(data: AppliancesData): string {
  return JSON.stringify(data);
}

// Ключ для хранения в UserProperties
export const USER_APPLIANCES_KEY = "user_appliances";

// Ключ для хранения алгоритмов пользователя
export const USER_ALGORITHMS_KEY = "algorithms";

// Типы для алгоритмов
export interface Algorithm {
  id: number;
  device_id: string;
  description: string;
  status: number;
  name: string;
  appliances_required: string[];
  appliances_absent: string[];
  equipment: number[];
  [key: string]: unknown; // Для дополнительных параметров алгоритмов
}

export interface GeneralSettings {
  sunny_hours_threshold: number;
  day_tarif_start: number;
  night_tarif_start: number;
  active_solar_start: number;
  active_solar_end: number;
  autodetect_active_solar_timeframe: boolean;
}

export interface DefaultAlgorithms {
  general_settings: GeneralSettings;
  algorithms: Algorithm[];
}

export interface UserAlgorithms {
  general_settings: GeneralSettings;
  algorithms: Algorithm[];
}

/**
 * Получить доступные алгоритмы на основе выбранного оборудования
 * @param userAppliances - массив выбранного оборудования пользователя
 * @param defaultAlgorithms - объект с дефолтными алгоритмами из системных настроек
 * @returns массив доступных алгоритмов
 */
export function getAvailableAlgorithms(
  userAppliances: AppliancesData,
  defaultAlgorithms: DefaultAlgorithms,
): Algorithm[] {
  // Создаем объект статусов для быстрого доступа
  const userStatus: Record<string, boolean> = {};
  userAppliances.forEach((appliance) => {
    userStatus[appliance.type] = appliance.status;
  });

  // Фильтруем алгоритмы по условиям
  const availableAlgorithms = defaultAlgorithms.algorithms.filter((alg) => {
    // Все required должны быть true
    const requiredOk = alg.appliances_required.every(
      (req) => userStatus[req] === true,
    );
    // Все absent должны быть false или отсутствовать
    const absentOk = alg.appliances_absent.every(
      (abs) => userStatus[abs] !== true,
    );
    return requiredOk && absentOk;
  });

  return availableAlgorithms;
}

/**
 * Обновить алгоритмы пользователя с сохранением существующих настроек
 * @param currentData - текущие алгоритмы пользователя
 * @param newData - новые доступные алгоритмы (только массив algorithms)
 * @returns обновленные алгоритмы пользователя
 */
export function updateUserAlgorithms(
  currentData: UserAlgorithms | null,
  newData: { algorithms: Algorithm[] },
): UserAlgorithms {
  try {
    const currentAlgorithms = currentData?.algorithms ?? [];
    const newAlgorithms = newData.algorithms ?? [];
    const currentGeneralSettings =
      currentData?.general_settings ?? ({} as GeneralSettings);

    // Создаем множества по name для быстрого поиска
    const currentNames = currentAlgorithms.map((a) => a.name);
    const newNames = newAlgorithms.map((a) => a.name);

    // Добавляем те алгоритмы, которых не было
    const toAdd = newAlgorithms.filter((a) => !currentNames.includes(a.name));

    // Оставляем те, что существуют в обоих (сохраняем настройки пользователя)
    const toKeep = currentAlgorithms.filter((a) => newNames.includes(a.name));

    // Формируем финальный список
    const finalAlgorithms = [...toKeep, ...toAdd];

    // Формируем финальный объект
    const finalData: UserAlgorithms = {
      general_settings: currentGeneralSettings,
      algorithms: finalAlgorithms,
    };

    return finalData;
  } catch (err) {
    console.error("updateUserAlgorithms failed:", err);
    throw err;
  }
}
