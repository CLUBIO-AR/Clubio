"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Calendar, DollarSign, AlertTriangle, CheckCircle, XCircle, Clock, Link2, Copy, Check, RefreshCw } from "lucide-react";
import { T } from "@/lib/theme";

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const ESTADO_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  pendiente:     { label: "Pendiente",    bg: `${T.warning}15`, color: T.warning, icon: Clock },
  vencida:       { label: "Vencida",      bg: `${T.danger}15`,  color: T.danger,  icon: AlertTriangle },
  pagada:        { label: "Pagada",       bg: T.accentBg,       color: T.accent,  icon: CheckCircle },
  condonada:     { label: "Condonada",    bg: `${T.textDim}12`, color: T.textDim, icon: XCircle },
  pagada_parcial:{ label: "Pago parcial", bg: `${T.blue}15`,    color: T.blue,    icon: DollarSign },
};

type Cuota = {
  id: string; mes: number; anio: number;
  monto_base: number; monto_recargo: number; monto_total: number;
  estado: string; fecha_vencimiento: string; fecha_pago?: string | null;
  metodo_pago?: string | null; pagado_por?: string | null;
  recargo_nivel?: number | null; notas?: string | null;
  alumnos?: { nombre: string; apellido: string; dni: string; email?: string | null; telefono?: string | null } | null;
};

type Pago = {
  id: string; monto: number; metodo: string;
  created_at: string; mp_payment_id?: string | null;
};

interface CuotaDetalleProps {
  cuota: Cuota;
  pagos: Pago[];
  accionDefault?: string;
}

export function CuotaDetalle({ cuota, pagos, accionDefault }: CuotaDetalleProps) {
  const router = useRouter();
  const est = ESTADO_CONFIG[cuota.estado] ?? ESTADO_CONFIG.pendiente;
  const EstIcon = est.icon;

  const [accion, setAccion] = useState<"none" | "pagar" | "condonar">(
    accionDefault === "pagar" ? "pagar" : accionDefault === "condonar" ? "condonar" : "none"
  );
  const [metodo, setMetodo] = useState<"efectivo" | "transferencia" | "otro">("efectivo");
  const [pagadoPor, setPagadoPor] = useState(cuota.alumnos ? `${cuota.alumnos.nombre} ${cuota.alumnos.apellido}` : "");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [verificarLoading, setVerificarLoading] = useState(false);
  const [verificarInput, setVerificarInput] = useState("");

  const canPay = cuota.estado === "pendiente" || cuota.estado === "vencida";
  const canCondonar = cuota.estado !== "pagada" && cuota.estado !== "condonada";

  async function handlePagar() {
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/cuotas/${cuota.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "pagar_manual", metodo_pago: metodo, pagado_por: pagadoPor || undefined, notas: notas || null }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    router.refresh();
    setAccion("none");
    setLoading(false);
  }

  async function handleVerificarPago() {
    if (!verificarInput.trim()) return;
    setVerificarLoading(true);
    setError(null);
    const res = await fetch("/api/pagos/verificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuota_id: cuota.id, mp_payment_id: verificarInput.trim() }),
    });
    const data = await res.json();
    setVerificarLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.refresh();
  }

  async function handleGenerarLink() {
    setLinkLoading(true);
    const res = await fetch("/api/pagos/generar-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuota_id: cuota.id }),
    });
    const data = await res.json();
    setLinkLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setLinkUrl(data.url);
    await navigator.clipboard.writeText(data.url).catch(() => {});
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 3000);
  }

  async function handleCondonar() {
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/cuotas/${cuota.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "condonar", notas: notas || null }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    router.refresh();
    setAccion("none");
    setLoading(false);
  }

  const labelStyle: React.CSSProperties = {
    color: T.textMuted, fontFamily: "var(--font-barlow-condensed)",
    fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
  };
  const inp: React.CSSProperties = { background: T.inputBg, border: `1px solid ${T.border}`, color: T.text };

  return (
    <div className="space-y-5">
      {/* Estado badge + periodo */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-sm"
          style={{ fontFamily: "var(--font-barlow-condensed)", background: est.bg, color: est.color, border: `1px solid ${est.color}25` }}>
          <EstIcon className="w-4 h-4" />
          {est.label}
        </span>
        <span className="font-bold uppercase tracking-widest" style={{ fontFamily: "var(--font-barlow-condensed)", color: T.textMuted, fontSize: "0.85rem" }}>
          {MESES[cuota.mes]} {cuota.anio}
        </span>
        {cuota.recargo_nivel && (
          <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase" style={{ background: `${T.danger}12`, color: T.danger, border: `1px solid ${T.danger}25`, fontFamily: "var(--font-barlow-condensed)" }}>
            Recargo nivel {cuota.recargo_nivel}
          </span>
        )}
      </div>

      {/* Info cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Alumno */}
        {cuota.alumnos && (
          <div className="col-span-2 flex items-center gap-3 p-4 rounded-xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}` }}>
              <User className="w-4 h-4" style={{ color: T.accent }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Alumno</p>
              <p className="font-bold" style={{ color: T.text }}>{cuota.alumnos.apellido}, {cuota.alumnos.nombre}</p>
              <p className="text-xs font-mono" style={{ color: T.textMuted }}>DNI {cuota.alumnos.dni}</p>
            </div>
          </div>
        )}

        {/* Monto */}
        <div className="p-4 rounded-xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" style={{ color: T.accent }} />
            <p className="text-xs uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Monto</p>
          </div>
          <p className="text-3xl font-black font-mono" style={{ fontFamily: "var(--font-barlow-condensed)", color: T.text }}>
            ${cuota.monto_total?.toLocaleString("es-AR")}
          </p>
          {cuota.monto_recargo > 0 && (
            <p className="text-xs mt-1" style={{ color: T.textDim }}>
              Base ${cuota.monto_base.toLocaleString("es-AR")} + Recargo ${cuota.monto_recargo.toLocaleString("es-AR")}
            </p>
          )}
        </div>

        {/* Vencimiento */}
        <div className="p-4 rounded-xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4" style={{ color: cuota.estado === "vencida" ? T.danger : T.accent }} />
            <p className="text-xs uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Vencimiento</p>
          </div>
          <p className="text-xl font-bold" style={{ color: cuota.estado === "vencida" ? T.danger : T.text }}>
            {new Date(cuota.fecha_vencimiento).toLocaleDateString("es-AR")}
          </p>
          {cuota.fecha_pago && (
            <p className="text-xs mt-1" style={{ color: T.accent }}>
              Pagado: {new Date(cuota.fecha_pago).toLocaleDateString("es-AR")} via {cuota.metodo_pago}
            </p>
          )}
        </div>

        {cuota.notas && (
          <div className="col-span-2 p-4 rounded-xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Notas</p>
            <p className="text-sm" style={{ color: T.textMuted }}>{cuota.notas}</p>
          </div>
        )}
      </div>

      {/* Acciones */}
      {accion === "none" && (
        <div className="flex gap-3 flex-wrap">
          {canPay && (
            <button onClick={() => setAccion("pagar")}
              className="flex items-center gap-2 h-10 px-5 rounded-lg font-bold uppercase tracking-widest text-sm transition-all hover:opacity-90"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accent, color: T.bgDeep, boxShadow: T.accentGlow }}>
              <CheckCircle className="w-4 h-4" /> Registrar pago
            </button>
          )}
          {canPay && (
            <button onClick={handleGenerarLink} disabled={linkLoading}
              className="flex items-center gap-2 h-10 px-5 rounded-lg font-bold uppercase tracking-widest text-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: T.card, color: T.text, border: `1px solid ${T.border}` }}>
              {linkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : linkCopiado ? <><Check className="w-4 h-4" style={{ color: T.accent }} /> Link copiado</> : <><Link2 className="w-4 h-4" /> Enviar link MP</>}
            </button>
          )}
          {canCondonar && (
            <button onClick={() => setAccion("condonar")}
              className="flex items-center gap-2 h-10 px-5 rounded-lg font-bold uppercase tracking-widest text-sm transition-all hover:opacity-80"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: `${T.danger}12`, color: T.danger, border: `1px solid ${T.danger}25` }}>
              <XCircle className="w-4 h-4" /> Condonar cuota
            </button>
          )}
        </div>
      )}

      {canPay && (
        <div className="flex items-center gap-2">
          <Input
            value={verificarInput}
            onChange={(e) => setVerificarInput(e.target.value)}
            placeholder="ID de pago MP (ej: 161820837213)"
            style={{ ...inp, fontSize: "0.8rem", height: "2.2rem" }}
            className="placeholder:opacity-25 flex-1"
          />
          <button
            onClick={handleVerificarPago}
            disabled={verificarLoading || !verificarInput.trim()}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg font-bold uppercase tracking-widest text-xs transition-all hover:opacity-90 disabled:opacity-40 shrink-0"
            style={{ fontFamily: "var(--font-barlow-condensed)", background: T.card, color: T.textMuted, border: `1px solid ${T.border}` }}>
            {verificarLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Verificar MP
          </button>
        </div>
      )}

      {linkUrl && !linkCopiado && (
        <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}` }}>
          <Link2 className="w-4 h-4 shrink-0" style={{ color: T.accent }} />
          <span className="text-xs font-mono truncate flex-1" style={{ color: T.accent }}>{linkUrl}</span>
          <button onClick={() => { navigator.clipboard.writeText(linkUrl); setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 3000); }}
            className="shrink-0 p-1 rounded hover:opacity-75">
            <Copy className="w-3.5 h-3.5" style={{ color: T.accent }} />
          </button>
        </div>
      )}

      {/* Form pago manual */}
      {accion === "pagar" && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: T.card, border: `1px solid ${T.accentBorder}` }}>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
            — Registrar pago manual
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={labelStyle}>Método de pago</Label>
              <Select value={metodo} onValueChange={(v) => setMetodo(v as typeof metodo)}>
                <SelectTrigger style={inp}><SelectValue /></SelectTrigger>
                <SelectContent style={{ background: T.card, border: `1px solid ${T.border}` }}>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Pagado por</Label>
              <Input value={pagadoPor} onChange={(e) => setPagadoPor(e.target.value)} placeholder="Nombre del pagador" style={inp} className="placeholder:opacity-25" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label style={labelStyle}>Notas</Label>
            <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" style={inp} className="placeholder:opacity-25" />
          </div>
          {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: `${T.danger}12`, color: T.danger, border: `1px solid ${T.danger}25` }}>{error}</p>}
          <div className="flex gap-3">
            <button onClick={handlePagar} disabled={loading}
              className="h-9 px-5 rounded-lg font-bold uppercase tracking-widest text-sm flex items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accent, color: T.bgDeep }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Confirmar pago</>}
            </button>
            <button onClick={() => setAccion("none")} className="h-9 px-4 rounded-lg text-sm hover:opacity-75 transition-all" style={{ color: T.textMuted }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Form condonar */}
      {accion === "condonar" && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: T.card, border: `1px solid ${T.danger}30` }}>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: T.danger, fontFamily: "var(--font-barlow-condensed)" }}>
            — Condonar cuota
          </h3>
          <p className="text-sm" style={{ color: T.textMuted }}>La cuota quedará marcada como condonada y no se cobrará.</p>
          <div className="space-y-1.5">
            <Label style={labelStyle}>Motivo (opcional)</Label>
            <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: Excepción acordada con el alumno" style={inp} className="placeholder:opacity-25" />
          </div>
          {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: `${T.danger}12`, color: T.danger }}>{error}</p>}
          <div className="flex gap-3">
            <button onClick={handleCondonar} disabled={loading}
              className="h-9 px-5 rounded-lg font-bold uppercase tracking-widest text-sm flex items-center gap-2 disabled:opacity-50 hover:opacity-80 transition-all"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: `${T.danger}15`, color: T.danger, border: `1px solid ${T.danger}30` }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Condonar</>}
            </button>
            <button onClick={() => setAccion("none")} className="h-9 px-4 rounded-lg text-sm hover:opacity-75 transition-all" style={{ color: T.textMuted }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Historial de pagos */}
      {pagos.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: T.borderSub }}>
            <h3 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
              — Historial de pagos
            </h3>
          </div>
          {pagos.map((p) => (
            <div key={p.id} className="px-5 py-3 flex items-center justify-between border-b last:border-b-0" style={{ borderColor: T.borderSub }}>
              <div>
                <p className="text-sm font-bold font-mono" style={{ color: T.text }}>${p.monto.toLocaleString("es-AR")}</p>
                <p className="text-xs capitalize" style={{ color: T.textDim }}>{p.metodo} · {new Date(p.created_at).toLocaleDateString("es-AR")}</p>
              </div>
              {p.mp_payment_id && <span className="text-xs font-mono" style={{ color: T.textDim }}>MP #{p.mp_payment_id}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
