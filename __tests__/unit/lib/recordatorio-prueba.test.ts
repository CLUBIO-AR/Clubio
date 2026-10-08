import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const sendWhatsAppButtons = vi.fn(async () => "wamid.botones");
const sendWhatsAppPlantilla = vi.fn(async () => "wamid.plantilla");
vi.mock("@/lib/notifications/channels/whatsapp", () => ({
  sendWhatsAppButtons: (...a: unknown[]) => sendWhatsAppButtons(...(a as [])),
  sendWhatsAppPlantilla: (...a: unknown[]) => sendWhatsAppPlantilla(...(a as [])),
  sendWhatsAppText: vi.fn(),
  descargarMediaWhatsApp: vi.fn(),
}));
vi.mock("@/lib/notifications", () => ({ sendNotification: vi.fn() }));

import { mandarRecordatoriosPrueba, textoRecordatorio } from "@/lib/recordatorio-prueba";

// Miércoles 7/10 9:00 en Argentina; clase a las 18:00.
const AHORA = new Date("2026-10-07T12:00:00Z");
const RESERVA = { id: "r1", telefono: "5493624865688", nombre: "Ana", inicio: "2026-10-07T21:00:00.000Z", actividades: { nombre: "Funcional" } };

function fakeAdmin({ ventana, plantilla }: { ventana: boolean; plantilla: string | null }) {
  const updates: Array<{ table: string; v: unknown }> = [];
  const from = (table: string) => {
    let v: unknown = null;
    const b: Record<string, unknown> = {};
    Object.assign(b, {
      select: () => b, eq: () => b, is: () => b, gt: () => b, lte: () => b, gte: () => b,
      update: (x: unknown) => { v = x; return b; },
      insert: () => Promise.resolve({ error: null }),
      maybeSingle: () => Promise.resolve({
        data: table === "gym_config"
          ? { whatsapp_activo: true, whatsapp_phone_number_id: "pn", whatsapp_access_token: "t", whatsapp_template_recordatorio_prueba: plantilla }
          : table === "gyms" ? { nombre: "BOX CLUB" } : null,
      }),
      then: (resolve: (x: unknown) => void) => {
        if (v) { updates.push({ table, v }); return resolve({ error: null }); }
        if (table === "reservas_prueba") return resolve({ data: [RESERVA] });
        if (table === "mensajes_whatsapp") return resolve({ count: ventana ? 1 : 0 });
        return resolve({ data: [] });
      },
    });
    return b;
  };
  return { admin: { from } as never, updates };
}

describe("recordatorio de clase de prueba", () => {
  beforeEach(() => { sendWhatsAppButtons.mockClear(); sendWhatsAppPlantilla.mockClear(); });

  it("dentro de las 24 h: mensaje con botones de cambiar/cancelar y queda marcado", async () => {
    const { admin, updates } = fakeAdmin({ ventana: true, plantilla: null });
    const r = await mandarRecordatoriosPrueba(admin, "g", AHORA);
    expect(r.enviados).toBe(1);
    const p = (sendWhatsAppButtons.mock.calls[0] as unknown[])[1] as { body: string; buttons: Array<{ id: string }> };
    expect(p.body).toContain("clase de prueba de *Funcional* hoy miércoles 7/10 a las 18:00 en *BOX CLUB*");
    expect(p.buttons.map((b) => b.id)).toEqual(["bot_cambiar:r1", "bot_cancelar:r1"]);
    expect(updates[0]).toMatchObject({ table: "reservas_prueba", v: { recordatorio_at: AHORA.toISOString() } });
  });

  it("fuera de las 24 h: usa la plantilla configurada, con los payloads de la reserva", async () => {
    const { admin } = fakeAdmin({ ventana: false, plantilla: "recordatorio_clase_prueba_v1" });
    await mandarRecordatoriosPrueba(admin, "g", AHORA);
    expect((sendWhatsAppPlantilla.mock.calls[0] as unknown[])[1]).toMatchObject({
      plantilla: "recordatorio_clase_prueba_v1",
      body: ["Ana", "Funcional", "hoy miércoles 7/10 a las 18:00", "BOX CLUB"],
      quickReplies: ["cambiar:r1", "cancelar:r1"],
    });
  });

  it("fuera de las 24 h y sin plantilla: no manda ni marca (no rompe el cron)", async () => {
    const { admin, updates } = fakeAdmin({ ventana: false, plantilla: null });
    const r = await mandarRecordatoriosPrueba(admin, "g", AHORA);
    expect(r).toEqual({ enviados: 0, sinPlantilla: 1, errores: 0 });
    expect(updates).toHaveLength(0);
  });

  it("la plantilla JSON tiene las mismas 4 variables", () => {
    const t = JSON.parse(readFileSync(path.join(process.cwd(), "whatsapp/templates/recordatorio_clase_prueba_v1.json"), "utf8"));
    const body = t.components.find((c: { type: string }) => c.type === "BODY");
    expect(new Set(body.text.match(/\{\{\d+\}\}/g)).size).toBe(4);
  });

  it("texto sin nombre", () => {
    expect(textoRecordatorio(null, "Yoga", "mañana jueves 8/10 a las 08:00", "Zen")).toMatch(/^¡Hola! 👋/);
  });
});
