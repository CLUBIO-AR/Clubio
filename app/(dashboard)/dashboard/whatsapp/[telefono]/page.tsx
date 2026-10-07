import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { T } from "@/lib/theme";
import { WhatsappThreadClient } from "@/components/whatsapp/whatsapp-thread-client";
import { marcarConversacionLeidaAction } from "@/app/actions/whatsapp";
import Link from "next/link";
import { UserPlus, ChevronLeft } from "lucide-react";

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
      .select("id, cuerpo, direccion, estado, created_at, perfil_nombre, alumnos(nombre, apellido)")
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
  const perfilNombre = [...(mensajes ?? [])].reverse().find((m) => m.perfil_nombre)?.perfil_nombre ?? null;
  const nombre = alumno ? `${alumno.nombre} ${alumno.apellido}` : (perfilNombre ?? `+${telefono}`);
  const esConsulta = !alumno;

  // Meta solo permite texto libre dentro de las 24hs desde el último mensaje del
  // alumno. Si nunca escribió o pasaron más de 24hs, el input queda deshabilitado
  // (ver WhatsappThreadClient) — hay que iniciar con una plantilla aprobada.
  const ultimoEntrante = [...(mensajes ?? [])].reverse().find((m) => m.direccion === "entrante");
  const ventanaAbierta = !!ultimoEntrante
    && new Date().getTime() - new Date(ultimoEntrante.created_at).getTime() < 24 * 60 * 60 * 1000;

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex items-start justify-between gap-2 md:gap-3">
        {/* Volver a la lista (en el celular la lista no se ve mientras estás en un chat) */}
        <Link href="/dashboard/whatsapp" aria-label="Volver a las conversaciones" className="md:hidden -ml-1 p-1 rounded-lg shrink-0" style={{ color: T.textDim }}>
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-xl font-bold truncate" style={{ fontFamily: "var(--font-fredoka)", color: T.text }}>
            {alumnoActual ? (
              <Link href={`/dashboard/alumnos/${alumnoActual.id}`} className="hover:underline">{nombre}</Link>
            ) : nombre}
          </h1>
          <p className="text-xs truncate md:whitespace-normal" style={{ color: T.textDim }}>
            +{telefono}
            {esConsulta && " · Consulta, no es alumno"}
            {esConsulta && perfilNombre && " · el nombre es el de su perfil de WhatsApp"}
          </p>
        </div>
        {esConsulta && (
          <Link
            href={`/dashboard/alumnos/nuevo?telefono=${encodeURIComponent(telefono)}${perfilNombre ? `&nombre=${encodeURIComponent(perfilNombre)}` : ""}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shrink-0 transition-opacity hover:opacity-80"
            style={{ fontFamily: "var(--font-fredoka)", background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }}
          >
            <UserPlus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Dar de alta como alumno</span><span className="sm:hidden">Alta</span>
          </Link>
        )}
      </div>

      <WhatsappThreadClient telefono={telefono} mensajesIniciales={mensajes ?? []} ventanaAbierta={ventanaAbierta} />
    </div>
  );
}
