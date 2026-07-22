import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// Zod v4 uuid() usa RFC 4122 estricto (rechaza UUIDs sintéticos del seed).
// Usamos regex leniente que solo valida el formato 8-4-4-4-12.
const uuidLenient = z.string().regex(
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  "ID de alumno inválido"
);

export type CuotaTipo = "mensual" | "clase_suelta" | "evento" | "inscripcion" | "personalizada";

export type Cuota = Database["public"]["Tables"]["cuotas"]["Row"];
export type CuotaEstado = Cuota["estado"];

// Cuota con datos del alumno (resultado de join)
export type CuotaConAlumno = Cuota & {
  alumnos: {
    nombre: string;
    apellido: string;
    dni: string;
    email: string | null;
  } | null;
};

export const CuotaManualSchema = z.object({
  alumno_id:        uuidLenient,
  mes:              z.number().int().min(1).max(12),
  anio:             z.number().int().min(2020).max(2099),
  monto_base:       z.number().positive(),
  fecha_vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
  notas:            z.string().nullable().optional(),
});

export const CuotaEspecialSchema = z.object({
  alumno_id:         uuidLenient,
  tipo:              z.enum(["mensual", "clase_suelta", "evento", "inscripcion", "personalizada"]),
  descripcion:       z.string().nullable().optional(),
  mes:               z.number().int().min(1).max(12),
  anio:              z.number().int().min(2020).max(2099),
  monto_base:        z.number().positive(),
  fecha_vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
  notas:             z.string().nullable().optional(),
});

export type CuotaEspecial = z.infer<typeof CuotaEspecialSchema>;

export const CuotaUpdateSchema = z.discriminatedUnion("accion", [
  z.object({
    accion:     z.literal("pagar_manual"),
    metodo_pago: z.enum(["efectivo", "transferencia", "otro"]),
    pagado_por: z.string().min(1).optional(),
    notas:      z.string().nullable().optional(),
  }),
  z.object({
    accion: z.literal("condonar"),
    notas:  z.string().nullable().optional(),
  }),
  z.object({
    accion:     z.literal("actualizar"),
    monto_base: z.number().positive().optional(),
    fecha_vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD").optional(),
    notas:      z.string().nullable().optional(),
  }),
]);

export type CuotaManual = z.infer<typeof CuotaManualSchema>;
export type CuotaUpdate = z.infer<typeof CuotaUpdateSchema>;

export async function getCuotas(
  supabase: SupabaseClient<Database>,
  gymId: string,
  opts: { mes?: number; anio?: number; estado?: CuotaEstado; search?: string; alumnoId?: string; actividadId?: string } = {}
) {
  let query = supabase
    .from("cuotas")
    .select(`
      id, gym_id, alumno_id, mes, anio,
      monto_base, monto_recargo, monto_total,
      estado, fecha_vencimiento, fecha_pago,
      metodo_pago, pagado_por, avisos_enviados,
      recargo_nivel, notas, created_at,
      actividad_id,
      actividades(nombre, color),
      alumnos!alumno_id(nombre, apellido, dni, email)
    `)
    .eq("gym_id", gymId)
    .order("fecha_vencimiento", { ascending: true });

  if (opts.mes)          query = query.eq("mes", opts.mes);
  if (opts.anio)         query = query.eq("anio", opts.anio);
  if (opts.estado)       query = query.eq("estado", opts.estado);
  if (opts.alumnoId)     query = query.eq("alumno_id", opts.alumnoId);
  if (opts.actividadId)  query = query.eq("actividad_id", opts.actividadId);

  if (opts.search?.trim()) {
    // Filtrar por nombre/dni requiere hacerlo en el cliente ya que es un join
    // La query trae todo y filtramos abajo
  }

  return query;
}

export async function getCuotaById(
  supabase: SupabaseClient<Database>,
  gymId: string,
  cuotaId: string
) {
  return supabase
    .from("cuotas")
    .select(`
      *,
      alumnos!alumno_id(nombre, apellido, dni, email, telefono)
    `)
    .eq("id", cuotaId)
    .eq("gym_id", gymId)
    .single();
}

export async function createCuotaManual(
  supabase: SupabaseClient<Database>,
  gymId: string,
  data: CuotaManual
) {
  return supabase
    .from("cuotas")
    .insert({
      gym_id: gymId,
      alumno_id: data.alumno_id,
      mes: data.mes,
      anio: data.anio,
      monto_base: data.monto_base,
      fecha_vencimiento: data.fecha_vencimiento,
      notas: data.notas ?? null,
    })
    .select("id")
    .single();
}

export async function marcarPagadaManual(
  supabase: SupabaseClient<Database>,
  gymId: string,
  cuotaId: string,
  metodo: "efectivo" | "transferencia" | "otro",
  pagadoPor: string | undefined,
  registradoPor: string,
  notas?: string | null
) {
  const now = new Date().toISOString();

  // 1. Actualizar cuota
  const { data: cuota, error: cuotaError } = await supabase
    .from("cuotas")
    .update({
      estado: "pagada",
      fecha_pago: now,
      metodo_pago: metodo,
      pagado_por: pagadoPor ?? null,
      notas: notas ?? null,
    })
    .eq("id", cuotaId)
    .eq("gym_id", gymId)
    .select("alumno_id, monto_total")
    .single();

  if (cuotaError || !cuota) return { error: cuotaError };

  // 2. Registrar en audit trail de pagos
  await supabase.from("pagos").insert({
    gym_id: gymId,
    cuota_id: cuotaId,
    alumno_id: cuota.alumno_id,
    monto: cuota.monto_total ?? 0,
    metodo,
    registrado_por: registradoPor,
  });

  return { error: null };
}

export async function condonarCuota(
  supabase: SupabaseClient<Database>,
  gymId: string,
  cuotaId: string,
  notas?: string | null
) {
  return supabase
    .from("cuotas")
    .update({ estado: "condonada", notas: notas ?? null })
    .eq("id", cuotaId)
    .eq("gym_id", gymId);
}

// --- Generación automática de cuota al alta de alumno ---

export async function generarCuotaAlta(
  alumnoId: string,
  gymId: string
): Promise<{ generada: boolean; motivo: string; cuotaId?: string; mes?: number; anio?: number; monto?: number }> {
  const supabase = createAdminClient();

  const { data: config } = await supabase
    .from("gym_config")
    .select("generar_cuota_al_alta, cuota_alta_proporcional, dias_minimos_para_cuota_alta, monto_base_defecto, dia_vencimiento_mensual")
    .eq("gym_id", gymId)
    .single();

  if (!config?.generar_cuota_al_alta) {
    return { generada: false, motivo: "config_desactivada" };
  }

  const hoy = new Date();
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const diasRestantes = ultimoDia - hoy.getDate() + 1;
  const mes = hoy.getMonth() + 1;
  const anio = hoy.getFullYear();
  const minDias = config.dias_minimos_para_cuota_alta ?? 15;

  if (diasRestantes < minDias) {
    return { generada: false, motivo: `dias_insuficientes: quedan ${diasRestantes} días, mínimo ${minDias}` };
  }

  const { data: alumno } = await supabase
    .from("alumnos")
    .select("monto_cuota_personalizado")
    .eq("id", alumnoId)
    .single();

  const { data: actividadesActivas } = await supabase
    .from("alumno_actividades")
    .select("actividad_id, fecha_inicio")
    .eq("alumno_id", alumnoId)
    .eq("gym_id", gymId)
    .eq("activa", true);

  const hoyStr = hoy.toISOString().split("T")[0];
  const actividadesVigentes = (actividadesActivas ?? []).filter(
    (a) => !a.fecha_inicio || a.fecha_inicio <= hoyStr
  );

  if (!actividadesActivas?.length) {
    return { generada: false, motivo: "sin_actividad" };
  }
  if (!actividadesVigentes.length) {
    return { generada: false, motivo: "fecha_inicio_futura" };
  }

  const montoBase = alumno?.monto_cuota_personalizado ?? config.monto_base_defecto ?? 0;
  if (!montoBase) {
    return { generada: false, motivo: "monto_cero" };
  }

  let montoFinal = montoBase;
  let descripcion = `Cuota ${mes}/${anio}`;

  if (config.cuota_alta_proporcional) {
    montoFinal = Math.round((montoBase / ultimoDia) * diasRestantes);
    descripcion = `Cuota proporcional ${mes}/${anio} (${diasRestantes}/${ultimoDia} días)`;
  }

  const diaVto = config.dia_vencimiento_mensual ?? 10;
  const fechaVtoDate = new Date(anio, mes - 1, diaVto);
  if (fechaVtoDate < hoy) {
    fechaVtoDate.setTime(hoy.getTime() + 5 * 86_400_000);
  }
  const fechaVto = fechaVtoDate.toISOString().split("T")[0];

  const { data: cuotaCreada, error } = await supabase.from("cuotas").insert({
    gym_id: gymId,
    alumno_id: alumnoId,
    mes,
    anio,
    tipo: "mensual",
    descripcion,
    monto_base: montoFinal,
    fecha_vencimiento: fechaVto,
    estado: "pendiente",
  }).select("id").single();

  if (error?.code === "23505") {
    return { generada: false, motivo: "ya_existe" };
  }
  if (error) throw error;

  return { generada: true, motivo: descripcion, cuotaId: cuotaCreada?.id, mes, anio, monto: montoFinal };
}

// --- Helpers usados por los crons ---

export async function generarCuotasMes(
  supabase: SupabaseClient<Database>,
  gymId: string,
  mes: number,
  anio: number
) {
  const [configRes, alumnosRes] = await Promise.all([
    supabase.from("gym_config")
      .select("monto_base_defecto, dia_vencimiento_mensual")
      .eq("gym_id", gymId).single(),
    supabase.from("alumnos")
      .select("id, monto_cuota_personalizado")
      .eq("gym_id", gymId).eq("activo", true).is("deleted_at", null),
  ]);

  if (!configRes.data) return { creadas: 0, error: "Sin configuración" };
  const config = configRes.data;
  const alumnos = alumnosRes.data ?? [];
  if (!alumnos.length) return { creadas: 0, error: null };

  const diaVto = config.dia_vencimiento_mensual ?? 10;
  const fechaVto = `${anio}-${String(mes).padStart(2, "0")}-${String(diaVto).padStart(2, "0")}`;

  // Precargar todas las inscripciones activas del gym en una sola query (evita N+1)
  const finDePeriodo = new Date(anio, mes, 0).toISOString().split("T")[0];

  const { data: todasInscripciones } = await supabase
    .from("alumno_actividades")
    .select("alumno_id, actividad_id, monto_personalizado, fecha_inicio, actividades(monto_base)")
    .eq("gym_id", gymId)
    .eq("activa", true);

  const alumnosConActividad = new Set<string>();
  const inscripcionesPorAlumno = new Map<string, NonNullable<typeof todasInscripciones>>();
  for (const ins of todasInscripciones ?? []) {
    alumnosConActividad.add(ins.alumno_id);
    if (ins.fecha_inicio && ins.fecha_inicio > finDePeriodo) continue; // actividad arranca después del período a facturar
    const list = inscripcionesPorAlumno.get(ins.alumno_id) ?? [];
    list.push(ins);
    inscripcionesPorAlumno.set(ins.alumno_id, list);
  }

  let creadas = 0;

  for (const alumno of alumnos) {
    const inscripciones = inscripcionesPorAlumno.get(alumno.id) ?? [];

    if (alumnosConActividad.has(alumno.id) && inscripciones.length === 0) {
      // Todas sus actividades arrancan después de este período: no facturar todavía
      continue;
    }

    if (inscripciones.length > 0) {
      // Generar una cuota por cada actividad
      for (const ins of inscripciones) {
        const actividadData = ins.actividades as { monto_base: number } | null;
        const monto = ins.monto_personalizado ?? actividadData?.monto_base ?? 0;
        if (!monto) continue;

        const { error } = await supabase.from("cuotas").insert({
          gym_id: gymId,
          alumno_id: alumno.id,
          actividad_id: ins.actividad_id,
          mes,
          anio,
          monto_base: monto,
          fecha_vencimiento: fechaVto,
        });
        if (!error) creadas++;
        else if (error.code !== "23505") {
          console.error(`[generarCuotasMes] gym=${gymId} alumno=${alumno.id} actividad=${ins.actividad_id} error:`, error.message);
        }
      }
    } else {
      // Flujo legacy: cuota única sin actividad
      const monto = alumno.monto_cuota_personalizado ?? config.monto_base_defecto;
      if (!monto) continue;

      const { error } = await supabase.from("cuotas").insert({
        gym_id: gymId,
        alumno_id: alumno.id,
        mes,
        anio,
        monto_base: monto,
        fecha_vencimiento: fechaVto,
      });
      if (!error) creadas++;
      else if (error.code !== "23505") {
        console.error(`[generarCuotasMes] gym=${gymId} alumno=${alumno.id} error:`, error.message);
      }
    }
  }

  return { creadas, error: null };
}

export async function aplicarRecargosGym(
  supabase: SupabaseClient<Database>,
  gymId: string
) {
  const hoy = new Date().toISOString().split("T")[0];

  // 1. Marcar como vencidas las pendientes cuya fecha ya pasó
  await supabase
    .from("cuotas")
    .update({ estado: "vencida" })
    .eq("gym_id", gymId)
    .eq("estado", "pendiente")
    .lt("fecha_vencimiento", hoy);

  // 2. Obtener config de recargos y de desactivación por mora
  const { data: config } = await supabase
    .from("gym_config")
    .select("recargo_1_dias, recargo_1_porcentaje, recargo_2_dias, recargo_2_porcentaje, dias_mora_desactivacion")
    .eq("gym_id", gymId)
    .single();

  if (config?.recargo_1_dias) {
    // 3. Cuotas vencidas sin recargo nivel 1
    const { data: vencidas1 } = await supabase
      .from("cuotas")
      .select("id, monto_base, fecha_vencimiento, recargo_nivel")
      .eq("gym_id", gymId)
      .eq("estado", "vencida")
      .or("recargo_nivel.is.null,recargo_nivel.lt.1");

    for (const c of vencidas1 ?? []) {
      const diasVencida = Math.floor(
        (Date.now() - new Date(c.fecha_vencimiento).getTime()) / 86_400_000
      );
      if (diasVencida >= config.recargo_1_dias) {
        await supabase.from("cuotas").update({
          monto_recargo: (c.monto_base * config.recargo_1_porcentaje) / 100,
          recargo_nivel: 1,
          recargo_aplicado_en: new Date().toISOString(),
        }).eq("id", c.id);
      }
    }

    // 4. Recargo nivel 2 (si configurado)
    if (config.recargo_2_dias && config.recargo_2_porcentaje) {
      const { data: vencidas2 } = await supabase
        .from("cuotas")
        .select("id, monto_base, fecha_vencimiento, recargo_nivel")
        .eq("gym_id", gymId)
        .eq("estado", "vencida")
        .eq("recargo_nivel", 1);

      for (const c of vencidas2 ?? []) {
        const diasVencida = Math.floor(
          (Date.now() - new Date(c.fecha_vencimiento).getTime()) / 86_400_000
        );
        if (diasVencida >= config.recargo_2_dias!) {
          await supabase.from("cuotas").update({
            monto_recargo: (c.monto_base * config.recargo_2_porcentaje!) / 100,
            recargo_nivel: 2,
            recargo_aplicado_en: new Date().toISOString(),
          }).eq("id", c.id);
        }
      }
    }
  }

  // 5. Desactivación automática de alumnos morosos (si el gym la configuró)
  if (config?.dias_mora_desactivacion) {
    const { data: candidatas } = await supabase
      .from("cuotas")
      .select("id, alumno_id, fecha_vencimiento")
      .eq("gym_id", gymId)
      .eq("estado", "vencida")
      .eq("desactivo_alumno", false);

    for (const c of candidatas ?? []) {
      const diasVencida = Math.floor(
        (Date.now() - new Date(c.fecha_vencimiento).getTime()) / 86_400_000
      );
      if (diasVencida < config.dias_mora_desactivacion) continue;

      const { data: alumno } = await supabase
        .from("alumnos")
        .select("activo")
        .eq("id", c.alumno_id)
        .single();

      if (alumno?.activo) {
        await supabase.from("alumnos")
          .update({ activo: false, desactivado_por_mora: true })
          .eq("id", c.alumno_id);
      }
      // Marcamos la cuota igual, esté o no ya inactivo el alumno, para no re-evaluarla en cada corrida.
      await supabase.from("cuotas").update({ desactivo_alumno: true }).eq("id", c.id);
    }
  }
}

// --- Reactivación automática al pagar (solo si la baja fue por mora, no manual) ---

export async function reactivarAlumnoSiCorresponde(
  supabase: SupabaseClient<Database>,
  alumnoId: string
) {
  const { data: alumno } = await supabase
    .from("alumnos")
    .select("desactivado_por_mora")
    .eq("id", alumnoId)
    .single();

  if (alumno?.desactivado_por_mora) {
    await supabase.from("alumnos")
      .update({ activo: true, desactivado_por_mora: false })
      .eq("id", alumnoId);
  }
}
