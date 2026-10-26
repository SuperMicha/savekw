import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/utils/api";
import type { GetServerSideProps } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { UsersTab } from "@/components/admin/UsersTab";
import { ServerInfoTab } from "@/components/admin/ServerInfoTab";
import { AlgorithmsTab } from "@/components/admin/AlgorithmsTab";
import { SchedulerTab } from "@/components/admin/SchedulerTab";
import { DatabaseTab } from "@/components/admin/DatabaseTab";

type Tab =
  | "settings"
  | "users"
  | "logs"
  | "server"
  | "algorithms"
  | "scheduler"
  | "database";

interface AdminPageProps {
  error?: string;
  isAdmin?: boolean;
}

export const getServerSideProps: GetServerSideProps<AdminPageProps> = async (
  context,
) => {
  return await requireAdmin(context);
};

export default function AdminPage({ error: accessError }: AdminPageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const utils = api.useUtils();
  const [activeTab, setActiveTab] = useState<Tab>("settings");

  // Показуємо помилку доступу якщо не admin
  if (accessError) {
    return (
      <>
        <Head>
          <title>Доступ заборонено - SaveKW</title>
        </Head>
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="mx-4 max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-8 w-8 text-red-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Доступ заборонено
            </h2>
            <p className="mb-6 text-gray-600">{accessError}</p>
            <button
              onClick={() => router.push("/settings")}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
            >
              Повернутися до налаштувань
            </button>
          </div>
        </div>
      </>
    );
  }

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editedValue, setEditedValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  // System Log filters and pagination
  const [logPage, setLogPage] = useState(0);
  const [logFilters, setLogFilters] = useState({
    userId: "",
    source: "",
    type: "",
    valueName: "",
  });
  const [logSort, setLogSort] = useState<{
    sortBy: "dateTime" | "userId" | "source" | "type" | "valueName";
    sortOrder: "asc" | "desc";
  }>({
    sortBy: "dateTime",
    sortOrder: "desc",
  });

  // Redirect if not logged in
  if (!authLoading && !user) {
    void router.push("/auth/signin");
    return null;
  }

  // Load all keys
  const {
    data: keys,
    isLoading: keysLoading,
    refetch: refetchKeys,
  } = api.systemSettings.getAllKeys.useQuery(undefined, {
    enabled: !!user && activeTab === "settings",
  });

  // Load selected key value
  const {
    data: settingData,
    isLoading: valueLoading,
    refetch: refetchValue,
  } = api.systemSettings.get.useQuery(
    { key: selectedKey! },
    {
      enabled: !!selectedKey,
      refetchOnWindowFocus: false,
    },
  );

  // Mutation for saving
  const saveMutation = api.systemSettings.set.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      setShowSuccess(true);
      setError(null);
      void refetchValue();
      void refetchKeys();

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    },
    onError: (error) => {
      setIsSaving(false);
      setError(error.message || "Помилка при збереженні");
    },
  });

  // System Log queries
  const {
    data: logsData,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = api.systemLog.getSysLog.useQuery(
    {
      userId: logFilters.userId || undefined,
      source: logFilters.source || undefined,
      type: logFilters.type || undefined,
      valueName: logFilters.valueName || undefined,
      limit: 40,
      skip: logPage * 40,
      sortBy: logSort.sortBy,
      sortOrder: logSort.sortOrder,
    },
    {
      enabled: !!user && activeTab === "logs",
      refetchOnWindowFocus: false,
    },
  );

  const { data: filterOptions } = api.systemLog.getFilterOptions.useQuery(
    undefined,
    {
      enabled: !!user && activeTab === "logs",
    },
  );

  // Handle key selection
  const handleKeySelect = (key: string) => {
    setSelectedKey(key);
    setError(null);
    setEditedValue(""); // Clear to trigger reload
  };

  // Refresh value from DB
  const handleRefresh = async () => {
    if (!selectedKey) return;
    setError(null);
    await refetchValue();
  };

  // Save changes
  const handleSave = async () => {
    if (!selectedKey) return;

    // Validate JSON
    try {
      JSON.parse(editedValue);
    } catch {
      setError("Невірний формат JSON");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await saveMutation.mutateAsync({
        key: selectedKey,
        value: editedValue,
      });
    } catch {
      // Error handled in onError
    }
  };

  // Handle create new parameter
  const handleCreateNew = async () => {
    // Validate inputs
    if (!newKey.trim()) {
      setError("Введіть ключ параметра");
      return;
    }

    if (!newValue.trim()) {
      setError("Введіть значення параметра");
      return;
    }

    // Validate JSON
    try {
      JSON.parse(newValue);
    } catch {
      setError("Невірний формат JSON");
      return;
    }

    // Check if key already exists
    if (keys?.includes(newKey)) {
      setError("Параметр з таким ключем вже існує");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await saveMutation.mutateAsync({
        key: newKey,
        value: newValue,
      });

      // Close modal and reset form
      setShowNewModal(false);
      setNewKey("");
      setNewValue("");

      // Select the newly created key
      setSelectedKey(newKey);
    } catch {
      // Error handled in onError
    }
  };

  // Handle cancel new parameter
  const handleCancelNew = () => {
    setShowNewModal(false);
    setNewKey("");
    setNewValue("");
    setError(null);
  };

  // Update textarea when data loads
  if (settingData?.value && editedValue === "" && selectedKey) {
    const valueStr =
      typeof settingData.value === "string"
        ? settingData.value
        : JSON.stringify(settingData.value, null, 2);
    setEditedValue(valueStr);
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
          <p className="text-gray-600">Завантаження...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Адміністрування - SaveKW</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                Адміністрування
              </h1>
              <button
                onClick={() => router.push("/settings")}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Повернутися до налаштувань
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("settings")}
                className={`border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === "settings"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Системні налаштування
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === "users"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Користувачі
              </button>
              <button
                onClick={() => setActiveTab("server")}
                className={`border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === "server"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Серверні дані
              </button>
              <button
                onClick={() => setActiveTab("algorithms")}
                className={`border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === "algorithms"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Логи алгоритмів
              </button>
              <button
                onClick={() => setActiveTab("scheduler")}
                className={`border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === "scheduler"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Планувальник
              </button>
              <button
                onClick={() => setActiveTab("database")}
                className={`border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === "database"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                База даних
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                className={`border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === "logs"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Системний лог
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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

          {activeTab === "settings" && (
            <div className="grid gap-6 lg:grid-cols-4">
              {/* Left column - keys list */}
              <div className="lg:col-span-1">
                <div className="rounded-lg border border-gray-200 bg-white">
                  <div className="border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">Параметри</h3>
                      <button
                        onClick={() => setShowNewModal(true)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                        title="Додати новий параметр"
                      >
                        + Новий
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {keysLoading ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Завантаження...
                      </div>
                    ) : keys && keys.length > 0 ? (
                      keys.map((key: string) => (
                        <button
                          key={key}
                          onClick={() => handleKeySelect(key)}
                          className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                            selectedKey === key
                              ? "bg-emerald-50 font-medium text-emerald-600"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {key}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Немає параметрів
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column - value editor */}
              <div className="lg:col-span-3">
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  {!selectedKey ? (
                    <div className="flex h-96 items-center justify-center text-gray-500">
                      Оберіть параметр зліва
                    </div>
                  ) : (
                    <>
                      {/* Header and buttons */}
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-mono text-sm font-medium text-gray-900">
                          {selectedKey}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={handleRefresh}
                            disabled={valueLoading}
                            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="h-4 w-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                              />
                            </svg>
                            Зчитати
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={isSaving || !editedValue}
                            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSaving ? (
                              <>
                                <svg
                                  className="h-4 w-4 animate-spin"
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
                              </>
                            ) : (
                              <>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                  className="h-4 w-4"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                                  />
                                </svg>
                                Записати
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Textarea for editing */}
                      {valueLoading ? (
                        <div className="flex h-96 items-center justify-center">
                          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
                        </div>
                      ) : (
                        <textarea
                          value={editedValue}
                          onChange={(e) => setEditedValue(e.target.value)}
                          className="h-96 w-full rounded-lg border border-gray-300 p-4 font-mono text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          placeholder="Значення параметра (JSON)"
                          spellCheck={false}
                        />
                      )}

                      {/* Documentation link */}
                      <div className="mt-2 text-sm">
                        <a
                          href="https://github.com/SuperMicha/savekw2/blob/main/SYSTEM_SETTINGS_SETUP.md"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-4 w-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                            />
                          </svg>
                          Документація API: доступні ендпоінти та приклади
                          використання
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && <UsersTab />}

          {activeTab === "server" && <ServerInfoTab />}

          {activeTab === "algorithms" && <AlgorithmsTab />}

          {activeTab === "scheduler" && <SchedulerTab />}

          {activeTab === "database" && <DatabaseTab />}

          {activeTab === "logs" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="mb-4 text-sm font-medium text-gray-700">
                  Фільтри
                </h3>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">
                      User ID
                    </label>
                    <input
                      type="text"
                      value={logFilters.userId}
                      onChange={(e) => {
                        setLogFilters({
                          ...logFilters,
                          userId: e.target.value,
                        });
                        setLogPage(0);
                      }}
                      placeholder="UUID користувача"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">
                      Source
                    </label>
                    <input
                      type="text"
                      value={logFilters.source}
                      onChange={(e) => {
                        setLogFilters({
                          ...logFilters,
                          source: e.target.value,
                        });
                        setLogPage(0);
                      }}
                      list="source-options"
                      placeholder="User, System..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <datalist id="source-options">
                      {filterOptions?.sources.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">
                      Type
                    </label>
                    <input
                      type="text"
                      value={logFilters.type}
                      onChange={(e) => {
                        setLogFilters({ ...logFilters, type: e.target.value });
                        setLogPage(0);
                      }}
                      list="type-options"
                      placeholder="Change, Error..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <datalist id="type-options">
                      {filterOptions?.types.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">
                      Value Name
                    </label>
                    <input
                      type="text"
                      value={logFilters.valueName}
                      onChange={(e) => {
                        setLogFilters({
                          ...logFilters,
                          valueName: e.target.value,
                        });
                        setLogPage(0);
                      }}
                      list="valueName-options"
                      placeholder="NightTariffTime..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <datalist id="valueName-options">
                      {filterOptions?.valueNames.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      setLogFilters({
                        userId: "",
                        source: "",
                        type: "",
                        valueName: "",
                      });
                      setLogPage(0);
                    }}
                    className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Очистити фільтри
                  </button>
                  <button
                    onClick={() => void refetchLogs()}
                    className="rounded-md bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-200"
                  >
                    Оновити
                  </button>
                  <button
                    onClick={async () => {
                      const csv = await utils.systemLog.exportCSV.fetch({
                        userId: logFilters.userId || undefined,
                        source: logFilters.source || undefined,
                        type: logFilters.type || undefined,
                        valueName: logFilters.valueName || undefined,
                      });
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `system-log-${new Date().toISOString()}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
                  >
                    Експорт CSV
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        <button
                          onClick={() =>
                            setLogSort({
                              sortBy: "dateTime",
                              sortOrder:
                                logSort.sortBy === "dateTime" &&
                                logSort.sortOrder === "desc"
                                  ? "asc"
                                  : "desc",
                            })
                          }
                          className="flex items-center gap-1 hover:text-gray-700"
                        >
                          DateTime
                          {logSort.sortBy === "dateTime" && (
                            <span>
                              {logSort.sortOrder === "desc" ? "↓" : "↑"}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        <button
                          onClick={() =>
                            setLogSort({
                              sortBy: "userId",
                              sortOrder:
                                logSort.sortBy === "userId" &&
                                logSort.sortOrder === "desc"
                                  ? "asc"
                                  : "desc",
                            })
                          }
                          className="flex items-center gap-1 hover:text-gray-700"
                        >
                          User ID
                          {logSort.sortBy === "userId" && (
                            <span>
                              {logSort.sortOrder === "desc" ? "↓" : "↑"}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        <button
                          onClick={() =>
                            setLogSort({
                              sortBy: "source",
                              sortOrder:
                                logSort.sortBy === "source" &&
                                logSort.sortOrder === "desc"
                                  ? "asc"
                                  : "desc",
                            })
                          }
                          className="flex items-center gap-1 hover:text-gray-700"
                        >
                          Source
                          {logSort.sortBy === "source" && (
                            <span>
                              {logSort.sortOrder === "desc" ? "↓" : "↑"}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        <button
                          onClick={() =>
                            setLogSort({
                              sortBy: "type",
                              sortOrder:
                                logSort.sortBy === "type" &&
                                logSort.sortOrder === "desc"
                                  ? "asc"
                                  : "desc",
                            })
                          }
                          className="flex items-center gap-1 hover:text-gray-700"
                        >
                          Type
                          {logSort.sortBy === "type" && (
                            <span>
                              {logSort.sortOrder === "desc" ? "↓" : "↑"}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        <button
                          onClick={() =>
                            setLogSort({
                              sortBy: "valueName",
                              sortOrder:
                                logSort.sortBy === "valueName" &&
                                logSort.sortOrder === "desc"
                                  ? "asc"
                                  : "desc",
                            })
                          }
                          className="flex items-center gap-1 hover:text-gray-700"
                        >
                          Value Name
                          {logSort.sortBy === "valueName" && (
                            <span>
                              {logSort.sortOrder === "desc" ? "↓" : "↑"}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        Previous Value
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        Current Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {logsLoading ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-sm text-gray-500"
                        >
                          Завантаження...
                        </td>
                      </tr>
                    ) : !logsData?.logs.length ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-sm text-gray-500"
                        >
                          Записів не знайдено
                        </td>
                      </tr>
                    ) : (
                      logsData.logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-900">
                            {new Date(log.dateTime).toLocaleString("uk-UA")}
                          </td>
                          <td
                            className="max-w-[120px] truncate px-4 py-3 text-sm text-gray-600"
                            title={log.userId ?? ""}
                          >
                            {log.userId ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600">
                            {log.source ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600">
                            {log.type ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600">
                            {log.valueName ?? "—"}
                          </td>
                          <td
                            className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-600"
                            title={log.previousValue ?? ""}
                          >
                            {log.previousValue ?? "—"}
                          </td>
                          <td
                            className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-600"
                            title={log.currentValue ?? ""}
                          >
                            {log.currentValue ?? "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {logsData && logsData.total > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <div className="text-sm text-gray-700">
                    Показано {logPage * 40 + 1}-
                    {Math.min((logPage + 1) * 40, logsData.total)} з{" "}
                    {logsData.total}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLogPage((p) => Math.max(0, p - 1))}
                      disabled={logPage === 0}
                      className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Попередня
                    </button>
                    <button
                      onClick={() => setLogPage((p) => p + 1)}
                      disabled={!logsData.hasMore}
                      className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Наступна
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal for creating new parameter */}
        {showNewModal && (
          <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
            <div className="mx-4 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Створити новий параметр
                </h2>
                <button
                  onClick={handleCancelNew}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Key input */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Ключ параметра
                  </label>
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="default_algorithms"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Унікальний ідентифікатор параметра (наприклад:
                    default_algorithms, weather_api_token)
                  </p>
                </div>

                {/* Value input */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Значення (JSON)
                  </label>
                  <textarea
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="h-64 w-full rounded-lg border border-gray-300 p-4 font-mono text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder='{"example": "value"}'
                    spellCheck={false}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Значення має бути у форматі JSON
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={handleCancelNew}
                  disabled={isSaving}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Скасувати
                </button>
                <button
                  onClick={handleCreateNew}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
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
                      Створення...
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-4 w-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4.5v15m7.5-7.5h-15"
                        />
                      </svg>
                      Створити
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
