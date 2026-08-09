import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Camera, CircleStop, FileUp, Mic, PencilRuler, Radio, Video } from "lucide-react";
import StudioWorkspace from "@/components/StudioWorkspace";
import V1PsdAvatarStage from "@/components/V1PsdAvatarStage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { AUDIO_VOWEL_CONFIG } from "@/lib/audio-vowel";
import {
  MOUTH_ANIMATION_MODES,
  VIDEO_MOUTH_STATES,
  VOWEL_MOUTH_STATES,
  mouthModeUsesMicrophone,
  normalizeMouthMode,
} from "@/lib/avatar-mouth";
import { useAvatarTracking } from "@/lib/avatar-tracking";
import {
  V1_EMPTY_EXPRESSION,
  V1_PSD_ALL_LAYER_NAMES,
  getV1PsdLayerSpec,
  normalizeV1PsdLayerName,
} from "@/lib/avatar-v1-psd";
import { readNamedPsd, revokePsdModel } from "@/lib/psd-loader";

function trackingMessage({ model, requested, state, mouthMode, loadError }) {
  if (loadError) return loadError;
  if (!model) return "Load an avatar PSD";
  if (!requested) return "PSD ready · manual preview";
  if (state === "starting") return "Requesting camera and tracker…";
  if (state === "searching") return "Camera live · looking for a face";
  if (state === "blocked") return `${mouthModeUsesMicrophone(mouthMode) ? "Camera or microphone" : "Camera"} blocked · manual preview still works`;
  return `Tracking live · ${MOUTH_ANIMATION_MODES[mouthMode].label.toLowerCase()}`;
}

export default function AvatarV1Studio() {
  const psdInputRef = useRef(null);
  const modelRef = useRef(null);
  const [model, setModel] = useState(null);
  const [manualExpression, setManualExpression] = useState(V1_EMPTY_EXPRESSION);
  const [mouthMode, setMouthMode] = useState("camera");
  const [gate, setGate] = useState(AUDIO_VOWEL_CONFIG.defaultGate);
  const [trackingRequested, setTrackingRequested] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const tracking = useAvatarTracking({
    enabled: trackingRequested && Boolean(model),
    mouthMode,
    gate,
  });

  useEffect(() => () => revokePsdModel(modelRef.current), []);

  async function loadPsd(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setTrackingRequested(false);
    setLoadError("");
    setIsLoading(true);
    try {
      const next = await readNamedPsd(file, {
        names: V1_PSD_ALL_LAYER_NAMES,
        normalize: normalizeV1PsdLayerName,
        getSpec: getV1PsdLayerSpec,
      });
      revokePsdModel(modelRef.current);
      modelRef.current = next;
      setModel(next);
      setManualExpression(V1_EMPTY_EXPRESSION);
    } catch (error) {
      setLoadError(error?.message || "Could not read this PSD");
    }
    finally { setIsLoading(false); }
  }

  function selectMouthMode(next) {
    const normalized = normalizeMouthMode(next);
    setTrackingRequested(false);
    setMouthMode(normalized);
    setManualExpression((current) => ({ ...current, mouth: "idle" }));
  }

  function setManual(next) {
    setTrackingRequested(false);
    setManualExpression((current) => ({ ...current, ...next }));
  }

  const foundCount = model ? V1_PSD_ALL_LAYER_NAMES.length - model.missing.length : 0;
  const activeExpression = trackingRequested ? tracking.expression : manualExpression;
  const trackingLive = trackingRequested && tracking.status === "tracking";
  const status = trackingMessage({ model, requested: trackingRequested, state: tracking.status, mouthMode, loadError });
  const usesMicrophone = mouthModeUsesMicrophone(mouthMode);
  const manualMouths = mouthMode === "vowel" ? VOWEL_MOUTH_STATES : VIDEO_MOUTH_STATES;
  const meter = Math.min(100, (tracking.audioStats.level / Math.max(gate * 5, 0.001)) * 100);

  return (
    <>
      <Head><title>Avatar Studio — Creator Buddy</title></Head>
      <StudioWorkspace
        status={status}
        live={trackingLive}
        meta={model ? `${foundCount}/14 contract layers ready` : "No PSD loaded"}
        stage={<V1PsdAvatarStage model={model} expression={activeExpression} />}
        footer={<><span>{activeExpression.eyes} eyes</span><span>{activeExpression.mouth.toUpperCase()} mouth</span><span>{MOUTH_ANIMATION_MODES[mouthMode].label}</span></>}
        toolbar={<>
          <input ref={psdInputRef} className="sr-only" type="file" accept=".psd,image/vnd.adobe.photoshop" onChange={loadPsd} disabled={isLoading} />
          <Button type="button" variant="outline" size="sm" onClick={() => psdInputRef.current?.click()} disabled={isLoading}>
            <FileUp />{isLoading ? "Reading PSD…" : model ? "Replace PSD" : "Load PSD"}
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <span className="flex-1" />
          <Button variant="outline" size="sm" render={<Link href="/virtual-avatar/v1/editor" />}><PencilRuler />Editor</Button>
          <Button variant="outline" size="sm" render={<Link href="/virtual-avatar/v1/live" />}><Radio />Live</Button>
          {trackingRequested ? (
            <Button variant="destructive" size="sm" onClick={() => setTrackingRequested(false)}><CircleStop />Stop</Button>
          ) : (
            <Button size="sm" onClick={() => setTrackingRequested(true)} disabled={!model}><Camera />Start tracking</Button>
          )}
        </>}
        inspector={<>
          <header className="avatar-studio-panel-header"><div><h2>Expression</h2><p>One shared mouth system</p></div><Badge variant="outline">{trackingRequested ? tracking.status : "manual"}</Badge></header>
          <ScrollArea className="avatar-studio-panel-scroll">
            <div className="avatar-studio-panel-content">
              <section className="avatar-studio-control-group">
                <span>Mouth animation</span>
                <Select value={mouthMode} onValueChange={(value) => value && selectMouthMode(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MOUTH_ANIMATION_MODES).map(([value, option]) => <SelectItem value={value} key={value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[11px] leading-4 text-muted-foreground">{MOUTH_ANIMATION_MODES[mouthMode].description}</p>
              </section>
              {usesMicrophone && <section className="avatar-studio-control-group">
                <span>Voice sensitivity <b>{gate.toFixed(3)}</b></span>
                <Slider min={0.006} max={0.06} step={0.002} value={gate} onValueChange={setGate} aria-label="Voice sensitivity" />
              </section>}
              <section className="avatar-studio-control-group">
                <span>Manual eyes</span>
                <Select value={activeExpression.eyes} onValueChange={(value) => value && setManual({ eyes: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="closed">Blink</SelectItem></SelectContent>
                </Select>
              </section>
              <section className="avatar-studio-control-group">
                <span>Manual mouth</span>
                <Select value={activeExpression.mouth} onValueChange={(value) => value && setManual({ mouth: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{manualMouths.map((mouth) => <SelectItem value={mouth} key={mouth}>{mouth.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </section>
            </div>
          </ScrollArea>
        </>}
        layers={<>
          <header className="avatar-studio-panel-header"><div><h2>Layer contract</h2><p>{foundCount}/14 ready</p></div></header>
          <ScrollArea className="avatar-studio-panel-scroll">
            <ul className="avatar-studio-layer-list">
              {V1_PSD_ALL_LAYER_NAMES.map((name) => {
                const found = model?.layers.some((layer) => layer.name === name);
                return <li className={found ? "is-ready" : ""} key={name}><i /><span>{name}</span><small>{found ? "Ready" : "Missing"}</small></li>;
              })}
            </ul>
          </ScrollArea>
        </>}
        camera={<>
          <header><span><Video />Camera</span><Badge variant={trackingLive ? "default" : "outline"}>{trackingLive ? "On" : trackingRequested ? "Starting" : "Off"}</Badge></header>
          <div className="avatar-studio-camera-feed">
            <video ref={tracking.videoRef} muted playsInline />
            {!trackingRequested && <div className="avatar-studio-camera-empty"><Video /><span>Camera is off</span></div>}
          </div>
          {usesMicrophone && <footer><Mic />{trackingRequested ? `${activeExpression.mouth.toUpperCase()} · ${mouthMode === "vowel" && tracking.audioStats.f1 ? `${Math.round(tracking.audioStats.f1)} / ${Math.round(tracking.audioStats.f2)} Hz` : "Listening"}` : "Microphone idle"}<i style={{ width: `${meter}%` }} /></footer>}
        </>}
      />
    </>
  );
}
