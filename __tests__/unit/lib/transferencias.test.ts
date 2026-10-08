import { describe, it, expect, beforeEach } from "vitest";
import { PROVEEDORES, firmar } from "@/lib/transferencias/proveedores";

const generico = PROVEEDORES.generico;
const SECRETO = "secreto-de-prueba";

describe("proveedor genérico de transferencias", () => {
  beforeEach(() => { process.env.TRANSFERENCIAS_WEBHOOK_SECRET = SECRETO; });

  const cuerpo = JSON.stringify({
    id: "trx-1", cvu: "0000003100012345678901", monto: 30000,
    fecha: "2026-10-08T14:30:00-03:00", pagador: { nombre: "Juan Pérez", cuit: "20-12345678-9" }, concepto: "cuota",
  });

  it("acepta un aviso con firma válida y rechaza uno adulterado o sin firma", () => {
    const h = new Headers({ "x-clubio-signature": firmar(cuerpo, SECRETO) });
    expect(generico.verificar(h, cuerpo)).toBe(true);
    expect(generico.verificar(h, cuerpo.replace("30000", "300000"))).toBe(false);
    expect(generico.verificar(new Headers(), cuerpo)).toBe(false);
    expect(generico.verificar(new Headers({ "x-clubio-signature": "abc" }), cuerpo)).toBe(false);
  });

  it("sin secreto configurado rechaza todo", () => {
    delete process.env.TRANSFERENCIAS_WEBHOOK_SECRET;
    expect(generico.verificar(new Headers({ "x-clubio-signature": firmar(cuerpo, SECRETO) }), cuerpo)).toBe(false);
  });

  it("normaliza la transferencia", () => {
    const [t] = generico.parsear(cuerpo);
    expect(t).toMatchObject({
      externalId: "trx-1", cvuDestino: "0000003100012345678901", aliasDestino: null, monto: 30000,
      pagadorNombre: "Juan Pérez", pagadorCuit: "20-12345678-9", concepto: "cuota",
    });
    expect(t.fecha.toISOString()).toBe("2026-10-08T17:30:00.000Z");
  });

  it("acepta varias transferencias en un aviso y rechaza las que no traen destino o monto", () => {
    expect(generico.parsear(JSON.stringify([{ id: "a", alias: "box.juan", monto: 1 }, { id: "b", cvu: "1", monto: 2 }]))).toHaveLength(2);
    expect(() => generico.parsear(JSON.stringify({ id: "x", monto: 10 }))).toThrow();
    expect(() => generico.parsear(JSON.stringify({ id: "x", cvu: "1", monto: -5 }))).toThrow();
  });
});
