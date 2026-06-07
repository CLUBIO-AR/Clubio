import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { z } from "zod";

export type Alumno = Database["public"]["Tables"]["alumnos"]["Row"];

const FECHA_ALTA_MAX_DIAS_ATRAS = 90;

const fechaAltaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD").refine((v) => {
  const fecha = new Date(`${v}T00:00:00`);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() - FECHA_ALTA_MAX_DIAS_ATRAS);
  return fecha <= hoy && fecha >= limite;
}, `La fecha de alta no puede ser futura ni mayor a ${FECHA_ALTA_MAX_DIAS_ATRAS} días atrás`);

export const AlumnoInsertSchema = z.object({
  nombre: z.string().min(1, "Requerido"),
  apellido: z.string().min(1, "Requerido"),
  dni: z.string().min(1, "Requerido"),
  email: z.string().email("Email inválido").nullable().optional(),
  telefono: z.string().nullable().optional(),
  fecha_nacimiento: z.string().nullable().optional(),
  fecha_alta: fechaAltaSchema.optional(),
  sucursal_id: z.string().uuid().nullable().optional(),
  monto_cuota_personalizado: z.number().positive().nullable().optional(),
  notas: z.string().nullable().optional(),
});

export const AlumnoUpdateSchema = AlumnoInsertSchema.partial().extend({
  activo: z.boolean().optional(),
  fecha_baja: z.string().nullable().optional(),
});

export type AlumnoInsert = z.infer<typeof AlumnoInsertSchema>;
export type AlumnoUpdate = z.infer<typeof AlumnoUpdateSchema>;

export async function getAlumnos(
  supabase: SupabaseClient<Database>,
  gymId: string,
  opts: { search?: string; activo?: boolean } = {}
) {
  let query = supabase
    .from("alumnos")
    .select("id, nombre, apellido, dni, email, telefono, activo, fecha_alta, monto_cuota_personalizado, sucursal_id, created_at")
    .eq("gym_id", gymId)
    .is("deleted_at", null)
    .order("apellido", { ascending: true });

  if (opts.activo !== undefined) {
    query = query.eq("activo", opts.activo);
  }

  if (opts.search?.trim()) {
    const term = opts.search.trim();
    query = query.or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%,dni.ilike.%${term}%`);
  }

  return query;
}

export async function getAlumnosConCuotaMes(
  supabase: SupabaseClient<Database>,
  gymId: string,
  mes: number,
  anio: number,
  opts: { search?: string; activo?: boolean } = {}
) {
  let query = supabase
    .from("alumnos")
    .select("id, nombre, apellido, dni, email, telefono, activo, fecha_alta, cuotas!left(id, estado, monto_total, mes, anio)")
    .eq("gym_id", gymId)
    .is("deleted_at", null)
    .eq("cuotas.mes", mes)
    .eq("cuotas.anio", anio)
    .order("apellido", { ascending: true });

  if (opts.activo !== undefined) {
    query = query.eq("activo", opts.activo);
  }

  if (opts.search?.trim()) {
    const term = opts.search.trim();
    query = query.or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%,dni.ilike.%${term}%`);
  }

  return query;
}

export async function getAlumnoById(
  supabase: SupabaseClient<Database>,
  gymId: string,
  alumnoId: string
) {
  return supabase
    .from("alumnos")
    .select("*")
    .eq("id", alumnoId)
    .eq("gym_id", gymId)
    .is("deleted_at", null)
    .single();
}

export async function createAlumno(
  supabase: SupabaseClient<Database>,
  gymId: string,
  data: AlumnoInsert
) {
  return supabase
    .from("alumnos")
    .insert({ ...data, gym_id: gymId })
    .select("id")
    .single();
}

export async function updateAlumno(
  supabase: SupabaseClient<Database>,
  gymId: string,
  alumnoId: string,
  data: AlumnoUpdate
) {
  return supabase
    .from("alumnos")
    .update(data)
    .eq("id", alumnoId)
    .eq("gym_id", gymId)
    .is("deleted_at", null)
    .select()
    .single();
}

export async function softDeleteAlumno(
  supabase: SupabaseClient<Database>,
  gymId: string,
  alumnoId: string
) {
  return supabase
    .from("alumnos")
    .update({ deleted_at: new Date().toISOString(), activo: false })
    .eq("id", alumnoId)
    .eq("gym_id", gymId);
}
