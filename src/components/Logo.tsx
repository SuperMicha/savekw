import Image from "next/image";
import Link from "next/link";

/**
 * Logo source. Defaults to the bundled SVG in `public/`; override it with
 * NEXT_PUBLIC_LOGO_SRC (a local path or an absolute URL) to use your own.
 *
 * The original hosted logo lived on savekw.tech, which no longer resolves.
 */
const DEFAULT_LOGO = "/logo.svg";

export default function Logo({ className = "" }: { className?: string }) {
  const logoSrc = process.env.NEXT_PUBLIC_LOGO_SRC ?? DEFAULT_LOGO;
  const isLocal = logoSrc.startsWith("/");

  return (
    <Link href="/" className={`flex items-center ${className}`}>
      <Image
        src={logoSrc}
        alt="SaveKW"
        width={120}
        height={40}
        className="h-10 w-auto"
        priority
        unoptimized={isLocal}
      />
    </Link>
  );
}
