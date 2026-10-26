import { createContext, useContext, useEffect, useState, useRef } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/router";
import { api } from "@/utils/api";

interface SignUpResponse {
  error: AuthError | null;
  data?: {
    user: User | null;
    session: Session | null;
  };
}

interface SignInResponse {
  error: AuthError | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initializingNewUser: boolean; // НОВИЙ стан для лоадера
  signUp: (
    email: string,
    password: string,
    name: string,
    captchaToken?: string,
  ) => Promise<SignUpResponse>;
  signIn: (
    email: string,
    password: string,
    captchaToken?: string,
  ) => Promise<SignInResponse>;
  signOut: () => Promise<void>;
  resetPassword: (
    email: string,
    captchaToken: string,
  ) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializingNewUser, setInitializingNewUser] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const profileInitialized = useRef(false);

  // Mutation для ініціалізації профілю
  const initProfile = api.properties.ensureUserProfile.useMutation();
  const utils = api.useUtils();

  useEffect(() => {
    // Отримуємо поточну сесію
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Слухаємо зміни автентифікації
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const previousUserId = user?.id;
      const newUserId = session?.user?.id;

      setSession(session);
      setUser(session?.user ?? null);

      // Якщо змінився користувач - скидаємо флаги та кеш
      if (previousUserId && newUserId && previousUserId !== newUserId) {
        profileInitialized.current = false;
        await utils.properties.invalidate();
      }

      // ІНІЦІАЛІЗАЦІЯ НОВОГО КОРИСТУВАЧА (тільки один раз при першому sign in)
      if (
        event === "SIGNED_IN" &&
        session?.user &&
        !profileInitialized.current
      ) {
        profileInitialized.current = true;

        try {
          // Показуємо лоадер
          setInitializingNewUser(true);

          // Перевіряємо чи це новий користувач і ініціалізуємо профіль
          const result = await initProfile.mutateAsync();

          // Інвалідуємо кеш для свіжих даних
          await utils.properties.invalidate();

          // Якщо це новий користувач - редірект на профіль
          if (result.isNewUser) {
            await router.push("/settings/profile");
          }
        } catch (err) {
          console.error("Failed to initialize user profile:", err);
        } finally {
          setInitializingNewUser(false);
        }
      }

      // Скидаємо флаг при розлогіні
      if (!session?.user) {
        profileInitialized.current = false;
      }

      setLoading(false);
    });

    return () => {
      void subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase.auth, user?.id]);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    captchaToken?: string,
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          captchaToken: captchaToken,
        },
      });

      if (!error && data.user) {
        setUser(data.user);
      }

      return { error, data };
    } catch (err) {
      console.error("Sign up error:", err);
      return {
        error: new Error("Sign up failed") as unknown as AuthError,
      };
    }
  };

  const signIn = async (
    email: string,
    password: string,
    captchaToken?: string,
  ) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken: captchaToken,
        },
      });

      if (!error && data.user) {
        setUser(data.user);
      }

      return { error };
    } catch (err) {
      console.error("Sign in error:", err);
      return {
        error: new Error("Sign in failed") as unknown as AuthError,
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Очищаем все локальные данные авторизации
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    setSession(null);
    void router.push("/auth/signin");
  };

  const resetPassword = async (email: string, captchaToken: string) => {
    try {
      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
        captchaToken: captchaToken,
      });

      return { error: result.error };
    } catch (err) {
      console.error("Reset password error:", err);
      return {
        error: new Error("Reset password failed") as unknown as AuthError,
      };
    }
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        initializingNewUser,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {/* Модальний лоадер для нових користувачів */}
      {initializingNewUser && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="rounded-lg bg-white p-8 text-center shadow-xl">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
            <p className="text-lg font-medium text-gray-900">
              Налаштовуємо ваш профіль...
            </p>
            <p className="mt-2 text-sm text-gray-600">Це займе лише мить</p>
          </div>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
