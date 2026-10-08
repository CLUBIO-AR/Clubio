import { describe, it, expect, vi, beforeEach } from "vitest";

const sendWhatsAppButtons = vi.fn(async () => "wamid.botones");
const sendWhatsAppText = vi.fn(async () => "wamid.texto");
const sendWhatsAppList = vi.fn(async () => "wamid.lista");
const descargarMediaWhatsApp = vi.fn(async () => ({ bytes: new ArrayBuffer(8), mimeType: "image/jpeg" }));
vi.mock("@/lib/notifications/channels/whatsapp", () => ({
  sendWhatsAppButtons: (...a: unknown[]) => sendWhatsAppButtons(...(a as [])),
  sendWhatsAppText: (...a: unknown[]) => sendWhatsAppText(...(a as [])),
  sendWhatsAppList: (...a: unknown[]) => sendWhatsAppList(...(a as [])),
  descargarMediaWhatsApp: (...a: unknown[]) => descargarMediaWhatsApp(...(a as [])),
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
    expect(t).toContain("*Estado de cuenta de Paulina S.*");
    expect(t).not.toContain("Sosa");
    expect(t).toContain("• Septiembre 2026 · Cross — $33.000 ⚠️ vencida");
    expect(t).toContain("• Octubre 2026 · Cross — $30.000 (vence 10/10)");
    expect(t).toContain("*Total a pagar: $63.000*");
    expect(t).toContain("Alias: *box.club*");
    expect(t).toContain("👤 Titular: Box Club SRL");
    expect(t).toContain("✅ Agosto 2026 · Cross — $30.000 (pagado 05/08)");
  });
  it("con link de pago, lo agrega", () => {
    expect(textoEstadoCuenta(ESTADO, { modo: "link", url: "https://x/pagar/lote/t" })).toContain("👉 Pagá todo junto acá: https://x/pagar/lote/t");
  });
  it("muestra CBU/CVU si el gym lo cargó", () => {
    const t = textoEstadoCuenta(ESTADO, { modo: "transferencia", alias: "box.club", cbu: "0000003100012345678901" });
    expect(t).toContain("🏦 CBU/CVU: 0000003100012345678901");
  });
  it("al día", () => {
    const t = textoEstadoCuenta({ ...ESTADO, pendientes: [], totalAdeudado: 0, hayVencidas: false }, { modo: "link", url: null });
    expect(t).toContain("¡Estás al día, Paulina!");
    expect(t).not.toContain("Total a pagar");
  });
});

describe("interpretar: pedidos de estado de cuenta", () => {
  const texto = (body: string) => ({ id: "x", type: "text", text: { body } });
  it.each(["/Mi_cuenta", "Hola, cuánto debo?", "quiero ver mi estado de cuenta", "mis cuotas"])("%s", (frase) => {
    expect(interpretar(texto(frase))).toEqual({ tipo: "cuenta" });
  });
});

// Cliente Supabase falso para el flujo del bot de estado de cuenta.
type Fila = { id: string; nombre: string; apellido: string; telefono: string | null };
function fakeAdmin(opts: {
  alumno: { id: string; telefono: string | null } | null;
  /** Alumnos cargados con el teléfono que escribe (búsqueda por teléfono). */
  alumnosTel?: Fila[];
  pedidoDniReciente?: boolean;
  intentosFallidos?: number;
  modo?: string;
  estadoBot?: { estado: string | null; datos: unknown; expira_at: string | null; handoff_hasta: string | null };
}) {
  const upserts: Array<{ table: string; row: Record<string, unknown> }> = [];
  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
  const subidas: string[] = [];
  const from = (table: string) => {
    let usoIn = false;
    let esUpdate = false;
    let filtroCuerpo = "";
    let filtroTelefono = false;
    const b: Record<string, unknown> = {};
    Object.assign(b, {
      select: () => b, eq: () => b, is: () => b, order: () => b, limit: () => b, gte: () => b, overlaps: () => b,
      ilike: (col: string, val: string) => { if (col === "cuerpo") filtroCuerpo = val; if (col === "telefono") filtroTelefono = true; return b; },
      in: () => { usoIn = true; return b; },
      update: () => { esUpdate = true; return b; },
      upsert: (row: Record<string, unknown>) => { upserts.push({ table, row }); return Promise.resolve({ error: null }); },
      insert: (row: Record<string, unknown>) => { inserts.push({ table, row }); return Promise.resolve({ error: null }); },
      maybeSingle: () => Promise.resolve({
        data: table === "gym_config"
          ? { whatsapp_phone_number_id: "1", whatsapp_access_token: "t", whatsapp_bot_activo: true, email_modo: opts.modo ?? "transferencia", transferencia_alias: "box.club", transferencia_titular: null }
          : table === "alumnos"
            ? (usoIn ? opts.alumno : opts.alumno ? { id: opts.alumno.id, nombre: "Paulina", apellido: "Sosa" } : null)
            : table === "whatsapp_bot_estado" ? (opts.estadoBot ?? null)
            : table === "gyms" ? { nombre: "Box Club" }
            : table === "cuotas" ? { id: "c2", alumno_id: "a1" }
            : null,
      }),
      then: (resolve: (v: unknown) => void) => {
        if (esUpdate) return resolve({ error: null });
        if (table === "alumnos" && filtroTelefono) return resolve({ data: opts.alumnosTel ?? [] });
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
  const storage = {
    from: () => ({ upload: (path: string) => { subidas.push(path); return Promise.resolve({ error: null }); } }),
  };
  return { admin: { from, storage } as never, upserts, inserts, subidas };
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

  it("«Mi cuenta» desde un número que no está cargado pide el DNI (y no avisa al gym)", async () => {
    const { admin } = fakeAdmin({ alumno: null });
    const plan = await planificarBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: texto("/Mi_cuenta") });
    expect(plan && resuelveSinPersona(plan)).toBe(true);
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: texto("/Mi_cuenta") });
    expect(cuerpo(sendWhatsAppText)).toContain("escribime tu *DNI*");
  });

  it("DNI correcto desde el teléfono del alumno: muestra la cuenta, «Ya transferí» y el alias aparte", async () => {
    const { admin } = fakeAdmin({ alumno: { id: "a1", telefono: "+5493624865688" }, pedidoDniReciente: true });
    const plan = await planificarBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: texto("35.123.456") });
    expect(plan && resuelveSinPersona(plan)).toBe(true);
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: texto("35.123.456") });
    const p = (sendWhatsAppButtons.mock.calls[0] as unknown[])[1] as { body: string; buttons: Array<{ id: string; title: string }> };
    expect(p.body).toContain("Octubre 2026 · Cross — $30.000");
    expect(p.buttons.map((b) => b.title)).toEqual(["Ya transferí", "Hablar con alguien", "Menú principal"]);
    expect(p.buttons[0].id).toBe("bot_transferi:a1");
    expect(cuerpo(sendWhatsAppText)).toBe("box.club");
  });

  it("«Mi cuenta» desde el teléfono de un alumno: muestra la cuenta sin pedir DNI", async () => {
    const { admin } = fakeAdmin({ alumno: { id: "a1", telefono: TEL }, alumnosTel: [{ id: "a1", nombre: "Paulina", apellido: "Sosa", telefono: "+54 362 4865688" }] });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: texto("cuánto debo") });
    expect(cuerpo(sendWhatsAppButtons)).toContain("Estado de cuenta de Paulina S.");
    expect(sendWhatsAppText.mock.calls.map((c) => ((c as unknown[])[1] as { body: string }).body)).not.toContain(expect.stringContaining("DNI"));
  });

  it("teléfono compartido por varios alumnos: lista para elegir y valida la elección", async () => {
    const alumnosTel = [
      { id: "a1", nombre: "Paulina", apellido: "Sosa", telefono: TEL },
      { id: "a2", nombre: "Tomás", apellido: "Sosa", telefono: TEL },
    ];
    const { admin } = fakeAdmin({ alumno: { id: "a1", telefono: TEL }, alumnosTel });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: texto("/Mi_cuenta") });
    const rows = ((sendWhatsAppList.mock.calls[0] as unknown[])[1] as { rows: Array<{ id: string; title: string }> }).rows;
    expect(rows).toEqual([{ id: "bot_cuenta_de:a1", title: "Paulina S." }, { id: "bot_cuenta_de:a2", title: "Tomás S." }]);

    // Un id de otro alumno (botón viejo o inventado) no muestra nada: pide DNI.
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: { id: "w", type: "interactive", interactive: { list_reply: { id: "bot_cuenta_de:zzz" } } } });
    expect(cuerpo(sendWhatsAppText)).toContain("escribime tu *DNI*");
  });

  it("«Ya transferí» espera el comprobante; la foto queda guardada y el gym la revisa", async () => {
    const alumnosTel = [{ id: "a1", nombre: "Paulina", apellido: "Sosa", telefono: TEL }];
    const espera = fakeAdmin({ alumno: { id: "a1", telefono: TEL }, alumnosTel });
    await responderConBot(espera.admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: { id: "w", type: "interactive", interactive: { button_reply: { id: "bot_transferi:a1" } } } });
    expect(espera.upserts[0]).toMatchObject({ table: "whatsapp_bot_estado", row: { estado: "awaiting_receipt", datos: { alumnoId: "a1", cuotaIds: ["c2"] } } });
    expect(cuerpo(sendWhatsAppButtons)).toContain("foto o el PDF");

    sendWhatsAppButtons.mockClear();
    const estadoBot = { estado: "awaiting_receipt", datos: { alumnoId: "a1", cuotaIds: ["c2"] }, expira_at: "2099-01-01T00:00:00Z", handoff_hasta: null };
    const recibe = fakeAdmin({ alumno: { id: "a1", telefono: TEL }, alumnosTel, estadoBot });
    const foto = { id: "wamid.foto", type: "image", image: { id: "media1", mime_type: "image/jpeg" } };
    const plan = await planificarBot(recibe.admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: foto });
    expect(plan && resuelveSinPersona(plan)).toBe(false); // lo tiene que revisar alguien
    await responderConBot(recibe.admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: foto });
    expect(recibe.subidas[0]).toMatch(/^receipts\/g\/a1\/[0-9a-f-]+\.jpg$/);
    expect(recibe.inserts.find((i) => i.table === "comprobantes_pago")?.row).toMatchObject({ alumno_id: "a1", cuota_ids: ["c2"], wa_message_id: "wamid.foto" });
    expect(cuerpo(sendWhatsAppButtons)).toContain("Recibimos tu comprobante");
  });

  it("esperando comprobante, un texto recuerda que mande el archivo", async () => {
    const estadoBot = { estado: "awaiting_receipt", datos: { alumnoId: "a1", cuotaIds: [] }, expira_at: "2099-01-01T00:00:00Z", handoff_hasta: null };
    const { admin } = fakeAdmin({ alumno: null, estadoBot });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: texto("ya te pagué") });
    expect(cuerpo(sendWhatsAppButtons)).toContain("*foto o el PDF*");
  });

  it("con handoff activo el bot no responde texto libre, pero «Mi cuenta» sí (y corta el handoff)", async () => {
    const estadoBot = { estado: null, datos: {}, expira_at: null, handoff_hasta: "2099-01-01T00:00:00Z" };
    const silencio = fakeAdmin({ alumno: null, estadoBot });
    expect(await planificarBot(silencio.admin, { gymId: "g", telefono: TEL, alumnoId: null, message: texto("Hola") })).toBeNull();
    expect(await planificarBot(silencio.admin, { gymId: "g", telefono: TEL, alumnoId: null, message: { id: "w", type: "interactive", interactive: { button_reply: { id: "bot_info" } } } })).toBeNull();

    await responderConBot(silencio.admin, { gymId: "g", telefono: TEL, alumnoId: null, message: texto("mi cuenta") });
    expect(silencio.upserts[0]).toMatchObject({ table: "whatsapp_bot_estado", row: { handoff_hasta: null } });
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
    expect(cuerpo(sendWhatsAppButtons)).toContain("no coincide con el que tenemos cargado");
    expect(cuerpo(sendWhatsAppButtons)).not.toContain("$");
  });

  it("DNI inexistente: lo pide de nuevo; después de 3 intentos corta y avisa", async () => {
    const { admin } = fakeAdmin({ alumno: null, pedidoDniReciente: true });
    await responderConBot(admin, { gymId: "g", telefono: TEL, alumnoId: null, message: texto("11111111") });
    expect(cuerpo(sendWhatsAppButtons)).toContain("No encontramos ese DNI en Box Club");

    const bloqueado = fakeAdmin({ alumno: { id: "a1", telefono: TEL }, pedidoDniReciente: true, intentosFallidos: 3 });
    const plan = await planificarBot(bloqueado.admin, { gymId: "g", telefono: TEL, alumnoId: null, message: texto("35123456") });
    expect(plan && resuelveSinPersona(plan)).toBe(false);
  });

  it("un número suelto sin que el bot haya pedido el DNI no se toma como DNI", async () => {
    const { admin } = fakeAdmin({ alumno: { id: "a1", telefono: TEL }, pedidoDniReciente: false });
    expect(await planificarBot(admin, { gymId: "g", telefono: TEL, alumnoId: "a1", message: texto("35123456") })).toBeNull();
  });
});
