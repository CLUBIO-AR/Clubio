import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresca el access token si expiró — sin esto los usuarios son redirigidos
  // a login cada hora aunque tengan una sesión válida (el refresh token sigue vigente).
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Excluir archivos estáticos, imágenes y assets para no correr auth en cada recurso
    "/((?!_next/static|_next/image|favicon.ico|apple-icon\\.png|icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
