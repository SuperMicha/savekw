import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { SmartLifeAPI } from "@/server/parthnersapi/smartlifeapi";

/**
 * Router для работы с Smart Life API
 */
export const smartlifeRouter = createTRPCRouter({
  /**
   * Аутентификация в Smart Life и получение токена
   * Ограничение: не чаще 1 раза в 180 секунд
   */
  auth: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const smartlife = new SmartLifeAPI();
      const result = await smartlife.SmartLifeAuth(ctx.user.id);

      if (!result) {
        return {
          success: false,
          message:
            "Не вдалося отримати дані від Smart Life. Перевірте налаштування.",
        };
      }

      // Перевірка на помилки в відповіді
      if (result.responseStatus === "error" || !result.access_token) {
        return {
          success: false,
          message:
            "Невірне ім'я користувача або пароль. Перевірте введені дані.",
        };
      }

      return {
        success: true,
        message: "Підключення до Smart Life успішно налаштовано!",
      };
    } catch (error) {
      console.error("SmartLife auth error:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Невідома помилка при підключенні до Smart Life",
      };
    }
  }),

  /**
   * Керування пристроєм Smart Life (увімкнути/вимкнути)
   */
  switchControl: protectedProcedure
    .input(
      z.object({
        state: z.number().min(0).max(1), // 0 = вимкнути, 1 = увімкнути
        device_id: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const smartlife = new SmartLifeAPI();
        const result = await smartlife.SwitchControl(
          ctx.user.id,
          input.state,
          input.device_id,
        );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error("SmartLife switchControl error:", error);
        return {
          success: false,
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "Невідома помилка при керуванні пристроєм",
        };
      }
    }),
});
