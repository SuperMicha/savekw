import type { NextApiRequest, NextApiResponse } from "next";
import { renderTrpcPanel } from "trpc-ui";
import { appRouter } from "@/server/api/root";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const protocol = (req.headers["x-forwarded-proto"] as string) ?? "http";
  const host =
    (req.headers["x-forwarded-host"] as string) ??
    req.headers.host ??
    "localhost:3000";
  const baseUrl = `${protocol}://${host}`;

  res.status(200).send(
    renderTrpcPanel(appRouter, {
      url: `${baseUrl}/api/trpc`,
      meta: {
        title: "SaveKW API Documentation",
        description: "Interactive API documentation for SaveKW project",
      },
    }),
  );
}
