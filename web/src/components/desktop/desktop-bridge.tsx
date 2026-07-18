"use client";

import { useEffect } from "react";
import { initDesktopExamBridge } from "@/lib/desktop/shim";

export function DesktopBridge() {
  useEffect(() => {
    initDesktopExamBridge();
  }, []);
  return null;
}
