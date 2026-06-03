import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aplicarRecargosGym } from "@/lib/cuotas";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const hoy = new Date().toISOString().split("T")[0];

  // Gyms activos con licencia vigente
  const { data: licencias } = await supabase
    .from("licencias")
    .select("gym_id")
    .eq("activa", true)
    .gte("fecha_vencimiento", hoy);

  if (!licencias?.length) {
    return NextResponse.json({ ok: true, gyms: 0 });
  }

  for (const { gym_id } of licencias) {
    await aplicarRecargosGym(supabase, gym_id);
  }

  console.log(`[cron/aplicar-recargos] ${hoy} → ${licencias.length} gyms procesados`);

  return NextResponse.json({ ok: true, gyms: licencias.length, fecha: hoy });
}
