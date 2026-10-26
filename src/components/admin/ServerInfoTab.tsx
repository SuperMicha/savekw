import { api } from "@/utils/api";

export function ServerInfoTab() {
  const {
    data: serverInfo,
    isLoading,
    refetch,
  } = api.admin.getServerInfo.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
          <p className="text-gray-600">Завантаження...</p>
        </div>
      </div>
    );
  }

  if (!serverInfo) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Не вдалося завантажити дані про сервер
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Серверна інформація
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => void refetch()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            🔄 Оновити
          </button>
          {/*}
          <a
            href="https://github.com/SuperMicha/savekw2/actions"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            🚀 Deploy (GitHub)
          </a> 
          */}

          <a
            href="https://github.com/SuperMicha/savekw2"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
          >
            <span className="inline-flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </span>
          </a>
          <a
            href="https://supabase.com/dashboard/project/your-project-ref"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <span className="inline-flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13.89 2.22 8.78 8.17a1.14 1.14 0 0 0 .88 1.87h5.34a.57.57 0 0 1 .57.69l-1.56 8.32a.57.57 0 0 0 1 .48l5.11-5.95a1.14 1.14 0 0 0-.88-1.87h-5.34a.57.57 0 0 1-.57-.69l1.56-8.32a.57.57 0 0 0-1-.48Z" />
              </svg>
              Supabase
            </span>
          </a>
        </div>
      </div>

      {/* System Info */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">💻 Система</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Операційна система</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {serverInfo.system.os}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">CPU Usage (1 min avg)</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {serverInfo.system.cpuUsage}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Memory</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {serverInfo.system.memoryUsed} / {serverInfo.system.memoryTotal}
              <span className="ml-2 text-sm text-gray-600">
                ({serverInfo.system.memoryUsage}%)
              </span>
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Disk</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {serverInfo.system.diskUsed} / {serverInfo.system.diskTotal}
              <span className="ml-2 text-sm text-gray-600">
                ({serverInfo.system.diskUsage})
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">🚀 Додаток</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Git версія</p>
            <p className="mt-1 font-mono text-lg font-semibold text-gray-900">
              {serverInfo.app.version}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Uptime</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {serverInfo.app.uptime}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Node.js</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {serverInfo.app.nodeVersion}
            </p>
          </div>
        </div>
      </div>

      {/* Docker Containers */}
      {serverInfo.docker.containers.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            🐳 Docker Контейнери
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Ім'я
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Статус
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    CPU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Memory
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {serverInfo.docker.containers.map((container) => (
                  <tr key={container.name}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {container.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {container.status}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {container.cpu}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {container.memory}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Database & Nginx */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            🗄️ База даних
          </h3>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Розмір бази</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {serverInfo.database.size}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">🌐 Nginx</h3>
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Всього запитів</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {serverInfo.nginx.totalRequests}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Помилки</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {serverInfo.nginx.totalErrors}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
