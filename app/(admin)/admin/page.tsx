import Link from "next/link";
import {
  Building2,
  Hourglass,
  AlertTriangle,
  DollarSign,
  Users,
  Mail,
  Wallet,
  Inbox,
} from "lucide-react";
import { T } from "@/lib/theme";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_ACCENT } from "@/components/admin/AdminSidebar";

export default async function AdminDashboardPage() {
  const admin = createAdminClient();

  const now = new Date();
  const hoyInicio = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const en7dias = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const hace48hs = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const hace24hs = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [
    gymsActivosRes,
    licenciasTrialRes,
    licenciasVencenRes,
    licenciasActivasRes,
    alumnosRes,
    emailsHoyRes,
    pagosHoyRes,
    leadsNuevosRes,
    gymsSinMpRes,
    cronsErrorRes,
    leadsSinContactarRes,
  ] = await Promise.all([
    admin.from("gyms").select("id", { count: "exact", head: true }).eq("activo", true),
    admin.from("licencias").select("id", { count: "exact", head: true }).eq("es_trial", true).eq("activa", true),
    admin
      .from("licencias")
      .select("id, fecha_vencimiento, gyms(nombre)")
      .eq("activa", true)
      .lte("fecha_vencimiento", en7dias)
      .order("fecha_vencimiento", { ascending: true })
      .limit(10),
    admin.from("licencias").select("precio_pagado, fecha_inicio, fecha_vencimiento").eq("activa", true).eq("es_trial", false),
    admin.from("alumnos").select("id", { count: "exact", head: true }).eq("activo", true),
    admin.from("notificaciones_log").select("id", { count: "exact", head: true }).gte("created_at", hoyInicio),
    admin.from("pagos").select("id", { count: "exact", head: true }).gte("created_at", hoyInicio),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("estado", "nuevo"),
    admin
      .from("gyms")
      .select("id, nombre, gym_config(mp_access_token)")
      .eq("activo", true)
      .limit(50),
    admin
      .from("cron_logs")
      .select("id, tipo, gym_id, error_detalle, created_at")
      .not("error_detalle", "is", null)
      .gte("created_at", hace24hs)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("leads")
      .select("id, nombre, created_at")
      .eq("estado", "nuevo")
      .lte("created_at", hace48hs)
      .order("created_at", { ascending: true })
      .limit(10),
  ]);

  const licenciasVencen = licenciasVencenRes.data ?? [];
  const cronsConError = cronsErrorRes.data ?? [];
  const leadsSinContactar = leadsSinContactarRes.data ?? [];
  const gymsSinMp = (gymsSinMpRes.data ?? []).filter((g) => {
    const cfg = Array.isArray(g.gym_config) ? g.gym_config[0] : g.gym_config;
    return !cfg?.mp_access_token;
  });

  // MRR mensualizado: precio_pagado / meses de duración de cada licencia activa no-trial
  const mrr = (licenciasActivasRes.data ?? []).reduce((sum, l) => {
    if (!l.precio_pagado || !l.fecha_inicio || !l.fecha_vencimiento) return sum;
    const inicio = new Date(l.fecha_inicio).getTime();
    const fin = new Date(l.fecha_vencimiento).getTime();
    const meses = Math.max(1, Math.round((fin - inicio) / (1000 * 60 * 60 * 24 * 30)));
    return sum + Number(l.precio_pagado) / meses;
  }, 0);

  const kpis = [
    { label: "Gyms activos",      value: gymsActivosRes.count ?? 0,                                  icon: Building2,  color: ADMIN_ACCENT, bg: "#F9731620" },
    { label: "En trial",          value: licenciasTrialRes.count ?? 0,                               icon: Hourglass,  color: T.blue,       bg: `${T.blue}15` },
    { label: "Vencen ≤ 7 días",   value: licenciasVencen.length,                                     icon: AlertTriangle, color: T.warning, bg: `${T.warning}15` },
    { label: "MRR estimado",      value: `US$ ${mrr.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`, icon: DollarSign, color: T.lime, bg: `${T.lime}15` },
    { label: "Alumnos totales",   value: (alumnosRes.count ?? 0).toLocaleString("es-AR"),            icon: Users,      color: T.accent,     bg: T.accentBg },
    { label: "Emails hoy",        value: emailsHoyRes.count ?? 0,                                    icon: Mail,       color: T.blue,       bg: `${T.blue}15` },
    { label: "Pagos hoy",         value: pagosHoyRes.count ?? 0,                                     icon: Wallet,     color: T.lime,       bg: `${T.lime}15` },
    { label: "Leads nuevos",      value: leadsNuevosRes.count ?? 0,                                  icon: Inbox,      color: T.danger,     bg: `${T.danger}15` },
  ];

  const alertas = [
    {
      titulo: "Licencias por vencer (≤ 7 días)",
      items: licenciasVencen.map((l) => {
        const gym = Array.isArray(l.gyms) ? l.gyms[0] : l.gyms;
        return { id: l.id, label: gym?.nombre ?? "Gym", detalle: `vence ${l.fecha_vencimiento}` };
      }),
      href: "/admin/licencias",
      color: T.warning,
      vacio: "Sin licencias por vencer en los próximos 7 días",
    },
    {
      titulo: "Gyms sin Mercado Pago configurado",
      items: gymsSinMp.map((g) => ({ id: g.id, label: g.nombre, detalle: "sin mp_access_token" })),
      href: "/admin/gyms",
      color: T.danger,
      vacio: "Todos los gyms activos tienen MP configurado",
    },
    {
      titulo: "Crons con errores (últimas 24hs)",
      items: cronsConError.map((c) => ({ id: c.id, label: c.tipo, detalle: c.error_detalle?.slice(0, 80) ?? "" })),
      href: "/admin/logs/crons",
      color: T.danger,
      vacio: "Sin errores de cron en las últimas 24 horas",
    },
    {
      titulo: "Leads sin contactar (+48hs)",
      items: leadsSinContactar.map((l) => ({ id: l.id, label: l.nombre, detalle: `recibido ${new Date(l.created_at).toLocaleDateString("es-AR")}` })),
      href: "/admin/leads",
      color: T.warning,
      vacio: "Todos los leads nuevos fueron contactados a tiempo",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>
          DASHBOARD
        </h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>
          KPIs de la plataforma — {now.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: k.bg, border: `1px solid ${k.color}25` }}>
              <k.icon className="w-4 h-4" style={{ color: k.color }} />
            </div>
            <p className="text-2xl font-black leading-none mb-1" style={{ fontFamily: "var(--font-barlow-condensed)", color: T.text }}>
              {k.value}
            </p>
            <p className="text-xs uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
              {k.label}
            </p>
          </div>
        ))}
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {alertas.map((a) => (
          <Link
            key={a.titulo}
            href={a.href}
            className="rounded-xl p-5 block transition-colors"
            style={{ background: T.card, border: `1px solid ${a.items.length ? `${a.color}40` : T.border}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" style={{ color: a.items.length ? a.color : T.textDim }} />
              <h3 className="text-sm font-extrabold uppercase tracking-widest" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>
                {a.titulo}
              </h3>
              {a.items.length > 0 && (
                <span
                  className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${a.color}20`, color: a.color }}
                >
                  {a.items.length}
                </span>
              )}
            </div>
            {a.items.length === 0 ? (
              <p className="text-sm" style={{ color: T.textDim }}>{a.vacio}</p>
            ) : (
              <ul className="space-y-1.5">
                {a.items.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span style={{ color: T.text }}>{item.label}</span>
                    <span className="text-xs" style={{ color: T.textDim }}>{item.detalle}</span>
                  </li>
                ))}
              </ul>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
