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

  const { data: mensajes } = await supabase
    .from("mensajes_whatsapp")
    .select("id, cuerpo, direccion, estado, created_at, alumnos(nombre, apellido)")
    .eq("gym_id", ctx.gymId)
    .eq("telefono", telefono)
    .order("created_at", { ascending: true });

  // Idempotente: marca como leídos los entrantes de esta conversación al abrirla.
  await marcarConversacionLeidaAction(telefono);

  const primerMensaje = mensajes?.[0];
  const alumno = primerMensaje?.alumnos as unknown as { nombre: string; apellido: string } | null;
  const nombre = alumno ? `${alumno.nombre} ${alumno.apellido}` : telefono;

  return (
    <div className="space-y-3 flex flex-col h-full">
      <div>
        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-fredoka)", color: T.text }}>{nombre}</h1>
        <p className="text-xs" style={{ color: T.textDim }}>{telefono}</p>
      </div>

      <WhatsappThreadClient telefono={telefono} mensajesIniciales={mensajes ?? []} />
    </div>
  );
}
