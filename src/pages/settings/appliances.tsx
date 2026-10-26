import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import SettingsLayout from "@/components/SettingsLayout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/utils/api";
import {
  APPLIANCE_ORDER,
  APPLIANCE_LABELS,
  USER_APPLIANCES_KEY,
  USER_ALGORITHMS_KEY,
  FALLBACK_DEFAULT_APPLIANCES,
  parseAppliancesData,
  stringifyAppliancesData,
  getAvailableAlgorithms,
  updateUserAlgorithms,
  type AppliancesData,
  type ApplianceType,
  type DefaultAlgorithms,
  type UserAlgorithms,
} from "@/lib/appliances";
import {
  getRequiredEquipment,
  getUniqueEquipmentIds,
} from "@/lib/equipment-logic";

export default function AppliancesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const utils = api.useUtils();
  const [appliances, setAppliances] = useState<AppliancesData>(() => [
    ...FALLBACK_DEFAULT_APPLIANCES,
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  // Редирект на логин если не залогинен
  useEffect(() => {
    if (!authLoading && !user) {
      void router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  // Загрузка данных
  const { data, isLoading } = api.properties.get.useQuery(
    {
      property: USER_APPLIANCES_KEY,
    },
    {
      refetchOnWindowFocus: false, // Отключаем refetch при возврате фокуса
      refetchOnMount: false, // Отключаем refetch при монтировании (если данные уже есть в кеше)
      staleTime: 5 * 60 * 1000, // Данные считаются свежими 5 минут
    },
  );

  // Mutation для сохранения
  const saveMutation = api.properties.set.useMutation({
    onSuccess: async () => {
      setIsSaving(false);
      setShowSuccess(true);
      setError(null);

      // Інвалідуємо кеш для оновлення індикаторів меню
      await utils.properties.get.invalidate();

      // Скрыть уведомление через 3 секунды
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    },
    onError: (error) => {
      setIsSaving(false);
      setError(error.message || "Помилка при збереженні даних");
    },
  });

  // Загружаем default_appliances з системних налаштувань
  const { data: defaultAppliancesData } = api.systemSettings.get.useQuery(
    { key: "default_appliances" },
    {
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000, // 10 минут
    },
  );

  // Mutation для сохранения алгоритмов
  const saveAlgorithmsMutation = api.properties.set.useMutation();

  // Инициализация данных при загрузке
  useEffect(() => {
    if (!isLoading && data !== undefined) {
      const parsedData = parseAppliancesData(
        data.value,
        defaultAppliancesData?.value,
      );
      setAppliances(parsedData);
    }
  }, [data, isLoading, defaultAppliancesData]);

  // Определяем необходимое оборудование на основе выбранных приборов
  const requiredEquipment = useMemo(() => {
    const selectedIds = appliances
      .filter((item) => item.status)
      .map((item) => item.type);
    return getRequiredEquipment(selectedIds);
  }, [appliances]);

  // Получаем уникальные ID оборудования для загрузки из БД
  const equipmentIds = useMemo(() => {
    return getUniqueEquipmentIds(requiredEquipment);
  }, [requiredEquipment]);

  // Загружаем информацию об оборудовании из БД
  const { data: equipmentData } = api.equipment.getByIds.useQuery(
    { ids: equipmentIds },
    {
      enabled: equipmentIds.length > 0, // Запрашиваем только если есть выбранные приборы
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000, // 10 минут
    },
  );

  // Обработчик изменения чекбокса
  const handleToggle = (type: ApplianceType) => {
    setAppliances((prev) =>
      prev.map((item) =>
        item.type === type ? { ...item, status: !item.status } : item,
      ),
    );
  };

  // Обработчик сохранения формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      // Шаг 1: Получаем default_algorithms из системных настроек
      const defaultAlgorithmsData = await utils.systemSettings.get.fetch({
        key: "default_algorithms",
      });

      if (!defaultAlgorithmsData?.value) {
        throw new Error("Не вдалося отримати налаштування алгоритмів");
      }

      const defaultAlgorithms =
        defaultAlgorithmsData.value as DefaultAlgorithms;

      // Шаг 2: Вычисляем доступные алгоритмы для выбранного оборудования
      const availableAlgorithms = getAvailableAlgorithms(
        appliances,
        defaultAlgorithms,
      );

      // Шаг 3: Проверяем, есть ли доступные алгоритмы
      if (availableAlgorithms.length === 0) {
        setError(
          "Обрана комбінація обладнання не призведе до економії. Спробуйте обрати іншу комбінацію.",
        );
        setIsSaving(false);
        return;
      }

      // Шаг 4: Получаем текущие алгоритмы пользователя
      const currentAlgorithmsData = await utils.properties.get.fetch({
        property: USER_ALGORITHMS_KEY,
      });

      let currentAlgorithms: UserAlgorithms | null = null;
      if (currentAlgorithmsData?.value) {
        try {
          currentAlgorithms = JSON.parse(
            currentAlgorithmsData.value,
          ) as UserAlgorithms;
        } catch {
          currentAlgorithms = null;
        }
      }

      // Если у пользователя нет general_settings, берем из default_algorithms
      if (!currentAlgorithms?.general_settings) {
        currentAlgorithms = {
          general_settings: defaultAlgorithms.general_settings,
          algorithms: currentAlgorithms?.algorithms ?? [],
        };
      }

      // Шаг 5: Обновляем алгоритмы пользователя
      const updatedAlgorithms = updateUserAlgorithms(currentAlgorithms, {
        algorithms: availableAlgorithms,
      });

      // Шаг 6: Сохраняем appliances
      await saveMutation.mutateAsync({
        property: USER_APPLIANCES_KEY,
        value: stringifyAppliancesData(appliances),
      });

      // Шаг 7: Сохраняем обновленные алгоритмы
      await saveAlgorithmsMutation.mutateAsync({
        property: USER_ALGORITHMS_KEY,
        value: JSON.stringify(updatedAlgorithms),
      });

      // Успех
      setIsSaving(false);
      setShowSuccess(true);
      setError(null);

      // Скрыть уведомление через 3 секунды
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (err) {
      setIsSaving(false);
      const errorMessage =
        err instanceof Error ? err.message : "Помилка при збереженні даних";
      setError(errorMessage);
    }
  };

  // Показываем loading пока проверяется аутентификация или загружаются данные
  if (authLoading || isLoading || !user) {
    return (
      <>
        <Head>
          <title>Обладнання - SaveKW</title>
        </Head>
        <SettingsLayout>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
              <p className="text-gray-600">Завантаження...</p>
            </div>
          </div>
        </SettingsLayout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Обладнання - SaveKW</title>
      </Head>
      <SettingsLayout>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Обладнання</h2>
          </div>

          {/* Toast Success */}
          {showSuccess && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5 text-emerald-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">Налаштування збережено!</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5 text-red-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Левая часть - чекбоксы */}
              <div>
                <h3 className="mb-4 text-sm text-gray-600">
                  Оберіть обладнання, яким буде керувати SaveKW
                </h3>
                <div className="space-y-4">
                  {APPLIANCE_ORDER.map((type) => {
                    const item = appliances.find((a) => a.type === type);
                    const isChecked = item?.status ?? false;

                    return (
                      <label
                        key={type}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggle(type)}
                          className="h-5 w-5 cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                        />
                        <span className="flex-1 font-medium text-gray-900">
                          {APPLIANCE_LABELS[type]}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Правая часть - необходимое оборудование */}
              <div>
                <h3 className="mb-4 text-sm text-gray-600">
                  Необхідні додаткові пристрої
                </h3>

                {requiredEquipment.length === 0 ? (
                  <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-white p-6 text-center">
                    <div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="mx-auto h-12 w-12 text-gray-400"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="mt-4 text-sm text-gray-500">
                        Оберіть обладнання зліва
                      </p>
                      <p className="text-sm text-gray-500">
                        щоб побачити необхідні компоненти
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
                      {requiredEquipment.map((req, index) => {
                        const equipment = equipmentData?.find(
                          (eq) => eq.id === req.id,
                        );

                        return (
                          <div
                            key={`${req.id}-${index}`}
                            className="flex gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
                          >
                            {/* Картинка */}
                            <div className="flex-shrink-0">
                              {equipment?.imageData ? (
                                <div className="group relative">
                                  <img
                                    src={equipment.imageData}
                                    alt={equipment.name}
                                    className="h-20 w-20 rounded-lg border border-gray-300 bg-white object-contain p-2"
                                  />
                                  {/* Иконка лупы */}
                                  <button
                                    onClick={() =>
                                      equipment.imageData &&
                                      setSelectedImage({
                                        src: equipment.imageData,
                                        alt: equipment.name,
                                      })
                                    }
                                    className="absolute right-0 bottom-0 translate-x-1 translate-y-1 rounded-full bg-emerald-600 p-1.5 text-white opacity-0 shadow-lg transition-all group-hover:opacity-100 hover:bg-emerald-700"
                                    title="Увеличить изображение"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={2}
                                      stroke="currentColor"
                                      className="h-3 w-3"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.5 5.5a7.5 7.5 0 0010.5 10.5z"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-gray-300 bg-white">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="h-8 w-8 text-gray-400"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>

                            {/* Информация */}
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-gray-900">
                                {equipment?.name ?? "Завантаження..."}
                              </h4>
                              <p className="mt-1 text-sm text-gray-600">
                                {req.reason}
                              </p>
                              {req.count > 1 && (
                                <p className="mt-1 text-xs font-medium text-emerald-600">
                                  Кількість: {req.count} шт.
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Ссылка "Придбати" внизу */}
                    <div className="mt-4">
                      <Link
                        href="/equipment/shop"
                        className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Придбати обладнання →
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-5 w-5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Збереження...
                  </span>
                ) : (
                  "Зберегти"
                )}
              </button>
            </div>
          </form>

          {/* Модалка для увеличенного изображения */}
          {selectedImage && (
            <div
              className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
              onClick={() => setSelectedImage(null)}
            >
              <div
                className="relative max-h-[90vh] max-w-[90vw] rounded-lg bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Кнопка закрытия */}
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-3 -right-3 z-10 rounded-full bg-red-600 p-1.5 text-white shadow-lg transition-colors hover:bg-red-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {/* Увеличенное изображение */}
                <img
                  src={selectedImage.src}
                  alt={selectedImage.alt}
                  className="h-auto max-h-[85vh] w-auto max-w-[85vw] rounded-lg object-contain p-4"
                />
              </div>
            </div>
          )}
        </div>
      </SettingsLayout>
    </>
  );
}
