import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSheetTitleByGid, getSheetValues } from "@/lib/google-sheets";

export type AlumnoImportado = {
  email: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  actividadIndicada: string;
  actividadAsignada: string | null;
  fechaInicio: string | null;
};

function toISODate(d: string): string | null {
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const y = parseInt(yyyy, 10);
  const anioActual = new Date().getFullYear();
  if (y < 1900 || y > anioActual) return null;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

// Corte del día 10: quien se anota hasta el día 10 (inclusive) arranca ese
// mismo mes; a partir del 11 arranca el mes siguiente. Devuelve el 1º del
// mes que corresponda en formato YYYY-MM-DD.
const DIA_CORTE = 10;
function calcularFechaInicio(marca: string): string | null {
  const m = marca.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  let mes = parseInt(mm, 10);
  let anio = parseInt(yyyy, 10);
  if (parseInt(dd, 10) > DIA_CORTE) {
    mes += 1;
    if (mes > 12) { mes = 1; anio += 1; }
  }
  return `${anio}-${String(mes).padStart(2, "0")}-01`;
}

// Mapeo por palabra clave del texto libre del formulario a la actividad real
// del gym — específico de BOX CLUB (CrossFit "Clase"/"Plani" + "Funcional").
// Si no matchea ninguna (ej. "Personalizado", o varias actividades juntas),
// no se asigna actividad y queda para revisión manual.
function matchActividad(
  actividadTexto: string,
  actividadesGym: Array<{ id: string; nombre: string }>
): { id: string; nombre: string } | null {
  // Algunas filas traen una coma colgando sin una segunda actividad real
  // (ej. "CrossFit (Plani), ") — la sacamos antes de chequear si hay varias.
  const texto = actividadTexto.toLowerCase().trim().replace(/,\s*$/, "");
  const buscar = (...keywords: string[]) =>
    actividadesGym.find((a) => keywords.every((k) => a.nombre.toLowerCase().includes(k)));

  if (texto.includes("clase") && !texto.includes(",")) return buscar("cross", "mensual") ?? null;
  if (texto.includes("plani") && !texto.includes(",")) return buscar("plani", "mensual") ?? null;
  if (texto.includes("funcional") && !texto.includes(",")) return buscar("funcional", "mensual") ?? null;
  return null;
}

// Mismo criterio manual que venimos usando para las cargas de BOX CLUB:
// dedupe por email quedándonos con la fila más reciente. Asigna actividad
// (si el texto matchea con alguna keyword conocida) y fecha de inicio según
// el corte del día 10 — no genera la cuota, eso lo hace el cron mensual de
// generación de cuotas cuando llegue el período correspondiente.
export async function importarAlumnosDesdeSheet(
  supabase: SupabaseClient<Database>,
  gymId: string,
  sheetId: string,
  gid: number
): Promise<{ insertados: AlumnoImportado[]; totalFilas: number; error?: string }> {
  const title = await getSheetTitleByGid(sheetId, gid);
  const rows = await getSheetValues(sheetId, `'${title}'!A:F`);

  // Salteamos header (fila 0) y filas vacías/incompletas.
  const dataRows = rows.slice(1).filter((r) => r[1]?.trim() && r[2]?.trim());

  const byEmail = new Map<string, { marca: string; email: string; nombreCompleto: string; telefono: string; fechaNac: string; actividad: string }>();
  for (const r of dataRows) {
    const [marca, emailRaw, nombreCompleto, telefono, fechaNac, actividad] = r;
    const email = (emailRaw ?? "").trim().toLowerCase();
    if (!email) continue;
    byEmail.set(email, {
      marca: marca ?? "",
      email: (emailRaw ?? "").trim(),
      nombreCompleto: (nombreCompleto ?? "").trim(),
      telefono: (telefono ?? "").trim(),
      fechaNac: fechaNac ?? "",
      actividad: (actividad ?? "").trim(),
    });
  }

  const { data: existentes, error: exErr } = await supabase
    .from("alumnos")
    .select("email")
    .eq("gym_id", gymId)
    .is("deleted_at", null);
  if (exErr) return { insertados: [], totalFilas: dataRows.length, error: exErr.message };

  const existingEmails = new Set((existentes ?? []).map((a) => (a.email ?? "").toLowerCase().trim()));
  const nuevos = [...byEmail.values()].filter((r) => !existingEmails.has(r.email.toLowerCase()));

  const { data: actividadesGym } = await supabase
    .from("actividades")
    .select("id, nombre")
    .eq("gym_id", gymId)
    .is("deleted_at", null)
    .eq("activa", true);

  const insertados: AlumnoImportado[] = [];
  for (const r of nuevos) {
    const parts = r.nombreCompleto.replace(/,/g, "").split(/\s+/).filter(Boolean);
    const apellido = parts[0] ?? r.email;
    const nombre = parts.length > 1 ? parts.slice(1).join(" ") : "-";
    const telefono = r.telefono || null;

    const actividad = matchActividad(r.actividad, actividadesGym ?? []);
    const fechaInicio = actividad ? calcularFechaInicio(r.marca) : null;

    const { data: alumnoCreado, error } = await supabase.from("alumnos").insert({
      gym_id: gymId,
      nombre,
      apellido,
      email: r.email,
      telefono,
      fecha_nacimiento: toISODate(r.fechaNac),
      fecha_alta: toISODate(r.marca) ?? undefined,
      notas: actividad
        ? `Importado automáticamente desde Google Sheets — actividad asignada: ${actividad.nombre} (inicio ${fechaInicio})`
        : `Importado automáticamente desde Google Sheets — actividad indicada: ${r.actividad || "sin especificar"} (sin mapear, asignar manualmente)`,
    }).select("id").single();

    if (error || !alumnoCreado) continue;

    if (actividad && fechaInicio) {
      const { error: insErr } = await supabase.from("alumno_actividades").insert({
        gym_id: gymId,
        alumno_id: alumnoCreado.id,
        actividad_id: actividad.id,
        fecha_inicio: fechaInicio,
        activa: true,
      });
      if (insErr) console.error(`[importar-alumnos-sheet] alumno_actividades alumno=${alumnoCreado.id} error:`, insErr.message);
    }

    insertados.push({
      email: r.email, nombre, apellido, telefono,
      actividadIndicada: r.actividad || "Sin especificar",
      actividadAsignada: actividad?.nombre ?? null,
      fechaInicio,
    });
  }

  return { insertados, totalFilas: dataRows.length };
}
