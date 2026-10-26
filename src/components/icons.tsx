import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 8.2 10 3l6.5 5.2V16a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V8.2Z" />
    <path d="M8 17v-5h4v5" />
  </Icon>
);

export const IconInvoice = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 2.5h10v15l-2.5-1.5L10 17.5 7.5 16 5 17.5v-15Z" />
    <path d="M7.8 7h4.4M7.8 10.2h4.4" />
  </Icon>
);

export const IconQuote = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11.5 2.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 17.5h8a1.5 1.5 0 0 0 1.5-1.5V6.5l-4-4Z" />
    <path d="M11.5 2.5v4h4M7.5 11h5M7.5 13.8h3" />
  </Icon>
);

export const IconClients = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="7.6" cy="7" r="2.8" />
    <path d="M2.6 16.4c0-2.5 2.2-4.3 5-4.3s5 1.8 5 4.3" />
    <path d="M13.2 5.1a2.6 2.6 0 0 1 0 5M14.6 12.5c1.8.5 3 1.9 3 3.9" />
  </Icon>
);

export const IconAgency = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 17h14M4.5 17V5.2a.7.7 0 0 1 .7-.7h5.6a.7.7 0 0 1 .7.7V17" />
    <path d="M11.5 17V9h3.8a.7.7 0 0 1 .7.7V17" />
    <path d="M6.8 7.6h2.2M6.8 10.4h2.2M6.8 13.2h2.2" />
  </Icon>
);

export const IconMission = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 6.5h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
    <path d="M7.2 6.5V4.8a1 1 0 0 1 1-1h3.6a1 1 0 0 1 1 1v1.7" />
    <path d="M2.5 10.4h15" />
  </Icon>
);

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10" cy="10" r="7.2" />
    <path d="M10 5.9V10l2.8 1.7" />
  </Icon>
);

export const IconPayment = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="4.8" width="15" height="10.4" rx="1.4" />
    <path d="M2.5 8.4h15" />
    <path d="M5.6 12.4h2.6" />
  </Icon>
);

export const IconBell = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 7.6a5 5 0 1 0-10 0c0 4-1.6 5.3-1.6 5.3h13.2S15 11.6 15 7.6Z" />
    <path d="M8.6 15.8a1.6 1.6 0 0 0 2.8 0" />
  </Icon>
);

export const IconRepeat = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8.2A4.2 4.2 0 0 1 8.2 4h7.3" />
    <path d="m13 1.8 2.7 2.2L13 6.2" />
    <path d="M16 11.8a4.2 4.2 0 0 1-4.2 4.2H4.5" />
    <path d="m7 13.8-2.7 2.2L7 18.2" />
  </Icon>
);

export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10" cy="10" r="2.6" />
    <path d="M16.2 12.2a1.3 1.3 0 0 0 .3 1.4l.1.1a1.6 1.6 0 1 1-2.2 2.2l-.1-.1a1.3 1.3 0 0 0-2.2.9v.2a1.6 1.6 0 1 1-3.2 0v-.1a1.3 1.3 0 0 0-2.2-.9l-.1.1a1.6 1.6 0 1 1-2.2-2.2l.1-.1a1.3 1.3 0 0 0-.9-2.2h-.2a1.6 1.6 0 1 1 0-3.2h.1a1.3 1.3 0 0 0 .9-2.2l-.1-.1a1.6 1.6 0 1 1 2.2-2.2l.1.1a1.3 1.3 0 0 0 1.4.3h.1a1.3 1.3 0 0 0 .8-1.2v-.2a1.6 1.6 0 1 1 3.2 0v.1a1.3 1.3 0 0 0 2.2.9l.1-.1a1.6 1.6 0 1 1 2.2 2.2l-.1.1a1.3 1.3 0 0 0-.3 1.4v.1a1.3 1.3 0 0 0 1.2.8h.2a1.6 1.6 0 1 1 0 3.2h-.1a1.3 1.3 0 0 0-1.2.8Z" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 4.2v11.6M4.2 10h11.6" />
  </Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.8 5.4h12.4M8.2 5.4V4a1 1 0 0 1 1-1h1.6a1 1 0 0 1 1 1v1.4" />
    <path d="M5.4 5.4 6 16a1 1 0 0 0 1 .9h6a1 1 0 0 0 1-.9l.6-10.6" />
    <path d="M8.6 8.6v5M11.4 8.6v5" />
  </Icon>
);

export const IconDownload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 3.2v9.2" />
    <path d="m6.4 9.2 3.6 3.6 3.6-3.6" />
    <path d="M3.6 15.4v.6a1 1 0 0 0 1 1h10.8a1 1 0 0 0 1-1v-.6" />
  </Icon>
);

export const IconEye = (p: IconProps) => (
  <Icon {...p}>
    <path d="M1.8 10S4.9 4.6 10 4.6 18.2 10 18.2 10 15.1 15.4 10 15.4 1.8 10 1.8 10Z" />
    <circle cx="10" cy="10" r="2.4" />
  </Icon>
);

export const IconEdit = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13.4 3.4a1.7 1.7 0 0 1 2.4 2.4L6.6 15 3 16l1-3.6 9.4-9Z" />
  </Icon>
);

export const IconCopy = (p: IconProps) => (
  <Icon {...p}>
    <rect x="7" y="7" width="9.5" height="9.5" rx="1.3" />
    <path d="M13 7V4.8a1.3 1.3 0 0 0-1.3-1.3H4.8A1.3 1.3 0 0 0 3.5 4.8v6.9A1.3 1.3 0 0 0 4.8 13H7" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="m4.5 10.5 3.6 3.5L15.5 6" />
  </Icon>
);

export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10h11.5M11 5.5 15.5 10 11 14.5" />
  </Icon>
);

export const IconBack = (p: IconProps) => (
  <Icon {...p}>
    <path d="M16 10H4.5M9 5.5 4.5 10 9 14.5" />
  </Icon>
);

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="5.5" />
    <path d="m13.2 13.2 3.3 3.3" />
  </Icon>
);

export const IconBank = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8.2 10 4l7 4.2" />
    <path d="M4.6 8.6v6.6M8 8.6v6.6M12 8.6v6.6M15.4 8.6v6.6" />
    <path d="M2.8 17h14.4" />
  </Icon>
);

export const IconDocument = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11.5 2.8H6.2a1.4 1.4 0 0 0-1.4 1.4v11.6a1.4 1.4 0 0 0 1.4 1.4h7.6a1.4 1.4 0 0 0 1.4-1.4V6.5l-3.7-3.7Z" />
    <path d="M11.5 2.8v3.7h3.7" />
  </Icon>
);

export const IconChart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.2 16.4h13.6" />
    <path d="M6 16.4v-5M10 16.4V5.6M14 16.4v-7.4" />
  </Icon>
);

export const IconWarning = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 7v3.6M10 13.6h.01" />
    <path d="M8.6 3.3 2.1 14.6a1.6 1.6 0 0 0 1.4 2.4h13a1.6 1.6 0 0 0 1.4-2.4L11.4 3.3a1.6 1.6 0 0 0-2.8 0Z" />
  </Icon>
);

export const IconSparkle = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 2.8 11.7 8 17 9.7 11.7 11.4 10 16.7 8.3 11.4 3 9.7 8.3 8 10 2.8Z" />
  </Icon>
);

export const IconUsers = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6.8" cy="6.4" r="2.6" />
    <circle cx="13.2" cy="6.4" r="2.6" />
    <path d="M2.4 16.2c0-2.3 2-4 4.4-4s4.4 1.7 4.4 4" />
    <path d="M12.2 12.4c2.8-.4 5.4 1.3 5.4 3.8" />
  </Icon>
);

export const IconHandover = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.6 7.4h6.2l-2-2M17.4 12.6h-6.2l2 2" />
    <rect x="2.6" y="11.2" width="6.4" height="5.4" rx="1.2" />
    <rect x="11" y="3.4" width="6.4" height="5.4" rx="1.2" />
  </Icon>
);

export const IconMobile = (p: IconProps) => (
  <Icon {...p}>
    <rect x="6" y="2.6" width="8" height="14.8" rx="1.6" />
    <path d="M8.9 15h2.2" />
  </Icon>
);
