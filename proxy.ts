import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SignJWT, jwtVerify } from "jose";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

const ADMIN_COOKIE = "admin_v1";
const ADMIN_TTL_S = 300; // 5 min — matches unstable_cache TTL in lib/admin/auth.ts

function adminSecret() {
  return new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function checkAdminCookie(request: NextRequest, userId: string): Promise<boolean> {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, adminSecret());
    return payload.sub === userId;
  } catch {
    return false;
  }
}

async function setAdminCookie(response: NextResponse, userId: string): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_TTL_S}s`)
    .sign(adminSecret());
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_TTL_S,
    path: "/admin",
  });
}

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/pagar",
  "/api/webhooks/mercadopago",
  "/api/auth",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cron routes: validate header only, no Supabase call
  if (pathname.startsWith("/api/cron/")) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next({ request });
  }

  // API routes and public paths: pass through, they handle their own auth
  if (pathname.startsWith("/api/") || isPublicPath(pathname)) {
    return NextResponse.next({ request });
  }

  // UI routes only: check session via Supabase
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect root
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(user ? "/dashboard" : "/login", request.url)
    );
  }

  // Dashboard routes require session
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Admin routes: solo superadmin. Nunca revelar que /admin existe —
  // un gym que navega ahí es redirigido silenciosamente a /dashboard.
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Cookie cache hit → skip DB round-trip (~100ms saved per navigation).
    // On miss: service-role query to avoid depending on the access token
    // (which could expire between getUser() and this check).
    if (!(await checkAdminCookie(request, user.id))) {
      const { data: adminUser } = await createAdminClient()
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .eq("activo", true)
        .maybeSingle();

      if (!adminUser) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      await setAdminCookie(supabaseResponse, user.id);
    }
  }

  return supabaseResponse;
}

export const proxyMatcher =
  "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)";
