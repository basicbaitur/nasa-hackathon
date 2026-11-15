import type { Status } from "@/lib/engine";

/** Visor opening in a 100×100 box (stretched to the viewport). */
export const VISOR_PATH =
  "M50 3.6 C74 3.6 92.6 8.4 95.6 29 C97.8 45 97.4 63 93 77.5 C88 90 72 96.6 50 96.6 C28 96.6 12 90 7 77.5 C2.6 63 2.2 45 4.4 29 C7.4 8.4 26 3.6 50 3.6 Z";

/** Glass effects that sit between the HUD and the helmet shell. */
export function VisorGlass({ status, los }: { status: Status; los: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="visor-tint absolute inset-0" />
      <div className="visor-fog absolute inset-0" />
      <div className="visor-reflect absolute inset-0">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="refl-a" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.45" stopColor="#fff" stopOpacity="0.16" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <filter id="refl-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.5" />
            </filter>
          </defs>
          <path d="M9 34 C12 16 26 8.5 44 7.6" fill="none" stroke="url(#refl-a)" strokeWidth="1.6" filter="url(#refl-blur)" opacity="0.55" />
          <path d="M91 64 C90 76 83 86 70 91" fill="none" stroke="url(#refl-a)" strokeWidth="0.6" filter="url(#refl-blur)" opacity="0.6" />
        </svg>
      </div>
      <div className="visor-grain absolute inset-0" />
      {status !== "nominal" && <div className={`absolute inset-0 ${status === "alert" ? "visor-alert" : "visor-watch"}`} />}
      {los && <div className="visor-static absolute inset-0" />}
    </div>
  );
}

/** The inside of the helmet shell around the visor, with rim, HUD projector and status LEDs. */
export function HelmetShell({ status, linkUp }: { status: Status; linkUp: boolean }) {
  const led = status === "alert" ? "#FF7A7A" : status === "watch" ? "#FFB454" : "#5EE0C1";
  return (
    <div className="helmet-shell pointer-events-none absolute inset-0" aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="shell-fill" cx="50%" cy="50%" r="72%">
            <stop offset="0.55" stopColor="#151b26" />
            <stop offset="0.8" stopColor="#0b0f16" />
            <stop offset="1" stopColor="#030407" />
          </radialGradient>
          <linearGradient id="rim-metal" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#7d8ca3" />
            <stop offset="0.25" stopColor="#2b3442" />
            <stop offset="0.55" stopColor="#11161e" />
            <stop offset="0.8" stopColor="#323d4e" />
            <stop offset="1" stopColor="#0c1016" />
          </linearGradient>
          <clipPath id="visor-clip">
            <path d={VISOR_PATH} />
          </clipPath>
          <filter id="inner-blur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
          <filter id="soft" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.25" />
          </filter>
        </defs>

        {/* Depth shadow just inside the glass edge */}
        <g clipPath="url(#visor-clip)">
          <path d={VISOR_PATH} fill="none" stroke="#000" strokeOpacity="0.85" strokeWidth="5" filter="url(#inner-blur)" />
        </g>

        {/* Shell */}
        <path d={`M0 0 H100 V100 H0 Z ${VISOR_PATH}`} fillRule="evenodd" fill="url(#shell-fill)" />
        {/* Padding seams */}
        <g fill="none" stroke="#2a3341" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.7">
          <path d="M0 18 C2 12 6 6 14 2.2" />
          <path d="M100 18 C98 12 94 6 86 2.2" />
          <path d="M0 86 C3 92 8 97 16 100" />
          <path d="M100 86 C97 92 92 97 84 100" />
        </g>
        {/* Rim: dark metal band + bright edge catching the light */}
        <path d={VISOR_PATH} fill="none" stroke="url(#rim-metal)" strokeWidth="16" vectorEffect="non-scaling-stroke" />
        <path d={VISOR_PATH} fill="none" stroke="#9fc4ff" strokeOpacity="0.35" strokeWidth="1.2" vectorEffect="non-scaling-stroke" filter="url(#soft)" />
        <path d={VISOR_PATH} fill="none" stroke="#000" strokeOpacity="0.6" strokeWidth="2" vectorEffect="non-scaling-stroke" transform="translate(50 50) scale(0.993) translate(-50 -50)" />
      </svg>

      {/* HUD projector at the top of the helmet */}
      <div className="hud-projector" />

      {/* Status LEDs printed on the inner shell */}
      <div className="absolute bottom-[2.6%] left-[3%] hidden items-center gap-3 font-mono text-[9px] uppercase tracking-[0.3em] text-[#5d6b80] lg:flex">
        <span className="shell-led" style={{ ["--led" as string]: led }} />
        BIO
        <span className="shell-led" style={{ ["--led" as string]: linkUp ? "#4CC9F0" : "#FF7A7A" }} />
        COMM
        <span className="shell-led shell-led-slow" style={{ ["--led" as string]: "#5EE0C1" }} />
        PLSS
      </div>
      <div className="absolute bottom-[1.6%] right-[3%] hidden text-right font-mono text-[9px] uppercase tracking-[0.3em] text-[#4d5a6d] lg:block">
        xEMU-AS · S/N 0347 · HUD v5
        <span className="mt-1 block text-[8px] normal-case tracking-[0.12em] text-[#3d4858]">Planet textures: Solar System Scope (CC BY 4.0) · Solar video: NASA/SDO</span>
      </div>
    </div>
  );
}
