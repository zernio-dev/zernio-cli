/**
 * Output helpers. Default is compact JSON (for AI agents / piping).
 * --pretty flag enables indented JSON for humans.
 */

/** Print data as JSON. Uses indentation when --pretty is set. */
export function output(data: unknown, pretty = false): void {
  if (pretty) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(JSON.stringify(data));
  }
}

/** Print an error as structured JSON and exit with code 1. */
export function outputError(message: string, status?: number, extra?: Record<string, unknown>): never {
  const err: Record<string, unknown> = { error: true, message };
  if (status !== undefined) err.status = status;
  if (extra) Object.assign(err, extra);
  console.error(JSON.stringify(err));
  process.exit(1);
}
