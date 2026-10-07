// Bot de WhatsApp para consultas (interesados en el gym). Se llama desde el webhook de
// WhatsApp después de guardar el mensaje entrante.
//
// Flujo:
// - Número que no es alumno escribe por primera vez (o después de 24hs sin que el gym le
//   haya escrito): bienvenida con 3 botones (Horarios y precios / Clase de prueba / Hablar
//   con alguien).
// - "Horarios y precios", el ice breaker "…actividades, horarios y precios" o el comando
//   /Ver_todas_las_actividades: todas las actividades con precio y horarios.
// - "Ver una actividad", el ice breaker "…una actividad en especial" o el comando
//   /Ver_una_actividad: lista para elegir una → detalle de esa actividad.
// - "Clase de prueba": propone las próximas clases reales (hoy / mañana) según los horarios
//   cargados en Actividades; al elegir una, confirma el turno y deja el chat sin leer para
//   que el gym lo vea.
// - "Hablar con alguien": confirma y deja el chat sin leer.
// - "Menú principal" (o escribir "menú"): vuelve a la bienvenida.
//
// Los ice breakers, comandos y botones también funcionan para alumnos (los pidieron ellos);
// la bienvenida automática solo sale para números que no son alumnos.
//
// Todo va dentro de la ventana de 24hs que abre el propio mensaje, así que no usa plantillas
// ni tiene costo de Meta. Nunca tira: si algo falla solo se loguea.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendWhatsAppButtons, sendWhatsAppList, sendWhatsAppText } from "@/lib/notifications/channels/whatsapp";
import { describirCuando, proximasClases, resumenHorarios, type Horario } from "@/lib/horarios";
import { linkPagarTodo, obtenerEstadoCuenta, textoEstadoCuenta } from "@/lib/estado-cuenta";
import { aliasCobroDeAlumno } from "@/lib/transferencias/alias";

type Admin = SupabaseClient<Database>;

const BOTON = {
  info: { id: "bot_info", title: "Horarios y precios" },
  prueba: { id: "bot_prueba", title: "Clase de prueba" },
  humano: { id: "bot_humano", title: "Hablar con alguien" },
  menu: { id: "bot_menu", title: "Menú principal" },
  lista: { id: "bot_lista", title: "Ver una actividad" },
  otra: { id: "bot_lista", title: "Ver otra actividad" },
  cuenta: { id: "bot_cuenta", title: "Mi estado de cuenta" },
  // El título tiene "alias": el webhook lo atiende con responderAlias (manda solo el alias).
  alias: { id: "bot_alias", title: "Copiar alias" },
} as const;

// Menú principal (la bienvenida). Los alumnos ven "Mi estado de cuenta" en lugar de la clase de prueba.
export const BOTONES_CONSULTA = [BOTON.info, BOTON.prueba, BOTON.humano] as const;
export const BOTONES_ALUMNO = [BOTON.cuenta, BOTON.info, BOTON.humano] as const;

// Palabras que vuelven a mostrar el menú.
const PALABRAS_MENU = ["menu", "menu principal", "inicio", "opciones"];

// Meta limita el cuerpo de un mensaje con botones o lista a 1024 caracteres.
const MAX_CUERPO_INTERACTIVO = 1024;

const RESPUESTA_PRUEBA =
  "¡Buenísimo! 💪 Contanos qué actividad te interesa y qué días y horarios te quedan cómodos, y te confirmamos la clase de prueba.";
const RESPUESTA_OTRO_HORARIO = "Dale 🙌 Contanos qué día y horario te queda cómodo y te confirmamos.";
const RESPUESTA_HUMANO = "Listo, ya le avisamos al equipo. En un rato te escribe alguien 🙌";
const RESPUESTA_INFO_VACIA = "Ya le avisamos al equipo, en un rato te pasan horarios y precios 🙌";

// Estado de cuenta con DNI. PEDIDO_DNI y DNI_NO_ENCONTRADO también se usan para reconocer,
// en el historial, que el bot está esperando un DNI y cuántos intentos fallaron.
const PEDIDO_DNI = "📇 Para ver tu estado de cuenta, escribime tu *DNI* (solo números).";
const MARCA_PEDIDO_DNI = "escribime tu *DNI*";
const DNI_NO_ENCONTRADO = "No encontramos ese DNI entre los alumnos del gym 🤔 Revisalo y mandalo de nuevo (solo números).";
const MARCA_DNI_NO_ENCONTRADO = "No encontramos ese DNI";
const DNI_OTRO_TELEFONO = "Ese DNI tiene otro teléfono registrado, así que por seguridad no podemos mostrar la cuenta desde este número. Ya le avisamos al gym para que lo revise 🙌";
const DNI_BLOQUEADO = "Hubo varios intentos con un DNI que no coincide. Por seguridad, en un rato te escribe alguien del gym 🙌";
const MAX_INTENTOS_DNI = 3;
const ESPERA_DNI_MIN = 30;

/** "12.345.678" o "12345678" → "12345678"; null si no parece un DNI. */
export function extraerDni(texto: string | undefined): string | null {
  const limpio = (texto ?? "").trim().replace(/[.\s-]/g, "");
  return /^\d{7,8}$/.test(limpio) ? limpio : null;
}

/** Variantes con las que puede estar cargado un DNI en la ficha ("12345678", "12.345.678"). */
function variantesDni(dni: string): string[] {
  const conPuntos = dni.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return Array.from(new Set([dni, conPuntos]));
}

export type MensajeBot = {
  id: string;
  type?: string;
  text?: { body?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string; description?: string };
  };
};

type Accion =
  | { tipo: "todas" }
  | { tipo: "lista" }
  | { tipo: "detalle"; actividadId: string }
  | { tipo: "turnos"; actividadId?: string }
  | { tipo: "confirmar"; actividadId: string; cuando: string }
  | { tipo: "otro_horario" }
  | { tipo: "humano" }
  | { tipo: "menu" }
  | { tipo: "cuenta" }
  | { tipo: "dni"; resultado: ResultadoDni };

/**
 * Resultado de buscar el DNI que mandó la persona (se resuelve al planificar, para saber
 * antes de guardar el mensaje si hay que avisarle al gym).
 * - ok: el DNI es de un alumno y este teléfono es el suyo → se muestra la cuenta.
 * - sin_telefono: el alumno no tiene teléfono cargado → se muestra la cuenta y se avisa al
 *   gym para que cargue este número.
 * - otro_telefono: el alumno tiene OTRO teléfono cargado → no se muestra nada (podría ser
 *   alguien que conoce el DNI de otra persona) y se avisa al gym.
 * - no_encontrado: ningún alumno del gym tiene ese DNI → se pide de nuevo.
 * - bloqueado: demasiados DNI equivocados desde este número → se corta y se avisa al gym.
 */
type ResultadoDni =
  | { estado: "ok" | "sin_telefono" | "otro_telefono"; alumnoId: string }
  | { estado: "no_encontrado" | "bloqueado" };

/** Qué pidió la persona: un botón/lista del bot, un ice breaker, un comando o "menú". */
export function interpretar(message: MensajeBot): Accion | null {
  const respuesta = message.interactive?.button_reply?.id ?? message.interactive?.list_reply?.id;
  if (respuesta?.startsWith("bot_")) {
    const [clave, a, ...resto] = respuesta.split(":");
    switch (clave) {
      case "bot_info": return { tipo: "todas" };
      case "bot_lista": return { tipo: "lista" };
      case "bot_act": return a ? { tipo: "detalle", actividadId: a } : { tipo: "lista" };
      case "bot_prueba": return { tipo: "turnos", actividadId: a || undefined };
      case "bot_turno": {
        const cuando = resto.join(":");
        return a && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(cuando) ? { tipo: "confirmar", actividadId: a, cuando } : { tipo: "turnos" };
      }
      case "bot_turno_otro": return { tipo: "otro_horario" };
      case "bot_humano": return { tipo: "humano" };
      case "bot_menu": return { tipo: "menu" };
      case "bot_cuenta": return { tipo: "cuenta" };
    }
    return null;
  }

  if (message.type !== "text") return null;
  const t = normalizar(message.text?.body);
  // Estado de cuenta: comando /Mi_cuenta o frases comunes.
  if (["mi cuenta", "estado de cuenta", "cuanto debo", "que debo", "mi deuda", "mis cuotas", "cuanto tengo que pagar"].some((f) => t.includes(f))) {
    return { tipo: "cuenta" };
  }
  // Comandos (/Ver_todas_las_actividades) e ice breakers configurados en WhatsApp Manager.
  if (t.includes("ver todas las actividades") || t.includes("actividades horarios y precios")) return { tipo: "todas" };
  if (t.includes("ver una actividad") || t.includes("una actividad en especial") || t.includes("una actividad en particular")) return { tipo: "lista" };
  if (PALABRAS_MENU.includes(t)) return { tipo: "menu" };
  return null;
}

type ActividadBot = {
  id: string;
  nombre: string;
  monto_base: number;
  descripcion: string | null;
  horarios: Horario[];
  clase_prueba: boolean;
};

type Config = {
  whatsapp_phone_number_id: string | null;
  whatsapp_access_token: string | null;
  whatsapp_bot_bienvenida: string | null;
  whatsapp_bot_info: string | null;
  email_modo: string | null;
  transferencia_alias: string | null;
  transferencia_titular: string | null;
};

type Contexto = {
  admin: Admin;
  config: Config;
  gymId: string;
  telefono: string;
  alumnoId: string | null;
  nombre: string | null;
  ahora: Date;
  actividades: () => Promise<ActividadBot[]>;
};

type Boton = { id: string; title: string };

/** Lo que el bot va a hacer con un mensaje entrante (o null si no le corresponde responder). */
export type PlanBot = { ctx: Contexto; accion: Accion | { tipo: "bienvenida" } };

type ArgsBot = { gymId: string; telefono: string; alumnoId: string | null; message: MensajeBot; perfilNombre?: string | null; ahora?: Date };

/**
 * Decide qué hace el bot, sin mandar nada todavía. El webhook lo llama antes de guardar el
 * mensaje entrante para saber si lo resuelve el bot solo (queda leído y no avisa al gym)
 * o si necesita a una persona (queda sin leer y suena la notificación).
 */
export async function planificarBot(admin: Admin, args: ArgsBot): Promise<PlanBot | null> {
  const { gymId, telefono, alumnoId, message } = args;
  let accion: Accion | null = interpretar(message);
  const dni = !accion && message.type === "text" ? extraerDni(message.text?.body) : null;

  // Sin un pedido explícito, el bot solo saluda a números que no son alumnos y escriben texto
  // (o responde un DNI si se lo acaba de pedir).
  if (!accion && !dni && (alumnoId || message.type !== "text")) return null;

  const { data: config } = await admin
    .from("gym_config")
    .select("whatsapp_phone_number_id, whatsapp_access_token, whatsapp_bot_activo, whatsapp_bot_bienvenida, whatsapp_bot_info, email_modo, transferencia_alias, transferencia_titular")
    .eq("gym_id", gymId)
    .maybeSingle();
  if (!config?.whatsapp_bot_activo) return null;

  let cache: ActividadBot[] | null = null;
  const ctx: Contexto = {
    admin, config, gymId, telefono, alumnoId,
    nombre: primerNombre(args.perfilNombre),
    ahora: args.ahora ?? new Date(),
    actividades: async () => {
      if (cache) return cache;
      const { data } = await admin
        .from("actividades")
        .select("id, nombre, monto_base, descripcion, horarios, clase_prueba")
        .eq("gym_id", gymId)
        .eq("activa", true)
        .is("deleted_at", null)
        .order("nombre");
      cache = (data ?? []) as ActividadBot[];
      return cache;
    },
  };

  if (!accion && dni) {
    // Un número suelto solo es un DNI si el bot lo pidió hace poco; si no, es charla normal.
    const desdeDni = new Date(ctx.ahora.getTime() - ESPERA_DNI_MIN * 60000).toISOString();
    const { count: pedidos } = await admin
      .from("mensajes_whatsapp")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", gymId).eq("telefono", telefono).eq("direccion", "saliente")
      .ilike("cuerpo", `%${MARCA_PEDIDO_DNI}%`)
      .gte("created_at", desdeDni);
    if ((pedidos ?? 0) > 0) accion = { tipo: "dni", resultado: await buscarDni(admin, gymId, telefono, dni, ctx.ahora) };
    else if (alumnoId) return null;
  }

  if (accion) return { ctx, accion };

  // Bienvenida: solo si en las últimas 24hs no le escribimos nada (ni el bot ni el gym),
  // para no interrumpir una conversación que ya está atendiendo una persona. Los mensajes
  // de una conversación eliminada desde el inbox no cuentan: el gym la dio por cerrada.
  const desde = new Date(ctx.ahora.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("mensajes_whatsapp")
    .select("id", { count: "exact", head: true })
    .eq("gym_id", gymId)
    .eq("telefono", telefono)
    .eq("direccion", "saliente")
    .is("deleted_at", null)
    .gte("created_at", desde);
  if ((count ?? 0) > 0) return null;

  return { ctx, accion: { tipo: "bienvenida" } };
}

/**
 * ¿El bot lo resuelve sin que intervenga nadie del gym? Necesitan a una persona: "Hablar
 * con alguien", la reserva de una clase de prueba y "otro día u horario".
 */
export function resuelveSinPersona(plan: PlanBot): boolean {
  const a = plan.accion;
  if (a.tipo === "dni") return a.resultado.estado === "ok" || a.resultado.estado === "no_encontrado";
  return !["humano", "confirmar", "otro_horario"].includes(a.tipo);
}

async function buscarDni(admin: Admin, gymId: string, telefono: string, dni: string, ahora: Date): Promise<ResultadoDni> {
  // Tope de intentos: evita que alguien pruebe DNIs hasta dar con uno.
  const desde = new Date(ahora.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { count: fallidos } = await admin
    .from("mensajes_whatsapp")
    .select("id", { count: "exact", head: true })
    .eq("gym_id", gymId).eq("telefono", telefono).eq("direccion", "saliente")
    .ilike("cuerpo", `${MARCA_DNI_NO_ENCONTRADO}%`)
    .gte("created_at", desde);
  if ((fallidos ?? 0) >= MAX_INTENTOS_DNI) return { estado: "bloqueado" };

  const { data: alumno } = await admin
    .from("alumnos")
    .select("id, telefono")
    .eq("gym_id", gymId)
    .in("dni", variantesDni(dni))
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!alumno) return { estado: "no_encontrado" };

  const tel = (alumno.telefono ?? "").replace(/\D/g, "");
  if (!tel) return { estado: "sin_telefono", alumnoId: alumno.id };
  if (tel.slice(-10) === telefono.replace(/\D/g, "").slice(-10)) return { estado: "ok", alumnoId: alumno.id };
  return { estado: "otro_telefono", alumnoId: alumno.id };
}

/** Manda la respuesta del bot. Devuelve false si falló (para que el gym lo vea y conteste). */
export async function ejecutarPlan(plan: PlanBot): Promise<boolean> {
  try {
    if (plan.accion.tipo === "bienvenida") await mandarBienvenida(plan.ctx);
    else await ejecutar(plan.ctx, plan.accion);
    return true;
  } catch (err) {
    console.error("[bot-consultas] error — gym:", plan.ctx.gymId, "telefono:", plan.ctx.telefono, err instanceof Error ? err.message : err);
    return false;
  }
}

/** Planifica y ejecuta en un paso (usado por los tests y por quien no necesita decidir antes). */
export async function responderConBot(admin: Admin, args: ArgsBot): Promise<void> {
  try {
    const plan = await planificarBot(admin, args);
    if (plan) await ejecutarPlan(plan);
  } catch (err) {
    console.error("[bot-consultas] error — gym:", args.gymId, "telefono:", args.telefono, err instanceof Error ? err.message : err);
  }
}

async function ejecutar(ctx: Contexto, accion: Accion): Promise<void> {
  switch (accion.tipo) {
    case "menu": return mandarBienvenida(ctx);
    case "todas": return mandarTodas(ctx);
    case "lista": return mandarLista(ctx);
    case "detalle": return mandarDetalle(ctx, accion.actividadId);
    case "turnos": return mandarTurnos(ctx, accion.actividadId);
    case "confirmar": return confirmarTurno(ctx, accion.actividadId, accion.cuando);
    case "otro_horario": return enviar(ctx, RESPUESTA_OTRO_HORARIO);
    case "humano": return enviar(ctx, RESPUESTA_HUMANO, [BOTON.info, BOTON.menu]);
    case "cuenta": return enviar(ctx, PEDIDO_DNI);
    case "dni": return responderDni(ctx, accion.resultado);
  }
}

// ── Respuestas ──────────────────────────────────────────────────────────────

async function mandarBienvenida(ctx: Contexto): Promise<void> {
  const { data: gym } = await ctx.admin.from("gyms").select("nombre").eq("id", ctx.gymId).maybeSingle();
  const plantilla = ctx.config.whatsapp_bot_bienvenida?.trim()
    || `¡Hola {nombre}! 👋 Gracias por escribir a ${gym?.nombre ?? "nuestro gimnasio"}. ¿En qué te podemos ayudar?`;
  await enviar(ctx, personalizar(plantilla, ctx.nombre), ctx.alumnoId ? [...BOTONES_ALUMNO] : [...BOTONES_CONSULTA]);
  console.log("[bot-consultas] menú enviado — gym:", ctx.gymId, "a:", ctx.telefono);
}

const pesos = (n: number) => `$${Number(n).toLocaleString("es-AR")}`;

function bloqueActividad(a: ActividadBot, conDescripcion: boolean): string {
  const lineas = [`*${a.nombre}* — ${pesos(a.monto_base)}/mes`];
  const horarios = resumenHorarios(a.horarios);
  if (horarios) lineas.push(`🗓 ${horarios}`);
  if (conDescripcion && a.descripcion?.trim()) lineas.push(a.descripcion.trim());
  return lineas.join("\n");
}

async function mandarTodas(ctx: Contexto): Promise<void> {
  const actividades = await ctx.actividades();
  const extra = ctx.config.whatsapp_bot_info?.trim();

  if (actividades.length === 0) {
    // Sin actividades cargadas: el texto libre de Configuración, como antes.
    if (!extra) return enviar(ctx, RESPUESTA_INFO_VACIA, [BOTON.prueba, BOTON.menu]);
    await enviarLargo(ctx, extra, [BOTON.prueba, BOTON.humano]);
  } else {
    const partes = ["🏋️ *Nuestras actividades*", ...actividades.map((a) => bloqueActividad(a, false))];
    if (extra) partes.push(extra);
    const direccion = await direccionPrincipal(ctx);
    if (direccion && !extra?.includes(direccion)) partes.push(`📍 ${direccion}`);
    const siguientes = actividades.length > 1 ? [BOTON.lista, BOTON.prueba, BOTON.humano] : [BOTON.prueba, BOTON.humano, BOTON.menu];
    await enviarLargo(ctx, partes.join("\n\n"), siguientes);
  }
}

async function mandarLista(ctx: Contexto): Promise<void> {
  const actividades = await ctx.actividades();
  if (actividades.length === 0) return enviar(ctx, RESPUESTA_INFO_VACIA, [BOTON.prueba, BOTON.menu]);
  if (actividades.length === 1) return mandarDetalle(ctx, actividades[0].id);

  await enviarLista(ctx, "¿Sobre qué actividad querés saber? 👇", "Ver actividades",
    actividades.slice(0, 10).map((a) => ({
      id: `bot_act:${a.id}`,
      title: a.nombre,
      description: [`${pesos(a.monto_base)}/mes`, resumenHorarios(a.horarios)].filter(Boolean).join(" · "),
    })));
}

async function mandarDetalle(ctx: Contexto, actividadId: string): Promise<void> {
  const actividades = await ctx.actividades();
  const a = actividades.find((x) => x.id === actividadId);
  if (!a) return mandarLista(ctx);

  const botones: Boton[] = [];
  if (a.clase_prueba) botones.push({ id: `bot_prueba:${a.id}`, title: BOTON.prueba.title });
  if (actividades.length > 1) botones.push(BOTON.otra);
  botones.push(BOTON.menu);
  await enviarLargo(ctx, bloqueActividad(a, true), botones.slice(0, 3));
}

async function mandarTurnos(ctx: Contexto, actividadId?: string): Promise<void> {
  const actividades = (await ctx.actividades()).filter((a) => a.clase_prueba && (!actividadId || a.id === actividadId));
  const turnos = proximasClases(actividades, ctx.ahora, { max: 9 });

  if (turnos.length === 0) {
    // Sin horarios cargados: se coordina a mano, como antes.
    return enviar(ctx, RESPUESTA_PRUEBA, [BOTON.info, BOTON.menu]);
  }

  const unaSola = new Set(turnos.map((t) => t.actividadId)).size === 1;
  const saludo = ctx.nombre ? `¡Buenísimo, ${ctx.nombre}! 💪` : "¡Buenísimo! 💪";
  const de = unaSola ? ` de *${turnos[0].actividadNombre}*` : "";
  await enviarLista(ctx, `${saludo} Estas son las próximas clases${de}. ¿Cuál te queda bien?`, "Elegir horario", [
    ...turnos.map((t) => ({
      id: `bot_turno:${t.actividadId}:${t.cuando}`,
      title: t.etiqueta,
      // Siempre con la actividad: así el gym ve en el panel "Hoy 18:00 — Funcional".
      description: t.actividadNombre,
    })),
    { id: "bot_turno_otro", title: "Otro día u horario" },
  ]);
}

async function confirmarTurno(ctx: Contexto, actividadId: string, cuando: string): Promise<void> {
  const a = (await ctx.actividades()).find((x) => x.id === actividadId);
  if (!a) return mandarTurnos(ctx);
  const direccion = await direccionPrincipal(ctx);
  const lineas = [
    `¡Listo${ctx.nombre ? `, ${ctx.nombre}` : ""}! 🙌 Te esperamos ${describirCuando(cuando, ctx.ahora)} para tu clase de prueba de *${a.nombre}*.`,
    direccion ? `📍 ${direccion}` : null,
    "Si al final no podés venir, avisanos por acá.",
  ].filter(Boolean);
  // El mensaje entrante (el horario elegido) queda sin leer: el gym ve la reserva en el panel.
  await enviar(ctx, lineas.join("\n"), [BOTON.menu]);
}

/** Respuesta al DNI que mandó la persona (ver ResultadoDni). */
async function responderDni(ctx: Contexto, r: ResultadoDni): Promise<void> {
  switch (r.estado) {
    case "no_encontrado": return enviar(ctx, DNI_NO_ENCONTRADO, [BOTON.humano, BOTON.menu]);
    case "bloqueado": return enviar(ctx, DNI_BLOQUEADO);
    case "otro_telefono": return enviar(ctx, DNI_OTRO_TELEFONO, [BOTON.menu]);
    case "ok":
    case "sin_telefono":
      return mandarEstadoCuenta(ctx, r.alumnoId);
  }
}

async function mandarEstadoCuenta(ctx: Contexto, alumnoId: string): Promise<void> {
  const estado = await obtenerEstadoCuenta(ctx.admin, ctx.gymId, alumnoId);
  if (!estado) return enviar(ctx, RESPUESTA_HUMANO, [BOTON.menu]);

  // Si el alumno tiene alias propio, ese: así la transferencia se identifica sola.
  const alias = (await aliasCobroDeAlumno(ctx.admin, ctx.gymId, alumnoId)) ?? ctx.config.transferencia_alias;
  const porTransferencia = ctx.config.email_modo === "transferencia" && !!alias;
  const texto = textoEstadoCuenta(estado, porTransferencia
    ? { modo: "transferencia", alias, titular: ctx.config.transferencia_titular }
    : { modo: "link", url: await linkPagarTodo(ctx.gymId, estado) });

  const botones: Boton[] = porTransferencia && estado.pendientes.length > 0
    ? [BOTON.alias, BOTON.humano, BOTON.menu]
    : [BOTON.humano, BOTON.menu];
  await enviarLargo(ctx, texto, botones);
}

async function direccionPrincipal(ctx: Contexto): Promise<string | null> {
  const { data } = await ctx.admin
    .from("sucursales")
    .select("direccion")
    .eq("gym_id", ctx.gymId)
    .eq("activa", true)
    .is("deleted_at", null)
    .order("es_principal", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.direccion?.trim() || null;
}

// ── Envío + registro en el inbox ────────────────────────────────────────────

/** Texto (con botones si entra en el límite; si no, el texto y los botones en dos mensajes). */
async function enviarLargo(ctx: Contexto, cuerpo: string, botones: Boton[]): Promise<void> {
  if (cuerpo.length <= MAX_CUERPO_INTERACTIVO) return enviar(ctx, cuerpo, botones);
  await enviar(ctx, cuerpo);
  await enviar(ctx, "¿Querés algo más? 👇", botones);
}

async function enviar(ctx: Contexto, cuerpo: string, botones?: Boton[]): Promise<void> {
  const waMessageId = botones?.length
    ? await sendWhatsAppButtons(ctx.config, { to: ctx.telefono, body: cuerpo, buttons: botones })
    : await sendWhatsAppText(ctx.config, { to: ctx.telefono, body: cuerpo });
  await registrar(ctx, botones?.length ? `${cuerpo}\n${botones.map((b) => `[${b.title}]`).join(" ")}` : cuerpo, waMessageId);
}

async function enviarLista(
  ctx: Contexto,
  cuerpo: string,
  boton: string,
  filas: Array<{ id: string; title: string; description?: string }>,
): Promise<void> {
  const waMessageId = await sendWhatsAppList(ctx.config, { to: ctx.telefono, body: cuerpo, button: boton, rows: filas });
  await registrar(ctx, `${cuerpo}\n${filas.map((f) => `• ${f.title}${f.description ? ` (${f.description})` : ""}`).join("\n")}`, waMessageId);
}

async function registrar(ctx: Contexto, cuerpo: string, waMessageId: string): Promise<void> {
  const { error } = await ctx.admin.from("mensajes_whatsapp").insert({
    gym_id: ctx.gymId,
    alumno_id: ctx.alumnoId,
    telefono: ctx.telefono,
    direccion: "saliente",
    cuerpo,
    wa_message_id: waMessageId,
    estado: "enviado",
  });
  if (error) console.error("[bot-consultas] respuesta enviada pero no se guardó en el inbox:", error.message);
}

// ── Utilidades ──────────────────────────────────────────────────────────────

function normalizar(texto: string | undefined): string {
  return (texto ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_\-/]+/g, " ")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Primer nombre del perfil de WhatsApp, solo letras ("Juan ⚡ Pérez" → "Juan"). */
export function primerNombre(perfil: string | null | undefined): string | null {
  const palabra = (perfil ?? "").replace(/[^\p{L}\p{M}\s'-]/gu, " ").trim().split(/\s+/)[0] ?? "";
  if (palabra.length < 2 || palabra.length > 20) return null;
  return palabra.charAt(0).toLocaleUpperCase("es-AR") + palabra.slice(1);
}

/** Reemplaza {nombre} en el texto del gym; si no sabemos el nombre, lo saca prolijo ("Hola {nombre}!" → "Hola!"). */
export function personalizar(texto: string, nombre: string | null): string {
  return nombre
    ? texto.replace(/\{nombre\}/gi, nombre)
    : texto.replace(/\s*\{nombre\}/gi, "");
}
