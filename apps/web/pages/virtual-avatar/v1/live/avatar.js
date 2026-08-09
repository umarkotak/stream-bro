import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import PublicAvatarOverlay from "@/components/PublicAvatarOverlay";
import {
  DEFAULT_OVERLAY_CONFIG,
  fetchOverlayPacks,
  overlayConfigFromQuery,
} from "@/lib/avatar-overlay";
import { useAvatarTracking } from "@/lib/avatar-tracking";

export default function AvatarOverlayRenderer() {
  const router = useRouter();
  const [config, setConfig] = useState(DEFAULT_OVERLAY_CONFIG);
  const [files, setFiles] = useState([]);
  const [ready, setReady] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    if (!router.query.pack) {
      router.replace("/virtual-avatar/v1/live");
      return;
    }
    setConfig(overlayConfigFromQuery(router.query));
    setReady(true);
  }, [router.asPath, router.isReady]);

  useEffect(() => {
    if (!ready) return undefined;
    let active = true;
    setAssetsReady(false);
    fetchOverlayPacks()
      .then((packs) => {
        const pack = packs.find((item) => item.id === config.pack);
        if (!active) return;
        setFiles(pack?.files || []);
        setAssetsReady(true);
      })
      .catch(() => {
        if (active) {
          setFiles([]);
          setAssetsReady(true);
        }
      });
    return () => { active = false; };
  }, [config.pack, ready]);

  const tracking = useAvatarTracking({ enabled: ready && config.tracking });
  const revision = Array.isArray(router.query.v) ? router.query.v[0] : router.query.v || "1";

  return (
    <>
      <Head>
        <title>Avatar Overlay — Creator Buddy</title>
        <meta name="robots" content="noindex" />
      </Head>
      <style jsx global>{`
        html, body, #__next {
          width: 100%;
          height: 100%;
          margin: 0;
          overflow: hidden;
          background: #00ff00 !important;
        }
      `}</style>
      <main className="avatar-overlay-output" aria-label="Creator Buddy OBS avatar overlay">
        {ready && assetsReady && <PublicAvatarOverlay
          pack={config.pack}
          files={files}
          expression={tracking.expression}
          scale={config.scale}
          x={config.x}
          y={config.y}
          revision={revision}
          status={tracking.status}
        />}
        <video className="overlay-tracking-video" ref={tracking.videoRef} muted playsInline aria-hidden="true" />
      </main>
    </>
  );
}
