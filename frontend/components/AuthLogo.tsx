"use client";

import Image from "next/image";

export default function AuthLogo() {
  return (
    <div className="relative h-12 w-44 mx-auto">
      <Image
        src="/logo-digitak-gradasi.png"
        alt="Digitak"
        fill
        className="object-contain"
        priority
      />
    </div>
  );
}
