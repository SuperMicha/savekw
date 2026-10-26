import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import Layout from "@/components/Layout";
import { createClient } from "@/lib/supabase";

export default function ResetPassword() {
  const router = useRouter();
  const { updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  // Перевірка та обробка токену з URL
  useEffect(() => {
    const handlePasswordRecovery = async () => {
      const supabase = createClient();

      // Спочатку перевіряємо hash parameters (стандартний flow)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const type = hashParams.get("type");

      if (accessToken && type === "recovery") {
        // Токен в hash - стандартний flow
        setIsValidToken(true);
        setIsCheckingToken(false);
        return;
      }

      // Якщо немає в hash, перевіряємо чи є активна recovery session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Session error:", error);
        setError("Помилка при перевірці сесії: " + error.message);
        setIsCheckingToken(false);
        return;
      }

      if (session?.user) {
        // Є активна сесія - можна міняти пароль
        setIsValidToken(true);
        setIsCheckingToken(false);
        return;
      }

      // Немає ні токену ні сесії
      setError(
        "Недійсне посилання для скидання пароля. Можливо воно застаріло.",
      );
      setIsCheckingToken(false);
    };

    void handlePasswordRecovery();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Валідація
    if (newPassword.length < 6) {
      setError("Пароль повинен містити мінімум 6 символів");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Паролі не співпадають");
      return;
    }

    // Перевірка складності пароля
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setError("Пароль повинен містити великі та малі літери, а також цифри");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await updatePassword(newPassword);

      if (error) {
        setError("Помилка при зміні пароля: " + error.message);
      } else {
        setSuccess(true);
        // Перенаправлення через 2 секунди на головну сторінку (користувач вже авторизований)
        setTimeout(() => {
          void router.push("/");
        }, 2000);
      }
    } catch {
      setError("Сталася помилка при зміні пароля");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <Head>
          <title>Пароль змінено - SaveKW</title>
        </Head>
        <Layout>
          <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
            <div className="w-full max-w-md text-center">
              <div className="card">
                <div className="mb-4 text-emerald-500">
                  <svg
                    className="mx-auto h-16 w-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h1 className="mb-4 text-2xl font-bold text-gray-900">
                  Пароль успішно змінено!
                </h1>
                <p className="mb-6 text-gray-600">
                  Перенаправлення на головну сторінку...
                </p>
                <Link href="/" className="btn-primary inline-block">
                  Перейти зараз
                </Link>
              </div>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  // Показуємо завантаження поки перевіряємо токен
  if (isCheckingToken) {
    return (
      <>
        <Head>
          <title>Перевірка посилання - SaveKW</title>
        </Head>
        <Layout>
          <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
            <div className="w-full max-w-md text-center">
              <div className="card">
                <div className="mb-4 animate-spin text-indigo-600">
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <p className="text-gray-600">Перевірка посилання...</p>
              </div>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  // Якщо токен недійсний, показуємо помилку
  if (!isValidToken) {
    return (
      <>
        <Head>
          <title>Помилка - SaveKW</title>
        </Head>
        <Layout>
          <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
            <div className="w-full max-w-md text-center">
              <div className="card">
                <div className="mb-4 text-red-500">
                  <svg
                    className="mx-auto h-16 w-16"
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
                <h1 className="mb-4 text-2xl font-bold text-gray-900">
                  {error || "Недійсне посилання"}
                </h1>
                <p className="mb-6 text-gray-600">
                  Посилання для скидання пароля недійсне або застаріло. Будь
                  ласка, спробуйте ще раз.
                </p>
                <Link href="/auth/signin" className="btn-primary inline-block">
                  Повернутися до входу
                </Link>
              </div>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Скидання пароля - SaveKW</title>
      </Head>
      <Layout>
        <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="card">
              <div className="mb-6 text-center">
                <h1 className="mb-2 text-3xl font-bold text-gray-900">
                  Новий пароль
                </h1>
                <p className="text-gray-600">
                  Введіть новий пароль для вашого акаунту
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="newPassword" className="label-text">
                    Новий пароль
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input-field pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Мінімум 6 символів, включаючи великі та малі літери, цифри
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="label-text">
                    Підтвердіть пароль
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "Збереження..." : "Змінити пароль"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/auth/signin"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Назад до входу
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
