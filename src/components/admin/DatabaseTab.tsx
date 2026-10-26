import { useState, useEffect } from "react";

type Backup = {
  filename: string;
  size: string;
  date: string;
  timestamp: number;
};

export function DatabaseTab() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Завантажити список бекапів
  const loadBackups = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/list-backups");
      const data = (await response.json()) as {
        backups?: Backup[];
        error?: string;
      };

      if (response.ok && data.backups) {
        setBackups(data.backups);
      } else {
        setMessage({
          type: "error",
          text: `Помилка: ${data.error ?? "Unknown error"}`,
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: `Помилка: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Завантажити при монтуванні
  useEffect(() => {
    void loadBackups();
  }, []);

  // Створити новий бекап
  const handleCreateBackup = async () => {
    if (isCreatingBackup) return;

    const confirmed = confirm(
      "Створити бекап бази даних?\n\nЦе може зайняти 10-30 секунд залежно від розміру БД."
    );

    if (!confirmed) return;

    setIsCreatingBackup(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/backup-db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        filename?: string;
        size?: string;
        error?: string;
      };

      if (response.ok && data.success) {
        setMessage({
          type: "success",
          text: `✅ Бекап створено: ${data.filename ?? "unknown"} (${data.size ?? "unknown"})`,
        });
        // Оновити список бекапів
        await loadBackups();
      } else {
        setMessage({
          type: "error",
          text: `❌ Помилка: ${data.error ?? "Unknown error"}`,
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: `❌ Помилка: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsCreatingBackup(false);
      setTimeout(() => setMessage(null), 10000);
    }
  };

  // Завантажити бекап
  const handleDownloadBackup = (filename: string) => {
    window.open(`/api/admin/download-backup/${filename}`, "_blank");
  };

  // Відновити бекап на production
  const handleRestoreBackup = async (filename: string) => {
    if (isRestoring) return;

    const confirmed = confirm(
      `⚠️ УВАГА! Відновлення бази даних!\n\n` +
      `Це ЗАМІНИТЬ всі поточні дані на дані з бекапу:\n` +
      `${filename}\n\n` +
      `Перед відновленням буде створено safety backup.\n\n` +
      `Ви впевнені?`
    );

    if (!confirmed) return;

    // Подвійне підтвердження для безпеки
    const doubleConfirm = confirm(
      `🔴 ОСТАННЄ ПОПЕРЕДЖЕННЯ!\n\n` +
      `Ви збираєтесь ВІДНОВИТИ базу даних на PRODUCTION!\n\n` +
      `Натисніть OK щоб продовжити.`
    );

    if (!doubleConfirm) return;

    setIsRestoring(filename);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/restore-db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };

      if (response.ok && data.success) {
        setMessage({
          type: "success",
          text: `✅ База даних відновлена з ${filename}`,
        });
        // Оновити список бекапів (там може бути новий safety backup)
        await loadBackups();
      } else {
        setMessage({
          type: "error",
          text: `❌ Помилка відновлення: ${data.error ?? "Unknown error"}`,
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: `❌ Помилка: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsRestoring(null);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {message && (
        <div
          className={`rounded-lg border p-4 ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Header with button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          💾 Бекапи бази даних
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isCreatingBackup ? "⏳ Створюємо..." : "➕ Створити бекап"}
          </button>
          <button
            onClick={() => void loadBackups()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            🔄 Оновити
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
        <p className="text-sm">
          <strong>Інфо:</strong> Бекапи автоматично створюються щодня о 3:00 ночі.
          Зберігаються останні 10 бекапів. Папка на сервері:{" "}
          <code className="rounded bg-blue-100 px-1 py-0.5">
            /root/savekw2/backups/
          </code>
        </p>
      </div>

      {/* Backups List */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            📋 Доступні бекапи ({backups.length})
          </h3>
        </div>

        {backups.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p className="mb-2 text-lg">Немає бекапів</p>
            <p className="text-sm">Створіть перший бекап натиснувши кнопку вище</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {backups.map((backup) => (
              <div
                key={backup.filename}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{backup.filename}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    📅 {backup.date} • 📦 {backup.size}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadBackup(backup.filename)}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    ⬇️ Завантажити
                  </button>
                  <button
                    onClick={() => void handleRestoreBackup(backup.filename)}
                    disabled={isRestoring !== null}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
                  >
                    {isRestoring === backup.filename ? "⏳ Відновлення..." : "♻️ Відновити"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-3 text-lg font-semibold text-gray-900">
          📚 Інструкції
        </h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="font-medium text-gray-900">⬇️ Завантажити на локальну машину:</p>
            <p className="mt-1">Натисніть "Завантажити" і використайте скрипт для відновлення:</p>
            <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-2 text-xs">
              {`scripts/restore-local-db.ps1 -BackupFile "backup.sql"`}
            </pre>
          </div>
          <div className="rounded-lg bg-orange-50 p-3">
            <p className="font-medium text-orange-900">♻️ Відновити на Production:</p>
            <p className="mt-1 text-orange-800">
              Натисніть "Відновити" щоб замінити поточну базу даних на обрану версію.
              <br/>
              <strong>⚠️ Увага:</strong> Перед відновленням автоматично створюється safety backup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
