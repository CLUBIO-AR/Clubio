import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logCron } from "@/lib/cron-logger";
import { clubioEmailHtml, clubioEmailTable } from "@/lib/email/template";
import { getAdminSettings } from "@/lib/admin/settings";

const AVISO_DIAS = [7, 3, 1];

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
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
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`;

  const vencidasRows: Array<{ gymNombre: string; plan: string; fechaVencimiento: string }> = [];
  const avisosRows: Array<{ gymNombre: string; plan: string; diasRestantes: number; fechaVencimiento: string }> = [];

  for (const lic of licencias ?? []) {
    const gym = Array.isArray(lic.gyms) ? lic.gyms[0] : lic.gyms;
    const gymNombre = gym?.nombre ?? lic.gym_id;
    const vencimiento = new Date(lic.fecha_vencimiento);
    const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / 86400000);

    if (diasRestantes < 0) {
      // Expired — deactivate license + gym
      await admin.from("licencias").update({ activa: false }).eq("id", lic.id);
      await admin.from("gyms").update({ activo: false }).eq("id", lic.gym_id);
      // Invalidar cache de sesión de todos los usuarios del gym para bloqueo inmediato
      const { data: usuariosGym } = await admin.from("gym_usuarios").select("id").eq("gym_id", lic.gym_id);
      (usuariosGym ?? []).forEach((u) => revalidateTag(`gym-ctx-${u.id}`, {}));
      vencidasRows.push({ gymNombre, plan: lic.plan, fechaVencimiento: lic.fecha_vencimiento });
      vencidas++;
    } else if (AVISO_DIAS.includes(diasRestantes)) {
      avisosRows.push({ gymNombre, plan: lic.plan, diasRestantes, fechaVencimiento: lic.fecha_vencimiento });
      avisos++;
    }
  }

  // Send consolidated email to superadmin if there's anything to report
  if (vencidasRows.length > 0 || avisosRows.length > 0) {
    const vencidasHtml = vencidasRows.length > 0
      ? `<h3 style="color:#f87171;margin:0 0 8px;font-size:15px">⛔ Licencias vencidas — gyms desactivados (${vencidasRows.length})</h3>
         ${clubioEmailTable(vencidasRows.map((r) => [r.gymNombre, `Plan ${r.plan} · venció ${r.fechaVencimiento}`]))}` : "";

    const avisosHtml = avisosRows.length > 0
      ? `<h3 style="color:#fbbf24;margin:16px 0 8px;font-size:15px">⚠️ Licencias próximas a vencer (${avisosRows.length})</h3>
         ${clubioEmailTable(avisosRows.map((r) => [r.gymNombre, `Plan ${r.plan} · vence en ${r.diasRestantes} día${r.diasRestantes !== 1 ? "s" : ""} (${r.fechaVencimiento})`]))}` : "";

    await resend.emails.send({
      from,
      to: notification_email,
      subject: `Suscripciones CLUBIO — ${new Date().toLocaleDateString("es-AR")}: ${vencidasRows.length} vencidas, ${avisosRows.length} por vencer`,
      html: clubioEmailHtml(`
        <h2 style="margin:0 0 16px;color:#f9fafb;font-size:20px">Reporte diario de suscripciones</h2>
        <p style="color:#9ca3af;margin:0 0 20px">${hoyStr}</p>
        ${vencidasHtml}
        ${avisosHtml}
      `),
    }).catch((e) => console.error("[verificar-suscripciones] email error:", e));
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
