import { describe, it, expect } from "vitest";
import { PLAN_FEATURES, type Plan } from "@/lib/features";

// CRÍTICO: estos tests verifican que los planes están correctamente definidos.
// Cualquier fallo aquí es un bug crítico de negocio.

describe("PLAN_FEATURES — validación de planes", () => {
  // ─── Planes que DEBEN existir ───────────────────────────────────────────

  it("plan 'basic' existe", () => {
    expect(PLAN_FEATURES).toHaveProperty("basic");
  });

  it("plan 'multi' existe", () => {
    expect(PLAN_FEATURES).toHaveProperty("multi");
  });

  // ─── Planes que NO DEBEN existir ────────────────────────────────────────

  it("plan 'starter' NO EXISTE (bug crítico si falla)", () => {
    expect(PLAN_FEATURES).not.toHaveProperty("starter");
  });

  it("plan 'pro' NO EXISTE (bug crítico si falla)", () => {
    expect(PLAN_FEATURES).not.toHaveProperty("pro");
  });

  it("plan 'plus' NO EXISTE — eliminado junio 2026 (bug crítico si falla)", () => {
    expect(PLAN_FEATURES).not.toHaveProperty("plus");
  });

  // ─── Alumnos ilimitados ─────────────────────────────────────────────────

  it("plan 'basic' tiene alumnos ilimitados (Infinity)", () => {
    expect(PLAN_FEATURES.basic.alumnos).toBe(Infinity);
  });

  it("plan 'multi' tiene alumnos ilimitados (Infinity)", () => {
    expect(PLAN_FEATURES.multi.alumnos).toBe(Infinity);
  });

  // ─── WhatsApp ────────────────────────────────────────────────────────────

  it("plan 'basic' NO tiene WhatsApp", () => {
    expect(PLAN_FEATURES.basic.avisos_whatsapp).toBe(false);
  });

  it("plan 'multi' SÍ tiene WhatsApp", () => {
    expect(PLAN_FEATURES.multi.avisos_whatsapp).toBe(true);
  });

  // ─── Sucursales ──────────────────────────────────────────────────────────

  it("plan 'basic' tiene 1 sucursal máximo", () => {
    expect(PLAN_FEATURES.basic.max_sucursales).toBe(1);
  });

  it("plan 'multi' tiene 5 sucursales máximo", () => {
    expect(PLAN_FEATURES.multi.max_sucursales).toBe(5);
  });

  // ─── Admins ──────────────────────────────────────────────────────────────

  it("plan 'basic' tiene 3 admins", () => {
    expect(PLAN_FEATURES.basic.max_admins).toBe(3);
  });

  it("plan 'multi' tiene 10 admins", () => {
    expect(PLAN_FEATURES.multi.max_admins).toBe(10);
  });

  // ─── Branding ────────────────────────────────────────────────────────────

  it("plan 'basic' SÍ tiene branding propio", () => {
    expect(PLAN_FEATURES.basic.branding_propio).toBe(true);
  });

  it("plan 'multi' SÍ tiene branding propio", () => {
    expect(PLAN_FEATURES.multi.branding_propio).toBe(true);
  });

  // ─── Type safety ─────────────────────────────────────────────────────────

  it("el tipo Plan solo acepta 'basic' y 'multi'", () => {
    const planesValidos: Plan[] = ["basic", "multi"];
    expect(Object.keys(PLAN_FEATURES)).toEqual(planesValidos);
  });
});
