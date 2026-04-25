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

      <g transform="translate(10 10)">
        <path d="M22 6L31 11L22 16L13 11L22 6Z" fill="#D8ED18" />
        <path d="M13 11V21L22 26V16L13 11Z" fill="#9FB31A" />
        <path d="M31 11V21L22 26V16L31 11Z" fill="#C7DB1A" />

        <path d="M10 18L18 22.5L10 27L2 22.5L10 18Z" fill="#BFD42A" />
        <path d="M2 22.5V31L10 35.5V27L2 22.5Z" fill="#819313" />
        <path d="M18 22.5V31L10 35.5V27L18 22.5Z" fill="#A8BD19" />

        <path d="M34 18L42 22.5L34 27L26 22.5L34 18Z" fill="#D8ED18" />
        <path d="M26 22.5V31L34 35.5V27L26 22.5Z" fill="#8FA217" />
        <path d="M42 22.5V31L34 35.5V27L42 22.5Z" fill="#B7CC1D" />
      </g>
    </svg>
  );
}
