import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Dataset de escenarios para generarCuotasMes (cron mensual de generación de cuotas).
// Cubre: alumno con actividades inscriptas (cuota por actividad), flujo legacy
// (cuota única sin actividad), filtros de exclusión (activo/deleted_at),
// gym sin configuración y gym sin alumnos.

function chain(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "order"]) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.single = vi.fn().mockResolvedValue(result);
  (c as unknown as { then: (resolve: (v: unknown) => void) => void }).then = (resolve) => resolve(result);
  return c as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<{ data: unknown; error: unknown }>;
}

const CONFIG_BASE = { monto_base_defecto: 5000, dia_vencimiento_mensual: 10 };

describe("generarCuotasMes — dataset de escenarios del cron mensual", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.clearAllMocks());

  it("a. alumno con actividades activas → genera una cuota por cada actividad inscripta", async () => {
    const alumno = { id: "alumno-1", monto_cuota_personalizado: null };
    const inscripcionConPersonalizado = {
      actividad_id: "act-1", monto_personalizado: 9000, actividades: { monto_base: 8000 },
    };
    const inscripcionSinPersonalizado = {
      actividad_id: "act-2", monto_personalizado: null, actividades: { monto_base: 6000 },
    };

    const configChain = chain({ data: CONFIG_BASE, error: null });
    const alumnosChain = chain({ data: [alumno], error: null });
    const actividadesChain = chain({ data: [inscripcionConPersonalizado, inscripcionSinPersonalizado], error: null });
    const insertSpy = vi.fn().mockResolvedValue({ error: null });

    const fromMock = vi.fn()
      .mockReturnValueOnce(configChain)
      .mockReturnValueOnce(alumnosChain)
      .mockReturnValueOnce(actividadesChain)
      .mockReturnValueOnce({ insert: insertSpy })
      .mockReturnValueOnce({ insert: insertSpy });

    const { generarCuotasMes } = await import("@/lib/cuotas");
    const result = await generarCuotasMes({ from: fromMock } as never, "gym-uuid", 6, 2026);

    expect(result).toEqual({ creadas: 2, error: null });
    // monto_personalizado de la inscripción tiene prioridad sobre actividades.monto_base
    expect(insertSpy.mock.calls[0]?.[0]).toMatchObject({ actividad_id: "act-1", monto_base: 9000, mes: 6, anio: 2026, fecha_vencimiento: "2026-06-10" });
    // sin monto_personalizado → usa actividades.monto_base
    expect(insertSpy.mock.calls[1]?.[0]).toMatchObject({ actividad_id: "act-2", monto_base: 6000 });
  });

  it("b. alumno sin actividades inscriptas → flujo legacy: cuota única usando su monto personalizado", async () => {
    const alumno = { id: "alumno-2", monto_cuota_personalizado: 7000 };

    const configChain = chain({ data: CONFIG_BASE, error: null });
    const alumnosChain = chain({ data: [alumno], error: null });
    const actividadesChain = chain({ data: [], error: null });
    const insertSpy = vi.fn().mockResolvedValue({ error: null });

    const fromMock = vi.fn()
      .mockReturnValueOnce(configChain)
      .mockReturnValueOnce(alumnosChain)
      .mockReturnValueOnce(actividadesChain)
      .mockReturnValueOnce({ insert: insertSpy });

    const { generarCuotasMes } = await import("@/lib/cuotas");
    const result = await generarCuotasMes({ from: fromMock } as never, "gym-uuid", 6, 2026);

    expect(result).toEqual({ creadas: 1, error: null });
    const payload = insertSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.monto_base).toBe(7000); // prioriza el monto personalizado del alumno sobre el default del gym
    expect(payload.actividad_id).toBeUndefined();
  });

  it("c. alumno legacy sin personalizado y sin default del gym → no genera cuota (monto en 0)", async () => {
    const alumno = { id: "alumno-3", monto_cuota_personalizado: null };

    const configChain = chain({ data: { monto_base_defecto: null, dia_vencimiento_mensual: 10 }, error: null });
    const alumnosChain = chain({ data: [alumno], error: null });
    const actividadesChain = chain({ data: [], error: null });
    const insertSpy = vi.fn();

    const fromMock = vi.fn()
      .mockReturnValueOnce(configChain)
      .mockReturnValueOnce(alumnosChain)
      .mockReturnValueOnce(actividadesChain)
      .mockReturnValueOnce({ insert: insertSpy });

    const { generarCuotasMes } = await import("@/lib/cuotas");
    const result = await generarCuotasMes({ from: fromMock } as never, "gym-uuid", 6, 2026);

    expect(result).toEqual({ creadas: 0, error: null });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("d. idempotencia: insert duplicado (23505) no incrementa el contador ni rompe el cron", async () => {
    const alumno = { id: "alumno-4", monto_cuota_personalizado: 5000 };

    const configChain = chain({ data: CONFIG_BASE, error: null });
    const alumnosChain = chain({ data: [alumno], error: null });
    const actividadesChain = chain({ data: [], error: null });
    const insertSpy = vi.fn().mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });

    const fromMock = vi.fn()
      .mockReturnValueOnce(configChain)
      .mockReturnValueOnce(alumnosChain)
      .mockReturnValueOnce(actividadesChain)
      .mockReturnValueOnce({ insert: insertSpy });

    const { generarCuotasMes } = await import("@/lib/cuotas");
    const result = await generarCuotasMes({ from: fromMock } as never, "gym-uuid", 6, 2026);

    expect(result).toEqual({ creadas: 0, error: null });
  });

  it("e. filtra alumnos por activo=true y deleted_at=null (excluye inactivos/dados de baja)", async () => {
    const configChain = chain({ data: CONFIG_BASE, error: null });
    const alumnosChain = chain({ data: [], error: null });

    const fromMock = vi.fn().mockReturnValueOnce(configChain).mockReturnValueOnce(alumnosChain);

    const { generarCuotasMes } = await import("@/lib/cuotas");
    await generarCuotasMes({ from: fromMock } as never, "gym-uuid", 6, 2026);

    const eqCalls = alumnosChain.eq.mock.calls;
    const isCalls = alumnosChain.is.mock.calls;
    expect(eqCalls).toEqual(expect.arrayContaining([["gym_id", "gym-uuid"], ["activo", true]]));
    expect(isCalls).toEqual(expect.arrayContaining([["deleted_at", null]]));
  });

  it("f. gym sin gym_config → no genera nada y reporta el motivo", async () => {
    const configChain = chain({ data: null, error: null });
    const alumnosChain = chain({ data: [{ id: "x", monto_cuota_personalizado: null }], error: null });
    const fromMock = vi.fn().mockReturnValueOnce(configChain).mockReturnValueOnce(alumnosChain);

    const { generarCuotasMes } = await import("@/lib/cuotas");
    const result = await generarCuotasMes({ from: fromMock } as never, "gym-uuid", 6, 2026);

    expect(result).toEqual({ creadas: 0, error: "Sin configuración" });
  });

  it("g. gym sin alumnos activos → no genera nada", async () => {
    const configChain = chain({ data: CONFIG_BASE, error: null });
    const alumnosChain = chain({ data: [], error: null });
    const fromMock = vi.fn().mockReturnValueOnce(configChain).mockReturnValueOnce(alumnosChain);

    const { generarCuotasMes } = await import("@/lib/cuotas");
    const result = await generarCuotasMes({ from: fromMock } as never, "gym-uuid", 6, 2026);

    expect(result).toEqual({ creadas: 0, error: null });
  });
});
