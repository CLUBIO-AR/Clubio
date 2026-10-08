import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const sendWhatsAppPlantilla = vi.fn();
const sendNotification = vi.fn();
vi.mock("@/lib/notifications/channels/whatsapp", async () => {
  class WhatsAppPlantillaNoDisponible extends Error {
    constructor(public plantilla: string, public code: number, message: string) { super(message); }
  }
  return {
    WhatsAppPlantillaNoDisponible,
    sendWhatsAppPlantilla: (...a: unknown[]) => sendWhatsAppPlantilla(...a),
    descargarMediaWhatsApp: vi.fn(),
    sendWhatsAppText: vi.fn(),
  };
});
vi.mock("@/lib/notifications", () => ({ sendNotification: (...a: unknown[]) => sendNotification(...a) }));

import {
  armarAvisoTransferencia, claveEtapa, dentroDeHorario, diasHasta, enviarAvisosWhatsApp, etapaDeHoy,
  etapaSegunModo, fechaAviso, limpiarParametro, mesAnio, PLANTILLAS, type CuotaAviso, type ConfigAvisos,
} from "@/lib/notifications/avisos-whatsapp";
import { WhatsAppPlantillaNoDisponible } from "@/lib/notifications/channels/whatsapp";

const HOY = "2026-10-07"; // miércoles
const CAL = { diasAntes: [3], postDias: 3, maxPost: 1 };

describe("calendario", () => {
  it("relativo: 3 días antes, el día y 3 días después (una vez)", () => {
    expect(etapaDeHoy(3, CAL)).toEqual({ tipo: "previo", dias: 3 });
    expect(etapaDeHoy(2, CAL)).toBeNull();
    expect(etapaDeHoy(0, CAL)).toEqual({ tipo: "hoy", dias: 0 });
    expect(etapaDeHoy(-3, CAL)).toEqual({ tipo: "vencida", dias: -3 });
    expect(etapaDeHoy(-6, CAL)).toBeNull();
    expect(etapaDeHoy(-6, { ...CAL, maxPost: 2 })).toEqual({ tipo: "vencida", dias: -6 });
    expect(etapaDeHoy(7, { ...CAL, diasAntes: [7, 3, 1] })).toEqual({ tipo: "previo", dias: 7 });
  });
  it("fechas fijas: solo los días configurados; el último aviso, para vencidas", () => {
    const modo = { modo: "fijo" as const, diasAviso: [1, 5, 10], diaVencimiento: 10, diaUltimoAviso: 16 };
    expect(etapaSegunModo(modo, "2026-10-10", "pendiente", "2026-10-05")).toEqual({ tipo: "previo", dias: 5 });
    expect(etapaSegunModo(modo, "2026-10-10", "pendiente", "2026-10-10")).toEqual({ tipo: "hoy", dias: 0 });
    expect(etapaSegunModo(modo, "2026-10-10", "pendiente", "2026-10-07")).toBeNull();
    expect(etapaSegunModo(modo, "2026-10-10", "vencida", "2026-10-16")).toEqual({ tipo: "vencida", dias: -6 });
  });
  it("días hasta el vencimiento", () => {
    expect(diasHasta("2026-10-10", HOY)).toBe(3);
    expect(diasHasta("2026-10-04T00:00:00", HOY)).toBe(-3);
  });
  it("la clave de etapa distingue tipo y día", () => {
    expect(claveEtapa({ tipo: "previo", dias: 3 })).toBe("previo:3");
  });
});

describe("ventana horaria (Argentina)", () => {
  it.each([
    ["2026-10-07T12:00:00Z", true],  // 09:00
    ["2026-10-07T23:59:00Z", true],  // 20:59
    ["2026-10-08T00:00:00Z", false], // 21:00
    ["2026-10-07T11:59:00Z", false], // 08:59
    ["2026-10-07T09:00:00Z", false], // 06:00 (el horario viejo del cron)
  ])("%s → %s", (iso, ok) => expect(dentroDeHorario(new Date(iso))).toBe(ok));
});

describe("textos", () => {
  it("fecha con día de la semana, año solo si no es el actual", () => {
    expect(fechaAviso("2026-10-10", HOY)).toBe("sábado 10/10");
    expect(fechaAviso("2027-01-10", HOY)).toBe("domingo 10/1/2027");
    expect(mesAnio(10, 2026)).toBe("octubre 2026");
  });
  it("las variables no llevan saltos de línea, tabs ni 4+ espacios, ni van vacías", () => {
    expect(limpiarParametro("Box\nClub\t SRL      x")).toBe("Box Club  SRL   x");
    expect(limpiarParametro("  ")).toBe("-");
  });
});

const cuota = (over: Partial<CuotaAviso> = {}): CuotaAviso => ({
  id: "c1", mes: 10, anio: 2026, montoTotal: 30000, montoBase: 30000, fechaVencimiento: "2026-10-10",
  actividad: "Cross", recargoPct: 0, etapa: { tipo: "previo", dias: 3 }, ...over,
});
const base = { gym: "BOX CLUB", alumno: "Valentina", alias: "box.club", hoy: HOY };

// Las plantillas JSON son la fuente de verdad de Meta: el código tiene que mandar exactamente
// tantas variables como tiene cada una.
const DIR = path.join(process.cwd(), "whatsapp", "templates");
const JSONS = Object.fromEntries(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => {
  const t = JSON.parse(readFileSync(path.join(DIR, f), "utf8"));
  return [t.name, t];
}));
const variables = (texto: string) => new Set(texto.match(/\{\{\d+\}\}/g) ?? []).size;
function cumpleConMeta(msg: ReturnType<typeof armarAvisoTransferencia>) {
  const t = JSONS[msg.plantilla];
  expect(t, `falta whatsapp/templates/${msg.plantilla}.json`).toBeTruthy();
  const header = t.components.find((c: { type: string }) => c.type === "HEADER");
  const body = t.components.find((c: { type: string }) => c.type === "BODY");
  expect(msg.header).toHaveLength(variables(header.text));
  expect(msg.body).toHaveLength(variables(body.text));
  expect(body.example.body_text[0]).toHaveLength(msg.body.length);
  expect(body.text.trim().startsWith("{{")).toBe(false);
  expect(body.text.trim().endsWith("}}")).toBe(false);
  for (const v of [...msg.header, ...msg.body]) {
    expect(v).not.toMatch(/[\n\t]| {4,}/);
    expect(v.length).toBeGreaterThan(0);
  }
  expect(msg.quickReplies).toHaveLength(3);
}

describe("armarAvisoTransferencia", () => {
  it("antes del vencimiento, sin recargo: nombra al gym y lleva los 3 botones", () => {
    const msg = armarAvisoTransferencia({ ...base, cuotas: [cuota()] });
    expect(msg.plantilla).toBe(PLANTILLAS.previo);
    expect(msg.header).toEqual(["BOX CLUB"]);
    expect(msg.body.slice(0, 6)).toEqual(["Valentina", "BOX CLUB", "octubre 2026", "Cross", "sábado 10/10", "$30.000"]);
    expect(msg.quickReplies).toEqual(["alias", "transferi:c1", "cuenta"]);
    cumpleConMeta(msg);
  });
  it("con recargo usa la variante que lo menciona, con el monto real", () => {
    const msg = armarAvisoTransferencia({ ...base, cuotas: [cuota({ recargoPct: 10 })] });
    expect(msg.plantilla).toBe(PLANTILLAS.previoRecargo);
    expect(msg.body.at(-1)).toBe("$3.000 (10%)");
    cumpleConMeta(msg);
  });
  it("día del vencimiento y vencida", () => {
    cumpleConMeta(armarAvisoTransferencia({ ...base, cuotas: [cuota({ etapa: { tipo: "hoy", dias: 0 } })] }));
    cumpleConMeta(armarAvisoTransferencia({ ...base, cuotas: [cuota({ etapa: { tipo: "hoy", dias: 0 }, recargoPct: 10 })] }));
    const vencida = armarAvisoTransferencia({ ...base, cuotas: [cuota({ etapa: { tipo: "vencida", dias: -3 }, montoTotal: 33000 })] });
    expect(vencida.plantilla).toBe(PLANTILLAS.vencida);
    expect(vencida.body).toContain("$33.000");
    cumpleConMeta(vencida);
  });
  it("varias cuotas: un solo aviso consolidado con el total", () => {
    const msg = armarAvisoTransferencia({
      ...base, titular: "Box Club SRL", cbu: "0000003100012345678901",
      cuotas: [cuota({ id: "c0", fechaVencimiento: "2026-09-10", montoTotal: 33000, etapa: null }), cuota()],
    });
    expect(msg.plantilla).toBe(PLANTILLAS.multiples);
    expect(msg.body.slice(2, 5)).toEqual(["2", "$63.000", "La próxima vence el *sábado 10/10*"]);
    expect(msg.body.at(-1)).toContain("CBU/CVU: 0000003100012345678901");
    expect(msg.quickReplies).toEqual(["alias", "transferi", "cuenta"]);
    cumpleConMeta(msg);
  });
});

// ── enviarAvisosWhatsApp con un Supabase falso ──────────────────────────────

const CONFIG: ConfigAvisos = {
  email_activo: false, whatsapp_activo: true, whatsapp_phone_number_id: "pn", whatsapp_access_token: "tok",
  whatsapp_template_transferencia: "aviso_cuota_transferencia", modo_pago: "transferencia",
  transferencia_alias: "box.club", gymNombre: "BOX CLUB", recargoPctGym: 0,
};
const MEDIODIA = new Date("2026-10-07T15:00:00Z"); // 12:00 en Argentina

function fakeAdmin(opts: { avisadas?: Array<{ cuota_id: string; etapa: string }>; hoyAlumno?: number; enRevision?: string[]; estado?: string } = {}) {
  const inserts: Array<{ table: string; row: unknown }> = [];
  const from = (table: string) => {
    let head = false;
    const b: Record<string, unknown> = {};
    Object.assign(b, {
      select: (_: string, o?: { head?: boolean }) => { head = !!o?.head; return b; },
      eq: () => b, in: () => b, is: () => b, gte: () => b, overlaps: () => b,
      // Alias propio del alumno (cuentas_cobro_alumno): en estos casos no tiene, usa el del gym.
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      insert: (row: unknown) => { inserts.push({ table, row }); return Promise.resolve({ error: null }); },
      then: (resolve: (v: unknown) => void) => {
        if (table === "cuotas") return resolve({ data: [{ id: "c1", mes: 10, anio: 2026, monto_total: 30000, monto_base: 30000, estado: opts.estado ?? "pendiente", fecha_vencimiento: "2026-10-10", actividades: { nombre: "Cross", recargo_1_porcentaje: null } }] });
        if (table === "comprobantes_pago") return resolve({ data: (opts.enRevision ?? []).map((id) => ({ cuota_ids: [id] })) });
        if (table === "avisos_whatsapp_enviados") return resolve(head ? { count: opts.hoyAlumno ?? 0 } : { data: opts.avisadas ?? [] });
        return resolve({ data: [], error: null });
      },
    });
    return b;
  };
  return { admin: { from } as never, inserts };
}

const grupo = { alumnoId: "a1", nombre: "Valentina", telefono: "5493624865688", cuotas: [{ id: "c1", etapa: { tipo: "previo" as const, dias: 3 } }] };

describe("enviarAvisosWhatsApp", () => {
  beforeEach(() => { sendWhatsAppPlantilla.mockReset(); sendNotification.mockReset(); });

  it("manda la plantilla nueva y registra la etapa para no repetirla", async () => {
    sendWhatsAppPlantilla.mockResolvedValue("wamid.1");
    const { admin, inserts } = fakeAdmin();
    const r = await enviarAvisosWhatsApp(admin, { gymId: "g", config: CONFIG, grupos: [grupo], ahora: MEDIODIA });
    expect(r.enviados).toBe(1);
    expect(sendWhatsAppPlantilla.mock.calls[0][1]).toMatchObject({ plantilla: PLANTILLAS.previo, quickReplies: ["alias", "transferi:c1", "cuenta"] });
    expect(inserts.find((i) => i.table === "avisos_whatsapp_enviados")?.row).toEqual([
      { gym_id: "g", alumno_id: "a1", cuota_id: "c1", etapa: "previo:3", plantilla: PLANTILLAS.previo, wa_message_id: "wamid.1" },
    ]);
  });

  it("no repite una etapa ya avisada, ni a quien ya recibió algo hoy, ni con comprobante en revisión", async () => {
    for (const opts of [{ avisadas: [{ cuota_id: "c1", etapa: "previo:3" }] }, { hoyAlumno: 1 }, { enRevision: ["c1"] }]) {
      const { admin } = fakeAdmin(opts);
      const r = await enviarAvisosWhatsApp(admin, { gymId: "g", config: CONFIG, grupos: [grupo], ahora: MEDIODIA });
      expect(r.enviados).toBe(0);
    }
    expect(sendWhatsAppPlantilla).not.toHaveBeenCalled();
  });

  it("de noche no manda nada", async () => {
    const { admin } = fakeAdmin();
    const r = await enviarAvisosWhatsApp(admin, { gymId: "g", config: CONFIG, grupos: [grupo], ahora: new Date("2026-10-08T02:00:00Z") });
    expect(r.omitidos).toEqual({ fuera_de_horario: 1 });
    expect(sendWhatsAppPlantilla).not.toHaveBeenCalled();
  });

  it("si Meta todavía no aprobó la plantilla nueva, usa la del gym", async () => {
    sendWhatsAppPlantilla.mockRejectedValue(new WhatsAppPlantillaNoDisponible(PLANTILLAS.previo, 132001, "no existe"));
    sendNotification.mockResolvedValue([{ canal: "whatsapp", ok: true, provider_id: "wamid.legado" }]);
    const { admin, inserts } = fakeAdmin();
    const r = await enviarAvisosWhatsApp(admin, { gymId: "g", config: { ...CONFIG, whatsapp_phone_number_id: "pn-fallback" }, grupos: [grupo], ahora: MEDIODIA });
    expect(r.enviados).toBe(1);
    expect(sendNotification.mock.calls[0][1]).toMatchObject({ type: "aviso_vencimiento", cuota: { monto_total: 30000, actividad_nombre: "Cross" } });
    expect((inserts.find((i) => i.table === "avisos_whatsapp_enviados")?.row as Array<{ plantilla: string }>)[0].plantilla).toBe("aviso_cuota_transferencia");
  });
});
