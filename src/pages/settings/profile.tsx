import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import SettingsLayout from "@/components/SettingsLayout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/utils/api";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [userName, setUserName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contract, setContract] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Редирект на логин если не залогинен
  useEffect(() => {
    if (!authLoading && !user) {
      void router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  // Загрузка данных
  const { data: userNameData, isLoading: isLoadingUserName } =
    api.properties.get.useQuery(
      { property: "user_name" },
      { enabled: !!user, refetchOnWindowFocus: false },
    );

  const { data: phoneData, isLoading: isLoadingPhone } =
    api.properties.get.useQuery(
      { property: "phone_number" },
      { enabled: !!user, refetchOnWindowFocus: false },
    );

  const { data: contractData, isLoading: isLoadingContract } =
    api.properties.get.useQuery(
      { property: "contract" },
      { enabled: !!user, refetchOnWindowFocus: false },
    );

  // Mutation для сохранения
  const saveMutation = api.properties.set.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      setShowSuccess(true);
      setError(null);
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error) => {
      setIsSaving(false);
      setError(error.message || "Помилка при збереженні даних");
    },
  });

  // Инициализация данных
  useEffect(() => {
    if (userNameData?.value) setUserName(userNameData.value);
  }, [userNameData]);

  useEffect(() => {
    if (phoneData?.value) setPhoneNumber(phoneData.value);
  }, [phoneData]);

  useEffect(() => {
    if (contractData?.value) setContract(contractData.value);
  }, [contractData]);

  // Обработчик копирования
  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Маска для телефону: +XXX XX XXX XX XX
  const formatPhoneNumber = (value: string) => {
    // Удаляем все нецифровые символы
    const numbers = value.replace(/\D/g, "");

    // Ограничиваем длину (13 цифр)
    const limited = numbers.slice(0, 13);

    // Форматируем: +XXX XX XXX XX XX
    let formatted = "+";
    if (limited.length > 0) formatted += limited.slice(0, 3); // +380
    if (limited.length > 3) formatted += " " + limited.slice(3, 5); // 50
    if (limited.length > 5) formatted += " " + limited.slice(5, 8); // 123
    if (limited.length > 8) formatted += " " + limited.slice(8, 10); // 45
    if (limited.length > 10) formatted += " " + limited.slice(10, 12); // 67

    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  // Обработчик сохранения
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      // Сохраняем user_name
      await saveMutation.mutateAsync({
        property: "user_name",
        value: userName,
      });

      // Сохраняем phone_number
      await saveMutation.mutateAsync({
        property: "phone_number",
        value: phoneNumber,
      });
    } catch (err) {
      // Error handled by mutation onError
    }
  };

  const isLoading =
    authLoading || isLoadingUserName || isLoadingPhone || isLoadingContract;

  if (isLoading || !user) {
    return (
      <>
        <Head>
          <title>Профіль користувача - SaveKW</title>
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
        <title>Профіль користувача - SaveKW</title>
      </Head>
      <SettingsLayout>
        <div className="p-6">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Профіль користувача
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Номер контракту (readonly) */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Номер контракту
              </label>
              <div className="flex items-center gap-3">
                <span className="text-base text-gray-900">{contract}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(contract, "contract")}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-50"
                  title="Копіювати"
                >
                  {copiedField === "contract" ? (
                    <svg
                      className="h-5 w-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Email (readonly) */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="flex items-center gap-3">
                <span className="text-base text-gray-900">
                  {user.email ?? ""}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(user.email ?? "", "email")}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-50"
                  title="Копіювати"
                >
                  {copiedField === "email" ? (
                    <svg
                      className="h-5 w-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Ім'я користувача (editable) */}
            <div>
              <label
                htmlFor="userName"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Ім&apos;я користувача
              </label>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Введіть ваше ім'я"
              />
            </div>

            {/* Телефон (editable з маскою) */}
            <div>
              <label
                htmlFor="phoneNumber"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Номер телефону
              </label>
              <input
                type="text"
                id="phoneNumber"
                value={phoneNumber}
                onChange={handlePhoneChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="+380 XX XXX XX XX"
              />
              <p className="mt-1 text-sm text-gray-500">
                Формат: +XXX XX XXX XX XX
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Success message */}
            {showSuccess && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-sm text-green-800">
                  ✓ Дані успішно збережено
                </p>
              </div>
            )}

            {/* Кнопка збереження */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSaving ? "Збереження..." : "Зберегти зміни"}
              </button>
            </div>
          </form>
        </div>
      </SettingsLayout>
    </>
  );
}
