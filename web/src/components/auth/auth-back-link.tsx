import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface AuthBackLinkProps {
  href: string;
  label?: string;
}

export function AuthBackLink({ href, label = "Back to login" }: AuthBackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 rounded"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
