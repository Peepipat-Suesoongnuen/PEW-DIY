/** Prevent destructive demo-data seeding outside explicitly safe environments. */
export function assertSeedAllowed(env: NodeJS.ProcessEnv = process.env): void {
  const nodeEnv = env.NODE_ENV?.trim().toLowerCase();
  if (nodeEnv === "production") {
    // Production-mode demo seeding is reserved for the isolated local Compose
    // migration container. Deployed production services do not set this mode.
    if (env.SEED_MODE?.trim() === "local-compose-demo") return;
    throw new Error("Seed is disabled when NODE_ENV=production");
  }
  if (nodeEnv !== "development" && nodeEnv !== "test") {
    throw new Error("Seed requires NODE_ENV=development or NODE_ENV=test");
  }
}
