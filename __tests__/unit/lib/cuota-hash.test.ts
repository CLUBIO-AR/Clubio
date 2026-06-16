import { describe, it, expect } from "vitest";
import { createHash } from "crypto";

// Pure function extracted for testing — mirrors the logic in pagar-lote and pagar/lote/[token]
function calcCuotaHash(alumnoId: string, cuotaIds: string[]): string {
  return createHash("sha256")
    .update(`${alumnoId}:${[...cuotaIds].sort().join(",")}`)
    .digest("hex");
}

const ALUMNO = "aaaa-aaaa";
const IDS = ["cccc-1111", "cccc-2222", "cccc-3333"];

describe("cuota_hash — deduplicación de doble-submit", () => {
  it("es determinista para los mismos IDs", () => {
    expect(calcCuotaHash(ALUMNO, IDS)).toBe(calcCuotaHash(ALUMNO, IDS));
  });

  it("es invariante al orden de los IDs", () => {
    const shuffled = [...IDS].reverse();
    expect(calcCuotaHash(ALUMNO, IDS)).toBe(calcCuotaHash(ALUMNO, shuffled));
  });

  it("difiere cuando cambia el alumno", () => {
    expect(calcCuotaHash(ALUMNO, IDS)).not.toBe(calcCuotaHash("otro-alumno", IDS));
  });

  it("difiere cuando cambian los IDs de cuota", () => {
    const otrosCuotaIds = ["cccc-4444", "cccc-5555"];
    expect(calcCuotaHash(ALUMNO, IDS)).not.toBe(calcCuotaHash(ALUMNO, otrosCuotaIds));
  });

  it("produce un hash hex de 64 caracteres (SHA-256)", () => {
    const hash = calcCuotaHash(ALUMNO, IDS);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
