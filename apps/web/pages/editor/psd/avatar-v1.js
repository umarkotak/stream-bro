import { PsdTemplateEditor } from "../../avatar-v2-editor";
import { V1_PSD_LAYER_SPEC } from "@/lib/avatar-v1-psd";

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

export default function AvatarV1PsdEditor() {
  return (
    <PsdTemplateEditor
      layerSpecs={V1_PSD_LAYER_SPEC}
      version="V1"
      studioHref="/studio/avatar-v1-psd"
      defaultDocumentName="stream-bro-avatar-v1"
      alternate={isAlternate}
      preview={previewVisible}
    />
  );
}
