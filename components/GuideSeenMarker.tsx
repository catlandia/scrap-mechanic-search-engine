"use client";

import { useEffect } from "react";
import { GUIDE_SEEN_KEY } from "./GuideLink";

export function GuideSeenMarker() {
  useEffect(() => {
    try {
      window.localStorage.setItem(GUIDE_SEEN_KEY, "1");
    } catch {
      // storage blocked — nothing to do; the header link will keep pulsing
      // for this visitor, which is acceptable.
    }
  }, []);
  return null;
}
