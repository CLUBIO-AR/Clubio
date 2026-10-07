// Horarios semanales de las actividades: validación, resumen para mostrar y cálculo de las
// próximas clases (para proponer clase de prueba desde el bot de WhatsApp).
//
// Las horas se guardan en horario de Argentina. Argentina no tiene horario de verano
// (UTC−3 todo el año), así que se trabaja con un desplazamiento fijo.
import { z } from "zod";

export type Horario = { dias: number[]; hora: string };

export const HorarioSchema = z.object({
  dias: z.array(z.number().int().min(0).max(6)).min(1, "Elegí al menos un día").max(7),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:MM)"),
});
export const HorariosSchema = z.array(HorarioSchema).max(30);

const OFFSET_AR_MS = -3 * 60 * 60 * 1000;
export const DIAS_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0]; // lunes primero

function listaConY(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

/** "Lun, Mié y Vie · 18:00 y 20:00 | Sáb · 10:00" — agrupa los días que comparten horas. */
export function resumenHorarios(horarios: Horario[] | null | undefined): string {
  if (!horarios?.length) return "";
  const horasPorDia = new Map<number, Set<string>>();
  for (const h of horarios) for (const d of h.dias) {
    if (!horasPorDia.has(d)) horasPorDia.set(d, new Set());
    horasPorDia.get(d)!.add(h.hora);
  }
  const grupos = new Map<string, number[]>(); // "08:00,18:00" → [1,3,5]
  for (const d of ORDEN_SEMANA) {
    const horas = horasPorDia.get(d);
    if (!horas) continue;
    const key = Array.from(horas).sort().join(",");
    grupos.set(key, [...(grupos.get(key) ?? []), d]);
  }
  return Array.from(grupos.entries())
    .map(([horas, dias]) => `${listaConY(dias.map((d) => DIAS_CORTO.at(d)!))} · ${listaConY(horas.split(","))}`)
    .join(" | ");
}

export type ProximaClase = {
  actividadId: string;
  actividadNombre: string;
  /** Fecha y hora local de Argentina, "2026-10-08T18:00". */
  cuando: string;
  /** "Hoy 18:00", "Mañana 08:00", "Jue 9/10 18:00". */
  etiqueta: string;
};

/**
 * Próximas clases a partir de `ahora`. Busca primero hoy y mañana; si no hay nada, sigue
 * hasta 7 días. Deja al menos `margenMin` minutos para que la persona llegue.
 */
export function proximasClases(
  actividades: Array<{ id: string; nombre: string; horarios: Horario[] | null }>,
  ahora: Date,
  { max = 5, margenMin = 60 }: { max?: number; margenMin?: number } = {},
): ProximaClase[] {
  const localAhora = new Date(ahora.getTime() + OFFSET_AR_MS); // usar getUTC* = hora de Argentina
  const limite = new Date(localAhora.getTime() + margenMin * 60000);
  const todas: Array<ProximaClase & { orden: number }> = [];

  for (let offset = 0; offset < 7; offset++) {
    const dia = new Date(Date.UTC(localAhora.getUTCFullYear(), localAhora.getUTCMonth(), localAhora.getUTCDate() + offset));
    const dow = dia.getUTCDay();
    for (const act of actividades) {
      for (const h of act.horarios ?? []) {
        if (!h.dias.includes(dow)) continue;
        const [hh, mm] = h.hora.split(":").map(Number);
        const inicio = new Date(dia.getTime() + (hh * 60 + mm) * 60000);
        if (inicio < limite) continue;
        const fecha = inicio.toISOString().slice(0, 10);
        const prefijo = offset === 0 ? "Hoy" : offset === 1 ? "Mañana" : `${DIAS_CORTO.at(dow)} ${inicio.getUTCDate()}/${inicio.getUTCMonth() + 1}`;
        todas.push({
          actividadId: act.id,
          actividadNombre: act.nombre,
          cuando: `${fecha}T${h.hora}`,
          etiqueta: `${prefijo} ${h.hora}`,
          orden: inicio.getTime(),
        });
      }
    }
    // Con algo para hoy o mañana alcanza; si no, seguimos buscando más adelante en la semana.
    if (offset >= 1 && todas.length > 0) break;
  }

  const vistos = new Set<string>();
  return todas
    .sort((a, b) => a.orden - b.orden || a.actividadNombre.localeCompare(b.actividadNombre))
    .filter((c) => { const k = `${c.actividadId}|${c.cuando}`; if (vistos.has(k)) return false; vistos.add(k); return true; })
    .slice(0, max)
    .map(({ orden: _orden, ...c }) => c);
}

/** "jueves 8/10 a las 18:00" a partir de "2026-10-08T18:00", relativo a `ahora` (hoy / mañana). */
export function describirCuando(cuando: string, ahora: Date): string {
  const [fecha, hora] = cuando.split("T");
  const localAhora = new Date(ahora.getTime() + OFFSET_AR_MS).toISOString().slice(0, 10);
  const manana = new Date(Date.parse(`${localAhora}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  if (fecha === localAhora) return `hoy a las ${hora}`;
  if (fecha === manana) return `mañana a las ${hora}`;
  const d = new Date(`${fecha}T00:00:00Z`);
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return `el ${dias.at(d.getUTCDay())} ${d.getUTCDate()}/${d.getUTCMonth() + 1} a las ${hora}`;
}
