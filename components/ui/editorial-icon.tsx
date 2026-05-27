type EditorialIconName =
  | "pen"
  | "book"
  | "page"
  | "scenes"
  | "eye"
  | "sun"
  | "river"
  | "star"
  | "home";

type EditorialIconProps = {
  color?: string;
  name: EditorialIconName;
  size?: number;
};

const commonProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.35,
};

export type { EditorialIconName };

export default function EditorialIcon({ color = "currentColor", name, size = 16 }: EditorialIconProps) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      style={{ color }}
      viewBox="0 0 24 24"
      width={size}
    >
      {name === "pen" && (
        <>
          <path {...commonProps} d="M5 19l4.1-1 9.4-9.4a2.2 2.2 0 0 0-3.1-3.1L6 14.9 5 19Z" />
          <path {...commonProps} d="M13.8 7.1l3.1 3.1" />
        </>
      )}
      {name === "book" && (
        <>
          <path {...commonProps} d="M6.5 4.5h7A3.5 3.5 0 0 1 17 8v11H9.5A3.5 3.5 0 0 0 6 22V7a2.5 2.5 0 0 1 2.5-2.5Z" />
          <path {...commonProps} d="M17 19h1.5A1.5 1.5 0 0 0 20 17.5V6.5A1.5 1.5 0 0 0 18.5 5H17" />
        </>
      )}
      {name === "page" && (
        <>
          <path {...commonProps} d="M7 3.8h7.5L18 7.3v12.9H7V3.8Z" />
          <path {...commonProps} d="M14.5 3.8v3.7H18" />
          <path {...commonProps} d="M9.5 11h6" />
          <path {...commonProps} d="M9.5 14h5" />
        </>
      )}
      {name === "scenes" && (
        <>
          <path {...commonProps} d="M4.5 6.5h15" />
          <path {...commonProps} d="M7 4v15.5" />
          <path {...commonProps} d="M17 4v15.5" />
          <path {...commonProps} d="M4.5 12h15" />
          <path {...commonProps} d="M4.5 17.5h15" />
        </>
      )}
      {name === "eye" && (
        <>
          <path {...commonProps} d="M3.8 12s3-5 8.2-5 8.2 5 8.2 5-3 5-8.2 5-8.2-5-8.2-5Z" />
          <circle {...commonProps} cx="12" cy="12" r="2.2" />
        </>
      )}
      {name === "sun" && (
        <>
          <circle {...commonProps} cx="12" cy="12" r="3.2" />
          <path {...commonProps} d="M12 3.8v2" />
          <path {...commonProps} d="M12 18.2v2" />
          <path {...commonProps} d="M3.8 12h2" />
          <path {...commonProps} d="M18.2 12h2" />
          <path {...commonProps} d="M6.2 6.2l1.4 1.4" />
          <path {...commonProps} d="M16.4 16.4l1.4 1.4" />
        </>
      )}
      {name === "river" && (
        <>
          <path {...commonProps} d="M4 9.5c2.5-2.2 4.8-2.2 7 0s4.5 2.2 7 0" />
          <path {...commonProps} d="M4 14.5c2.5-2.2 4.8-2.2 7 0s4.5 2.2 7 0" />
        </>
      )}
      {name === "star" && (
        <>
          <path {...commonProps} d="M12 4.5v15" />
          <path {...commonProps} d="M4.5 12h15" />
          <path {...commonProps} d="M7.7 7.7l8.6 8.6" />
          <path {...commonProps} d="M16.3 7.7l-8.6 8.6" />
        </>
      )}
      {name === "home" && (
        <>
          <path {...commonProps} d="M4.8 11.3 12 5l7.2 6.3" />
          <path {...commonProps} d="M7 10.5v8.7h10v-8.7" />
          <path {...commonProps} d="M10 19.2v-4.8h4v4.8" />
        </>
      )}
    </svg>
  );
}
