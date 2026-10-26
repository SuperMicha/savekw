import { useEffect } from "react";
import { useRouter } from "next/router";
import type { ComponentType } from "react";
import { useAuth } from "@/lib/auth-context";

/**
 * Higher Order Component для защиты страниц
 * Автоматически редиректит на страницу логина если пользователь не залогинен
 */
export function withAuth<P extends object>(Component: ComponentType<P>) {
  return function ProtectedRoute(props: P) {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
      if (!loading && !user) {
        void router.push("/auth/signin");
      }
    }, [user, loading, router]);

    // Показываем ничего пока проверяется аутентификация
    if (loading || !user) {
      return null;
    }

    // Рендерим компонент если пользователь залогинен
    return <Component {...props} />;
  };
}
