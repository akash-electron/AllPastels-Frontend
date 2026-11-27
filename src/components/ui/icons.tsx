/**
 * Icon set.
 *
 * Hand-rolled SVGs on a 24×24 grid with a 1.4 stroke, so every glyph in the
 * interface shares one weight and optical size. Referenced as components so
 * they inherit `currentColor` and can be sized with Tailwind classes.
 */

interface IconProps {
  className?: string;
  /** Accessible label. Omit for purely decorative icons. */
  title?: string;
}

function Svg({ className, title, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </Svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M4.5 20c.9-3.9 3.9-6 7.5-6s6.6 2.1 7.5 6" />
    </Svg>
  );
}

export function HeartIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...props}>
      <path
        d="M12 20s-7.5-4.7-7.5-9.6A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 4.9-7.5 9.6-7.5 9.6Z"
        fill={filled ? "currentColor" : "none"}
      />
    </Svg>
  );
}

export function BagIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.5 8h13l-1 12h-11l-1-12Z" />
      <path d="M9 10V6.75a3 3 0 0 1 6 0V10" />
    </Svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12h15M13.5 6.5L19 12l-5.5 5.5" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 9.5l6 6 6-6" />
    </Svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.5 6l-6 6 6 6" />
    </Svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 6l6 6-6 6" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Svg>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.5 12h13" />
    </Svg>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 6.5h11v10h-11z" />
      <path d="M13.5 10h4l3 3.5v3h-7z" />
      <circle cx="6.5" cy="18.5" r="1.75" />
      <circle cx="16.5" cy="18.5" r="1.75" />
    </Svg>
  );
}

export function ReturnIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 1 2.6 6.1" />
      <path d="M3.5 7v5h5" />
    </Svg>
  );
}

export function LeafIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 4c0 9-5.5 13-11 13a5 5 0 0 1 0-10c4 0 6.5 1 8-3 2 2 3 4 3 7Z" />
      <path d="M4 20c1.5-4 4-6.5 8-8" />
    </Svg>
  );
}

export function StarIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...props}>
      <path
        d="M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8L12 3.5Z"
        fill={filled ? "currentColor" : "none"}
      />
    </Svg>
  );
}

export function GiftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 11h16v9H4z" />
      <path d="M3.5 7.5h17V11h-17z" />
      <path d="M12 7.5V20" />
      <path d="M12 7.5S10.7 3.5 8.4 3.5a2.1 2.1 0 0 0 0 4.2H12Z" />
      <path d="M12 7.5s1.3-4 3.6-4a2.1 2.1 0 0 1 0 4.2H12Z" />
    </Svg>
  );
}

/** Small padlock — the session and security rows in the account. */
export function LockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5.5" y="10.5" width="13" height="9" rx="1" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </Svg>
  );
}

/** Payment card — the "Manage cards and Wallets" sidebar row. */
export function CardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
      <path d="M3.5 10h17" />
      <path d="M7 14.5h4" />
    </Svg>
  );
}

/** Map pin — saved addresses, in the account navigation and address cards. */
export function MapPinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20.5s6.5-5.7 6.5-10.4a6.5 6.5 0 1 0-13 0c0 4.7 6.5 10.4 6.5 10.4Z" />
      <circle cx="12" cy="10.25" r="2.4" />
    </Svg>
  );
}

/** Pencil — edit actions in the address book. */
export function EditIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20h4.5L19 9.5a2.1 2.1 0 0 0-3-3L5.5 17 4 20Z" />
      <path d="M14.5 6.5l3 3" />
    </Svg>
  );
}

/** Bin — delete actions in the address book. */
export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 7h15" />
      <path d="M9 7V5.5h6V7" />
      <path d="M6.5 7l.8 12h9.4l.8-12" />
      <path d="M10 10.5v5M14 10.5v5" />
    </Svg>
  );
}

/** Sliders — the settings entry in the account navigation. */
export function SettingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8.5h8M17.5 8.5H20M4 15.5h2.5M12 15.5h8" />
      <circle cx="14.75" cy="8.5" r="2.25" />
      <circle cx="9.25" cy="15.5" r="2.25" />
    </Svg>
  );
}
