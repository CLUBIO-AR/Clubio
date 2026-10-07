import { requireGymContext } from "@/lib/supabase/auth";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { createClient } from "@/lib/supabase/server";
import { whatsappConfigurado } from "@/lib/whatsapp-config";
import { WhatsappRealtimeProvider, type NotificacionWhatsapp } from "@/components/whatsapp/whatsapp-realtime";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireGymContext();
  const supabase = await createClient();
  const { data: waConfig } = await supabase
    .from("gym_config")
    .select("whatsapp_activo, whatsapp_phone_number_id, whatsapp_access_token")
    .eq("gym_id", ctx.gymId)
    .maybeSingle();
  const mostrarWhatsapp = whatsappConfigurado(waConfig);

  const contenido = (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav
        gymNombre={ctx.gymNombre}
        usuarioNombre={ctx.nombre}
        usuarioRol={ctx.rol}
        mostrarWhatsapp={mostrarWhatsapp}
      />
      <main className="flex-1 overflow-y-auto bg-background pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</div>
      </main>
    </div>
  );

  if (!mostrarWhatsapp) return contenido;

  // Mensajes de WhatsApp sin leer para la campanita; a partir de acá los mantiene
  // al día el provider con Supabase Realtime.
  const [{ data: noLeidos }, { data: alumnos }] = await Promise.all([
    supabase
      .from("mensajes_whatsapp")
      .select("id, telefono, cuerpo, created_at, perfil_nombre")
      .eq("gym_id", ctx.gymId)
      .eq("direccion", "entrante")
      .eq("leido", false)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("alumnos")
      .select("nombre, apellido, telefono")
      .eq("gym_id", ctx.gymId)
      .is("deleted_at", null)
      .not("telefono", "is", null),
  ]);

  const nombrePorTelefono = new Map<string, string>();
  for (const a of alumnos ?? []) {
    const key = a.telefono!.replace(/\D/g, "").slice(-10);
    if (!nombrePorTelefono.has(key)) nombrePorTelefono.set(key, `${a.nombre} ${a.apellido}`);
  }
  const noLeidosIniciales: NotificacionWhatsapp[] = (noLeidos ?? []).map((m) => ({
    id: m.id,
    telefono: m.telefono,
    nombre: nombrePorTelefono.get(m.telefono.replace(/\D/g, "").slice(-10)) ?? m.perfil_nombre ?? `+${m.telefono}`,
    cuerpo: m.cuerpo,
    created_at: m.created_at,
  }));

  return (
    <WhatsappRealtimeProvider gymId={ctx.gymId} noLeidosIniciales={noLeidosIniciales}>
      {contenido}
    </WhatsappRealtimeProvider>
  );
}
