import React, { useState } from "react";
import { api } from "@/utils/api";

interface Algorithm {
  name: string;
  displayName: string;
  interval: string;
  enabled: boolean;
  lastRun?: Date;
  status?: "idle" | "running" | "error";
}

export function SchedulerTab() {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string | null>(
    null,
  );
  const [editingAlgorithm, setEditingAlgorithm] = useState<string | null>(null);
  const [newInterval, setNewInterval] = useState<string>("");
  const [intervalValue, setIntervalValue] = useState<number>(10);
  const [intervalUnit, setIntervalUnit] = useState<"s" | "m" | "h" | "d">("m");

  // Запит статусу планувальника
  const { data: schedulerData, refetch } =
    api.admin.getSchedulerStatus.useQuery();

  // Мутації
  const toggleMutation = api.admin.toggleAlgorithm.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const runManuallyMutation = api.admin.runAlgorithmManually.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const updateIntervalMutation = api.admin.updateAlgorithmInterval.useMutation({
    onSuccess: () => {
      void refetch();
      setEditingAlgorithm(null);
      setNewInterval("");
    },
  });

  const restartCronMutation = api.admin.restartCronJobs.useMutation({
    onSuccess: () => {
      void refetch();
      alert("✅ Cron jobs перезапущені успішно!");
    },
    onError: (error) => {
      alert(`❌ Помилка: ${error.message}`);
    },
  });

  const handleToggle = (algName: string, currentStatus: boolean) => {
    if (
      confirm(
        `${currentStatus ? "Вимкнути" : "Увімкнути"} алгоритм ${algName}?`,
      )
    ) {
      toggleMutation.mutate({
        algorithmName: algName,
        enabled: !currentStatus,
      });
    }
  };

  const handleRunManually = (algName: string) => {
    if (confirm(`Запустити ${algName} для всіх користувачів?`)) {
      runManuallyMutation.mutate({ algorithmName: algName });
    }
  };

  const handleEditInterval = (algName: string, currentInterval: string) => {
    setEditingAlgorithm(algName);
    setNewInterval(currentInterval);

    // Парсимо поточний інтервал для заповнення picker
    const match = currentInterval.match(/^(\d+)\s*([smhd])$/);
    if (match && match[1] && match[2]) {
      setIntervalValue(parseInt(match[1]));
      setIntervalUnit(match[2] as "s" | "m" | "h" | "d");
    } else {
      setIntervalValue(10);
      setIntervalUnit("m");
    }
  };

  const handleSaveInterval = () => {
    const interval = `${intervalValue}${intervalUnit}`;
    if (editingAlgorithm) {
      updateIntervalMutation.mutate({
        algorithmName: editingAlgorithm,
        interval: interval,
      });
    }
  };

  if (!schedulerData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Завантаження...</div>
      </div>
    );
  }

  const algorithms = schedulerData.algorithms;

  return (
    <div className="space-y-6">
      {/* Загальний статус */}
      <div className="rounded-lg bg-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Статус планувальника
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              {schedulerData.isRunning ? "🟢 Активний" : "🔴 Зупинений"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {algorithms.length}
              </div>
              <div className="text-sm text-gray-400">Алгоритмів</div>
            </div>
            <button
              onClick={() => {
                if (
                  confirm(
                    "Перезапустити всі cron jobs? Це застосує нові інтервали без перезапуску сервера.",
                  )
                ) {
                  restartCronMutation.mutate();
                }
              }}
              disabled={restartCronMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
              title="Перезапустити cron jobs та застосувати нові інтервали"
            >
              {restartCronMutation.isPending
                ? "⏳ Перезапуск..."
                : "🔄 Перезапустити Cron"}
            </button>
          </div>
        </div>
      </div>

      {/* Таблиця алгоритмів */}
      <div className="overflow-hidden rounded-lg bg-gray-800">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase">
                Алгоритм
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase">
                Інтервал
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase">
                Останній запуск
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-300 uppercase">
                Дії
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700 bg-gray-800">
            {algorithms.map((alg) => (
              <tr
                key={alg.name}
                className="transition-colors hover:bg-gray-700/50"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div
                      className={`mr-2 h-2 w-2 rounded-full ${
                        alg.enabled ? "bg-green-500" : "bg-gray-500"
                      }`}
                    />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {alg.displayName}
                      </div>
                      <div className="text-xs text-gray-400">{alg.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex rounded-full bg-blue-900/50 px-2 py-1 text-xs font-semibold text-blue-300">
                    {alg.interval}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      alg.status === "running"
                        ? "bg-yellow-900/50 text-yellow-300"
                        : alg.status === "error"
                          ? "bg-red-900/50 text-red-300"
                          : "bg-gray-700 text-gray-300"
                    }`}
                  >
                    {alg.status === "running"
                      ? "🔄 Виконується"
                      : alg.status === "error"
                        ? "❌ Помилка"
                        : "⏸️ Очікує"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-400">
                  {alg.lastRun
                    ? new Date(alg.lastRun).toLocaleString("uk-UA")
                    : "—"}
                </td>
                <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEditInterval(alg.name, alg.interval)}
                      disabled={updateIntervalMutation.isPending}
                      className="rounded bg-gray-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
                      title="Редагувати інтервал"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleToggle(alg.name, alg.enabled)}
                      disabled={
                        toggleMutation.isPending ||
                        runManuallyMutation.isPending
                      }
                      className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                        alg.enabled
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-green-600 text-white hover:bg-green-700"
                      } disabled:opacity-50`}
                    >
                      {alg.enabled ? "Вимкнути" : "Увімкнути"}
                    </button>
                    <button
                      onClick={() => handleRunManually(alg.name)}
                      disabled={
                        !alg.enabled ||
                        toggleMutation.isPending ||
                        runManuallyMutation.isPending
                      }
                      className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      ▶️ Запустити
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Підказки */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-900/20 p-4">
        <h4 className="mb-2 text-sm font-semibold text-blue-300">
          ℹ️ Інформація про планувальник
        </h4>
        <ul className="space-y-1 text-sm text-gray-300">
          <li>
            • <strong>✏️ Редагувати інтервал</strong> — змінити періодичність
            запуску алгоритму
          </li>
          <li>
            • <strong>🔄 Перезапустити Cron</strong> — застосувати нові
            інтервали без перезапуску сервера
          </li>
          <li>
            • <strong>Увімкнути/Вимкнути</strong> — змінює статус алгоритму для
            всіх користувачів
          </li>
          <li>
            • <strong>Запустити</strong> — негайно виконує алгоритм для всіх
            користувачів (для тестування)
          </li>
          <li>
            • Логи виконання зберігаються протягом 5 днів, після чого
            автоматично видаляються
          </li>
        </ul>
      </div>

      {/* Модальне вікно редагування інтервалу */}
      {editingAlgorithm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Редагувати інтервал: {editingAlgorithm}
            </h3>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Періодичність запуску
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={intervalValue}
                    onChange={(e) =>
                      setIntervalValue(parseInt(e.target.value) || 1)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <select
                    value={intervalUnit}
                    onChange={(e) =>
                      setIntervalUnit(e.target.value as "s" | "m" | "h" | "d")
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="s">Секунд</option>
                    <option value="m">Хвилин</option>
                    <option value="h">Годин</option>
                    <option value="d">Днів</option>
                  </select>
                </div>
              </div>
              <p className="mt-3 text-center text-sm text-gray-600">
                Алгоритм буде виконуватись кожні{" "}
                <strong className="text-emerald-600">
                  {intervalValue}{" "}
                  {intervalUnit === "s"
                    ? "секунд"
                    : intervalUnit === "m"
                      ? "хвилин"
                      : intervalUnit === "h"
                        ? "годин"
                        : "днів"}
                </strong>
              </p>
            </div>

            {updateIntervalMutation.error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                Помилка: {updateIntervalMutation.error.message}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingAlgorithm(null);
                  setNewInterval("");
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Скасувати
              </button>
              <button
                onClick={handleSaveInterval}
                disabled={intervalValue < 1 || updateIntervalMutation.isPending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {updateIntervalMutation.isPending
                  ? "Збереження..."
                  : "Зберегти"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
