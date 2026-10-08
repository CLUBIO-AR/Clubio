// Recordatorio de clase de prueba (cron recordatorio-prueba, dos veces por día: 9:00 y 20:00
// de Argentina). Avisa las clases que empiezan entre 1 y 15 horas después de la corrida, con
// los botones "Cambiar horario" / "Cancelar clase". Así la clase de la tarde se recuerda a la
// mañana, y la de la mañana siguiente, la noche anterior. Sale una sola vez (recordatorio_at).
//
// Ventana de 24 h de Meta: si la persona no escribió en las últimas 24 h, no se puede mandar
// un mensaje libre, así que se usa la plantilla gym_config.whatsapp_template_recordatorio_prueba
// (ver whatsapp/templates/recordatorio_clase_prueba_v1.json). Si no está configurada, se
// loguea y se sigue con las demás.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendWhatsAppButtons, sendWhatsAppPlantilla } from "@/lib/notifications/channels/whatsapp";
import { ventanaAbierta } from "@/lib/comprobantes";
import { cuandoDesdeInicio, describirCuando } from "@/lib/horarios";

type Admin = SupabaseClient<Database>;

export const DESDE_HORAS = 1;
export const HASTA_HORAS = 15;

export function textoRecordatorio(nombre: string | null, actividad: string, cuando: string, gym: string): string {
  return `¡Hola${nombre ? ` ${nombre}` : ""}! 👋 Te recordamos tu clase de prueba de *${actividad}* ${cuando} en *${gym}* 💪\n\nSi no podés venir, avisanos con los botones de abajo.`;
}

export async function mandarRecordatoriosPrueba(admin: Admin, gymId: string, ahora = new Date()): Promise<{ enviados: number; sinPlantilla: number; errores: number }> {
  const resultado = { enviados: 0, sinPlantilla: 0, errores: 0 };

  const { data: config } = await admin
    .from("gym_config")
    .select("whatsapp_activo, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_template_recordatorio_prueba")
    .eq("gym_id", gymId)
    .maybeSingle();
  if (!config?.whatsapp_activo || !config.whatsapp_phone_number_id || !config.whatsapp_access_token) return resultado;

  const { data: reservas } = await admin
    .from("reservas_prueba")
    .select("id, telefono, nombre, inicio, actividades(nombre)")
    .eq("gym_id", gymId)
    .eq("estado", "activa")
    .is("recordatorio_at", null)
    .gt("inicio", new Date(ahora.getTime() + DESDE_HORAS * 3600000).toISOString())
    .lte("inicio", new Date(ahora.getTime() + HASTA_HORAS * 3600000).toISOString());
  if (!reservas?.length) return resultado;

  const { data: gym } = await admin.from("gyms").select("nombre").eq("id", gymId).maybeSingle();
  const gymNombre = gym?.nombre ?? "el gym";

  for (const r of reservas) {
    try {
      const actividad = (r.actividades as unknown as { nombre: string } | null)?.nombre ?? "tu clase";
      const cuando = describirCuando(cuandoDesdeInicio(r.inicio), ahora);
      let waMessageId: string;
      let cuerpo: string;

      if (await ventanaAbierta(admin, gymId, r.telefono, ahora)) {
        cuerpo = textoRecordatorio(r.nombre, actividad, cuando, gymNombre);
        waMessageId = await sendWhatsAppButtons(config, {
          to: r.telefono,
          body: cuerpo,
          buttons: [
            { id: `bot_cambiar:${r.id}`, title: "Cambiar horario" },
            { id: `bot_cancelar:${r.id}`, title: "Cancelar clase" },
          ],
        });
      } else if (config.whatsapp_template_recordatorio_prueba) {
        cuerpo = `📋 Recordatorio de clase de prueba · ${actividad} · ${cuando}`;
        waMessageId = await sendWhatsAppPlantilla(config, {
          to: r.telefono,
          plantilla: config.whatsapp_template_recordatorio_prueba,
          body: [r.nombre?.trim() || "de nuevo", actividad, cuando, gymNombre],
          quickReplies: [`cambiar:${r.id}`, `cancelar:${r.id}`],
        });
      } else {
        console.warn("[recordatorio-prueba] sin plantilla configurada y fuera de la ventana de 24 h — gym:", gymId, "reserva:", r.id);
        resultado.sinPlantilla++;
        continue;
      }

      await admin.from("reservas_prueba").update({ recordatorio_at: ahora.toISOString() }).eq("id", r.id).eq("gym_id", gymId);
      await admin.from("mensajes_whatsapp").insert({
        gym_id: gymId, telefono: r.telefono, direccion: "saliente", cuerpo, wa_message_id: waMessageId, estado: "enviado",
      });
      resultado.enviados++;
    } catch (err) {
      resultado.errores++;
      console.error("[recordatorio-prueba] error — gym:", gymId, "reserva:", r.id, err instanceof Error ? err.message : err);
    }
  }
  return resultado;
}
