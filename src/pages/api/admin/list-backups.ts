import type { NextApiRequest, NextApiResponse } from "next";
import { readdir, stat } from "fs/promises";
import path from "path";
import { requireAdminApi } from "@/lib/api-admin-auth";

type Backup = {
  filename: string;
  size: string;
  date: string;
  timestamp: number;
};

type BackupsResponse = {
  backups?: Backup[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BackupsResponse>
) {
  // Тільки GET метод
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Перевірка admin авторизації
  const admin = await requireAdminApi(req, res);
  if (!admin) return; // Response already sent by requireAdminApi

  try {
    const backupsDir = "/root/savekw2/backups";

    // Читаємо всі файли в директорії
    const files = await readdir(backupsDir);

    // Фільтруємо тільки SQL бекапи (не symlink)
    const backupFiles = files.filter(
      (file) =>
        file.startsWith("backup-prod-") &&
        file.endsWith(".sql") &&
        file !== "backup-prod-latest.sql"
    );

    // Отримуємо інформацію про кожен файл
    const backups: Backup[] = await Promise.all(
      backupFiles.map(async (filename) => {
        const filePath = path.join(backupsDir, filename);
        const stats = await stat(filePath);

        // Форматуємо розмір
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        const size = `${sizeInMB} MB`;

        // Парсимо дату з імені файлу (backup-prod-20231130-143000.sql)
        const dateMatch = filename.match(/(\d{8})-(\d{6})/);
        let date = "Unknown";
        let timestamp = stats.mtimeMs;

        if (dateMatch && dateMatch[1] && dateMatch[2]) {
          const dateStr = dateMatch[1]; // 20231130
          const timeStr = dateMatch[2]; // 143000
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          const hour = timeStr.substring(0, 2);
          const minute = timeStr.substring(2, 4);
          const second = timeStr.substring(4, 6);

          date = `${day}.${month}.${year} ${hour}:${minute}:${second}`;
          timestamp = new Date(
            `${year}-${month}-${day}T${hour}:${minute}:${second}`
          ).getTime();
        }

        return {
          filename,
          size,
          date,
          timestamp,
        };
      })
    );

    // Сортуємо за датою (новіші спочатку)
    backups.sort((a, b) => b.timestamp - a.timestamp);

    return res.status(200).json({ backups });
  } catch (error) {
    console.error("List backups error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
