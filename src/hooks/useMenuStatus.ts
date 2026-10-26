import { useMemo } from "react";
import { api } from "@/utils/api";
import { USER_APPLIANCES_KEY } from "@/lib/appliances";

interface ApplianceItem {
  type: string;
  status: boolean;
  control_device_id: string;
  control_api: string;
}

export interface MenuStatusInfo {
  equipment: {
    status: "success" | "error";
    tooltip?: string;
    disabled: boolean;
  };
  invertor: {
    status: "success" | "error";
    tooltip?: string;
    disabled: boolean;
  };
  smartlife: {
    status: "success" | "error";
    tooltip?: string;
    disabled: boolean;
  };
}

export function useMenuStatus(): MenuStatusInfo {
  // Завантажуємо всі необхідні дані
  const { data: appliancesData } = api.properties.get.useQuery(
    { property: USER_APPLIANCES_KEY },
    {
      refetchOnWindowFocus: false,
      staleTime: 0, // Завжди вважати дані застарілими для миттєвого оновлення
    },
  );

  const { data: smartEssCredsData } = api.properties.get.useQuery(
    { property: "smart_ess_creds" },
    {
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
  );

  const { data: smartLifeCredsData } = api.properties.get.useQuery(
    { property: "smart_life_creds" },
    {
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
  );

  const { data: locationData } = api.properties.get.useQuery(
    { property: "location" },
    {
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
  );

  const menuStatus = useMemo<MenuStatusInfo>(() => {
    let appliances: ApplianceItem[] = [];

    // Парсимо дані обладнання
    try {
      if (appliancesData?.value) {
        appliances = JSON.parse(appliancesData.value) as ApplianceItem[];
      }
    } catch (e) {
      console.warn("Failed to parse appliances data", e);
    }

    // Перевіряємо чи є хоч щось обрано в обладнанні
    const hasAnySelectedAppliance = appliances.some(
      (item) => item.status === true,
    );

    // Перевіряємо наявність сонячних панелей
    const hasSolarPanels = appliances.some(
      (item) => item.type === "solar_panel" && item.status === true,
    );

    // Перевіряємо наявність інвертора
    const hasInvertor = appliances.some(
      (item) => item.type === "invertor" && item.status === true,
    );

    // Перевіряємо наявність Smart Life обладнання
    const hasSmartLifeAppliances = appliances.some(
      (item) => item.control_api === "smart_life" && item.status === true,
    );

    // Перевіряємо креденшали
    const hasSmartEssCreds =
      smartEssCredsData?.value &&
      smartEssCredsData.value.trim() !== "" &&
      smartEssCredsData.value !== "null";

    const hasSmartLifeCreds =
      smartLifeCredsData?.value &&
      smartLifeCredsData.value.trim() !== "" &&
      smartLifeCredsData.value !== "null";

    // Перевіряємо локацію
    const hasLocation =
      locationData?.value &&
      locationData.value.trim() !== "" &&
      locationData.value !== "null";

    return {
      // Статус для "Обладнання"
      equipment: {
        status: hasAnySelectedAppliance ? "success" : "error",
        disabled: false,
      },

      // Статус для "Підключення інвертора"
      invertor: {
        status: (() => {
          // Якщо немає інвертора в обладнанні - відключено
          if (!hasInvertor) return "success"; // disabled буде true

          // Якщо немає креденшіалів - червоний оклик
          if (!hasSmartEssCreds) return "error";

          // Якщо є сонячні панелі, але немає локації - червоний оклик
          if (hasSolarPanels && !hasLocation) return "error";

          // Все ОК - зелена галочка
          return "success";
        })(),
        tooltip: !hasInvertor
          ? "Спочатку оберіть інвертор в розділі Обладнання"
          : undefined,
        disabled: !hasInvertor,
      },

      // Статус для "Параметри Smart Life"
      smartlife: {
        status: (() => {
          // Якщо немає Smart Life обладнання - відключено
          if (!hasSmartLifeAppliances) return "success"; // disabled буде true

          // Якщо немає креденшіалів - червоний оклик
          if (!hasSmartLifeCreds) return "error";

          // Все ОК - зелена галочка
          return "success";
        })(),
        tooltip: !hasSmartLifeAppliances
          ? "Спочатку оберіть Smart Life обладнання в розділі Обладнання (пральна/посудомийна машина, бойлер і т.і.)"
          : undefined,
        disabled: !hasSmartLifeAppliances,
      },
    };
  }, [
    appliancesData?.value,
    smartEssCredsData?.value,
    smartLifeCredsData?.value,
    locationData?.value,
  ]);

  return menuStatus;
}
