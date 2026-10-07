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
import { responderConBot, interpretar, planificarBot, resuelveSinPersona, extraerDni } from "@/lib/bot-consultas";

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

// Cliente Supabase falso para el flujo del bot con DNI.
function fakeAdmin(opts: {
  alumno: { id: string; telefono: string | null } | null;
  pedidoDniReciente?: boolean;
  intentosFallidos?: number;
  modo?: string;
}) {
  const from = (table: string) => {
    let usoIn = false;
    let esUpdate = false;
    let filtroCuerpo = "";
    const b: Record<string, unknown> = {};
    Object.assign(b, {
      select: () => b, eq: () => b, is: () => b, order: () => b, limit: () => b, gte: () => b,
      ilike: (col: string, val: string) => { if (col === "cuerpo") filtroCuerpo = val; return b; },
      in: () => { usoIn = true; return b; },
      update: () => { esUpdate = true; return b; },
      insert: () => Promise.resolve({ error: null }),
      maybeSingle: () => Promise.resolve({
        data: table === "gym_config"
          ? { whatsapp_phone_number_id: "1", whatsapp_access_token: "t", whatsapp_bot_activo: true, email_modo: opts.modo ?? "transferencia", transferencia_alias: "box.club", transferencia_titular: null }
          : table === "alumnos"
            ? (usoIn ? opts.alumno : opts.alumno ? { id: opts.alumno.id, nombre: "Paulina", apellido: "Sosa" } : null)
            : null,
      }),
      then: (resolve: (v: unknown) => void) => {
        if (esUpdate) return resolve({ error: null });
        if (table === "cuotas") return resolve({
          data: usoIn
            ? [{ id: "c2", mes: 10, anio: 2026, monto_total: 30000, estado: "pendiente", fecha_vencimiento: "2026-10-10", fecha_pago: null, tipo: "mensual", descripcion: null, actividades: { nombre: "Cross" } }]
            : [],
        });
        if (table === "mensajes_whatsapp") {
          if (filtroCuerpo.includes("DNI*")) return resolve({ count: opts.pedidoDniReciente ? 1 : 0 });
          if (filtroCuerpo.startsWith("No encontramos ese DNI")) return resolve({ count: opts.intentosFallidos ?? 0 });
          return resolve({ count: 0 });
        }
        return resolve({ data: [] });
      },
    });
    return b;
  };
  return { admin: { from } as never };
}

const TEL = "5493624865688";
const texto = (body: string) => ({ id: "wamid.in", type: "text", text: { body } });
const cuerpo = (mock: typeof sendWhatsAppText) => ((mock.mock.calls[0] as unknown[])[1] as { body: string }).body;

describe("extraerDni", () => {
  it("acepta 7-8 dígitos con o sin puntos", () => {
    expect(extraerDni("35.123.456")).toBe("35123456");
    expect(extraerDni(" 4123456 ")).toBe("4123456");
    expect(extraerDni("hola 35123456")).toBeNull();
    expect(extraerDni("123")).toBeNull();
  });
});

describe("bot: estado de cuenta con DNI", () => {
  beforeEach(() => { sendWhatsAppButtons.mockClear(); sendWhatsAppText.mockClear(); sendWhatsAppList.mockClear(); });

  it("«Mi cuenta» pide el DNI (y no avisa al gym)", async () => {
    const { admin } = fakeAdmin({ alumno: null });
    const plan = await planificarBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: texto("/Mi_cuenta") });
    expect(plan && resuelveSinPersona(plan)).toBe(true);
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: texto("/Mi_cuenta") });
    expect(cuerpo(sendWhatsAppText)).toContain("escribime tu *DNI*");
  });

  it("DNI correcto desde el teléfono del alumno: muestra la cuenta con Copiar alias", async () => {
    const { admin } = fakeAdmin({ alumno: { id: "a1", telefono: "+5493624865688" }, pedidoDniReciente: true });
    const plan = await planificarBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: texto("35.123.456") });
    expect(plan && resuelveSinPersona(plan)).toBe(true);
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: texto("35.123.456") });
    const p = (sendWhatsAppButtons.mock.calls[0] as unknown[])[1] as { body: string; buttons: Array<{ title: string }> };
    expect(p.body).toContain("Octubre 2026 · Cross — $30.000");
    expect(p.buttons.map((b) => b.title)).toEqual(["Copiar alias", "Hablar con alguien", "Menú principal"]);
  });

  it("alumno sin teléfono cargado: muestra la cuenta y avisa al gym para que cargue el número", async () => {
    const { admin } = fakeAdmin({ alumno: { id: "a1", telefono: null }, pedidoDniReciente: true });
    const plan = await planificarBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: texto("35123456") });
    expect(plan && resuelveSinPersona(plan)).toBe(false);
  });

  it("DNI de un alumno con OTRO teléfono: no muestra nada y avisa al gym", async () => {
    const { admin } = fakeAdmin({ alumno: { id: "a1", telefono: "+5491100000000" }, pedidoDniReciente: true });
    const plan = await planificarBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: texto("35123456") });
    expect(plan && resuelveSinPersona(plan)).toBe(false);
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: texto("35123456") });
    expect(cuerpo(sendWhatsAppButtons)).toContain("otro teléfono registrado");
    expect(cuerpo(sendWhatsAppButtons)).not.toContain("$");
  });

  it("DNI inexistente: lo pide de nuevo; después de 3 intentos corta y avisa", async () => {
    const { admin } = fakeAdmin({ alumno: null, pedidoDniReciente: true });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: texto("11111111") });
    expect(cuerpo(sendWhatsAppButtons)).toContain("No encontramos ese DNI");

    const bloqueado = fakeAdmin({ alumno: { id: "a1", telefono: TEL }, pedidoDniReciente: true, intentosFallidos: 3 });
    const plan = await planificarBot(bloqueado.admin, { gymId: "g", telefono: TEL, alumnoId: null, message: texto("35123456") });
    expect(plan && resuelveSinPersona(plan)).toBe(false);
  });

  it("un número suelto sin que el bot haya pedido el DNI no se toma como DNI", async () => {
    const { admin } = fakeAdmin({ alumno: { id: "a1", telefono: TEL }, pedidoDniReciente: false });
    expect(await planificarBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: texto("35123456") })).toBeNull();
  });
});
