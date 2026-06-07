import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AlumnoInsertSchema } from "@/lib/alumnos";

// Dataset de validación para el campo "fecha_alta" (alta de alumno editable).
// Cubre los casos planteados: hoy, hace 2 semanas, hace 1 mes, límite de 90 días,
// fechas futuras y formatos inválidos.

const HOY = new Date("2026-06-20T12:00:00Z");

function fechaHaceNDias(n: number): string {
  const d = new Date(HOY);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

const BASE_ALUMNO = { nombre: "Juan", apellido: "Pérez", dni: "30123456" };

describe("AlumnoInsertSchema — dataset de fecha_alta (días desde hoy)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(HOY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const casosValidos: Array<[string, number]> = [
    ["hoy", 0],
    ["hace 2 semanas", 14],
    ["hace 1 mes (30 días)", 30],
    ["límite exacto permitido: hace 90 días", 90],
  ];

  it.each(casosValidos)("acepta fecha_alta = %s (hace %i días)", (_label, dias) => {
    const r = AlumnoInsertSchema.safeParse({ ...BASE_ALUMNO, fecha_alta: fechaHaceNDias(dias) });
    expect(r.success).toBe(true);
  });

  const casosFueraDeRango: Array<[string, number]> = [
    ["91 días atrás (1 día más que el límite)", 91],
    ["hace 6 meses", 180],
    ["hace 1 año", 365],
  ];

  it.each(casosFueraDeRango)("rechaza fecha_alta = %s por superar los 90 días de antigüedad", (_label, dias) => {
    const r = AlumnoInsertSchema.safeParse({ ...BASE_ALUMNO, fecha_alta: fechaHaceNDias(dias) });
    expect(r.success).toBe(false);
  });

  const casosFuturos: Array<[string, number]> = [
    ["mañana", -1],
    ["dentro de 1 semana", -7],
    ["dentro de 1 año", -365],
  ];

  it.each(casosFuturos)("rechaza fecha_alta futura = %s", (_label, dias) => {
    const r = AlumnoInsertSchema.safeParse({ ...BASE_ALUMNO, fecha_alta: fechaHaceNDias(dias) });
    expect(r.success).toBe(false);
  });

  const formatosInvalidos = [
    "15/06/2026",
    "2026-6-5",
    "2026-06-15T00:00:00Z",
    "",
    "no-es-una-fecha",
  ];

  it.each(formatosInvalidos)("rechaza formato inválido: %j", (valor) => {
    const r = AlumnoInsertSchema.safeParse({ ...BASE_ALUMNO, fecha_alta: valor });
    expect(r.success).toBe(false);
  });

  it("es opcional: se puede crear un alumno sin enviar fecha_alta", () => {
    const r = AlumnoInsertSchema.safeParse({ ...BASE_ALUMNO });
    expect(r.success).toBe(true);
  });

  it("no afecta otros campos: un alumno con fecha_alta válida conserva el resto de la validación", () => {
    const r = AlumnoInsertSchema.safeParse({ ...BASE_ALUMNO, fecha_alta: fechaHaceNDias(10), email: "no-es-un-email" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("email"))).toBe(true);
      expect(r.error.issues.some((i) => i.path.includes("fecha_alta"))).toBe(false);
    }
  });
});
