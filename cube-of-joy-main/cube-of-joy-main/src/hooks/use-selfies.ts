import { useEffect, useState } from "react";
import { listSelfies, subscribeRealtime, getLocalUser, type Selfie } from "@/lib/selfie-store";

export function useSelfies(type?: 'selfie' | 'upload' | 'all', onlyMine = false, latestPerUser = false): Selfie[] {
  const [selfies, setSelfies] = useState<Selfie[]>([]);

  useEffect(() => {
    const user = onlyMine ? getLocalUser() : null;
    const user_id = user?.id;

    let cancelled = false;
    listSelfies(type, user_id, latestPerUser).then((list) => {
      if (!cancelled) setSelfies(list);
    });

    const unsub = subscribeRealtime(
      (selfie) => {
        if (latestPerUser) {
          // Replace existing entry for this user with the newer selfie
          setSelfies((prev) => {
            const without = prev.filter((s) => s.userId !== selfie.userId);
            return [...without, selfie];
          });
          return;
        }
        setSelfies((prev) => {
          if (prev.some((s) => s.id === selfie.id)) return prev;
          if (user_id && selfie.userId && selfie.userId !== user_id) return prev;
          return [...prev, selfie];
        });
      },
      () => { setSelfies([]); }
    );

    return () => { cancelled = true; unsub(); };
  }, [type, onlyMine, latestPerUser]);

  return selfies;
}
