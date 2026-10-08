// Da de alta en Meta las plantillas de whatsapp/templates/*.json.
// Uso: WABA_ID=… WHATSAPP_ACCESS_TOKEN=… node scripts/whatsapp-alta-plantillas.mjs [--dry-run] [nombre…]
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const GRAPH_VERSION = "v21.0";
const dir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "whatsapp", "templates");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const filtro = args.filter((a) => !a.startsWith("--"));

const { WABA_ID, WHATSAPP_ACCESS_TOKEN } = process.env;
if (!dryRun && (!WABA_ID || !WHATSAPP_ACCESS_TOKEN)) {
  console.error("Faltan WABA_ID y/o WHATSAPP_ACCESS_TOKEN (o usá --dry-run).");
  process.exit(1);
}

const archivos = (await readdir(dir)).filter((f) => f.endsWith(".json"));
let errores = 0;
for (const archivo of archivos) {
  const plantilla = JSON.parse(await readFile(path.join(dir, archivo), "utf8"));
  if (filtro.length && !filtro.includes(plantilla.name)) continue;
  if (dryRun) {
    console.log(`[dry-run] ${plantilla.name} (${plantilla.category}, ${plantilla.language})`);
    continue;
  }
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${WABA_ID}/message_templates`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(plantilla),
  });
  const data = await res.json();
  if (res.ok) {
    console.log(`✅ ${plantilla.name}: ${data.status ?? "enviada"} (id ${data.id})`);
  } else if (data?.error?.error_subcode === 2388024) {
    console.log(`↩️  ${plantilla.name}: ya existe`);
  } else {
    errores++;
    console.error(`❌ ${plantilla.name}: ${data?.error?.error_user_msg ?? data?.error?.message ?? res.statusText}`);
  }
}
process.exit(errores ? 1 : 0);
