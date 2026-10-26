/**
 * Вспомогательные функции для определения необходимого оборудования
 * на основе выбранных приборов пользователя
 */

// ID оборудования в базе данных
export const EQUIPMENT_IDS = {
  WIFI_MODULE_PRO_05: "cmgtt2evf0008irwsmfsjfcn3", // WiFi module Pro 05
  SMART_WIFI_SOCKET: "cmgtt2gxh0009irws2vyflbcd", // Розумна Wi-Fi розетка Tuya
  BUTTON_PUSHER: "cmgtt2h3m000airwsohdq8008", // Натискач кнопок
  BLUETOOTH_GATEWAY: "cmgtt2h8v000birwsq86nt2rz", // Bluetooth Smart Gateway
} as const;

export interface RequiredEquipment {
  id: string;
  count: number; // Количество единиц оборудования
  reason: string; // Причина (для какого прибора)
}

/**
 * Определяет какое оборудование необходимо на основе выбранных приборов
 * @param selectedAppliances - массив ID выбранных приборов
 * @returns массив необходимого оборудования с количеством
 */
export function getRequiredEquipment(
  selectedAppliances: string[],
): RequiredEquipment[] {
  const required = new Map<string, RequiredEquipment>();

  // Вспомогательная функция для добавления оборудования
  const addEquipment = (id: string, reason: string) => {
    const existing = required.get(id);
    if (existing) {
      existing.count += 1;
      existing.reason += `, ${reason}`;
    } else {
      required.set(id, { id, count: 1, reason });
    }
  };

  // Проходим по каждому выбранному прибору
  selectedAppliances.forEach((applianceId) => {
    switch (applianceId) {
      case "energy_meeter":
        // Двотарифний лічильник – доп.оборудование не требуется
        break;

      case "solar_panel":
        // Сонячні панелі – доп.оборудование не требуется
        break;

      case "invertor":
        // Інвертор з АКБ – потрібно WiFi module Pro 05
        addEquipment(
          EQUIPMENT_IDS.WIFI_MODULE_PRO_05,
          "Для підключення інвертора",
        );
        break;

      case "dishwasher":
        // Посудомийка - Натискач кнопок
        addEquipment(
          EQUIPMENT_IDS.BUTTON_PUSHER,
          "Для управління посудомийкою",
        );
        break;

      case "washer":
        // Пральна Машина - Натискач кнопок
        addEquipment(
          EQUIPMENT_IDS.BUTTON_PUSHER,
          "Для управління пральною машиною",
        );
        break;

      case "boiler":
        // Бойлер - Розумна Wi-Fi розетка
        addEquipment(
          EQUIPMENT_IDS.SMART_WIFI_SOCKET,
          "Для управління бойлером",
        );
        break;

      case "CarCharger":
        // Розетка для зарядки електромобіля - Розумна Wi-Fi розетка
        addEquipment(
          EQUIPMENT_IDS.SMART_WIFI_SOCKET,
          "Для зарядки електромобіля",
        );
        break;
    }
  });

  // Якщо вибрано хоча б один з dishwasher або washer – потрібен Bluetooth Gateway (тільки один)
  if (
    selectedAppliances.includes("dishwasher") ||
    selectedAppliances.includes("washer")
  ) {
    // Для gateway всегда count = 1
    if (!required.has(EQUIPMENT_IDS.BLUETOOTH_GATEWAY)) {
      required.set(EQUIPMENT_IDS.BLUETOOTH_GATEWAY, {
        id: EQUIPMENT_IDS.BLUETOOTH_GATEWAY,
        count: 1,
        reason: "Для підключення натискача кнопок до інтернету",
      });
    }
  }

  return Array.from(required.values());
}

/**
 * Извлекает уникальные ID оборудования из списка необходимого оборудования
 */
export function getUniqueEquipmentIds(
  requiredEquipment: RequiredEquipment[],
): string[] {
  return requiredEquipment.map((eq) => eq.id);
}
