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

  it("a. gym sin config de recargos → marca vencidas pero nunca evalúa ni aplica recargos", async () => {
    const marcarVencidas = chain();
    const config = chain({ data: CONFIG_SIN_RECARGOS, error: null });
    const fromMock = vi.fn().mockReturnValueOnce(marcarVencidas).mockReturnValueOnce(config);

    const { aplicarRecargosGym } = await import("@/lib/cuotas");
    await aplicarRecargosGym({ from: fromMock } as never, "gym-uuid");

    // Sólo: marcar vencidas + leer config. Nunca llega a consultar cuotas vencidas para recargo.
    expect(fromMock).toHaveBeenCalledTimes(2);
  });

  it("b. cuota recién vencida (menos días que recargo_1_dias) → sin recargo todavía", async () => {
    const cuota = {
      id: "cuota-1", monto_base: 10000,
      fecha_vencimiento: fechaHaceNDias(1), // venció ayer; recargo_1_dias = 3
      recargo_nivel: null,
    };
    const marcarVencidas = chain();
    const config = chain({ data: CONFIG_SOLO_NIVEL_1, error: null });
    const vencidas1 = chain({ data: [cuota], error: null });
    const fromMock = vi.fn()
      .mockReturnValueOnce(marcarVencidas)
      .mockReturnValueOnce(config)
      .mockReturnValueOnce(vencidas1);

    const { aplicarRecargosGym } = await import("@/lib/cuotas");
    await aplicarRecargosGym({ from: fromMock } as never, "gym-uuid");

    // No debe haber un 4to from("cuotas") para aplicar update de recargo
    expect(fromMock).toHaveBeenCalledTimes(3);
  });

  it("c. cuota cruza el umbral de recargo_1_dias → aplica nivel 1 con el % configurado", async () => {
    const cuota = {
      id: "cuota-2", monto_base: 10000,
      fecha_vencimiento: fechaHaceNDias(3), // exactamente recargo_1_dias = 3
      recargo_nivel: null,
    };
    const marcarVencidas = chain();
    const config = chain({ data: CONFIG_SOLO_NIVEL_1, error: null });
    const vencidas1 = chain({ data: [cuota], error: null });
    const updateNivel1 = chain();
    const fromMock = vi.fn()
      .mockReturnValueOnce(marcarVencidas)
      .mockReturnValueOnce(config)
      .mockReturnValueOnce(vencidas1)
      .mockReturnValueOnce(updateNivel1);

    const { aplicarRecargosGym } = await import("@/lib/cuotas");
    await aplicarRecargosGym({ from: fromMock } as never, "gym-uuid");

    const payload = updateNivel1.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ monto_recargo: 1000, recargo_nivel: 1 }); // 10% de 10000
    expect(payload.recargo_aplicado_en).toBeTruthy();
  });

  it("d. cuota ya en nivel 1 cruza el umbral de recargo_2_dias → escala a nivel 2", async () => {
    const cuotaNivel1 = {
      id: "cuota-3", monto_base: 20000,
      fecha_vencimiento: fechaHaceNDias(10), // recargo_2_dias = 10
      recargo_nivel: 1,
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

  it("e. nivel 1 ya aplicado pero recargo_2_dias no está configurado → nunca evalúa nivel 2", async () => {
    const marcarVencidas = chain();
    const config = chain({ data: CONFIG_SOLO_NIVEL_1, error: null }); // recargo_2_dias: null
    const vencidas1 = chain({ data: [], error: null });
    const fromMock = vi.fn()
      .mockReturnValueOnce(marcarVencidas)
      .mockReturnValueOnce(config)
      .mockReturnValueOnce(vencidas1);

    const { aplicarRecargosGym } = await import("@/lib/cuotas");
    await aplicarRecargosGym({ from: fromMock } as never, "gym-uuid");

    // No debe consultar cuotas en nivel 1 para intentar escalar a nivel 2
    expect(fromMock).toHaveBeenCalledTimes(3);
  });
});
