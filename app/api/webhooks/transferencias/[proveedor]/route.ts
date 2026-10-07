import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROVEEDORES } from "@/lib/transferencias/proveedores";
import { procesarTransferencia } from "@/lib/transferencias/procesar";

// Webhook de transferencias del proveedor de alias/CVU por alumno.
// URL a configurar en el proveedor: https://app.clubio.com.ar/api/webhooks/transferencias/<proveedor>
//
// La plata va directo a la cuenta del gym: acá solo registramos el pago en CLUBIO.
// Respuestas: 401 firma inválida · 400 cuerpo inválido · 500 error nuestro (el proveedor
// reintenta; procesar es idempotente) · 200 todo lo demás, incluso duplicados.
export async function POST(request: Request, { params }: { params: Promise<{ proveedor: string }> }) {
  const { proveedor: id } = await params;
  const proveedor = PROVEEDORES[id];
  if (!proveedor) return NextResponse.json({ error: "Proveedor desconocido" }, { status: 404 });

  const rawBody = await request.text();
  if (!proveedor.verificar(request.headers, rawBody)) {
    console.error("[webhook:transferencias]", id, "firma inválida — request rechazado");
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let transferencias;
  try {
    transferencias = proveedor.parsear(rawBody);
  } catch (err) {
    console.error("[webhook:transferencias]", id, "cuerpo inválido:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const resultados = [];
  for (const t of transferencias) {
    try {
      const r = await procesarTransferencia(admin, id, t);
      console.log("[webhook:transferencias]", id, t.externalId, r.duplicada ? "duplicada" : r.resultado.estado);
      resultados.push({ id: t.externalId, ...(r.duplicada ? { duplicada: true } : { estado: r.resultado.estado }) });
    } catch (err) {
      console.error("[webhook:transferencias]", id, t.externalId, "error:", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "Error procesando la transferencia" }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, resultados });
}
