import { describe, it, expect, vi, beforeEach } from "vitest";

const sendWhatsAppButtons = vi.fn(async () => "wamid.botones");
const sendWhatsAppText = vi.fn(async () => "wamid.texto");
const sendWhatsAppList = vi.fn(async () => "wamid.lista");
const sendWhatsAppUbicacion = vi.fn(async () => "wamid.ubicacion");
vi.mock("@/lib/notifications/channels/whatsapp", () => ({
  sendWhatsAppButtons: (...a: unknown[]) => sendWhatsAppButtons(...(a as [])),
  sendWhatsAppText: (...a: unknown[]) => sendWhatsAppText(...(a as [])),
  sendWhatsAppList: (...a: unknown[]) => sendWhatsAppList(...(a as [])),
  sendWhatsAppUbicacion: (...a: unknown[]) => sendWhatsAppUbicacion(...(a as [])),
}));

import { responderConBot, primerNombre, personalizar, interpretar, planificarBot, resuelveSinPersona, truncar } from "@/lib/bot-consultas";

type Config = {
  whatsapp_bot_activo: boolean; whatsapp_bot_info?: string | null; whatsapp_bot_bienvenida?: string | null;
  whatsapp_bot_recomendaciones?: string | null; whatsapp_bot_latitud?: number | null; whatsapp_bot_longitud?: number | null;
};
type Act = { id: string; nombre: string; monto_base: number; descripcion: string | null; horarios: { dias: number[]; hora: string }[]; clase_prueba: boolean; cupo_prueba?: number | null };
type Reserva = { id: string; actividad_id: string; telefono: string; inicio: string; estado: string };

// Cliente Supabase falso: alcanza para las consultas que hace el bot.
function fakeAdmin(config: Config, { salientesRecientes = 0, actividades = [] as Act[], reservas = [] as Reserva[], rpc = "11111111-1111-1111-1111-111111111111" as string | null } = {}) {
  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
  const updates: Array<{ table: string; values: Record<string, unknown> }> = [];
  const rpcs: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const from = (table: string) => {
    let esUpdate = false;
    let values: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    Object.assign(b, {
      select: () => b, eq: () => b, gte: () => b, is: () => b, order: () => b, limit: () => b, in: () => b,
      update: (v: Record<string, unknown>) => { esUpdate = true; values = v; return b; },
      insert: (row: Record<string, unknown>) => { inserts.push({ table, row }); return Promise.resolve({ error: null }); },
      upsert: () => Promise.resolve({ error: null }),
      ilike: () => b,
      maybeSingle: () => Promise.resolve({
        data: table === "gym_config"
          ? { whatsapp_phone_number_id: "123", whatsapp_access_token: "tok", ...config }
          : table === "gyms" ? { nombre: "Box Club" }
          : table === "sucursales" ? { direccion: "Av. Siempreviva 742" }
          : table === "reservas_prueba" ? (reservas[0] ?? null) : null,
      }),
      then: (resolve: (v: unknown) => void) => {
        if (esUpdate) { updates.push({ table, values }); return resolve({ error: null }); }
        if (table === "actividades") return resolve({ data: actividades, error: null });
        if (table === "reservas_prueba") return resolve({ data: reservas.filter((r) => r.estado === "activa"), error: null });
        return resolve({ count: salientesRecientes, error: null });
      },
    });
    return b;
  };
  const admin = { from, rpc: (fn: string, args: Record<string, unknown>) => { rpcs.push({ fn, args }); return Promise.resolve({ data: rpc, error: null }); } };
  return { admin: admin as never, inserts, updates, rpcs };
}

const TEL = "5493624000000";
const texto = (body: string) => ({ id: "wamid.in", type: "text", text: { body } });
const boton = (id: string) => ({ id: "wamid.in", type: "interactive", interactive: { button_reply: { id } } });
const fila = (id: string) => ({ id: "wamid.in", type: "interactive", interactive: { list_reply: { id } } });
const titulos = (call: unknown[]) => ((call[1] as { buttons: Array<{ title: string }> }).buttons).map((b) => b.title);
const filas = (call: unknown[]) => ((call[1] as { rows: Array<{ id: string; title: string }> }).rows);

// Miércoles 7/10/2026 15:00 en Argentina.
const AHORA = new Date("2026-10-07T18:00:00Z");
const FUNCIONAL: Act = { id: "f1", nombre: "Funcional", monto_base: 25000, descripcion: "Circuito para todos los niveles", horarios: [{ dias: [1, 3, 5], hora: "18:00" }], clase_prueba: true };
const PILATES: Act = { id: "p1", nombre: "Pilates", monto_base: 20000, descripcion: null, horarios: [{ dias: [2, 4], hora: "19:00" }], clase_prueba: true };

describe("interpretar", () => {
  it("reconoce los ice breakers y comandos de WhatsApp Manager", () => {
    expect(interpretar(texto("Hola! me interesa conocer sobre actividades, horarios y precios."))).toEqual({ tipo: "todas" });
    expect(interpretar(texto("Hola! me interesa conocer sobre una actividad en especial."))).toEqual({ tipo: "lista" });
    expect(interpretar(texto("/Ver_todas_las_actividades"))).toEqual({ tipo: "todas" });
    expect(interpretar(texto("/Ver_una_actividad"))).toEqual({ tipo: "lista" });
    expect(interpretar(texto("Menú"))).toEqual({ tipo: "menu" });
    expect(interpretar(texto("hola, cuánto sale?"))).toBeNull();
  });
  it("lee los ids de botones y listas", () => {
    expect(interpretar(fila("bot_turno:f1:2026-10-07T18:00"))).toEqual({ tipo: "confirmar", actividadId: "f1", cuando: "2026-10-07T18:00" });
    expect(interpretar(boton("bot_prueba:f1"))).toEqual({ tipo: "turnos", actividadId: "f1" });
  });
});

describe("responderConBot", () => {
  beforeEach(() => { sendWhatsAppButtons.mockClear(); sendWhatsAppText.mockClear(); sendWhatsAppList.mockClear(); });

  it("no hace nada si el bot está apagado", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: false });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: texto("Hola") });
    expect(sendWhatsAppButtons).not.toHaveBeenCalled();
  });

  it("saluda con el nombre y 3 botones a un número que no es alumno, y lo guarda en el inbox", async () => {
    const { admin, inserts } = fakeAdmin({ whatsapp_bot_activo: true });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: texto("Hola"), perfilNombre: "juan ⚡ Pérez" });
    const call = sendWhatsAppButtons.mock.calls[0] as unknown[];
    expect((call[1] as { body: string }).body).toContain("¡Hola Juan!");
    expect(titulos(call)).toEqual(["Horarios y precios", "Clase de prueba", "Hablar con alguien"]);
    expect(inserts[0].row).toMatchObject({ direccion: "saliente", wa_message_id: "wamid.botones" });
  });

  it("no repite la bienvenida si ya le escribimos en las últimas 24 hs", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true }, { salientesRecientes: 1 });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: texto("Hola") });
    expect(sendWhatsAppButtons).not.toHaveBeenCalled();
  });

  it("no saluda a un alumno, pero sí responde si usa un ice breaker", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true }, { actividades: [FUNCIONAL, PILATES] });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: texto("Hola") });
    expect(sendWhatsAppButtons).not.toHaveBeenCalled();
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: texto("/Ver_todas_las_actividades") });
    expect(sendWhatsAppButtons).toHaveBeenCalledTimes(1);
  });

  it("todas las actividades: precio, horarios y dirección, con los próximos pasos", async () => {
    const { admin, updates } = fakeAdmin({ whatsapp_bot_activo: true }, { actividades: [FUNCIONAL, PILATES] });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: boton("bot_info") });
    const call = sendWhatsAppButtons.mock.calls[0] as unknown[];
    const body = (call[1] as { body: string }).body;
    expect(body).toContain("*Funcional* — $25.000/mes");
    expect(body).toContain("🗓 Lun, Mié y Vie · 18:00");
    expect(body).toContain("📍 Av. Siempreviva 742");
    expect(titulos(call)).toEqual(["Ver una actividad", "Clase de prueba", "Hablar con alguien"]);
    expect(updates).toHaveLength(0); // lo marca leído el webhook al guardarlo (ver resuelveSinPersona)
  });

  it("sin actividades cargadas usa el texto de Configuración", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true, whatsapp_bot_info: "Funcional 18 h" });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: boton("bot_info") });
    expect((sendWhatsAppButtons.mock.calls[0] as unknown[])[1]).toMatchObject({ body: "Funcional 18 h" });
  });

  it("una actividad: lista para elegir y después el detalle con clase de prueba", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true }, { actividades: [FUNCIONAL, PILATES] });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: texto("Hola! me interesa conocer sobre una actividad en especial.") });
    expect(filas(sendWhatsAppList.mock.calls[0] as unknown[]).map((r) => r.id)).toEqual(["bot_act:f1", "bot_act:p1"]);

    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: fila("bot_act:f1") });
    const call = sendWhatsAppButtons.mock.calls[0] as unknown[];
    expect((call[1] as { body: string }).body).toContain("Circuito para todos los niveles");
    expect(titulos(call)).toEqual(["Clase de prueba", "Ver otra actividad", "Menú principal"]);
  });

  it("clase de prueba: propone los próximos horarios reales y confirma el elegido", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true }, { actividades: [FUNCIONAL, PILATES] });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: boton("bot_prueba"), ahora: AHORA });
    const rows = filas(sendWhatsAppList.mock.calls[0] as unknown[]) as Array<{ id: string; title: string; description?: string }>;
    expect(rows.map((r) => r.title)).toEqual(["Hoy 18:00", "Mañana 19:00", "Otro día u horario"]);
    expect(rows[1].description).toBe("jue 8/10 · Pilates");

    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: fila(rows[0].id), ahora: AHORA, perfilNombre: "Ana" });
    const call = sendWhatsAppButtons.mock.calls[0] as unknown[];
    const body = (call[1] as { body: string }).body;
    expect(body).toContain("¡Listo, Ana! 🙌 Te esperamos hoy miércoles 7/10 a las 18:00 para tu clase de prueba de *Funcional*.");
    expect(body).toContain("📍 Av. Siempreviva 742");
    expect(body).toContain("Llegá 10 minutos antes");
    expect(titulos(call)).toEqual(["Cambiar horario", "Cancelar clase", "Menú principal"]);
    expect((call[1] as { buttons: Array<{ id: string }> }).buttons[0].id).toBe("bot_cambiar:11111111-1111-1111-1111-111111111111");
  });

  it("confirmación con recomendaciones y ubicación del gym", async () => {
    const { admin, rpcs } = fakeAdmin(
      { whatsapp_bot_activo: true, whatsapp_bot_recomendaciones: "Traé agua y toalla", whatsapp_bot_latitud: -27.45, whatsapp_bot_longitud: -58.98 },
      { actividades: [FUNCIONAL] },
    );
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: fila("bot_turno:f1:2026-10-07T18:00"), ahora: AHORA });
    expect(rpcs[0]).toMatchObject({ fn: "reservar_clase_prueba", args: { p_actividad_id: "f1", p_inicio: "2026-10-07T21:00:00.000Z", p_telefono: TEL } });
    expect(((sendWhatsAppButtons.mock.calls[0] as unknown[])[1] as { body: string }).body).toContain("🎒 Traé agua y toalla");
    expect(sendWhatsAppUbicacion).toHaveBeenCalledTimes(1);
  });

  it("si el horario se llenó entre la lista y la elección, avisa y vuelve a ofrecer", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true }, { actividades: [FUNCIONAL], rpc: null });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: fila("bot_turno:f1:2026-10-07T18:00"), ahora: AHORA });
    expect(sendWhatsAppButtons).not.toHaveBeenCalled();
    expect(((sendWhatsAppList.mock.calls[0] as unknown[])[1] as { body: string }).body).toContain("se llenó");
  });

  it("no ofrece horarios sin cupo y avisa los últimos lugares", async () => {
    const reservas = [
      { id: "r1", actividad_id: "f1", telefono: "x", inicio: "2026-10-07T21:00:00.000Z", estado: "activa" },
      { id: "r2", actividad_id: "f1", telefono: "y", inicio: "2026-10-07T21:00:00.000Z", estado: "activa" },
    ];
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true }, { actividades: [{ ...FUNCIONAL, cupo_prueba: 2 }, { ...PILATES, cupo_prueba: 3 }], reservas });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: boton("bot_prueba"), ahora: AHORA });
    const rows = filas(sendWhatsAppList.mock.calls[0] as unknown[]) as Array<{ title: string; description?: string }>;
    expect(rows.map((r) => r.title)).toEqual(["Mañana 19:00", "Otro día u horario"]); // hoy 18:00 Funcional está lleno
    expect(rows[0].description).toBe("jue 8/10 · Pilates (últimos 3 lugares)");
  });

  it("cambiar y cancelar solo sobre una reserva propia y activa", async () => {
    const ID = "22222222-2222-2222-2222-222222222222";
    const propia = { id: ID, actividad_id: "f1", telefono: TEL, inicio: "2026-10-07T21:00:00.000Z", estado: "activa" };

    const cancelar = fakeAdmin({ whatsapp_bot_activo: true }, { actividades: [FUNCIONAL], reservas: [propia] });
    await responderConBot(cancelar.admin, { gymId: "g", telefono: TEL, alumnoId: null, message: boton(`bot_cancelar:${ID}`), ahora: AHORA });
    expect(((sendWhatsAppButtons.mock.calls[0] as unknown[])[1] as { body: string }).body).toBe("¿Seguro que querés cancelar tu clase de hoy miércoles 7/10 a las 18:00?");
    await responderConBot(cancelar.admin, { gymId: "g", telefono: TEL, alumnoId: null, message: boton(`bot_cancelar_si:${ID}`), ahora: AHORA });
    expect(cancelar.updates[0]).toMatchObject({ table: "reservas_prueba", values: { estado: "cancelada" } });

    sendWhatsAppButtons.mockClear();
    const ajena = fakeAdmin({ whatsapp_bot_activo: true }, { actividades: [FUNCIONAL], reservas: [{ ...propia, telefono: "5491100000000" }] });
    await responderConBot(ajena.admin, { gymId: "g", telefono: TEL, alumnoId: null, message: boton(`bot_cancelar_si:${ID}`), ahora: AHORA });
    expect(ajena.updates).toHaveLength(0);
    expect(((sendWhatsAppButtons.mock.calls[0] as unknown[])[1] as { body: string }).body).toContain("ya no está activa");

    sendWhatsAppList.mockClear();
    const cambiar = fakeAdmin({ whatsapp_bot_activo: true }, { actividades: [FUNCIONAL], reservas: [propia] });
    await responderConBot(cambiar.admin, { gymId: "g", telefono: TEL, alumnoId: null, message: boton(`bot_cambiar:${ID}`), ahora: AHORA });
    expect(cambiar.updates[0]).toMatchObject({ table: "reservas_prueba", values: { estado: "cancelada" } });
    expect(sendWhatsAppList).toHaveBeenCalledTimes(1);
  });

  it("los botones de la plantilla de recordatorio también cambian o cancelan", () => {
    expect(interpretar({ id: "w", type: "button", button: { payload: "cancelar:abc" } })).toEqual({ tipo: "cancelar", reservaId: "abc" });
    expect(interpretar({ id: "w", type: "button", button: { payload: "cambiar:abc" } })).toEqual({ tipo: "cambiar", reservaId: "abc" });
  });

  it("clase de prueba sin horarios cargados: pide que cuenten qué les queda cómodo", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: boton("bot_prueba"), ahora: AHORA });
    expect(((sendWhatsAppButtons.mock.calls[0] as unknown[])[1] as { body: string }).body).toContain("Contanos qué actividad");
  });

  it("«Hablar con alguien» deja el chat sin leer y ofrece volver al menú", async () => {
    const { admin, updates } = fakeAdmin({ whatsapp_bot_activo: true });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: boton("bot_humano") });
    expect(titulos(sendWhatsAppButtons.mock.calls[0] as unknown[])).toEqual(["Horarios y precios", "Menú principal"]);
    expect(updates).toHaveLength(0);
  });

  it("«Menú» vuelve a mandar la bienvenida aunque ya le hayamos escrito hoy", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true }, { salientesRecientes: 5 });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: texto("menú") });
    expect(sendWhatsAppButtons).toHaveBeenCalledTimes(1);
  });
});

describe("truncar", () => {
  it("corta con … sin pasarse del límite", () => {
    expect(truncar("Funcional y entrenamiento", 24)).toBe("Funcional y entrenamien…");
    expect(truncar("Funcional y entrenamiento", 24)).toHaveLength(24);
    expect(truncar("Cross", 24)).toBe("Cross");
  });
});

describe("primerNombre / personalizar", () => {
  it("toma la primera palabra con letras y la capitaliza", () => {
    expect(primerNombre("valentina sosa")).toBe("Valentina");
    expect(primerNombre("🔥 Ana")).toBe("Ana");
    expect(primerNombre("💪💪")).toBeNull();
    expect(primerNombre("J")).toBeNull();
    expect(primerNombre("123 Ana")).toBe("Ana");
  });
  it("reemplaza {nombre} o lo saca prolijo si no hay", () => {
    expect(personalizar("¡Hola {nombre}! 👋", "Ana")).toBe("¡Hola Ana! 👋");
    expect(personalizar("¡Hola {nombre}! 👋", null)).toBe("¡Hola! 👋");
  });
});

describe("resuelveSinPersona: a qué mensajes no hace falta avisarle al gym", () => {
  const plan = async (message: { id: string; type: string; text?: { body: string }; interactive?: unknown }, alumnoId: string | null = null) =>
    planificarBot(fakeAdmin({ whatsapp_bot_activo: true }).admin, { gymId: "g", telefono: TEL, alumnoId, message: message as never });

  it("lo que contesta el bot solo no avisa", async () => {
    for (const m of [texto("Hola"), boton("bot_info"), boton("bot_lista"), boton("bot_prueba"), boton("bot_menu"), texto("/Mi_cuenta")]) {
      const p = await plan(m);
      expect(p && resuelveSinPersona(p)).toBe(true);
    }
  });
  it("«Hablar con alguien», reservar una clase de prueba u «otro horario» sí avisan", async () => {
    for (const m of [boton("bot_humano"), fila("bot_turno:f1:2026-10-07T18:00"), fila("bot_turno_otro")]) {
      const p = await plan(m);
      expect(p && resuelveSinPersona(p)).toBe(false);
    }
  });
  it("un alumno que escribe texto libre no tiene plan del bot: avisa", async () => {
    expect(await plan(texto("Profe, hoy no voy"), "a1")).toBeNull();
  });
});
