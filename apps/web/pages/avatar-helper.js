import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { AVATAR_COMPONENTS, createAvatarPrompt, normalizePackName } from "@/lib/avatar";

const STORAGE_KEY = "stream-bro.avatar-helper.v1";

export default function AvatarHelper() {
  const [context, setContext] = useState("");
  const [pack, setPack] = useState("default");
  const [background, setBackground] = useState("white");
  const [generatedContext, setGeneratedContext] = useState("");
  const [copied, setCopied] = useState("");
  const [uploads, setUploads] = useState({});
  const [hydrated, setHydrated] = useState(false);
  const safePack = normalizePackName(pack) || "default";
  const prompts = useMemo(
    () => AVATAR_COMPONENTS.map((component) => ({ ...component, prompt: createAvatarPrompt(component, generatedContext, safePack, background) })),
    [background, generatedContext, safePack],
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (saved) {
        setContext(saved.context || "");
        setPack(normalizePackName(saved.pack || "default") || "default");
        setBackground(saved.background === "transparent" ? "transparent" : "white");
        setGeneratedContext(saved.generatedContext || "");
        setUploads(Object.fromEntries(Object.entries(saved.uploads || {}).map(([key, value]) => [
          key.replace(/-1\.png$/, ".png"),
          value?.state === "saving" ? { state: "error", message: "Upload was interrupted. Choose the file again." } : value,
        ])));
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      context,
      pack: safePack,
      background,
      generatedContext,
      uploads,
    }));
  }, [background, context, generatedContext, hydrated, safePack, uploads]);

  function generatePrompts(event) {
    event.preventDefault();
    setPack(safePack);
    setGeneratedContext(context.trim());
    setCopied("");
  }

  async function copyPrompt(file, prompt) {
    await navigator.clipboard.writeText(prompt);
    setCopied(file);
    window.setTimeout(() => setCopied((current) => current === file ? "" : current), 1600);
  }

  async function saveImage(file, image) {
    if (!image) return;
    const uploadKey = `${safePack}/${file}`;
    setUploads((old) => ({ ...old, [uploadKey]: { state: "saving", message: "Saving…" } }));
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read the image."));
        reader.readAsDataURL(image);
      });
      const response = await fetch("/api/avatar-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: safePack, filename: file, dataUrl }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save the image.");
      setUploads((old) => ({ ...old, [uploadKey]: { state: "saved", message: "Saved" } }));
    } catch (error) {
      setUploads((old) => ({ ...old, [uploadKey]: { state: "error", message: error.message } }));
    }
  }

  return (
    <>
      <Head>
        <title>Avatar Prompt Helper — Stream Bro</title>
        <meta name="description" content="Create compatible prompts and save layered avatar images." />
      </Head>
      <div className="site-shell helper-page">
        <SiteHeader helper />
        <main className="helper-main wrap">
          <section className="helper-hero">
            <div>
              <p className="eyebrow"><span /> Avatar Prompt Helper</p>
              <h1>One character.<br /><em>Eight clean layers.</em></h1>
            </div>
            <p>Describe the character once. Copy each locked prompt into your image tool, then save the result directly into its Stream Bro avatar pack.</p>
          </section>

          <form className="prompt-builder" onSubmit={generatePrompts}>
            <label className="context-field">
              <span>Character context</span>
              <textarea
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="Example: Momo, a cozy forest alchemist; soft anime style, moss-green hoodie, warm brown skin, playful but calm."
                required
              />
              <small>Include the name, theme, clothes, colors, mood, and visual style.</small>
            </label>
            <div className="prompt-options">
              <label>
                <span>Avatar pack</span>
                <input value={pack} onChange={(event) => setPack(normalizePackName(event.target.value))} placeholder="default" required />
                <small>Saves to public/avatar/{safePack}/</small>
              </label>
              <fieldset className="background-choice">
                <legend>Generated background</legend>
                <div>
                  <label>
                    <input type="radio" name="background" value="white" checked={background === "white"} onChange={() => setBackground("white")} />
                    <span>White</span>
                  </label>
                  <label>
                    <input type="radio" name="background" value="transparent" checked={background === "transparent"} onChange={() => setBackground("transparent")} />
                    <span>Transparent</span>
                  </label>
                </div>
                <small>White works with more image models. Remove it before using the image as a live layer.</small>
              </fieldset>
              <button className="button button-primary" type="submit">Generate 8 prompts <span>↓</span></button>
            </div>
          </form>

          {generatedContext ? (
            <section className="prompt-results">
              <div className="results-heading">
                <div>
                  <p className="eyebrow"><span /> Pack: {safePack}</p>
                  <h2>Generate in this order.</h2>
                </div>
                <p>Start with the body. When possible, attach it as a reference for the next seven images.</p>
              </div>

              <div className="prompt-list">
                {prompts.map((item, index) => {
                  const upload = uploads[`${safePack}/${item.file}`];
                  return (
                    <article className="prompt-card" key={item.file}>
                      <header>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <div><h3>{item.title}</h3><code>{item.file}</code></div>
                        <button type="button" onClick={() => copyPrompt(item.file, item.prompt)}>{copied === item.file ? "Copied" : "Copy prompt"}</button>
                      </header>
                      <textarea value={item.prompt} readOnly aria-label={`${item.title} prompt`} />
                      <footer>
                        <p>For live layers, use a square PNG with white removed. 512×512 is recommended.</p>
                        <label className={`upload-button ${upload?.state || ""}`}>
                          <input type="file" accept="image/png" onChange={(event) => { saveImage(item.file, event.target.files?.[0]); event.target.value = ""; }} />
                          {upload?.message || `Save as ${item.file}`}
                        </label>
                      </footer>
                      {upload?.state === "error" && <p className="upload-error" role="alert">{upload.message}</p>}
                    </article>
                  );
                })}
              </div>
              <div className="helper-finish">
                <p>Finished the pack?</p>
                <Link className="button button-primary" href="/avatar">Open Avatar Studio <span>↗</span></Link>
              </div>
            </section>
          ) : (
            <section className="helper-empty">
              <span>01—08</span>
              <p>Your component prompts will appear here.</p>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
