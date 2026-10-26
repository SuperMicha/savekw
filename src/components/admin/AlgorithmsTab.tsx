import { useState, useEffect } from "react";
import { api } from "@/utils/api";

// Допоміжна функція для форматування дати в формат datetime-local
function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Допоміжна функція для отримання початкової дати (24 години тому)
function getDefaultStartDate(): string {
  const date = new Date();
  date.setHours(date.getHours() - 24);
  return formatDateTimeLocal(date);
}

// Допоміжна функція для отримання поточної дати/часу
function getDefaultEndDate(): string {
  return formatDateTimeLocal(new Date());
}

export function AlgorithmsTab() {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>("");
  const [startDateTime, setStartDateTime] = useState<string>("");
  const [endDateTime, setEndDateTime] = useState<string>("");
  const [page, setPage] = useState<number>(0);
  const [limit, setLimit] = useState<number>(50);
  const [showFilters, setShowFilters] = useState<boolean>(true);

  const { data: algorithmNames } = api.admin.getAlgorithmNames.useQuery();

  // Автоматично обрати перший алгоритм
  useEffect(() => {
    if (algorithmNames && algorithmNames.length > 0 && !selectedAlgorithm) {
      const firstAlgorithm = algorithmNames[0];
      if (firstAlgorithm) {
        setSelectedAlgorithm(firstAlgorithm);
      }
    }
  }, [algorithmNames, selectedAlgorithm]);

  // Скидання сторінки при зміні фільтрів
  useEffect(() => {
    setPage(0);
  }, [selectedAlgorithm, selectedLevel, selectedUserId, selectedUserEmail, startDateTime, endDateTime, limit]);

  // Конвертуємо datetime-local в ISO для API
  const startDateISO = startDateTime ? new Date(startDateTime).toISOString() : undefined;
  const endDateISO = endDateTime ? new Date(endDateTime).toISOString() : undefined;

  const {
    data: logs,
    isLoading,
    refetch,
  } = api.admin.getAlgorithmLogs.useQuery(
    {
      page,
      limit,
      algorithm: selectedAlgorithm || undefined,
      level: selectedLevel || undefined,
      userId: selectedUserId || undefined,
      userEmail: selectedUserEmail || undefined,
      startDate: startDateISO,
      endDate: endDateISO,
    },
    {
      enabled: !!selectedAlgorithm, // Only fetch when algorithm is selected
    },
  );

  // Швидкі пресети для вибору періоду
  function applyPreset(preset: string) {
    const now = new Date();
    const end = formatDateTimeLocal(now);
    let start: Date;

    switch (preset) {
      case "1h":
        start = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "6h":
        start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case "24h":
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case "yesterday":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        setEndDateTime(formatDateTimeLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)));
        setStartDateTime(formatDateTimeLocal(start));
        return;
      default:
        return;
    }

    setStartDateTime(formatDateTimeLocal(start));
    setEndDateTime(end);
  }

  function getLevelColor(level: string): string {
    switch (level) {
      case "error":
        return "bg-red-100 text-red-800";
      case "warn":
        return "bg-yellow-100 text-yellow-800";
      case "info":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleString("uk-UA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  return (
    <div className="flex gap-4">
      {/* Sidebar Filters */}
      <div className={`${showFilters ? 'w-72 min-w-[288px]' : 'w-0 min-w-0'} transition-all duration-300 overflow-hidden`}>
        <div className="rounded-lg border border-gray-200 bg-white p-4 h-fit sticky top-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Фільтри</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
              title="Сховати фільтри"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Algorithm Filter (Required) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Алгоритм <span className="text-red-600">*</span>
              </label>
              <select
                value={selectedAlgorithm}
                onChange={(e) => setSelectedAlgorithm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Оберіть...</option>
                {algorithmNames?.map((name: string) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Level Filter */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Рівень
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Всі рівні</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>
            </div>

            {/* User ID Filter */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                User ID
              </label>
              <input
                type="text"
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  if (e.target.value) setSelectedUserEmail("");
                }}
                placeholder="Введіть ID..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* User Email Filter */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                User Email
              </label>
              <input
                type="email"
                value={selectedUserEmail}
                onChange={(e) => {
                  setSelectedUserEmail(e.target.value);
                  if (e.target.value) setSelectedUserId("");
                }}
                placeholder="Введіть email..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Date/Time Range Picker */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="mb-2 text-sm font-medium text-gray-700">Період</h4>
              
              {/* Quick presets */}
              <div className="mb-3 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => applyPreset("1h")}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  1г
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("6h")}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  6г
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("24h")}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  24г
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("7d")}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  7д
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("today")}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Сьогодні
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("yesterday")}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Вчора
                </button>
                <button
                  type="button"
                  onClick={() => { setStartDateTime(""); setEndDateTime(""); }}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Все
                </button>
              </div>

              {/* Custom date/time pickers */}
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    Початок
                  </label>
                  <input
                    type="datetime-local"
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    Кінець
                  </label>
                  <input
                    type="datetime-local"
                    value={endDateTime}
                    onChange={(e) => setEndDateTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!showFilters && (
              <button
                onClick={() => setShowFilters(true)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                title="Показати фільтри"
              >
                ☰ Фільтри
              </button>
            )}
            <h2 className="text-xl font-semibold text-gray-900">Логи алгоритмів</h2>
          </div>
          <button
            onClick={() => void refetch()}
            disabled={!selectedAlgorithm}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            🔄 Оновити
          </button>
        </div>

      {/* Logs Display */}
      {!selectedAlgorithm ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-600">Оберіть алгоритм для перегляду логів</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
            <p className="text-gray-600">Завантаження логів...</p>
          </div>
        </div>
      ) : !logs?.logs || logs?.logs.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-600">Немає логів для вибраних фільтрів</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <p className="text-sm text-gray-600">
              Знайдено записів:{" "}
              <span className="font-semibold text-gray-900">
                {logs?.total ?? 0}
              </span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Час
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Рівень
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Повідомлення
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    User ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Execution ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {logs?.logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-900">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${getLevelColor(log.level)}`}
                      >
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="max-w-2xl">
                        {log.message}
                        {log.metadata && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                              Показати метадані
                            </summary>
                            <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-2 text-xs">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600">
                      {log.userId || "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm whitespace-nowrap text-gray-600">
                      {log.executionId ? log.executionId.substring(0, 8) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">
                  Записів на сторінці:
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 px-3 py-1 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="text-sm text-gray-700">
                Записи {page * limit + 1}–
                {Math.min((page + 1) * limit, logs?.total ?? 0)} з{" "}
                {logs?.total ?? 0}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Попередня
              </button>

              <div className="flex items-center gap-1">
                <span className="px-3 py-2 text-sm text-gray-700">
                  Сторінка {page + 1} з {Math.ceil((logs?.total ?? 0) / limit)}
                </span>
              </div>

              <button
                onClick={() => setPage(page + 1)}
                disabled={!logs?.hasMore}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Наступна →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h4 className="mb-2 font-semibold text-blue-900">ℹ️ Інформація</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>
            • Логи зберігаються протягом 5 днів, після чого автоматично
            видаляються
          </li>
          <li>• Керування алгоритмами доступне на вкладці "Планувальник"</li>
          <li>• Використовуйте фільтри для пошуку конкретних логів</li>
        </ul>
      </div>
      </div>
    </div>
  );
}
