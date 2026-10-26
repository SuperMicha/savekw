import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import Layout from "@/components/Layout";

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const supabase: SupabaseClient = createClient();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase автоматично обробить callback через getSession
        // якщо в URL є код підтвердження
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Error getting session:", sessionError);
          setError("Помилка підтвердження email");
          setTimeout(() => {
            void router.push("/auth/signin?error=confirmation_failed");
          }, 2000);
        } else if (session) {
          // Сесія успішно створена
          setTimeout(() => {
            void router.push("/");
          }, 1000);
        } else {
          // Немає сесії - можливо посилання застаріле
          setError("Посилання підтвердження застаріле або недійсне");
          setTimeout(() => {
            void router.push("/auth/signin");
          }, 2000);
        }
      } catch (err) {
        console.error("Callback error:", err);
        setError("Сталася помилка");
        setTimeout(() => {
          void router.push("/auth/signin");
        }, 2000);
      }
    };

    // Чекаємо поки router буде готовий
    if (router.isReady) {
      void handleCallback();
    }
  }, [router, supabase.auth]);

  return (
    <Layout>
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center">
          {error ? (
            <>
              <div className="mb-4 text-red-500">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-xl text-gray-900">{error}</p>
              <p className="mt-2 text-sm text-gray-600">Перенаправлення...</p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
              <p className="text-xl text-gray-900">Підтвердження email...</p>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
