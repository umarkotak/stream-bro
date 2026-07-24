import { useEffect } from "react";
import { PsdTemplateEditor } from "../../avatar-v2-editor";
import { V1_PSD_EDITOR_LAYER_SPEC } from "@/lib/avatar-v1-psd";

function isAlternate(name) {
  return name === "eye-state-closed.png" || (name.startsWith("mouth-state-") && name !== "mouth-state-idle.png");
}

function previewVisible(name, selectedName) {
  if (name.startsWith("eye-state-")) {
    return selectedName.startsWith("eye-state-") ? name === selectedName : name === "eye-state-open.png";
  }
  if (name.startsWith("mouth-state-")) {
    return selectedName.startsWith("mouth-state-") ? name === selectedName : name === "mouth-state-idle.png";
  }
  return true;
}

function AvatarV1ObsExport({
  saving,
  packName,
  onPackNameChange,
  progress,
  savedPack,
  filledCount,
  totalLayers,
  onConfirm,
  onReset,
  onClose,
}) {
  function closeModal() {
    onReset();
    onClose();
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className="avatar-export-dialog-backdrop">
      <button
        type="button"
        className="avatar-export-dialog-dismiss"
        aria-label="Close Save to OBS"
        onClick={closeModal}
      />
      <form
        className="avatar-export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-export-title"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <header>
          <span>OBS avatar pack</span>
          <h2 id="avatar-export-title">{savedPack ? "Avatar saved" : "Save editor layers"}</h2>
          <p>{savedPack
            ? `The ${savedPack} pack is ready for the transparent OBS overlay.`
            : "Choose a pack name. Confirming will replace that pack with the filled editor layers."}</p>
        </header>

        {!savedPack && (
          <label>
            <span>Pack name</span>
            <input
              autoFocus
              value={packName}
              onChange={(event) => onPackNameChange(event.target.value)}
              disabled={saving}
              placeholder="my-avatar"
              maxLength="48"
            />
            <small>public/avatar/{packName || "my-avatar"} · {filledCount}/{totalLayers} layers filled</small>
          </label>
        )}

        <div className={`avatar-export-progress ${savedPack ? "is-success" : ""}`}>
          <i />
          <span>{progress || "Nothing is saved until you click Confirm save."}</span>
        </div>

        <footer>
          <button type="button" className="is-quiet" onClick={closeModal}>{savedPack ? "Close" : "Cancel"}</button>
          {savedPack
            ? <a href="/overlay">Open OBS setup ↗</a>
            : <button type="submit" disabled={saving || !packName || !filledCount}>{saving ? "Saving…" : "Confirm save"}</button>}
        </footer>
      </form>
    </div>
  );
}

export default function AvatarV1PsdEditor() {
  return (
    <PsdTemplateEditor
      layerSpecs={V1_PSD_EDITOR_LAYER_SPEC}
      version="V1"
      studioHref="/studio/avatar-v1"
      defaultDocumentName="stream-bro-avatar-v1"
      alternate={isAlternate}
      preview={previewVisible}
      publicAvatarExport={AvatarV1ObsExport}
    />
  );
}
