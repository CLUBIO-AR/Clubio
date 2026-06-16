import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logCron } from "@/lib/cron-logger";
import { sendSuscripcionAvisoGym } from "@/lib/notifications/channels/email";

// Días antes del vencimiento en los que enviar aviso preventivo
// (independientes del link de cobro — son emails informativos)
const DIAS_AVISO = [30, 14, 7, 3];

const PLAN_LABELS: Record<string, string> = { basic: "Basic", plus: "Plus (legacy)", multi: "Multi" };

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const admin = createAdminClient();
  const hoy = new Date();

  let enviados = 0;
  let saltados = 0;
  const errores: string[] = [];

  for (const dias of DIAS_AVISO) {
    const fechaObjetivo = new Date(hoy);
    fechaObjetivo.setDate(fechaObjetivo.getDate() + dias);
    const fechaStr = fechaObjetivo.toISOString().split("T")[0];

    const { data: licencias } = await admin
      .from("licencias")
      .select("id, gym_id, plan, fecha_vencimiento, gyms(nombre, email_contacto)")
      .eq("activa", true)
      .eq("es_trial", false)
      .eq("fecha_vencimiento", fechaStr);

    for (const lic of licencias ?? []) {
      const gym = Array.isArray(lic.gyms) ? lic.gyms[0] : lic.gyms;
      if (!gym?.email_contacto) { saltados++; continue; }

      const planLabel = PLAN_LABELS[lic.plan] ?? lic.plan;
      const vencimientoLabel = new Date(lic.fecha_vencimiento).toLocaleDateString("es-AR", {
        day: "numeric", month: "long", year: "numeric",
      });

      try {
        await sendSuscripcionAvisoGym({
          to:               gym.email_contacto,
          gymNombre:        gym.nombre,
          planLabel,
          diasRestantes:    dias,
          vencimientoLabel,
        });
        enviados++;
      } catch (e) {
        errores.push(`${gym.nombre} (${dias}d): ${(e as Error).message}`);
      }
    }
  }

  await logCron({
    tipo: "avisos_suscripcion",
    esDispatcher: false,
    itemsCreados: enviados,
    itemsSaltados: saltados,
    itemsError: errores.length,
    errorDetalle: errores.length ? errores.slice(0, 3).join(" | ") : undefined,
    duracionMs: Date.now() - startTime,
  });

  return NextResponse.json({ ok: true, enviados, saltados, errores: errores.length });
}
