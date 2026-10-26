import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";

/**
 * Router для работы с системными логами
 */
export const systemLogRouter = createTRPCRouter({
  /**
   * Получить системные логи
   * @param userId - опциональный фильтр по пользователю
   * @param limit - количество записей (по умолчанию 200)
   * @param skip - пропустить записей (для пагинации)
   * @param source - фильтр по источнику (User, System)
   * @param type - фильтр по типу (Change, Error)
   * @param valueName - фильтр по имени значения
   * @param sortBy - поле для сортировки
   * @param sortOrder - порядок сортировки (asc, desc)
   */
  getSysLog: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        limit: z.number().min(1).max(1000).default(200),
        skip: z.number().min(0).default(0),
        source: z.string().optional(),
        type: z.string().optional(),
        valueName: z.string().optional(),
        sortBy: z
          .enum(["dateTime", "userId", "source", "type", "valueName"])
          .default("dateTime"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        userId?: string;
        source?: string;
        type?: string;
        valueName?: string;
      } = {};

      if (input.userId) where.userId = input.userId;
      if (input.source) where.source = input.source;
      if (input.type) where.type = input.type;
      if (input.valueName) where.valueName = input.valueName;

      const [logs, total] = await Promise.all([
        ctx.db.systemLog.findMany({
          where,
          take: input.limit,
          skip: input.skip,
          orderBy: {
            [input.sortBy]: input.sortOrder,
          },
        }),
        ctx.db.systemLog.count({ where }),
      ]);

      return {
        logs,
        total,
        hasMore: input.skip + input.limit < total,
      };
    }),

  /**
   * Записать новую запись в системный лог
   */
  writeSysLog: publicProcedure
    .input(
      z.object({
        userId: z.string().nullable().optional(),
        source: z.string(),
        type: z.string(),
        valueName: z.string(),
        previousValue: z.string().nullable().optional(),
        currentValue: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const log = await ctx.db.systemLog.create({
        data: {
          userId: input.userId ?? null,
          source: input.source,
          type: input.type,
          valueName: input.valueName,
          previousValue: input.previousValue ?? null,
          currentValue: input.currentValue ?? null,
        },
      });

      return log;
    }),

  /**
   * Получить уникальные значения для фильтров
   */
  getFilterOptions: publicProcedure.query(async ({ ctx }) => {
    const [sources, types, valueNames] = await Promise.all([
      ctx.db.systemLog.findMany({
        select: { source: true },
        distinct: ["source"],
        where: { source: { not: null } },
      }),
      ctx.db.systemLog.findMany({
        select: { type: true },
        distinct: ["type"],
        where: { type: { not: null } },
      }),
      ctx.db.systemLog.findMany({
        select: { valueName: true },
        distinct: ["valueName"],
        where: { valueName: { not: null } },
      }),
    ]);

    return {
      sources: sources
        .map((s) => s.source)
        .filter((s): s is string => s !== null),
      types: types.map((t) => t.type).filter((t): t is string => t !== null),
      valueNames: valueNames
        .map((v) => v.valueName)
        .filter((v): v is string => v !== null),
    };
  }),

  /**
   * Экспорт в CSV (для админов)
   */
  exportCSV: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        source: z.string().optional(),
        type: z.string().optional(),
        valueName: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        userId?: string;
        source?: string;
        type?: string;
        valueName?: string;
      } = {};

      if (input.userId) where.userId = input.userId;
      if (input.source) where.source = input.source;
      if (input.type) where.type = input.type;
      if (input.valueName) where.valueName = input.valueName;

      const logs = await ctx.db.systemLog.findMany({
        where,
        orderBy: { dateTime: "desc" },
        take: 10000, // Ограничиваем экспорт до 10000 записей
      });

      // Формируем CSV
      const headers = [
        "ID",
        "DateTime",
        "User ID",
        "Source",
        "Type",
        "Value Name",
        "Previous Value",
        "Current Value",
      ];
      const rows = logs.map((log) => [
        log.id.toString(),
        log.dateTime.toISOString(),
        log.userId ?? "",
        log.source ?? "",
        log.type ?? "",
        log.valueName ?? "",
        log.previousValue ?? "",
        log.currentValue ?? "",
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      return csv;
    }),
});
