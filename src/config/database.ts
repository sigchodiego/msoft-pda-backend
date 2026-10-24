import "./load-env.js";
import mongoose from "mongoose";

const DB_NAME = "usuarios_db";

function resolveMongoUri(): string {
  const username = process.env.MONGODB_USERNAME?.trim();
  const password = process.env.MONGODB_PASSWORD?.trim();
  const raw = process.env.MONGODB_URI?.trim();

  if (!username || !password || !raw) {
    throw new Error(
      "Faltan MONGODB_USERNAME, MONGODB_PASSWORD o MONGODB_URI en atlas-credentials.env"
    );
  }

  const withoutCreds = raw.replace(
    /^(mongodb(?:\+srv)?:\/\/)([^@/]+@)?/i,
    "$1"
  );
  const [base, query] = withoutCreds.split("?");
  const withoutSlash = base.replace(/\/$/, "");
  const hasDb = /mongodb(\+srv)?:\/\/[^/]+\/.+/.test(withoutSlash);
  const withDb = hasDb ? withoutSlash : `${withoutSlash}/${DB_NAME}`;
  const withAuth = withDb.replace(
    /^(mongodb(?:\+srv)?:\/\/)/i,
    `$1${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
  );

  return query ? `${withAuth}?${query}` : withAuth;
}

const MONGO_URI = resolveMongoUri();

const connectOptions = {
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 8000,
  maxPoolSize: 25,
} as const;

let listenersBound = false;
let retrying = false;

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}

function bindConnectionListeners(): void {
  if (listenersBound) return;
  listenersBound = true;

  mongoose.connection.on("connected", () => {
    console.log("🔄 [Database]: Conexión exitosa a MongoDB");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("🔄 [Database]: Reconectado a MongoDB");
  });

  mongoose.connection.on("disconnected", () => {
    console.warn(
      "⚠️ [Database]: MongoDB desconectado (el API sigue vivo; reintentando...)"
    );
    void scheduleReconnect();
  });

  mongoose.connection.on("error", (err) => {
    console.error("❌ [Database]: Error de conexión:", err.message);
  });
}

async function scheduleReconnect(): Promise<void> {
  if (retrying) return;
  retrying = true;

  while (!isDatabaseReady()) {
    if (mongoose.connection.readyState === 2) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await mongoose.connect(MONGO_URI, connectOptions);
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  retrying = false;
}

export const connectDatabase = async (): Promise<void> => {
  mongoose.set("bufferCommands", false);
  bindConnectionListeners();

  if (isDatabaseReady()) {
    return;
  }

  try {
    await mongoose.connect(MONGO_URI, connectOptions);
    const safeUri = MONGO_URI.replace(/\/\/([^@/]+)@/, "//***@");
    console.log(`🔗 [Database]: URI = ${safeUri}`);
  } catch (error) {
    console.error(
      "❌ [Database]: No se pudo conectar aún. El API permanece activo y reintentará.",
      error instanceof Error ? error.message : error
    );
    void scheduleReconnect();
  }
};
