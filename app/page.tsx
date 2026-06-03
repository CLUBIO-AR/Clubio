import { redirect } from "next/navigation";

// El middleware redirige `/` a /dashboard o /login según sesión.
// Este componente es fallback por si el middleware no actúa.
export default function RootPage() {
  redirect("/dashboard");
}
