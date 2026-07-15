import { useEffect, useState } from "react";

const EYE_STATES = ["open", "closed"];
const MOUTH_STATES = ["idle", "small", "medium", "wide"];

function LayerImage({ source, className, visible = true }) {
  if (!source) return null;
  return (
    <img
      className={`avatar-asset ${className}`}
      src={source}
      alt=""
      draggable="false"
      style={{ display: visible ? "block" : "none" }}
    />
  );
}

export default function AvatarStage({ pack = "default", expression, scanKey, availableFiles = [] }) {
  const [assetUrls, setAssetUrls] = useState({});
  const filesKey = availableFiles.join("|");

  useEffect(() => {
    if (!scanKey || !availableFiles.length) {
      setAssetUrls({});
      return undefined;
    }

    let cancelled = false;
    const createdUrls = [];

    async function loadAsset(file) {
      try {
        const response = await fetch(`/avatar/${encodeURIComponent(pack)}/${file}?fresh=${encodeURIComponent(scanKey)}`, { cache: "no-store" });
        if (!response.ok) return null;
        const objectUrl = URL.createObjectURL(await response.blob());
        createdUrls.push(objectUrl);
        const image = new Image();
        image.src = objectUrl;
        await image.decode();
        return [file, objectUrl];
      } catch {
        return null;
      }
    }

    Promise.all(availableFiles.map(loadAsset)).then((entries) => {
      if (!cancelled) setAssetUrls(Object.fromEntries(entries.filter(Boolean)));
    });

    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filesKey, pack, scanKey]);

  const transform = `translate3d(${expression.x}px, ${expression.y}px, 0) rotate(${expression.roll}deg)`;

  const activeEyeFile = `eye-state-${expression.eyes}.png`;
  const activeMouthFile = `mouth-state-${expression.mouth}.png`;

  return (
    <div className="avatar-stage" aria-label="Live layered avatar preview">
      <div className="stage-grid" />
      <div className="avatar-composite" style={{ transform }}>
        <div className="layer-group body-group">
          <div className="placeholder-layer placeholder-body" style={{ display: assetUrls["body-base.png"] ? "none" : "block" }}>
            <div className="placeholder-torso" />
            <div className="placeholder-head" />
            <div className="placeholder-ear left" />
            <div className="placeholder-ear right" />
          </div>
          <LayerImage source={assetUrls["body-base.png"]} className="asset-body" />
        </div>

        <div className="layer-group hair-group">
          <div className="placeholder-layer placeholder-hair" style={{ display: assetUrls["hair-base.png"] ? "none" : "block" }}>
            <div className="hair-cap" />
            <div className="hair-lock one" />
            <div className="hair-lock two" />
            <div className="hair-lock three" />
          </div>
          <LayerImage source={assetUrls["hair-base.png"]} className="asset-hair" />
        </div>

        <div className="layer-group eyes-group">
          <div className={`placeholder-layer placeholder-eyes is-${expression.eyes}`} style={{ display: assetUrls[activeEyeFile] ? "none" : "block" }}>
            <i className="eye left" /><i className="eye right" />
            <b className="brow left" /><b className="brow right" />
          </div>
          {EYE_STATES.map((state) => {
            const file = `eye-state-${state}.png`;
            return <LayerImage key={file} source={assetUrls[file]} className="asset-eyes" visible={expression.eyes === state} />;
          })}
        </div>

        <div className="layer-group mouth-group">
          <div className={`placeholder-layer placeholder-mouth is-${expression.mouth}`} style={{ display: assetUrls[activeMouthFile] ? "none" : "block" }}>
            <i />
          </div>
          {MOUTH_STATES.map((state) => {
            const file = `mouth-state-${state}.png`;
            return <LayerImage key={file} source={assetUrls[file]} className="asset-mouth" visible={expression.mouth === state} />;
          })}
        </div>
      </div>
      <span className="stage-size">512 × 512</span>
    </div>
  );
}
