export function PageHeader({
  title,
  subtitle,
  crumb,
  right,
}: {
  title: string;
  subtitle?: string;
  crumb?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/85 px-8 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          {crumb && (
            <div className="mb-0.5 font-mono text-[11px] uppercase tracking-wider text-faint">
              {crumb}
            </div>
          )}
          <h1 className="truncate text-[22px] font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[13.5px] text-muted">{subtitle}</p>}
        </div>
        {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
      </div>
    </header>
  );
}
