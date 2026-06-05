import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Endpoint de diagnóstico — NO expone datos sensibles.
// Eliminarlo antes de producción final.
export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  const supabaseCookies = allCookies
    .filter((c) => c.name.includes("supabase") || c.name.includes("sb-"))
    .map((c) => ({ name: c.name, length: c.value.length }));

  let userId: string | null = null;
  let authError: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    userId = data.user ? data.user.id.slice(0, 8) + "..." : null;
    authError = error?.message ?? null;
  } catch (e) {
    authError = String(e);
  }

  return NextResponse.json({
    total_cookies: allCookies.length,
    supabase_cookies: supabaseCookies,
    user_found: !!userId,
    user_id_prefix: userId,
    auth_error: authError,
  });
}
