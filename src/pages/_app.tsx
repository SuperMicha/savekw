import { type AppType } from "next/app";
import { Geist } from "next/font/google";

import { api } from "@/utils/api";
import { AuthProvider } from "@/lib/auth-context";

import "@/styles/globals.css";
import "leaflet/dist/leaflet.css";

const geist = Geist({
  subsets: ["latin"],
});

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <AuthProvider>
      <div className={geist.className}>
        <Component {...pageProps} />
      </div>
    </AuthProvider>
  );
};

export default api.withTRPC(MyApp);
