import Head from "next/head";
import { api } from "@/utils/api";

/**
 * Отладочная страница для просмотра всего оборудования в БД
 */
export default function EquipmentDebugPage() {
  const { data: equipment, isLoading } = api.equipment.getAll.useQuery();

  return (
    <>
      <Head>
        <title>Debug: Equipment</title>
      </Head>

      <div className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Обладнання в базі даних
            </h1>
            <p className="mt-2 text-gray-600">
              Відладочна сторінка для перевірки даних в таблиці Equipment
            </p>
          </div>

          {isLoading ? (
            <div className="text-center">
              <p className="text-gray-600">Завантаження...</p>
            </div>
          ) : equipment && equipment.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-white p-4 shadow">
                <p className="font-medium text-gray-900">
                  Знайдено записів: {equipment.length}
                </p>
              </div>

              {equipment.map((item) => (
                <div key={item.id} className="rounded-lg bg-white p-6 shadow">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Лівий стовпець - інформація */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {item.name}
                      </h3>

                      <div className="mt-4 space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-500">
                            ID:
                          </span>
                          <code className="ml-2 rounded bg-gray-100 px-2 py-1 text-sm text-gray-900">
                            {item.id}
                          </code>
                        </div>

                        <div>
                          <span className="text-sm font-medium text-gray-500">
                            Type:
                          </span>
                          <span className="ml-2 text-sm text-gray-900">
                            {item.type}
                          </span>
                        </div>

                        {item.imageName && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">
                              Image Name:
                            </span>
                            <span className="ml-2 text-sm text-gray-900">
                              {item.imageName}
                            </span>
                          </div>
                        )}

                        <div>
                          <span className="text-sm font-medium text-gray-500">
                            Image Data:
                          </span>
                          <span className="ml-2 text-sm text-gray-900">
                            {item.imageData
                              ? `${item.imageData.substring(0, 50)}... (${item.imageData.length} chars)`
                              : "❌ Відсутнє"}
                          </span>
                        </div>

                        <div>
                          <span className="text-sm font-medium text-gray-500">
                            Properties:
                          </span>
                          <pre className="mt-1 overflow-x-auto rounded bg-gray-100 p-2 text-xs">
                            {JSON.stringify(item.properties, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>

                    {/* Правий стовпець - картинка */}
                    <div className="flex items-center justify-center">
                      {item.imageData ? (
                        <div>
                          <img
                            src={item.imageData}
                            alt={item.name}
                            className="max-h-64 max-w-full rounded-lg border border-gray-300 object-contain"
                            onError={(e) => {
                              console.error("Image error for:", item.name);
                              e.currentTarget.src = "";
                              e.currentTarget.alt = "❌ Помилка завантаження";
                            }}
                          />
                          <p className="mt-2 text-center text-xs text-gray-500">
                            Preview
                          </p>
                        </div>
                      ) : (
                        <div className="flex h-64 w-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
                          <p className="text-gray-400">Немає картинки</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-white p-8 text-center shadow">
              <p className="text-gray-600">❌ Немає обладнання в базі даних</p>
              <p className="mt-2 text-sm text-gray-500">
                Додайте записи через Prisma Studio або SQL
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
