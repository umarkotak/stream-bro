import Head from "next/head";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

const features = [
  {
    state: "Ready",
    title: "Avatar Studio",
    copy: "Turn your face and voice into a layered 2D avatar for OBS.",
    href: "/avatar",
    accent: "lime",
  },
  {
    state: "Ready",
    title: "Prompt Helper",
    copy: "Turn one character brief into eight aligned layer prompts and save each result.",
    href: "/avatar-helper",
    accent: "violet",
  },
  {
    state: "Next up",
    title: "OBS Scene Dock",
    copy: "Keep scene switches and stream actions close without clutter.",
    accent: "orange",
  },
  {
    state: "Idea",
    title: "Chat Moments",
    copy: "Pull good chat messages on screen when the moment is right.",
    accent: "violet",
  },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>Stream Bro — Your quiet streaming sidekick</title>
        <meta
          name="description"
          content="Local-first tools for expressive avatars and smoother OBS streams."
        />
      </Head>
      <div className="site-shell home-page">
        <SiteHeader />

        <main>
          <section className="hero wrap">
            <div className="hero-copy">
              <p className="eyebrow"><span /> Built for the other side of the camera</p>
              <h1>Show up on stream,<br /><em>your way.</em></h1>
              <p className="hero-lede">
                Stream Bro is a small, local-first toolkit that helps you feel more alive on
                camera—starting with an avatar that moves when you do.
              </p>
              <div className="hero-actions">
                <Link className="button button-primary" href="/avatar">
                  Open Avatar Studio <span aria-hidden="true">↗</span>
                </Link>
                <a className="text-link" href="#tools">See all tools <span aria-hidden="true">↓</span></a>
              </div>
            </div>

            <div className="hero-visual" aria-label="Layered avatar preview">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="hero-avatar">
                <div className="mini-body" />
                <div className="mini-head">
                  <div className="mini-hair" />
                  <div className="mini-eye left" />
                  <div className="mini-eye right" />
                  <div className="mini-mouth" />
                </div>
              </div>
              <div className="signal-chip signal-eyes"><i /> eyes <b>open</b></div>
              <div className="signal-chip signal-mouth"><i /> voice <b>listening</b></div>
              <div className="signal-chip signal-local"><span>⌁</span><b>stays local</b></div>
              <p className="visual-note">your expression<br />becomes the motion</p>
            </div>
          </section>

          <section className="proof-strip">
            <div className="wrap proof-grid">
              <p><strong>Private by default.</strong><br />Your camera stays in your browser.</p>
              <p><strong>Made for OBS.</strong><br />Simple scenes. Clean output.</p>
              <p><strong>Bring your own art.</strong><br />Drop in layers. Keep your style.</p>
            </div>
          </section>

          <section className="tools-section wrap" id="tools">
            <div className="section-heading">
              <div>
                <p className="eyebrow"><span /> Your stream toolkit</p>
                <h2>One home for the tools<br />behind your show.</h2>
              </div>
              <p>Start with your avatar. Add only what earns a place on your desk.</p>
            </div>

            <div className="feature-grid">
              {features.map((feature, index) => {
                const content = (
                  <>
                    <div className={`feature-mark ${feature.accent}`} aria-hidden="true">
                      {index === 0 ? "◉" : index === 1 ? "✎" : index === 2 ? "⌁" : "✦"}
                    </div>
                    <span className={`feature-state ${feature.state === "Ready" ? "is-ready" : ""}`}>
                      {feature.state}
                    </span>
                    <div>
                      <h3>{feature.title}</h3>
                      <p>{feature.copy}</p>
                    </div>
                    <span className="feature-arrow" aria-hidden="true">{feature.href ? "↗" : "—"}</span>
                  </>
                );

                return feature.href ? (
                  <Link className="feature-card" href={feature.href} key={feature.title}>{content}</Link>
                ) : (
                  <article className="feature-card is-muted" key={feature.title}>{content}</article>
                );
              })}
            </div>
          </section>
        </main>

        <footer className="wrap site-footer">
          <span className="brand-mark"><i>SB</i> Stream Bro</span>
          <p>Made for calmer, more expressive streams.</p>
          <span>Local-first · 2026</span>
        </footer>
      </div>
    </>
  );
}
