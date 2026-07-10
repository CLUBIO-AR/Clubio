import { NextResponse } from "next/server";
import { updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logCron } from "@/lib/cron-logger";
import { getAdminSettings } from "@/lib/admin/settings";
import { sendSuscripcionVerificacionReport } from "@/lib/notifications/channels/email";

const AVISO_DIAS = [7, 3, 1];

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const admin = createAdminClient();
  const hoy = new Date();
  const hoyStr = hoy.toISOString().split("T")[0];

  // Fetch all active licenses with gym data
  const { data: licencias, error: fetchError } = await admin
    .from("licencias")
    .select("id, gym_id, plan, fecha_vencimiento, activa, gyms(nombre, email_contacto)")
    .eq("activa", true);

  if (fetchError) {
    await logCron({ tipo: "verificar_suscripciones", esDispatcher: false, errorDetalle: fetchError.message, duracionMs: Date.now() - startTime });
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  let vencidas = 0;
  let avisos = 0;

  const { notification_email } = await getAdminSettings();
  const vencidasRows: Array<{ gymNombre: string; plan: string; fechaVencimiento: string }> = [];
  const avisosRows: Array<{ gymNombre: string; plan: string; diasRestantes: number; fechaVencimiento: string }> = [];

  for (const lic of licencias ?? []) {
    const gym = Array.isArray(lic.gyms) ? lic.gyms[0] : lic.gyms;
    const gymNombre = gym?.nombre ?? lic.gym_id;
    // Comparación de strings YYYY-MM-DD para el check de expiración: evita edge cases
    // de UTC vs. timezone local (new Date("2026-06-14") = medianoche UTC, no AR).
    const diasRestantes = Math.ceil((new Date(lic.fecha_vencimiento).getTime() - hoy.getTime()) / 86400000);

    if (lic.fecha_vencimiento < hoyStr) {
      // Expired — deactivate license + gym
      await admin.from("licencias").update({ activa: false }).eq("id", lic.id);
      await admin.from("gyms").update({ activo: false }).eq("id", lic.gym_id);
      // Invalidar cache de sesión de todos los usuarios del gym para bloqueo inmediato
      const { data: usuariosGym } = await admin.from("gym_usuarios").select("id").eq("gym_id", lic.gym_id);
      (usuariosGym ?? []).forEach((u) => updateTag(`gym-ctx-${u.id}`));
      vencidasRows.push({ gymNombre, plan: lic.plan, fechaVencimiento: lic.fecha_vencimiento });
      vencidas++;
    } else if (AVISO_DIAS.includes(diasRestantes)) {
      avisosRows.push({ gymNombre, plan: lic.plan, diasRestantes, fechaVencimiento: lic.fecha_vencimiento });
      avisos++;
    }
  }

  // Send consolidated email to superadmin if there's anything to report
  if (vencidasRows.length > 0 || avisosRows.length > 0) {
    await sendSuscripcionVerificacionReport({ to: notification_email, hoyStr, vencidasRows, avisosRows });
  }

  await logCron({
    tipo: "verificar_suscripciones",
    esDispatcher: false,
    gymsTotal: (licencias ?? []).length,
    itemsCreados: vencidas,
    itemsSaltados: avisos,
    duracionMs: Date.now() - startTime,
  });

  return NextResponse.json({ ok: true, vencidas, avisos });
}
