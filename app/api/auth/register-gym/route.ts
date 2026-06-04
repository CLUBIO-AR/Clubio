import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const RegisterSchema = z.object({
  nombre: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  email_contacto: z.string().email(),
  password: z.string().min(8),
  nombre_admin: z.string().min(2),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = RegisterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { nombre, slug, email_contacto, password, nombre_admin } = parsed.data;
  const supabase = createAdminClient();

  // Verificar slug único
  const { data: existing } = await supabase
    .from("gyms")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Ese slug ya está en uso, elegí otro" },
      { status: 409 }
    );
  }

  // Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email_contacto,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Error al crear usuario" },
      { status: 500 }
    );
  }

  // Crear gym
  const { data: gym, error: gymError } = await supabase
    .from("gyms")
    .insert({ nombre, slug, email_contacto })
    .select("id")
    .single();

  if (gymError || !gym) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: "Error al crear el gimnasio" },
      { status: 500 }
    );
  }

  // Crear perfil del usuario owner
  const { error: userError } = await supabase
    .from("gym_usuarios")
    .insert({ id: authData.user.id, gym_id: gym.id, nombre: nombre_admin, rol: "owner" });

  if (userError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    await supabase.from("gyms").delete().eq("id", gym.id);
    return NextResponse.json(
      { error: "Error al configurar el perfil" },
      { status: 500 }
    );
  }

  // Crear gym_config con defaults (email_activo: true por defecto)
  await supabase.from("gym_config").insert({
    gym_id: gym.id,
    email_activo: true,
    whatsapp_activo: false,
  });

  // Crear licencia basic con 30 días de trial (NO setup fee)
  const fechaInicio = new Date().toISOString().split("T")[0];
  const fechaVencimiento = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  await supabase.from("licencias").insert({
    gym_id: gym.id,
    plan: "basic",
    fecha_inicio: fechaInicio,
    fecha_vencimiento: fechaVencimiento,
    es_trial: true,
    trial_hasta: fechaVencimiento,
  });

  // Crear sucursal principal
  await supabase.from("sucursales").insert({
    gym_id: gym.id,
    nombre: "Principal",
    es_principal: true,
  });

  return NextResponse.json({ ok: true, gym_id: gym.id }, { status: 201 });
}
