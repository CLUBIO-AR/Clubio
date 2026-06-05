import { NextResponse } from "next/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

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
    .select("id, monto, metodo, created_at, alumnos(nombre, apellido, dni), cuotas(mes, anio, tipo, descripcion)")
    .eq("gym_id", ctx.gymId)
    .order("created_at", { ascending: false });

  if (desde) q = q.gte("created_at", `${desde}T00:00:00`);
  if (hasta) q = q.lte("created_at", `${hasta}T23:59:59`);
  if (metodo) q = q.eq("metodo", metodo);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  let rows = data ?? [];

  // Filtro por nombre/DNI si viene del cliente
  if (search.trim()) {
    const term = search.trim().toLowerCase();
    rows = rows.filter((p) => {
      const a = p.alumnos as { nombre: string; apellido: string; dni: string } | null;
      if (!a) return false;
      return a.nombre.toLowerCase().includes(term) || a.apellido.toLowerCase().includes(term) || a.dni?.toLowerCase().includes(term);
    });
  }

  // Generar CSV con BOM UTF-8 para Excel
  const header = ["Apellido", "Nombre", "DNI", "Período", "Tipo", "Método", "Monto", "Fecha de pago"];
  const lines = rows.map((p) => {
    const a = p.alumnos as { nombre: string; apellido: string; dni: string } | null;
    const c = p.cuotas as { mes: number; anio: number; tipo: string; descripcion: string | null } | null;
    const periodo = !c ? "" : c.tipo !== "mensual" && c.descripcion ? c.descripcion : `${MESES[c.mes]} ${c.anio}`;
    const tipo    = c?.tipo?.replace(/_/g, " ") ?? "";
    const fecha   = new Date(p.created_at).toLocaleDateString("es-AR");

    return [
      a?.apellido ?? "",
      a?.nombre   ?? "",
      a?.dni      ?? "",
      periodo,
      tipo,
      p.metodo,
      p.monto.toString().replace(".", ","),
      fecha,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });

  const csv = "﻿" + [header.join(","), ...lines].join("\n");

  const filename = `pagos_${desde || "inicio"}_${hasta || "hoy"}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
