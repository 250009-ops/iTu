"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import {
  initDesktopConnectivityUx,
  initDesktopExamBridge,
} from "@/lib/desktop/shim";

export function DesktopBridge() {
  const { toast } = useToast();

  useEffect(() => {
    initDesktopExamBridge();
    return initDesktopConnectivityUx(toast);
  }, [toast]);

  return null;
}
