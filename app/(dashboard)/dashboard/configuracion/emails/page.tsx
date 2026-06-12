import { requireGymContext } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MailsEnviados } from "@/components/crons/mails-enviados";
import { T } from "@/lib/theme";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";

const PAGE_SIZE = 20;

function parsePage(v: string | undefined): number {
  const n = parseInt(v ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default async function EmailsMonitoreoPage({
  searchParams,
}: {
  searchParams: Promise<{ mDesde?: string; mHasta?: string; mPage?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireGymContext();
  if (ctx.rol !== "owner" && ctx.rol !== "admin") redirect("/dashboard/configuracion");

  const mPage = parsePage(sp.mPage);
  const admin = createAdminClient();

  let query = admin
    .from("notificaciones_log")
    .select("id, tipo, enviado_a, estado, created_at, alumnos(nombre, apellido)", { count: "exact" })
    .eq("gym_id", ctx.gymId);

  if (sp.mDesde) query = query.gte("created_at", `${sp.mDesde}T00:00:00`);
  if (sp.mHasta) query = query.lte("created_at", `${sp.mHasta}T23:59:59`);

  const { data: notifs, count: total } = await query
    .order("created_at", { ascending: false })
    .range((mPage - 1) * PAGE_SIZE, mPage * PAGE_SIZE - 1);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/configuracion"
          className="p-1.5 rounded-lg transition-colors hover:opacity-75"
          style={{ color: T.textDim }}
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1
            className="text-4xl leading-none"
            style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}
          >
            EMAILS ENVIADOS
          </h1>
          <p className="text-sm mt-1" style={{ color: T.textDim }}>
            Historial de avisos y recordatorios enviados a alumnos
          </p>
        </div>
      </div>

      <MailsEnviados
        notifs={(notifs ?? []) as never}
        total={total ?? 0}
        page={mPage}
        desde={sp.mDesde ?? ""}
        hasta={sp.mHasta ?? ""}
      />
    </div>
  );
}
