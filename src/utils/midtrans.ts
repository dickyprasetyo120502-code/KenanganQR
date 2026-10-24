/**
 * Midtrans Snap SDK Loader Utility
 * Memastikan script Snap.js termuat dengan aman baik dari index.html maupun dinamis.
 */

export function loadMidtransSnap(
  clientKey: string = import.meta.env.VITE_MIDTRANS_CLIENT_KEY || "",
  isProduction: boolean = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === "true"
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      return resolve(false);
    }

    if (window.snap) {
      return resolve(true);
    }

    const scriptId = "midtrans-snap-script";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.snap) {
        return resolve(true);
      }
      existingScript.addEventListener("load", () => resolve(Boolean(window.snap)), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      // Polling singkat jika script sudah termuat sebelum event listener terpasang
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.snap) {
          clearInterval(interval);
          resolve(true);
        } else if (attempts > 30) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
    if (clientKey) {
      script.setAttribute("data-client-key", clientKey);
    }
    script.async = true;

    script.onload = () => {
      resolve(Boolean(window.snap));
    };

    script.onerror = () => {
      console.warn("Gagal memuat script Midtrans Snap dari:", script.src);
      resolve(false);
    };

    document.head.appendChild(script);
  });
}
