import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCuotaById } from "@/lib/cuotas";
import { CuotaDetalle } from "@/components/cuotas/cuota-detalle";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { T } from "@/lib/theme";

export default async function CuotaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ accion?: string }>;
}) {
  const { id } = await params;
  const { accion } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: gymUsuario } = await supabase
    .from("gym_usuarios").select("gym_id").eq("id", user.id).single();
  if (!gymUsuario) return null;

  const { data: cuota } = await getCuotaById(supabase, gymUsuario.gym_id, id);
  if (!cuota) notFound();

  // Historial de pagos de esta cuota
  const { data: pagos } = await supabase
    .from("pagos")
    .select("id, monto, metodo, created_at, registrado_por, mp_payment_id")
    .eq("cuota_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/cuotas" className="p-1.5 rounded-lg transition-colors hover:opacity-75" style={{ color: T.textDim }}>
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>
          DETALLE DE CUOTA
        </h1>
      </div>

      <CuotaDetalle
        cuota={cuota as Parameters<typeof CuotaDetalle>[0]["cuota"]}
        pagos={pagos ?? []}
        accionDefault={accion}
      />
    </div>
  );
}
