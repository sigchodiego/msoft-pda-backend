import { afterEach, describe, expect, it } from "@jest/globals";
import {
  formatSlackText,
  notifySlackNow,
  redact,
  regionFromAvailabilityZone,
  resetRuntimeIdentity,
  setRuntimeIdentity,
} from "./slack.js";

describe("alertas de Slack", () => {
  const previousWebhook = process.env.SLACK_WEBHOOK_URL;

  afterEach(() => {
    resetRuntimeIdentity();
    if (previousWebhook === undefined) delete process.env.SLACK_WEBHOOK_URL;
    else process.env.SLACK_WEBHOOK_URL = previousWebhook;
  });

  it("identifica la instancia EC2 y oculta credenciales", () => {
    setRuntimeIdentity({
      instanceId: "i-0abc123",
      name: "msoft-pda-api",
      zone: "us-east-1a",
      region: "us-east-1",
    });

    const text = formatSlackText({
      title: "Instancia bajando",
      level: "error",
      message: "falló mongodb+srv://user:secret@cluster.mongodb.net/usuarios_db",
      fields: { señal: "SIGTERM" },
    });

    expect(text).toContain("[ERROR] Instancia bajando");
    expect(text).toContain("entorno: AWS EC2");
    expect(text).toContain("nombre: msoft-pda-api");
    expect(text).toContain("instancia: i-0abc123");
    expect(text).toContain("zona: us-east-1a");
    expect(text).toContain("región: us-east-1");
    expect(text).toContain("señal: SIGTERM");
    expect(text).toContain("mongodb://***");
    expect(text).not.toContain("user:secret");
    expect(text).not.toContain("Azure");
  });

  it("marca el proceso cuando corre bajo PM2", () => {
    const previousId = process.env.pm_id;
    const previousName = process.env.name;
    process.env.pm_id = "0";
    process.env.name = "msoft-pda-api";

    try {
      const text = formatSlackText({
        title: "API detenida por PM2",
        level: "error",
        message: "PM2 envió SIGINT para detener el proceso",
      });

      expect(text).toContain("gestor: PM2");
      expect(text).toContain("proceso: msoft-pda-api");
      expect(text).toContain("pm_id: 0");
    } finally {
      if (previousId === undefined) delete process.env.pm_id;
      else process.env.pm_id = previousId;
      if (previousName === undefined) delete process.env.name;
      else process.env.name = previousName;
    }
  });

  it("fuera de EC2 usa el host local", () => {
    const text = formatSlackText({
      title: "Instancia arriba",
      level: "info",
      message: "API en local",
    });

    expect(text).toContain("entorno: servidor");
    expect(text).not.toContain("AWS EC2");
  });

  it("obtiene la región desde la zona de disponibilidad", () => {
    expect(regionFromAvailabilityZone("us-east-1a")).toBe("us-east-1");
  });

  it("redacta tokens Bearer", () => {
    expect(redact("Authorization Bearer aaa.bbb.ccc")).toBe(
      "Authorization Bearer ***"
    );
  });

  it("no intenta enviar si no hay webhook", async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    await expect(
      notifySlackNow({
        title: "Instancia arriba",
        level: "info",
        message: "sin canal",
      })
    ).resolves.toBeUndefined();
  });
});
