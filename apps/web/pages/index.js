import Head from "next/head";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

const groups = [
  {
    title: "Studios",
    items: [
      ["Avatar V1 Basic", "8 PNG files", "/studio/avatar-v1-basic"],
      ["Avatar V1 PSD", "Same 8 layers in one PSD", "/studio/avatar-v1-psd"],
      ["Avatar V1 PSD Voice", "Camera + video or microphone mouth", "/studio/avatar-v1-psd-voice"],
      ["Avatar V2", "Detailed PSD and robust tracking", "/studio/avatar-v2"],
    ],
  },
  {
    title: "PSD Editors",
    items: [
      ["Avatar V1 Editor", "Shared camera + voice PSD", "/editor/psd/avatar-v1"],
      ["Avatar V2 Editor", "Detailed facial-part PSD", "/editor/psd/avatar-v2"],
    ],
  },
  {
    title: "Tools",
    items: [["Prompt Helper", "Generate aligned V1 PNG prompts", "/avatar-helper"]],
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
