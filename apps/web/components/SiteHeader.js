import Link from "next/link";

export default function SiteHeader({ studio = false, helper = false }) {
  return (
    <header className="site-header wrap">
      <Link className="brand-mark" href="/" aria-label="Stream Bro home">
        <i>SB</i> Stream Bro
      </Link>
      <nav aria-label="Main navigation">
        <Link className={studio ? "active" : ""} href="/avatar">Avatar Studio</Link>
        <Link className={helper ? "active" : ""} href="/avatar-helper">Prompt Helper</Link>
        <a href="https://obsproject.com/" target="_blank" rel="noreferrer">OBS guide</a>
      </nav>
      <Link className="header-cta" href="/avatar">Launch studio <span>↗</span></Link>
    </header>
  );
}
