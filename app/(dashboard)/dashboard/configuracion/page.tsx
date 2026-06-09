import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { ConfigGym } from "@/components/configuracion/config-gym";
import { ConfigBranding } from "@/components/configuracion/config-branding";
import { ConfigPlantillas } from "@/components/configuracion/config-plantillas";
import { ConfigCuotas } from "@/components/configuracion/config-cuotas";
import { ConfigRecargos } from "@/components/configuracion/config-recargos";
import { ConfigNotificaciones } from "@/components/configuracion/config-notificaciones";
import { ConfigMercadoPago } from "@/components/configuracion/config-mercadopago";
import { ConfigActividades } from "@/components/configuracion/config-actividades";
import { T } from "@/lib/theme";
import Link from "next/link";
import { Activity, ChevronRight } from "lucide-react";

export default async function ConfiguracionPage() {
  const ctx = await requireGymContext();
  const supabase = await createClient();

  const [gymRes, configRes, actividadesRes] = await Promise.all([
    supabase.from("gyms").select("id, nombre, email_contacto, telefono, direccion, logo_url").eq("id", ctx.gymId).single(),
    supabase.from("gym_config").select("*").eq("gym_id", ctx.gymId).maybeSingle(),
    supabase.from("actividades").select("*").eq("gym_id", ctx.gymId).is("deleted_at", null).order("nombre"),
  ]);

  const gym = gymRes.data;
  const config = configRes.data;
  const actividades = actividadesRes.data ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>
          CONFIGURACIÓN
        </h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>Ajustes del gimnasio</p>
      </div>

      <ConfigGym
        nombre={gym?.nombre ?? ""}
        emailContacto={gym?.email_contacto ?? ""}
        telefono={gym?.telefono ?? ""}
        direccion={gym?.direccion ?? ""}
      />

      <ConfigBranding
        logoUrl={gym?.logo_url ?? null}
        colorAcento={config?.email_color_acento ?? null}
      />

      <ConfigCuotas
        montoBaseDefecto={config?.monto_base_defecto ?? null}
        diaVencimientoMensual={config?.dia_vencimiento_mensual ?? 10}
        diasGracia={config?.dias_gracia ?? 0}
        generarCuotaAlAlta={config?.generar_cuota_al_alta ?? true}
        cuotaAltaProporcional={config?.cuota_alta_proporcional ?? false}
        diasMinimosCuotaAlta={config?.dias_minimos_para_cuota_alta ?? 15}
      />

      <ConfigRecargos
        recargo1Dias={config?.recargo_1_dias ?? 0}
        recargo1Porcentaje={config?.recargo_1_porcentaje ?? 10}
        recargo2Dias={config?.recargo_2_dias ?? null}
        recargo2Porcentaje={config?.recargo_2_porcentaje ?? null}
      />

      <ConfigNotificaciones
        emailActivo={config?.email_activo ?? true}
        diasAvisoAntes={config?.dias_aviso_antes ?? [7, 3, 1]}
        avisoPostVencimientoDias={config?.aviso_post_vencimiento_dias ?? 3}
        maxAvisosPost={config?.max_avisos_post ?? 3}
        emailRemitenteNombre={config?.email_remitente_nombre ?? ""}
        emailRemitenteAddress={config?.email_remitente_address ?? ""}
      />

      <ConfigPlantillas
        templates={(config?.email_templates as { aviso_vencimiento?: { subject?: string; body?: string }; recordatorio_vencido?: { subject?: string; body?: string } } | null) ?? null}
      />

      <ConfigMercadoPago
        mpAccessToken={config?.mp_access_token ?? ""}
        mpPublicKey={config?.mp_public_key ?? ""}
      />

      <ConfigActividades actividades={actividades} />

      {(ctx.rol === "owner" || ctx.rol === "admin") && (
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] mb-3" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
            — Avanzado
          </p>
          <Link
            href="/dashboard/configuracion/crons"
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-opacity hover:opacity-75"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${T.accent}15`, border: `1px solid ${T.accent}30` }}>
              <Activity className="w-4 h-4" style={{ color: T.accent }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>
                MONITOREO DE CRONS
              </p>
              <p className="text-xs" style={{ color: T.textDim }}>Estado de tareas automáticas</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: T.textDim }} />
          </Link>
        </div>
      )}
    </div>
  );
}
