import { NextResponse } from "next/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export async function GET(request: Request) {
  const ctx = await requireGymContext().catch(() => null);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const desde  = searchParams.get("desde")  ?? "";
  const hasta  = searchParams.get("hasta")  ?? "";
  const metodo = searchParams.get("metodo") ?? "";
  const search = searchParams.get("search") ?? "";

  const supabase = await createClient();
  let q = supabase
    .from("pagos")
    .select("id, monto, metodo, created_at, alumnos(nombre, apellido, dni), cuotas(mes, anio, tipo, descripcion, actividades(nombre))")
    .eq("gym_id", ctx.gymId)
    .order("created_at", { ascending: false });

  if (desde) q = q.gte("created_at", `${desde}T00:00:00`);
  if (hasta) q = q.lte("created_at", `${hasta}T23:59:59`);
  if (metodo) q = q.eq("metodo", metodo);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = data ?? [];

  if (search.trim()) {
    const term = search.trim().toLowerCase();
    rows = rows.filter((p) => {
      const a = p.alumnos as { nombre: string; apellido: string; dni: string } | null;
      if (!a) return false;
      return a.nombre.toLowerCase().includes(term) || a.apellido.toLowerCase().includes(term) || a.dni?.toLowerCase().includes(term);
    });
  }

  const dataRows = rows.map((p) => {
    const a = p.alumnos as { nombre: string; apellido: string; dni: string } | null;
    const c = p.cuotas as { mes: number; anio: number; tipo: string; descripcion: string | null; actividades: { nombre: string } | null } | null;
    const periodo = !c ? "" : c.tipo !== "mensual" && c.descripcion ? c.descripcion : `${MESES[c.mes]} ${c.anio}`;
    const actividad = c?.actividades?.nombre ?? "";
    return [
      a?.apellido ?? "",
      a?.nombre   ?? "",
      a?.dni      ?? "",
      periodo,
      c?.tipo?.replace(/_/g, " ") ?? "",
      actividad,
      p.metodo,
      p.monto,
      new Date(p.created_at).toLocaleDateString("es-AR"),
    ];
  });

  const totalMonto = rows.reduce((sum, p) => sum + p.monto, 0);

  const sheetData = [
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
