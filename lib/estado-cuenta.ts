// Estado de cuenta de un alumno: qué debe, cuánto suma y sus últimos pagos.
// Hoy los cargos son las cuotas (con recargos incluidos en monto_total). Cuando existan
// otros cargos (indumentaria, etc.) se suman acá y el bot y el panel los muestran solos.
import { SignJWT } from "jose";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Admin = SupabaseClient<Database>;

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export type ItemCuenta = {
  id: string;
  /** "Octubre 2026 · Cross" o la descripción de una cuota especial. */
  concepto: string;
  monto: number;
  estado: "pendiente" | "vencida" | "pagada" | "pagada_parcial" | "condonada";
  fechaVencimiento: string;
  fechaPago: string | null;
};

export type EstadoCuenta = {
  alumnoId: string;
  alumnoNombre: string;
  alumnoApellido: string;
  pendientes: ItemCuenta[];
  totalAdeudado: number;
  hayVencidas: boolean;
  ultimosPagos: ItemCuenta[];
};

const ABIERTAS = ["pendiente", "vencida", "pagada_parcial"] as const;

export async function obtenerEstadoCuenta(admin: Admin, gymId: string, alumnoId: string): Promise<EstadoCuenta | null> {
  const [{ data: alumno }, { data: abiertas }, { data: pagadas }] = await Promise.all([
    admin.from("alumnos").select("id, nombre, apellido").eq("id", alumnoId).eq("gym_id", gymId).is("deleted_at", null).maybeSingle(),
    admin.from("cuotas")
      .select("id, mes, anio, monto_total, estado, fecha_vencimiento, fecha_pago, tipo, descripcion, actividades(nombre)")
      .eq("gym_id", gymId).eq("alumno_id", alumnoId)
      .in("estado", [...ABIERTAS])
      .order("fecha_vencimiento", { ascending: true }),
    admin.from("cuotas")
      .select("id, mes, anio, monto_total, estado, fecha_vencimiento, fecha_pago, tipo, descripcion, actividades(nombre)")
      .eq("gym_id", gymId).eq("alumno_id", alumnoId)
      .eq("estado", "pagada")
      .order("fecha_pago", { ascending: false, nullsFirst: false })
      .limit(3),
  ]);
  if (!alumno) return null;

  // Cuotas con pago parcial (ej. transferencia por menos): se debe solo lo que falta.
  const parciales = (abiertas ?? []).filter((c) => c.estado === "pagada_parcial").map((c) => c.id);
  const pagadoPorCuota = new Map<string, number>();
  if (parciales.length) {
    const { data: pagos } = await admin.from("pagos").select("cuota_id, monto").in("cuota_id", parciales);
    for (const p of pagos ?? []) pagadoPorCuota.set(p.cuota_id, (pagadoPorCuota.get(p.cuota_id) ?? 0) + Number(p.monto));
  }

  const aItem = (c: NonNullable<typeof abiertas>[number]): ItemCuenta => {
    const actividad = (c.actividades as unknown as { nombre: string } | null)?.nombre;
    const periodo = `${MESES[c.mes] ?? c.mes} ${c.anio}`;
    const concepto = c.tipo && c.tipo !== "mensual" && c.descripcion
      ? c.descripcion
      : actividad ? `${periodo} · ${actividad}` : periodo;
    return {
      id: c.id,
      concepto,
      monto: Math.max(0, Number(c.monto_total ?? 0) - (c.estado === "pagada_parcial" ? pagadoPorCuota.get(c.id) ?? 0 : 0)),
      estado: c.estado,
      fechaVencimiento: c.fecha_vencimiento,
      fechaPago: c.fecha_pago,
    };
  };

  const pendientes = (abiertas ?? []).map(aItem);
  return {
    alumnoId: alumno.id,
    alumnoNombre: alumno.nombre,
    alumnoApellido: alumno.apellido,
    pendientes,
    totalAdeudado: pendientes.reduce((acc, p) => acc + p.monto, 0),
    hayVencidas: pendientes.some((p) => p.estado === "vencida"),
    ultimosPagos: (pagadas ?? []).map(aItem),
  };
}

/** Link "pagar todo" (mismo JWT que usan los avisos consolidados → /pagar/lote/[token]). */
export async function linkPagarTodo(gymId: string, estado: EstadoCuenta): Promise<string | null> {
  const secret = process.env.JWT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!secret || !appUrl || estado.pendientes.length === 0) return null;
  const token = await new SignJWT({
    type: "lote",
    cuota_ids: estado.pendientes.map((p) => p.id),
    gym_id: gymId,
    alumno_id: estado.alumnoId,
    alumno_nombre: estado.alumnoNombre,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));
  return `${appUrl}/pagar/lote/${token}`;
}

const pesos = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
const fecha = (iso: string) => {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
};

/** Texto para WhatsApp (negritas con *…*). `pago` dice cómo pagar lo pendiente. */
export function textoEstadoCuenta(
  e: EstadoCuenta,
  pago: { modo: "link"; url: string | null } | { modo: "transferencia"; alias: string | null; titular?: string | null },
): string {
  const lineas = [`📋 *Estado de cuenta de ${e.alumnoNombre} ${e.alumnoApellido}*`];

  if (e.pendientes.length === 0) {
    lineas.push("", "¡Estás al día! 🙌 No tenés nada pendiente.");
  } else {
    lineas.push("", "*Pendiente:*");
    const MAX = 12;
    for (const p of e.pendientes.slice(0, MAX)) {
      const marca = p.estado === "vencida" ? " ⚠️ vencida" : p.estado === "pagada_parcial" ? " (lo que falta)" : ` (vence ${fecha(p.fechaVencimiento)})`;
      lineas.push(`• ${p.concepto} — ${pesos(p.monto)}${marca}`);
    }
    if (e.pendientes.length > MAX) lineas.push(`• … y ${e.pendientes.length - MAX} más`);
    lineas.push("", `💰 *Total a pagar: ${pesos(e.totalAdeudado)}*`);

    if (pago.modo === "transferencia" && pago.alias) {
      lineas.push("", `Para pagar, transferí a:`, `💳 Alias: *${pago.alias}*${pago.titular ? `\n👤 ${pago.titular}` : ""}`);
    } else if (pago.modo === "link" && pago.url) {
      lineas.push("", `👉 Pagá todo junto acá: ${pago.url}`);
    }
  }

  if (e.ultimosPagos.length > 0) {
    lineas.push("", "*Últimos pagos:*");
    for (const p of e.ultimosPagos) {
      lineas.push(`✅ ${p.concepto} — ${pesos(p.monto)}${p.fechaPago ? ` (pagado ${fecha(p.fechaPago)})` : ""}`);
    }
  }
  return lineas.join("\n");
}
