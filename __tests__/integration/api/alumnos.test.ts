import { describe, it, expect, vi, beforeEach } from "vitest";

// Tests de la API de alumnos
// Verifica: multi-tenancy, soft delete, sin límite de alumnos

describe("API /api/alumnos — multi-tenancy", () => {
  it("GET nunca devuelve alumnos de otro gym", async () => {
    // El gym_id en las queries siempre viene del usuario autenticado (via get_user_gym_id),
    // nunca del query param o body
    // Este test verifica el contrato a nivel unitario de lib/alumnos.ts

    // Mock con encadenamiento completo: select().eq().is().order()
    const chainMock: Record<string, unknown> = {};
    chainMock.select = vi.fn().mockReturnValue(chainMock);
    chainMock.eq     = vi.fn().mockReturnValue(chainMock);
    chainMock.is     = vi.fn().mockReturnValue(chainMock);
    chainMock.order  = vi.fn().mockResolvedValue({ data: [], error: null });

    const mockSupabase = {
      from: vi.fn().mockReturnValue(chainMock),
    };

    const { getAlumnos } = await import("@/lib/alumnos");
    const gymIdA = "gym-a-uuid";

    await getAlumnos(mockSupabase as never, gymIdA, {});

    // Verificar que gym_id fue pasado como filtro
    const fromCall = mockSupabase.from.mock.calls[0];
    expect(fromCall[0]).toBe("alumnos");

    // Verificar que eq fue llamado con gym_id
    const eqMock = chainMock.eq as ReturnType<typeof vi.fn>;
    const calls = eqMock.mock.calls as [string, string][];
    expect(calls.some(([col, val]) => col === "gym_id" && val === gymIdA)).toBe(true);
  });

  it("softDeleteAlumno usa deleted_at, no DELETE físico", async () => {
    const updateMock = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: updateMock.mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }),
    };

    const { softDeleteAlumno } = await import("@/lib/alumnos");
    await softDeleteAlumno(mockSupabase as never, "gym-id", "alumno-id");

    // Verificar que se llama UPDATE (soft delete), no DELETE
    expect(mockSupabase.from).toHaveBeenCalledWith("alumnos");
    // El primer argumento de update debe incluir deleted_at
    const updateArg = updateMock.mock.calls[0]?.[0];
    expect(updateArg).toHaveProperty("deleted_at");
    expect(updateArg.deleted_at).not.toBeNull();
  });
});

describe("API /api/alumnos — sin límite de alumnos", () => {
  it("PLAN_FEATURES no tiene límite de alumnos en ningún plan", async () => {
    const { PLAN_FEATURES } = await import("@/lib/features");

    // Verificar que ningún plan tiene un tope numérico de alumnos
    for (const [planName, features] of Object.entries(PLAN_FEATURES)) {
      expect(
        (features as Record<string, unknown>).alumnos,
        `Plan ${planName} no debe tener límite de alumnos`
      ).toBe(Infinity);
    }
  });
});
