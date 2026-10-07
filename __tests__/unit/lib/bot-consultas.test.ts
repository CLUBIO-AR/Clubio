import { describe, it, expect, vi, beforeEach } from "vitest";

const sendWhatsAppButtons = vi.fn(async () => "wamid.botones");
const sendWhatsAppText = vi.fn(async () => "wamid.texto");
vi.mock("@/lib/notifications/channels/whatsapp", () => ({
  sendWhatsAppButtons: (...a: unknown[]) => sendWhatsAppButtons(...(a as [])),
  sendWhatsAppText: (...a: unknown[]) => sendWhatsAppText(...(a as [])),
}));

import { responderConBot } from "@/lib/bot-consultas";

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

const texto = { id: "wamid.in", type: "text" };
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

  it("«Horarios y precios» responde el texto del gym y marca la consulta como leída", async () => {
    const { admin, updates } = fakeAdmin({ whatsapp_bot_activo: true, whatsapp_bot_info: "Funcional 18 h" });
    await responderConBot(admin, { gymId: "g", telefono: "5493624000000", alumnoId: null, message: boton("bot_info") });
    expect((sendWhatsAppText.mock.calls[0] as unknown[])[1]).toMatchObject({ body: "Funcional 18 h" });
    expect(updates).toEqual([{ table: "mensajes_whatsapp", values: { leido: true } }]);
  });

  it("«Hablar con alguien» confirma y deja el chat sin leer", async () => {
    const { admin, updates } = fakeAdmin({ whatsapp_bot_activo: true });
    await responderConBot(admin, { gymId: "g", telefono: "5493624000000", alumnoId: null, message: boton("bot_humano") });
    expect(sendWhatsAppText).toHaveBeenCalledTimes(1);
    expect(updates).toHaveLength(0);
  });
});
