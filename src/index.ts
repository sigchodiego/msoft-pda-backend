import "./config/load-env.js";
import {
  attachHttpServer,
  notifyInstanceUp,
} from "./notifications/processAlerts.js";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { connectDatabase, isDatabaseReady } from "./config/database.js";
import { MongooseEmployeeRepository } from "./repositories/MongooseEmployeeRepository.js";
import { createEmployeeController } from "./controllers/empleados.controllers.js";
import { createEmpleadosRouter } from "./routes/empleados.routes.js";
import { MongooseAuthRepository } from "./repositories/MongooseAuthRepository.js";
import { createAuthController } from "./controllers/auth.controllers.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { loadAwsIdentity } from "./notifications/slack.js";

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(
  cors({
    origin: ["http://localhost:4200", "http://localhost:4201"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(morgan("dev"));
app.use(express.json());

const repo = new MongooseEmployeeRepository();
const empleadoController = createEmployeeController(repo);
const empleadosRouter = createEmpleadosRouter(empleadoController);

const authRepository = new MongooseAuthRepository();
const authController = createAuthController(authRepository);
const authRouter = createAuthRouter(authController);

app.use("/api/auth", authRouter);
app.use("/api", empleadosRouter);
app.use(errorHandler);

async function bootstrap() {
  await loadAwsIdentity();
  await connectDatabase();

  const server = app.listen(port, () => {
    const ready = isDatabaseReady();
    console.log("Servidor escuchando en el puerto " + port);
    console.log(
      ready
        ? "✅ [Database]: lista para tráfico"
        : "⚠️ [Database]: aún reconectando"
    );
    notifyInstanceUp(port, ready);
  });

  attachHttpServer(server);
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

void bootstrap();
