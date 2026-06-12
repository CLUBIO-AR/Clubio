import { requireGymContext } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreditCard, Calendar, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { T } from "@/lib/theme";

const PLAN_LABELS: Record<string, string> = { basic: "Basic", plus: "Plus (legacy)", multi: "Multi" };

const ESTADO_COLORS: Record<string, string> = {
  pendiente: "#fbbf24",
  pagado: "#34d399",
  vencido: "#f87171",
  cancelado: "#6b7280",
};
const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  vencido: "Vencido",
  cancelado: "Cancelado",
};
const ESTADO_ICONS: Record<string, React.ElementType> = {
  pendiente: Clock,
  pagado: CheckCircle2,
  vencido: AlertTriangle,
  cancelado: XCircle,
};

import type React from "react";

export default async function SuscripcionPage() {
  const ctx = await requireGymContext();
  const admin = createAdminClient();

  const [licenciaRes, cobrosRes] = await Promise.all([
    admin
      .from("licencias")
      .select("id, plan, activa, es_trial, fecha_inicio, fecha_vencimiento, precio_pagado, moneda")
      .eq("gym_id", ctx.gymId)
      .eq("activa", true)
      .single(),
    admin
      .from("cobros_suscripcion")
      .select("id, periodo, plan, monto_usd, monto_ars, estado, email_enviado_at, paid_at, link_pago")
      .eq("gym_id", ctx.gymId)
      .order("created_at", { ascending: false })
      .limit(24),
  ]);

  const licencia = licenciaRes.data;
  const cobros = cobrosRes.data ?? [];

  const hoy = new Date();
  const diasRestantes = licencia
    ? Math.ceil((new Date(licencia.fecha_vencimiento).getTime() - hoy.getTime()) / 86400000)
    : null;

  const estadoLicencia =
    !licencia ? "sin-licencia"
    : diasRestantes !== null && diasRestantes < 0 ? "vencida"
    : diasRestantes !== null && diasRestantes <= 7 ? "critica"
    : diasRestantes !== null && diasRestantes <= 30 ? "proxima"
    : "vigente";

  const estadoColor = {
    "sin-licencia": T.danger,
    vencida: T.danger,
    critica: "#f97316",
    proxima: "#fbbf24",
    vigente: T.accent,
  }[estadoLicencia];

  const estadoLabel = {
    "sin-licencia": "Sin licencia",
    vencida: "Vencida",
    critica: `Vence en ${diasRestantes} días`,
    proxima: `Vence en ${diasRestantes} días`,
    vigente: "Vigente",
  }[estadoLicencia];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: T.text }}>Mi suscripción</h1>
        <p className="text-sm mt-1" style={{ color: T.textMuted }}>Estado de tu licencia CLUBIO y historial de cobros</p>
      </div>

      {/* Estado de licencia */}
      {licencia ? (
        <div
          className="rounded-xl p-6"
          style={{
            background: T.card,
            border: `1px solid ${estadoColor}40`,
            boxShadow: `0 0 0 1px ${estadoColor}15`,
          }}
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" style={{ color: estadoColor }} />
                <span className="text-sm font-bold uppercase tracking-widest" style={{ color: T.textDim }}>
                  Plan {PLAN_LABELS[licencia.plan] ?? licencia.plan}
                  {licencia.es_trial && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs" style={{ background: `${T.blue}20`, color: T.blue }}>
                      Trial
                    </span>
                  )}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div>
                  <span style={{ color: T.textMuted }}>Inicio</span>
                  <p className="font-semibold" style={{ color: T.text }}>
                    {new Date(licencia.fecha_inicio).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <div>
                  <span style={{ color: T.textMuted }}>Vencimiento</span>
                  <p className="font-semibold" style={{ color: estadoColor }}>
                    {new Date(licencia.fecha_vencimiento).toLocaleDateString("es-AR")}
                  </p>
                </div>
              </div>
            </div>

            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: `${estadoColor}15`, border: `1px solid ${estadoColor}40`, color: estadoColor }}
            >
              {(estadoLicencia === "critica" || estadoLicencia === "proxima") && (
                <AlertTriangle className="w-4 h-4" />
              )}
              {estadoLicencia === "vigente" && <CheckCircle2 className="w-4 h-4" />}
              {estadoLicencia === "vencida" && <XCircle className="w-4 h-4" />}
              {estadoLabel}
            </div>
          </div>

          {(estadoLicencia === "critica" || estadoLicencia === "vencida") && (
            <p className="text-xs mt-4 pt-4" style={{ borderTop: `1px solid ${T.borderSub}`, color: T.textMuted }}>
              Si ya realizaste el pago, la renovación se aplica automáticamente. Si no recibiste el link de pago, contactá a soporte.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl p-6" style={{ background: T.card, border: `1px solid ${T.danger}40` }}>
          <p className="text-sm" style={{ color: T.danger }}>No hay licencia activa. Contactá a soporte para regularizar tu situación.</p>
        </div>
      )}

      {/* Cobros de suscripción */}
      <div>
        <h2 className="text-lg font-bold mb-3" style={{ color: T.text }}>Historial de cobros</h2>

        {cobros.length === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-sm" style={{ color: T.textMuted }}>Sin cobros registrados aún.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-x-auto" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Período", "Plan", "Monto", "Estado", "Fecha pago", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: T.textMuted }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cobros.map((c, i) => {
                  const [anio, mes] = c.periodo.split("-");
                  const periodoLabel = `${mes}/${anio}`;
                  const EstadoIcon = ESTADO_ICONS[c.estado] ?? Clock;
                  const estadoClr = ESTADO_COLORS[c.estado] ?? T.textDim;
                  return (
                    <tr key={c.id} style={{ borderTop: i > 0 ? `1px solid ${T.borderSub}` : undefined }}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: T.text }}>{periodoLabel}</td>
                      <td className="px-4 py-3" style={{ color: T.textMuted }}>{PLAN_LABELS[c.plan] ?? c.plan}</td>
                      <td className="px-4 py-3" style={{ color: T.text }}>$ {Number(c.monto_ars).toLocaleString("es-AR")}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold"
                          style={{ background: `${estadoClr}15`, color: estadoClr }}>
                          <EstadoIcon className="w-3 h-3" />
                          {ESTADO_LABELS[c.estado] ?? c.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: c.paid_at ? T.accent : T.textMuted }}>
                        {c.paid_at ? new Date(c.paid_at).toLocaleDateString("es-AR") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {c.link_pago && c.estado === "pendiente" && (
                          <a
                            href={c.link_pago}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                            style={{ background: `${T.accent}15`, border: `1px solid ${T.accentBorder}`, color: T.accent }}
                          >
                            <Calendar className="w-3 h-3" /> Pagar
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
