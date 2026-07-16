import Link from "next/link";
import { useRouter } from "next/router";

const LINKS = [
  ["V1", "/studio/avatar-v1", false],
  ["V2", "/studio/avatar-v2", false],
  ["V1 Editor", "/editor/psd/avatar-v1", true],
  ["V2 Editor", "/editor/psd/avatar-v2", false],
  ["Prompt Helper", "/avatar-helper", true],
];

export default function SiteHeader() {
  const { pathname } = useRouter();
  return (
    <header className="site-header app-header">
      <Link className="brand-mark" href="/" aria-label="Stream Bro home"><i>SB</i> Stream Bro</Link>
      <nav aria-label="Main navigation">
        {LINKS.map(([label, href, sectionStart]) => (
          <span className={sectionStart ? "nav-section-start" : ""} key={href}>
            <Link className={pathname === href ? "active" : ""} href={href}>{label}</Link>
          </span>
        ))}
      </nav>
    </header>
  );
}
