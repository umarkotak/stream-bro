import { useEffect } from "react";
import Link from "next/link";
import { PsdTemplateEditor } from "@/components/PsdTemplateEditor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
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
    <Dialog open onOpenChange={(open) => { if (!open) closeModal(); }}>
      <DialogContent>
        <form onSubmit={(event) => { event.preventDefault(); onConfirm(); }}>
          <DialogHeader>
            <DialogTitle>{savedPack ? "Avatar saved" : "Save to OBS"}</DialogTitle>
            <DialogDescription>{savedPack
              ? `The ${savedPack} pack is ready for the Avatar Live browser source.`
              : "Save the filled PNG layers as a public pack. It replaces any pack with the same name."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!savedPack && <div className="grid gap-1.5"><Label htmlFor="avatar-pack-name">Pack name</Label><Input id="avatar-pack-name" autoFocus value={packName} onChange={(event) => onPackNameChange(event.target.value)} disabled={saving} placeholder="my-avatar" maxLength="48" /><p className="text-xs text-muted-foreground">public/avatar/{packName || "my-avatar"} · {filledCount}/{totalLayers} layers filled</p></div>}
            <Progress value={savedPack ? 100 : saving ? 50 : 0}><ProgressLabel>{progress || "Nothing is saved until you confirm."}</ProgressLabel><ProgressValue /></Progress>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeModal}>{savedPack ? "Close" : "Cancel"}</Button>
            {savedPack
              ? <Button render={<Link href="/virtual-avatar/v1/live" />}>Open Avatar Live</Button>
              : <Button type="submit" disabled={saving || !packName || !filledCount}>{saving ? "Saving…" : "Confirm save"}</Button>}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AvatarV1PsdEditor() {
  return (
    <PsdTemplateEditor
      layerSpecs={V1_PSD_EDITOR_LAYER_SPEC}
      version="Avatar"
      studioHref="/virtual-avatar/v1/studio"
      defaultDocumentName="creator-buddy-avatar-v1"
      alternate={isAlternate}
      preview={previewVisible}
      publicAvatarExport={AvatarV1ObsExport}
      directTransformHandles
    />
  );
}
