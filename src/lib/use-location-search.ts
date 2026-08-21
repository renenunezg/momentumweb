"use client";

import { useSyncExternalStore } from "react";

const LOCATION_CHANGE_EVENT = "momentum:location-change";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(LOCATION_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(LOCATION_CHANGE_EVENT, onStoreChange);
  };
}

function getSnapshot() {
  return window.location.search;
}

function getServerSnapshot() {
  return "";
}

export function useLocationSearch() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function replaceLocation(url: URL) {
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));
}
