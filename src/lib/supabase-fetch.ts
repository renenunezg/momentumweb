// During `next build` every prerendered page reads Supabase, and a page sends
// its reads together. The Nano instance has 426 MB of memory and swaps while
// idle, so that burst can stall it: on 2026-11-17 a build rendered 16 pages,
// then every read timed out until Postgres was restarted. At build time reads
// therefore leave this process one at a time, and next.config.ts keeps
// prerendering in one worker process, so the whole build sends one read at a
// time. At runtime reads pass straight through.
const BUILDING = process.env.NEXT_PHASE === "phase-production-build";

// A caller's own timeout would run while its read waits in line, so a build
// read gets this one instead, started when the read is sent.
const BUILD_READ_TIMEOUT_MS = 20_000;

let lastRead: Promise<unknown> = Promise.resolve();

export const supabaseFetch: typeof fetch = (input, init) => {
  if (!BUILDING) return fetch(input, init);
  const read = lastRead.then(() =>
    fetch(input, { ...init, signal: AbortSignal.timeout(BUILD_READ_TIMEOUT_MS) }),
  );
  lastRead = read.catch(() => undefined);
  return read;
};
