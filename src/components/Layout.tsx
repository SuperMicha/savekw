import type { ReactNode } from "react";
import Logo from "./Logo";
import { useAuth } from "../lib/auth-context";
import Link from "next/link";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Logo />

            <nav className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">{user.email}</span>
                  <button
                    onClick={signOut}
                    className="text-sm text-gray-600 transition-colors hover:text-emerald-600"
                  >
                    Вийти
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="text-sm text-gray-600 transition-colors hover:text-emerald-600"
                  >
                    Увійти
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="btn-primary px-4 py-2 text-sm"
                  >
                    Реєстрація
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="mt-auto bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-400">
            © {new Date().getFullYear()} SaveKW. Всі права захищені.
          </div>
        </div>
      </footer>
    </div>
  );
}
