import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { ConfigGym } from "@/components/configuracion/config-gym";
import { ConfigCuotas } from "@/components/configuracion/config-cuotas";
import { ConfigRecargos } from "@/components/configuracion/config-recargos";
import { ConfigNotificaciones } from "@/components/configuracion/config-notificaciones";
import { ConfigMercadoPago } from "@/components/configuracion/config-mercadopago";
import { ConfigActividades } from "@/components/configuracion/config-actividades";
import { T } from "@/lib/theme";

export default async function ConfiguracionPage() {
  const ctx = await requireGymContext();
  const supabase = await createClient();

  const [gymRes, configRes, actividadesRes] = await Promise.all([
    supabase.from("gyms").select("id, nombre, email_contacto, telefono, direccion").eq("id", ctx.gymId).single(),
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

      <ConfigCuotas
        montoBaseDefecto={config?.monto_base_defecto ?? null}
        diaVencimientoMensual={config?.dia_vencimiento_mensual ?? 10}
        diasGracia={config?.dias_gracia ?? 0}
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

      <ConfigMercadoPago
        mpAccessToken={config?.mp_access_token ?? ""}
        mpPublicKey={config?.mp_public_key ?? ""}
      />

      <ConfigActividades actividades={actividades} />
    </div>
  );
}
