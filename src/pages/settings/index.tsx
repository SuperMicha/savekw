import { useEffect } from "react";
import { useRouter } from "next/router";

export default function SettingsIndex() {
  const router = useRouter();

  useEffect(() => {
    void router.replace("/settings/profile");
  }, [router]);

  return null;
}
