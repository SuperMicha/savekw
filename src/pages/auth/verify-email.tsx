import Head from "next/head";
import Link from "next/link";
import Layout from "@/components/Layout";

export default function VerifyEmail() {
  return (
    <>
      <Head>
        <title>Підтвердіть email - SaveKW</title>
      </Head>
      <Layout>
        <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="card text-center">
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-emerald-100 p-4">
                  <svg
                    className="h-16 w-16 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>

              <h1 className="mb-4 text-3xl font-bold text-gray-900">
                Перевірте вашу пошту
              </h1>

              <p className="mb-6 text-gray-600">
                Ми надіслали листа з посиланням для підтвердження на вашу email
                адресу. Будь ласка, перевірте пошту та перейдіть за посиланням
                для активації акаунту.
              </p>

              <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-800">
                  💡 Не бачите листа? Перевірте папку &quot;Спам&quot; або
                  &quot;Промоакції&quot;
                </p>
              </div>

              <Link href="/auth/signin" className="btn-primary inline-block">
                Повернутися на сторінку входу
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
