import Link from "next/link";

export default function StudioWorkspace({
  title,
  subtitle,
  actionHref,
  actionLabel,
  status,
  live = false,
  meta,
  stage,
  footer,
  controls,
}) {
  return (
    <main className="app-main studio-shell">
      <header className="app-page-bar">
        <div><h1>{title}</h1><span>{subtitle}</span></div>
        {actionHref && <Link href={actionHref}>{actionLabel} ↗</Link>}
      </header>
      <div className="studio-layout">
        <section className="studio-stage-column">
          <div className="workspace-bar">
            <div className="live-label"><i className={live ? "is-live" : ""} />{status}</div>
            <span>{meta}</span>
          </div>
          <div className="studio-stage-slot">{stage}</div>
          <div className="workspace-footer">{footer}</div>
        </section>
        <aside className="studio-controls-column">{controls}</aside>
      </div>
    </main>
  );
}
