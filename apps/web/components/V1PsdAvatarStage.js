function visible(name, expression) {
  if (name.startsWith("eye-state-")) return name === `eye-state-${expression.eyes}.png`;
  if (name.startsWith("mouth-state-")) return name === `mouth-state-${expression.mouth}.png`;
  return true;
}

export default function V1PsdAvatarStage({ model, expression }) {
  if (!model) {
    return <div className="psd-stage psd-stage-empty compact-empty"><span>PSD</span><h2>Load V1 PSD</h2></div>;
  }

  const transform = `translate3d(${expression.x}px, ${expression.y}px, 0) rotate(${expression.roll}deg)`;
  return (
    <div className="psd-stage" style={{ aspectRatio: `${model.width} / ${model.height}` }} aria-label="V1 PSD avatar preview">
      <div className="stage-grid" />
      <div className="v1-psd-composite" style={{ transform }}>
        {model.layers.map((layer) => (
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
        ))}
      </div>
      <span className="stage-size">{model.width} × {model.height}</span>
    </div>
  );
}
