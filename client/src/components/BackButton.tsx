import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface BackButtonProps {
  to: string;
  label: string;
}

/**
 * Standardized back navigation button used across all detail & form pages.
 */
export function BackButton({ to, label }: BackButtonProps) {
  return (
    <Link
      to={to}
      className="no-print inline-flex items-center gap-2 rounded-control border border-border bg-white px-3.5 py-2 text-sm font-medium text-primary shadow-xs transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

