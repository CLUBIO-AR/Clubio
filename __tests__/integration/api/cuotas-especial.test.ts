import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";

// api-auth.ts is mocked here so the route can be imported cleanly
vi.mock("@/lib/supabase/api-auth", () => ({
  getApiGymId: vi.fn(),
}));

import { getApiGymId } from "@/lib/supabase/api-auth";

const GYM_ID = "550e8400-e29b-41d4-a716-446655440001";
const ALUMNO_ID = "550e8400-e29b-41d4-a716-446655440002";

const VALID_BODY = {
  alumno_id: ALUMNO_ID,
  tipo: "mensual",
  mes: 6,
  anio: 2026,
  monto_base: 3000,
  fecha_vencimiento: "2026-06-10",
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/cuotas/especial", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeAlumnoChain(alumno: { id: string } | null) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.is = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockResolvedValue({ data: alumno, error: alumno ? null : { message: "Not found" } });
  return c;
}

function makeCuotasInsertChain(result: {
  data?: Record<string, unknown> | null;
  error?: { code?: string; message?: string } | null;
}) {
  const c: Record<string, unknown> = {};
  c.insert = vi.fn().mockReturnValue(c);
  c.select = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockResolvedValue(result);
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getApiGymId).mockResolvedValue(GYM_ID);
});

describe("POST /api/cuotas/especial", () => {
  it("e. tipo 'mensual' duplicado → 409", async () => {
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn()
        .mockReturnValueOnce(makeAlumnoChain({ id: ALUMNO_ID }))
        .mockReturnValueOnce(makeCuotasInsertChain({
          data: null,
          error: { code: "23505", message: "duplicate key value" },
        })),
    } as never);

    const { POST } = await import("@/app/api/cuotas/especial/route");
    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/cuota mensual/i);
  });

  it("f. tipo 'clase_suelta' duplicado → 201 (permitido)", async () => {
    const cuotaCreada = {
      id: "cuota-uuid",
      tipo: "clase_suelta",
      descripcion: "Clase extra",
      mes: 6,
      anio: 2026,
      monto_base: 500,
      monto_total: 500,
      estado: "pendiente",
      fecha_vencimiento: "2026-06-10",
    };

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn()
        .mockReturnValueOnce(makeAlumnoChain({ id: ALUMNO_ID }))
        .mockReturnValueOnce(makeCuotasInsertChain({ data: cuotaCreada, error: null })),
    } as never);

    const { POST } = await import("@/app/api/cuotas/especial/route");
    const body = {
      ...VALID_BODY,
      tipo: "clase_suelta",
      descripcion: "Clase extra",
    };
    const res = await POST(makeRequest(body));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.tipo).toBe("clase_suelta");
  });

  it("g. alumno de otro gym → 404 (no accesible)", async () => {
    // El alumno no aparece en la query filtrada por gym_id → null
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValueOnce(makeAlumnoChain(null)),
    } as never);

    const { POST } = await import("@/app/api/cuotas/especial/route");
    const res = await POST(makeRequest(VALID_BODY));

    // La implementación devuelve 404 (no revela si el recurso existe en otro gym)
    expect(res.status).toBe(404);
  });

  it("sin sesión → 401", async () => {
    vi.mocked(getApiGymId).mockResolvedValue(null);

    const { POST } = await import("@/app/api/cuotas/especial/route");
    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(401);
  });

  it("tipo no mensual sin descripción → 400", async () => {
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn() } as never);

    const { POST } = await import("@/app/api/cuotas/especial/route");
    const body = { ...VALID_BODY, tipo: "clase_suelta" }; // sin descripcion
    const res = await POST(makeRequest(body));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/descripci/i);
  });

  it("cuota mensual creada correctamente → 201", async () => {
    const cuotaCreada = {
      id: "cuota-uuid",
      tipo: "mensual",
      descripcion: null,
      mes: 6,
      anio: 2026,
      monto_base: 3000,
      monto_total: 3000,
      estado: "pendiente",
      fecha_vencimiento: "2026-06-10",
    };

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn()
        .mockReturnValueOnce(makeAlumnoChain({ id: ALUMNO_ID }))
        .mockReturnValueOnce(makeCuotasInsertChain({ data: cuotaCreada, error: null })),
    } as never);

    const { POST } = await import("@/app/api/cuotas/especial/route");
    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("cuota-uuid");
    expect(json.tipo).toBe("mensual");
  });
});
