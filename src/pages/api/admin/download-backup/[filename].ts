import type { NextApiRequest, NextApiResponse } from "next";
import { readFile, stat } from "fs/promises";
import path from "path";
import { requireAdminApi } from "@/lib/api-admin-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Тільки GET метод
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Перевірка admin авторизації
  const admin = await requireAdminApi(req, res);
  if (!admin) return; // Response already sent by requireAdminApi

  try {
    const { filename } = req.query;

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

    // Читаємо файл
    const fileBuffer = await readFile(filePath);

    // Встановлюємо заголовки для завантаження
    res.setHeader("Content-Type", "application/sql");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", fileBuffer.length);

    // Відправляємо файл
    return res.status(200).send(fileBuffer);
  } catch (error) {
    console.error("Download backup error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
