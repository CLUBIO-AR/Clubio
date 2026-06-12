"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Users, DollarSign, RefreshCw, Loader2, Ban, CheckCircle2, UserPlus, Copy, Check, CreditCard, ExternalLink, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { T } from "@/lib/theme";
import { ADMIN_ACCENT } from "./AdminSidebar";
import { AdminBadge, PLAN_COLORS, PLAN_LABELS } from "./AdminBadge";
import { toggleGymActivoAction, cambiarPlanAction, renovarLicenciaAction, agregarGymUsuarioAction, toggleGymUsuarioActivoAction, cambiarRolGymUsuarioAction } from "@/app/actions/admin-gyms";
import { generarCobroAction } from "@/app/actions/admin-suscripciones";

type Licencia = { id: string; plan: string; activa: boolean; es_trial: boolean; fecha_inicio: string; fecha_vencimiento: string; precio_pagado: number | null; moneda: string | null };
type CobroSuscripcion = { id: string; periodo: string; plan: string; monto_usd: number; monto_ars: number; estado: string; link_pago: string | null; email_enviado_at: string | null; paid_at: string | null };

const COBRO_ESTADO_COLORS: Record<string, string> = { pendiente: "#fbbf24", pagado: "#34d399", vencido: "#f87171", cancelado: "#6b7280" };
const COBRO_ESTADO_LABELS: Record<string, string> = { pendiente: "Pendiente", pagado: "Pagado", vencido: "Vencido", cancelado: "Cancelado" };

interface GymDetailClientProps {
  gym: {
    id: string;
    nombre: string;
    email_contacto: string;
    telefono: string | null;
    direccion: string | null;
    activo: boolean;
    created_at: string;
    licencias: Licencia[] | Licencia | null;
    gym_config: { mp_access_token: string | null; monto_base_defecto: number | null }[] | { mp_access_token: string | null; monto_base_defecto: number | null } | null;
  };
  sucursales: { id: string; nombre: string; direccion: string | null; activa: boolean; es_principal: boolean }[];
  usuarios: { id: string; nombre: string; email: string | null; rol: string; activo: boolean }[];
  cobros: CobroSuscripcion[];
  totalAlumnos: number;
  cobradoMes: number;
}

function uno<T>(v: T[] | T | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

const ROL_LABELS: Record<string, string> = { owner: "Owner", admin: "Admin", recepcion: "Recepción" };

export function GymDetailClient({ gym, sucursales, usuarios, cobros, totalAlumnos, cobradoMes }: GymDetailClientProps) {
  const router = useRouter();
  const licencia = uno(gym.licencias);
  const config = uno(gym.gym_config);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [renovarDialogOpen, setRenovarDialogOpen] = useState(false);
  const [nuevoPlan, setNuevoPlan] = useState(licencia?.plan ?? "basic");
  const [motivoCambioPlan, setMotivoCambioPlan] = useState("");
  const [motivoRenovar, setMotivoRenovar] = useState("");
  const [meses, setMeses] = useState(12);
  const [precio, setPrecio] = useState(licencia?.precio_pagado ?? 0);

  // Gestión de usuarios del gym
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ nombre: "", email: "", rol: "admin" as "owner" | "admin" | "recepcion" });
  const [addUserCredenciales, setAddUserCredenciales] = useState<{ email: string; password: string } | null>(null);
  const [addUserCopiado, setAddUserCopiado] = useState(false);
  const [rolTarget, setRolTarget] = useState<{ id: string; nombre: string; rol: string } | null>(null);
  const [nuevoRol, setNuevoRol] = useState<"owner" | "admin" | "recepcion">("admin");
  const [cobroLinkCopiado, setCobroLinkCopiado] = useState(false);
  const [cobroLink, setCobroLink] = useState<string | null>(null);

  async function handleToggleActivo() {
    setLoading(true);
    setError(null);
    const res = await toggleGymActivoAction(gym.id, !gym.activo);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  async function handleCambiarPlan() {
    if (!licencia) return;
    setLoading(true);
    setError(null);
    const res = await cambiarPlanAction(gym.id, licencia.id, nuevoPlan as "basic" | "multi", motivoCambioPlan.trim() || undefined);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setPlanDialogOpen(false);
    setMotivoCambioPlan("");
    router.refresh();
  }

  async function handleAgregarUsuario() {
    setLoading(true);
    setError(null);
    const res = await agregarGymUsuarioAction(gym.id, addUserForm.nombre, addUserForm.email, addUserForm.rol);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setAddUserCredenciales(res.data);
    router.refresh();
  }

  async function handleToggleUsuario(usuarioId: string, activo: boolean) {
    setLoading(true);
    setError(null);
    const res = await toggleGymUsuarioActivoAction(gym.id, usuarioId, activo);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  async function handleCambiarRol() {
    if (!rolTarget) return;
    setLoading(true);
    setError(null);
    const res = await cambiarRolGymUsuarioAction(gym.id, rolTarget.id, nuevoRol);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setRolTarget(null);
    router.refresh();
  }

  async function handleGenerarCobro() {
    setLoading(true);
    setError(null);
    const res = await generarCobroAction(gym.id);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setCobroLink(res.data.link_pago);
    router.refresh();
  }

  async function handleRenovar() {
    if (!licencia) return;
    setLoading(true);
    setError(null);
    const res = await renovarLicenciaAction(gym.id, licencia.id, meses, precio, motivoRenovar.trim() || undefined);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setRenovarDialogOpen(false);
    setMotivoRenovar("");
    router.refresh();
  }

  const stats = [
    { label: "Alumnos activos",  value: totalAlumnos.toLocaleString("es-AR"),       icon: Users,     color: ADMIN_ACCENT, bg: "#F9731620" },
    { label: "Cobrado este mes", value: `$${cobradoMes.toLocaleString("es-AR")}`,   icon: DollarSign, color: T.lime,      bg: `${T.lime}15` },
    { label: "Sucursales",       value: sucursales.length,                          icon: Building2,  color: T.blue,      bg: `${T.blue}15` },
  ];

  return (
    <div className="space-y-6">
      <Link href="/admin/gyms" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold transition-opacity hover:opacity-70" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Volver a gyms
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>{gym.nombre}</h1>
            <AdminBadge label={gym.activo ? "Activo" : "Suspendido"} color={gym.activo ? T.accent : T.danger} />
          </div>
          <p className="text-sm mt-1" style={{ color: T.textDim }}>{gym.email_contacto} · {gym.telefono ?? "sin teléfono"}</p>
        </div>
        <div className="flex items-center gap-2">
          {gym.activo ? (
            <button onClick={handleToggleActivo} disabled={loading} className="h-9 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all hover:opacity-80 inline-flex items-center gap-2"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: `${T.danger}15`, border: `1px solid ${T.danger}40`, color: T.danger }}>
              <Ban className="w-3.5 h-3.5" /> Suspender
            </button>
          ) : (
            <button onClick={handleToggleActivo} disabled={loading} className="h-9 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all hover:opacity-80 inline-flex items-center gap-2"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accentBg, border: `1px solid ${T.accentBorder}`, color: T.accent }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Reactivar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: `${T.danger}15`, border: `1px solid ${T.danger}40`, color: T.danger }}>{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: s.bg, border: `1px solid ${s.color}25` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-black leading-none mb-1" style={{ fontFamily: "var(--font-barlow-condensed)", color: T.text }}>{s.value}</p>
            <p className="text-xs uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Licencia */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-widest" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>Licencia</h3>
            {licencia && (
              <div className="flex items-center gap-2">
                <button onClick={() => setPlanDialogOpen(true)} className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ fontFamily: "var(--font-barlow-condensed)", background: "#F9731620", border: "1px solid #F9731648", color: ADMIN_ACCENT }}>
                  Cambiar plan
                </button>
                <button onClick={() => setRenovarDialogOpen(true)} className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 inline-flex items-center gap-1.5"
                  style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accentBg, border: `1px solid ${T.accentBorder}`, color: T.accent }}>
                  <RefreshCw className="w-3 h-3" /> Renovar
                </button>
              </div>
            )}
          </div>
          {licencia ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <AdminBadge label={PLAN_LABELS[licencia.plan] ?? licencia.plan} color={PLAN_COLORS[licencia.plan] ?? T.textMuted} />
                {licencia.es_trial && <AdminBadge label="Trial" color={T.blue} />}
                <AdminBadge label={licencia.activa ? "Activa" : "Inactiva"} color={licencia.activa ? T.accent : T.textDim} />
              </div>
              <p style={{ color: T.textMuted }}>Inicio: <span style={{ color: T.text }}>{new Date(licencia.fecha_inicio).toLocaleDateString("es-AR")}</span></p>
              <p style={{ color: T.textMuted }}>Vencimiento: <span style={{ color: new Date(licencia.fecha_vencimiento) < new Date() ? T.danger : T.text }}>{new Date(licencia.fecha_vencimiento).toLocaleDateString("es-AR")}</span></p>
              <p style={{ color: T.textMuted }}>Precio acordado: <span style={{ color: T.text }}>{licencia.moneda ?? "USD"} {licencia.precio_pagado ?? "—"}</span></p>
            </div>
          ) : <p className="text-sm" style={{ color: T.textDim }}>Sin licencia registrada.</p>}
        </div>

        {/* Configuración */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-extrabold uppercase tracking-widest" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>Configuración</h3>
          <div className="space-y-2 text-sm">
            <p style={{ color: T.textMuted }}>Mercado Pago: {config?.mp_access_token
              ? <AdminBadge label="Configurado" color={T.accent} />
              : <AdminBadge label="Sin configurar" color={T.danger} />}
            </p>
            <p style={{ color: T.textMuted }}>Cuota base por defecto: <span style={{ color: T.text }}>{config?.monto_base_defecto ? `$${config.monto_base_defecto}` : "—"}</span></p>
            <p style={{ color: T.textMuted }}>Dirección: <span style={{ color: T.text }}>{gym.direccion ?? "—"}</span></p>
            <p style={{ color: T.textMuted }}>Alta: <span style={{ color: T.text }}>{new Date(gym.created_at).toLocaleDateString("es-AR")}</span></p>
          </div>
        </div>

        {/* Sucursales */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-extrabold uppercase tracking-widest" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>Sucursales ({sucursales.length})</h3>
          {sucursales.length === 0 ? <p className="text-sm" style={{ color: T.textDim }}>Sin sucursales.</p> : (
            <ul className="space-y-1.5 text-sm">
              {sucursales.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span style={{ color: T.text }}>{s.nombre} {s.es_principal && <span style={{ color: T.textDim }}>(principal)</span>}</span>
                  <AdminBadge label={s.activa ? "Activa" : "Inactiva"} color={s.activa ? T.accent : T.textDim} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Usuarios */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-widest" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>Usuarios ({usuarios.length})</h3>
            <button onClick={() => { setAddUserForm({ nombre: "", email: "", rol: "admin" }); setAddUserCredenciales(null); setAddUserDialogOpen(true); }}
              className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 inline-flex items-center gap-1.5"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: "#F9731620", border: "1px solid #F9731648", color: ADMIN_ACCENT }}>
              <UserPlus className="w-3 h-3" /> Agregar
            </button>
          </div>
          {usuarios.length === 0 ? <p className="text-sm" style={{ color: T.textDim }}>Sin usuarios.</p> : (
            <ul className="space-y-2 text-sm">
              {usuarios.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p style={{ color: T.text }}>{u.nombre}</p>
                    <p className="text-xs truncate" style={{ color: T.textDim }}>{u.email ?? "sin email"} · {ROL_LABELS[u.rol] ?? u.rol}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => { setNuevoRol(u.rol as "owner" | "admin" | "recepcion"); setRolTarget(u); }}
                      className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-opacity hover:opacity-80"
                      style={{ fontFamily: "var(--font-barlow-condensed)", background: T.bg, border: `1px solid ${T.borderSub}`, color: T.textDim }}>
                      Rol
                    </button>
                    <button onClick={() => handleToggleUsuario(u.id, !u.activo)} disabled={loading}
                      className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-opacity hover:opacity-80"
                      style={{ fontFamily: "var(--font-barlow-condensed)", background: u.activo ? `${T.danger}15` : T.accentBg, border: `1px solid ${u.activo ? T.danger + "40" : T.accentBorder}`, color: u.activo ? T.danger : T.accent }}>
                      {u.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Cobros de suscripción */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" style={{ color: ADMIN_ACCENT }} />
            <h3 className="text-sm font-extrabold uppercase tracking-widest" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>
              Cobros de suscripción
            </h3>
            <Link
              href={`/admin/suscripciones?gym_id=${gym.id}`}
              className="text-xs font-bold uppercase tracking-wider hover:opacity-70 transition-opacity"
              style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}
            >
              Ver todos
            </Link>
          </div>
          <button
            onClick={handleGenerarCobro}
            disabled={loading}
            className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 inline-flex items-center gap-1.5"
            style={{ fontFamily: "var(--font-barlow-condensed)", background: "#F9731620", border: "1px solid #F9731648", color: ADMIN_ACCENT }}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
            Generar cobro
          </button>
        </div>

        {cobroLink && (
          <div className="rounded-lg p-3 space-y-2" style={{ background: T.bg, border: `1px solid ${T.accentBorder}` }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
              Link de pago generado y enviado por email
            </p>
            <div className="flex items-center gap-2">
              <a href={cobroLink} target="_blank" rel="noopener noreferrer"
                className="text-xs truncate flex-1 hover:underline" style={{ color: T.textMuted }}>
                {cobroLink}
              </a>
              <button onClick={async () => { await navigator.clipboard.writeText(cobroLink); setCobroLinkCopiado(true); setTimeout(() => setCobroLinkCopiado(false), 2000); }}
                className="p-1.5 rounded shrink-0" style={{ background: T.card, border: `1px solid ${T.border}`, color: T.textDim }}>
                {cobroLinkCopiado ? <Check className="w-3 h-3" style={{ color: T.accent }} /> : <Copy className="w-3 h-3" />}
              </button>
              <a href={cobroLink} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded shrink-0" style={{ background: T.card, border: `1px solid ${T.border}`, color: T.textDim }}>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {cobros.length === 0 ? (
          <p className="text-sm" style={{ color: T.textDim }}>Sin cobros registrados.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {cobros.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs" style={{ color: T.textDim }}>{c.periodo}</span>
                <span style={{ color: T.textMuted }}>{c.plan.toUpperCase()} · USD {c.monto_usd}</span>
                <AdminBadge
                  label={COBRO_ESTADO_LABELS[c.estado] ?? c.estado}
                  color={COBRO_ESTADO_COLORS[c.estado] ?? T.textDim}
                />
                {c.link_pago && c.estado === "pendiente" && (
                  <a href={c.link_pago} target="_blank" rel="noopener noreferrer"
                    className="p-1 rounded" style={{ background: T.bg, border: `1px solid ${T.borderSub}`, color: T.textDim }}>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Cambiar plan dialog */}
      <Dialog open={planDialogOpen} onOpenChange={(open) => { setPlanDialogOpen(open); if (!open) setMotivoCambioPlan(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar plan</DialogTitle>
            <DialogDescription>El gym recibirá un email notificando el cambio.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest block mb-1.5" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Nuevo plan</label>
              <select value={nuevoPlan} onChange={(e) => setNuevoPlan(e.target.value)} className="h-9 px-3 rounded-lg text-sm w-full"
                style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>
                <option value="basic">Basic — USD 28</option>
                <option value="multi">Multi — USD 75</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
                <FileText className="w-3 h-3" /> Motivo del cambio <span style={{ color: T.textDim, fontWeight: 400 }}>(opcional)</span>
              </label>
              <textarea
                value={motivoCambioPlan}
                onChange={(e) => setMotivoCambioPlan(e.target.value)}
                rows={2}
                placeholder="Ej: Upgrade acordado por email, descuento comercial..."
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text, fontFamily: "inherit" }}
              />
              <p className="text-xs mt-1" style={{ color: T.textDim }}>Se registra en el historial y se incluye en el email al gym.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPlanDialogOpen(false); setMotivoCambioPlan(""); }}>Cancelar</Button>
            <Button onClick={handleCambiarPlan} disabled={loading} className={buttonVariants({ className: "gap-2" })} style={{ background: ADMIN_ACCENT, color: T.bgDeep, border: "none" }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agregar usuario dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={(open) => { if (!open) { setAddUserDialogOpen(false); setError(null); } }}>
        <DialogContent>
          {addUserCredenciales ? (
            <>
              <DialogHeader>
                <DialogTitle>Usuario creado</DialogTitle>
                <DialogDescription>Credenciales para enviar al usuario. El password solo se muestra una vez.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm font-mono rounded-lg p-3" style={{ background: T.bg, border: `1px solid ${T.borderSub}` }}>
                <p style={{ color: T.textMuted }}>Email: <span style={{ color: T.text }}>{addUserCredenciales.email}</span></p>
                <p style={{ color: T.textMuted }}>Password: <span style={{ color: T.text }}>{addUserCredenciales.password}</span></p>
              </div>
              <DialogFooter>
                <button onClick={async () => {
                  await navigator.clipboard.writeText(`Email: ${addUserCredenciales.email}\nPassword: ${addUserCredenciales.password}`);
                  setAddUserCopiado(true); setTimeout(() => setAddUserCopiado(false), 2000);
                }} className="h-9 px-4 rounded-lg text-sm font-bold uppercase tracking-wider inline-flex items-center gap-2 hover:opacity-80"
                  style={{ fontFamily: "var(--font-barlow-condensed)", background: "#F9731620", border: "1px solid #F9731648", color: ADMIN_ACCENT }}>
                  {addUserCopiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {addUserCopiado ? "Copiado" : "Copiar"}
                </button>
                <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Agregar usuario</DialogTitle>
                <DialogDescription>Creá un nuevo usuario para {gym.nombre}. Recibirá un email con su contraseña temporal.</DialogDescription>
              </DialogHeader>
              {error && <div className="rounded-lg px-3 py-2 text-xs" style={{ background: `${T.danger}15`, border: `1px solid ${T.danger}40`, color: T.danger }}>{error}</div>}
              <div className="space-y-3">
                <div><label className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Nombre</label>
                  <Input value={addUserForm.nombre} onChange={(e) => setAddUserForm((f) => ({ ...f, nombre: e.target.value }))} style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text }} /></div>
                <div><label className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Email</label>
                  <Input type="email" value={addUserForm.email} onChange={(e) => setAddUserForm((f) => ({ ...f, email: e.target.value }))} style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text }} /></div>
                <div><label className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Rol</label>
                  <select value={addUserForm.rol} onChange={(e) => setAddUserForm((f) => ({ ...f, rol: e.target.value as "owner" | "admin" | "recepcion" }))} className="h-9 px-3 rounded-lg text-sm w-full"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="recepcion">Recepción</option>
                  </select></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setAddUserDialogOpen(false); setError(null); }}>Cancelar</Button>
                <Button onClick={handleAgregarUsuario} disabled={loading} className={buttonVariants({ className: "gap-2" })} style={{ background: ADMIN_ACCENT, color: T.bgDeep, border: "none" }}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />} Crear usuario
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cambiar rol dialog */}
      <Dialog open={!!rolTarget} onOpenChange={(open) => !open && setRolTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar rol</DialogTitle>
            <DialogDescription>Usuario: {rolTarget?.nombre}</DialogDescription>
          </DialogHeader>
          <select value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value as "owner" | "admin" | "recepcion")} className="h-9 px-3 rounded-lg text-sm w-full"
            style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="recepcion">Recepción</option>
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRolTarget(null)}>Cancelar</Button>
            <Button onClick={handleCambiarRol} disabled={loading} className={buttonVariants({ className: "gap-2" })} style={{ background: ADMIN_ACCENT, color: T.bgDeep, border: "none" }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renovar licencia dialog */}
      <Dialog open={renovarDialogOpen} onOpenChange={(open) => { setRenovarDialogOpen(open); if (!open) setMotivoRenovar(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renovar licencia</DialogTitle>
            <DialogDescription>Extiende el vencimiento desde la fecha actual o desde el vencimiento vigente (lo que sea posterior).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-widest font-bold" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Meses a agregar</label>
              <Input type="number" min={1} value={meses} onChange={(e) => setMeses(Number(e.target.value))} style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text }} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-bold" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Precio acordado (USD) <span style={{ color: T.textDim, fontWeight: 400 }}>(0 = sin costo)</span></label>
              <Input type="number" min={0} value={precio} onChange={(e) => setPrecio(Number(e.target.value))} style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text }} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
                <FileText className="w-3 h-3" /> Motivo <span style={{ color: T.textDim, fontWeight: 400 }}>(opcional)</span>
              </label>
              <textarea
                value={motivoRenovar}
                onChange={(e) => setMotivoRenovar(e.target.value)}
                rows={2}
                placeholder="Ej: Período de gracia por soporte, promoción anual..."
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text, fontFamily: "inherit" }}
              />
              <p className="text-xs mt-1" style={{ color: T.textDim }}>Se registra en el historial para trazabilidad.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRenovarDialogOpen(false); setMotivoRenovar(""); }}>Cancelar</Button>
            <Button onClick={handleRenovar} disabled={loading} className={buttonVariants({ className: "gap-2" })} style={{ background: T.accent, color: T.bgDeep, border: "none" }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Renovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
