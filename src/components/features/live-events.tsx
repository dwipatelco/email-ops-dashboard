"use client";

import { useEffect } from "react";
import { useRef } from "react";

export function LiveEvents({ onRefresh }: { onRefresh: () => void }) {
  const lastVersionRef = useRef<string | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = (event) => {
      const nextVersion = event.data;
      if (!nextVersion || nextVersion === lastVersionRef.current) {
        return;
      }

      lastVersionRef.current = nextVersion;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Coalesce bursty SSE updates into a single refresh.
      refreshTimeoutRef.current = setTimeout(() => {
        onRefresh();
      }, 120);
    };
    source.onerror = () => {};

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      source.close();
    };
  }, [onRefresh]);

  return null;
}
