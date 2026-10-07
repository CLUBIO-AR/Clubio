import { describe, it, expect, vi, beforeEach } from "vitest";

const sendWhatsAppButtons = vi.fn(async () => "wamid.botones");
const sendWhatsAppText = vi.fn(async () => "wamid.texto");
const sendWhatsAppList = vi.fn(async () => "wamid.lista");
vi.mock("@/lib/notifications/channels/whatsapp", () => ({
  sendWhatsAppButtons: (...a: unknown[]) => sendWhatsAppButtons(...(a as [])),
  sendWhatsAppText: (...a: unknown[]) => sendWhatsAppText(...(a as [])),
  sendWhatsAppList: (...a: unknown[]) => sendWhatsAppList(...(a as [])),
}));

import { responderConBot, primerNombre, personalizar, interpretar } from "@/lib/bot-consultas";

type Config = { whatsapp_bot_activo: boolean; whatsapp_bot_info?: string | null; whatsapp_bot_bienvenida?: string | null };
type Act = { id: string; nombre: string; monto_base: number; descripcion: string | null; horarios: { dias: number[]; hora: string }[]; clase_prueba: boolean };

// Cliente Supabase falso: alcanza para las consultas que hace el bot.
function fakeAdmin(config: Config, { salientesRecientes = 0, actividades = [] as Act[] } = {}) {
  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
  const updates: Array<{ table: string; values: Record<string, unknown> }> = [];
  const from = (table: string) => {
    let esUpdate = false;
    let values: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    Object.assign(b, {
      select: () => b, eq: () => b, gte: () => b, is: () => b, order: () => b, limit: () => b,
      update: (v: Record<string, unknown>) => { esUpdate = true; values = v; return b; },
      insert: (row: Record<string, unknown>) => { inserts.push({ table, row }); return Promise.resolve({ error: null }); },
      maybeSingle: () => Promise.resolve({
        data: table === "gym_config"
          ? { whatsapp_phone_number_id: "123", whatsapp_access_token: "tok", ...config }
          : table === "gyms" ? { nombre: "Box Club" }
          : table === "sucursales" ? { direccion: "Av. Siempreviva 742" } : null,
      }),
      then: (resolve: (v: unknown) => void) => {
        if (esUpdate) { updates.push({ table, values }); return resolve({ error: null }); }
        if (table === "actividades") return resolve({ data: actividades, error: null });
        return resolve({ count: salientesRecientes, error: null });
      },
    });
    return b;
  };
  return { admin: { from } as never, inserts, updates };
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
    expect(updates).toEqual([{ table: "mensajes_whatsapp", values: { leido: true } }]);
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
    const rows = filas(sendWhatsAppList.mock.calls[0] as unknown[]);
    expect(rows.map((r) => r.title)).toEqual(["Hoy 18:00", "Mañana 19:00", "Otro día u horario"]);

    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: fila(rows[0].id), ahora: AHORA, perfilNombre: "Ana" });
    const body = ((sendWhatsAppButtons.mock.calls[0] as unknown[])[1] as { body: string }).body;
    expect(body).toContain("¡Listo, Ana! 🙌 Te esperamos hoy a las 18:00 para tu clase de prueba de *Funcional*.");
    expect(body).toContain("📍 Av. Siempreviva 742");
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

describe("primerNombre / personalizar", () => {
  it("toma la primera palabra con letras y la capitaliza", () => {
    expect(primerNombre("valentina sosa")).toBe("Valentina");
    expect(primerNombre("🔥 Ana")).toBe("Ana");
    expect(primerNombre("💪💪")).toBeNull();
  });
  it("reemplaza {nombre} o lo saca prolijo si no hay", () => {
    expect(personalizar("¡Hola {nombre}! 👋", "Ana")).toBe("¡Hola Ana! 👋");
    expect(personalizar("¡Hola {nombre}! 👋", null)).toBe("¡Hola! 👋");
  });
});
