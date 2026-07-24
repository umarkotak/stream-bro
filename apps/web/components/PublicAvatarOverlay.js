import { OVERLAY_LAYER_FILES } from "@/lib/avatar-overlay";
import { getV1MotionTransforms } from "@/lib/avatar-v1-psd";

const LAYER_Z = {
  "body-base.png": 10,
  "head-base.png": 15,
  "hair-base.png": 20,
  "eye-state-open.png": 30,
  "eye-state-closed.png": 30,
  "mouth-state-idle.png": 40,
  "mouth-state-small.png": 40,
  "mouth-state-medium.png": 40,
  "mouth-state-wide.png": 40,
  "mouth-state-a.png": 40,
  "mouth-state-i.png": 40,
  "mouth-state-u.png": 40,
  "mouth-state-e.png": 40,
  "mouth-state-o.png": 40,
};

function isVisible(file, expression) {
  if (file.startsWith("eye-state-")) return file === `eye-state-${expression.eyes}.png`;
  if (file.startsWith("mouth-state-")) return file === `mouth-state-${expression.mouth}.png`;
  return true;
}

export default function PublicAvatarOverlay({
  pack,
  files = OVERLAY_LAYER_FILES,
  expression,
  scale = 100,
  x = 50,
  y = 52,
  revision = "1",
  status = "static",
}) {
  const fileSet = new Set(files);
  const availableFiles = OVERLAY_LAYER_FILES.filter((file) => fileSet.has(file));
  const bodyFiles = availableFiles.filter((file) => file === "body-base.png");
  const hairFiles = availableFiles.filter((file) => file === "hair-base.png");
  const headFiles = availableFiles.filter((file) => file !== "body-base.png" && file !== "hair-base.png");
  const hasSeparateHead = fileSet.has("head-base.png");
  const transforms = getV1MotionTransforms(expression);
  const headTransform = hasSeparateHead ? transforms.head : transforms.body;
  const hairTransform = hasSeparateHead ? transforms.hair : transforms.body;
  const placementTransform = `translate(-50%, -50%) scale(${scale / 100})`;

  function renderLayers(layerFiles) {
    return layerFiles.map((file) => (
      <img
        key={file}
        src={`/avatar/${encodeURIComponent(pack)}/${encodeURIComponent(file)}?overlay=${encodeURIComponent(revision)}`}
        alt=""
        draggable="false"
        onError={(event) => { event.currentTarget.style.display = "none"; }}
        style={{
          display: isVisible(file, expression) ? "block" : "none",
          zIndex: LAYER_Z[file],
        }}
      />
    ));
  }

  return (
    <div className="public-avatar-overlay" data-tracking-status={status} aria-label={`Avatar overlay model ${pack}`}>
      <div className="public-avatar-model" style={{ left: `${x}%`, top: `${y}%`, transform: placementTransform }}>
        <div className="v1-motion-group v1-body-group" style={{ transform: transforms.body }}>{renderLayers(bodyFiles)}</div>
        <div className="v1-motion-group v1-head-group" style={{ transform: headTransform }}>{renderLayers(headFiles)}</div>
        <div className="v1-motion-group v1-hair-group" style={{ transform: hairTransform }}>{renderLayers(hairFiles)}</div>
      </div>
    </div>
  );
}
