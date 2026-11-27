export function getTimeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function PortalHeroBanner({ title, subtitle, topAction, actions }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#CBE3D2] bg-gradient-to-r from-[#EFF7F1] via-[#E5F2E8] to-[#DCEEE2] px-6 py-5 sm:px-8 sm:py-6 shadow-xs">
      {/* Subtle organic wave background */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 220"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
      >
        <path
          d="M0,160 C240,90 420,210 700,130 C920,65 1060,145 1200,110 L1200,220 L0,220 Z"
          fill="#D2E8D8"
        />
        <path
          d="M0,190 C300,135 540,220 860,150 C1030,112 1120,170 1200,150 L1200,220 L0,220 Z"
          fill="#C7E2CE"
        />
      </svg>

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left: Greeting & Subtitle */}
        <div className="min-w-0">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#0F3D26] tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm font-medium text-[#3E5F4E]">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right: Optional Top Action + Primary Actions */}
        {(topAction || actions) && (
          <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0">
            {topAction}
            {actions && (
              <div className="flex flex-wrap items-center gap-2.5">
                {actions}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
