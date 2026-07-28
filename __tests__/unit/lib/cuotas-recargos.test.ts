import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Dataset de escenarios de mora para aplicarRecargosGym.
// Cubre: gym sin config de recargos, cuota recién vencida (todavía sin recargo),
// cruce del umbral de nivel 1, escalada a nivel 2, y nivel 2 no configurado.
//
// aplicarRecargosGym recibe el cliente de supabase por parámetro (no usa
// createAdminClient), así que mockeamos un cliente mínimo "thenable" que
// imita el query builder de supabase-js: cada método encadenable devuelve
// la misma cadena, y awaitear la cadena resuelve { data, error }.

function chain(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "update", "insert", "eq", "lt", "gte", "lte", "or", "is", "order"]) {
    c[m] = vi.fn().mockReturnValue(c);
  }
  c.single = vi.fn().mockResolvedValue(result);
  (c as unknown as { then: (resolve: (v: unknown) => void) => void }).then = (resolve) => resolve(result);
  return c as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<{ data: unknown; error: unknown }>;
}

const HOY = new Date("2026-06-20T12:00:00Z");

function fechaHaceNDias(n: number): string {
  const d = new Date(HOY);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

const CONFIG_SIN_RECARGOS = {
  recargo_1_dias: null, recargo_1_porcentaje: null, recargo_2_dias: null, recargo_2_porcentaje: null,
};
const CONFIG_SOLO_NIVEL_1 = {
  recargo_1_dias: 3, recargo_1_porcentaje: 10, recargo_2_dias: null, recargo_2_porcentaje: null,
};
const CONFIG_DOS_NIVELES = {
  recargo_1_dias: 1, recargo_1_porcentaje: 10, recargo_2_dias: 10, recargo_2_porcentaje: 25,
};

describe("aplicarRecargosGym — dataset de escenarios de mora", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(HOY);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("a. gym sin config de recargos → marca vencidas, evalúa niveles 1 y 2 pero no aplica nada", async () => {
    const marcarVencidas = chain();
    const config = chain({ data: CONFIG_SIN_RECARGOS, error: null });
    const vencidas1 = chain({ data: [], error: null });
    const vencidas2 = chain({ data: [], error: null });
    const fromMock = vi.fn()
      .mockReturnValueOnce(marcarVencidas)
      .mockReturnValueOnce(config)
      .mockReturnValueOnce(vencidas1)
      .mockReturnValueOnce(vencidas2);

    const { aplicarRecargosGym } = await import("@/lib/cuotas");
    await aplicarRecargosGym({ from: fromMock } as never, "gym-uuid");

    // marcar vencidas + config + consultar nivel 1 y nivel 2 (siempre se evalúan,
    // ya que una actividad puede tener su propio recargo aunque el gym no tenga uno global).
    expect(fromMock).toHaveBeenCalledTimes(4);
  });

  it("b. cuota recién vencida (menos días que recargo_1_dias) → sin recargo todavía", async () => {
    const cuota = {
      id: "cuota-1", monto_base: 10000,
      fecha_vencimiento: fechaHaceNDias(1), // venció ayer; recargo_1_dias = 3
      recargo_nivel: null,
      actividades: null,
    };
    const marcarVencidas = chain();
    const config = chain({ data: CONFIG_SOLO_NIVEL_1, error: null });
    const vencidas1 = chain({ data: [cuota], error: null });
    const vencidas2 = chain({ data: [], error: null });
    const fromMock = vi.fn()
      .mockReturnValueOnce(marcarVencidas)
      .mockReturnValueOnce(config)
      .mockReturnValueOnce(vencidas1)
      .mockReturnValueOnce(vencidas2);

    const { aplicarRecargosGym } = await import("@/lib/cuotas");
    await aplicarRecargosGym({ from: fromMock } as never, "gym-uuid");

    // No debe haber un 5to from("cuotas") para aplicar update de recargo
    expect(fromMock).toHaveBeenCalledTimes(4);
  });

  it("c. cuota cruza el umbral de recargo_1_dias → aplica nivel 1 con el % configurado", async () => {
    const cuota = {
      id: "cuota-2", monto_base: 10000,
      fecha_vencimiento: fechaHaceNDias(3), // exactamente recargo_1_dias = 3
      recargo_nivel: null,
      actividades: null,
    };
    const marcarVencidas = chain();
    const config = chain({ data: CONFIG_SOLO_NIVEL_1, error: null });
    const vencidas1 = chain({ data: [cuota], error: null });
    const updateNivel1 = chain();
    const vencidas2 = chain({ data: [], error: null });
    const fromMock = vi.fn()
      .mockReturnValueOnce(marcarVencidas)
      .mockReturnValueOnce(config)
      .mockReturnValueOnce(vencidas1)
      .mockReturnValueOnce(updateNivel1)
      .mockReturnValueOnce(vencidas2);

    const { aplicarRecargosGym } = await import("@/lib/cuotas");
    await aplicarRecargosGym({ from: fromMock } as never, "gym-uuid");

    const payload = updateNivel1.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ monto_recargo: 1000, recargo_nivel: 1 }); // 10% de 10000
    expect(payload.recargo_aplicado_en).toBeTruthy();
  });

  it("g. mora_desactivar_mes_siguiente: cuota vencida de un mes anterior → desactiva; cuota del mes actual → no todavía", async () => {
    const cuotaMesAnterior = {
      id: "cuota-may", alumno_id: "alumno-may", mes: 5, anio: 2026, // HOY es junio 2026
      fecha_vencimiento: "2026-05-10",
    };
    const cuotaMesActual = {
      id: "cuota-jun", alumno_id: "alumno-jun", mes: 6, anio: 2026,
      fecha_vencimiento: "2026-06-10",
    };
    const marcarVencidas = chain();
    const config = chain({
      data: { ...CONFIG_SIN_RECARGOS, dias_mora_desactivacion: null, mora_desactivar_mes_siguiente: true },
      error: null,
    });
    const vencidas1 = chain({ data: [], error: null });
    const vencidas2 = chain({ data: [], error: null });
    const candidatas = chain({ data: [cuotaMesAnterior, cuotaMesActual], error: null });
    const alumnoMay = chain({ data: { activo: true }, error: null });
    const updateAlumnoMay = chain();
    const updateCuotaMay = chain();
    const fromMock = vi.fn()
      .mockReturnValueOnce(marcarVencidas)
      .mockReturnValueOnce(config)
      .mockReturnValueOnce(vencidas1)
      .mockReturnValueOnce(vencidas2)
      .mockReturnValueOnce(candidatas)
      .mockReturnValueOnce(alumnoMay)       // select activo del alumno de mayo
      .mockReturnValueOnce(updateAlumnoMay) // desactiva al alumno de mayo
      .mockReturnValueOnce(updateCuotaMay); // marca esa cuota como ya procesada
    // cuotaMesActual (junio) no cumple el umbral → no genera más llamadas a from()

    const { aplicarRecargosGym } = await import("@/lib/cuotas");
    await aplicarRecargosGym({ from: fromMock } as never, "gym-uuid");

    expect(updateAlumnoMay.update).toHaveBeenCalledWith({ activo: false, desactivado_por_mora: true });
    expect(updateCuotaMay.update).toHaveBeenCalledWith({ desactivo_alumno: true });
    expect(fromMock).toHaveBeenCalledTimes(8);
  });

  it("f. la actividad tiene su propio % de recargo → prioriza ese valor sobre el del gym", async () => {
    const cuota = {
      id: "cuota-actividad", monto_base: 40000,
      fecha_vencimiento: fechaHaceNDias(1), // 1 día vencida — recargo de la actividad es a partir de 1 día
      recargo_nivel: null,
      actividades: { recargo_1_dias: 1, recargo_1_porcentaje: 10 }, // "Cross": 40000 → 44000 = +10%
    };
    const marcarVencidas = chain();
    const config = chain({ data: CONFIG_SIN_RECARGOS, error: null }); // el gym no tiene recargo propio
    const vencidas1 = chain({ data: [cuota], error: null });
    const updateNivel1 = chain();
    const vencidas2 = chain({ data: [], error: null });
    const fromMock = vi.fn()
      .mockReturnValueOnce(marcarVencidas)
      .mockReturnValueOnce(config)
      .mockReturnValueOnce(vencidas1)
      .mockReturnValueOnce(updateNivel1)
      .mockReturnValueOnce(vencidas2);

    const { aplicarRecargosGym } = await import("@/lib/cuotas");
    await aplicarRecargosGym({ from: fromMock } as never, "gym-uuid");

    const payload = updateNivel1.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ monto_recargo: 4000, recargo_nivel: 1 }); // 10% de 40000
  });

  it("d. cuota ya en nivel 1 cruza el umbral de recargo_2_dias → escala a nivel 2", async () => {
    const cuotaNivel1 = {
      id: "cuota-3", monto_base: 20000,
      fecha_vencimiento: fechaHaceNDias(10), // recargo_2_dias = 10
      recargo_nivel: 1,
      actividades: null,
    };
    const marcarVencidas = chain();
    const config = chain({ data: CONFIG_DOS_NIVELES, error: null });
    const vencidas1 = chain({ data: [], error: null }); // nadie pendiente de pasar a nivel 1
    const vencidas2 = chain({ data: [cuotaNivel1], error: null });
    const updateNivel2 = chain();
    const fromMock = vi.fn()
      .mockReturnValueOnce(marcarVencidas)
      .mockReturnValueOnce(config)
      .mockReturnValueOnce(vencidas1)
      .mockReturnValueOnce(vencidas2)
      .mockReturnValueOnce(updateNivel2);

    const { aplicarRecargosGym } = await import("@/lib/cuotas");
    await aplicarRecargosGym({ from: fromMock } as never, "gym-uuid");

    const payload = updateNivel2.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ monto_recargo: 5000, recargo_nivel: 2 }); // 25% de 20000
  });

  it("e. nivel 1 ya aplicado pero recargo_2_dias no está configurado (ni por actividad) → nunca aplica nivel 2", async () => {
    const cuotaNivel1 = {
      id: "cuota-x", monto_base: 10000,
      fecha_vencimiento: fechaHaceNDias(15),
      recargo_nivel: 1,
      actividades: null,
    };
    const marcarVencidas = chain();
    const config = chain({ data: CONFIG_SOLO_NIVEL_1, error: null }); // recargo_2_dias: null
    const vencidas1 = chain({ data: [], error: null });
    const vencidas2 = chain({ data: [cuotaNivel1], error: null });
    const fromMock = vi.fn()
      .mockReturnValueOnce(marcarVencidas)
      .mockReturnValueOnce(config)
      .mockReturnValueOnce(vencidas1)
      .mockReturnValueOnce(vencidas2);

    const { aplicarRecargosGym } = await import("@/lib/cuotas");
    await aplicarRecargosGym({ from: fromMock } as never, "gym-uuid");

    // Consulta nivel 2 pero, sin dias/pct efectivos (ni gym ni actividad), no llega a actualizar nada.
    expect(fromMock).toHaveBeenCalledTimes(4);
  });
});
