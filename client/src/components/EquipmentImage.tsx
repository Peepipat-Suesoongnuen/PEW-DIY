import { useState } from "react";
import { Camera, Cpu, FlaskConical, Gauge, Wrench, Package } from "lucide-react";

interface EquipmentImageProps {
  imageUrl?: string | null;
  name: string;
  category: string;
  size?: "sm" | "md" | "lg";
}

function isSafeImageUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function FallbackIcon({ category, className }: { category: string; className: string }) {
  const lower = category.toLowerCase();
  if (lower.includes("elect") || lower.includes("circuit") || lower.includes("micro")) {
    return <Cpu aria-hidden="true" className={className} />;
  }
  if (lower.includes("tool") || lower.includes("mech")) {
    return <Wrench aria-hidden="true" className={className} />;
  }
  if (lower.includes("lab") || lower.includes("chem") || lower.includes("bio")) {
    return <FlaskConical aria-hidden="true" className={className} />;
  }
  if (lower.includes("audio") || lower.includes("video") || lower.includes("cam")) {
    return <Camera aria-hidden="true" className={className} />;
  }
  if (lower.includes("meas") || lower.includes("test") || lower.includes("meter")) {
    return <Gauge aria-hidden="true" className={className} />;
  }
  return <Package aria-hidden="true" className={className} />;
}

const sizeClasses: Record<"sm" | "md" | "lg", { box: string; icon: string }> = {
  sm: { box: "h-12 w-12", icon: "h-6 w-6" },
  md: { box: "h-16 w-16", icon: "h-8 w-8" },
  lg: { box: "h-44 w-full max-w-xs", icon: "h-14 w-14" },
};

/**
 * Equipment preview thumbnail with automatic category SVG fallback when `imageUrl`
 * is empty or fails to load.
 */
export function EquipmentImage({ imageUrl, name, category, size = "sm" }: EquipmentImageProps) {
  const [failed, setFailed] = useState(false);
  const validUrl = imageUrl && isSafeImageUrl(imageUrl) ? imageUrl.trim() : "";
  const showImg = validUrl.length > 0 && !failed;
  const dims = sizeClasses[size];

  return (
    <div
      className={`${dims.box} flex shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-primary/5 text-primary`}
    >
      {showImg ? (
        <img
          src={validUrl}
          alt={name}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <FallbackIcon category={category} className={dims.icon} />
      )}
    </div>
  );
}

