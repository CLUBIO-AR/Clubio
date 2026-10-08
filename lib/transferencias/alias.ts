// Alias de cobro propio de cada alumno (cuentas_cobro_alumno). Cuando existe, los avisos y el
// estado de cuenta muestran ESE alias y no el general del gym: así la transferencia se
// identifica sola. Si el alumno no tiene uno, se usa el alias del gym como siempre.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Cliente = SupabaseClient<Database>;

/** alumno_id → alias (o CVU si no tiene alias) de todos los alumnos del gym que tengan uno. */
export async function cargarAliasCobro(db: Cliente, gymId: string): Promise<Map<string, string>> {
  const { data } = await db
    .from("cuentas_cobro_alumno")
    .select("alumno_id, alias, cvu")
    .eq("gym_id", gymId)
    .eq("activa", true)
    .is("deleted_at", null);
  const mapa = new Map<string, string>();
  for (const c of data ?? []) {
    const valor = c.alias ?? c.cvu;
    if (valor) mapa.set(c.alumno_id, valor);
  }
  return mapa;
}

export async function aliasCobroDeAlumno(db: Cliente, gymId: string, alumnoId: string): Promise<string | null> {
  const { data } = await db
    .from("cuentas_cobro_alumno")
    .select("alias, cvu")
    .eq("gym_id", gymId)
    .eq("alumno_id", alumnoId)
    .eq("activa", true)
    .is("deleted_at", null)
    .maybeSingle();
  return data?.alias ?? data?.cvu ?? null;
}

/**
 * Alias y CBU/CVU a mostrarle al alumno para transferir: los suyos si tiene cuenta propia
 * (así la transferencia se identifica sola), si no los generales del gym.
 */
export async function datosTransferencia(
  db: Cliente,
  gymId: string,
  alumnoId: string,
  gym: { transferencia_alias?: string | null; transferencia_cbu?: string | null },
): Promise<{ alias: string | null; cbu: string | null }> {
  const { data } = await db
    .from("cuentas_cobro_alumno")
    .select("alias, cvu")
    .eq("gym_id", gymId)
    .eq("alumno_id", alumnoId)
    .eq("activa", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (data) return { alias: data.alias ?? data.cvu, cbu: data.alias ? data.cvu : null };
  return { alias: gym.transferencia_alias?.trim() || null, cbu: gym.transferencia_cbu?.trim() || null };
}
