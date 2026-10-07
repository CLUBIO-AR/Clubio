import { describe, it, expect } from "vitest";
import { normalizarTelefonoAR, formatearTelefonoParaGuardar } from "@/lib/telefono";

describe("normalizarTelefonoAR", () => {
  it.each([
    ["3624865688", "5493624865688"],
    ["362 486-5688", "5493624865688"],
    ["03624865688", "5493624865688"],
    ["0362 15 4865688", "5493624865688"],
    ["362154865688", "5493624865688"],
    ["+54 362 4865688", "5493624865688"],
    ["+543624155920", "5493624155920"],
    ["+54 9 362 415-5920", "5493624155920"],
    ["5493624155920", "5493624155920"],
    ["+54 9 362 15 4155920", "5493624155920"],
    ["11 1234-5678", "5491112345678"],
    ["011 15 1234-5678", "5491112345678"],
    ["+54 9 11 1234 5678", "5491112345678"],
    ["2966 123456", "5492966123456"],
    ["0054 9 362 4865688", "5493624865688"],
  ])("%s → %s", (entrada, esperado) => {
    expect(normalizarTelefonoAR(entrada)).toBe(esperado);
  });

  it("devuelve null para vacíos o muy cortos", () => {
    expect(normalizarTelefonoAR(null)).toBeNull();
    expect(normalizarTelefonoAR("")).toBeNull();
    expect(normalizarTelefonoAR("4865688")).toBeNull();
  });

  it("deja intactos números de otros países", () => {
    expect(normalizarTelefonoAR("+1 555 643 8387")).toBe("15556438387");
    expect(normalizarTelefonoAR("+55 11 91234 5678")).toBe("5511912345678");
  });
});

describe("formatearTelefonoParaGuardar", () => {
  it("agrega + al formato normalizado", () => {
    expect(formatearTelefonoParaGuardar("3624865688")).toBe("+5493624865688");
    expect(formatearTelefonoParaGuardar("")).toBeNull();
  });
});
