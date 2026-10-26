import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

/**
 * Router для работы с Equipment (справочник оборудования)
 */
export const equipmentRouter = createTRPCRouter({
  /**
   * Получить все оборудование
   */
  getAll: publicProcedure.query(async ({ ctx }) => {
    const equipment = await ctx.db.equipment.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return equipment;
  }),

  /**
   * Получить оборудование по ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const equipment = await ctx.db.equipment.findUnique({
        where: { id: input.id },
      });

      return equipment;
    }),

  /**
   * Получить оборудование по нескольким ID
   */
  getByIds: publicProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      const equipment = await ctx.db.equipment.findMany({
        where: {
          id: {
            in: input.ids,
          },
        },
      });

      return equipment;
    }),
});
