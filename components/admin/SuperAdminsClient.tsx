"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, ShieldCheck, Copy, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { T } from "@/lib/theme";
import { ADMIN_ACCENT } from "./AdminSidebar";
import { AdminBadge } from "./AdminBadge";
import { crearSuperAdminAction, toggleSuperAdminActivoAction } from "@/app/actions/admin-superadmins";

interface AdminRow {
  id: string;
  email: string;
  nombre: string;
  activo: boolean;
  created_at: string;
}

interface Props {
  admins: AdminRow[];
}

export function SuperAdminsClient({ admins }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "" });
  const [credenciales, setCredenciales] = useState<{ email: string; password: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function handleCrear() {
    setLoading(true);
    setError(null);
    const res = await crearSuperAdminAction(form.nombre, form.email);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setCredenciales(res.data);
    router.refresh();
  }

  async function handleToggle(adminId: string, activo: boolean) {
    setLoading(true);
    setError(null);
    const res = await toggleSuperAdminActivoAction(adminId, activo);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>SUPERADMINS</h1>
          <p className="text-sm mt-1" style={{ color: T.textDim }}>{admins.length} cuenta{admins.length !== 1 ? "s" : ""} de administración</p>
        </div>
        <button onClick={() => { setForm({ nombre: "", email: "" }); setCredenciales(null); setError(null); setDialogOpen(true); }}
          className="h-9 px-4 rounded-lg text-sm font-bold uppercase tracking-wider inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
          style={{ fontFamily: "var(--font-barlow-condensed)", background: "#F9731620", border: "1px solid #F9731648", color: ADMIN_ACCENT }}>
          <UserPlus className="w-4 h-4" /> Nuevo superadmin
        </button>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: `${T.danger}15`, border: `1px solid ${T.danger}40`, color: T.danger }}>{error}</div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {admins.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldCheck className="w-8 h-8 mx-auto mb-3" style={{ color: T.textDim }} />
            <p className="text-sm" style={{ color: T.textDim }}>No hay superadmins registrados.</p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: T.borderSub }}>
            {admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-sm" style={{ color: T.text }}>{a.nombre}</p>
                  <p className="text-xs" style={{ color: T.textDim }}>{a.email} · Alta: {new Date(a.created_at).toLocaleDateString("es-AR")}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <AdminBadge label={a.activo ? "Activo" : "Inactivo"} color={a.activo ? T.accent : T.textDim} />
                  <button onClick={() => handleToggle(a.id, !a.activo)} disabled={loading}
                    className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{ fontFamily: "var(--font-barlow-condensed)", background: a.activo ? `${T.danger}15` : T.accentBg, border: `1px solid ${a.activo ? T.danger + "40" : T.accentBorder}`, color: a.activo ? T.danger : T.accent }}>
                    {a.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setError(null); } }}>
        <DialogContent>
          {credenciales ? (
            <>
              <DialogHeader>
                <DialogTitle>Superadmin creado</DialogTitle>
                <DialogDescription>Guardá estas credenciales. El password solo se muestra una vez.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm font-mono rounded-lg p-3" style={{ background: T.bg, border: `1px solid ${T.borderSub}` }}>
                <p style={{ color: T.textMuted }}>Email: <span style={{ color: T.text }}>{credenciales.email}</span></p>
                <p style={{ color: T.textMuted }}>Password: <span style={{ color: T.text }}>{credenciales.password}</span></p>
              </div>
              <DialogFooter>
                <button onClick={async () => {
                  await navigator.clipboard.writeText(`Email: ${credenciales.email}\nPassword: ${credenciales.password}`);
                  setCopiado(true); setTimeout(() => setCopiado(false), 2000);
                }} className="h-9 px-4 rounded-lg text-sm font-bold uppercase tracking-wider inline-flex items-center gap-2 hover:opacity-80"
                  style={{ fontFamily: "var(--font-barlow-condensed)", background: "#F9731620", border: "1px solid #F9731648", color: ADMIN_ACCENT }}>
                  {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copiado ? "Copiado" : "Copiar"}
                </button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Nuevo superadmin</DialogTitle>
                <DialogDescription>Creá una cuenta de acceso al panel de administración de CLUBIO.</DialogDescription>
              </DialogHeader>
              {error && <div className="rounded-lg px-3 py-2 text-xs" style={{ background: `${T.danger}15`, border: `1px solid ${T.danger}40`, color: T.danger }}>{error}</div>}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Nombre</label>
                  <Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text }} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Email</label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text }} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDialogOpen(false); setError(null); }}>Cancelar</Button>
                <Button onClick={handleCrear} disabled={loading} className={buttonVariants({ className: "gap-2" })} style={{ background: ADMIN_ACCENT, color: T.bgDeep, border: "none" }}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />} Crear
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
