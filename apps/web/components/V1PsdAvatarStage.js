function visible(name, expression) {
  if (name.startsWith("eye-state-")) return name === `eye-state-${expression.eyes}.png`;
  if (name.startsWith("mouth-state-")) return name === `mouth-state-${expression.mouth}.png`;
  return true;
}

function LayerImages({ layers, model, expression }) {
  return layers.map((layer) => (
    <img
      key={layer.name}
      src={layer.url}
      alt=""
      draggable="false"
      style={{
        display: visible(layer.name, expression) ? "block" : "none",
        left: `${(layer.left / model.width) * 100}%`,
        top: `${(layer.top / model.height) * 100}%`,
        width: `${(layer.width / model.width) * 100}%`,
        height: `${(layer.height / model.height) * 100}%`,
        zIndex: layer.z,
      }}
    />
  ));
}

function motion(x, y, roll) {
  return `translate3d(${x}px, ${y}px, 0) rotate(${roll}deg)`;
}

export default function V1PsdAvatarStage({ model, expression }) {
  if (!model) {
    return <div className="psd-stage psd-stage-empty compact-empty"><span>PSD</span><h2>Load Avatar V1 PSD</h2></div>;
  }

  const body = model.layers.filter((layer) => layer.name === "body-base.png");
  const hair = model.layers.filter((layer) => layer.name === "hair-base.png");
  const head = model.layers.filter((layer) => layer.name !== "body-base.png" && layer.name !== "hair-base.png");
  const bodyTransform = motion(expression.bodyX, expression.bodyY, expression.bodyRoll);
  const headTransform = motion(expression.bodyX + expression.headX, expression.bodyY + expression.headY, expression.bodyRoll + expression.headRoll);
  const hairTransform = motion(
    expression.bodyX + expression.headX + expression.hairX,
    expression.bodyY + expression.headY + expression.hairY,
    expression.bodyRoll + expression.headRoll + expression.hairRoll,
  );

  return (
    <div className="psd-stage" style={{ aspectRatio: `${model.width} / ${model.height}` }} aria-label="Avatar V1 PSD preview">
      <div className="stage-grid" />
      <div className="v1-psd-composite">
        <div className="v1-motion-group v1-body-group" style={{ transform: bodyTransform }}><LayerImages layers={body} model={model} expression={expression} /></div>
        <div className="v1-motion-group v1-head-group" style={{ transform: headTransform }}><LayerImages layers={head} model={model} expression={expression} /></div>
        <div className="v1-motion-group v1-hair-group" style={{ transform: hairTransform }}><LayerImages layers={hair} model={model} expression={expression} /></div>
      </div>
      <span className="stage-size">{model.width} × {model.height}</span>
    </div>
  );
}
