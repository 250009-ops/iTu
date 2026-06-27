"use client";

import { ShieldAlert } from "lucide-react";

export function ExamRemoteNotice({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
          <ShieldAlert size={24} />
        </div>
        <p className="text-sm font-semibold text-navy">{message}</p>
      </div>
    </div>
  );
}
