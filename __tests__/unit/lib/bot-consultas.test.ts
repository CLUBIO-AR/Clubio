import { describe, it, expect, vi, beforeEach } from "vitest";

const sendWhatsAppButtons = vi.fn(async () => "wamid.botones");
const sendWhatsAppText = vi.fn(async () => "wamid.texto");
vi.mock("@/lib/notifications/channels/whatsapp", () => ({
  sendWhatsAppButtons: (...a: unknown[]) => sendWhatsAppButtons(...(a as [])),
  sendWhatsAppText: (...a: unknown[]) => sendWhatsAppText(...(a as [])),
}));

import { responderConBot, primerNombre, personalizar } from "@/lib/bot-consultas";

type Config = { whatsapp_bot_activo: boolean; whatsapp_bot_info?: string | null; whatsapp_bot_bienvenida?: string | null };

// Cliente Supabase falso: alcanza para las consultas que hace el bot.
function fakeAdmin(config: Config, salientesRecientes = 0) {
  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
  const updates: Array<{ table: string; values: Record<string, unknown> }> = [];
  const from = (table: string) => {
    let esUpdate = false;
    let values: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    Object.assign(b, {
      select: () => b, eq: () => b, gte: () => b, is: () => b,
      update: (v: Record<string, unknown>) => { esUpdate = true; values = v; return b; },
      insert: (row: Record<string, unknown>) => { inserts.push({ table, row }); return Promise.resolve({ error: null }); },
      maybeSingle: () => Promise.resolve({
        data: table === "gym_config"
          ? { whatsapp_phone_number_id: "123", whatsapp_access_token: "tok", ...config }
          : table === "gyms" ? { nombre: "Box Club" } : null,
      }),
      then: (resolve: (v: unknown) => void) => {
        if (esUpdate) { updates.push({ table, values }); return resolve({ error: null }); }
        return resolve({ count: salientesRecientes, error: null });
      },
    });
    return b;
  };
  return { admin: { from } as never, inserts, updates };
}

const texto = { id: "wamid.in", type: "text", text: { body: "Hola, quería consultar" } };
const boton = (id: string) => ({ id: "wamid.in", type: "interactive", interactive: { button_reply: { id } } });

describe("responderConBot", () => {
  beforeEach(() => { sendWhatsAppButtons.mockClear(); sendWhatsAppText.mockClear(); });

  it("no hace nada si el bot está apagado", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: false });
    await responderConBot(admin, { gymId: "g", telefono: "5493624000000", alumnoId: null, message: texto });
    expect(sendWhatsAppButtons).not.toHaveBeenCalled();
    expect(sendWhatsAppText).not.toHaveBeenCalled();
  });

  it("manda la bienvenida con 3 botones a un número que no es alumno y la guarda en el inbox", async () => {
    const { admin, inserts } = fakeAdmin({ whatsapp_bot_activo: true });
    await responderConBot(admin, { gymId: "g", telefono: "5493624000000", alumnoId: null, message: texto });
    expect(sendWhatsAppButtons).toHaveBeenCalledTimes(1);
    const params = (sendWhatsAppButtons.mock.calls[0] as unknown[])[1] as { body: string; buttons: unknown[] };
    expect(params.body).toContain("Box Club");
    expect(params.buttons).toHaveLength(3);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].row).toMatchObject({ direccion: "saliente", wa_message_id: "wamid.botones" });
  });

  it("no repite la bienvenida si ya le escribimos en las últimas 24 hs", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true }, 1);
    await responderConBot(admin, { gymId: "g", telefono: "5493624000000", alumnoId: null, message: texto });
    expect(sendWhatsAppButtons).not.toHaveBeenCalled();
  });

  it("no le responde a un alumno que escribe texto", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true });
    await responderConBot(admin, { gymId: "g", telefono: "5493624000000", alumnoId: "a1", message: texto });
    expect(sendWhatsAppButtons).not.toHaveBeenCalled();
  });

  it("no responde audios ni fotos", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true });
    await responderConBot(admin, { gymId: "g", telefono: "5493624000000", alumnoId: null, message: { id: "x", type: "audio" } });
    expect(sendWhatsAppButtons).not.toHaveBeenCalled();
  });

  const titulos = (call: unknown[]) => ((call[1] as { buttons: Array<{ title: string }> }).buttons).map((b) => b.title);

  it("«Horarios y precios» responde el texto del gym con los próximos pasos y marca la consulta como leída", async () => {
    const { admin, updates } = fakeAdmin({ whatsapp_bot_activo: true, whatsapp_bot_info: "Funcional 18 h" });
    await responderConBot(admin, { gymId: "g", telefono: "5493624000000", alumnoId: null, message: boton("bot_info") });
    const call = sendWhatsAppButtons.mock.calls[0] as unknown[];
    expect(call[1]).toMatchObject({ body: "Funcional 18 h" });
    expect(titulos(call)).toEqual(["Clase de prueba", "Hablar con alguien"]);
    expect(updates).toEqual([{ table: "mensajes_whatsapp", values: { leido: true } }]);
  });

  it("si la info es más larga que lo que admite un mensaje con botones, la manda como texto y los botones aparte", async () => {
    const larga = "x".repeat(1500);
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true, whatsapp_bot_info: larga });
    await responderConBot(admin, { gymId: "g", telefono: "5493624000000", alumnoId: null, message: boton("bot_info") });
    expect((sendWhatsAppText.mock.calls[0] as unknown[])[1]).toMatchObject({ body: larga });
    expect(sendWhatsAppButtons).toHaveBeenCalledTimes(1);
  });

  it("«Hablar con alguien» confirma, deja el chat sin leer y ofrece volver al menú", async () => {
    const { admin, updates } = fakeAdmin({ whatsapp_bot_activo: true });
    await responderConBot(admin, { gymId: "g", telefono: "5493624000000", alumnoId: null, message: boton("bot_humano") });
    expect(titulos(sendWhatsAppButtons.mock.calls[0] as unknown[])).toEqual(["Horarios y precios", "Menú principal"]);
    expect(updates).toHaveLength(0);
  });

  it("«Menú principal» vuelve a mandar la bienvenida aunque ya le hayamos escrito hoy", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true }, 5);
    await responderConBot(admin, { gymId: "g", telefono: "5493624000000", alumnoId: null, message: boton("bot_menu") });
    expect(titulos(sendWhatsAppButtons.mock.calls[0] as unknown[])).toEqual(["Horarios y precios", "Clase de prueba", "Hablar con alguien"]);
  });

  it("escribir «Menú» también muestra el menú", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true }, 5);
    await responderConBot(admin, { gymId: "g", telefono: "5493624000000", alumnoId: null, message: { id: "x", type: "text", text: { body: "Menú" } } });
    expect(sendWhatsAppButtons).toHaveBeenCalledTimes(1);
  });

  it("saluda con el nombre del perfil de WhatsApp", async () => {
    const { admin } = fakeAdmin({ whatsapp_bot_activo: true });
    await responderConBot(admin, { gymId: "g", telefono: "5493624000000", alumnoId: null, message: texto, perfilNombre: "juan ⚡ Pérez" });
    expect((sendWhatsAppButtons.mock.calls[0] as unknown[])[1]).toMatchObject({ body: expect.stringContaining("¡Hola Juan!") });
  });
});

describe("primerNombre / personalizar", () => {
  it("toma la primera palabra con letras y la capitaliza", () => {
    expect(primerNombre("valentina sosa")).toBe("Valentina");
    expect(primerNombre("🔥 Ana")).toBe("Ana");
    expect(primerNombre("💪💪")).toBeNull();
    expect(primerNombre(null)).toBeNull();
  });
  it("reemplaza {nombre} o lo saca prolijo si no hay", () => {
    expect(personalizar("¡Hola {nombre}! 👋", "Ana")).toBe("¡Hola Ana! 👋");
    expect(personalizar("¡Hola {nombre}! 👋", null)).toBe("¡Hola! 👋");
  });
});
