import type { Application } from "express";
import type { Server } from "node:http";

/** Start an HTTP server reachable through the container's published interface. */
export function listenHttpServer(
  app: Application,
  port: number,
  host = "0.0.0.0",
): Server {
  return app.listen(port, host);
}
