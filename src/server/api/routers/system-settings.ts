import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

/**
 * System Settings Router
 *
 * Керує системними налаштуваннями (key-value store)
 * Всі значення зберігаються як JSON strings
 */
export const systemSettingsRouter = createTRPCRouter({
  /**
   * Отримати значення налаштування за ключем
   * Тільки для авторизованих користувачів
   */
  get: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const setting = await ctx.db.systemSettings.findUnique({
        where: { key: input.key },
      });

      if (!setting) {
        return null;
      }

      // Парсимо JSON якщо можливо
      try {
        return {
          key: setting.key,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          value: JSON.parse(setting.value),
          updatedAt: setting.updatedAt,
        };
      } catch {
        // Якщо не JSON, повертаємо як є
        return {
          key: setting.key,
          value: setting.value,
          updatedAt: setting.updatedAt,
        };
      }
    }),

  /**
   * Отримати всі ключі налаштувань
   * Тільки для авторизованих користувачів
   */
  getAllKeys: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.systemSettings.findMany({
      select: {
        key: true,
      },
      orderBy: { key: "asc" },
    });

    return settings.map((s: { key: string }) => s.key);
  }),

  /**
   * Створити або оновити налаштування
   * Тільки для авторизованих користувачів
   */
  set: protectedProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.union([z.string(), z.record(z.any()), z.array(z.any())]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Конвертуємо value в JSON string якщо це об'єкт
      const valueString =
        typeof input.value === "string"
          ? input.value
          : JSON.stringify(input.value);

      return await ctx.db.systemSettings.upsert({
        where: { key: input.key },
        create: {
          key: input.key,
          value: valueString,
        },
        update: {
          value: valueString,
        },
      });
    }),

  /**
   * Видалити налаштування
   * Тільки для авторизованих користувачів
   */
  delete: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.systemSettings.delete({
        where: { key: input.key },
      });
    }),
});
