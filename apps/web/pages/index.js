import Head from "next/head";
import Link from "next/link";
import { ArrowUpRight, PencilRuler, Radio, Sparkles } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const avatarTools = [
  { title: "Studio", detail: "Load a layered avatar and animate it with your camera and microphone.", href: "/virtual-avatar/v1/studio", icon: Sparkles },
  { title: "Live", detail: "Set up a browser-source URL for your OBS scene.", href: "/virtual-avatar/v1/live", icon: Radio },
  { title: "Editor", detail: "Build, paint, import, and export the layered avatar PSD.", href: "/virtual-avatar/v1/editor", icon: PencilRuler },
];

export default function Home() {
  return (
    <>
      <Head><title>Creator Buddy</title><meta name="description" content="Local avatar tools for OBS creators." /></Head>
      <main className="creator-home">
        <header className="creator-home-intro">
          <p>Creator Buddy</p>
          <h1>Your virtual avatar workspace.</h1>
          <span>Make, animate, and take your avatar live in OBS without sending camera or microphone data away.</span>
        </header>
        <section aria-labelledby="virtual-avatar-heading">
          <div className="creator-section-heading"><div><p>Virtual Avatar</p><h2 id="virtual-avatar-heading">Create once. Go live anywhere.</h2></div></div>
          <div className="creator-tool-grid">
            {avatarTools.map(({ title, detail, href, icon: Icon }) => (
              <Link href={href} key={href} className="creator-tool-link">
                <Card className="h-full transition-colors hover:bg-accent">
                  <CardHeader>
                    <Icon className="size-5 text-primary" />
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{detail}</CardDescription>
                  </CardHeader>
                  <ArrowUpRight className="absolute right-4 top-4 size-4 text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
