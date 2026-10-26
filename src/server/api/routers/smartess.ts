import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { Smartessapi } from "@/server/parthnersapi/smartessapi";
import { logger } from "@/logger";

/**
 * Router для работы с Smart ESS
 */
export const smartessRouter = createTRPCRouter({
  /**
   * Отримати список доступних пристроїв Smart ESS
   */
  getDevices: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      logger.info(`Getting Smart ESS devices for user ${ctx.user.id}`);

      const smartess = new Smartessapi();
      await smartess.init();

      const result = await smartess.GetESSdevices(ctx.user.id);

      if (result.err === 0 && result.dat?.device) {
        logger.info(
          `Smart ESS devices retrieved successfully for user ${ctx.user.id}`,
        );
        return {
          success: true,
          message: "Список пристроїв успішно отримано",
          devices: result.dat.device,
        };
      } else {
        logger.error(
          `Smart ESS GetDevices failed for user ${ctx.user.id}:`,
          result,
        );
        return {
          success: false,
          message:
            "Не вдалося отримати список пристроїв. Перевірте облікові дані.",
          devices: [],
        };
      }
    } catch (error) {
      logger.error(
        `Smart ESS GetDevices error for user ${ctx.user.id}:`,
        error,
      );
      return {
        success: false,
        message:
          "Помилка при отриманні списку пристроїв: " +
          (error instanceof Error ? error.message : "Невідома помилка"),
        devices: [],
      };
    }
  }),

  /**
   * Виклик Discovery для налаштування інвертора
   */
  discovery: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      logger.info(`Starting Smart ESS Discovery for user ${ctx.user.id}`);

      const smartess = new Smartessapi();
      await smartess.init();

      const result = await smartess.Discovery(ctx.user.id);

      if (result) {
        logger.info(`Smart ESS Discovery successful for user ${ctx.user.id}`);
        return {
          success: true,
          message: "Інвертор успішно налаштовано",
        };
      } else {
        logger.error(`Smart ESS Discovery failed for user ${ctx.user.id}`);
        return {
          success: false,
          message:
            "Не вдалося налаштувати інвертор. Перевірте Device ID та облікові дані.",
        };
      }
    } catch (error) {
      logger.error(`Smart ESS Discovery error for user ${ctx.user.id}:`, error);
      return {
        success: false,
        message:
          "Помилка при налаштуванні інвертора: " +
          (error instanceof Error ? error.message : "Невідома помилка"),
      };
    }
  }),

  /**
   * Отримати дані про сонячну генерацію за вказану дату
   */
  getPvChart: protectedProcedure
    .input(
      z.object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        logger.info(
          `Getting PV chart for user ${ctx.user.id}, date: ${input.date}`,
        );

        const smartess = new Smartessapi();
        await smartess.init();

        const result = await smartess.GetPvChart(ctx.user.id, input.date);

        if (result) {
          logger.info(
            `PV chart data retrieved successfully for user ${ctx.user.id}`,
          );
          return {
            success: true,
            message: "Дані про генерацію успішно оновлено",
            data: result,
          };
        } else {
          logger.warn(
            `No PV chart data for user ${ctx.user.id}, date: ${input.date}`,
          );
          return {
            success: false,
            message: "Немає даних про генерацію за вказану дату",
            data: null,
          };
        }
      } catch (error) {
        logger.error(`PV chart error for user ${ctx.user.id}:`, error);
        return {
          success: false,
          message:
            "Помилка отримання даних: " +
            (error instanceof Error ? error.message : "Невідома помилка"),
          data: null,
        };
      }
    }),
});
