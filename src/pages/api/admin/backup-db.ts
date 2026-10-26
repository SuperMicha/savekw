import type { NextApiRequest, NextApiResponse } from "next";
import { exec } from "child_process";
import { promisify } from "util";
import { mkdir } from "fs/promises";
import path from "path";
import { requireAdminApi } from "@/lib/api-admin-auth";

const execAsync = promisify(exec);

type BackupResponse = {
  success?: boolean;
  message?: string;
  filename?: string;
  size?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BackupResponse>
) {
  // Тільки POST метод
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Перевірка admin авторизації
  const admin = await requireAdminApi(req, res);
  if (!admin) return; // Response already sent by requireAdminApi

  try {
    console.log(`Starting database backup... (by admin: ${admin.userId})`);

    const backupDir = "/root/savekw2/backups";
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z/, "")
      .replace("T", "-")
      .slice(0, 15);
    const filename = `backup-prod-${timestamp}.sql`;
    const backupPath = path.join(backupDir, filename);

    // Створюємо директорію якщо не існує
    await mkdir(backupDir, { recursive: true });

    // Отримуємо DATABASE_URL і парсимо параметри підключення
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL not configured");
    }

    // Використовуємо pg_dump напряму (PostgreSQL client встановлений в Docker образі)
    const { stdout, stderr } = await execAsync(
      `pg_dump "${databaseUrl}" > "${backupPath}"`
    );

    if (stderr) console.error("Backup stderr:", stderr);
    console.log("Backup completed:", backupPath);

    // Отримуємо розмір файлу
    const { stdout: sizeOutput } = await execAsync(`du -h "${backupPath}"`);
    const size = sizeOutput.split("\t")[0]?.trim() || "Unknown";

    // Створюємо symlink на latest
    await execAsync(
      `ln -sf "${filename}" "${path.join(backupDir, "backup-prod-latest.sql")}"`
    );

    // Видаляємо старі бекапи (залишаємо останні 10)
    await execAsync(
      `cd "${backupDir}" && ls -t backup-prod-*.sql | grep -v "backup-prod-latest.sql" | tail -n +11 | xargs -r rm || true`
    );

    return res.status(200).json({
      success: true,
      message: "Database backup created successfully",
      filename,
      size,
    });
  } catch (error) {
    console.error("Backup error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
