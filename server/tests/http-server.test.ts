import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { listenHttpServer } from "../src/http-server";

describe("HTTP server binding", () => {
  let closeServer: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await closeServer?.();
    closeServer = undefined;
  });

  it("binds to the all-interfaces host by default", async () => {
    const app = express();
    const server = listenHttpServer(app, 0);
    closeServer = () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });

    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();

    expect(address).not.toBeNull();
    expect(typeof address).not.toBe("string");
    expect(address && typeof address !== "string" ? address.address : null).toBe("0.0.0.0");
  });
});
