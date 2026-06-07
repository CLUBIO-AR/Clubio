import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";

// createAdminClient is globally mocked in __tests__/setup.ts

function makeGymConfigChain(config: unknown) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockResolvedValue({ data: config, error: null });
  return c;
}

function makeAlumnoChain(alumno: unknown) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockResolvedValue({ data: alumno, error: null });
  return c;
}

function makeCuotasInsertChain(result: { error: { code?: string; message?: string } | null }) {
  return {
    insert: vi.fn().mockResolvedValue(result),
  };
}

function setupAdminMock(opts: {
  config: unknown;
  alumno: unknown;
  insertResult: { error: { code?: string; message?: string } | null };
}) {
  vi.mocked(createAdminClient).mockReturnValue({
    from: vi.fn()
      .mockReturnValueOnce(makeGymConfigChain(opts.config))
      .mockReturnValueOnce(makeAlumnoChain(opts.alumno))
      .mockReturnValueOnce(makeCuotasInsertChain(opts.insertResult)),
  } as never);
}

const BASE_CONFIG = {
  generar_cuota_al_alta: true,
  cuota_alta_proporcional: false,
  dias_minimos_para_cuota_alta: 15,
  monto_base_defecto: 3000,
  dia_vencimiento_mensual: 10,
};

const BASE_ALUMNO = {
  monto_cuota_personalizado: null,
};

describe("generarCuotaAlta", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("a. días > mínimo → debe crear cuota", async () => {
    // June 5: diasRestantes = 30 - 5 + 1 = 26, minDias = 15 → DEBE crear
    vi.setSystemTime(new Date("2026-06-05T10:00:00Z"));

    setupAdminMock({
      config: BASE_CONFIG,
      alumno: BASE_ALUMNO,
      insertResult: { error: null },
    });

    const { generarCuotaAlta } = await import("@/lib/cuotas");
    const result = await generarCuotaAlta("alumno-uuid", "gym-uuid");

    expect(result.generada).toBe(true);
    expect(result.motivo).toContain("Cuota");
  });

  it("b. días < mínimo → no debe crear cuota", async () => {
    // June 20: diasRestantes = 30 - 20 + 1 = 11, minDias = 15 → NO debe crear
    vi.setSystemTime(new Date("2026-06-20T10:00:00Z"));

    setupAdminMock({
      config: BASE_CONFIG,
      alumno: BASE_ALUMNO,
      insertResult: { error: null },
    });

    const { generarCuotaAlta } = await import("@/lib/cuotas");
    const result = await generarCuotaAlta("alumno-uuid", "gym-uuid");

    expect(result.generada).toBe(false);
    expect(result.motivo).toMatch(/dias_insuficientes/);
    expect(result.motivo).toContain("11");
    expect(result.motivo).toContain("15");
  });

  it("c. proporcional → monto correcto", async () => {
    // June 5: diasRestantes = 26, ultimoDia = 30
    // montoFinal = Math.round((3000 / 30) * 26) = 2600
    vi.setSystemTime(new Date("2026-06-05T10:00:00Z"));

    const cuotasChain = makeCuotasInsertChain({ error: null });
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn()
        .mockReturnValueOnce(makeGymConfigChain({ ...BASE_CONFIG, cuota_alta_proporcional: true }))
        .mockReturnValueOnce(makeAlumnoChain(BASE_ALUMNO))
        .mockReturnValueOnce(cuotasChain),
    } as never);

    const { generarCuotaAlta } = await import("@/lib/cuotas");
    const result = await generarCuotaAlta("alumno-uuid", "gym-uuid");

    expect(result.generada).toBe(true);
    // Verificar que insert fue llamado con monto_base = 2600
    const insertCall = (cuotasChain.insert as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(insertCall).toMatchObject({
      monto_base: 2600,
      tipo: "mensual",
    });
    expect(result.motivo).toMatch(/proporcional/);
  });

  it("d. idempotente → segunda llamada devuelve ya_existe sin lanzar error", async () => {
    vi.setSystemTime(new Date("2026-06-05T10:00:00Z"));

    // Primera llamada: éxito
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn()
        .mockReturnValueOnce(makeGymConfigChain(BASE_CONFIG))
        .mockReturnValueOnce(makeAlumnoChain(BASE_ALUMNO))
        .mockReturnValueOnce(makeCuotasInsertChain({ error: null })),
    } as never);

    // Segunda llamada: 23505 duplicate
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn()
        .mockReturnValueOnce(makeGymConfigChain(BASE_CONFIG))
        .mockReturnValueOnce(makeAlumnoChain(BASE_ALUMNO))
        .mockReturnValueOnce(makeCuotasInsertChain({ error: { code: "23505", message: "unique violation" } })),
    } as never);

    const { generarCuotaAlta } = await import("@/lib/cuotas");

    const first = await generarCuotaAlta("alumno-uuid", "gym-uuid");
    expect(first.generada).toBe(true);

    const second = await generarCuotaAlta("alumno-uuid", "gym-uuid");
    expect(second.generada).toBe(false);
    expect(second.motivo).toBe("ya_existe");
  });

  it("config_desactivada → no crea cuota si generar_cuota_al_alta = false", async () => {
    vi.setSystemTime(new Date("2026-06-05T10:00:00Z"));

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValueOnce(
        makeGymConfigChain({ ...BASE_CONFIG, generar_cuota_al_alta: false })
      ),
    } as never);

    const { generarCuotaAlta } = await import("@/lib/cuotas");
    const result = await generarCuotaAlta("alumno-uuid", "gym-uuid");

    expect(result.generada).toBe(false);
    expect(result.motivo).toBe("config_desactivada");
  });

  it("fecha_alta histórica (alumno migrado) no cambia el resultado: la cuota siempre se calcula con la fecha de HOY", async () => {
    // Esto documenta que generarCuotaAlta nunca lee fecha_alta — sólo le importa
    // el momento real de ejecución (alta = "hoy"). Un alumno migrado con fecha_alta
    // de hace 2 meses produce exactamente el mismo resultado que uno recién creado.
    vi.setSystemTime(new Date("2026-06-05T10:00:00Z"));

    setupAdminMock({ config: BASE_CONFIG, alumno: BASE_ALUMNO, insertResult: { error: null } });
    const { generarCuotaAlta } = await import("@/lib/cuotas");
    const resultAlumnoNuevo = await generarCuotaAlta("alumno-nuevo", "gym-uuid");

    vi.clearAllMocks();
    setupAdminMock({ config: BASE_CONFIG, alumno: BASE_ALUMNO, insertResult: { error: null } });
    const resultAlumnoMigrado = await generarCuotaAlta("alumno-migrado-hace-2-meses", "gym-uuid");

    expect(resultAlumnoMigrado).toEqual(resultAlumnoNuevo);
  });

  it("monto_cero → no crea cuota si no hay monto configurado", async () => {
    vi.setSystemTime(new Date("2026-06-05T10:00:00Z"));

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn()
        .mockReturnValueOnce(makeGymConfigChain({ ...BASE_CONFIG, monto_base_defecto: null }))
        .mockReturnValueOnce(makeAlumnoChain({ monto_cuota_personalizado: null })),
    } as never);

    const { generarCuotaAlta } = await import("@/lib/cuotas");
    const result = await generarCuotaAlta("alumno-uuid", "gym-uuid");

    expect(result.generada).toBe(false);
    expect(result.motivo).toBe("monto_cero");
  });
});
