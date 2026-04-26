type AutoscanLogoProps = {
  size?: number;
  withPlate?: boolean;
};

export default function AutoscanLogo({
  size = 28,
  withPlate = true,
}: AutoscanLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {withPlate ? (
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="14"
          fill="#0C0C0C"
          stroke="#2D2D2D"
          strokeWidth="2"
        />
      ) : null}

      <g
        transform="translate(6.8 6.8) scale(2.1)"
        stroke="#D8ED18"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
        <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
        <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" />
      </g>
    </svg>
  );
}
