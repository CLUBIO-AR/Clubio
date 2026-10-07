import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { WhatsappSidebarClient, type Conversacion, type Contacto } from "@/components/whatsapp/whatsapp-sidebar-client";
import { T } from "@/lib/theme";
import { redirect } from "next/navigation";
import { whatsappConfigurado } from "@/lib/whatsapp-config";

// Últimos 10 dígitos — alineado con el matching por teléfono usado en el webhook
// y en las server actions de WhatsApp (los alumnos pueden tener el número con o
// sin "+", código de país, espacios, etc.).
function telefonoKey(telefono: string): string {
  return telefono.replace(/\D/g, "").slice(-10);
}

export default async function WhatsappLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireGymContext();
  const supabase = await createClient();

  const { data: waConfig } = await supabase
    .from("gym_config")
    .select("whatsapp_activo, whatsapp_phone_number_id, whatsapp_access_token")
    .eq("gym_id", ctx.gymId)
    .maybeSingle();
  if (!whatsappConfigurado(waConfig)) redirect("/dashboard/configuracion?tab=whatsapp");

  const [{ data: mensajes }, { data: alumnos }] = await Promise.all([
    supabase
      .from("mensajes_whatsapp")
      .select("telefono, cuerpo, direccion, leido, created_at, perfil_nombre, alumnos(nombre, apellido)")
      .eq("gym_id", ctx.gymId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("alumnos")
      .select("id, nombre, apellido, telefono")
      .eq("gym_id", ctx.gymId)
      .is("deleted_at", null)
      .not("telefono", "is", null)
      .order("nombre"),
  ]);

  type Mensaje = NonNullable<typeof mensajes>[number];
  const porTelefono = new Map<string, Mensaje[]>();
  for (const m of mensajes ?? []) {
    const lista = porTelefono.get(m.telefono) ?? [];
    lista.push(m);
    porTelefono.set(m.telefono, lista);
  }

  // Nombre por teléfono contra los alumnos actuales (no solo el alumno_id guardado en el
  // mensaje): así una consulta que después se dio de alta como alumno muestra su nombre.
  const alumnoPorTelefono = new Map<string, { nombre: string; apellido: string }>();
  for (const a of alumnos ?? []) {
    if (a.telefono && !alumnoPorTelefono.has(telefonoKey(a.telefono))) alumnoPorTelefono.set(telefonoKey(a.telefono), a);
  }

  const conversaciones: Conversacion[] = Array.from(porTelefono.entries())
    .map(([telefono, msgs]) => {
      const alumno = alumnoPorTelefono.get(telefonoKey(telefono))
        ?? (msgs.find((m) => m.alumnos)?.alumnos as unknown as { nombre: string; apellido: string } | null);
      return {
        telefono,
        // Sin alumno: el nombre de su perfil de WhatsApp (el más reciente que mandó), si no el número.
        nombre: alumno
          ? `${alumno.nombre} ${alumno.apellido}`
          : (msgs.find((m) => m.perfil_nombre)?.perfil_nombre ?? `+${telefono}`),
        esConsulta: !alumno,
        ultimoMensaje: msgs[0].cuerpo,
        ultimaDireccion: msgs[0].direccion,
        ultimaFecha: msgs[0].created_at,
        noLeidos: msgs.filter((m) => m.direccion === "entrante" && !m.leido).length,
      };
    })
    .sort((a, b) => new Date(b.ultimaFecha).getTime() - new Date(a.ultimaFecha).getTime());

  // Alumnos con teléfono que todavía no tienen ninguna conversación — para poder
  // buscarlos y arrancar el chat desde cero.
  const telefonosConConversacion = new Set(conversaciones.map((c) => telefonoKey(c.telefono)));
  const contactos: Contacto[] = (alumnos ?? [])
    .filter((a) => a.telefono && !telefonosConConversacion.has(telefonoKey(a.telefono)))
    .map((a) => ({ telefono: a.telefono!, nombre: `${a.nombre} ${a.apellido}` }));

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-fredoka)", fontWeight: 900, color: T.text }}>
          WHATSAPP
        </h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>Conversaciones con alumnos</p>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <WhatsappSidebarClient conversaciones={conversaciones} contactos={contactos} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
