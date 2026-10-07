// Proveedores de alias/CVU por alumno. Cada proveedor manda sus avisos de transferencia en
// su propio formato y con su propia firma: un adaptador los traduce a TransferenciaEntrante.
// Para sumar el proveedor real alcanza con escribir su adaptador y registrarlo en PROVEEDORES.
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/** Transferencia ya normalizada, sin importar de qué proveedor venga. */
export type TransferenciaEntrante = {
  /** Id de la transferencia en el proveedor (sirve para no procesarla dos veces). */
  externalId: string;
  /** CVU o alias que recibió la plata: identifica al alumno. */
  cvuDestino: string | null;
  aliasDestino: string | null;
  monto: number;
  fecha: Date;
  pagadorNombre: string | null;
  pagadorCuit: string | null;
  concepto: string | null;
  raw: unknown;
};

export interface ProveedorTransferencias {
  id: string;
  /** Verifica que el aviso venga realmente del proveedor (firma, token, IP…). */
  verificar(headers: Headers, rawBody: string): boolean;
  /** Traduce el cuerpo del aviso. Puede traer varias transferencias o ninguna (otros eventos). */
  parsear(rawBody: string): TransferenciaEntrante[];
}

// ── Genérico ────────────────────────────────────────────────────────────────
// Formato propio de CLUBIO, para probar el circuito completo antes de tener el proveedor
// real (y para proveedores que nos dejen configurar el formato del webhook).
// Firma: header x-clubio-signature = HMAC-SHA256 hex del cuerpo con TRANSFERENCIAS_WEBHOOK_SECRET.
const GenericoSchema = z.object({
  id: z.string().min(1).max(200),
  cvu: z.string().max(40).nullish(),
  alias: z.string().max(60).nullish(),
  monto: z.number().positive(),
  fecha: z.string().datetime({ offset: true }).optional(),
  pagador: z.object({ nombre: z.string().max(200).nullish(), cuit: z.string().max(20).nullish() }).optional(),
  concepto: z.string().max(300).nullish(),
});

export function firmar(rawBody: string, secreto: string): string {
  return createHmac("sha256", secreto).update(rawBody).digest("hex");
}

const generico: ProveedorTransferencias = {
  id: "generico",
  verificar(headers, rawBody) {
    const secreto = process.env.TRANSFERENCIAS_WEBHOOK_SECRET;
    const firma = headers.get("x-clubio-signature");
    if (!secreto || !firma || !/^[0-9a-f]{64}$/i.test(firma)) return false;
    const esperada = Buffer.from(firmar(rawBody, secreto), "hex");
    return timingSafeEqual(esperada, Buffer.from(firma, "hex"));
  },
  parsear(rawBody) {
    const json = JSON.parse(rawBody) as unknown;
    const lista = Array.isArray(json) ? json : [json];
    return lista.map((item) => {
      const t = GenericoSchema.parse(item);
      if (!t.cvu && !t.alias) throw new Error("La transferencia no trae cvu ni alias de destino");
      return {
        externalId: t.id,
        cvuDestino: t.cvu ?? null,
        aliasDestino: t.alias ?? null,
        monto: t.monto,
        fecha: t.fecha ? new Date(t.fecha) : new Date(),
        pagadorNombre: t.pagador?.nombre ?? null,
        pagadorCuit: t.pagador?.cuit ?? null,
        concepto: t.concepto ?? null,
        raw: item,
      };
    });
  },
};

export const PROVEEDORES: Record<string, ProveedorTransferencias> = {
  [generico.id]: generico,
};
