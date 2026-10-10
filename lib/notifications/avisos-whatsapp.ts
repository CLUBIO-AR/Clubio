// Avisos de cuota por WhatsApp (cron enviar-avisos). Decide QUÉ mandar y A QUIÉN:
// - calendario: antes del vencimiento (gym_config.dias_aviso_antes), el día del vencimiento y
//   después (cada aviso_post_vencimiento_dias, hasta max_avisos_post veces);
// - un solo mensaje por alumno (consolidado si tiene varias cuotas) y como mucho 1 por día;
// - nunca entre las 21:00 y las 9:00 de Argentina;
// - no avisa cuotas pagadas, con comprobante en revisión, ni repite la misma etapa.
//
// En modo transferencia usa las plantillas nuevas (whatsapp/templates/*.json), que nombran al
// gym y traen los botones "Copiar alias" / "Ya transferí" / "Ver mi cuenta". Mientras Meta no
// las apruebe, usa las plantillas configuradas en el gym (las de siempre).
import { SignJWT } from "jose";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendNotification, type GymNotificationConfig } from "@/lib/notifications";
import { sendWhatsAppPlantilla, WhatsAppPlantillaNoDisponible } from "@/lib/notifications/channels/whatsapp";
import { datosTransferencia } from "@/lib/transferencias/alias";
import { registrarAvisoEnInbox } from "@/lib/notifications/inbox";
import { cuotasConComprobantePendiente } from "@/lib/comprobantes";

type Admin = SupabaseClient<Database>;

// Nombres de las plantillas nuevas (deben coincidir con whatsapp/templates/*.json).
export const PLANTILLAS = {
  previo: "aviso_cuota_previo_v2",
  previoRecargo: "aviso_cuota_previo_recargo_v2",
  hoy: "aviso_cuota_hoy_v1",
  hoyRecargo: "aviso_cuota_hoy_recargo_v1",
  vencida: "aviso_cuota_vencida_v1",
  multiples: "aviso_cuotas_multiples_v1",
} as const;

const OFFSET_AR_MS = -3 * 60 * 60 * 1000; // Argentina: UTC−3 todo el año
export const HORA_DESDE = 9;
export const HORA_HASTA = 21;

// ── Fechas y calendario (puro, testeable) ───────────────────────────────────

/** Fecha (YYYY-MM-DD) y hora de Argentina. */
export function ahoraArgentina(ahora: Date): { fecha: string; hora: number } {
  const local = new Date(ahora.getTime() + OFFSET_AR_MS);
  return { fecha: local.toISOString().slice(0, 10), hora: local.getUTCHours() };
}

/** Avisos por WhatsApp solo entre las 9:00 y las 21:00 de Argentina. */
export function dentroDeHorario(ahora: Date): boolean {
  const { hora } = ahoraArgentina(ahora);
  return hora >= HORA_DESDE && hora < HORA_HASTA;
}

/** Días desde hoy hasta el vencimiento (negativo si ya venció). */
export function diasHasta(fechaVencimiento: string, hoy: string): number {
  return Math.round((Date.parse(`${fechaVencimiento.slice(0, 10)}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86400000);
}

export type TipoAviso = "previo" | "hoy" | "vencida";
export type Etapa = { tipo: TipoAviso; dias: number };
export const claveEtapa = (e: Etapa) => `${e.tipo}:${e.dias}`;

export type Calendario = { diasAntes: number[]; postDias: number; maxPost: number };
export const CALENDARIO_DEFECTO: Calendario = { diasAntes: [3], postDias: 3, maxPost: 1 };

/** ¿Hoy toca avisar esta cuota? Según los días configurados por el gym. */
export function etapaDeHoy(dias: number, cal: Calendario): Etapa | null {
  if (dias === 0) return { tipo: "hoy", dias };
  if (dias > 0) return cal.diasAntes.includes(dias) ? { tipo: "previo", dias } : null;
  const despues = -dias;
  if (cal.postDias > 0 && despues % cal.postDias === 0 && despues / cal.postDias <= Math.max(cal.maxPost, 0)) {
    return { tipo: "vencida", dias };
  }
  return null;
}

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "sábado 10/10" (con el año si no es el actual). */
export function fechaAviso(iso: string, hoy: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  const anio = a !== Number(hoy.slice(0, 4)) ? `/${a}` : "";
  return `${DIAS_SEMANA[dow]} ${d}/${m}${anio}`;
}

export const mesAnio = (mes: number, anio: number) => `${MESES[mes] ?? mes} ${anio}`;
export const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

/**
 * Meta rechaza variables con saltos de línea, tabulaciones o más de 4 espacios seguidos,
 * y variables vacías.
 */
export function limpiarParametro(valor: string | null | undefined): string {
  const limpio = (valor ?? "").replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim();
  return limpio || "-";
}

// ── Armado del mensaje (puro) ───────────────────────────────────────────────

export type CuotaAviso = {
  id: string;
  mes: number;
  anio: number;
  montoTotal: number;
  montoBase: number;
  fechaVencimiento: string;
  actividad: string | null;
  /** % de recargo que aplica a esta cuota (actividad o gym). 0 = sin recargo. */
  recargoPct: number;
  /** null = no toca hoy, solo acompaña en el consolidado. */
  etapa: Etapa | null;
};

export type MensajeAviso = {
  plantilla: string;
  header: string[];
  body: string[];
  quickReplies: string[];
  /** Línea para el inbox del gym. */
  resumen: string;
};

/** "Titular: X · CBU/CVU: Y" o un texto fijo si el gym no cargó esos datos (la variable no puede ir vacía). */
export function datosCuenta(titular: string | null | undefined, cbu: string | null | undefined): string {
  const partes = [titular?.trim() && `👤 Titular: ${titular.trim()}`, cbu?.trim() && `🏦 CBU/CVU: ${cbu.trim()}`].filter(Boolean);
  return partes.length ? partes.join(" · ") : "Guardá el comprobante de la transferencia.";
}

export function armarAvisoTransferencia(args: {
  gym: string;
  alumno: string;
  alias: string;
  titular?: string | null;
  cbu?: string | null;
  hoy: string;
  cuotas: CuotaAviso[];
}): MensajeAviso {
  const { gym, alumno, hoy, cuotas } = args;
  const p = limpiarParametro;
  const cuenta = datosCuenta(args.titular, args.cbu);
  const botones = (cuotaId?: string) => ["alias", cuotaId ? `transferi:${cuotaId}` : "transferi", "cuenta"];

  if (cuotas.length > 1) {
    const total = cuotas.reduce((acc, c) => acc + c.montoTotal, 0);
    const ordenadas = [...cuotas].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
    const proxima = ordenadas.find((c) => diasHasta(c.fechaVencimiento, hoy) >= 0);
    const linea = proxima
      ? `La próxima vence el *${fechaAviso(proxima.fechaVencimiento, hoy)}*`
      : `La última venció el *${fechaAviso(ordenadas[ordenadas.length - 1].fechaVencimiento, hoy)}*`;
    return {
      plantilla: PLANTILLAS.multiples,
      header: [p(gym)],
      body: [p(alumno), p(gym), String(cuotas.length), pesos(total), p(linea), p(args.alias), p(cuenta)],
      quickReplies: botones(),
      resumen: `📋 Aviso de ${cuotas.length} cuotas pendientes · ${pesos(total)}`,
    };
  }

  const c = cuotas[0];
  const etapa = c.etapa ?? { tipo: "previo" as const, dias: diasHasta(c.fechaVencimiento, hoy) };
  const actividad = p(c.actividad ?? "cuota mensual");
  const recargo = c.recargoPct > 0 ? `${pesos(c.montoBase * c.recargoPct / 100)} (${c.recargoPct}%)` : null;
  const base = [p(alumno), p(gym), p(mesAnio(c.mes, c.anio)), actividad];

  if (etapa.tipo === "vencida") {
    return {
      plantilla: PLANTILLAS.vencida,
      header: [p(gym)],
      body: [...base, fechaAviso(c.fechaVencimiento, hoy), pesos(c.montoTotal), p(args.alias), p(cuenta)],
      quickReplies: botones(c.id),
      resumen: `📋 Recordatorio de cuota vencida · ${mesAnio(c.mes, c.anio)} · ${pesos(c.montoTotal)}`,
    };
  }
  if (etapa.tipo === "hoy") {
    return {
      plantilla: recargo ? PLANTILLAS.hoyRecargo : PLANTILLAS.hoy,
      header: [p(gym)],
      body: [...base, pesos(c.montoTotal), p(args.alias), p(cuenta), ...(recargo ? [recargo] : [])],
      quickReplies: botones(c.id),
      resumen: `📋 Aviso: vence hoy · ${mesAnio(c.mes, c.anio)} · ${pesos(c.montoTotal)}`,
    };
  }
  return {
    plantilla: recargo ? PLANTILLAS.previoRecargo : PLANTILLAS.previo,
    header: [p(gym)],
    body: [...base, fechaAviso(c.fechaVencimiento, hoy), pesos(c.montoTotal), p(args.alias), p(cuenta), ...(recargo ? [recargo] : [])],
    quickReplies: botones(c.id),
    resumen: `📋 Aviso de cuota · ${mesAnio(c.mes, c.anio)} · ${pesos(c.montoTotal)}`,
  };
}

// ── Envío ───────────────────────────────────────────────────────────────────

export type GrupoAviso = {
  alumnoId: string;
  nombre: string;
  telefono: string;
  /**
   * Cuotas abiertas del alumno. Las que tienen etapa son las que hoy "tocan" (y quedan
   * registradas para no repetir); las demás (etapa null) solo suman al aviso consolidado.
   */
  cuotas: Array<{ id: string; etapa: Etapa | null }>;
};

export type ConfigAvisos = GymNotificationConfig & {
  gymNombre: string;
  gymLogoUrl?: string | null;
  colorAcento?: string | null;
  recargoPctGym: number;
  transferencia_cbu?: string | null;
};

export type ResultadoAvisos = { enviados: number; omitidos: Record<string, number> };

// Plantilla nueva que Meta todavía no aprobó en este número: no se reintenta por una hora.
const noDisponibles = new Map<string, number>();
const UNA_HORA = 60 * 60 * 1000;

/**
 * Manda los avisos de WhatsApp del día para un gym. Revalida todo contra la base justo antes
 * de mandar (puede haber cambiado desde que el worker armó la lista). Nunca tira.
 */
export async function enviarAvisosWhatsApp(
  admin: Admin,
  args: { gymId: string; config: ConfigAvisos; grupos: GrupoAviso[]; ahora?: Date },
): Promise<ResultadoAvisos> {
  const { gymId, config } = args;
  const ahora = args.ahora ?? new Date();
  const resultado: ResultadoAvisos = { enviados: 0, omitidos: {} };
  const omitir = (motivo: string) => { resultado.omitidos[motivo] = (resultado.omitidos[motivo] ?? 0) + 1; };

  if (!config.whatsapp_activo || !config.whatsapp_phone_number_id || !config.whatsapp_access_token) return resultado;
  if (!dentroDeHorario(ahora)) {
    args.grupos.forEach(() => omitir("fuera_de_horario"));
    console.log("[avisos-whatsapp] fuera de horario (21 a 9 h), se posterga — gym:", gymId);
    return resultado;
  }
  const { fecha: hoy } = ahoraArgentina(ahora);
  const inicioDia = new Date(Date.parse(`${hoy}T00:00:00Z`) - OFFSET_AR_MS).toISOString();

  for (const grupo of args.grupos) {
    try {
      const ids = grupo.cuotas.map((c) => c.id);
      if (ids.length === 0) continue;

      // Revalidación: siguen abiertas, sin comprobante en revisión, sin esta etapa ya avisada.
      const [{ data: frescas }, enRevision, { data: yaAvisadas }, { count: hoyAlumno }] = await Promise.all([
        admin.from("cuotas")
          .select("id, mes, anio, monto_total, monto_base, estado, fecha_vencimiento, actividades(nombre, recargo_1_porcentaje)")
          .eq("gym_id", gymId).in("id", ids).in("estado", ["pendiente", "vencida"]),
        cuotasConComprobantePendiente(admin, gymId, ids),
        admin.from("avisos_whatsapp_enviados").select("cuota_id, etapa").eq("gym_id", gymId).in("cuota_id", ids),
        admin.from("avisos_whatsapp_enviados").select("id", { count: "exact", head: true })
          .eq("gym_id", gymId).eq("alumno_id", grupo.alumnoId).gte("created_at", inicioDia),
      ]);

      if ((hoyAlumno ?? 0) > 0) { omitir("ya_avisado_hoy"); continue; }
      const avisadas = new Set((yaAvisadas ?? []).map((a) => `${a.cuota_id}|${a.etapa}`));

      const cuotas: CuotaAviso[] = [];
      for (const c of frescas ?? []) {
        const etapa = grupo.cuotas.find((g) => g.id === c.id)!.etapa;
        if (enRevision.has(c.id)) { omitir("comprobante_en_revision"); continue; }
        if (etapa && avisadas.has(`${c.id}|${claveEtapa(etapa)}`)) { omitir("etapa_ya_avisada"); continue; }
        const act = c.actividades as unknown as { nombre: string | null; recargo_1_porcentaje: number | null } | null;
        cuotas.push({
          id: c.id, mes: c.mes, anio: c.anio,
          montoTotal: Number(c.monto_total ?? 0),
          montoBase: Number(c.monto_base ?? c.monto_total ?? 0),
          fechaVencimiento: c.fecha_vencimiento,
          actividad: act?.nombre ?? null,
          recargoPct: Number(act?.recargo_1_porcentaje ?? config.recargoPctGym ?? 0),
          etapa,
        });
      }
      // Si ninguna de las que tocaban hoy sigue en pie, no se avisa (aunque haya otras abiertas).
      if (!cuotas.some((c) => c.etapa)) continue;

      const envio = await mandar(admin, gymId, config, grupo, cuotas, hoy, ahora);
      const disparadoras = cuotas.filter((c): c is CuotaAviso & { etapa: Etapa } => !!c.etapa);
      const etapaLog = cuotas.length > 1 ? "aviso_multiples" : `aviso_${disparadoras[0].etapa.tipo}`;

      await admin.from("notificaciones_log").insert({
        gym_id: gymId, alumno_id: grupo.alumnoId, cuota_id: cuotas[0].id,
        tipo: etapaLog, enviado_a: grupo.telefono, canal: "whatsapp",
        estado: envio.ok ? "enviado" : "error",
        provider_id: envio.waMessageId ?? null,
        error_detail: envio.error ?? null,
        metadata: { plantilla: envio.plantilla, cuotas: cuotas.map((c) => c.id) },
      });
      if (!envio.ok) { omitir("error_meta"); continue; }

      // Una fila por cuota y etapa: es lo que evita duplicados (índice único en la base).
      const { error } = await admin.from("avisos_whatsapp_enviados").insert(disparadoras.map((c) => ({
        gym_id: gymId, alumno_id: grupo.alumnoId, cuota_id: c.id, etapa: claveEtapa(c.etapa),
        plantilla: envio.plantilla, wa_message_id: envio.waMessageId,
      })) as never);
      if (error) console.error("[avisos-whatsapp] aviso enviado pero no se registró:", gymId, error.message);

      await registrarAvisoEnInbox(admin, {
        gymId, alumnoId: grupo.alumnoId, telefono: grupo.telefono, waMessageId: envio.waMessageId,
        tipo: disparadoras.some((c) => c.etapa.tipo === "vencida") ? "recordatorio_vencido" : "aviso_vencimiento",
        cuota: { mes: cuotas[0].mes, anio: cuotas[0].anio, monto_total: cuotas.reduce((a, c) => a + c.montoTotal, 0) },
      });
      resultado.enviados++;
    } catch (err) {
      console.error("[avisos-whatsapp] error — gym:", gymId, "alumno:", grupo.alumnoId, err instanceof Error ? err.message : err);
      omitir("error");
    }
  }

  if (Object.keys(resultado.omitidos).length) console.log("[avisos-whatsapp] omitidos — gym:", gymId, resultado.omitidos);
  return resultado;
}

type Envio = { ok: boolean; waMessageId?: string; plantilla: string; error?: string };

/** Etapa de una cuota según su vencimiento (para avisos manuales, sin mirar el calendario). */
export function etapaSegunVencimiento(fechaVencimiento: string, hoy: string): Etapa {
  const dias = diasHasta(fechaVencimiento, hoy);
  return { tipo: dias > 0 ? "previo" : dias === 0 ? "hoy" : "vencida", dias };
}

/**
 * Aviso de UNA cuota por WhatsApp, mandado a mano desde el dashboard. Arma el mensaje igual
 * que el cron (mismas plantillas y parámetros), para que no falle con "Number of parameters
 * does not match". No mira el horario ni registra la etapa: es un pedido explícito del gym.
 */
export async function enviarAvisoWhatsAppManual(
  admin: Admin,
  args: {
    gymId: string;
    config: ConfigAvisos;
    alumno: { id: string; nombre: string; telefono: string };
    cuota: { id: string; mes: number; anio: number; monto_total: number | null; monto_base: number | null; fecha_vencimiento: string; actividad: string | null; recargoPct: number | null };
    ahora?: Date;
  },
): Promise<Envio> {
  const ahora = args.ahora ?? new Date();
  const { fecha: hoy } = ahoraArgentina(ahora);
  const c = args.cuota;
  const cuota: CuotaAviso = {
    id: c.id, mes: c.mes, anio: c.anio,
    montoTotal: Number(c.monto_total ?? 0),
    montoBase: Number(c.monto_base ?? c.monto_total ?? 0),
    fechaVencimiento: c.fecha_vencimiento,
    actividad: c.actividad,
    recargoPct: Number(c.recargoPct ?? args.config.recargoPctGym ?? 0),
    etapa: etapaSegunVencimiento(c.fecha_vencimiento, hoy),
  };
  const grupo: GrupoAviso = {
    alumnoId: args.alumno.id, nombre: args.alumno.nombre, telefono: args.alumno.telefono,
    cuotas: [{ id: c.id, etapa: cuota.etapa }],
  };
  try {
    return await mandar(admin, args.gymId, args.config, grupo, [cuota], hoy, ahora);
  } catch (err) {
    return { ok: false, plantilla: "desconocida", error: err instanceof Error ? err.message : String(err) };
  }
}

async function mandar(
  admin: Admin, gymId: string, config: ConfigAvisos, grupo: GrupoAviso, cuotas: CuotaAviso[], hoy: string, ahora: Date,
): Promise<Envio> {
  // Alias/CVU propio del alumno si tiene (la transferencia se identifica sola); si no, los del gym.
  const { alias, cbu } = await datosTransferencia(admin, gymId, grupo.alumnoId, config);
  const porTransferencia = config.modo_pago === "transferencia" && !!alias;

  if (porTransferencia) {
    const msg = armarAvisoTransferencia({
      gym: config.gymNombre, alumno: grupo.nombre, alias: alias!, titular: config.transferencia_titular,
      cbu, hoy, cuotas,
    });
    const clave = `${config.whatsapp_phone_number_id}|${msg.plantilla}`;
    if ((noDisponibles.get(clave) ?? 0) < ahora.getTime()) {
      try {
        const id = await sendWhatsAppPlantilla(config, { to: grupo.telefono, plantilla: msg.plantilla, header: msg.header, body: msg.body, quickReplies: msg.quickReplies });
        return { ok: true, waMessageId: id, plantilla: msg.plantilla };
      } catch (err) {
        if (!(err instanceof WhatsAppPlantillaNoDisponible)) {
          return { ok: false, plantilla: msg.plantilla, error: err instanceof Error ? err.message : String(err) };
        }
        noDisponibles.set(clave, ahora.getTime() + UNA_HORA);
        console.warn("[avisos-whatsapp] plantilla", msg.plantilla, "todavía no disponible en Meta — uso la anterior. gym:", gymId);
      }
    }
  }

  // Plantillas configuradas en el gym (las de siempre): link de pago o alias sin botones nuevos.
  const legado = await payloadLegado(gymId, config, grupo, cuotas, porTransferencia);
  legado.alumno.alias_cobro = alias;
  const [r] = await sendNotification({ ...config, email_activo: false }, legado);
  const plantilla = (porTransferencia ? config.whatsapp_template_transferencia : config.whatsapp_template_aviso) ?? "sin_plantilla";
  return r?.ok
    ? { ok: true, waMessageId: r.provider_id, plantilla }
    : { ok: false, plantilla, error: r?.error ?? "No se intentó (canal inactivo)" };
}

async function payloadLegado(
  gymId: string, config: ConfigAvisos, grupo: GrupoAviso, cuotas: CuotaAviso[], porTransferencia: boolean,
): Promise<Parameters<typeof sendNotification>[1]> {
  const vencida = cuotas.some((c) => c.etapa?.tipo === "vencida");
  const tipo = vencida ? "recordatorio_vencido" : "aviso_vencimiento";
  const primera = [...cuotas].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))[0];
  const total = cuotas.reduce((acc, c) => acc + c.montoTotal, 0);
  const actividad = cuotas.length > 1
    ? cuotas.map((c) => `${c.actividad ?? "Cuota mensual"} ${pesos(c.montoTotal)}`).join(" + ")
    : primera.actividad;

  let token: string | undefined;
  let url = "";
  if (!porTransferencia) {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const firmado = cuotas.length > 1
      ? new SignJWT({ type: "lote", cuota_ids: cuotas.map((c) => c.id), gym_id: gymId, alumno_id: grupo.alumnoId, alumno_nombre: grupo.nombre })
      : new SignJWT({ cuota_id: primera.id, gym_id: gymId, alumno_nombre: grupo.nombre, mes: primera.mes, anio: primera.anio, monto: primera.montoTotal });
    const jwt = await firmado.setProtectedHeader({ alg: "HS256" }).setJti(crypto.randomUUID()).setIssuedAt().setExpirationTime("30d").sign(secret);
    token = cuotas.length > 1 ? `lote/${jwt}` : jwt;
    url = `${appUrl}/pagar/${token}`;
  }

  return {
    type: tipo,
    alumno: { nombre: grupo.nombre, telefono: grupo.telefono },
    cuota: {
      mes: primera.mes, anio: primera.anio, monto_total: total,
      pago_url: url, pago_token: token, fecha_vencimiento: primera.fechaVencimiento,
      actividad_nombre: actividad,
    },
    gym: { nombre: config.gymNombre, logo_url: config.gymLogoUrl, color_acento: config.colorAcento },
  };
}

// ── Qué cuotas tocan hoy ────────────────────────────────────────────────────

export type ModoCalendario =
  | { modo: "relativo"; calendario: Calendario }
  | { modo: "fijo"; diasAviso: number[]; diaVencimiento: number; diaUltimoAviso: number | null };

/**
 * Etapa de una cuota hoy, según el modo del gym:
 * - relativo: días antes/después del vencimiento configurados (dias_aviso_antes, etc.);
 * - fijo: solo los días del mes configurados (dias_aviso_fijos); el día de vencimiento es
 *   "hoy" y el día del último aviso, "vencida".
 */
export function etapaSegunModo(modo: ModoCalendario, fechaVencimiento: string, estado: string, hoy: string): Etapa | null {
  const dias = diasHasta(fechaVencimiento, hoy);
  if (modo.modo === "relativo") return etapaDeHoy(dias, modo.calendario);

  const diaHoy = Number(hoy.slice(8, 10));
  if (modo.diaUltimoAviso != null && diaHoy === modo.diaUltimoAviso) {
    return dias < 0 && estado === "vencida" ? { tipo: "vencida", dias } : null;
  }
  if (!modo.diasAviso.includes(diaHoy) || estado !== "pendiente") return null;
  if (dias === 0) return { tipo: "hoy", dias };
  if (dias > 0) return { tipo: "previo", dias };
  return { tipo: "vencida", dias };
}

/** Arma los grupos (uno por alumno) con las cuotas que tocan hoy. */
export async function gruposDelDia(admin: Admin, gymId: string, modo: ModoCalendario, hoy: string): Promise<GrupoAviso[]> {
  const desde = new Date(Date.parse(`${hoy}T00:00:00Z`) - 120 * 86400000).toISOString().slice(0, 10);
  const maxAntes = modo.modo === "relativo" ? Math.max(0, ...modo.calendario.diasAntes) : 62;
  const hasta = new Date(Date.parse(`${hoy}T00:00:00Z`) + maxAntes * 86400000).toISOString().slice(0, 10);

  const { data: cuotas } = await admin
    .from("cuotas")
    .select("id, alumno_id, estado, fecha_vencimiento, alumnos!inner(nombre, telefono, activo, deleted_at)")
    .eq("gym_id", gymId)
    .eq("alumnos.activo", true)
    .in("estado", ["pendiente", "vencida"])
    .gte("fecha_vencimiento", desde)
    .lte("fecha_vencimiento", hasta);

  const grupos = new Map<string, GrupoAviso>();
  for (const c of cuotas ?? []) {
    const alumno = c.alumnos as unknown as { nombre: string; telefono: string | null; deleted_at: string | null } | null;
    if (!alumno?.telefono || alumno.deleted_at) continue;
    // Cuotas futuras que todavía no tocan no acompañan (no se cobra por adelantado).
    const etapa = etapaSegunModo(modo, c.fecha_vencimiento, c.estado, hoy);
    if (!etapa && diasHasta(c.fecha_vencimiento, hoy) > 0) continue;
    const g = grupos.get(c.alumno_id) ?? { alumnoId: c.alumno_id, nombre: alumno.nombre, telefono: alumno.telefono, cuotas: [] };
    g.cuotas.push({ id: c.id, etapa });
    grupos.set(c.alumno_id, g);
  }
  // Solo los alumnos con al menos una cuota que toca hoy.
  return Array.from(grupos.values()).filter((g) => g.cuotas.some((c) => c.etapa));
}
