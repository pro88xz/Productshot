type LensIconProps = {
  className?: string;
};

/**
 * The ProductShot brand mark — concentric circles forming a camera lens.
 * Matches /icon.svg exactly so favicon and on-site header stay aligned.
 */
export function LensIcon({ className }: LensIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="16" fill="#4F46E5" />
      <circle cx="16" cy="16" r="12" fill="none" stroke="white" strokeWidth="3" />
      <circle cx="16" cy="16" r="5" fill="white" />
    </svg>
  );
}
