import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import SettingsLayout from "@/components/SettingsLayout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/utils/api";
import {
  SMARTLIFE_DEVICE_DESCRIPTIONS,
  APPLIANCE_LABELS,
} from "@/lib/appliances";

interface SmartLifeCreds {
  smart_life_user: string;
  smart_life_pswd: string;
  smart_life_token: string;
}

interface ApplianceItem {
  type: string;
  status: boolean;
  control_device_id?: string;
  control_api?: string;
  [key: string]: unknown;
}

const RATE_LIMIT_KEY = "smartlife_last_auth";
const RATE_LIMIT_SECONDS = 180;

export default function SmartLifePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const utils = api.useUtils();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [devices, setDevices] = useState<ApplianceItem[]>([]);
  const [allAppliances, setAllAppliances] = useState<ApplianceItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  
  // Стан для модалки результату SwitchControl
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [switchModalContent, setSwitchModalContent] = useState<string>("");
  const [switchingDeviceId, setSwitchingDeviceId] = useState<string | null>(null);

  // Редирект на логин если не залогинен
  useEffect(() => {
    if (!authLoading && !user) {
      void router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  // Проверка rate limit при загрузке + защита от browser throttling
  useEffect(() => {
    const checkRateLimit = () => {
      const lastAuth = localStorage.getItem(RATE_LIMIT_KEY);
      if (lastAuth) {
        const lastAuthTime = parseInt(lastAuth, 10);
        if (isNaN(lastAuthTime)) {
          // Некорректное значение - очищаем
          localStorage.removeItem(RATE_LIMIT_KEY);
          setRemainingSeconds(0);
          return;
        }
        const elapsed = Math.floor((Date.now() - lastAuthTime) / 1000);
        const remaining = RATE_LIMIT_SECONDS - elapsed;
        if (remaining > 0) {
          setRemainingSeconds(remaining);
        } else {
          // Таймер истек - явно устанавливаем 0
          setRemainingSeconds(0);
        }
      } else {
        // Нет записи в localStorage - таймер не активен
        setRemainingSeconds(0);
      }
    };

    // Начальная проверка
    checkRateLimit();

    // Интервал для обновления таймера
    const interval = setInterval(checkRateLimit, 1000);

    // Обработка возврата на вкладку (Page Visibility API)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Вкладка стала активной - немедленно обновляем таймер
        checkRateLimit();
      }
    };

    // Обработка фокуса окна
    const handleFocus = () => {
      checkRateLimit();
    };

    // Подписываемся на события
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    // Cleanup
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Загрузка существующих данных
  const { data: credsData } = api.properties.get.useQuery(
    { property: "smart_life_creds" },
    { refetchOnWindowFocus: false },
  );

  const { data: appliancesData } = api.properties.get.useQuery(
    { property: "user_appliances" },
    { refetchOnWindowFocus: false },
  );

  // Инициализация полей существующими данными
  useEffect(() => {
    if (credsData?.value) {
      try {
        const creds = JSON.parse(credsData.value) as SmartLifeCreds;
        setUsername(creds.smart_life_user || "");
        setPassword(creds.smart_life_pswd || "");
      } catch (e) {
        console.error("Failed to parse smart_life_creds:", e);
      }
    }
  }, [credsData]);

  useEffect(() => {
    if (appliancesData?.value) {
      try {
        const appliances = JSON.parse(appliancesData.value) as ApplianceItem[];
        // Сохраняем полный список для проверки статусов
        setAllAppliances(appliances);
        // Фильтруем только устройства с control_api: smart_life
        const smartlifeDevices = appliances.filter(
          (item) => item.control_api === "smart_life",
        );
        setDevices(smartlifeDevices);
      } catch (e) {
        console.error("Failed to parse user_appliances:", e);
      }
    }
  }, [appliancesData]);

  // Mutation для сохранения
  const saveMutation = api.properties.set.useMutation();
  const authMutation = api.smartlife.auth.useMutation();
  const switchControlMutation = api.smartlife.switchControl.useMutation();

  const handleDeviceIdChange = (index: number, value: string) => {
    const updated = [...devices];
    updated[index]!.control_device_id = value;
    setDevices(updated);
  };

  // Функція для керування пристроєм (Вкл/Викл)
  const handleSwitchControl = async (deviceId: string, state: 0 | 1) => {
    if (!deviceId.trim()) {
      setSwitchModalContent("ID пристрою не вказано");
      setSwitchModalOpen(true);
      return;
    }

    setSwitchingDeviceId(`${deviceId}-${state}`);

    try {
      const result = await switchControlMutation.mutateAsync({
        state,
        device_id: deviceId.trim(),
      });

      // Показуємо результат у модалці
      const content = result.data 
        ? JSON.stringify(result.data, null, 2)
        : "null";
      setSwitchModalContent(content);
      setSwitchModalOpen(true);
    } catch (err) {
      setSwitchModalContent(
        err instanceof Error ? err.message : "Невідома помилка"
      );
      setSwitchModalOpen(true);
    } finally {
      setSwitchingDeviceId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация
    if (!username.trim()) {
      setError("Будь ласка, введіть ім'я користувача Smart Life");
      return;
    }
    if (!password.trim()) {
      setError("Будь ласка, введіть пароль Smart Life");
      return;
    }

    // Проверка rate limit
    if (remainingSeconds > 0) {
      setError(
        `Зачекайте ще ${remainingSeconds} секунд перед наступною спробою підключення`,
      );
      return;
    }

    setIsSaving(true);

    try {
      // 1. Сохранить smart_life_creds
      const creds: SmartLifeCreds = {
        smart_life_user: username.trim(),
        smart_life_pswd: password.trim(),
        smart_life_token: "",
      };

      await saveMutation.mutateAsync({
        property: "smart_life_creds",
        value: JSON.stringify(creds),
      });

      // 2. Обновить control_device_id в user_appliances
      if (appliancesData?.value) {
        try {
          const appliances = JSON.parse(
            appliancesData.value,
          ) as ApplianceItem[];

          // Обновляем device_id для SmartLife устройств
          const updatedAppliances = appliances.map((item) => {
            if (item.control_api === "smart_life") {
              const deviceInForm = devices.find((d) => d.type === item.type);
              if (deviceInForm) {
                return {
                  ...item,
                  control_device_id: deviceInForm.control_device_id ?? "",
                };
              }
            }
            return item;
          });

          await saveMutation.mutateAsync({
            property: "user_appliances",
            value: JSON.stringify(updatedAppliances),
          });
        } catch (e) {
          console.error("Failed to update user_appliances:", e);
          setError("Помилка при оновленні налаштувань пристроїв");
          setIsSaving(false);
          return;
        }
      }

      // 3. Вызвать SmartLifeAuth
      localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());
      setRemainingSeconds(RATE_LIMIT_SECONDS);

      const authResult = await authMutation.mutateAsync();

      if (authResult.success) {
        setShowSuccess(true);
        setError(null);

        // Обновить данные одразу для оновлення індикаторів меню
        await utils.properties.get.invalidate();

        // Скрыть уведомление через 5 секунд
        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      } else {
        setError(
          authResult.message ||
            "Не вдалося підключитися до Smart Life. Перевірте введені дані.",
        );
      }
    } catch (err) {
      console.error("Save error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Помилка при збереженні. Спробуйте ще раз.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !user) {
    return null;
  }

  const isButtonDisabled = isSaving || remainingSeconds > 0;

  return (
    <>
      <Head>
        <title>Параметри Smart Life - SaveKW</title>
      </Head>
      <SettingsLayout>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Параметри Smart Life
          </h2>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Левая колонка - форма */}
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
                        Ім&apos;я користувача
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
                        Пароль
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

            {/* Devices List */}
            {devices.length > 0 && (
                  <div className="mt-6">
                    <h4 className="mb-3 text-sm font-medium text-gray-900">
                      Пристрої, які керуються через Smart Life
                    </h4>
                    <div className="space-y-3">
                      {devices.map((device, index) => {
                        // Проверяем статус устройства в полном списке
                        const applianceInFull = allAppliances.find(
                          (a) => a.type === device.type,
                        );
                        const isEnabled = applianceInFull?.status ?? false;

                        // Скрываем поле, если устройство отключено
                        if (!isEnabled) {
                          return null;
                        }

                        const description =
                          SMARTLIFE_DEVICE_DESCRIPTIONS[
                            device.type as keyof typeof SMARTLIFE_DEVICE_DESCRIPTIONS
                          ] ??
                          APPLIANCE_LABELS[
                            device.type as keyof typeof APPLIANCE_LABELS
                          ] ??
                          device.type;

                        return (
                          <div
                            key={device.type}
                            className="rounded-md border border-gray-200 p-3"
                          >
                            <label className="block text-xs font-medium text-gray-700">
                              {description}
                            </label>
                            <div className="mt-1 flex gap-2">
                              <input
                                type="text"
                                value={device.control_device_id ?? ""}
                                onChange={(e) =>
                                  handleDeviceIdChange(index, e.target.value)
                                }
                                className="block flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                placeholder="Введіть Smart Life ID"
                                disabled={isSaving}
                              />
                              <button
                                type="button"
                                onClick={() => handleSwitchControl(device.control_device_id ?? "", 1)}
                                disabled={isSaving || switchingDeviceId === `${device.control_device_id}-1`}
                                className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {switchingDeviceId === `${device.control_device_id}-1` ? (
                                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  "Вкл"
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSwitchControl(device.control_device_id ?? "", 0)}
                                disabled={isSaving || switchingDeviceId === `${device.control_device_id}-0`}
                                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {switchingDeviceId === `${device.control_device_id}-0` ? (
                                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  "Викл"
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                          Підключення до Smart Life налаштовано.
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
                    disabled={isButtonDisabled}
                    className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {remainingSeconds > 0
                      ? `Зачекайте ${remainingSeconds} сек`
                      : isSaving
                        ? "Збереження..."
                        : "Зберегти"}
                  </button>
                </div>
              </form>
            </div>

            {/* Правая колонка - инструкция */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <iframe
                src="/docs/smartlife-setup"
                className="h-[600px] w-full rounded-lg"
                title="Інструкція з налаштування Smart Life"
              />
            </div>
          </div>
        </div>

        {/* Модалка результату SwitchControl */}
        {switchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Результат команди
              </h3>
              <pre className="mb-4 max-h-60 overflow-auto rounded-md bg-gray-100 p-3 text-sm text-gray-800">
                {switchModalContent}
              </pre>
              <button
                type="button"
                onClick={() => setSwitchModalOpen(false)}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Ок
              </button>
            </div>
          </div>
        )}
      </SettingsLayout>
    </>
  );
}
