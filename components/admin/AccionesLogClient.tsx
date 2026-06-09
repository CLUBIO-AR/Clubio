"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { T } from "@/lib/theme";
import { ADMIN_ACCENT } from "./AdminSidebar";
import { AdminPagination } from "./AdminPagination";
import type { AccionLogRow } from "@/app/(admin)/admin/logs/acciones/page";

const ACCION_LABELS: Record<string, string> = {
  gym_reactivado: "Gym reactivado",
  gym_suspendido: "Gym suspendido",
  plan_cambiado: "Plan cambiado",
  licencia_renovada: "Licencia renovada",
  gym_usuario_creado: "Usuario creado",
  gym_usuario_activado: "Usuario activado",
  gym_usuario_desactivado: "Usuario desactivado",
  gym_usuario_rol_cambiado: "Rol cambiado",
  cobro_suscripcion_generado: "Cobro generado",
  cobro_suscripcion_reenviado: "Cobro reenviado",
  cobro_suscripcion_cancelado: "Cobro cancelado",
};

const ACCION_COLORS: Record<string, string> = {
  gym_suspendido: "#f87171",
  cobro_suscripcion_cancelado: "#f87171",
  gym_usuario_desactivado: "#f97316",
  gym_reactivado: "#34d399",
  gym_usuario_activado: "#34d399",
  licencia_renovada: "#34d399",
  cobro_suscripcion_generado: "#fbbf24",
  cobro_suscripcion_reenviado: "#60a5fa",
  plan_cambiado: "#a78bfa",
};

function nombre(v: { nombre: string; email?: string } | { nombre: string; email?: string }[] | null): string {
  if (!v) return "—";
  if (Array.isArray(v)) return v[0]?.nombre ?? "—";
  return v.nombre;
}

interface Props {
  logs: AccionLogRow[];
  total: number;
  page: number;
  totalPages: number;
  accionesUnicas: string[];
  admins: { id: string; nombre: string; email: string }[];
  gyms: { id: string; nombre: string }[];
  filtros: { accion: string; gymId: string; adminId: string };
}

export function AccionesLogClient({ logs, total, page, totalPages, accionesUnicas, admins, gyms, filtros }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function setFiltro(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`/admin/logs/acciones?${params.toString()}`);
  }

  function hrefForPage(p: number) {
    const params = new URLSearchParams(sp.toString());
    if (p > 1) params.set("page", String(p)); else params.delete("page");
    return `/admin/logs/acciones?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>
          AUDIT TRAIL
        </h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>
          Historial de acciones realizadas por superadmins — {total} registros
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filtros.accion}
          onChange={(e) => setFiltro("accion", e.target.value)}
          className="h-9 px-3 rounded-lg text-sm"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" }}
        >
          <option value="">Todas las acciones</option>
          {accionesUnicas.map((a) => (
            <option key={a} value={a}>{ACCION_LABELS[a] ?? a}</option>
          ))}
        </select>
        <select
          value={filtros.gymId}
          onChange={(e) => setFiltro("gym_id", e.target.value)}
          className="h-9 px-3 rounded-lg text-sm"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" }}
        >
          <option value="">Todos los gyms</option>
          {gyms.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
        <select
          value={filtros.adminId}
          onChange={(e) => setFiltro("admin_id", e.target.value)}
          className="h-9 px-3 rounded-lg text-sm"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" }}
        >
          <option value="">Todos los admins</option>
          {admins.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {logs.length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: T.textDim }}>Sin acciones registradas</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Fecha", "Acción", "Admin", "Gym", "Detalle"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider"
                    style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const color = ACCION_COLORS[log.accion] ?? T.textDim;
                const expanded = expandedId === log.id;
                return (
                  <>
                    <tr
                      key={log.id}
                      onClick={() => setExpandedId(expanded ? null : log.id)}
                      className="cursor-pointer transition-colors"
                      style={{
                        borderTop: i > 0 ? `1px solid ${T.borderSub}` : undefined,
                        background: expanded ? `${color}08` : undefined,
                      }}
                    >
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: T.textDim }}>
                        {new Date(log.created_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: `${color}15`, color }}>
                          {ACCION_LABELS[log.accion] ?? log.accion}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: T.textMuted }}>
                        {nombre(log.admin_users)}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: T.textMuted }}>
                        {log.gym_id ? nombre(log.gyms) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: T.textDim }}>
                        {log.detalle
                          ? <span className="underline decoration-dotted" style={{ color: ADMIN_ACCENT }}>ver detalle</span>
                          : "—"}
                      </td>
                    </tr>
                    {expanded && log.detalle && (
                      <tr key={`${log.id}-detail`} style={{ background: `${color}08` }}>
                        <td colSpan={5} className="px-4 pb-3">
                          <pre className="text-xs rounded-lg p-3 overflow-x-auto"
                            style={{ background: T.bg, border: `1px solid ${T.borderSub}`, color: T.textMuted, fontFamily: "monospace" }}>
                            {JSON.stringify(log.detalle, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <AdminPagination page={page} totalPages={totalPages} total={total} hrefForPage={hrefForPage} />
    </div>
  );
}
