"use client";

import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  userId?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
};

export default function Avatar({ src, name, size = "sm", className = "", userId }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [triedProxy, setTriedProxy] = useState(false);

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  const sizeClass = sizeClasses[size];

  function handleError() {
    if (!triedProxy && userId) {
      setTriedProxy(true);
    } else {
      setImgError(true);
    }
  }

  if ((src || (triedProxy && userId)) && !imgError) {
    const imgSrc = triedProxy && userId ? `/api/avatar/${userId}?t=${Date.now()}` : src!;
    return (
      <img
        src={imgSrc}
        alt={name}
        className={`${sizeClass} rounded-full object-cover ${className}`}
        referrerPolicy="no-referrer"
        onError={handleError}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-full bg-primary/10 font-bold text-primary ${sizeClass} ${className}`}>
      {initials}
    </div>
  );
}
