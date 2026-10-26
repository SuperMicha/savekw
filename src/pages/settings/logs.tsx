import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import SettingsLayout from "@/components/SettingsLayout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/utils/api";

export default function LogsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const utils = api.useUtils();

  // Filters and pagination
  const [logPage, setLogPage] = useState(0);
  const [logFilters, setLogFilters] = useState({
    source: "",
    type: "",
    valueName: "",
  });
  const [logSort, setLogSort] = useState<{
    sortBy: "dateTime" | "source" | "type" | "valueName";
    sortOrder: "asc" | "desc";
  }>({
    sortBy: "dateTime",
    sortOrder: "desc",
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      void router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  // Load logs for current user only
  const {
    data: logsData,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = api.systemLog.getSysLog.useQuery(
    {
      userId: user?.id,
      source: logFilters.source || undefined,
      type: logFilters.type || undefined,
      valueName: logFilters.valueName || undefined,
      limit: 40,
      skip: logPage * 40,
      sortBy: logSort.sortBy,
      sortOrder: logSort.sortOrder,
    },
    {
      enabled: !!user,
      refetchOnWindowFocus: false,
    },
  );

  const { data: filterOptions } = api.systemLog.getFilterOptions.useQuery(
    undefined,
    {
      enabled: !!user,
    },
  );

  if (authLoading || !user) {
    return (
      <>
        <Head>
          <title>Системний лог - SaveKW</title>
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
        <title>Системний лог - SaveKW</title>
      </Head>
      <SettingsLayout>
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Системний лог</h2>
            <p className="mt-1 text-sm text-gray-600">
              Історія змін та подій вашого обладнання
            </p>
          </div>

          <div className="space-y-4">
            {/* Filters */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-4 text-sm font-medium text-gray-700">
                Фільтри
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    Source
                  </label>
                  <input
                    type="text"
                    value={logFilters.source}
                    onChange={(e) => {
                      setLogFilters({ ...logFilters, source: e.target.value });
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
                    setLogFilters({ source: "", type: "", valueName: "" });
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
                      userId: user?.id,
                      source: logFilters.source || undefined,
                      type: logFilters.type || undefined,
                      valueName: logFilters.valueName || undefined,
                    });
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `my-system-log-${new Date().toISOString()}.csv`;
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
                        Дата і час
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
                        Джерело
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
                        Тип
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
                        Параметр
                        {logSort.sortBy === "valueName" && (
                          <span>
                            {logSort.sortOrder === "desc" ? "↓" : "↑"}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Попереднє значення
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Нове значення
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {logsLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        Завантаження...
                      </td>
                    </tr>
                  ) : !logsData?.logs.length ? (
                    <tr>
                      <td
                        colSpan={6}
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
                        <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              log.source === "System"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {log.source ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              log.type === "Error"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {log.type ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium whitespace-nowrap text-gray-900">
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
        </div>
      </SettingsLayout>
    </>
  );
}
