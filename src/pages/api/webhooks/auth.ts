import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { logger } from "@/logger";
import { setUserProperty } from "@/server/databaseapi";

/**
 * Webhook для синхронізації користувачів з Supabase Auth
 *
 * Цей endpoint викликається Supabase при змінах в таблиці auth.users
 * і синхронізує користувачів з локальною базою даних.
 *
 * Підтримувані події:
 * - INSERT: створення нового користувача
 * - UPDATE: оновлення даних користувача
 * - DELETE: видалення користувача
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { type, record, old_record } = req.body;

    // Для DELETE події використовується old_record замість record
    const data = type === "DELETE" ? old_record : record;

    logger.info(`[User Sync Webhook] Event: ${type}`, {
      userId: data?.id,
      email: data?.email,
    });

    if (!type || !data) {
      return res.status(400).json({ error: "Missing type or data" });
    }

    if (type === "INSERT") {
      // Новий користувач був створений в Supabase Auth
      const user = await prisma.user.upsert({
        where: { id: data.id },
        update: {},
        create: {
          id: data.id,
          email: data.email,
          emailConfirmedAt: data.email_confirmed_at
            ? new Date(data.email_confirmed_at)
            : null,
        },
      });

      // Зберігаємо ім'я користувача з raw_user_meta_data
      if (data.raw_user_meta_data?.name) {
        await setUserProperty(
          data.id,
          "user_name",
          data.raw_user_meta_data.name,
        );
        logger.info(`✅ User name saved: ${data.raw_user_meta_data.name}`, {
          userId: user.id,
        });
      }

      logger.info(`✅ User created in local DB: ${user.email}`, {
        userId: user.id,
      });
      return res
        .status(200)
        .json({ success: true, message: "User created", userId: user.id });
    }

    if (type === "UPDATE") {
      // Користувач був оновлений в Supabase Auth
      const user = await prisma.user.update({
        where: { id: data.id },
        data: {
          email: data.email,
          emailConfirmedAt: data.email_confirmed_at
            ? new Date(data.email_confirmed_at)
            : null,
        },
      });

      // Оновлюємо ім'я користувача якщо воно змінилося
      if (data.raw_user_meta_data?.name) {
        await setUserProperty(
          data.id,
          "user_name",
          data.raw_user_meta_data.name,
        );
        logger.info(`✅ User name updated: ${data.raw_user_meta_data.name}`, {
          userId: user.id,
        });
      }

      logger.info(`✅ User updated in local DB: ${user.email}`, {
        userId: user.id,
      });
      return res
        .status(200)
        .json({ success: true, message: "User updated", userId: user.id });
    }

    if (type === "DELETE") {
      // Користувач був видалений в Supabase Auth
      const user = await prisma.user.delete({
        where: { id: data.id },
      });

      logger.info(`✅ User deleted from local DB: ${user.email}`, {
        userId: user.id,
      });
      return res
        .status(200)
        .json({ success: true, message: "User deleted", userId: user.id });
    }

    logger.warn(`[User Sync Webhook] Unknown event type: ${type}`);
    return res.status(400).json({ error: "Unknown event type" });
  } catch (error) {
    logger.error("[User Sync Webhook Error]:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
