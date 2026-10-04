import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { MessageCircle } from "lucide-react";
import { T } from "@/lib/theme";

export default async function WhatsappPage() {
  const ctx = await requireGymContext();
  const supabase = await createClient();

  // Último mensaje por teléfono — la vista de conversaciones es "una fila por alumno/número".
  const { data: mensajes } = await supabase
    .from("mensajes_whatsapp")
    .select("telefono, cuerpo, direccion, created_at, alumno_id, alumnos(nombre, apellido)")
    .eq("gym_id", ctx.gymId)
    .order("created_at", { ascending: false });

  type Mensaje = NonNullable<typeof mensajes>[number];
  const conversaciones = new Map<string, Mensaje>();
  for (const m of mensajes ?? []) {
    if (!conversaciones.has(m.telefono)) conversaciones.set(m.telefono, m);
  }
  const lista = Array.from(conversaciones.values());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-fredoka)", fontWeight: 900, color: T.text }}>
          WHATSAPP
        </h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>Conversaciones con alumnos</p>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <MessageCircle className="w-8 h-8 mx-auto mb-3" style={{ color: T.textDim }} />
          <p style={{ color: T.textDim }}>Todavía no hay mensajes. Van a aparecer acá apenas un alumno te escriba, o cuando le mandes un aviso.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          {lista.map((m) => {
            const alumno = m.alumnos as unknown as { nombre: string; apellido: string } | null;
            const nombre = alumno ? `${alumno.nombre} ${alumno.apellido}` : m.telefono;
            return (
              <Link
                key={m.telefono}
                href={`/dashboard/whatsapp/${encodeURIComponent(m.telefono)}`}
                className="flex items-center gap-3 px-5 py-4 transition-colors"
                style={{ borderBottom: `1px solid ${T.border}` }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{ background: T.accentBg, color: T.accent }}
                >
                  {nombre.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate" style={{ color: T.text }}>{nombre}</p>
                  <p className="text-sm truncate" style={{ color: T.textDim }}>
                    {m.direccion === "saliente" ? "Vos: " : ""}{m.cuerpo}
                  </p>
                </div>
                <p className="text-xs shrink-0" style={{ color: T.textDim }}>
                  {new Date(m.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
