import type { GetServerSidePropsContext } from "next";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { db } from "@/server/db";

/**
 * Перевіряє чи користувач є admin
 * Використовується в getServerSideProps для захисту admin сторінок
 */
export async function requireAdmin(context: GetServerSidePropsContext) {
  // Створюємо server-side Supabase client з cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return context.req.cookies[name];
        },
        set(name: string, value: string, options: CookieOptions) {
          context.res.setHeader(
            "Set-Cookie",
            `${name}=${value}; Path=/; ${options.maxAge ? `Max-Age=${options.maxAge};` : ""} ${options.httpOnly ? "HttpOnly;" : ""} ${options.secure ? "Secure;" : ""} ${options.sameSite ? `SameSite=${options.sameSite};` : ""}`,
          );
        },
        remove(name: string, options: CookieOptions) {
          context.res.setHeader(
            "Set-Cookie",
            `${name}=; Path=/; Max-Age=0; ${options.httpOnly ? "HttpOnly;" : ""} ${options.secure ? "Secure;" : ""} ${options.sameSite ? `SameSite=${options.sameSite};` : ""}`,
          );
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Якщо користувач не авторизований - редірект на signin
  if (!session?.user) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
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
    return {
      redirect: {
        destination: "/auth/signin?error=blocked",
        permanent: false,
      },
    };
  }

  // Якщо користувач НЕ admin - показуємо помилку
  if (!user?.isAdmin) {
    return {
      props: {
        error:
          "У вас немає прав доступу до цієї сторінки. Тільки адміністратори можуть переглядати цю сторінку.",
        user: session.user,
      },
    };
  }

  // Все ОК - користувач є admin
  return {
    props: {
      user: session.user,
      isAdmin: true,
    },
  };
}
