import { NextResponse } from "next/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const ESTADO_LABEL: Record<string, string> = {
  pagada:         "Pagada",
  pendiente:      "Pendiente",
  vencida:        "Vencida",
  condonada:      "Condonada",
  pagada_parcial: "Pago parcial",
};

function formatFecha(d: Date) {
  return `${d.toLocaleDateString("es-AR")} ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
}

export async function GET(request: Request) {
  const ctx = await requireGymContext().catch(() => null);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const activo   = searchParams.get("activo")   ?? "";   // "true" | "false" | ""
  const actividad = searchParams.get("actividad") ?? "";
  const search   = searchParams.get("search")   ?? "";

  const now = new Date();
  const mesActual  = now.getMonth() + 1;
  const anioActual = now.getFullYear();

  const supabase = await createClient();

  let alumnosQuery = supabase
    .from("alumnos")
    .select("id, nombre, apellido, dni, email, telefono, activo, fecha_alta")
    .eq("gym_id", ctx.gymId)
    .is("deleted_at", null)
    .order("apellido", { ascending: true });

  if (activo === "true")  alumnosQuery = alumnosQuery.eq("activo", true);
  if (activo === "false") alumnosQuery = alumnosQuery.eq("activo", false);

  const { data: alumnos, error } = await alumnosQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const alumnoIds = (alumnos ?? []).map((a) => a.id);

  // Cuotas del mes actual para todos los alumnos
  const { data: cuotasMes } = alumnoIds.length
    ? await supabase
        .from("cuotas")
        .select("alumno_id, actividad_id, estado, monto_total, actividades(nombre)")
        .eq("gym_id", ctx.gymId)
        .in("alumno_id", alumnoIds)
        .eq("mes", mesActual)
        .eq("anio", anioActual)
    : { data: [] };

  // Agrupar cuotas por alumno
  type CuotaRow = { alumno_id: string; actividad_id: string | null; estado: string; monto_total: number | null; actividades: { nombre: string } | { nombre: string }[] | null };
  const cuotasPorAlumno = new Map<string, CuotaRow[]>();
  for (const c of (cuotasMes ?? []) as CuotaRow[]) {
    const list = cuotasPorAlumno.get(c.alumno_id) ?? [];
    list.push(c);
    cuotasPorAlumno.set(c.alumno_id, list);
  }

  let rows = alumnos ?? [];

  if (search.trim()) {
    const term = search.trim().toLowerCase();
    rows = rows.filter((a) =>
      a.nombre.toLowerCase().includes(term) ||
      a.apellido.toLowerCase().includes(term) ||
      a.dni?.toLowerCase().includes(term)
    );
  }

  // Filtrar por actividad si se especificó
  if (actividad) {
    rows = rows.filter((a) => {
      const cuotas = cuotasPorAlumno.get(a.id) ?? [];
      return cuotas.some((c) => c.actividad_id === actividad);
    });
  }

  const dataRows = rows.map((a) => {
    const cuotas = cuotasPorAlumno.get(a.id) ?? [];
    const estadoPeor = cuotas.some((c) => c.estado === "vencida")   ? "vencida"
                     : cuotas.some((c) => c.estado === "pendiente") ? "pendiente"
                     : cuotas.some((c) => c.estado === "pagada")    ? "pagada"
                     : cuotas.length ? cuotas[0].estado : "";
    const montoPendiente = cuotas
      .filter((c) => c.estado === "pendiente" || c.estado === "vencida" || c.estado === "pagada_parcial")
      .reduce((sum, c) => sum + (c.monto_total ?? 0), 0);
    const actividades = cuotas.map((c) => {
      const act = c.actividades;
      if (!act) return "General";
      return Array.isArray(act) ? (act[0]?.nombre ?? "General") : act.nombre;
    }).join(", ") || "—";

    return [
      a.apellido ?? "",
      a.nombre   ?? "",
      a.dni      ?? "",
      a.email    ?? "",
      a.telefono ?? "",
      a.activo ? "Activo" : "Inactivo",
      a.fecha_alta ? new Date(a.fecha_alta).toLocaleDateString("es-AR") : "",
      actividades,
      ESTADO_LABEL[estadoPeor] ?? estadoPeor,
      montoPendiente > 0 ? montoPendiente : "",
    ];
  });

  const mesMesLabel = `${MESES[mesActual]} ${anioActual}`;
  const filtrosLabel = [
    `Estado: ${activo === "true" ? "Activos" : activo === "false" ? "Inactivos" : "Todos"}`,
    ...(search.trim() ? [`Búsqueda: "${search.trim()}"`] : []),
    `Cuotas: ${mesMesLabel}`,
  ].join("  ·  ");

  const headerRows: (string | number)[][] = [
    ["CLUBIO — Listado de alumnos"],
    [`Generado: ${formatFecha(new Date())}`],
    [`Filtros: ${filtrosLabel}`],
    [],
  ];

  const sheetData = [
    ...headerRows,
    ["Apellido", "Nombre", "DNI", "Email", "Teléfono", "Estado", "Alta", `Actividades`, `Cuota ${mesMesLabel}`, "Monto pendiente"],
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = [16, 16, 12, 24, 16, 10, 12, 22, 14, 14].map((w) => ({ wch: w }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Alumnos");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="alumnos_${mesMesLabel.replace(" ", "_")}.xlsx"`,
    },
  });
}
