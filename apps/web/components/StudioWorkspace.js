import { Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StudioWorkspace({
  status,
  live = false,
  meta,
  stage,
  footer,
  toolbar,
  camera,
  inspector,
  layers,
}) {
  return (
    <main className="avatar-studio-page">
      <header className="avatar-studio-toolbar-shell">
        <div className="avatar-studio-toolbar" role="toolbar" aria-label="Avatar studio tools">
          {toolbar}
        </div>
      </header>

      <div className="avatar-studio-workspace">
        <section className="avatar-studio-canvas" aria-label="Avatar studio">
          <header className="avatar-studio-stage-bar">
            <span className="min-w-0 truncate">{status}</span>
            <Badge variant={live ? "default" : "outline"} className="shrink-0">
              <Circle className={live ? "fill-current" : ""} />
              {live ? "Tracking live" : "Manual mode"}
            </Badge>
          </header>
          <div className="avatar-studio-stage-slot">
            {stage}
            <aside className="avatar-studio-camera" aria-label="Camera preview">
              {camera}
            </aside>
          </div>
          <footer className="avatar-studio-footer">
            <span>{meta}</span>
            <div>{footer}</div>
          </footer>
        </section>
        <aside className="avatar-studio-sidebar" aria-label="Avatar settings">
          <section className="avatar-studio-panel avatar-studio-inspector" aria-label="Avatar controls">{inspector}</section>
          <section className="avatar-studio-panel avatar-studio-layers" aria-label="Avatar layers">{layers}</section>
        </aside>
      </div>
    </main>
  );
}
