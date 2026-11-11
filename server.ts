import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import customerRouter from "./src/api/routes/customer";
import { mongoRouter } from "./src/api/mongoRoutes";
import { getCatalogSource } from "./src/db/mongo";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import "dotenv/config";
import { getShopRouter } from './src/commerce/server/index.js';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });
  app.set("io", io);
  
  io.on("connection", (socket) => {
    console.log("Client connected to socket:", socket.id);
  });

  app.disable('x-powered-by');
  app.use('/api/shop', getShopRouter()); // Owns parsers, including raw payment webhooks.
  app.use(express.json({ limit: "5mb" }));

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
  app.use('/uploads', express.static(uploadsDir));

  // Mongo routes are mounted first so Mongo mode never falls through to the
  // SQLite demo routes. Routes that are not part of Mongo mode call next().
  app.use("/api", mongoRouter);
  app.use("/api/customer", customerRouter);

  const catalogSource = getCatalogSource();
  if (process.env.ENABLE_AI === 'true') {
    const aiRouter = (await import("./src/api/routes/ai")).default;
    app.use("/api/ai", aiRouter);
  } else {
    app.use('/api/ai', (_req, res) => res.status(503).json({ error: { code: 'AI_DISABLED', message: 'Optional AI is disabled. All shopping features remain available.' } }));
  }

  // The original SQLite routers remain the explicit demo implementation. Do
  // not import them in Mongo mode: importing the legacy db module opens and
  // seeds sqlite.db at module load, which is unnecessary in production.
  if (catalogSource === "demo" && process.env.ENABLE_LEGACY_SELLER === 'true') {
    const [authRouter, profileRouter, productsRouter, analyticsRouter, notificationsRouter] = await Promise.all([
      import("./src/api/routes/auth"),
      import("./src/api/routes/profile"),
      import("./src/api/routes/products"),
      import("./src/api/routes/analytics"),
      import("./src/api/routes/notifications"),
    ]);
    app.use("/api/auth", authRouter.default);
    app.use("/api/profile", profileRouter.default);
    app.use("/api/products", productsRouter.default);
    app.use("/api/analytics", analyticsRouter.default);
    app.use("/api/notifications", notificationsRouter.default);
  }

  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found' } }));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
