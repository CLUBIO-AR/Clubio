import { NextResponse } from "next/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const METODO_LABEL: Record<string, string> = {
  mercadopago:   "MercadoPago",
  efectivo:      "Efectivo",
  transferencia: "Transferencia",
  otro:          "Otro",
};

const SIN_ACTIVIDAD = "__general__";

function formatFechaHora(d: Date) {
  return `${d.toLocaleDateString("es-AR")} ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
}

export async function GET(request: Request) {
  const ctx = await requireGymContext().catch(() => null);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const desde     = searchParams.get("desde")     ?? "";
  const hasta     = searchParams.get("hasta")     ?? "";
  const metodo    = searchParams.get("metodo")    ?? "";
  const actividad = searchParams.get("actividad") ?? "";
  const search    = searchParams.get("search")    ?? "";

  const supabase = await createClient();

  const [pagosRes, actividadesRes] = await Promise.all([
    (() => {
      let q = supabase
        .from("pagos")
        .select("id, monto, metodo, created_at, alumnos(nombre, apellido, dni), cuotas(mes, anio, tipo, descripcion, actividades(id, nombre))")
        .eq("gym_id", ctx.gymId)
        .order("created_at", { ascending: false });
      if (desde)  q = q.gte("created_at", `${desde}T00:00:00`);
      if (hasta)  q = q.lte("created_at", `${hasta}T23:59:59`);
      if (metodo) q = q.eq("metodo", metodo);
      return q;
    })(),
    supabase.from("actividades").select("id, nombre").eq("gym_id", ctx.gymId).is("deleted_at", null),
  ]);

  if (pagosRes.error) return NextResponse.json({ error: pagosRes.error.message }, { status: 500 });

  let rows = pagosRes.data ?? [];
  const actividades = actividadesRes.data ?? [];

  if (search.trim()) {
    const term = search.trim().toLowerCase();
    rows = rows.filter((p) => {
      const a = p.alumnos as { nombre: string; apellido: string; dni: string } | null;
      if (!a) return false;
      return a.nombre.toLowerCase().includes(term) || a.apellido.toLowerCase().includes(term) || a.dni?.toLowerCase().includes(term);
    });
  }

  if (actividad) {
    rows = rows.filter((p) => {
      const c = p.cuotas as { actividades: { id: string; nombre: string } | null } | null;
      const actId = c?.actividades?.id ?? null;
      return actividad === SIN_ACTIVIDAD ? actId === null : actId === actividad;
    });
  }

  const dataRows = rows.map((p) => {
    const a = p.alumnos as { nombre: string; apellido: string; dni: string } | null;
    const c = p.cuotas as { mes: number; anio: number; tipo: string; descripcion: string | null; actividades: { id: string; nombre: string } | null } | null;
    const periodo = !c ? "" : c.tipo !== "mensual" && c.descripcion ? c.descripcion : `${MESES[c.mes]} ${c.anio}`;
    const actividadNombre = c?.actividades?.nombre ?? "";
    return [
      a?.apellido ?? "",
      a?.nombre   ?? "",
      a?.dni      ?? "",
      periodo,
      c?.tipo?.replace(/_/g, " ") ?? "",
      actividadNombre,
      p.metodo,
      p.monto,
      new Date(p.created_at).toLocaleDateString("es-AR"),
    ];
  });

  const totalMonto = rows.reduce((sum, p) => sum + p.monto, 0);

  // --- Encabezado del reporte: fecha de generación + filtros aplicados ---
  const actividadLabel =
    !actividad ? "Todas"
    : actividad === SIN_ACTIVIDAD ? "General (sin actividad)"
    : actividades.find((a) => a.id === actividad)?.nombre ?? actividad;

  const filtrosAplicados = [
    `Período: ${desde || "(inicio)"} a ${hasta || "(hoy)"}`,
    `Método: ${metodo ? (METODO_LABEL[metodo] ?? metodo) : "Todos"}`,
    `Actividad: ${actividadLabel}`,
    ...(search.trim() ? [`Búsqueda: "${search.trim()}"`] : []),
  ].join("  ·  ");

  const headerRows: (string | number)[][] = [
    ["CLUBIO — Reporte de pagos"],
    [`Generado: ${formatFechaHora(new Date())}`],
    [`Filtros aplicados: ${filtrosAplicados}`],
    [],
  ];

  const sheetData = [
    ...headerRows,
    ["Apellido", "Nombre", "DNI", "Período", "Tipo", "Actividad", "Método", "Monto", "Fecha de pago"],
    ...dataRows,
    [],
    ["", "", "", "", "", "", "TOTAL", totalMonto, `${rows.length} pagos`],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Ancho de columnas
  ws["!cols"] = [16, 16, 12, 18, 14, 18, 14, 12, 14].map((w) => ({ wch: w }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pagos");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `pagos_${desde || "inicio"}_${hasta || "hoy"}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
