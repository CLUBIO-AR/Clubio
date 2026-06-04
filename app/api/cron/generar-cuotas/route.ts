import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// DISPATCHER: lee todos los gym IDs y lanza un worker por gym en paralelo.
// No procesa lógica de negocio directamente.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const hoy = new Date().toISOString().split("T")[0];

  const { data: licencias, error } = await supabase
    .from("licencias")
    .select("gym_id")
    .eq("activa", true)
    .gte("fecha_vencimiento", hoy);

  if (error) {
    console.error("[cron:generar-cuotas:dispatcher] Error:", error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  if (!licencias?.length) {
    return NextResponse.json({ dispatched: 0, succeeded: 0, failed: 0 });
  }

  const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/workers/generar-cuotas-gym`;

  // Lanzar todos los workers en paralelo — un fallo no bloquea a los demás
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
  const failed    = results.filter((r) => r.status === "rejected").length;

  console.log(
    `[cron:generar-cuotas:dispatcher] dispatched=${licencias.length} ok=${succeeded} fail=${failed}`
  );

  return NextResponse.json({
    dispatched: licencias.length,
    succeeded,
    failed,
  });
}
