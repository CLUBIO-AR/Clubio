import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { ConfigGym } from "@/components/configuracion/config-gym";
import { ConfigBranding } from "@/components/configuracion/config-branding";
import { ConfigCuotas } from "@/components/configuracion/config-cuotas";
import { ConfigRecargos } from "@/components/configuracion/config-recargos";
import { ConfigCobro } from "@/components/configuracion/config-cobro";
import { ConfigAvisos } from "@/components/configuracion/config-avisos";
import { ConfigPlantillas } from "@/components/configuracion/config-plantillas";
import { ConfigWhatsapp } from "@/components/configuracion/config-whatsapp";
import { whatsappConfigurado } from "@/lib/whatsapp-config";
import { T } from "@/lib/theme";
import { Activity, ChevronRight, Mail } from "lucide-react";

const TABS = [
  { id: "gimnasio",    label: "Gimnasio" },
  { id: "cobros",      label: "Cobros" },
  { id: "avisos",      label: "Avisos" },
  { id: "whatsapp",    label: "WhatsApp" },
  { id: "avanzado",    label: "Avanzado", soloAdmin: true },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await requireGymContext();
  const esAdmin = ctx.rol === "owner" || ctx.rol === "admin";
  const tabsVisibles = TABS.filter((t) => !("soloAdmin" in t) || esAdmin);
  const { tab: tabParam } = await searchParams;
  const tab: TabId = (tabsVisibles.find((t) => t.id === tabParam)?.id ?? "gimnasio") as TabId;

  const supabase = await createClient();
  // Actividades tiene su propia página en el menú (/dashboard/actividades): no se repite acá.
  const [gymRes, configRes] = await Promise.all([
    supabase.from("gyms").select("id, nombre, email_contacto, telefono, direccion, logo_url").eq("id", ctx.gymId).single(),
    supabase.from("gym_config").select("*").eq("gym_id", ctx.gymId).maybeSingle(),
  ]);

  const gym = gymRes.data;
  const config = configRes.data;
  const modoCobro = (config?.email_modo as "link" | "transferencia" | null) ?? "link";
  const waConectado = whatsappConfigurado(config);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-fredoka)", fontWeight: 900, color: T.text }}>
          CONFIGURACIÓN
        </h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>Ajustes del gimnasio</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Secciones de configuración">
        {tabsVisibles.map((t) => {
          const activo = t.id === tab;
          return (
            <Link
              key={t.id}
              href={`/dashboard/configuracion?tab=${t.id}`}
              scroll={false}
              aria-current={activo ? "page" : undefined}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors"
              style={{
                fontFamily: "var(--font-fredoka)",
                background: activo ? T.accentBg : "transparent",
                color: activo ? T.accent : T.textDim,
                border: `1px solid ${activo ? T.accentBorder : "transparent"}`,
              }}
            >
              {t.label}
              {t.id === "whatsapp" && (
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full ml-1.5 align-middle"
                  style={{ background: waConectado ? T.accent : T.border }}
                  aria-label={waConectado ? "conectado" : "no conectado"}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {tab === "gimnasio" && (
        <>
          <ConfigGym
            nombre={gym?.nombre ?? ""}
            emailContacto={gym?.email_contacto ?? ""}
            telefono={gym?.telefono ?? ""}
            direccion={gym?.direccion ?? ""}
          />
          <ConfigBranding logoUrl={gym?.logo_url ?? null} colorAcento={config?.email_color_acento ?? null} />
        </>
      )}

      {tab === "cobros" && (
        <>
          <ConfigCobro
            modo={modoCobro}
            mpConfigurado={!!config?.mp_access_token}
            mpPublicKey={config?.mp_public_key ?? ""}
            mpSoloDineroEnCuenta={config?.mp_solo_dinero_cuenta ?? false}
            transferenciaAlias={config?.transferencia_alias ?? ""}
            transferenciaTitular={config?.transferencia_titular ?? ""}
            transferenciaBanco={config?.transferencia_banco ?? ""}
          />
          <ConfigCuotas
            montoBaseDefecto={config?.monto_base_defecto ?? null}
            diaVencimientoMensual={config?.dia_vencimiento_mensual ?? 10}
            generarCuotaAlAlta={config?.generar_cuota_al_alta ?? true}
            cuotaAltaProporcional={config?.cuota_alta_proporcional ?? false}
            diasMinimosCuotaAlta={config?.dias_minimos_para_cuota_alta ?? 15}
          />
          <ConfigRecargos
            recargo1Dias={config?.recargo_1_dias ?? 0}
            recargo1Porcentaje={config?.recargo_1_porcentaje ?? 10}
            recargo2Dias={config?.recargo_2_dias ?? null}
            recargo2Porcentaje={config?.recargo_2_porcentaje ?? null}
            diasMoraDesactivacion={config?.dias_mora_desactivacion ?? null}
            moraDesactivarMesSiguiente={config?.mora_desactivar_mes_siguiente ?? false}
          />
        </>
      )}

      {tab === "avisos" && (
        <>
          <ConfigAvisos
            emailActivo={config?.email_activo ?? true}
            emailRemitenteNombre={config?.email_remitente_nombre ?? ""}
            emailRemitenteAddress={config?.email_remitente_address ?? ""}
            diasAvisoAntes={config?.dias_aviso_antes ?? [7, 3, 1]}
            diasAvisoFijos={config?.dias_aviso_fijos ?? null}
            avisoPostVencimientoDias={config?.aviso_post_vencimiento_dias ?? 3}
            maxAvisosPost={config?.max_avisos_post ?? 3}
            diaUltimoAviso={config?.dia_ultimo_aviso ?? null}
            modoCobro={modoCobro}
            whatsappConectado={waConectado}
          />
          <ConfigPlantillas
            templates={(config?.email_templates as { aviso_vencimiento?: { subject?: string; body?: string }; recordatorio_vencido?: { subject?: string; body?: string } } | null) ?? null}
          />
        </>
      )}

      {tab === "whatsapp" && (
        <ConfigWhatsapp
          activo={config?.whatsapp_activo ?? false}
          phoneNumberId={config?.whatsapp_phone_number_id ?? ""}
          tokenConfigurado={!!config?.whatsapp_access_token}
          templateAviso={config?.whatsapp_template_aviso ?? ""}
          templateTransferencia={config?.whatsapp_template_transferencia ?? ""}
          templateConfirmacion={config?.whatsapp_template_confirmacion ?? ""}
        />
      )}

      {tab === "avanzado" && esAdmin && (
        <div className="space-y-2">
          {[
            { href: "/dashboard/configuracion/crons", icon: Activity, color: T.accent, titulo: "Tareas automáticas", desc: "Estado de los envíos y la generación de cuotas, y ejecución manual" },
            { href: "/dashboard/configuracion/emails", icon: Mail, color: T.blue, titulo: "Historial de envíos", desc: "Avisos y recordatorios enviados a alumnos" },
          ].map(({ href, icon: Icon, color, titulo, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-opacity hover:opacity-75"
              style={{ background: T.card, border: `1px solid ${T.border}` }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold uppercase" style={{ color: T.text, fontFamily: "var(--font-fredoka)" }}>{titulo}</p>
                <p className="text-xs" style={{ color: T.textDim }}>{desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: T.textDim }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
