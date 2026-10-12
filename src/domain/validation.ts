export function parseMaxAttempts(value: string | number = 1): number {
  const attempts = typeof value === "string" && !value.trim() ? NaN : Number(value);
  if (attempts !== 1) throw new Error("Automatic retries are disabled. --max-attempts must be 1; create a new job to regenerate.");
  return attempts;
}
