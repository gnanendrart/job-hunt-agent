import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const frontendDist = path.join(__dirname, "public");
logger.info(
  {
    frontendDist,
    exists: fs.existsSync(frontendDist),
    indexExists: fs.existsSync(path.join(frontendDist, "index.html")),
  },
  "Static files config",
);

app.use(express.static(frontendDist));
app.use((_req, res) => {
  const indexPath = path.join(frontendDist, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      logger.error({ err, indexPath }, "Failed to serve index.html");
      res.status(404).send("Frontend not found");
    }
  });
});

export default app;
