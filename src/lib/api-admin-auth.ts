import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { db } from "@/server/db";

/**
 * Перевіряє чи користувач є admin в API route
 * Повертає user id якщо все ОК, або null якщо не авторизований
 */
export async function requireAdminApi(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ userId: string; isAdmin: true } | null> {
  try {
    // Парсимо cookies з request (manually, without external library)
    const cookieHeader = req.headers.cookie || "";
    const cookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((cookie) => {
      const [name, ...rest] = cookie.trim().split("=");
      if (name) {
        cookies[name] = decodeURIComponent(rest.join("="));
      }
    });

    // Створюємо server-side Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookies[name];
          },
          set(name: string, value: string, options: CookieOptions) {
            res.setHeader(
              "Set-Cookie",
              `${name}=${value}; Path=/; ${options.maxAge ? `Max-Age=${options.maxAge};` : ""} ${options.httpOnly ? "HttpOnly;" : ""} ${options.secure ? "Secure;" : ""} ${options.sameSite ? `SameSite=${options.sameSite};` : ""}`
            );
          },
          remove(name: string, options: CookieOptions) {
            res.setHeader(
              "Set-Cookie",
              `${name}=; Path=/; Max-Age=0; ${options.httpOnly ? "HttpOnly;" : ""} ${options.secure ? "Secure;" : ""} ${options.sameSite ? `SameSite=${options.sameSite};` : ""}`
            );
          },
        },
      }
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Якщо користувач не авторизований
    if (!session?.user) {
      res.status(401).json({ error: "Unauthorized - please login" });
      return null;
    }

    // Перевіряємо чи користувач є admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        isAdmin: true,
        isBlocked: true,
      },
    });

    // Якщо користувач заблокований
    if (user?.isBlocked) {
      res.status(403).json({ error: "User is blocked" });
      return null;
    }

    // Якщо користувач НЕ admin
    if (!user?.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return null;
    }

    // Все ОК - користувач є admin
    return { userId: session.user.id, isAdmin: true };
  } catch (error) {
    console.error("Admin auth error:", error);
    res.status(500).json({ error: "Authentication error" });
    return null;
  }
}
