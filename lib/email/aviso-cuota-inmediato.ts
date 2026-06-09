import { SignJWT } from "jose";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notifications";
import type { GymNotificationConfig, EmailTemplates } from "@/lib/notifications";

export async function enviarAvisoCuotaInmediato(params: {
  alumnoId: string;
  alumnoNombre: string;
  alumnoEmail: string;
  gymId: string;
  cuotaId: string;
  mes: number;
  anio: number;
  monto: number;
}) {
  const admin = createAdminClient();

  const [gymRes, configRes] = await Promise.all([
    admin.from("gyms").select("nombre, logo_url").eq("id", params.gymId).single(),
    admin.from("gym_config")
      .select("email_activo, email_templates, email_color_acento")
      .eq("gym_id", params.gymId)
      .single(),
  ]);

  if (!gymRes.data || !configRes.data?.email_activo) return;

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const token = await new SignJWT({
    cuota_id: params.cuotaId,
    gym_id:   params.gymId,
    alumno_id: params.alumnoId,
    alumno_nombre: params.alumnoNombre,
    mes:   params.mes,
    anio:  params.anio,
    monto: params.monto,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const notifConfig: GymNotificationConfig = {
    email_activo: true,
    email_templates: (configRes.data.email_templates as EmailTemplates | null) ?? null,
    whatsapp_activo: false,
  };

  await sendNotification(notifConfig, {
    type: "aviso_vencimiento",
    alumno: { nombre: params.alumnoNombre, email: params.alumnoEmail },
    cuota: {
      mes:         params.mes,
      anio:        params.anio,
      monto_total: params.monto,
      pago_url:    `${appUrl}/pagar/${token}`,
    },
    gym: {
      nombre:      gymRes.data.nombre,
      logo_url:    gymRes.data.logo_url,
      color_acento: configRes.data.email_color_acento,
    },
  });
}
