import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { T } from "@/lib/theme";
import { WhatsappThreadClient } from "@/components/whatsapp/whatsapp-thread-client";
import { marcarConversacionLeidaAction } from "@/app/actions/whatsapp";
import Link from "next/link";
import { UserPlus } from "lucide-react";

export default async function WhatsappThreadPage({
  params,
}: {
  params: Promise<{ telefono: string }>;
}) {
  const { telefono: telefonoParam } = await params;
  const telefono = decodeURIComponent(telefonoParam);

  const ctx = await requireGymContext();
  const supabase = await createClient();

  // En paralelo: traer los mensajes y marcar como leídos los entrantes (idempotente).
  // Antes se hacía uno después del otro y sumaba un viaje a la base a cada apertura.
  const [{ data: mensajes }, { data: alumnoActual }] = await Promise.all([
    supabase
      .from("mensajes_whatsapp")
      .select("id, cuerpo, direccion, estado, created_at, alumnos(nombre, apellido)")
      .eq("gym_id", ctx.gymId)
      .eq("telefono", telefono)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    // Alumno actual con este teléfono (mismo criterio que el webhook: últimos 10 dígitos).
    supabase
      .from("alumnos")
      .select("id, nombre, apellido")
      .eq("gym_id", ctx.gymId)
      .ilike("telefono", `%${telefono.replace(/\D/g, "").slice(-10)}`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    marcarConversacionLeidaAction(telefono),
  ]);

  const alumno = alumnoActual
    ?? (mensajes?.find((m) => m.alumnos)?.alumnos as unknown as { nombre: string; apellido: string } | null);
  const nombre = alumno ? `${alumno.nombre} ${alumno.apellido}` : telefono;
  const esConsulta = !alumno;

  // Meta solo permite texto libre dentro de las 24hs desde el último mensaje del
  // alumno. Si nunca escribió o pasaron más de 24hs, el input queda deshabilitado
  // (ver WhatsappThreadClient) — hay que iniciar con una plantilla aprobada.
  const ultimoEntrante = [...(mensajes ?? [])].reverse().find((m) => m.direccion === "entrante");
  const ventanaAbierta = !!ultimoEntrante
    && new Date().getTime() - new Date(ultimoEntrante.created_at).getTime() < 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-3 flex flex-col h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-fredoka)", color: T.text }}>
            {alumnoActual ? (
              <Link href={`/dashboard/alumnos/${alumnoActual.id}`} className="hover:underline">{nombre}</Link>
            ) : nombre}
          </h1>
          <p className="text-xs" style={{ color: T.textDim }}>
            {telefono}{esConsulta && " · Consulta, no es alumno"}
          </p>
        </div>
        {esConsulta && (
          <Link
            href={`/dashboard/alumnos/nuevo?telefono=${encodeURIComponent(telefono)}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shrink-0 transition-opacity hover:opacity-80"
            style={{ fontFamily: "var(--font-fredoka)", background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }}
          >
            <UserPlus className="w-3.5 h-3.5" /> Dar de alta como alumno
          </Link>
        )}
      </div>

      <WhatsappThreadClient telefono={telefono} mensajesIniciales={mensajes ?? []} ventanaAbierta={ventanaAbierta} />
    </div>
  );
}
