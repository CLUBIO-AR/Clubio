import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { T } from "@/lib/theme";
import { WhatsappThreadClient } from "@/components/whatsapp/whatsapp-thread-client";

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

  const primerMensaje = mensajes?.[0];
  const alumno = primerMensaje?.alumnos as unknown as { nombre: string; apellido: string } | null;
  const nombre = alumno ? `${alumno.nombre} ${alumno.apellido}` : telefono;

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/whatsapp" style={{ color: T.textDim }}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-fredoka)", color: T.text }}>{nombre}</h1>
          <p className="text-xs" style={{ color: T.textDim }}>{telefono}</p>
        </div>
      </div>

      <WhatsappThreadClient telefono={telefono} mensajesIniciales={mensajes ?? []} />
    </div>
  );
}
