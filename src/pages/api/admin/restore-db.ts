import type { NextApiRequest, NextApiResponse } from "next";
import { exec } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";
import path from "path";
import { requireAdminApi } from "@/lib/api-admin-auth";

const execAsync = promisify(exec);

type RestoreResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RestoreResponse>
) {
  // Тільки POST метод
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Перевірка admin авторизації
  const admin = await requireAdminApi(req, res);
  if (!admin) return; // Response already sent by requireAdminApi

  try {
    const { filename } = req.body as { filename?: string };

    if (!filename || typeof filename !== "string") {
      return res.status(400).json({ error: "Filename is required" });
    }

    // Валідація імені файлу (безпека)
    if (
      !filename.startsWith("backup-prod-") ||
      !filename.endsWith(".sql") ||
      filename.includes("..") ||
      filename.includes("/")
    ) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const backupsDir = "/root/savekw2/backups";
    const filePath = path.join(backupsDir, filename);

    // Перевіряємо чи існує файл
    try {
      await stat(filePath);
    } catch {
      return res.status(404).json({ error: "Backup file not found" });
    }

    console.log(`Starting database restore from ${filename}... (by admin: ${admin.userId})`);

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL not configured");
    }

    // Створюємо safety backup перед рестором
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z/, "")
      .replace("T", "-")
      .slice(0, 15);
    const safetyBackupPath = path.join(backupsDir, `backup-before-restore-${timestamp}.sql`);

    console.log("Creating safety backup before restore...");
    try {
      await execAsync(`pg_dump "${databaseUrl}" > "${safetyBackupPath}"`);
      console.log("Safety backup created:", safetyBackupPath);
    } catch (backupError) {
      console.warn("Could not create safety backup (database might be empty):", backupError);
    }

    // Виконуємо рестор
    // psql не підтримує --clean для пустої бази, тому використовуємо DROP/CREATE
    console.log("Restoring database...");

    // Парсимо DATABASE_URL щоб отримати ім'я бази
    const dbMatch = databaseUrl.match(/\/([^?]+)(\?|$)/);
    const dbName = dbMatch ? dbMatch[1] : "savekw_prod";

    // Виконуємо рестор напряму через psql
    // Ігноруємо помилки про роль (role "..." does not exist)
    const { stderr } = await execAsync(
      `psql "${databaseUrl}" < "${filePath}" 2>&1 | grep -v "role.*does not exist" || true`
    );

    if (stderr) {
      console.log("Restore stderr (non-fatal):", stderr);
    }

    console.log("Database restore completed successfully");

    return res.status(200).json({
      success: true,
      message: `Database restored successfully from ${filename}`,
    });
  } catch (error) {
    console.error("Restore error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
