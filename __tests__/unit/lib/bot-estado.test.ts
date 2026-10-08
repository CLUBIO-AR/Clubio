import { describe, it, expect } from "vitest";
import { interpretarEstado } from "@/lib/bot-estado";
import { mismoTelefono } from "@/lib/bot-consultas";
import { extensionComprobante, rutaComprobante } from "@/lib/comprobantes";
import { nombreCorto } from "@/lib/estado-cuenta";

const AHORA = new Date("2026-10-07T18:00:00Z");

describe("interpretarEstado", () => {
  it("esperando comprobante solo mientras no venza", () => {
    const fila = { estado: "awaiting_receipt", datos: { alumnoId: "a1", cuotaIds: ["c1", 3] }, expira_at: "2026-10-07T18:20:00Z", handoff_hasta: null };
    expect(interpretarEstado(fila, AHORA).esperandoComprobante).toEqual({ alumnoId: "a1", cuotaIds: ["c1"] });
    expect(interpretarEstado({ ...fila, expira_at: "2026-10-07T17:59:00Z" }, AHORA).esperandoComprobante).toBeNull();
    expect(interpretarEstado({ ...fila, datos: {} }, AHORA).esperandoComprobante).toBeNull();
  });
  it("handoff activo hasta la hora guardada", () => {
    const base = { estado: null, datos: {}, expira_at: null };
    expect(interpretarEstado({ ...base, handoff_hasta: "2026-10-08T06:00:00Z" }, AHORA).handoffActivo).toBe(true);
    expect(interpretarEstado({ ...base, handoff_hasta: "2026-10-07T17:00:00Z" }, AHORA).handoffActivo).toBe(false);
    expect(interpretarEstado({ ...base, handoff_hasta: null }, AHORA).handoffActivo).toBe(false);
  });
});

describe("mismoTelefono", () => {
  it.each([
    ["5493624865688", "+54 9 362 4865688"],
    ["5493624865688", "0362-15-4865688".replace("15-", "")],
    ["5493624865688", "362 4865688"],
  ])("%s ≈ %s", (a, b) => expect(mismoTelefono(a, b)).toBe(true));
  it("distintos o incompletos no coinciden", () => {
    expect(mismoTelefono("5493624865688", "5491100000000")).toBe(false);
    expect(mismoTelefono("5493624865688", null)).toBe(false);
    expect(mismoTelefono("123", "123")).toBe(false);
  });
});

describe("comprobantes", () => {
  it("solo imágenes y PDF", () => {
    expect(extensionComprobante("image/jpeg")).toBe("jpg");
    expect(extensionComprobante("application/pdf")).toBe("pdf");
    expect(extensionComprobante("audio/ogg; codecs=opus")).toBeNull();
  });
  it("ruta por gym y alumno (la usa la política de Storage)", () => {
    expect(rutaComprobante("g1", "a1", "x", "pdf")).toBe("receipts/g1/a1/x.pdf");
  });
});

describe("nombreCorto", () => {
  it("nombre de pila + inicial", () => {
    expect(nombreCorto("Valentina", "sosa")).toBe("Valentina S.");
    expect(nombreCorto("Valentina", "")).toBe("Valentina");
  });
});
