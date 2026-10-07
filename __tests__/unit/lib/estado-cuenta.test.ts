import { describe, it, expect, vi, beforeEach } from "vitest";

const sendWhatsAppButtons = vi.fn(async () => "wamid.botones");
const sendWhatsAppText = vi.fn(async () => "wamid.texto");
const sendWhatsAppList = vi.fn(async () => "wamid.lista");
vi.mock("@/lib/notifications/channels/whatsapp", () => ({
  sendWhatsAppButtons: (...a: unknown[]) => sendWhatsAppButtons(...(a as [])),
  sendWhatsAppText: (...a: unknown[]) => sendWhatsAppText(...(a as [])),
  sendWhatsAppList: (...a: unknown[]) => sendWhatsAppList(...(a as [])),
}));

import { textoEstadoCuenta, type EstadoCuenta } from "@/lib/estado-cuenta";
import { responderConBot, interpretar } from "@/lib/bot-consultas";

const ESTADO: EstadoCuenta = {
  alumnoId: "a1", alumnoNombre: "Paulina", alumnoApellido: "Sosa",
  pendientes: [
    { id: "c1", concepto: "Septiembre 2026 · Cross", monto: 33000, estado: "vencida", fechaVencimiento: "2026-09-10", fechaPago: null },
    { id: "c2", concepto: "Octubre 2026 · Cross", monto: 30000, estado: "pendiente", fechaVencimiento: "2026-10-10", fechaPago: null },
  ],
  totalAdeudado: 63000, hayVencidas: true,
  ultimosPagos: [{ id: "c0", concepto: "Agosto 2026 · Cross", monto: 30000, estado: "pagada", fechaVencimiento: "2026-08-10", fechaPago: "2026-08-05T13:00:00Z" }],
};

describe("textoEstadoCuenta", () => {
  it("lista lo pendiente, el total y cómo pagar por transferencia", () => {
    const t = textoEstadoCuenta(ESTADO, { modo: "transferencia", alias: "box.club", titular: "Box Club SRL" });
    expect(t).toContain("*Estado de cuenta de Paulina Sosa*");
    expect(t).toContain("• Septiembre 2026 · Cross — $33.000 ⚠️ vencida");
    expect(t).toContain("• Octubre 2026 · Cross — $30.000 (vence 10/10)");
    expect(t).toContain("*Total a pagar: $63.000*");
    expect(t).toContain("Alias: *box.club*");
    expect(t).toContain("✅ Agosto 2026 · Cross — $30.000 (pagado 05/08)");
  });
  it("con link de pago, lo agrega", () => {
    expect(textoEstadoCuenta(ESTADO, { modo: "link", url: "https://x/pagar/lote/t" })).toContain("👉 Pagá todo junto acá: https://x/pagar/lote/t");
  });
  it("al día", () => {
    const t = textoEstadoCuenta({ ...ESTADO, pendientes: [], totalAdeudado: 0, hayVencidas: false }, { modo: "link", url: null });
    expect(t).toContain("¡Estás al día!");
    expect(t).not.toContain("Total a pagar");
  });
});

describe("interpretar: pedidos de estado de cuenta", () => {
  const texto = (body: string) => ({ id: "x", type: "text", text: { body } });
  it.each(["/Mi_cuenta", "Hola, cuánto debo?", "quiero ver mi estado de cuenta", "mis cuotas"])("%s", (frase) => {
    expect(interpretar(texto(frase))).toEqual({ tipo: "cuenta" });
  });
});

// Cliente Supabase falso para el flujo del bot.
function fakeAdmin(opts: { alumnos: Array<{ id: string; nombre: string; apellido: string }>; modo?: string }) {
  const updates: unknown[] = [];
  const from = (table: string) => {
    let usoIn = false;
    let esUpdate = false;
    const b: Record<string, unknown> = {};
    Object.assign(b, {
      select: () => b, eq: () => b, is: () => b, order: () => b, limit: () => b, ilike: () => b, gte: () => b,
      in: () => { usoIn = true; return b; },
      update: (v: unknown) => { esUpdate = true; updates.push(v); return b; },
      insert: () => Promise.resolve({ error: null }),
      maybeSingle: () => Promise.resolve({
        data: table === "gym_config"
          ? { whatsapp_phone_number_id: "1", whatsapp_access_token: "t", whatsapp_bot_activo: true, email_modo: opts.modo ?? "transferencia", transferencia_alias: "box.club", transferencia_titular: null }
          : table === "alumnos" ? opts.alumnos[0] ?? null : null,
      }),
      then: (resolve: (v: unknown) => void) => {
        if (esUpdate) return resolve({ error: null });
        if (table === "alumnos") return resolve({ data: opts.alumnos });
        if (table === "cuotas") return resolve({
          data: usoIn
            ? [{ id: "c2", mes: 10, anio: 2026, monto_total: 30000, estado: "pendiente", fecha_vencimiento: "2026-10-10", fecha_pago: null, tipo: "mensual", descripcion: null, actividades: { nombre: "Cross" } }]
            : [],
        });
        return resolve({ count: 0 });
      },
    });
    return b;
  };
  return { admin: { from } as never, updates };
}

describe("bot: Mi estado de cuenta", () => {
  beforeEach(() => { sendWhatsAppButtons.mockClear(); sendWhatsAppText.mockClear(); sendWhatsAppList.mockClear(); });
  const msg = { id: "wamid.in", type: "text", text: { body: "/Mi_cuenta" } };

  it("con un solo alumno en ese teléfono, manda el estado con el botón para copiar el alias", async () => {
    const { admin, updates } = fakeAdmin({ alumnos: [{ id: "a1", nombre: "Paulina", apellido: "Sosa" }] });
    await responderConBot(admin, { gymId: "g", telefono: "5493624865688", alumnoId: "a1", message: msg });
    const call = sendWhatsAppButtons.mock.calls[0] as unknown[];
    const p = call[1] as { body: string; buttons: Array<{ title: string }> };
    expect(p.body).toContain("Octubre 2026 · Cross — $30.000");
    expect(p.buttons.map((b) => b.title)).toEqual(["Copiar alias", "Hablar con alguien", "Menú principal"]);
    void updates;
  });

  it("si el teléfono es de varios alumnos, pregunta de cuál", async () => {
    const { admin } = fakeAdmin({ alumnos: [{ id: "a1", nombre: "Paulina", apellido: "Sosa" }, { id: "a2", nombre: "Gabriel", apellido: "Sosa" }] });
    await responderConBot(admin, { gymId: "g", telefono: "5493624865688", alumnoId: "a1", message: msg });
    const rows = ((sendWhatsAppList.mock.calls[0] as unknown[])[1] as { rows: Array<{ id: string }> }).rows;
    expect(rows.map((r) => r.id)).toEqual(["bot_cuenta:a1", "bot_cuenta:a2"]);
  });

  it("no muestra la cuenta de un alumno que no tiene ese teléfono aunque manden su id", async () => {
    const { admin } = fakeAdmin({ alumnos: [{ id: "a1", nombre: "Paulina", apellido: "Sosa" }, { id: "a2", nombre: "Gabriel", apellido: "Sosa" }] });
    const pedidoAjeno = { id: "x", type: "interactive", interactive: { list_reply: { id: "bot_cuenta:otro-gym" } } };
    await responderConBot(admin, { gymId: "g", telefono: "5493624865688", alumnoId: "a1", message: pedidoAjeno });
    expect(sendWhatsAppButtons).not.toHaveBeenCalled();
    expect(sendWhatsAppList).toHaveBeenCalledTimes(1); // vuelve a preguntar de cuál
  });

  it("un número que no es alumno recibe un aviso, no datos", async () => {
    const { admin } = fakeAdmin({ alumnos: [] });
    await responderConBot(admin, { gymId: "g", telefono: "5491100000000", alumnoId: null, message: msg });
    expect(((sendWhatsAppButtons.mock.calls[0] as unknown[])[1] as { body: string }).body).toContain("No encontramos este número");
  });
});
