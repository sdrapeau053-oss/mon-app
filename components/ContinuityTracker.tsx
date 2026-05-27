"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackContinuityVisit } from "@/lib/continuity";

export default function ContinuityTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackContinuityVisit(pathname);
  }, [pathname]);

  return null;
}
