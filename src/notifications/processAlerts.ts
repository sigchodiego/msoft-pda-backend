import { execFile } from "node:child_process";
import fs from "node:fs";
import type { Server } from "node:http";
import type { SlackAlert } from "./slack.js";
import { beginShutdown, isUnderPm2, notifySlack, notifySlackNow } from "./slack.js";

let httpServer: Server | null = null;
let installed = false;
let stopping = false;
let exited = false;

export function attachHttpServer(server: Server): void {
  httpServer = server;
}

export function notifyInstanceUp(port: number, databaseReady: boolean): void {
  const underPm2 = isUnderPm2();
  const listening = underPm2
    ? `API en PM2 escuchando en el puerto ${port}`
    : `API escuchando en el puerto ${port}`;
  notifySlack({
    title: underPm2 ? "API arriba en PM2" : "Instancia arriba",
    level: "info",
    message: databaseReady
      ? listening
      : `${listening}. MongoDB todavía está reconectando`,
    fields: { puerto: String(port) },
  });
}

async function shutdown(
  alert: SlackAlert,
  code: number,
  options?: { timeoutMs: number; exitNow: boolean }
): Promise<void> {
  if (stopping) return;
  stopping = true;
  beginShutdown();
  await notifySlackNow(alert, options?.timeoutMs ?? 4000);

  const exit = () => {
    if (exited) return;
    exited = true;
    process.exit(code);
  };

  if (options?.exitNow || !httpServer) {
    exit();
    return;
  }

  httpServer.close(() => exit());
  setTimeout(exit, 1000).unref();
}

function hostIsStopping(): Promise<boolean> {
  try {
    if (fs.existsSync("/run/systemd/shutdown/scheduled")) {
      return Promise.resolve(true);
    }
  } catch {
    // El proceso no puede leer el estado de apagado del sistema.
  }

  return new Promise((resolve) => {
    execFile(
      "systemctl",
      ["is-system-running"],
      { timeout: 1000 },
      (_error, stdout) => {
        const state = stdout.trim();
        resolve(state === "stopping" || state === "offline");
      }
    );
  });
}

function install(): void {
  if (installed) return;
  installed = true;

  // Un stop de la instancia EC2 apaga el sistema y deja ese archivo.
  // Un restart del servicio no lo deja, así que no se confunde con un deploy.
  process.once("SIGTERM", () => {
    void (async () => {
      const instanceDown = await hostIsStopping();
      await shutdown(
        {
          title: instanceDown ? "Instancia EC2 bajando" : "API detenida",
          level: "error",
          message: instanceDown
            ? "La instancia EC2 se está apagando"
            : "El proceso del API recibió SIGTERM",
          fields: { señal: "SIGTERM" },
        },
        0
      );
    })();
  });

  // pm2 stop envía SIGINT y, si el proceso sigue vivo, SIGKILL a los 1600 ms.
  process.once("SIGINT", () => {
    const underPm2 = isUnderPm2();
    const alert: SlackAlert = underPm2
      ? {
          title: "API detenida por PM2",
          level: "error",
          message: "PM2 envió SIGINT para detener el proceso",
          fields: { señal: "SIGINT" },
        }
      : {
          title: "API detenida",
          level: "error",
          message: "El proceso del API recibió SIGINT",
          fields: { señal: "SIGINT" },
        };
    if (underPm2) {
      void shutdown(alert, 0, { timeoutMs: 1200, exitNow: true });
      return;
    }
    void shutdown(alert, 0);
  });

  process.on("uncaughtException", (err: Error) => {
    void shutdown(
      {
        title: "Instancia caída",
        level: "error",
        message: err.message || "Excepción no controlada",
        fields: { tipo: "uncaughtException" },
      },
      1
    );
  });

  process.on("unhandledRejection", (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    void shutdown(
      {
        title: "Instancia caída",
        level: "error",
        message,
        fields: { tipo: "unhandledRejection" },
      },
      1
    );
  });
}

install();
