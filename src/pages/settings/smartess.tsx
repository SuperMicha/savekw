import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import dynamic from "next/dynamic";
import SettingsLayout from "@/components/SettingsLayout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/utils/api";

// Динамічний імпорт карти (тільки на клієнті, бо Leaflet потребує window)
const LocationMap = dynamic(() => import("@/components/LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 animate-pulse rounded-md bg-gray-100"></div>
  ),
});

interface SmartESSCreds {
  smart_ess_user: string;
  smart_ess_pswd: string;
  smart_ess_token: string;
  smart_ess_secret: string;
}

interface ApplianceItem {
  type: string;
  status: boolean;
  control_device_id?: string;
  control_api?: string;
  [key: string]: unknown;
}

export default function SmartESSPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const utils = api.useUtils();

  // Стани для Smart ESS
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [availableDevices, setAvailableDevices] = useState<
    Array<{ sn: string; devalias: string }>
  >([]);

  // Стани для геолокації
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [address, setAddress] = useState("");
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Загальні стани
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // Редирект на логин если не залогинен
  useEffect(() => {
    if (!authLoading && !user) {
      void router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  // Загрузка существующих данных
  const { data: credsData } = api.properties.get.useQuery(
    { property: "smart_ess_creds" },
    { refetchOnWindowFocus: false },
  );

  const { data: appliancesData } = api.properties.get.useQuery(
    { property: "user_appliances" },
    { refetchOnWindowFocus: false },
  );

  const { data: locationData } = api.properties.get.useQuery(
    { property: "location" },
    { refetchOnWindowFocus: false },
  );

  const { data: devicesData } = api.properties.get.useQuery(
    { property: "smart_ess_devices" },
    { refetchOnWindowFocus: false },
  );

  // Инициализация полей существующими данными
  useEffect(() => {
    if (credsData?.value) {
      try {
        const creds = JSON.parse(credsData.value) as SmartESSCreds;
        setUsername(creds.smart_ess_user || "");
        setPassword(creds.smart_ess_pswd || "");
      } catch (e) {
        console.error("Failed to parse smart_ess_creds:", e);
      }
    }
  }, [credsData]);

  useEffect(() => {
    if (appliancesData?.value) {
      try {
        const appliances = JSON.parse(appliancesData.value) as ApplianceItem[];
        // Попробуем найти device_id в invertor с control_api: smart_ess
        const invertor = appliances.find(
          (item) =>
            item.type === "invertor" && item.control_api === "smart_ess",
        );
        if (invertor?.control_device_id) {
          setDeviceId(invertor.control_device_id);
        }
      } catch (e) {
        console.error("Failed to parse user_appliances:", e);
      }
    }
  }, [appliancesData]);

  // Парсинг списку доступних пристроїв
  useEffect(() => {
    if (devicesData?.value) {
      try {
        const devices = JSON.parse(devicesData.value) as Array<{
          sn: string;
          devalias: string;
        }>;
        if (Array.isArray(devices) && devices.length > 0) {
          setAvailableDevices(devices);
          // Якщо deviceId не встановлено, встановлюємо перший з списку
          if (!deviceId && devices[0]) {
            setDeviceId(devices[0].sn);
          }
        }
      } catch (e) {
        console.error("Failed to parse smart_ess_devices:", e);
      }
    }
  }, [devicesData]);

  // Завантаження збереженої локації
  useEffect(() => {
    if (locationData?.value) {
      try {
        // Формат: "50.4715159,30.7506052"
        const [lat, lng] = locationData.value.split(",");
        if (lat && lng) {
          setLatitude(lat.trim());
          setLongitude(lng.trim());
          // Отримуємо адресу за координатами
          void reverseGeocode(parseFloat(lat), parseFloat(lng));
        }
      } catch (e) {
        console.error("Failed to parse location:", e);
      }
    } else {
      // Якщо локації немає - автоматично визначаємо
      void autoDetectLocation();
    }
  }, [locationData]);

  // Функція для отримання адреси за координатами (Nominatim Reverse Geocoding)
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uk`,
      );
      const data: {
        address?: {
          country?: string;
          city?: string;
          town?: string;
          village?: string;
          latitude?: number;
          longitude?: number;
          country_name?: string;
        };
      } = await response.json();

      if (data.address) {
        const country = data.address.country ?? "";
        const city =
          data.address.city ?? data.address.town ?? data.address.village ?? "";
        setAddress(`${country}${city ? ", " + city : ""}`);
      }
    } catch (e) {
      console.error("Reverse geocoding failed:", e);
    }
  };

  // Функція для отримання координат за адресою (Nominatim Forward Geocoding)
  const forwardGeocode = async (searchAddress: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&accept-language=uk&limit=1`,
      );
      const data: Array<{
        lat: string;
        lon: string;
        country_name?: string;
        city?: string;
      }> = await response.json();

      if (data && data.length > 0) {
        const location = data[0];
        if (location) {
          setLatitude(String(location.lat));
          setLongitude(String(location.lon));
          void reverseGeocode(
            parseFloat(String(location.lat)),
            parseFloat(String(location.lon)),
          );

          const country = location.country_name ?? "";
          const city = location.city ?? "";
          setAddress(`${country}${city ? ", " + city : ""}`);
        }
      }
    } catch (e) {
      console.error("Forward geocoding failed:", e);
    }
  };

  // Автоматичне визначення локації через Geo-IP
  const autoDetectLocation = async () => {
    setIsDetectingLocation(true);
    setLocationError(null);

    try {
      const response = await fetch("https://ipapi.co/json/");
      const data = await response.json();

      if (data.latitude && data.longitude) {
        setLatitude(data.latitude.toString());
        setLongitude(data.longitude.toString());

        const country = data.country_name || "";
        const city = data.city || "";
        setAddress(`${country}${city ? ", " + city : ""}`);
        setLocationError(null);
      } else {
        setLocationError("Не вдалося визначити локацію автоматично");
      }
    } catch (e) {
      console.error("Geo-IP detection failed:", e);
      setLocationError("Помилка визначення локації");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Обробка зміни адреси користувачем
  const handleAddressSearch = () => {
    if (address.trim()) {
      void forwardGeocode(address.trim());
    }
  };

  // Обробка зміни позиції на карті
  const handleMapMove = (lat: number, lng: number) => {
    setLatitude(lat.toFixed(7));
    setLongitude(lng.toFixed(7));
    void reverseGeocode(lat, lng);
  };

  // Mutation для сохранения
  const saveMutation = api.properties.set.useMutation();
  const discoveryMutation = api.smartess.discovery.useMutation();
  const getDevicesMutation = api.smartess.getDevices.useMutation();

  // Функція для збереження тільки координат
  const handleSaveLocation = async () => {
    setError(null);

    // Валидація координат
    if (!latitude.trim() || !longitude.trim()) {
      setError("Будь ласка, вкажіть геолокацію");
      return;
    }

    setIsSaving(true);

    try {
      // Зберегти тільки локацію
      await saveMutation.mutateAsync({
        property: "location",
        value: `${latitude.trim()},${longitude.trim()}`,
      });

      setShowSuccess(true);
      setError(null);

      // Оновити дані
      await utils.properties.get.invalidate();

      // Сховати повідомлення через 3 секунди
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Save location error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Помилка при збереженні координат. Спробуйте ще раз.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Функція для тестування підключення
  const handleTestConnection = async () => {
    setTestError(null);

    // Валидація
    if (!username.trim()) {
      setTestError("Будь ласка, введіть ім'я користувача Smart ESS");
      return;
    }
    if (!password.trim()) {
      setTestError("Будь ласка, введіть пароль Smart ESS");
      return;
    }

    setIsTestingConnection(true);

    try {
      // Спочатку зберігаємо credentials
      const creds: SmartESSCreds = {
        smart_ess_user: username.trim(),
        smart_ess_pswd: password.trim(),
        smart_ess_token: "",
        smart_ess_secret: "",
      };

      await saveMutation.mutateAsync({
        property: "smart_ess_creds",
        value: JSON.stringify(creds),
      });

      // Викликаємо GetESSdevices для отримання списку пристроїв
      const result = await getDevicesMutation.mutateAsync();

      if (result.success && result.devices && result.devices.length > 0) {
        setTestError(null);
        // Оновлюємо дані
        await utils.properties.get.invalidate();

        // Якщо є пристрої, встановлюємо перший як default
        if (result.devices[0]?.sn) {
          setDeviceId(result.devices[0].sn);
        }
      } else {
        setTestError(
          result.message ||
            "Не вдалося отримати список пристроїв. Перевірте введені дані.",
        );
      }
    } catch (err) {
      console.error("Test connection error:", err);
      setTestError(
        err instanceof Error
          ? err.message
          : "Помилка при перевірці підключення. Спробуйте ще раз.",
      );
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидація тільки Smart ESS параметрів
    if (!username.trim()) {
      setError("Будь ласка, введіть ім'я користувача Smart ESS");
      return;
    }
    if (!password.trim()) {
      setError("Будь ласка, введіть пароль Smart ESS");
      return;
    }
    if (!deviceId.trim()) {
      setError("Будь ласка, введіть Інвертор ID");
      return;
    }

    setIsSaving(true);

    try {
      // 1. Сохранить smart_ess_creds
      const creds: SmartESSCreds = {
        smart_ess_user: username.trim(),
        smart_ess_pswd: password.trim(),
        smart_ess_token: "",
        smart_ess_secret: "",
      };

      await saveMutation.mutateAsync({
        property: "smart_ess_creds",
        value: JSON.stringify(creds),
      });

      // 2. Обновить control_device_id в user_appliances для invertor с control_api: smart_ess
      if (!appliancesData?.value) {
        setError(
          "Схоже інвертор відсутній у переліку вашого обладнання. Перевірте спочатку налаштування в розділі Обладнання.",
        );
        setIsSaving(false);
        return;
      }

      try {
        const appliances = JSON.parse(appliancesData.value) as ApplianceItem[];
        let invertorFound = false;

        // Ищем invertor с control_api: smart_ess
        const updatedAppliances = appliances.map((item) => {
          if (item.type === "invertor" && item.control_api === "smart_ess") {
            invertorFound = true;
            return {
              ...item,
              control_device_id: deviceId.trim(),
            };
          }
          return item;
        });

        // Если не найден - создаем новый
        if (!invertorFound) {
          updatedAppliances.push({
            type: "invertor",
            status: false,
            control_device_id: deviceId.trim(),
            control_api: "smart_ess",
          });
        }

        await saveMutation.mutateAsync({
          property: "user_appliances",
          value: JSON.stringify(updatedAppliances),
        });
      } catch (e) {
        console.error("Failed to update user_appliances:", e);
        setError("Помилка при оновленні налаштувань інвертора");
        setIsSaving(false);
        return;
      }

      // 3. Вызвать Discovery
      const discoveryResult = await discoveryMutation.mutateAsync();

      if (discoveryResult.success) {
        setShowSuccess(true);
        setError(null);

        // Обновить данные одразу для оновлення індикаторів меню
        await utils.properties.get.invalidate();

        // Скрыть уведомление через 3 секунд
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else {
        setError(
          discoveryResult.message ||
            "Не вдалося налаштувати інвертор. Перевірте введені дані.",
        );
      }
    } catch (err) {
      console.error("Save error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Помилка при збереженні параметрів підключення. Спробуйте ще раз.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Підключеня інвертора - SaveKW</title>
      </Head>
      <SettingsLayout>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Підключеня інвертора
          </h2>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-stretch">
            {/* Левая колонка - форма */}
            <div className="space-y-6 lg:flex-1">
              {/* Секція геолокації */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  Геолокація
                </h3>
                <p className="mb-4 text-sm text-gray-600">
                  Ваша геолокація потрібна для отримання даних про погоду та
                  оптимізації роботи алгоритмів енергозбереження. Ми
                  використовуємо координати лише для визначення погодних умов у
                  вашому регіоні.
                </p>

                <div className="space-y-4">
                  {/* Кнопка автовизначення */}
                  <div>
                    <button
                      type="button"
                      onClick={() => void autoDetectLocation()}
                      disabled={isDetectingLocation}
                      className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isDetectingLocation
                        ? "Визначення..."
                        : "Визначити автоматично"}
                    </button>
                  </div>

                  {/* Широта */}
                  <div>
                    <label
                      htmlFor="latitude"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Широта
                    </label>
                    <input
                      type="text"
                      id="latitude"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="50.4501"
                      disabled={isSaving}
                    />
                  </div>

                  {/* Довгота */}
                  <div>
                    <label
                      htmlFor="longitude"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Довгота
                    </label>
                    <input
                      type="text"
                      id="longitude"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="30.5234"
                      disabled={isSaving}
                    />
                  </div>

                  {/* Адреса */}
                  <div>
                    <label
                      htmlFor="address"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Адреса
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddressSearch();
                          }
                        }}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="Україна, Київ"
                        disabled={isSaving}
                      />
                      <button
                        type="button"
                        onClick={handleAddressSearch}
                        className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500"
                        disabled={isSaving}
                      >
                        Пошук
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Введіть країну та місто для пошуку координат
                    </p>
                  </div>

                  {/* Карта */}
                  {latitude && longitude && (
                    <div className="mt-4">
                      <LocationMap
                        latitude={parseFloat(latitude)}
                        longitude={parseFloat(longitude)}
                        onLocationChange={handleMapMove}
                      />
                    </div>
                  )}

                  {/* Помилка локації */}
                  {locationError && (
                    <div className="rounded-md bg-yellow-50 p-3">
                      <p className="text-sm text-yellow-800">{locationError}</p>
                    </div>
                  )}

                  {/* Кнопка збереження координат */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveLocation()}
                      disabled={
                        isSaving || !latitude.trim() || !longitude.trim()
                      }
                      className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? "Збереження..." : "Зберегти координати"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Секція Smart ESS */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  Параметри підключення
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Credentials Accordion */}
                  <details
                    className="rounded-lg border border-gray-200 bg-gray-50/50"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-4 py-3 font-semibold text-gray-700 hover:bg-gray-100/50">
                      <span>Ввести логін і пароль для підключення</span>
                      <svg
                        className="h-5 w-5 transition-transform duration-200 [[details[open]>summary]_&]:rotate-180"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </summary>

                    <div className="space-y-4 px-4 pb-4 pt-2">
                      {/* Username */}
                      <div>
                        <label
                          htmlFor="username"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Smart ESS User Name
                        </label>
                        <input
                          type="text"
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          placeholder="Введіть ім'я користувача"
                          disabled={isSaving}
                        />
                      </div>

                      {/* Password */}
                      <div>
                        <label
                          htmlFor="password"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Smart ESS Password
                        </label>
                        <div className="relative mt-1">
                          <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            placeholder="Введіть пароль"
                            disabled={isSaving}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="h-5 w-5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                                />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="h-5 w-5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* Test Connection Button */}
                  <div>
                    <button
                      type="button"
                      onClick={() => void handleTestConnection()}
                      disabled={
                        isTestingConnection ||
                        !username.trim() ||
                        !password.trim()
                      }
                      className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isTestingConnection
                        ? "Перевірка..."
                        : "Перевірити підключення"}
                    </button>
                    {testError && (
                      <div className="mt-2 rounded-md bg-red-50 p-3">
                        <p className="text-sm text-red-800">{testError}</p>
                      </div>
                    )}
                  </div>

                  {/* Device ID */}
                  <div>
                    <label
                      htmlFor="deviceId"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Серійний номер інвертора (SN)
                    </label>
                    {availableDevices.length > 0 ? (
                      <select
                        id="deviceId"
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        disabled={isSaving}
                      >
                        {availableDevices.map((device) => (
                          <option key={device.sn} value={device.sn}>
                            {device.sn} ({device.devalias})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        id="deviceId"
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="Введіть серійний номер інвертора"
                        disabled={isSaving}
                      />
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {availableDevices.length > 0
                        ? "Оберіть інвертор зі списку"
                        : "Натисніть 'Перевірити підключення' для отримання списку пристроїв"}
                    </p>
                  </div>

                  {/* Success Message */}
                  {showSuccess && (
                    <div className="rounded-md bg-green-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-green-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-green-800">
                            Налаштування успішно збережені!
                          </p>
                          <p className="mt-1 text-xs text-green-700">
                            Інвертор налаштовано та готовий до роботи.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-red-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-red-800">
                            {error}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving
                        ? "Збереження..."
                        : "Зберегти параметри підключення"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Правая колонка - инструкция */}
            <div className="lg:flex-1">
              <div className="h-full rounded-lg border border-gray-200 bg-white shadow-sm">
                <iframe
                  src="/docs/smartess-setup"
                  className="h-full w-full rounded-lg"
                  style={{ minHeight: "calc(100vh - 200px)" }}
                  title="Інструкція з налаштування Smart ESS"
                />
              </div>
            </div>
          </div>
        </div>
      </SettingsLayout>
    </>
  );
}
