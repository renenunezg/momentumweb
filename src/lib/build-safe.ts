// ISR keeps the last good page when a regeneration read throws, so pages that
// need a complete snapshot let the throw through at runtime. During
// `next build` there is no last good page and the throw fails the whole
// deploy: the anon role's 3-second statement timeout trips when the build's
// prerenders land on the database together. The build therefore renders the
// page's unavailable state instead, and the first revalidation fills it in.
const BUILDING = process.env.NEXT_PHASE === "phase-production-build";

export async function buildSafe<T>(label: string, read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    if (!BUILDING) throw error;
    console.error(`${label} build read failed:`, error instanceof Error ? error.message : "read failed");
    return null;
  }
}
