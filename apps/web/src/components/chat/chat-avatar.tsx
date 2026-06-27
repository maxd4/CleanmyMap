import Image from "next/image";

type ChatAvatarProps = {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  tone?: "light" | "dark";
  className?: string;
};

function getInitials(name: string): string {
  const words = name
    .trim()
    .replace(/[^a-zA-Z0-9À-ÿ\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

const SIZE_CLASSES: Record<NonNullable<ChatAvatarProps["size"]>, string> = {
  sm: "h-9 w-9 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
};

export function ChatAvatar({
  src,
  name,
  size = "md",
  tone = "dark",
  className = "",
}: ChatAvatarProps) {
  const initials = getInitials(name);

  return (
    <div
      className={[
        "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl font-black uppercase",
        tone === "light" ? "bg-rose-50 text-rose-700" : "bg-white/10 text-white",
        SIZE_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={48}
          height={48}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}
