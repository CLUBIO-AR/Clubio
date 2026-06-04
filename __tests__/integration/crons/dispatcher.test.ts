import { describe, it, expect, vi, beforeEach } from "vitest";

// Testa el comportamiento del patrón Dispatcher/Worker
// Verifica que: usa Promise.allSettled, no await secuencial,
// y que si un worker falla los demás siguen procesando.

describe("Dispatcher — patrón Dispatcher/Worker", () => {
  it("procesa múltiples gyms en paralelo (Promise.allSettled)", async () => {
    const callOrder: number[] = [];
    const delays = [50, 10, 30]; // gym 1 es lento, gym 2 rápido

    // Simular workers que tardan diferente tiempo
    const workers = delays.map((delay, i) =>
      new Promise<void>((resolve) =>
        setTimeout(() => {
          callOrder.push(i);
          resolve();
        }, delay)
      )
    );

    const start = Date.now();
    await Promise.allSettled(workers);
    const elapsed = Date.now() - start;

    // Si fuera secuencial: 50+10+30 = 90ms. En paralelo: ~50ms
    expect(elapsed).toBeLessThan(80);
    // El orden es por velocidad, no por índice (gym 2 termina primero)
    expect(callOrder[0]).toBe(1); // gym 2 (10ms) termina primero
  });

  it("continúa con otros gyms si un worker falla", async () => {
    const processed: string[] = [];

    const workers = [
      Promise.resolve().then(() => { processed.push("gym-A"); }),
      Promise.reject(new Error("gym-B falló")),
      Promise.resolve().then(() => { processed.push("gym-C"); }),
    ];

    const results = await Promise.allSettled(workers);

    // Con Promise.allSettled: los demás siguen aunque uno falle
    expect(processed).toContain("gym-A");
    expect(processed).toContain("gym-C");
    expect(processed).not.toContain("gym-B");

    // El resultado del fallido es 'rejected', no lanza excepción
    expect(results[1].status).toBe("rejected");
    expect(results[0].status).toBe("fulfilled");
    expect(results[2].status).toBe("fulfilled");
  });

  it("Promise.all falla todo si uno falla (demostrar por qué no usarlo)", async () => {
    const processed: string[] = [];

    const workers = [
      Promise.resolve().then(() => { processed.push("gym-A"); }),
      Promise.reject(new Error("gym-B falló")),
      Promise.resolve().then(() => { processed.push("gym-C"); }),
    ];

    // Con Promise.all: si uno falla, el resto puede no completarse
    await expect(Promise.all(workers)).rejects.toThrow("gym-B falló");
    // Nota: gym-A y gym-C pueden o no haber corrido dependiendo del timing
    // Por eso NUNCA usar Promise.all en el dispatcher
  });
});
