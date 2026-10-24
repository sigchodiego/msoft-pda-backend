import os from "node:os";

export type SlackLevel = "error" | "warn" | "info";

export type SlackAlert = {
  title: string;
  level: SlackLevel;
  message: string;
  fields?: Record<string, string>;
};

const LABELS: Record<string, string> = {
  entorno: "entorno",
  nombre: "nombre",
  instancia: "instancia",
  host: "host",
  pid: "pid",
  zona: "zona",
  region: "región",
  estado: "estado",
  ruta: "ruta",
  detalle: "detalle",
  señal: "señal",
  puerto: "puerto",
  tipo: "tipo",
};

const METADATA_BASE = "http://169.254.169.254/latest";

type AwsIdentity = {
  instanceId: string;
  name?: string;
  zone?: string;
  region?: string;
};

let closing = false;
let missingWarned = false;
let aws: AwsIdentity | null = null;

export function beginShutdown(): void {
  closing = true;
}

export function resetRuntimeIdentity(): void {
  aws = null;
}

export function setRuntimeIdentity(identity: AwsIdentity): void {
  aws = identity;
}

export function regionFromAvailabilityZone(zone: string): string | undefined {
  const match = /^([a-z]{2}-[a-z]+-\d)[a-z]$/.exec(zone);
  return match?.[1];
}

async function readMetadata(
  path: string,
  token: string
): Promise<string | undefined> {
  const response = await fetch(`${METADATA_BASE}/meta-data/${path}`, {
    headers: { "X-aws-ec2-metadata-token": token },
    signal: AbortSignal.timeout(800),
  });
  if (!response.ok) return undefined;
  const text = (await response.text()).trim();
  return text || undefined;
}

export async function loadAwsIdentity(): Promise<void> {
  if (aws) return;

  try {
    const tokenResponse = await fetch(`${METADATA_BASE}/api/token`, {
      method: "PUT",
      headers: { "X-aws-ec2-metadata-token-ttl-seconds": "60" },
      signal: AbortSignal.timeout(800),
    });
    if (!tokenResponse.ok) return;

    const token = (await tokenResponse.text()).trim();
    if (!token) return;

    const instanceId = await readMetadata("instance-id", token);
    if (!instanceId) return;

    const zone = await readMetadata("placement/availability-zone", token);
    const name = await readMetadata("tags/instance/Name", token);
    const region = zone ? regionFromAvailabilityZone(zone) : undefined;

    aws = {
      instanceId,
      ...(name ? { name } : {}),
      ...(zone ? { zone } : {}),
      ...(region ? { region } : {}),
    };
  } catch {
    aws = null;
  }
}

export function runtimeFields(): Record<string, string> {
  const fields: Record<string, string> = {
    pid: String(process.pid),
    host: os.hostname(),
  };

  if (aws) {
    fields.entorno = "AWS EC2";
    fields.instancia = aws.instanceId;
    if (aws.name) fields.nombre = aws.name;
    if (aws.zone) fields.zona = aws.zone;
    if (aws.region) fields.region = aws.region;
    return fields;
  }

  fields.entorno = "servidor";
  fields.instancia = os.hostname();
  return fields;
}

export function redact(text: string): string {
  return text
    .replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "mongodb://***")
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer ***");
}

export function formatSlackText(alert: SlackAlert): string {
  const level =
    alert.level === "error" ? "ERROR" : alert.level === "warn" ? "AVISO" : "INFO";
  const fields = { ...runtimeFields(), ...alert.fields };
  const lines = [`*[${level}] ${redact(alert.title)}*`, redact(alert.message), ""];

  for (const [key, value] of Object.entries(fields)) {
    if (!value) continue;
    lines.push(`${LABELS[key] ?? key}: ${redact(value)}`);
  }

  return lines.join("\n").slice(0, 3000);
}

function webhookUrl(): string | null {
  const url = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!url) {
    if (!missingWarned) {
      missingWarned = true;
      console.warn(
        "[Slack] SLACK_WEBHOOK_URL no está definida; las alertas no se envían"
      );
    }
    return null;
  }
  return url;
}

async function postSlack(alert: SlackAlert, timeoutMs: number): Promise<void> {
  const url = webhookUrl();
  if (!url) return;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: formatSlackText(alert) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      console.error(`[Slack] respondió ${response.status}`);
    }
  } catch (err) {
    console.error(
      "[Slack] no se pudo enviar la alerta:",
      err instanceof Error ? err.message : err
    );
  }
}

export function notifySlack(alert: SlackAlert): void {
  if (closing) return;
  void postSlack(alert, 4000);
}

export async function notifySlackNow(
  alert: SlackAlert,
  timeoutMs = 4000
): Promise<void> {
  await postSlack(alert, timeoutMs);
}
