"use client";

import Image from "next/image";

export default function AuthLogo() {
  return (
    <div className="relative h-10 w-36 sm:h-12 sm:w-44 md:h-14 md:w-52 mx-auto">
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
