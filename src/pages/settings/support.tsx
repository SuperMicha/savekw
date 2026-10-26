import Head from "next/head";
import SettingsLayout from "@/components/SettingsLayout";

export default function SupportPage() {
  return (
    <>
      <Head>
        <title>Підтримка - SaveKW</title>
      </Head>
      <SettingsLayout>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900">Підтримка</h2>
          <p className="mt-4 text-gray-600">Ця сторінка в розробці...</p>
        </div>
      </SettingsLayout>
    </>
  );
}
