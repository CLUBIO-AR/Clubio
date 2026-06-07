import { requireGymContext } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckCircle, XCircle, Clock, Zap, Bell, TrendingDown } from "lucide-react";
import { T } from "@/lib/theme";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { CronsActions } from "@/components/crons/crons-actions";
import { HistorialEjecuciones } from "@/components/crons/historial-ejecuciones";
import { MailsEnviados } from "@/components/crons/mails-enviados";

const TIPO_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  generar_cuotas:   { label: "Generar cuotas",    icon: Zap,          color: T.accent  },
  enviar_avisos:    { label: "Enviar avisos",      icon: Bell,         color: T.blue    },
  aplicar_recargos: { label: "Aplicar recargos",   icon: TrendingDown, color: T.warning },
};

const PAGE_SIZE = 10;

function paginaDesde(v: string | undefined): number {
  const n = parseInt(v ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

const MESES_CORTO = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatFecha(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${MESES_CORTO[d.getMonth() + 1]}/${String(d.getFullYear()).slice(2)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDuracion(ms: number | null) {
  if (!ms) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export default async function CronsPage({
  searchParams,
}: {
  searchParams: Promise<{ hDesde?: string; hHasta?: string; hPage?: string; mDesde?: string; mHasta?: string; mPage?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireGymContext();
  if (ctx.rol !== "owner" && ctx.rol !== "admin") redirect("/dashboard/configuracion");

  const admin = createAdminClient();
  const hPage = paginaDesde(sp.hPage);
  const mPage = paginaDesde(sp.mPage);

  // Última ejecución: worker logs de ESTE GYM (no dispatcher cross-gym)
  const { data: workerLogs } = await admin
    .from("cron_logs")
    .select("tipo, created_at, items_creados, items_error, items_saltados, duracion_ms, error_detalle")
    .eq("gym_id", ctx.gymId)
    .eq("es_dispatcher", false)
    .order("created_at", { ascending: false })
    .limit(30);

  // Historial del gym (solo workers de este gym), con filtro de fecha + paginado
  let histQuery = admin
    .from("cron_logs")
    .select("id, tipo, items_creados, items_error, duracion_ms, error_detalle, created_at", { count: "exact" })
    .eq("gym_id", ctx.gymId)
    .eq("es_dispatcher", false);
  if (sp.hDesde) histQuery = histQuery.gte("created_at", `${sp.hDesde}T00:00:00`);
  if (sp.hHasta) histQuery = histQuery.lte("created_at", `${sp.hHasta}T23:59:59`);
  const { data: historial, count: histTotal } = await histQuery
    .order("created_at", { ascending: false })
    .range((hPage - 1) * PAGE_SIZE, hPage * PAGE_SIZE - 1);

  // Mails enviados, con filtro de fecha + paginado
  let mailsQuery = admin
    .from("notificaciones_log")
    .select("id, tipo, enviado_a, estado, created_at, alumnos(nombre, apellido)", { count: "exact" })
    .eq("gym_id", ctx.gymId);
  if (sp.mDesde) mailsQuery = mailsQuery.gte("created_at", `${sp.mDesde}T00:00:00`);
  if (sp.mHasta) mailsQuery = mailsQuery.lte("created_at", `${sp.mHasta}T23:59:59`);
  const { data: notifs, count: mailsTotal } = await mailsQuery
    .order("created_at", { ascending: false })
    .range((mPage - 1) * PAGE_SIZE, mPage * PAGE_SIZE - 1);

  type WorkerRow = NonNullable<typeof workerLogs>[number];
  const ultimas: Record<string, WorkerRow> = {};
  for (const log of (workerLogs ?? [])) {
    if (!ultimas[log.tipo]) ultimas[log.tipo] = log;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/configuracion" className="p-1.5 rounded-lg transition-colors hover:opacity-75" style={{ color: T.textDim }}>
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>
            MONITOREO CRONS
          </h1>
          <p className="text-sm mt-1" style={{ color: T.textDim }}>Estado de tareas automáticas de este gimnasio</p>
        </div>
      </div>

      {/* Botones de ejecución manual */}
      <CronsActions />

      {/* Última ejecución por tipo — datos del GYM PROPIO */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: T.borderSub }}>
          <h2 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
            — Última ejecución
          </h2>
        </div>
        <div>
          {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => {
            const log = ultimas[tipo];
            const hayError = log ? !!log.error_detalle || (log.items_error ?? 0) > 0 : null;
            const Icon = cfg.icon;
            return (
              <div key={tipo} className="px-5 py-4 flex items-center gap-4 border-b last:border-b-0" style={{ borderColor: T.borderSub }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
                  <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>
                    {cfg.label.toUpperCase()}
                  </p>
                  {log ? (
                    <p className="text-xs font-mono" style={{ color: T.textDim }}>
                      {formatFecha(log.created_at)}
                      {log.items_creados != null ? ` · ${log.items_creados} items` : ""}
                      {` · ${formatDuracion(log.duracion_ms)}`}
                    </p>
                  ) : (
                    <p className="text-xs" style={{ color: T.textDim }}>Sin ejecuciones registradas</p>
                  )}
                  {log?.error_detalle && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: T.danger }}>{log.error_detalle}</p>
                  )}
                </div>
                {log ? (
                  hayError ? (
                    <XCircle className="w-5 h-5 shrink-0" style={{ color: T.danger }} />
                  ) : (
                    <CheckCircle className="w-5 h-5 shrink-0" style={{ color: T.accent }} />
                  )
                ) : (
                  <Clock className="w-5 h-5 shrink-0 opacity-30" style={{ color: T.textDim }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Historial */}
      <HistorialEjecuciones
        logs={historial ?? []}
        total={histTotal ?? 0}
        page={hPage}
        desde={sp.hDesde ?? ""}
        hasta={sp.hHasta ?? ""}
      />

      {/* Avisos enviados */}
      <MailsEnviados
        notifs={(notifs ?? []) as never}
        total={mailsTotal ?? 0}
        page={mPage}
        desde={sp.mDesde ?? ""}
        hasta={sp.mHasta ?? ""}
      />
    </div>
  );
}
