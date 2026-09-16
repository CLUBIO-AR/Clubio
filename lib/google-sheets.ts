// Cliente mínimo de Google Sheets (solo lectura) autenticado con una service
// account, sin sumar el SDK googleapis — usa jose (ya es dependencia del
// proyecto) para firmar el JWT y pedir el access_token por OAuth2.
// Env vars requeridas: GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY.
import { SignJWT, importPKCS8 } from "jose";

const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  if (!clientEmail || !privateKeyRaw) {
    throw new Error("Faltan GOOGLE_SHEETS_CLIENT_EMAIL / GOOGLE_SHEETS_PRIVATE_KEY");
  }
  // En Vercel los saltos de línea de la private key vienen escapados como \n literal.
  const privateKey = await importPKCS8(privateKeyRaw.replace(/\\n/g, "\n"), "RS256");

  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(clientEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) throw new Error(`Google OAuth error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

// Resuelve el nombre de la pestaña (tab) a partir del gid de la URL —
// values.get requiere el título de la hoja, no el gid.
export async function getSheetTitleByGid(sheetId: string, gid: number): Promise<string> {
  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Google Sheets error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const sheet = (data.sheets ?? []).find((s: { properties: { sheetId: number } }) => s.properties.sheetId === gid);
  if (!sheet) throw new Error(`No se encontró la pestaña con gid=${gid}`);
  return sheet.properties.title as string;
}

// Devuelve las filas del rango como arrays de strings (igual que un CSV parseado).
export async function getSheetValues(sheetId: string, range: string): Promise<string[][]> {
  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Google Sheets error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.values ?? []) as string[][];
}
