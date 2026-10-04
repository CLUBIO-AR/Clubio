import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { WhatsappSidebarClient, type Conversacion } from "@/components/whatsapp/whatsapp-sidebar-client";
import { T } from "@/lib/theme";

export default async function WhatsappLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireGymContext();
  const supabase = await createClient();

  const { data: mensajes } = await supabase
    .from("mensajes_whatsapp")
    .select("telefono, cuerpo, direccion, leido, created_at, alumnos(nombre, apellido)")
    .eq("gym_id", ctx.gymId)
    .order("created_at", { ascending: false });

  type Mensaje = NonNullable<typeof mensajes>[number];
  const porTelefono = new Map<string, Mensaje[]>();
  for (const m of mensajes ?? []) {
    const lista = porTelefono.get(m.telefono) ?? [];
    lista.push(m);
    porTelefono.set(m.telefono, lista);
  }

  const conversaciones: Conversacion[] = Array.from(porTelefono.entries())
    .map(([telefono, msgs]) => {
      const alumno = msgs[0].alumnos as unknown as { nombre: string; apellido: string } | null;
      return {
        telefono,
        nombre: alumno ? `${alumno.nombre} ${alumno.apellido}` : telefono,
        ultimoMensaje: msgs[0].cuerpo,
        ultimaDireccion: msgs[0].direccion,
        ultimaFecha: msgs[0].created_at,
        noLeidos: msgs.filter((m) => m.direccion === "entrante" && !m.leido).length,
      };
    })
    .sort((a, b) => new Date(b.ultimaFecha).getTime() - new Date(a.ultimaFecha).getTime());

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-fredoka)", fontWeight: 900, color: T.text }}>
          WHATSAPP
        </h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>Conversaciones con alumnos</p>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <WhatsappSidebarClient conversaciones={conversaciones} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
