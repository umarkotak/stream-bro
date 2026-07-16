import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { AVATAR_COMPONENTS, createAvatarLayerPrompt, createAvatarMasterPrompt } from "@/lib/avatar";

const STORAGE_KEY = "stream-bro.avatar-helper.v1";
const ALL_FILES = AVATAR_COMPONENTS.map((component) => component.file);
const GROUPS = [
  { title: "Base", files: ["body-base.png", "head-base.png", "hair-base.png"] },
  { title: "Eyes", files: ["eye-state-open.png", "eye-state-closed.png"] },
  { title: "Video mouth", files: ["mouth-state-idle.png", "mouth-state-small.png", "mouth-state-medium.png", "mouth-state-wide.png"] },
  { title: "Voice A I U E O", files: ["mouth-state-a.png", "mouth-state-i.png", "mouth-state-u.png", "mouth-state-e.png", "mouth-state-o.png"] },
];

export default function AvatarHelper() {
  const [context, setContext] = useState("");
  const [background, setBackground] = useState("white");
  const [generatedContext, setGeneratedContext] = useState("");
  const [selectedFiles, setSelectedFiles] = useState(ALL_FILES);
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const selected = useMemo(() => new Set(selectedFiles), [selectedFiles]);
  const selectedComponents = useMemo(
    () => AVATAR_COMPONENTS.filter((component) => selected.has(component.file)),
    [selected],
  );
  const masterPrompt = useMemo(
    () => generatedContext ? createAvatarMasterPrompt(generatedContext, background) : "",
    [background, generatedContext],
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (saved) {
        setContext(saved.context || "");
        setBackground(saved.background === "transparent" ? "transparent" : "white");
        setGeneratedContext(saved.generatedContext || "");
        if (Array.isArray(saved.selectedFiles)) {
          const valid = saved.selectedFiles.filter((file) => ALL_FILES.includes(file));
          setSelectedFiles(valid);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ context, background, generatedContext, selectedFiles }));
  }, [background, context, generatedContext, hydrated, selectedFiles]);

  function preparePrompts(event) {
    event.preventDefault();
    setGeneratedContext(context.trim());
    setCopied("");
    setCopyError("");
  }

  function toggleFile(file) {
    setSelectedFiles((current) => current.includes(file) ? current.filter((item) => item !== file) : [...current, file]);
  }

  async function copyPrompt(key, prompt) {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyError("");
      setCopied(key);
      window.setTimeout(() => setCopied((current) => current === key ? "" : current), 1600);
    } catch {
      setCopyError("Clipboard was blocked. Allow clipboard access and try again.");
    }
  }

  return (
    <>
      <Head>
        <title>Avatar V1 Prompt Helper — Stream Bro</title>
        <meta name="description" content="Create one master avatar prompt and selected V1 layer prompts." />
      </Head>
      <div className="site-shell app-shell">
        <SiteHeader />
        <main className="app-main helper-v1-main">
          <header className="app-page-bar">
            <div><h1>Avatar V1 · Prompt Helper</h1><span>One master reference, then only the layers you need</span></div>
            <Link href="/editor/psd/avatar-v1">Open V1 PSD editor ↗</Link>
          </header>

          <div className="helper-v1-layout">
            <section className="master-prompt-panel">
              <header><span>01</span><div><h2>Master character</h2><p>Create the complete neutral avatar first.</p></div></header>
              <form onSubmit={preparePrompts}>
                <label className="master-context"><span>Character context</span><textarea value={context} onChange={(event) => setContext(event.target.value)} placeholder="Name, theme, clothes, colors, mood, and art style." required /></label>
                <fieldset className="background-choice">
                  <legend>Image background</legend>
                  <div>
                    <label><input type="radio" name="background" value="white" checked={background === "white"} onChange={() => setBackground("white")} /><span>White</span></label>
                    <label><input type="radio" name="background" value="transparent" checked={background === "transparent"} onChange={() => setBackground("transparent")} /><span>Transparent</span></label>
                  </div>
                  <small>White works with more image models. Remove it before placing the art in the PSD.</small>
                </fieldset>
                <button className="button button-primary" type="submit">Prepare prompts</button>
              </form>

              <div className={`master-copy-card ${masterPrompt ? "is-ready" : ""}`}>
                <div><b>Master reference prompt</b><span>{masterPrompt ? "Ready to copy" : "Add context first"}</span></div>
                <button type="button" disabled={!masterPrompt} onClick={() => copyPrompt("master", masterPrompt)}>{copied === "master" ? "Copied" : "Copy master"}</button>
              </div>
              <p className="master-note">Generate the master image in your image tool. Attach that same image as the reference for every layer prompt below.</p>
              {copyError && <p className="helper-copy-error" role="alert">{copyError}</p>}
            </section>

            <section className="layer-prompt-panel">
              <header className="layer-prompt-head"><div><span>02</span><div><h2>Derivative layers</h2><p>Select only what you want to generate.</p></div></div><b>{selectedFiles.length}/14 selected</b></header>
              <div className="layer-select-actions"><button type="button" onClick={() => setSelectedFiles(ALL_FILES)}>Select all</button><button type="button" onClick={() => setSelectedFiles([])}>Clear</button></div>
              <div className="layer-picker">
                {GROUPS.map((group) => (
                  <fieldset key={group.title}>
                    <legend>{group.title}</legend>
                    {group.files.map((file) => {
                      const component = AVATAR_COMPONENTS.find((item) => item.file === file);
                      return <label key={file}><input type="checkbox" checked={selected.has(file)} onChange={() => toggleFile(file)} /><span><b>{component.title}</b><code>{file}</code></span></label>;
                    })}
                  </fieldset>
                ))}
              </div>

              <div className="derivative-list">
                {!generatedContext ? <div className="derivative-empty"><b>Prepare the master first</b><span>Layer copy buttons will appear here.</span></div> : !selectedComponents.length ? <div className="derivative-empty"><b>No layers selected</b><span>Choose one or more V1 layers above.</span></div> : selectedComponents.map((component, index) => {
                  const prompt = createAvatarLayerPrompt(component, generatedContext, background);
                  return (
                    <article key={component.file}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div><h3>{component.title}</h3><code>{component.file}</code></div>
                      <button type="button" onClick={() => copyPrompt(component.file, prompt)}>{copied === component.file ? "Copied" : "Copy prompt"}</button>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
