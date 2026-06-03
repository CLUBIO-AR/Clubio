import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generarCuotasMes } from "@/lib/cuotas";

export async function GET(request: Request) {
  // Validar CRON_SECRET (el proxy también lo valida, doble check)
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const mes  = now.getMonth() + 1;
  const anio = now.getFullYear();

  // Todos los gyms activos con licencia vigente
  const { data: licencias } = await supabase
    .from("licencias")
    .select("gym_id")
    .eq("activa", true)
    .gte("fecha_vencimiento", now.toISOString().split("T")[0]);

  if (!licencias?.length) {
    return NextResponse.json({ ok: true, gyms: 0, cuotas_creadas: 0 });
  }

  const results: { gym_id: string; creadas: number; error: string | null }[] = [];

  for (const { gym_id } of licencias) {
    const { creadas, error } = await generarCuotasMes(supabase, gym_id, mes, anio);
    results.push({ gym_id, creadas, error });
  }

  const totalCreadas = results.reduce((acc, r) => acc + r.creadas, 0);

  console.log(`[cron/generar-cuotas] ${mes}/${anio} → ${licencias.length} gyms, ${totalCreadas} cuotas creadas`);

  return NextResponse.json({
    ok: true,
    mes,
    anio,
    gyms: licencias.length,
    cuotas_creadas: totalCreadas,
    detalle: results,
  });
}
