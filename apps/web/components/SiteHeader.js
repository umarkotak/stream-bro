import Link from "next/link";
import { useRouter } from "next/router";

const LINKS = [
  ["V1 Basic", "/studio/avatar-v1-basic"],
  ["V1 PSD", "/studio/avatar-v1-psd"],
  ["V2", "/studio/avatar-v2"],
  ["V1 Editor", "/editor/psd/avatar-v1"],
  ["V2 Editor", "/editor/psd/avatar-v2"],
  ["Prompt Helper", "/avatar-helper"],
];

export default function SiteHeader() {
  const { pathname } = useRouter();
  return (
    <header className="site-header app-header">
      <Link className="brand-mark" href="/" aria-label="Stream Bro home"><i>SB</i> Stream Bro</Link>
      <nav aria-label="Main navigation">
        {LINKS.map(([label, href], index) => (
          <span className={index === 3 || index === 5 ? "nav-section-start" : ""} key={href}>
            <Link className={pathname === href ? "active" : ""} href={href}>{label}</Link>
          </span>
        ))}
      </nav>
    </header>
  );
}
