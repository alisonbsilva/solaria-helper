import { useState } from "react";
import { ImageOff } from "lucide-react";
import { itemImageUrl } from "@/lib/solaria/api";
import { cn } from "@/lib/utils";

export function ItemImg({
  icon,
  name,
  size = 36,
  className,
}: {
  icon?: string | null;
  name?: string;
  size?: number;
  className?: string;
}) {
  const src = itemImageUrl(icon);
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md border border-dashed border-line bg-ink-2 text-mist text-xs font-bold",
          className,
        )}
        style={{ width: size, height: size }}
      >
        <ImageOff className="size-4" aria-label="Imagem indisponível" />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={name ?? ""}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={cn("pixel rounded-md border border-line bg-ink-2 object-contain", className)}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
