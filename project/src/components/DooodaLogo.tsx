interface DooodaLogoProps {
  light?: boolean;
}

export default function DooodaLogo({ light = false }: DooodaLogoProps) {
  return (
    <div className="dooooda-logo" dir="ltr" style={light ? { '--logo-main': '#ffffff' } as React.CSSProperties : undefined}>
      <span className="black">D</span>

      <div className="ooo">
        <svg className="o left black" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="40"/>
        </svg>

        <svg className="o middle red" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="40"/>
        </svg>

        <svg className="o right black" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="40"/>
        </svg>
      </div>

      <span className="black">D</span>

      <svg className="letter-a red" viewBox="0 0 235.5 210" aria-hidden="true">
        <polygon
          points="235.5 210 141.3 0 93.3 0 0 210 49.8 210 117.15 48.05 184.5 210 235.5 210"
          fill="currentColor"/>
      </svg>
    </div>
  );
}
