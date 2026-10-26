import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createAdminClient } from "@/lib/supabase";

/**
 * Admin router - тільки для користувачів з isAdmin = true
 */

// Middleware для перевірки admin прав
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.user.id },
    select: { isAdmin: true, isBlocked: true },
  });

  if (user?.isBlocked) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Ваш акаунт заблокований",
    });
  }

  if (!user?.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Доступ тільки для адміністраторів",
    });
  }

  return next({ ctx });
});

export const adminRouter = createTRPCRouter({
  /**
   * КОРИСТУВАЧІ
   */

  // Отримати список користувачів з пагінацією
  getUsers: adminProcedure
    .input(
      z.object({
        page: z.number().min(0).default(0),
        limit: z.number().min(1).max(100).default(50),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = input.page * input.limit;

      const where = input.search
        ? {
            email: { contains: input.search, mode: "insensitive" as const },
          }
        : {};

      const [users, total] = await Promise.all([
        ctx.db.user.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            emailConfirmedAt: true,
            createdAt: true,
            lastLoginAt: true,
            isAdmin: true,
            isBlocked: true,
          },
        }),
        ctx.db.user.count({ where }),
      ]);

      // Отримуємо user_name та phone_number з UserProperties
      const usersWithProperties = await Promise.all(
        users.map(async (user) => {
          const properties = await ctx.db.userProperties.findMany({
            where: {
              userId: user.id,
              property: { in: ["user_name", "phone_number"] },
            },
            select: { property: true, value: true },
          });

          const propsMap = Object.fromEntries(
            properties.map((p) => [p.property, p.value]),
          );

          return {
            ...user,
            name: propsMap.user_name || "",
            phoneNumber: propsMap.phone_number || "",
          };
        }),
      );

      return {
        users: usersWithProperties,
        total,
        hasMore: skip + users.length < total,
      };
    }),

  // Оновити користувача
  updateUser: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        name: z.string().optional(),
        phoneNumber: z.string().optional(),
        isAdmin: z.boolean().optional(),
        isBlocked: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, name, phoneNumber, isAdmin, isBlocked } = input;

      // Оновлюємо User таблицю
      if (isAdmin !== undefined || isBlocked !== undefined) {
        await ctx.db.user.update({
          where: { id: userId },
          data: {
            ...(isAdmin !== undefined && { isAdmin }),
            ...(isBlocked !== undefined && { isBlocked }),
          },
        });
      }

      // Оновлюємо UserProperties
      if (name !== undefined) {
        await ctx.db.userProperties.upsert({
          where: {
            userId_property: {
              userId,
              property: "user_name",
            },
          },
          update: { value: name },
          create: {
            userId,
            property: "user_name",
            value: name,
          },
        });
      }

      if (phoneNumber !== undefined) {
        await ctx.db.userProperties.upsert({
          where: {
            userId_property: {
              userId,
              property: "phone_number",
            },
          },
          update: { value: phoneNumber },
          create: {
            userId,
            property: "phone_number",
            value: phoneNumber,
          },
        });
      }

      return { success: true };
    }),

  // Видалити користувача
  deleteUser: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Не можна видалити себе
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Не можна видалити власний акаунт",
        });
      }

      try {
        // Отримуємо користувача перед видаленням для логування
        const userToDelete = await ctx.db.user.findUnique({
          where: { id: input.userId },
          select: { email: true },
        });

        if (!userToDelete) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Користувача не знайдено",
          });
        }

        // Видаляємо з Supabase Auth
        const supabaseAdmin = createAdminClient();
        const { error: supabaseError } =
          await supabaseAdmin.auth.admin.deleteUser(input.userId);

        if (supabaseError) {
          console.error("Supabase delete error:", supabaseError);
          // Продовжуємо з видаленням з БД навіть якщо Supabase дав помилку
          // Можливо користувач вже був видалений з Supabase
        }

        // Видаляємо всі properties користувача з БД
        await ctx.db.userProperties.deleteMany({
          where: { userId: input.userId },
        });

        // Видаляємо користувача з БД
        await ctx.db.user.delete({
          where: { id: input.userId },
        });

        console.log(
          `Admin deleted user: ${userToDelete.email} (${input.userId})`,
        );

        return { success: true };
      } catch (error) {
        console.error("Delete user error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Сталася помилка при видаленні користувача",
        });
      }
    }),

  // Отримати деталі користувача (properties)
  getUserDetails: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Користувача не знайдено",
        });
      }

      const properties = await ctx.db.userProperties.findMany({
        where: { userId: input.userId },
        orderBy: { property: "asc" },
      });

      return {
        user,
        properties: properties.map((p) => ({
          property: p.property,
          value: p.value,
          updatedAt: p.updatedAt,
        })),
      };
    }),

  /**
   * СЕРВЕРНІ ДАНІ
   */

  getServerInfo: adminProcedure.query(async ({ ctx }) => {
    const { execSync } = await import("child_process");
    const os = await import("os");
    const fs = await import("fs");

    try {
      // CPU та Memory
      const cpuUsage = os.loadavg()[0]; // 1 min average
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

      // Disk usage (тільки на Linux)
      let diskInfo = { total: "N/A", used: "N/A", percent: "N/A" };
      try {
        const df = execSync("df -h / | tail -1").toString();
        const parts = df.split(/\s+/);
        diskInfo = {
          total: parts[1] ?? "N/A",
          used: parts[2] ?? "N/A",
          percent: parts[4] ?? "N/A",
        };
      } catch {
        // Windows або помилка
      }

      // Git version
      let gitVersion = "N/A";
      try {
        gitVersion = execSync("git rev-parse --short HEAD").toString().trim();
      } catch {
        // Git not available
      }

      // Uptime
      const uptime = process.uptime();
      const uptimeStr = `${Math.floor(uptime / 3600)}г ${Math.floor((uptime % 3600) / 60)}хв`;

      // Docker containers (якщо доступний)
      let dockerContainers: Array<{
        name: string;
        status: string;
        cpu: string;
        memory: string;
      }> = [];
      try {
        const containers = execSync("docker ps --format '{{json .}}'")
          .toString()
          .trim()
          .split("\n")
          .filter(Boolean);

        dockerContainers = containers.map((line) => {
          const container = JSON.parse(line) as {
            Names: string;
            Status: string;
          };
          return {
            name: container.Names,
            status: container.Status,
            cpu: "N/A",
            memory: "N/A",
          };
        });

        // Отримуємо статистику використання
        const stats = execSync("docker stats --no-stream --format '{{json .}}'")
          .toString()
          .trim()
          .split("\n")
          .filter(Boolean);

        stats.forEach((line) => {
          const stat = JSON.parse(line) as {
            Name: string;
            CPUPerc: string;
            MemUsage: string;
          };
          const container = dockerContainers.find((c) => c.name === stat.Name);
          if (container) {
            container.cpu = stat.CPUPerc;
            container.memory = stat.MemUsage;
          }
        });
      } catch {
        // Docker not available
      }

      // Database size
      const dbSize = await ctx.db.$queryRaw<Array<{ size: string }>>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `;

      // Nginx stats (якщо доступні)
      let nginxRequests = "N/A";
      let nginxErrors = "N/A";
      try {
        if (fs.existsSync("/var/log/nginx/savekw_access.log")) {
          const requests = execSync("wc -l < /var/log/nginx/savekw_access.log")
            .toString()
            .trim();
          nginxRequests = requests;
        }
        if (fs.existsSync("/var/log/nginx/savekw_error.log")) {
          const errors = execSync("wc -l < /var/log/nginx/savekw_error.log")
            .toString()
            .trim();
          nginxErrors = errors;
        }
      } catch {
        // Nginx logs not accessible
      }

      return {
        system: {
          os: `${os.type()} ${os.release()}`,
          cpuUsage: cpuUsage ? cpuUsage.toFixed(2) : "N/A",
          memoryUsage: memUsagePercent,
          memoryTotal: (totalMem / 1024 / 1024 / 1024).toFixed(1) + " GB",
          memoryUsed: (usedMem / 1024 / 1024 / 1024).toFixed(1) + " GB",
          diskUsage: diskInfo.percent,
          diskTotal: diskInfo.total,
          diskUsed: diskInfo.used,
        },
        app: {
          version: gitVersion,
          uptime: uptimeStr,
          nodeVersion: process.version,
        },
        docker: {
          containers: dockerContainers,
        },
        database: {
          size: dbSize[0]?.size ?? "N/A",
        },
        nginx: {
          totalRequests: nginxRequests,
          totalErrors: nginxErrors,
        },
      };
    } catch (err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Не вдалося отримати інформацію про сервер",
      });
    }
  }),

  /**
   * ЛОГИ АЛГОРИТМІВ
   */

  getAlgorithmLogs: adminProcedure
    .input(
      z.object({
        page: z.number().min(0).default(0),
        limit: z.number().min(1).max(100).default(50),
        algorithm: z.string().optional(),
        level: z.string().optional(),
        userId: z.string().optional(),
        userEmail: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = input.page * input.limit;

      console.log("📊 getAlgorithmLogs called with:", input);

      const where: any = {};

      if (input.algorithm) {
        where.algorithm = input.algorithm; // Точне співпадіння
      }

      if (input.level) {
        where.level = input.level;
      }

      // Якщо вказано email - шукаємо userId по email
      if (input.userEmail) {
        const user = await ctx.db.user.findUnique({
          where: { email: input.userEmail.trim().toLowerCase() },
          select: { id: true },
        });
        if (user) {
          where.userId = user.id;
        } else {
          // Якщо користувача не знайдено - повертаємо пустий результат
          return { logs: [], total: 0, hasMore: false };
        }
      } else if (input.userId) {
        where.userId = input.userId;
      }

      if (input.startDate || input.endDate) {
        where.createdAt = {};
        if (input.startDate) {
          where.createdAt.gte = new Date(input.startDate);
        }
        if (input.endDate) {
          where.createdAt.lte = new Date(input.endDate);
        }
      }

      const [logs, total] = await Promise.all([
        ctx.db.algorithmLog.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.algorithmLog.count({ where }),
      ]);

      return {
        logs,
        total,
        hasMore: skip + logs.length < total,
      };
    }),

  // Отримати унікальні алгоритми для фільтра
  getAlgorithmNames: adminProcedure.query(async ({ ctx }) => {
    // Повертаємо список з scheduler (завжди актуальний)
    const { scheduler } = await import("@/server/scheduler");
    const algorithmsInfo = await scheduler.getAlgorithmsInfo();
    return algorithmsInfo.map((alg) => alg.name);
  }),

  /**
   * ПЛАНУВАЛЬНИК
   */

  // Отримати статус планувальника та список алгоритмів
  getSchedulerStatus: adminProcedure.query(async ({ ctx }) => {
    // Імпортуємо scheduler динамічно, щоб уникнути циклічних залежностей
    const { scheduler } = await import("@/server/scheduler");

    // Забезпечити що scheduler запущено
    await scheduler.ensureStarted();

    const status = scheduler.getStatus();
    const algorithmsInfo = await scheduler.getAlgorithmsInfo();

    return {
      isRunning: status.isRunning,
      algorithms: algorithmsInfo,
    };
  }),

  // Увімкнути/вимкнути алгоритм
  toggleAlgorithm: adminProcedure
    .input(
      z.object({
        algorithmName: z.string(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { scheduler } = await import("@/server/scheduler");

      await scheduler.toggleAlgorithm(input.algorithmName, input.enabled);

      return { success: true };
    }),

  // Запустити алгоритм вручну
  runAlgorithmManually: adminProcedure
    .input(
      z.object({
        algorithmName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { scheduler } = await import("@/server/scheduler");

      await scheduler.runAlgorithmManually(input.algorithmName);

      return { success: true };
    }),

  // Оновити інтервал алгоритму
  updateAlgorithmInterval: adminProcedure
    .input(
      z.object({
        algorithmName: z.string(),
        interval: z.string(), // Формат: "10m", "1h", "30s", і т.д.
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { scheduler } = await import("@/server/scheduler");

      await scheduler.updateAlgorithmInterval(
        input.algorithmName,
        input.interval,
      );

      return { success: true };
    }),

  // Перезапуск cron jobs (застосовує нові інтервали без перезапуску сервера)
  restartCronJobs: adminProcedure.mutation(async ({ ctx }) => {
    const { scheduler } = await import("@/server/scheduler");

    await scheduler.restartCronJobs();

    return { success: true };
  }),
});
