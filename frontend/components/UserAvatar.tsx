"use client";

import { useEffect, useState } from "react";

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  size?: number;
}

export function UserAvatar({ src, name = "User", className = "", size = 36 }: UserAvatarProps) {
  const initials = getInitials(name);
  const avatarUrl = getAvatarUrl(src);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  function getInitials(name: string): string {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }

  function getAvatarUrl(foto: string | null | undefined): string | null {
    if (!foto) return null;
    if (foto.startsWith("http://") || foto.startsWith("https://") || foto.startsWith("data:image/") || foto.startsWith("blob:")) {
      return foto;
    }
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    if (foto.startsWith("/")) {
      return `${base}${foto}`;
    }
    return `${base}/${foto}`;
  }

  const textSize = size < 32 ? "text-xs" : size < 48 ? "text-sm" : "text-base";

  return (
    <div
      className={[
        "relative overflow-hidden rounded-full border-2 border-white shadow-sm bg-orange-100 flex items-center justify-center font-bold text-orange-700 shrink-0",
        className,
      ].join(" ")}
      style={{ width: size, height: size }}
    >
      {avatarUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={textSize}>{initials}</span>
      )}
    </div>
  );
}
