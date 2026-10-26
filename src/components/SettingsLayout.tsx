import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "@/components/Layout";
import type { ReactNode } from "react";
import { useMenuStatus } from "@/hooks/useMenuStatus";

interface SettingsLayoutProps {
  children: ReactNode;
}

const menuItems = [
  {
    label: "Профіль користувача",
    href: "/settings/profile",
    key: "profile" as const,
    icon: (
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
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
      </svg>
    ),
  },
  {
    label: "Обладнання",
    href: "/settings/appliances",
    key: "equipment" as const,
    icon: (
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
          d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z"
        />
      </svg>
    ),
  },
  {
    label: "Підключеня інвертора",
    href: "/settings/smartess",
    key: "invertor" as const,
    icon: (
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
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    ),
  },
  {
    label: "Параметри Smart Life",
    href: "/settings/smartlife",
    key: "smartlife" as const,
    icon: (
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
          d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
        />
      </svg>
    ),
  },
  {
    label: "Налаштування Алгоритмів",
    href: "/settings/algorithms",
    key: "algorithms" as const,
    icon: (
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
          d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
        />
      </svg>
    ),
  },
  {
    label: "Журнал Подій",
    href: "/settings/logs",
    key: "logs" as const,
    icon: (
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
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        />
      </svg>
    ),
  },
  {
    label: "Підтримка",
    href: "/settings/support",
    key: "support" as const,
    icon: (
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
          d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
        />
      </svg>
    ),
  },
];

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const router = useRouter();
  const menuStatus = useMenuStatus();

  // Функція для створення індикатора
  const StatusIndicator = ({
    status,
    tooltip,
  }: {
    status: "success" | "error";
    tooltip?: string;
  }) => {
    if (status === "success") {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="#10B981"
          className="h-5 w-5 flex-shrink-0"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      );
    }

    const content = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="#EF4444"
        className="h-5 w-5 flex-shrink-0"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
    );

    if (tooltip) {
      return (
        <div className="group relative">
          {content}
          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
            {tooltip}
            <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-t-4 border-r-4 border-l-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
      );
    }

    return content;
  };

  // Функція для отримання статусу індикатора для конкретного пункту меню
  const getStatusForMenuItem = (key: string) => {
    switch (key) {
      case "equipment":
        return menuStatus.equipment;
      case "invertor":
        return menuStatus.invertor;
      case "smartlife":
        return menuStatus.smartlife;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Налаштування</h1>
            <p className="mt-2 text-gray-600">
              Керуйте своїм профілем та налаштуваннями системи
            </p>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Sidebar Menu */}
            <aside className="w-full lg:w-64">
              <nav className="card space-y-1 p-2">
                {menuItems.map((item) => {
                  const isActive = router.pathname === item.href;
                  const statusInfo = getStatusForMenuItem(item.key);
                  const isDisabled = statusInfo?.disabled || false;

                  const linkContent = (
                    <div
                      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : isDisabled
                            ? "text-gray-400"
                            : "text-gray-700 hover:bg-gray-50"
                      } ${isDisabled ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            isActive
                              ? "text-emerald-600"
                              : isDisabled
                                ? "text-gray-300"
                                : "text-gray-400"
                          }
                        >
                          {item.icon}
                        </span>
                        {item.label}
                      </div>
                      {statusInfo && !isDisabled && (
                        <StatusIndicator
                          status={statusInfo.status}
                          tooltip={statusInfo.tooltip}
                        />
                      )}
                    </div>
                  );

                  // Якщо пункт меню відключений, показуємо тільки div з tooltip
                  if (isDisabled && statusInfo?.tooltip) {
                    return (
                      <div key={item.href} className="group relative">
                        {linkContent}
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                          {statusInfo.tooltip}
                          <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-t-4 border-r-4 border-l-4 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                    );
                  }

                  // Якщо пункт меню відключений, але немає tooltip
                  if (isDisabled) {
                    return <div key={item.href}>{linkContent}</div>;
                  }

                  // Звичайний активний пункт меню
                  return (
                    <Link key={item.href} href={item.href}>
                      {linkContent}
                    </Link>
                  );
                })}
              </nav>
            </aside>

            {/* Content */}
            <main className="flex-1">
              <div className="card">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
}
