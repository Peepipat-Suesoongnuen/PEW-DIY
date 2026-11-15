/**
 * Prevent destructive demo-data seeding outside explicitly safe environments.
 *
 * Production seeding always needs two independent opt-ins: a `SEED_MODE` value
 * AND the matching command-line flag. A stray environment variable alone is
 * never enough, so the guard cannot be satisfied by configuration that leaks
 * into a long-running service.
 *
 * | `SEED_MODE`          | Required flag           | Intended caller                  |
 * |----------------------|-------------------------|----------------------------------|
 * | `local-compose-demo` | `--local-compose-demo`  | Compose one-shot `migrate`       |
 * | `cloud-demo`         | `--cloud-demo`          | One-off Cloud Run seed job       |
 *
 * The long-running API never executes this script and receives neither
 * `SEED_MODE` nor the seed passwords, so an accidentally configured service
 * environment cannot seed a deployed database.
 */

/** Production seed modes mapped to the CLI flag each one requires. */
const PRODUCTION_SEED_MODE_FLAGS = new Map([
  ["local-compose-demo", "--local-compose-demo"],
  ["cloud-demo", "--cloud-demo"],
]);

export function assertSeedAllowed(
  env: NodeJS.ProcessEnv = process.env,
  args: string[] = process.argv.slice(2),
): void {
  const nodeEnv = env.NODE_ENV?.trim().toLowerCase();
  const seedMode = env.SEED_MODE?.trim();

  if (nodeEnv === "production") {
    const requiredFlag = seedMode ? PRODUCTION_SEED_MODE_FLAGS.get(seedMode) : undefined;
    if (!requiredFlag) {
      throw new Error("Seed is disabled when NODE_ENV=production");
    }
    if (!args.includes(requiredFlag)) {
      throw new Error(`Seed mode ${seedMode} requires the explicit ${requiredFlag} flag`);
    }
    if (seedMode === "cloud-demo") {
      console.warn(
        "CLOUD DEMO SEED ENABLED: demo accounts will be written to the deployed database",
      );
    }
    return;
  }
  if (nodeEnv !== "development" && nodeEnv !== "test") {
    throw new Error("Seed requires NODE_ENV=development or NODE_ENV=test");
  }
}
