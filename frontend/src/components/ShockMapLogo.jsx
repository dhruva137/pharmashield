/* ShockMap unique logo SVG */
export default function ShockMapLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer hexagon ring */}
      <polygon
        points="16,2 28,9 28,23 16,30 4,23 4,9"
        stroke="url(#logoGrad)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.8"
      />
      {/* Inner hexagon */}
      <polygon
        points="16,7 23,11 23,21 16,25 9,21 9,11"
        fill="url(#logoFill)"
        opacity="0.15"
      />
      {/* Shock wave lines — left */}
      <path d="M7 16 L11 16" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      <path d="M5 13 L9 13" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <path d="M5 19 L9 19" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      {/* Shock wave lines — right */}
      <path d="M25 16 L21 16" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      <path d="M27 13 L23 13" stroke="#3b82f6" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <path d="M27 19 L23 19" stroke="#3b82f6" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      {/* Center node */}
      <circle cx="16" cy="16" r="3.5" fill="url(#centerGrad)" />
      <circle cx="16" cy="16" r="5.5" stroke="url(#logoGrad)" strokeWidth="0.75" fill="none" opacity="0.6" />
      {/* Pulse dot */}
      <circle cx="22" cy="10" r="2" fill="#ef4444" opacity="0.9" />
      <circle cx="22" cy="10" r="3.5" stroke="#ef4444" strokeWidth="0.75" fill="none" opacity="0.4" />

      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="logoFill" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </radialGradient>
      </defs>
    </svg>
  );
}
