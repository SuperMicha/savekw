import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import SettingsLayout from "@/components/SettingsLayout";
import InfoPanel from "@/components/InfoPanel";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/utils/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import toast, { Toaster } from "react-hot-toast";
import { ALGORITHM_HELP } from "@/data/algorithm-help";

// Типи даних
interface GeneralSettings {
  sunny_hours_threshold?: number;
  day_tarif_start?: number;
  night_tarif_start?: number;
  active_solar_start?: number;
  active_solar_end?: number;
  cloud_density?: number;
  autodetect_active_solar_timeframe?: boolean;
}

interface AlgorithmsData {
  general_settings?: GeneralSettings;
  algorithms?: Array<{
    id: number;
    name: string;
    status: number;
    [key: string]: unknown;
  }>;
}

interface SunActivityData {
  data?: Array<{
    val: string;
    ts: string;
  }>;
  last_update?: string;
}

interface SunForecastData {
  sunActivity?: number[];
}

interface ApplianceItem {
  type: string;
  status: boolean;
}

interface Algorithm1Data {
  id: number;
  name: string;
  status: number;
  out_priority_nosun: number;
  out_priority_sun: number;
  charge_priority_nosun: number;
  charge_priority_sun: number;
  [key: string]: unknown;
}

interface Algorithm2Data {
  id: number;
  name: string;
  status: number;
  charge_time: string;
  discharge_time: string;
  out_priority_charge: number;
  out_priority_discharge: number;
  charge_priority_charge: number;
  charge_priority_discharge: number;
  [key: string]: unknown;
}

interface Algorithm3Data {
  id: number;
  name: string;
  status: number;
  night_start: number;
  night_end: number;
  [key: string]: unknown;
}

interface Algorithm4Data {
  id: number;
  name: string;
  status: number;
  night_start: number;
  [key: string]: unknown;
}

interface Algorithm5Data {
  id: number;
  name: string;
  status: number;
  night_start: number;
  [key: string]: unknown;
}

interface Algorithm6Data {
  id: number;
  name: string;
  status: number;
  day_start: number;
  day_end: number;
  night_start: number;
  night_end: number;
  [key: string]: unknown;
}

interface Algorithm7Data {
  id: number;
  name: string;
  status: number;
  day_start: number;
  night_start: number;
  [key: string]: unknown;
}

interface Algorithm8Data {
  id: number;
  name: string;
  status: number;
  day_start: number;
  night_start: number;
  [key: string]: unknown;
}

interface Algorithm9Data {
  id: number;
  name: string;
  status: number;
  device_id: string;
  description: string;
  night_start: number;
  night_end: number;
  appliances_required: string[];
  appliances_absent: string[];
  equipment: number[];
  [key: string]: unknown;
}

interface PriorityOption {
  key: string;
  val: string;
}

interface PriorityData {
  id: string;
  name: string;
  item: PriorityOption[];
}

export default function AlgorithmsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const utils = api.useUtils();

  // Стейти для Секції 1
  const [autoDetect, setAutoDetect] = useState(true);
  const [solarStart, setSolarStart] = useState(7);
  const [solarEnd, setSolarEnd] = useState(17);
  const [cloudDensity, setCloudDensity] = useState(0);
  const [isUpdatingPv, setIsUpdatingPv] = useState(false);
  const [showPvModal, setShowPvModal] = useState(false);
  const [isUpdatingWeather, setIsUpdatingWeather] = useState(false);

  // Стейти для Секції 2
  const [tariffRange, setTariffRange] = useState<[number, number]>([6, 23]);

  // Стейти для Секції 3
  const [alg1Status, setAlg1Status] = useState(1);
  const [sunnyHoursThreshold, setSunnyHoursThreshold] = useState(4);
  const [outPriorityNoSun, setOutPriorityNoSun] = useState(3);
  const [outPrioritySun, setOutPrioritySun] = useState(2);
  const [chargePriorityNoSun, setChargePriorityNoSun] = useState(2);
  const [chargePrioritySun, setChargePrioritySun] = useState(1);

  // Стейти для Секції 4
  const [alg2Status, setAlg2Status] = useState(1);
  const [chargeTime, setChargeTime] = useState("23");
  const [dischargeTime, setDischargeTime] = useState("07");
  const [outPriorityCharge, setOutPriorityCharge] = useState(2);
  const [outPriorityDischarge, setOutPriorityDischarge] = useState(2);
  const [chargePriorityCharge, setChargePriorityCharge] = useState(2);
  const [chargePriorityDischarge, setChargePriorityDischarge] = useState(2);

  // Стейти для Секції 5 (Algorithm 3 - Бойлер уночі)
  const [alg3Status, setAlg3Status] = useState(1);
  const [alg3NightRange, setAlg3NightRange] = useState<[number, number]>([
    3, 7,
  ]);

  // Стейти для Секції 6 (Algorithm 4 - Пральна машина уночі)
  const [alg4Status, setAlg4Status] = useState(1);
  const [alg4NightStart, setAlg4NightStart] = useState(0);

  // Стейти для Секції 7 (Algorithm 5 - Посудомийна машина уночі)
  const [alg5Status, setAlg5Status] = useState(1);
  const [alg5NightStart, setAlg5NightStart] = useState(2);

  // Стейти для Секції 8 (Algorithm 6 - Бойлер день+ніч)
  const [alg6Status, setAlg6Status] = useState(1);
  const [alg6DayRange, setAlg6DayRange] = useState<[number, number]>([12, 17]);
  const [alg6NightRange, setAlg6NightRange] = useState<[number, number]>([
    3, 7,
  ]);

  // Стейти для Секції 9 (Algorithm 7 - Пральна машина день+ніч)
  const [alg7Status, setAlg7Status] = useState(1);
  const [alg7DayStart, setAlg7DayStart] = useState(11);
  const [alg7NightStart, setAlg7NightStart] = useState(0);

  // Стейти для Секції 10 (Algorithm 8 - Посудомийна машина день+ніч)
  const [alg8Status, setAlg8Status] = useState(1);
  const [alg8DayStart, setAlg8DayStart] = useState(10);
  const [alg8NightStart, setAlg8NightStart] = useState(0);

  // Стейти для Секції 11 (Algorithm 9 - Зарядка електромобіля)
  const [alg9Status, setAlg9Status] = useState(1);
  const [alg9NightRange, setAlg9NightRange] = useState<[number, number]>([
    3, 7,
  ]);

  // Редирект якщо не залогінений
  useEffect(() => {
    if (!authLoading && !user) {
      void router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  // Завантаження даних
  const { data: algorithmsData, isLoading: isLoadingAlgorithms } =
    api.properties.get.useQuery(
      { property: "algorithms" },
      { refetchOnWindowFocus: false, enabled: !!user },
    );

  const { data: sunActivityData, isLoading: isLoadingSunActivity } =
    api.properties.get.useQuery(
      { property: "sun_activity" },
      { refetchOnWindowFocus: false, enabled: !!user },
    );

  const { data: sunForecastData, isLoading: isLoadingSunForecast } =
    api.properties.get.useQuery(
      { property: "sun_forecast" },
      { refetchOnWindowFocus: false, enabled: !!user },
    );

  const { data: appliancesData, isLoading: isLoadingAppliances } =
    api.properties.get.useQuery(
      { property: "user_appliances" },
      { refetchOnWindowFocus: false, enabled: !!user },
    );

  const { data: outputPriorityData, isLoading: isLoadingOutputPriority } =
    api.properties.get.useQuery(
      { property: "output_priority_options" },
      { refetchOnWindowFocus: false, enabled: !!user },
    );

  const { data: chargePriorityData, isLoading: isLoadingChargePriority } =
    api.properties.get.useQuery(
      { property: "charge_source_priority_options" },
      { refetchOnWindowFocus: false, enabled: !!user },
    );

  // Парсинг даних
  const algorithms: AlgorithmsData = useMemo(() => {
    if (!algorithmsData?.value) return {};
    try {
      return JSON.parse(algorithmsData.value) as AlgorithmsData;
    } catch {
      return {};
    }
  }, [algorithmsData]);

  const sunActivity: SunActivityData = useMemo(() => {
    if (!sunActivityData?.value) return {};
    try {
      return JSON.parse(sunActivityData.value) as SunActivityData;
    } catch {
      return {};
    }
  }, [sunActivityData]);

  const sunForecast: SunForecastData = useMemo(() => {
    if (!sunForecastData?.value) return {};
    try {
      const parsed: unknown = JSON.parse(sunForecastData.value);
      // Якщо це масив - беремо перший елемент (сьогоднішній прогноз)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0] as SunForecastData;
      }
      return parsed as SunForecastData;
    } catch {
      return {};
    }
  }, [sunForecastData]);

  const appliances: ApplianceItem[] = useMemo(() => {
    if (!appliancesData?.value) return [];
    try {
      return JSON.parse(appliancesData.value) as ApplianceItem[];
    } catch {
      return [];
    }
  }, [appliancesData]);

  const outputPriorityOptions: PriorityOption[] = useMemo(() => {
    if (!outputPriorityData?.value) return [];
    try {
      const parsed = JSON.parse(outputPriorityData.value) as PriorityData;
      return parsed.item ?? [];
    } catch {
      return [];
    }
  }, [outputPriorityData]);

  const chargePriorityOptions: PriorityOption[] = useMemo(() => {
    if (!chargePriorityData?.value) return [];
    try {
      const parsed = JSON.parse(chargePriorityData.value) as PriorityData;
      return parsed.item ?? [];
    } catch {
      return [];
    }
  }, [chargePriorityData]);

  // Ініціалізація значень з algorithms
  useEffect(() => {
    if (algorithms.general_settings) {
      const gs = algorithms.general_settings;
      setAutoDetect(gs.autodetect_active_solar_timeframe ?? true);
      setSolarStart(gs.active_solar_start ?? 7);
      setSolarEnd(gs.active_solar_end ?? 17);
      setCloudDensity(gs.cloud_density ?? 0);
      setTariffRange([gs.day_tarif_start ?? 6, gs.night_tarif_start ?? 23]);
      setSunnyHoursThreshold(gs.sunny_hours_threshold ?? 4);
    }

    // Ініціалізація Algorithm 1 (Секція 3)
    if (algorithms.algorithms) {
      const alg1 = algorithms.algorithms.find((a) => a.id === 1) as
        | Algorithm1Data
        | undefined;
      if (alg1) {
        setAlg1Status(alg1.status);
        setOutPriorityNoSun(alg1.out_priority_nosun);
        setOutPrioritySun(alg1.out_priority_sun);
        setChargePriorityNoSun(alg1.charge_priority_nosun);
        setChargePrioritySun(alg1.charge_priority_sun);
      }

      // Ініціалізація Algorithm 2 (Секція 4)
      const alg2 = algorithms.algorithms.find((a) => a.id === 2) as
        | Algorithm2Data
        | undefined;
      if (alg2) {
        setAlg2Status(alg2.status);
        setChargeTime(alg2.charge_time);
        setDischargeTime(alg2.discharge_time);
        setOutPriorityCharge(alg2.out_priority_charge);
        setOutPriorityDischarge(alg2.out_priority_discharge);
        setChargePriorityCharge(alg2.charge_priority_charge);
        setChargePriorityDischarge(alg2.charge_priority_discharge);
      }

      // Ініціалізація Algorithm 3 (Секція 5 - Бойлер уночі)
      const alg3 = algorithms.algorithms.find((a) => a.id === 3) as
        | Algorithm3Data
        | undefined;
      if (alg3) {
        setAlg3Status(alg3.status);
        setAlg3NightRange([alg3.night_start, alg3.night_end]);
      }

      // Ініціалізація Algorithm 4 (Секція 6 - Пральна машина уночі)
      const alg4 = algorithms.algorithms.find((a) => a.id === 4) as
        | Algorithm4Data
        | undefined;
      if (alg4) {
        setAlg4Status(alg4.status);
        setAlg4NightStart(alg4.night_start);
      }

      // Ініціалізація Algorithm 5 (Секція 7 - Посудомийна машина уночі)
      const alg5 = algorithms.algorithms.find((a) => a.id === 5) as
        | Algorithm5Data
        | undefined;
      if (alg5) {
        setAlg5Status(alg5.status);
        setAlg5NightStart(alg5.night_start);
      }

      // Ініціалізація Algorithm 6 (Секція 8 - Бойлер день+ніч)
      const alg6 = algorithms.algorithms.find((a) => a.id === 6) as
        | Algorithm6Data
        | undefined;
      if (alg6) {
        setAlg6Status(alg6.status);
        setAlg6DayRange([alg6.day_start, alg6.day_end]);
        setAlg6NightRange([alg6.night_start, alg6.night_end]);
      }

      // Ініціалізація Algorithm 7 (Секція 9 - Пральна машина день+ніч)
      const alg7 = algorithms.algorithms.find((a) => a.id === 7) as
        | Algorithm7Data
        | undefined;
      if (alg7) {
        setAlg7Status(alg7.status);
        setAlg7DayStart(alg7.day_start);
        setAlg7NightStart(alg7.night_start);
      }

      // Ініціалізація Algorithm 8 (Секція 10 - Посудомийна машина день+ніч)
      const alg8 = algorithms.algorithms.find((a) => a.id === 8) as
        | Algorithm8Data
        | undefined;
      if (alg8) {
        setAlg8Status(alg8.status);
        setAlg8DayStart(alg8.day_start);
        setAlg8NightStart(alg8.night_start);
      }

      // Ініціалізація Algorithm 9 (Секція 11 - Зарядка електромобіля)
      const alg9 = algorithms.algorithms.find((a) => a.id === 9) as
        | Algorithm9Data
        | undefined;
      if (alg9) {
        setAlg9Status(alg9.status);
        setAlg9NightRange([alg9.night_start, alg9.night_end]);
      }
    }
  }, [algorithms]);

  // Перевірка чи показувати Секцію 1
  const showSection1 = !!algorithms.general_settings;

  // Перевірка чи показувати Секцію 2
  const showSection2 = useMemo(() => {
    const energyMeter = appliances.find((a) => a.type === "energy_meeter");
    return energyMeter?.status === true;
  }, [appliances]);

  // Перевірка чи показувати Секцію 3 (Algorithm 1)
  const showSection3 = useMemo(() => {
    if (!algorithms.algorithms) return false;
    const alg1 = algorithms.algorithms.find((a) => a.id === 1);
    return !!alg1;
  }, [algorithms]);

  // Перевірка чи показувати Секцію 4 (Algorithm 2)
  const showSection4 = useMemo(() => {
    if (!algorithms.algorithms) return false;
    const alg2 = algorithms.algorithms.find((a) => a.id === 2);
    return !!alg2;
  }, [algorithms]);

  // Перевірка чи показувати Секцію 5 (Algorithm 3)
  const showSection5 = useMemo(() => {
    if (!algorithms.algorithms) return false;
    const alg3 = algorithms.algorithms.find((a) => a.id === 3);
    return !!alg3;
  }, [algorithms]);

  // Перевірка чи показувати Секцію 6 (Algorithm 4)
  const showSection6 = useMemo(() => {
    if (!algorithms.algorithms) return false;
    const alg4 = algorithms.algorithms.find((a) => a.id === 4);
    return !!alg4;
  }, [algorithms]);

  // Перевірка чи показувати Секцію 7 (Algorithm 5)
  const showSection7 = useMemo(() => {
    if (!algorithms.algorithms) return false;
    const alg5 = algorithms.algorithms.find((a) => a.id === 5);
    return !!alg5;
  }, [algorithms]);

  // Перевірка чи показувати Секцію 8 (Algorithm 6)
  const showSection8 = useMemo(() => {
    if (!algorithms.algorithms) return false;
    const alg6 = algorithms.algorithms.find((a) => a.id === 6);
    return !!alg6;
  }, [algorithms]);

  // Перевірка чи показувати Секцію 9 (Algorithm 7)
  const showSection9 = useMemo(() => {
    if (!algorithms.algorithms) return false;
    const alg7 = algorithms.algorithms.find((a) => a.id === 7);
    return !!alg7;
  }, [algorithms]);

  // Перевірка чи показувати Секцію 10 (Algorithm 8)
  const showSection10 = useMemo(() => {
    if (!algorithms.algorithms) return false;
    const alg8 = algorithms.algorithms.find((a) => a.id === 8);
    return !!alg8;
  }, [algorithms]);

  // Перевірка чи показувати Секцію 11 (Algorithm 9)
  const showSection11 = useMemo(() => {
    if (!algorithms.algorithms) return false;
    const alg9 = algorithms.algorithms.find((a) => a.id === 9);
    if (!alg9) return false;

    // Перевіряємо наявність CarCharger зі status: true в user_appliances
    const carCharger = appliances.find(
      (item) => item.type === "CarCharger" && item.status === true,
    );
    return !!carCharger;
  }, [algorithms, appliances]);

  // Підготовка даних для графіка
  const chartData = useMemo(() => {
    if (!sunActivity.data) return [];
    return sunActivity.data.map((item) => ({
      time: new Date(item.ts).toLocaleTimeString("uk-UA", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      value: parseFloat(item.val),
    }));
  }, [sunActivity]);

  // Mutations
  const saveGeneralSettings = api.properties.set.useMutation({
    onSuccess: () => {
      toast.success("Налаштування успішно збережені!");
      void utils.properties.get.invalidate();
    },
    onError: (error) => {
      toast.error(`Помилка: ${error.message}`);
    },
  });

  const getPvChart = api.smartess.getPvChart.useMutation({
    onSuccess: async (data) => {
      if (data.success) {
        toast.success(data.message);
        // Інвалідуємо кеш для sun_activity
        await utils.properties.get.invalidate({ property: "sun_activity" });
        // Також інвалідуємо algorithms щоб оновити слайдер (якщо autodetect увімкнено)
        await utils.properties.get.invalidate({ property: "algorithms" });
      } else {
        toast.error(data.message);
      }
      setIsUpdatingPv(false);
    },
    onError: (error) => {
      toast.error(`Помилка: ${error.message}`);
      setIsUpdatingPv(false);
    },
  });

  const updateWeatherForecast = api.weather.updateForecast.useMutation({
    onSuccess: async (data) => {
      if (data.success) {
        toast.success(data.message);
        // Інвалідуємо кеш для sun_forecast
        await utils.properties.get.invalidate({ property: "sun_forecast" });
      } else {
        toast.error("Не вдалося оновити прогноз погоди");
      }
      setIsUpdatingWeather(false);
    },
    onError: (error) => {
      toast.error(`Помилка: ${error.message}`);
      setIsUpdatingWeather(false);
    },
  });

  // Обробники подій
  const handleSaveSection1 = async () => {
    const updatedAlgorithms = {
      ...algorithms,
      general_settings: {
        ...algorithms.general_settings,
        active_solar_start: solarStart,
        active_solar_end: solarEnd,
        cloud_density: cloudDensity,
        autodetect_active_solar_timeframe: autoDetect,
      },
    };

    await saveGeneralSettings.mutateAsync({
      property: "algorithms",
      value: JSON.stringify(updatedAlgorithms),
    });
  };

  const handleSaveSection2 = async () => {
    const updatedAlgorithms = {
      ...algorithms,
      general_settings: {
        ...algorithms.general_settings,
        day_tarif_start: tariffRange[0],
        night_tarif_start: tariffRange[1],
      },
    };

    await saveGeneralSettings.mutateAsync({
      property: "algorithms",
      value: JSON.stringify(updatedAlgorithms),
    });
  };

  const handleSaveSection3 = async () => {
    const updatedAlgorithms = {
      ...algorithms,
      general_settings: {
        ...algorithms.general_settings,
        sunny_hours_threshold: sunnyHoursThreshold,
      },
      algorithms: algorithms.algorithms?.map((alg) => {
        if (alg.id === 1) {
          return {
            ...alg,
            status: alg1Status,
            out_priority_nosun: outPriorityNoSun,
            out_priority_sun: outPrioritySun,
            charge_priority_nosun: chargePriorityNoSun,
            charge_priority_sun: chargePrioritySun,
          };
        }
        return alg;
      }),
    };

    await saveGeneralSettings.mutateAsync({
      property: "algorithms",
      value: JSON.stringify(updatedAlgorithms),
    });
  };

  const handleSaveSection4 = async () => {
    const updatedAlgorithms = {
      ...algorithms,
      algorithms: algorithms.algorithms?.map((alg) => {
        if (alg.id === 2) {
          return {
            ...alg,
            status: alg2Status,
            charge_time: chargeTime,
            discharge_time: dischargeTime,
            out_priority_charge: outPriorityCharge,
            out_priority_discharge: outPriorityDischarge,
            charge_priority_charge: chargePriorityCharge,
            charge_priority_discharge: chargePriorityDischarge,
          };
        }
        return alg;
      }),
    };

    await saveGeneralSettings.mutateAsync({
      property: "algorithms",
      value: JSON.stringify(updatedAlgorithms),
    });
  };

  const handleSaveSection5 = async () => {
    const updatedAlgorithms = {
      ...algorithms,
      algorithms: algorithms.algorithms?.map((alg) => {
        if (alg.id === 3) {
          return {
            ...alg,
            status: alg3Status,
            night_start: alg3NightRange[0],
            night_end: alg3NightRange[1],
          };
        }
        return alg;
      }),
    };

    await saveGeneralSettings.mutateAsync({
      property: "algorithms",
      value: JSON.stringify(updatedAlgorithms),
    });
  };

  const handleSaveSection6 = async () => {
    const updatedAlgorithms = {
      ...algorithms,
      algorithms: algorithms.algorithms?.map((alg) => {
        if (alg.id === 4) {
          return {
            ...alg,
            status: alg4Status,
            night_start: alg4NightStart,
          };
        }
        return alg;
      }),
    };

    await saveGeneralSettings.mutateAsync({
      property: "algorithms",
      value: JSON.stringify(updatedAlgorithms),
    });
  };

  const handleSaveSection7 = async () => {
    const updatedAlgorithms = {
      ...algorithms,
      algorithms: algorithms.algorithms?.map((alg) => {
        if (alg.id === 5) {
          return {
            ...alg,
            status: alg5Status,
            night_start: alg5NightStart,
          };
        }
        return alg;
      }),
    };

    await saveGeneralSettings.mutateAsync({
      property: "algorithms",
      value: JSON.stringify(updatedAlgorithms),
    });
  };

  const handleSaveSection8 = async () => {
    const updatedAlgorithms = {
      ...algorithms,
      algorithms: algorithms.algorithms?.map((alg) => {
        if (alg.id === 6) {
          return {
            ...alg,
            status: alg6Status,
            day_start: alg6DayRange[0],
            day_end: alg6DayRange[1],
            night_start: alg6NightRange[0],
            night_end: alg6NightRange[1],
          };
        }
        return alg;
      }),
    };

    await saveGeneralSettings.mutateAsync({
      property: "algorithms",
      value: JSON.stringify(updatedAlgorithms),
    });
  };

  const handleSaveSection9 = async () => {
    const updatedAlgorithms = {
      ...algorithms,
      algorithms: algorithms.algorithms?.map((alg) => {
        if (alg.id === 7) {
          return {
            ...alg,
            status: alg7Status,
            day_start: alg7DayStart,
            night_start: alg7NightStart,
          };
        }
        return alg;
      }),
    };

    await saveGeneralSettings.mutateAsync({
      property: "algorithms",
      value: JSON.stringify(updatedAlgorithms),
    });
  };

  const handleSaveSection10 = async () => {
    const updatedAlgorithms = {
      ...algorithms,
      algorithms: algorithms.algorithms?.map((alg) => {
        if (alg.id === 8) {
          return {
            ...alg,
            status: alg8Status,
            day_start: alg8DayStart,
            night_start: alg8NightStart,
          };
        }
        return alg;
      }),
    };

    await saveGeneralSettings.mutateAsync({
      property: "algorithms",
      value: JSON.stringify(updatedAlgorithms),
    });
  };

  const handleSaveSection11 = async () => {
    const updatedAlgorithms = {
      ...algorithms,
      algorithms: algorithms.algorithms?.map((alg) => {
        if (alg.id === 9) {
          return {
            ...alg,
            status: alg9Status,
            night_start: alg9NightRange[0],
            night_end: alg9NightRange[1],
          };
        }
        return alg;
      }),
    };

    await saveGeneralSettings.mutateAsync({
      property: "algorithms",
      value: JSON.stringify(updatedAlgorithms),
    });
  };

  const handleUpdatePvChart = () => {
    setShowPvModal(true);
  };

  const confirmUpdatePvChart = async () => {
    setShowPvModal(false);
    setIsUpdatingPv(true);

    // Вчорашня дата
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0] ?? "";

    await getPvChart.mutateAsync({ date: dateStr });
  };

  const handleUpdateWeather = async () => {
    setIsUpdatingWeather(true);
    await updateWeatherForecast.mutateAsync();
  };

  if (authLoading || !user) {
    return null;
  }

  const isLoading =
    isLoadingAlgorithms ||
    isLoadingSunActivity ||
    isLoadingSunForecast ||
    isLoadingAppliances ||
    isLoadingOutputPriority ||
    isLoadingChargePriority;

  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-lg text-gray-600">Завантаження...</div>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Налаштування Алгоритмів - SaveKW</title>
      </Head>
      <SettingsLayout>
        <Toaster position="top-right" />

        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Налаштування Алгоритмів
          </h2>

          {!showSection1 && !showSection2 && (
            <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-yellow-800">
                Спочатку налаштуйте побутові прилади та інвертор в розділі{" "}
                <Link
                  href="/settings/appliances"
                  className="font-medium underline"
                >
                  Побутові Прилади
                </Link>
              </p>
            </div>
          )}

          {/* СЕКЦІЯ 1: Налаштування сонячної генерації */}
          {showSection1 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">
                {ALGORITHM_HELP.sun_forecast?.title ??
                  "Налаштування очікуваних годин сонячної генерації"}
              </h3>

              {ALGORITHM_HELP.sun_forecast && (
                <div className="mt-4">
                  <InfoPanel
                    shortInfo={ALGORITHM_HELP.sun_forecast.shortInfo}
                    fullInfo={ALGORITHM_HELP.sun_forecast.fullInfo}
                  />
                </div>
              )}

              {/* Графік */}
              <div className="mt-6">
                <h4 className="mb-3 text-base font-medium text-gray-700">
                  Генерація за попередню добу
                </h4>
                <div className="h-64 w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="time"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          label={{
                            value: "кВт",
                            angle: -90,
                            position: "insideLeft",
                          }}
                        />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                      <p className="text-gray-500">Немає даних про генерацію</p>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-start justify-end text-sm text-gray-600">
                  <div className="flex flex-col items-end">
                    <button
                      onClick={handleUpdatePvChart}
                      disabled={isUpdatingPv}
                      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdatingPv ? "Оновлення..." : "Оновити зараз"}
                    </button>
                    <div className="mt-2 flex flex-col items-end">
                      <span className="font-medium">Останнє оновлення:</span>
                      <span className="text-xs">
                        {sunActivity.last_update
                          ? new Date(sunActivity.last_update).toLocaleString(
                              "uk-UA",
                            )
                          : "Немає даних"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Прогноз погоди */}
              <div className="mt-6">
                <h4 className="mb-3 text-base font-medium text-gray-700">
                  Прогноз погоди на сьогодні
                </h4>
                {sunForecast.sunActivity ? (
                  <div className="flex flex-wrap gap-2">
                    {sunForecast.sunActivity.map((value, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <span className="text-2xl">
                          {value === 1 ? "☀️" : "☁️"}
                        </span>
                        <span className="mt-1 text-xs text-gray-600">
                          {index}:00
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Прогноз погоди не доступний</p>
                )}

                {/* Кнопка оновлення погоди та час останнього оновлення */}
                <div className="mt-4 flex items-start justify-end text-sm text-gray-600">
                  <div className="flex flex-col items-end">
                    <button
                      onClick={handleUpdateWeather}
                      disabled={isUpdatingWeather}
                      className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdatingWeather ? "Оновлення..." : "Оновити зараз"}
                    </button>
                    <div className="mt-2 flex flex-col items-end">
                      <span className="font-medium">Останнє оновлення:</span>
                      <span className="text-xs">
                        {sunForecastData?.updatedAt
                          ? new Date(sunForecastData.updatedAt).toLocaleString(
                              "uk-UA",
                            )
                          : "Немає даних"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Автоматичне налаштування */}
              <div className="mt-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoDetect}
                    onChange={(e) => setAutoDetect(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Налаштувати автоматично, виходячи з інформації про генерацію
                    за попередні дні
                  </span>
                </label>
              </div>

              {/* Щільність хмар */}
              <div className="mt-6">
                <h4 className="mb-3 text-base font-medium text-gray-700">
                  Щільність хмар
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={cloudDensity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setCloudDensity(Math.min(100, Math.max(0, val)));
                      }
                    }}
                    className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Значення від 0 до 100. Впливає на розрахунок очікуваної сонячної генерації.
                </p>
              </div>

              {/* Період активної генерації */}
              <div className="mt-6">
                <h4 className="mb-3 text-base font-medium text-gray-700">
                  Період активної сонячної генерації
                </h4>
                <div className="rounded-lg bg-gray-50 p-4">
                  <Slider
                    range
                    min={0}
                    max={24}
                    value={[solarStart, solarEnd]}
                    onChange={(value) => {
                      if (Array.isArray(value)) {
                        setSolarStart(value[0] ?? 7);
                        setSolarEnd(value[1] ?? 17);
                      }
                    }}
                    disabled={autoDetect}
                    marks={{
                      0: "0",
                      1: "1",
                      2: "2",
                      3: "3",
                      4: "4",
                      5: "5",
                      6: "6",
                      7: "7",
                      8: "8",
                      9: "9",
                      10: "10",
                      11: "11",
                      12: "12",
                      13: "13",
                      14: "14",
                      15: "15",
                      16: "16",
                      17: "17",
                      18: "18",
                      19: "19",
                      20: "20",
                      21: "21",
                      22: "22",
                      23: "23",
                      24: "24",
                    }}
                    trackStyle={[{ backgroundColor: "#f59e0b", height: 8 }]}
                    handleStyle={[
                      {
                        borderColor: "#f59e0b",
                        height: 20,
                        width: 20,
                        marginTop: -6,
                      },
                      {
                        borderColor: "#f59e0b",
                        height: 20,
                        width: 20,
                        marginTop: -6,
                      },
                    ]}
                    railStyle={{ backgroundColor: "#e5e7eb", height: 8 }}
                  />
                  <div className="mt-6 flex justify-between text-sm text-gray-600">
                    <span>Початок: {solarStart}:00</span>
                    <span>Кінець: {solarEnd}:00</span>
                  </div>
                  <div className="mt-3 text-center text-sm font-medium text-gray-700">
                    Тривалість активної сонячної генерації:{" "}
                    {solarEnd - solarStart}{" "}
                    {solarEnd - solarStart === 1
                      ? "година"
                      : solarEnd - solarStart < 5
                        ? "години"
                        : "годин"}
                  </div>
                </div>
              </div>

              {/* Кнопка збереження */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveSection1}
                  disabled={saveGeneralSettings.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveGeneralSettings.isPending ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </div>
          )}

          {/* СЕКЦІЯ 2: Налаштування тарифів */}
          {showSection2 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">
                {ALGORITHM_HELP.tariff_settings?.title ??
                  "Налаштування періоду коли діють знижки на електроенергію"}
              </h3>

              {ALGORITHM_HELP.tariff_settings && (
                <div className="mt-4">
                  <InfoPanel
                    shortInfo={ALGORITHM_HELP.tariff_settings.shortInfo}
                    fullInfo={ALGORITHM_HELP.tariff_settings.fullInfo}
                  />
                </div>
              )}

              <div className="mt-6">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Початок денного тарифу
                      </label>
                      <select
                        value={tariffRange[0].toString().padStart(2, "0")}
                        onChange={(e) =>
                          setTariffRange([
                            Number(e.target.value),
                            tariffRange[1],
                          ])
                        }
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                      >
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                          <option
                            key={hour}
                            value={hour.toString().padStart(2, "0")}
                          >
                            {hour.toString().padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Початок нічного тарифу
                      </label>
                      <select
                        value={tariffRange[1].toString().padStart(2, "0")}
                        onChange={(e) =>
                          setTariffRange([
                            tariffRange[0],
                            Number(e.target.value),
                          ])
                        }
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                      >
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                          <option
                            key={hour}
                            value={hour.toString().padStart(2, "0")}
                          >
                            {hour.toString().padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-between text-sm">
                    <div className="rounded bg-blue-100 px-3 py-2">
                      <span className="font-medium text-blue-900">
                        Денний тариф:{" "}
                        {tariffRange[0].toString().padStart(2, "0")}:00 -{" "}
                        {tariffRange[1].toString().padStart(2, "0")}:00
                      </span>
                    </div>
                    <div className="rounded bg-gray-700 px-3 py-2">
                      <span className="font-medium text-white">
                        Нічний тариф:{" "}
                        {tariffRange[1].toString().padStart(2, "0")}:00 -{" "}
                        {tariffRange[0].toString().padStart(2, "0")}:00
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Кнопка збереження */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveSection2}
                  disabled={saveGeneralSettings.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveGeneralSettings.isPending ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </div>
          )}

          {/* СЕКЦІЯ 3: Налаштування пріоритетів за прогнозом */}
          {showSection3 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">
                {ALGORITHM_HELP.algorithm1?.title ??
                  "Налаштування пріорітетів розподілення енергії інвертора (Алгоритм 1)"}
              </h3>

              {ALGORITHM_HELP.algorithm1 && (
                <div className="mt-4">
                  <InfoPanel
                    shortInfo={ALGORITHM_HELP.algorithm1.shortInfo}
                    fullInfo={ALGORITHM_HELP.algorithm1.fullInfo}
                  />
                </div>
              )}

              {/* Чекбокс включення */}
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alg1Status === 1}
                    onChange={(e) => setAlg1Status(e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Включити алгоритм роботи інвертора за прогнозом
                  </span>
                </label>
              </div>

              {/* Пікер порогової кількості годин */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700">
                  Порогова кількість сонячних годин
                </label>
                <select
                  value={sunnyHoursThreshold}
                  onChange={(e) =>
                    setSunnyHoursThreshold(Number(e.target.value))
                  }
                  disabled={alg1Status === 0}
                  className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((hours) => (
                    <option key={hours} value={hours}>
                      {hours}{" "}
                      {hours === 1 ? "година" : hours < 5 ? "години" : "годин"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Дві колонки */}
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Ліва колонка - Хмарна погода */}
                <div
                  className={`rounded-lg border p-4 ${alg1Status === 0 ? "border-gray-300 bg-gray-100" : "border-gray-300 bg-gray-50"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">☁️</span>
                    <div className="text-sm text-gray-700">
                      <div className="font-medium">Хмарна погода</div>
                      <div>
                        Якщо сонячних годин менше ніж {sunnyHoursThreshold}
                      </div>
                    </div>
                  </div>

                  {/* Пріоритет навантаження */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      Пріоритет навантаження
                    </h4>
                    <div className="mt-2 space-y-2">
                      {outputPriorityOptions.map((option) => (
                        <label
                          key={option.key}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="radio"
                            name="output-priority-nosun"
                            value={option.key}
                            checked={outPriorityNoSun === Number(option.key)}
                            onChange={(e) =>
                              setOutPriorityNoSun(Number(e.target.value))
                            }
                            disabled={alg1Status === 0}
                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                          />
                          <span
                            className={`text-sm ${alg1Status === 0 ? "text-gray-400" : "text-gray-700"}`}
                          >
                            {option.val}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Пріоритет зарядки */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      Пріоритет зарядки батарей
                    </h4>
                    <div className="mt-2 space-y-2">
                      {chargePriorityOptions.map((option) => (
                        <label
                          key={option.key}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="radio"
                            name="charge-priority-nosun"
                            value={option.key}
                            checked={chargePriorityNoSun === Number(option.key)}
                            onChange={(e) =>
                              setChargePriorityNoSun(Number(e.target.value))
                            }
                            disabled={alg1Status === 0}
                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                          />
                          <span
                            className={`text-sm ${alg1Status === 0 ? "text-gray-400" : "text-gray-700"}`}
                          >
                            {option.val}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Права колонка - Сонячна погода */}
                <div
                  className={`rounded-lg border p-4 ${alg1Status === 0 ? "border-gray-300 bg-gray-100" : "border-yellow-300 bg-yellow-50"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">☀️</span>
                    <div className="text-sm text-gray-700">
                      <div className="font-medium">Сонячна погода</div>
                      <div>
                        Якщо сонячних годин більше ніж {sunnyHoursThreshold}
                      </div>
                    </div>
                  </div>

                  {/* Пріоритет навантаження */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      Пріоритет навантаження
                    </h4>
                    <div className="mt-2 space-y-2">
                      {outputPriorityOptions.map((option) => (
                        <label
                          key={option.key}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="radio"
                            name="output-priority-sun"
                            value={option.key}
                            checked={outPrioritySun === Number(option.key)}
                            onChange={(e) =>
                              setOutPrioritySun(Number(e.target.value))
                            }
                            disabled={alg1Status === 0}
                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                          />
                          <span
                            className={`text-sm ${alg1Status === 0 ? "text-gray-400" : "text-gray-700"}`}
                          >
                            {option.val}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Пріоритет зарядки */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      Пріоритет зарядки батарей
                    </h4>
                    <div className="mt-2 space-y-2">
                      {chargePriorityOptions.map((option) => (
                        <label
                          key={option.key}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="radio"
                            name="charge-priority-sun"
                            value={option.key}
                            checked={chargePrioritySun === Number(option.key)}
                            onChange={(e) =>
                              setChargePrioritySun(Number(e.target.value))
                            }
                            disabled={alg1Status === 0}
                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                          />
                          <span
                            className={`text-sm ${alg1Status === 0 ? "text-gray-400" : "text-gray-700"}`}
                          >
                            {option.val}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Кнопка збереження */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveSection3}
                  disabled={saveGeneralSettings.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveGeneralSettings.isPending ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </div>
          )}

          {/* СЕКЦІЯ 4: Робота інвертора за розкладом */}
          {showSection4 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">
                {ALGORITHM_HELP.algorithm2?.title ??
                  "Робота інвертора за розкладом (Алгоритм 2)"}
              </h3>

              {ALGORITHM_HELP.algorithm2 && (
                <div className="mt-4">
                  <InfoPanel
                    shortInfo={ALGORITHM_HELP.algorithm2.shortInfo}
                    fullInfo={ALGORITHM_HELP.algorithm2.fullInfo}
                  />
                </div>
              )}

              {/* Чекбокс включення */}
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alg2Status === 1}
                    onChange={(e) => setAlg2Status(e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Включити алгоритм роботи інвертора за розкладом
                  </span>
                </label>
              </div>

              {/* Дві колонки */}
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Ліва колонка - Режим заряду */}
                <div
                  className={`rounded-lg border p-4 ${alg2Status === 0 ? "border-gray-300 bg-gray-100" : "border-blue-300 bg-blue-50"}`}
                >
                  <div className="text-sm text-gray-700">
                    <div className="text-lg font-medium">Режим заряду 🔋</div>
                  </div>

                  {/* Час переходу в режим заряду */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-900">
                      Час переходу в режим заряду
                    </label>
                    <select
                      value={chargeTime}
                      onChange={(e) => setChargeTime(e.target.value)}
                      disabled={alg2Status === 0}
                      className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                    >
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                        <option
                          key={hour}
                          value={hour.toString().padStart(2, "0")}
                        >
                          {hour.toString().padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Пріоритет навантаження */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      Пріоритет навантаження
                    </h4>
                    <div className="mt-2 space-y-2">
                      {outputPriorityOptions.map((option) => (
                        <label
                          key={option.key}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="radio"
                            name="output-priority-charge"
                            value={option.key}
                            checked={outPriorityCharge === Number(option.key)}
                            onChange={(e) =>
                              setOutPriorityCharge(Number(e.target.value))
                            }
                            disabled={alg2Status === 0}
                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                          />
                          <span
                            className={`text-sm ${alg2Status === 0 ? "text-gray-400" : "text-gray-700"}`}
                          >
                            {option.val}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Пріоритет зарядки */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      Пріоритет зарядки батарей
                    </h4>
                    <div className="mt-2 space-y-2">
                      {chargePriorityOptions.map((option) => (
                        <label
                          key={option.key}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="radio"
                            name="charge-priority-charge"
                            value={option.key}
                            checked={
                              chargePriorityCharge === Number(option.key)
                            }
                            onChange={(e) =>
                              setChargePriorityCharge(Number(e.target.value))
                            }
                            disabled={alg2Status === 0}
                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                          />
                          <span
                            className={`text-sm ${alg2Status === 0 ? "text-gray-400" : "text-gray-700"}`}
                          >
                            {option.val}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Права колонка - Режим розряду */}
                <div
                  className={`rounded-lg border p-4 ${alg2Status === 0 ? "border-gray-300 bg-gray-100" : "border-green-300 bg-green-50"}`}
                >
                  <div className="text-sm text-gray-700">
                    <div className="text-lg font-medium">Режим розряду ⚡</div>
                  </div>

                  {/* Час переходу в режим розряду */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-900">
                      Час переходу в режим розряду
                    </label>
                    <select
                      value={dischargeTime}
                      onChange={(e) => setDischargeTime(e.target.value)}
                      disabled={alg2Status === 0}
                      className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                    >
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                        <option
                          key={hour}
                          value={hour.toString().padStart(2, "0")}
                        >
                          {hour.toString().padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Пріоритет навантаження */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      Пріоритет навантаження
                    </h4>
                    <div className="mt-2 space-y-2">
                      {outputPriorityOptions.map((option) => (
                        <label
                          key={option.key}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="radio"
                            name="output-priority-discharge"
                            value={option.key}
                            checked={
                              outPriorityDischarge === Number(option.key)
                            }
                            onChange={(e) =>
                              setOutPriorityDischarge(Number(e.target.value))
                            }
                            disabled={alg2Status === 0}
                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                          />
                          <span
                            className={`text-sm ${alg2Status === 0 ? "text-gray-400" : "text-gray-700"}`}
                          >
                            {option.val}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Пріоритет зарядки */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      Пріоритет зарядки батарей
                    </h4>
                    <div className="mt-2 space-y-2">
                      {chargePriorityOptions.map((option) => (
                        <label
                          key={option.key}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="radio"
                            name="charge-priority-discharge"
                            value={option.key}
                            checked={
                              chargePriorityDischarge === Number(option.key)
                            }
                            onChange={(e) =>
                              setChargePriorityDischarge(Number(e.target.value))
                            }
                            disabled={alg2Status === 0}
                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                          />
                          <span
                            className={`text-sm ${alg2Status === 0 ? "text-gray-400" : "text-gray-700"}`}
                          >
                            {option.val}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Кнопка збереження */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveSection4}
                  disabled={saveGeneralSettings.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveGeneralSettings.isPending ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </div>
          )}

          {/* СЕКЦІЯ 5: Налаштування бойлера уночі (Algorithm 3) */}
          {showSection5 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">
                {ALGORITHM_HELP.algorithm3?.title ??
                  "Налаштування припустимого діапазону годин роботи бойлера (Алгоритм 3)"}
              </h3>

              {ALGORITHM_HELP.algorithm3 && (
                <div className="mt-4">
                  <InfoPanel
                    shortInfo={ALGORITHM_HELP.algorithm3.shortInfo}
                    fullInfo={ALGORITHM_HELP.algorithm3.fullInfo}
                  />
                </div>
              )}

              {/* Чекбокс включення */}
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alg3Status === 1}
                    onChange={(e) => setAlg3Status(e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Включити алгоритм керування бойлером
                  </span>
                </label>
              </div>

              {/* Time pickers для діапазону */}
              <div className="mt-6">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Початок роботи
                      </label>
                      <select
                        value={alg3NightRange[0].toString().padStart(2, "0")}
                        onChange={(e) =>
                          setAlg3NightRange([
                            Number(e.target.value),
                            alg3NightRange[1],
                          ])
                        }
                        disabled={alg3Status === 0}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                      >
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                          <option
                            key={hour}
                            value={hour.toString().padStart(2, "0")}
                          >
                            {hour.toString().padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Кінець роботи
                      </label>
                      <select
                        value={alg3NightRange[1].toString().padStart(2, "0")}
                        onChange={(e) =>
                          setAlg3NightRange([
                            alg3NightRange[0],
                            Number(e.target.value),
                          ])
                        }
                        disabled={alg3Status === 0}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                      >
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                          <option
                            key={hour}
                            value={hour.toString().padStart(2, "0")}
                          >
                            {hour.toString().padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-sm text-gray-700">
                    {(() => {
                      const start = alg3NightRange[0];
                      const end = alg3NightRange[1];
                      const duration =
                        end >= start ? end - start : 24 - start + end;
                      return `Тривалість: ${duration} ${duration === 1 ? "година" : duration < 5 ? "години" : "годин"}, з ${start.toString().padStart(2, "0")}:00 до ${end.toString().padStart(2, "0")}:00`;
                    })()}
                  </div>
                </div>
              </div>

              {/* Кнопка збереження */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveSection5}
                  disabled={saveGeneralSettings.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveGeneralSettings.isPending ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </div>
          )}

          {/* СЕКЦІЯ 6: Налаштування пральної машини уночі (Algorithm 4) */}
          {showSection6 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">
                {ALGORITHM_HELP.algorithm4?.title ??
                  "Налаштування припустимого діапазону годин роботи пральної машини (Алгоритм 4)"}
              </h3>

              {ALGORITHM_HELP.algorithm4 && (
                <div className="mt-4">
                  <InfoPanel
                    shortInfo={ALGORITHM_HELP.algorithm4.shortInfo}
                    fullInfo={ALGORITHM_HELP.algorithm4.fullInfo}
                  />
                </div>
              )}

              {/* Чекбокс включення */}
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alg4Status === 1}
                    onChange={(e) => setAlg4Status(e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Включити алгоритм керування пральною машиною
                  </span>
                </label>
              </div>

              {/* Time picker для часу старту */}
              <div className="mt-6">
                <div className="rounded-lg bg-gray-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Час старту пральної машини уночі
                  </label>
                  <select
                    value={alg4NightStart.toString().padStart(2, "0")}
                    onChange={(e) => setAlg4NightStart(Number(e.target.value))}
                    disabled={alg4Status === 0}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                      <option
                        key={hour}
                        value={hour.toString().padStart(2, "0")}
                      >
                        {hour.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                  <div className="mt-4 text-center text-sm text-gray-700">
                    Запуск о {alg4NightStart.toString().padStart(2, "0")}:00
                  </div>
                </div>
              </div>

              {/* Кнопка збереження */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveSection6}
                  disabled={saveGeneralSettings.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveGeneralSettings.isPending ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </div>
          )}

          {/* СЕКЦІЯ 7: Налаштування посудомийної машини уночі (Algorithm 5) */}
          {showSection7 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">
                {ALGORITHM_HELP.algorithm5?.title ??
                  "Налаштування припустимого діапазону годин роботи посудомийної машини (Алгоритм 5)"}
              </h3>

              {ALGORITHM_HELP.algorithm5 && (
                <div className="mt-4">
                  <InfoPanel
                    shortInfo={ALGORITHM_HELP.algorithm5.shortInfo}
                    fullInfo={ALGORITHM_HELP.algorithm5.fullInfo}
                  />
                </div>
              )}

              {/* Чекбокс включення */}
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alg5Status === 1}
                    onChange={(e) => setAlg5Status(e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Включити алгоритм керування посудомийною машиною
                  </span>
                </label>
              </div>

              {/* Time picker для часу старту */}
              <div className="mt-6">
                <div className="rounded-lg bg-gray-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Час старту посудомийної машини уночі
                  </label>
                  <select
                    value={alg5NightStart.toString().padStart(2, "0")}
                    onChange={(e) => setAlg5NightStart(Number(e.target.value))}
                    disabled={alg5Status === 0}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                      <option
                        key={hour}
                        value={hour.toString().padStart(2, "0")}
                      >
                        {hour.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                  <div className="mt-4 text-center text-sm text-gray-700">
                    Запуск о {alg5NightStart.toString().padStart(2, "0")}:00
                  </div>
                </div>
              </div>

              {/* Кнопка збереження */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveSection7}
                  disabled={saveGeneralSettings.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveGeneralSettings.isPending ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </div>
          )}

          {/* СЕКЦІЯ 8: Налаштування бойлера день+ніч (Algorithm 6) */}
          {showSection8 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">
                {ALGORITHM_HELP.algorithm6?.title ??
                  "Налаштування припустимого діапазону годин роботи бойлера (Алгоритм 6)"}
              </h3>

              {ALGORITHM_HELP.algorithm6 && (
                <div className="mt-4">
                  <InfoPanel
                    shortInfo={ALGORITHM_HELP.algorithm6.shortInfo}
                    fullInfo={ALGORITHM_HELP.algorithm6.fullInfo}
                  />
                </div>
              )}

              {/* Чекбокс включення */}
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alg6Status === 1}
                    onChange={(e) => setAlg6Status(e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Включити алгоритм керування бойлером
                  </span>
                </label>
              </div>

              {/* Time pickers для денного діапазону */}
              <div className="mt-6">
                <h4 className="mb-3 text-base font-medium text-gray-700">
                  Обери діапазон часу роботи бойлера вдень
                </h4>
                <div className="rounded-lg bg-yellow-50 p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Початок роботи вдень
                      </label>
                      <select
                        value={alg6DayRange[0].toString().padStart(2, "0")}
                        onChange={(e) =>
                          setAlg6DayRange([
                            Number(e.target.value),
                            alg6DayRange[1],
                          ])
                        }
                        disabled={alg6Status === 0}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                      >
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                          <option
                            key={hour}
                            value={hour.toString().padStart(2, "0")}
                          >
                            {hour.toString().padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Кінець роботи вдень
                      </label>
                      <select
                        value={alg6DayRange[1].toString().padStart(2, "0")}
                        onChange={(e) =>
                          setAlg6DayRange([
                            alg6DayRange[0],
                            Number(e.target.value),
                          ])
                        }
                        disabled={alg6Status === 0}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                      >
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                          <option
                            key={hour}
                            value={hour.toString().padStart(2, "0")}
                          >
                            {hour.toString().padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-sm text-gray-700">
                    {(() => {
                      const start = alg6DayRange[0];
                      const end = alg6DayRange[1];
                      const duration =
                        end >= start ? end - start : 24 - start + end;
                      return `Тривалість: ${duration} ${duration === 1 ? "година" : duration < 5 ? "години" : "годин"}, з ${start.toString().padStart(2, "0")}:00 до ${end.toString().padStart(2, "0")}:00`;
                    })()}
                  </div>
                </div>
              </div>

              {/* Time pickers для нічного діапазону */}
              <div className="mt-6">
                <h4 className="mb-3 text-base font-medium text-gray-700">
                  Обери діапазон часу роботи бойлера уночі
                </h4>
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Початок роботи уночі
                      </label>
                      <select
                        value={alg6NightRange[0].toString().padStart(2, "0")}
                        onChange={(e) =>
                          setAlg6NightRange([
                            Number(e.target.value),
                            alg6NightRange[1],
                          ])
                        }
                        disabled={alg6Status === 0}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                      >
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                          <option
                            key={hour}
                            value={hour.toString().padStart(2, "0")}
                          >
                            {hour.toString().padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Кінець роботи уночі
                      </label>
                      <select
                        value={alg6NightRange[1].toString().padStart(2, "0")}
                        onChange={(e) =>
                          setAlg6NightRange([
                            alg6NightRange[0],
                            Number(e.target.value),
                          ])
                        }
                        disabled={alg6Status === 0}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                      >
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                          <option
                            key={hour}
                            value={hour.toString().padStart(2, "0")}
                          >
                            {hour.toString().padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-sm text-gray-700">
                    {(() => {
                      const start = alg6NightRange[0];
                      const end = alg6NightRange[1];
                      const duration =
                        end >= start ? end - start : 24 - start + end;
                      return `Тривалість: ${duration} ${duration === 1 ? "година" : duration < 5 ? "години" : "годин"}, з ${start.toString().padStart(2, "0")}:00 до ${end.toString().padStart(2, "0")}:00`;
                    })()}
                  </div>
                </div>
              </div>

              {/* Кнопка збереження */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveSection8}
                  disabled={saveGeneralSettings.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveGeneralSettings.isPending ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </div>
          )}

          {/* СЕКЦІЯ 9: Налаштування пральної машини день+ніч (Algorithm 7) */}
          {showSection9 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">
                {ALGORITHM_HELP.algorithm7?.title ??
                  "Налаштування припустимого часу початку роботи пральної машини (Алгоритм 7)"}
              </h3>

              {ALGORITHM_HELP.algorithm7 && (
                <div className="mt-4">
                  <InfoPanel
                    shortInfo={ALGORITHM_HELP.algorithm7.shortInfo}
                    fullInfo={ALGORITHM_HELP.algorithm7.fullInfo}
                  />
                </div>
              )}

              {/* Чекбокс включення */}
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alg7Status === 1}
                    onChange={(e) => setAlg7Status(e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Включити алгоритм керування пральною машиною
                  </span>
                </label>
              </div>

              {/* Time picker для денного старту */}
              <div className="mt-6">
                <h4 className="mb-3 text-base font-medium text-gray-700">
                  Час старту пральної машини вдень
                </h4>
                <div className="rounded-lg bg-yellow-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Денний час запуску
                  </label>
                  <select
                    value={alg7DayStart.toString().padStart(2, "0")}
                    onChange={(e) => setAlg7DayStart(Number(e.target.value))}
                    disabled={alg7Status === 0}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                      <option
                        key={hour}
                        value={hour.toString().padStart(2, "0")}
                      >
                        {hour.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                  <div className="mt-4 text-center text-sm text-gray-700">
                    Запуск о {alg7DayStart.toString().padStart(2, "0")}:00
                  </div>
                </div>
              </div>

              {/* Time picker для нічного старту */}
              <div className="mt-6">
                <h4 className="mb-3 text-base font-medium text-gray-700">
                  Час старту пральної машини уночі
                </h4>
                <div className="rounded-lg bg-gray-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Нічний час запуску
                  </label>
                  <select
                    value={alg7NightStart.toString().padStart(2, "0")}
                    onChange={(e) => setAlg7NightStart(Number(e.target.value))}
                    disabled={alg7Status === 0}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                      <option
                        key={hour}
                        value={hour.toString().padStart(2, "0")}
                      >
                        {hour.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                  <div className="mt-4 text-center text-sm text-gray-700">
                    Запуск о {alg7NightStart.toString().padStart(2, "0")}:00
                  </div>
                </div>
              </div>

              {/* Кнопка збереження */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveSection9}
                  disabled={saveGeneralSettings.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveGeneralSettings.isPending ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </div>
          )}

          {/* СЕКЦІЯ 10: Налаштування посудомийної машини день+ніч (Algorithm 8) */}
          {showSection10 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">
                {ALGORITHM_HELP.algorithm8?.title ??
                  "Налаштування припустимого часу початку роботи посудомийної машини (Алгоритм 8)"}
              </h3>

              {ALGORITHM_HELP.algorithm8 && (
                <div className="mt-4">
                  <InfoPanel
                    shortInfo={ALGORITHM_HELP.algorithm8.shortInfo}
                    fullInfo={ALGORITHM_HELP.algorithm8.fullInfo}
                  />
                </div>
              )}

              {/* Чекбокс включення */}
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alg8Status === 1}
                    onChange={(e) => setAlg8Status(e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Включити алгоритм керування посудомийною машиною
                  </span>
                </label>
              </div>

              {/* Time picker для денного старту */}
              <div className="mt-6">
                <h4 className="mb-3 text-base font-medium text-gray-700">
                  Час старту посудомийної машини вдень
                </h4>
                <div className="rounded-lg bg-yellow-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Денний час запуску
                  </label>
                  <select
                    value={alg8DayStart.toString().padStart(2, "0")}
                    onChange={(e) => setAlg8DayStart(Number(e.target.value))}
                    disabled={alg8Status === 0}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                      <option
                        key={hour}
                        value={hour.toString().padStart(2, "0")}
                      >
                        {hour.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                  <div className="mt-4 text-center text-sm text-gray-700">
                    Запуск о {alg8DayStart.toString().padStart(2, "0")}:00
                  </div>
                </div>
              </div>

              {/* Time picker для нічного старту */}
              <div className="mt-6">
                <h4 className="mb-3 text-base font-medium text-gray-700">
                  Час старту посудомийної машини уночі
                </h4>
                <div className="rounded-lg bg-gray-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Нічний час запуску
                  </label>
                  <select
                    value={alg8NightStart.toString().padStart(2, "0")}
                    onChange={(e) => setAlg8NightStart(Number(e.target.value))}
                    disabled={alg8Status === 0}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                      <option
                        key={hour}
                        value={hour.toString().padStart(2, "0")}
                      >
                        {hour.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                  <div className="mt-4 text-center text-sm text-gray-700">
                    Запуск о {alg8NightStart.toString().padStart(2, "0")}:00
                  </div>
                </div>
              </div>

              {/* Кнопка збереження */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveSection10}
                  disabled={saveGeneralSettings.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveGeneralSettings.isPending ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </div>
          )}

          {/* СЕКЦІЯ 11: Зарядка електромобіля (Algorithm 9) */}
          {showSection11 && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">
                {ALGORITHM_HELP.algorithm9?.title ??
                  "Налаштування зарядки електромобіля (Алгоритм 9)"}
              </h3>

              {ALGORITHM_HELP.algorithm9 && (
                <div className="mt-4">
                  <InfoPanel
                    shortInfo={ALGORITHM_HELP.algorithm9.shortInfo}
                    fullInfo={ALGORITHM_HELP.algorithm9.fullInfo}
                  />
                </div>
              )}

              {/* Чекбокс включення */}
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={alg9Status === 1}
                    onChange={(e) => setAlg9Status(e.target.checked ? 1 : 0)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Включити алгоритм зарядки електромобіля
                  </span>
                </label>
              </div>

              {/* Time pickers для діапазону нічної зарядки */}
              <div className="mt-6">
                <h4 className="mb-3 text-base font-medium text-gray-700">
                  Діапазон нічної зарядки електромобіля
                </h4>
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Початок зарядки
                      </label>
                      <select
                        value={alg9NightRange[0].toString().padStart(2, "0")}
                        onChange={(e) =>
                          setAlg9NightRange([
                            Number(e.target.value),
                            alg9NightRange[1],
                          ])
                        }
                        disabled={alg9Status === 0}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                      >
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                          <option
                            key={hour}
                            value={hour.toString().padStart(2, "0")}
                          >
                            {hour.toString().padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Кінець зарядки
                      </label>
                      <select
                        value={alg9NightRange[1].toString().padStart(2, "0")}
                        onChange={(e) =>
                          setAlg9NightRange([
                            alg9NightRange[0],
                            Number(e.target.value),
                          ])
                        }
                        disabled={alg9Status === 0}
                        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                      >
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                          <option
                            key={hour}
                            value={hour.toString().padStart(2, "0")}
                          >
                            {hour.toString().padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-sm text-gray-700">
                    {(() => {
                      const start = alg9NightRange[0];
                      const end = alg9NightRange[1];
                      const duration =
                        end >= start ? end - start : 24 - start + end;
                      return `Тривалість: ${duration} ${duration === 1 ? "година" : duration < 5 ? "години" : "годин"}, з ${start.toString().padStart(2, "0")}:00 до ${end.toString().padStart(2, "0")}:00`;
                    })()}
                  </div>
                </div>
              </div>

              {/* Кнопка збереження */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveSection11}
                  disabled={saveGeneralSettings.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveGeneralSettings.isPending ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Модалка підтвердження оновлення */}
        {showPvModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900">
                Оновлення даних про генерацію
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Оновлення може зайняти до 30 секунд. Продовжити?
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowPvModal(false)}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Скасувати
                </button>
                <button
                  onClick={confirmUpdatePvChart}
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Продовжити
                </button>
              </div>
            </div>
          </div>
        )}
      </SettingsLayout>
    </>
  );
}
