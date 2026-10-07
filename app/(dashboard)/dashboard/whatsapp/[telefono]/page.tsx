import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { T } from "@/lib/theme";
import { WhatsappThreadClient } from "@/components/whatsapp/whatsapp-thread-client";
import { marcarConversacionLeidaAction } from "@/app/actions/whatsapp";

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
  const [{ data: mensajes }] = await Promise.all([
    supabase
      .from("mensajes_whatsapp")
      .select("id, cuerpo, direccion, estado, created_at, alumnos(nombre, apellido)")
      .eq("gym_id", ctx.gymId)
      .eq("telefono", telefono)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    marcarConversacionLeidaAction(telefono),
  ]);

  const primerMensaje = mensajes?.[0];
  const alumno = primerMensaje?.alumnos as unknown as { nombre: string; apellido: string } | null;
  const nombre = alumno ? `${alumno.nombre} ${alumno.apellido}` : telefono;

  // Meta solo permite texto libre dentro de las 24hs desde el último mensaje del
  // alumno. Si nunca escribió o pasaron más de 24hs, el input queda deshabilitado
  // (ver WhatsappThreadClient) — hay que iniciar con una plantilla aprobada.
  const ultimoEntrante = [...(mensajes ?? [])].reverse().find((m) => m.direccion === "entrante");
  const ventanaAbierta = !!ultimoEntrante
    && new Date().getTime() - new Date(ultimoEntrante.created_at).getTime() < 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-3 flex flex-col h-full">
      <div>
        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-fredoka)", color: T.text }}>{nombre}</h1>
        <p className="text-xs" style={{ color: T.textDim }}>{telefono}</p>
      </div>

      <WhatsappThreadClient telefono={telefono} mensajesIniciales={mensajes ?? []} ventanaAbierta={ventanaAbierta} />
    </div>
  );
}
