import { requireGymContext } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckCircle, XCircle, Clock, Zap, Bell, TrendingDown, Mail, AlertCircle } from "lucide-react";
import { T } from "@/lib/theme";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { CronsActions } from "@/components/crons/crons-actions";

const TIPO_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  generar_cuotas:   { label: "Generar cuotas",    icon: Zap,          color: T.accent  },
  enviar_avisos:    { label: "Enviar avisos",      icon: Bell,         color: T.blue    },
  aplicar_recargos: { label: "Aplicar recargos",   icon: TrendingDown, color: T.warning },
};

const MESES_CORTO = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatFecha(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${MESES_CORTO[d.getMonth() + 1]}/${String(d.getFullYear()).slice(2)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDuracion(ms: number | null) {
  if (!ms) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export default async function CronsPage() {
  const ctx = await requireGymContext();
  if (ctx.rol !== "owner" && ctx.rol !== "admin") redirect("/dashboard/configuracion");

  const admin = createAdminClient();

  // Última ejecución: worker logs de ESTE GYM (no dispatcher cross-gym)
  const { data: workerLogs } = await admin
    .from("cron_logs")
    .select("tipo, created_at, items_creados, items_error, items_saltados, duracion_ms, error_detalle")
    .eq("gym_id", ctx.gymId)
    .eq("es_dispatcher", false)
    .order("created_at", { ascending: false })
    .limit(30);

  // Historial del gym (solo workers de este gym)
  const { data: historial } = await admin
    .from("cron_logs")
    .select("id, tipo, items_creados, items_error, duracion_ms, error_detalle, created_at")
    .eq("gym_id", ctx.gymId)
    .eq("es_dispatcher", false)
    .order("created_at", { ascending: false })
    .limit(50);

  // Mails enviados recientes
  const { data: notifs } = await admin
    .from("notificaciones_log")
    .select("id, tipo, enviado_a, estado, created_at, alumnos(nombre, apellido)")
    .eq("gym_id", ctx.gymId)
    .order("created_at", { ascending: false })
    .limit(30);

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
      <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: T.borderSub }}>
          <h2 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
            — Historial de ejecuciones (últimas 50)
          </h2>
        </div>

        <div className="px-5 py-2 grid gap-3 border-b" style={{ borderColor: T.borderSub, background: T.bgDeep, gridTemplateColumns: "1fr 130px 60px 60px 60px" }}>
          {["Fecha", "Tipo", "Items", "Errores", "Estado"].map((h) => (
            <p key={h} className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>{h}</p>
          ))}
        </div>

        {(historial ?? []).length === 0 && (
          <div className="px-5 py-10 text-center" style={{ color: T.textDim }}>
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin registros de ejecución</p>
          </div>
        )}

        {(historial ?? []).map((log) => {
          const tipoInfo = TIPO_CONFIG[log.tipo];
          const hayError = (log.items_error ?? 0) > 0 || !!log.error_detalle;
          const TipoIcon = tipoInfo?.icon ?? Zap;
          return (
            <div key={log.id} className="px-5 py-3 grid gap-3 items-center border-b last:border-b-0"
              style={{ borderColor: T.borderSub, gridTemplateColumns: "1fr 130px 60px 60px 60px" }}>
              <div>
                <p className="text-xs font-mono" style={{ color: T.text }}>{formatFecha(log.created_at)}</p>
                <p className="text-xs" style={{ color: T.textDim }}>{formatDuracion(log.duracion_ms)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <TipoIcon className="w-3.5 h-3.5 shrink-0" style={{ color: tipoInfo?.color ?? T.accent }} />
                <span className="text-xs font-medium truncate" style={{ color: T.text }}>{tipoInfo?.label ?? log.tipo}</span>
              </div>
              <p className="text-xs font-mono" style={{ color: T.textMuted }}>{log.items_creados ?? "—"}</p>
              <p className="text-xs font-mono" style={{ color: (log.items_error ?? 0) > 0 ? T.danger : T.textMuted }}>
                {log.items_error ?? "—"}
              </p>
              <div>
                {hayError ? (
                  <XCircle className="w-4 h-4" style={{ color: T.danger }} />
                ) : (
                  <CheckCircle className="w-4 h-4" style={{ color: T.accent }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Avisos enviados */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: T.borderSub }}>
          <h2 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: T.blue, fontFamily: "var(--font-barlow-condensed)" }}>
            — Mails enviados (últimos 30)
          </h2>
        </div>

        <div className="px-5 py-2 grid gap-3 border-b" style={{ borderColor: T.borderSub, background: T.bgDeep, gridTemplateColumns: "minmax(0,1fr) minmax(0,1.5fr) 80px 70px" }}>
          {["Alumno", "Email", "Tipo", "Estado"].map((h) => (
            <p key={h} className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>{h}</p>
          ))}
        </div>

        {(notifs ?? []).length === 0 && (
          <div className="px-5 py-10 text-center" style={{ color: T.textDim }}>
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin avisos enviados</p>
          </div>
        )}

        {(notifs ?? []).map((n) => {
          const alumno = n.alumnos as { nombre: string; apellido: string } | null;
          const ok = n.estado === "enviado";
          return (
            <div key={n.id} className="px-5 py-3 grid gap-3 items-center border-b last:border-b-0"
              style={{ borderColor: T.borderSub, gridTemplateColumns: "minmax(0,1fr) minmax(0,1.5fr) 80px 70px" }}>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: T.text }}>
                  {alumno ? `${alumno.apellido}, ${alumno.nombre}` : "—"}
                </p>
                <p className="text-xs" style={{ color: T.textDim }}>{formatFecha(n.created_at)}</p>
              </div>
              <p className="text-xs font-mono truncate" style={{ color: T.textDim }}>{n.enviado_a}</p>
              <p className="text-xs capitalize" style={{ color: T.textDim }}>{n.tipo?.replace(/_/g, " ")}</p>
              <div className="flex items-center gap-1">
                {ok ? (
                  <><CheckCircle className="w-3.5 h-3.5" style={{ color: T.accent }} /><span className="text-xs" style={{ color: T.accent }}>OK</span></>
                ) : (
                  <><AlertCircle className="w-3.5 h-3.5" style={{ color: T.danger }} /><span className="text-xs" style={{ color: T.danger }}>{n.estado}</span></>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
