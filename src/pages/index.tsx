import Head from "next/head";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import Layout from "@/components/Layout";

export default function Home() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-500"></div>
            <p className="mt-4 text-gray-600">Завантаження...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>SaveKW - Економія до 70% на електроенергії</title>
        <meta
          name="description"
          content="SaveKW - Система оптимізації споживання електроенергії"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Layout>
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="mb-6 text-5xl font-bold md:text-6xl">
                Економія <span className="text-emerald-400">40-70%</span> витрат
                на електроенергію
              </h1>
              <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-300 md:text-2xl">
                Для споживачів з двотарифним лічильником, власників сонячних
                станцій та автономних систем живлення
              </p>

              <div className="flex justify-center">
                <Link
                  href="/settings"
                  className="btn-primary px-8 py-4 text-lg"
                >
                  Перейти до панелі налаштувань
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
            Як це працює?
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="card text-center">
              <div className="mb-4 text-5xl">☀️</div>
              <h3 className="mb-3 text-xl font-semibold">Прогноз сонця</h3>
              <p className="text-gray-600">
                Система аналізує прогноз погоди та автоматично оптимізує режим
                роботи
              </p>
            </div>

            <div className="card text-center">
              <div className="mb-4 text-5xl">🔋</div>
              <h3 className="mb-3 text-xl font-semibold">Нічний тариф</h3>
              <p className="text-gray-600">
                Зарядка батареї та навантаження планується на години дешевого
                тарифу
              </p>
            </div>

            <div className="card text-center">
              <div className="mb-4 text-5xl">💰</div>
              <h3 className="mb-3 text-xl font-semibold">Економія до 70%</h3>
              <p className="text-gray-600">
                Реальна економія на рахунках за електроенергію вже з першого
                місяця
              </p>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
