import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { EnsureUserProfile } from "@/server/databaseapi";

/**
 * Router для работы с UserProperties
 * Универсальный API для хранения любых настроек пользователя в формате key-value
 */
export const propertiesRouter = createTRPCRouter({
  /**
   * Получить значение свойства по ключу
   */
  get: protectedProcedure
    .input(
      z.object({
        property: z.string().min(1, "Property key is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const property = await ctx.db.userProperties.findUnique({
        where: {
          userId_property: {
            userId: ctx.user.id,
            property: input.property,
          },
        },
        select: {
          value: true,
          updatedAt: true,
        },
      });

      return {
        property: input.property,
        value: property?.value ?? null,
        updatedAt: property?.updatedAt ?? null,
      };
    }),

  /**
   * Получить все свойства пользователя
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const properties = await ctx.db.userProperties.findMany({
      where: {
        userId: ctx.user.id,
      },
      orderBy: {
        property: "asc",
      },
    });

    return properties.map((prop) => ({
      property: prop.property,
      value: prop.value,
    }));
  }),

  /**
   * Установить значение свойства (создать или обновить)
   */
  set: protectedProcedure
    .input(
      z.object({
        property: z.string().min(1, "Property key is required"),
        value: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Валидация: проверяем что value - валидный JSON если это ожидается
      try {
        // Пытаемся распарсить как JSON для проверки валидности
        if (
          input.value.trim().startsWith("{") ||
          input.value.trim().startsWith("[")
        ) {
          JSON.parse(input.value);
        }
      } catch {
        throw new Error("Invalid JSON format in value");
      }

      const property = await ctx.db.userProperties.upsert({
        where: {
          userId_property: {
            userId: ctx.user.id,
            property: input.property,
          },
        },
        create: {
          userId: ctx.user.id,
          property: input.property,
          value: input.value,
        },
        update: {
          value: input.value,
        },
      });

      return {
        success: true,
        property: property.property,
        value: property.value,
      };
    }),

  /**
   * Удалить свойство
   */
  delete: protectedProcedure
    .input(
      z.object({
        property: z.string().min(1, "Property key is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.userProperties.delete({
        where: {
          userId_property: {
            userId: ctx.user.id,
            property: input.property,
          },
        },
      });

      return {
        success: true,
        property: input.property,
      };
    }),

  /**
   * ⚠️ DEPRECATED - Залишено для сумісності
   *
   * Профіль тепер створюється через EnsureUserProfile
   * при першому логіні користувача
   */
  initProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "User name is required"),
      }),
    )
    .mutation(async () => {
      return {
        success: true,
        message: "User profile is created automatically on first login",
      };
    }),

  /**
   * Ініціалізує профіль нового користувача при першому sign in
   * Перевіряє чи це новий користувач (немає contract) і створює properties за замовчуванням
   */
  ensureUserProfile: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await EnsureUserProfile(ctx.user.id, ctx.user.email ?? "");
    return {
      success: true,
      isNewUser: result.isNewUser,
    };
  }),
});
