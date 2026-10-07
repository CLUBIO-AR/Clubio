"use client";

// Sonido y notificaciones push del dispositivo actual (celular o compu) para los mensajes
// nuevos de WhatsApp. El push llega aunque el navegador esté cerrado: lo recibe el service
// worker (public/sw.js) y lo manda el servidor (lib/push.ts) desde el webhook.
import { useCallback, useEffect, useRef, useState } from "react";

export type EstadoPush =
  | "cargando"
  | "no-soportado"   // navegador sin service workers / push
  | "instalar-ios"   // iPhone: solo funciona con CLUBIO agregado a la pantalla de inicio
  | "no-configurado" // falta la clave VAPID en el servidor
  | "bloqueado"      // el usuario bloqueó las notificaciones del sitio
  | "inactivo"
  | "activo";

const CLAVE_SONIDO = "clubio-wa-sonido";
const VAPID_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function base64UrlABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function esIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function instaladaComoApp(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function useAvisosDispositivo() {
  // Preferencia guardada en este navegador (solo se lee en el cliente; en el server queda prendido).
  const [sonido, setSonidoState] = useState(() => {
    try { return typeof window === "undefined" || localStorage.getItem(CLAVE_SONIDO) !== "off"; } catch { return true; }
  });
  const [push, setPush] = useState<EstadoPush>("cargando");
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setPush(esIOS() && !instaladaComoApp() ? "instalar-ios" : "no-soportado");
        return;
      }
      if (!VAPID_PUBLICA) { setPush("no-configurado"); return; }
      if (Notification.permission === "denied") { setPush("bloqueado"); return; }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        setPush(sub && Notification.permission === "granted" ? "activo" : "inactivo");
      } catch {
        setPush("no-soportado");
      }
    })();
  }, []);

  // El navegador solo deja reproducir audio después de que el usuario tocó la página una
  // vez: se crea el AudioContext en el primer click/tecla para que el sonido ya esté listo.
  useEffect(() => {
    const preparar = () => {
      if (!audioRef.current) {
        try { audioRef.current = new AudioContext(); } catch { /* sin audio */ }
      }
      void audioRef.current?.resume();
    };
    window.addEventListener("pointerdown", preparar, { once: true });
    window.addEventListener("keydown", preparar, { once: true });
    return () => {
      window.removeEventListener("pointerdown", preparar);
      window.removeEventListener("keydown", preparar);
    };
  }, []);

  /** "Ding-dong" corto generado con Web Audio (no hace falta archivo de sonido). */
  const sonar = useCallback(() => {
    if (!sonido) return;
    const ctx = audioRef.current;
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime;
    for (const [i, frecuencia] of [880, 1320].entries()) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frecuencia;
      const inicio = t + i * 0.14;
      gain.gain.setValueAtTime(0.0001, inicio);
      gain.gain.exponentialRampToValueAtTime(0.25, inicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(inicio);
      osc.stop(inicio + 0.4);
    }
  }, [sonido]);

  const setSonido = useCallback((on: boolean) => {
    setSonidoState(on);
    try { localStorage.setItem(CLAVE_SONIDO, on ? "on" : "off"); } catch { /* sin storage */ }
    if (on) {
      try { audioRef.current ??= new AudioContext(); void audioRef.current.resume(); } catch { /* sin audio */ }
    }
  }, []);

  const activarPush = useCallback(async () => {
    if (!VAPID_PUBLICA) return;
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") { setPush(permiso === "denied" ? "bloqueado" : "inactivo"); return; }
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription())
      ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlABytes(VAPID_PUBLICA) });
    const res = await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    setPush(res.ok ? "activo" : "inactivo");
  }, []);

  const desactivarPush = useCallback(async () => {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setPush("inactivo");
  }, []);

  return { sonido, setSonido, sonar, push, activarPush, desactivarPush };
}
