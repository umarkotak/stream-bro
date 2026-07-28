import Head from "next/head";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

const groups = [
  {
    title: "Studios",
    items: [
      ["Avatar V1", "Fluid 14-layer PSD tracking", "/studio/avatar-v1"],
      ["Avatar V2", "Detailed PSD and robust tracking", "/studio/avatar-v2"],
    ],
  },
  {
    title: "PSD Editors",
    items: [
      ["Avatar V1 Editor", "Build or import the 14-layer PSD", "/editor/psd/avatar-v1"],
      ["Avatar V2 Editor", "Detailed facial-part PSD", "/editor/psd/avatar-v2"],
    ],
  },
  {
    title: "Tools",
    items: [
      ["OBS Overlay", "Configure a transparent avatar browser source", "/overlay"],
      ["Prompt Builder", "Create, split, and export a V1 dress-up sheet", "/avatar-helper"],
    ],
  },
];

export default function Home() {
  return (
    <>
      <Head><title>Stream Bro</title><meta name="description" content="Local avatar tools for OBS." /></Head>
      <div className="site-shell compact-app"><SiteHeader />
        <main className="compact-main home-dashboard">
          <header className="compact-page-head"><div><h1>Stream Bro</h1><span>Local avatar tools for OBS</span></div></header>
          {groups.map((group) => (
            <section className="dashboard-group" key={group.title}>
              <h2>{group.title}</h2>
              <div className="dashboard-grid">
                {group.items.map(([title, detail, href]) => <Link href={href} key={href}><b>{title}</b><span>{detail}</span><i>↗</i></Link>)}
              </div>
            </section>
          ))}
        </main>
      </div>
    </>
  );
}
