import Head from "next/head";
import SettingsLayout from "@/components/SettingsLayout";

export default function EventsPage() {
  return (
    <>
      <Head>
        <title>Журнал Подій - SaveKW</title>
      </Head>
      <SettingsLayout>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900">Журнал Подій</h2>
          <p className="mt-4 text-gray-600">Ця сторінка в розробці...</p>
        </div>
      </SettingsLayout>
    </>
  );
}
