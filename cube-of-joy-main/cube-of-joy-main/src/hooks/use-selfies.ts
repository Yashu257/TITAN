import { useEffect, useState } from "react";
import { listSelfies, subscribeRealtime, type Selfie } from "@/lib/selfie-store";

export function useSelfies(): Selfie[] {
  const [selfies, setSelfies] = useState<Selfie[]>([]);
  useEffect(() => {
    let cancelled = false;
    listSelfies().then((list) => {
      if (!cancelled) setSelfies(list);
    });
    const unsub = subscribeRealtime(
      (selfie) => {
        setSelfies((prev) => {
          if (prev.some((s) => s.id === selfie.id)) return prev;
          return [...prev, selfie];
        });
      },
      () => {
        setSelfies([]);
      }
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);
  return selfies;
}