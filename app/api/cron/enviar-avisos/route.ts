import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Dispatcher: llama al worker una vez por gym con licencia activa + feature_avisos
export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: licencias } = await admin
    .from("licencias")
    .select("gym_id")
    .eq("activa", true)
    .eq("feature_avisos", true);

  if (!licencias?.length) return NextResponse.json({ ok: true, gyms: 0 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const workerUrl = `${appUrl}/api/cron/workers/enviar-avisos-gym`;

  const results = await Promise.allSettled(
    licencias.map(({ gym_id }) =>
      fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ gym_id }),
      })
    )
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - succeeded;

  return NextResponse.json({ ok: true, gyms: licencias.length, succeeded, failed });
}
