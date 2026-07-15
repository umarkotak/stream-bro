import { getLayerSpec } from "@/lib/avatar-v2";

function isSide(name, side) {
  return name.endsWith(`-${side}`);
}

function layerState(name, expression) {
  let visible = true;

  if (name.startsWith("mouth-")) {
    visible = name === `mouth-${expression.mouth}`;
  }

  if (name.startsWith("eye-lid-closed-")) {
    const side = isSide(name, "left") ? "left" : "right";
    visible = expression[`blink${side === "left" ? "Left" : "Right"}`] > 0.52;
  }

  if (name.startsWith("eye-white-") || name.startsWith("eye-ball-")) {
    const side = isSide(name, "left") ? "left" : "right";
    if (expression[`blink${side === "left" ? "Left" : "Right"}`] > 0.52) visible = false;
  }

  const x = expression.x || 0;
  const y = expression.y || 0;
  const roll = expression.roll || 0;
  let moveX = x;
  let moveY = y;
  let rotate = roll;

  if (name === "body" || name === "accessory-back") {
    moveX *= 0.2;
    moveY *= 0.12;
    rotate *= 0.1;
  } else if (name === "neck") {
    moveX *= 0.5;
    moveY *= 0.35;
    rotate *= 0.35;
  } else if (name.startsWith("hair-")) {
    moveX *= 1.08;
    moveY *= 0.95;
    rotate *= 1.12;
  }

  if (name.startsWith("eye-ball-")) {
    moveX += expression.gazeX || 0;
    moveY += expression.gazeY || 0;
  }

  if (name === "eyebrow-left") moveY += expression.browLeft || 0;
  if (name === "eyebrow-right") moveY += expression.browRight || 0;

  return {
    visible,
    transform: `translate3d(${moveX}px, ${moveY}px, 0) rotate(${rotate}deg)`,
  };
}

export default function PsdAvatarStage({ model, expression }) {
  if (!model) {
    return (
      <div className="psd-stage psd-stage-empty">
        <div className="stage-grid" />
        <span>PSD</span>
        <h2>Load your layered avatar</h2>
        <p>The file stays in this browser.</p>
      </div>
    );
  }

  return (
    <div className="psd-stage" style={{ aspectRatio: `${model.width} / ${model.height}` }} aria-label="Live PSD avatar preview">
      <div className="stage-grid" />
      <div className="psd-avatar-canvas">
        {model.layers.map((layer) => {
          const state = layerState(layer.name, expression);
          const spec = getLayerSpec(layer.name);
          return (
            <div
              className="psd-layer"
              key={layer.name}
              style={{
                display: state.visible ? "block" : "none",
                transform: state.transform,
                zIndex: spec?.z || layer.order,
              }}
            >
              <img
                src={layer.url}
                alt=""
                draggable="false"
                style={{
                  left: `${(layer.left / model.width) * 100}%`,
                  top: `${(layer.top / model.height) * 100}%`,
                  width: `${(layer.width / model.width) * 100}%`,
                  height: `${(layer.height / model.height) * 100}%`,
                }}
              />
            </div>
          );
        })}
      </div>
      <span className="stage-size">{model.width} × {model.height}</span>
    </div>
  );
}
