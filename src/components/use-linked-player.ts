"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// The ?player= id carried by a link from another MLB player page. Null on the
// server, where the cached page is rendered without a query string.
export function useLinkedPlayerId(): number | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get("player"),
    () => null,
  );
  const id = Number(raw);
  return raw && Number.isInteger(id) && id > 0 ? id : null;
}
