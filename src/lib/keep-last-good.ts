// For readers that report a failure instead of throwing. An ISR page that
// rendered the failure would cache its unavailable state until the next
// publish, so the render throws: at runtime ISR keeps the last good page, and
// in the build the deploy fails while the previous one keeps serving.
export function keepLastGood(label: string, failed: unknown): void {
  if (failed) throw new Error(`${label} read failed`);
}
