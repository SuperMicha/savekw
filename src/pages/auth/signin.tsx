import { useState, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import Layout from "@/components/Layout";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

export default function SignIn() {
  const router = useRouter();
  const { signIn, resetPassword } = useAuth();
  const captchaRef = useRef<TurnstileInstance>(null);
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Перевірка капчі
    if (!captchaToken) {
      setError("Будь ласка, пройдіть перевірку Turnstile");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn(email, password, captchaToken);

      if (result.error) {
        setError("Невірний email або пароль");
        // Скидаємо капчу при помилці
        captchaRef.current?.reset();
        setCaptchaToken("");
      } else {
        await router.push("/settings/profile");
      }
    } catch {
      setError("Сталася помилка при вході");
      // Скидаємо капчу при помилці
      captchaRef.current?.reset();
      setCaptchaToken("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Будь ласка, введіть email для скидання пароля");
      return;
    }

    // Перевірка капчі для скидання пароля
    if (!captchaToken) {
      setError("Будь ласка, пройдіть перевірку Turnstile для скидання пароля");
      return;
    }

    setIsResettingPassword(true);
    setError("");

    try {
      const { error } = await resetPassword(email, captchaToken);

      if (error) {
        setError("Помилка при відправці листа: " + error.message);
        // Скидаємо капчу при помилці
        captchaRef.current?.reset();
        setCaptchaToken("");
      } else {
        setResetEmailSent(true);
        console.log(
          "Reset email sent successfully. Check your inbox and spam folder.",
        );
        // Скидаємо капчу після успіху
        captchaRef.current?.reset();
        setCaptchaToken("");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setError("Сталася помилка при відправці листа");
      // Скидаємо капчу при помилці
      captchaRef.current?.reset();
      setCaptchaToken("");
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <>
      <Head>
        <title>Вхід - SaveKW</title>
      </Head>
      <Layout>
        <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="card">
              <div className="mb-6 text-center">
                <h1 className="mb-2 text-3xl font-bold text-gray-900">
                  Вхід в акаунт
                </h1>
                <p className="text-gray-600">Раді бачити вас знову!</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
                    {error}
                  </div>
                )}

                {resetEmailSent && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center text-sm text-emerald-600">
                    Лист для скидання пароля відправлено на {email}. Перевірте
                    вашу пошту.
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="label-text">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="label-text">
                    Пароль
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                </div>

                {/* Забули пароль? */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isResettingPassword || !email}
                    className="text-sm text-emerald-600 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isResettingPassword ? "Відправка..." : "Забули пароль?"}
                  </button>
                </div>

                {/* Turnstile Widget */}
                <div className="flex justify-center">
                  <Turnstile
                    ref={captchaRef}
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
                    onSuccess={handleCaptchaVerify}
                    onExpire={handleCaptchaExpire}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "Вхід..." : "Увійти"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Немає акаунту?{" "}
                  <Link
                    href="/auth/signup"
                    className="font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Зареєструватись
                  </Link>
                </p>
              </div>

              {/* Version info */}
              <div className="mt-4 text-center text-xs text-gray-400">
                {process.env.NEXT_PUBLIC_GIT_SHA && (
                  <span>
                    {process.env.NEXT_PUBLIC_GIT_SHA.substring(0, 7)} (
                    {process.env.NEXT_PUBLIC_GIT_DATE})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
