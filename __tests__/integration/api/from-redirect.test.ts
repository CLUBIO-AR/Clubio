import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import * as mpLib from "@/lib/mercadopago";

vi.mock("@/lib/mercadopago", () => ({
  getMpPayment: vi.fn(),
}));

// createAdminClient globally mocked in __tests__/setup.ts

const CUOTA_ID   = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const PAYMENT_ID = "987654321";
const GYM_ID     = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
const ALUMNO_ID  = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/webhooks/mercadopago/from-redirect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Builds the admin mock chain for the happy path or customized scenarios.
// Call order matches the route: pagos.maybeSingle → cuotas.single → gym_config.single → pagos.insert → cuotas.update
function buildAdminMock({
  existente = null,
  cuota = { id: CUOTA_ID, gym_id: GYM_ID, alumno_id: ALUMNO_ID, monto_total: 5000, estado: "pendiente" },
  gymConfig = { mp_access_token: "TEST_TOKEN" },
  insertError = null,
}: {
  existente?: unknown;
  cuota?: unknown;
  gymConfig?: unknown;
  insertError?: { code?: string; message: string } | null;
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: existente, error: null });
  const cuotaSingle = vi.fn().mockResolvedValue({ data: cuota, error: null });
  const gymSingle   = vi.fn().mockResolvedValue({ data: gymConfig, error: null });
  const insertFn    = vi.fn().mockResolvedValue({ error: insertError });
  const updateEq    = vi.fn().mockResolvedValue({ error: null });
  const updateFn    = vi.fn().mockReturnValue({ eq: updateEq });

  // pagos(duplicate check) → cuotas → gym_config → pagos(insert) → cuotas(update)
  vi.mocked(createAdminClient).mockReturnValue({
    from: vi.fn()
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }) })
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: cuotaSingle }) }) })
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: gymSingle }) }) })
      .mockReturnValueOnce({ insert: insertFn })
      .mockReturnValueOnce({ update: updateFn }),
  } as never);

  return { maybeSingle, cuotaSingle, gymSingle, insertFn, updateFn };
}

describe("POST /api/webhooks/mercadopago/from-redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 400 si falta cuota_id o payment_id", async () => {
    buildAdminMock();
    const { POST } = await import("@/app/api/webhooks/mercadopago/from-redirect/route");
    const res = await POST(makeRequest({ payment_id: PAYMENT_ID }));
    expect(res.status).toBe(400);
  });

  it("es idempotente: retorna ok+duplicate si el pago ya existe", async () => {
    buildAdminMock({ existente: { id: "existing-pago-id" } });
    const { POST } = await import("@/app/api/webhooks/mercadopago/from-redirect/route");
    const res = await POST(makeRequest({ payment_id: PAYMENT_ID, cuota_id: CUOTA_ID }));
    const json = await res.json() as { ok: boolean; duplicate: boolean };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.duplicate).toBe(true);
  });

  it("rechaza 422 si external_reference no coincide con cuota_id", async () => {
    buildAdminMock();
    vi.mocked(mpLib.getMpPayment).mockResolvedValueOnce({
      status: "approved",
      external_reference: "otro-cuota-uuid",
      transaction_amount: 5000,
    } as never);

    const { POST } = await import("@/app/api/webhooks/mercadopago/from-redirect/route");
    const res = await POST(makeRequest({ payment_id: PAYMENT_ID, cuota_id: CUOTA_ID }));
    expect(res.status).toBe(422);
    const json = await res.json() as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toBe("external_reference mismatch");
  });

  it("registra el pago y responde ok cuando MP confirma aprobado", async () => {
    const { insertFn } = buildAdminMock();
    vi.mocked(mpLib.getMpPayment).mockResolvedValueOnce({
      status: "approved",
      external_reference: CUOTA_ID,
      transaction_amount: 5000,
    } as never);

    const { POST } = await import("@/app/api/webhooks/mercadopago/from-redirect/route");
    const res = await POST(makeRequest({ payment_id: PAYMENT_ID, cuota_id: CUOTA_ID }));
    const json = await res.json() as { ok: boolean; monto: number };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.monto).toBe(5000);
    expect(insertFn).toHaveBeenCalledOnce();
    const insertArg = insertFn.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg.mp_payment_id).toBe(PAYMENT_ID);
    expect(insertArg.cuota_id).toBe(CUOTA_ID);
    expect(insertArg.gym_id).toBe(GYM_ID);
  });

  it("responde ok sin insertar si el pago MP no está aprobado", async () => {
    buildAdminMock();
    vi.mocked(mpLib.getMpPayment).mockResolvedValueOnce({
      status: "pending",
      external_reference: CUOTA_ID,
      transaction_amount: 5000,
    } as never);

    const { POST } = await import("@/app/api/webhooks/mercadopago/from-redirect/route");
    const res = await POST(makeRequest({ payment_id: PAYMENT_ID, cuota_id: CUOTA_ID }));
    const json = await res.json() as { ok: boolean; status?: string };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(false);
    expect(json.status).toBe("pending");
  });

  it("maneja insert duplicado (23505) como idempotente", async () => {
    buildAdminMock({ insertError: { code: "23505", message: "duplicate" } });
    vi.mocked(mpLib.getMpPayment).mockResolvedValueOnce({
      status: "approved",
      external_reference: CUOTA_ID,
      transaction_amount: 5000,
    } as never);

    const { POST } = await import("@/app/api/webhooks/mercadopago/from-redirect/route");
    const res = await POST(makeRequest({ payment_id: PAYMENT_ID, cuota_id: CUOTA_ID }));
    const json = await res.json() as { ok: boolean; duplicate: boolean };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.duplicate).toBe(true);
  });
});
