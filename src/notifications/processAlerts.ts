import type { Server } from "node:http";
import type { SlackAlert } from "./slack.js";
import { beginShutdown, notifySlack, notifySlackNow } from "./slack.js";

let httpServer: Server | null = null;
let installed = false;
let stopping = false;
let exited = false;

export function attachHttpServer(server: Server): void {
  httpServer = server;
}

export function notifyInstanceUp(port: number, databaseReady: boolean): void {
  notifySlack({
    title: "Instancia arriba",
    level: "info",
    message: databaseReady
      ? `API escuchando en el puerto ${port}`
      : `API escuchando en el puerto ${port}. MongoDB todavía está reconectando`,
    fields: { puerto: String(port) },
  });
}

async function shutdown(alert: SlackAlert, code: number): Promise<void> {
  if (stopping) return;
  stopping = true;
  beginShutdown();
  await notifySlackNow(alert, 4000);

  const exit = () => {
    if (exited) return;
    exited = true;
    process.exit(code);
  };

  if (!httpServer) {
    exit();
    return;
  }

  httpServer.close(() => exit());
  setTimeout(exit, 1000).unref();
}

function install(): void {
  if (installed) return;
  installed = true;

  // Al apagar o reiniciar la instancia EC2, systemd envía SIGTERM.
  // El POST a Slack tiene que terminar antes de que el proceso salga.
  process.once("SIGTERM", () => {
    void shutdown(
      {
        title: "Instancia bajando",
        level: "error",
        message: "La instancia recibió SIGTERM y se detiene",
        fields: { señal: "SIGTERM" },
      },
      0
    );
  });

  process.once("SIGINT", () => {
    void shutdown(
      {
        title: "Instancia bajando",
        level: "error",
        message: "La instancia recibió SIGINT y se detiene",
        fields: { señal: "SIGINT" },
      },
      0
    );
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
