import Link from "next/link";

type BackLinkProps = {
  href?: string;
  label?: string;
  className?: string;
};

export function BackLink({ href = "/", label = "Retour", className = "" }: BackLinkProps) {
  return (
    <Link
      className={`group inline-flex items-center gap-2 text-xs tracking-[0.04em] text-[#8f826c] transition-colors duration-200 hover:text-[#d4c5a9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c9a84c] ${className}`}
      href={href}
    >
      <span
        aria-hidden="true"
        className="transition-transform duration-200 group-hover:-translate-x-0.5"
      >
        ←
      </span>
      <span>{label}</span>
    </Link>
  );
}

export default BackLink;
