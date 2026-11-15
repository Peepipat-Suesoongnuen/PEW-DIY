/**
 * Prevent destructive demo-data seeding outside explicitly safe environments.
 *
 * Production seeding requires two deliberate opt-ins, never a stray variable:
 * - `SEED_MODE=cloud-demo` in the environment of the one-off seed job, and
 * - the explicit `--cloud-demo` command-line flag.
 *
 * The long-running API never executes this script, so an accidentally
 * configured service environment cannot seed a deployed database.
 */

/** Seed modes that are permitted when `NODE_ENV=production`. */
const PRODUCTION_SEED_MODES = new Set(["local-compose-demo", "cloud-demo"]);

export function assertSeedAllowed(
  env: NodeJS.ProcessEnv = process.env,
  args: string[] = process.argv.slice(2),
): void {
  const nodeEnv = env.NODE_ENV?.trim().toLowerCase();
  const seedMode = env.SEED_MODE?.trim();

  if (nodeEnv === "production") {
    if (seedMode && PRODUCTION_SEED_MODES.has(seedMode)) {
      if (seedMode === "cloud-demo" && !args.includes("--cloud-demo")) {
        throw new Error("Seed mode cloud-demo requires the explicit --cloud-demo flag");
      }
      if (seedMode === "cloud-demo") {
        console.warn(
          "CLOUD DEMO SEED ENABLED: demo accounts will be written to the deployed database",
        );
      }
      return;
    }
    throw new Error("Seed is disabled when NODE_ENV=production");
  }
  if (nodeEnv !== "development" && nodeEnv !== "test") {
    throw new Error("Seed requires NODE_ENV=development or NODE_ENV=test");
  }
}
