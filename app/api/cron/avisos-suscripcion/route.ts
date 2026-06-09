import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logCron } from "@/lib/cron-logger";
import { clubioEmailHtml } from "@/lib/email/template";

// Días antes del vencimiento en los que enviar aviso preventivo
// (independientes del link de cobro — son emails informativos)
const DIAS_AVISO = [30, 14, 7, 3];

const PLAN_LABELS: Record<string, string> = { basic: "Basic", plus: "Plus", multi: "Multi" };

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const admin = createAdminClient();
  const hoy = new Date();

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`;

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

      const urgencia = dias <= 3 ? "muy pronto" : dias <= 7 ? "pronto" : "próximamente";
      const urgenciaColor = dias <= 3 ? "#f87171" : dias <= 7 ? "#f97316" : "#fbbf24";

      try {
        await resend.emails.send({
          from,
          to: gym.email_contacto,
          subject: `Tu suscripción CLUBIO vence en ${dias} día${dias !== 1 ? "s" : ""} — ${gym.nombre}`,
          html: clubioEmailHtml(`
            <h2 style="margin:0 0 8px;color:#f9fafb;font-size:20px">
              Tu suscripción vence ${urgencia}
            </h2>
            <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">
              Hola <strong style="color:#f9fafb">${gym.nombre}</strong>, te avisamos que tu suscripción a CLUBIO vence
              <strong style="color:${urgenciaColor}"> el ${vencimientoLabel}</strong> (en ${dias} día${dias !== 1 ? "s" : ""}).
            </p>
            <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:16px 20px;margin-bottom:20px">
              <p style="margin:0;font-size:13px;color:#9ca3af">
                Plan: <strong style="color:#f9fafb">${planLabel}</strong>
              </p>
              <p style="margin:8px 0 0;font-size:13px;color:#9ca3af">
                Vencimiento: <strong style="color:${urgenciaColor}">${vencimientoLabel}</strong>
              </p>
            </div>
            <p style="color:#9ca3af;font-size:13px;margin:0">
              Recibirás el link de pago en los próximos días. Si ya lo recibiste, podés ignorar este mensaje.
              Ante cualquier duda, respondé este email.
            </p>
          `),
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
