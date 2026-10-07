import { describe, it, expect } from "vitest";
import { resumenHorarios, proximasClases, describirCuando } from "@/lib/horarios";

// Miércoles 7/10/2026 15:00 en Argentina = 18:00 UTC.
const MIERCOLES_15HS = new Date("2026-10-07T18:00:00Z");

const funcional = { id: "f", nombre: "Funcional", horarios: [{ dias: [1, 3, 5], hora: "18:00" }, { dias: [1, 3, 5], hora: "08:00" }] };
const pilates = { id: "p", nombre: "Pilates", horarios: [{ dias: [2, 4], hora: "19:00" }] };

describe("resumenHorarios", () => {
  it("agrupa días con las mismas horas, lunes primero", () => {
    expect(resumenHorarios(funcional.horarios)).toBe("Lun, Mié y Vie · 08:00 y 18:00");
    expect(resumenHorarios([{ dias: [6], hora: "10:00" }, { dias: [1], hora: "18:00" }])).toBe("Lun · 18:00 | Sáb · 10:00");
    expect(resumenHorarios([])).toBe("");
  });
});

describe("proximasClases", () => {
  it("propone hoy y mañana en orden, respetando el margen para llegar", () => {
    const r = proximasClases([funcional, pilates], MIERCOLES_15HS);
    expect(r.map((c) => `${c.etiqueta} ${c.actividadNombre}`)).toEqual([
      "Hoy 18:00 Funcional",
      "Mañana 19:00 Pilates",
    ]);
    expect(r[0].cuando).toBe("2026-10-07T18:00");
  });

  it("no ofrece una clase que empieza en menos de una hora", () => {
    const las1730 = new Date("2026-10-07T20:30:00Z"); // 17:30 en Argentina
    const r = proximasClases([funcional], las1730);
    // 18:00 de hoy queda a 30 min → se saltea; el jueves no hay Funcional → viernes 8:00.
    expect(r[0].etiqueta).toBe("Vie 9/10 08:00");
  });

  it("si no hay nada hoy ni mañana, busca más adelante en la semana", () => {
    const sabado = { id: "s", nombre: "Yoga", horarios: [{ dias: [6], hora: "10:00" }] };
    const r = proximasClases([sabado], MIERCOLES_15HS);
    expect(r[0].etiqueta).toBe("Sáb 10/10 10:00");
  });

  it("sin horarios cargados no propone nada", () => {
    expect(proximasClases([{ id: "x", nombre: "X", horarios: [] }], MIERCOLES_15HS)).toEqual([]);
  });
});

describe("describirCuando", () => {
  it("dice hoy, mañana o el día con fecha", () => {
    expect(describirCuando("2026-10-07T18:00", MIERCOLES_15HS)).toBe("hoy a las 18:00");
    expect(describirCuando("2026-10-08T08:00", MIERCOLES_15HS)).toBe("mañana a las 08:00");
    expect(describirCuando("2026-10-10T10:00", MIERCOLES_15HS)).toBe("el sábado 10/10 a las 10:00");
  });
});
