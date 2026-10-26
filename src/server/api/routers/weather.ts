import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { WeatherService } from "@/server/parthnersapi/wetherapi";
import { logger } from "@/logger";

/**
 * Router для роботи з погодою
 */
export const weatherRouter = createTRPCRouter({
  /**
   * Оновлює прогноз погоди для поточного користувача
   */
  updateForecast: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const weatherService = new WeatherService();
      await weatherService.init();
      await weatherService.GetUserWeather(ctx.user.id);

      return {
        success: true,
        message: "Прогноз погоди успішно оновлено",
      };
    } catch (error) {
      logger.error("❌ Error updating weather forecast:", error);
      throw new Error("Не вдалося оновити прогноз погоди. Спробуйте пізніше.");
    }
  }),
});
