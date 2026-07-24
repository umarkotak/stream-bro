import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { AVATAR_FILES, normalizePackName } from "@/lib/avatar";

const AVATAR_ROOT = `${process.cwd()}/public/avatar`;
const PACKS_FILE = `${process.cwd()}/public/avatar/packs.json`;
const PNG_SIGNATURE = "89504e470d0a1a0a";

export const config = {
  api: {
    bodyParser: { sizeLimit: "28mb" },
  },
};

async function listPacks() {
  try {
    const manifest = JSON.parse(await readFile(PACKS_FILE, "utf8"));
    if (Array.isArray(manifest.packs)) return manifest.packs;
  } catch {}
  return [{ id: "default", files: [] }];
}

async function recordPackFiles(pack, files) {
  const packs = await listPacks();
  const current = packs.find((item) => item.id === pack);
  const nextFiles = AVATAR_FILES.filter((file) => files.includes(file));
  if (current) {
    current.files = nextFiles;
  } else {
    packs.push({ id: pack, files: nextFiles });
  }
  packs.sort((left, right) => left.id.localeCompare(right.id));
  await writeFile(PACKS_FILE, `${JSON.stringify({ packs }, null, 2)}\n`);
}

async function recordSavedFile(pack, filename) {
  const packs = await listPacks();
  const current = packs.find((item) => item.id === pack);
  await recordPackFiles(pack, [...(current?.files || []), filename]);
}

function readPng(dataUrl) {
  const match = /^data:image\/png;base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl || "");
  if (!match) throw new Error("Use a PNG image.");
  const image = Buffer.from(match[1], "base64");
  if (image.length > 20 * 1024 * 1024) throw new Error("PNG must be smaller than 20 MB.");
  if (image.subarray(0, 8).toString("hex") !== PNG_SIGNATURE) throw new Error("Invalid PNG file.");
  return image;
}

function packDirectory(pack) {
  const directory = path.join(AVATAR_ROOT, pack);
  if (!directory.startsWith(`${AVATAR_ROOT}${path.sep}`)) throw new Error("Invalid avatar folder.");
  return directory;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(200).json({ packs: await listPacks() });
  }

  if (req.method === "PUT") {
    try {
      const { pack, files } = req.body || {};
      const safePack = normalizePackName(pack || "");
      if (!safePack || safePack !== pack) throw new Error("Use a lowercase pack name with letters, numbers, or hyphens.");
      if (!Array.isArray(files) || files.some((file) => !AVATAR_FILES.includes(file))) throw new Error("Invalid avatar file list.");
      const uniqueFiles = AVATAR_FILES.filter((file) => files.includes(file));
      if (!uniqueFiles.length) throw new Error("Save at least one avatar layer.");

      const directory = packDirectory(safePack);
      await mkdir(directory, { recursive: true });
      for (const file of uniqueFiles) {
        try {
          await access(path.join(directory, file));
        } catch {
          throw new Error(`Missing uploaded file: ${file}`);
        }
      }
      await Promise.all(AVATAR_FILES.filter((file) => !uniqueFiles.includes(file)).map(async (file) => {
        try {
          await unlink(path.join(directory, file));
        } catch (error) {
          if (error?.code !== "ENOENT") throw error;
        }
      }));
      await recordPackFiles(safePack, uniqueFiles);
      res.setHeader("Cache-Control", "no-store, max-age=0");
      return res.status(200).json({ ok: true, pack: safePack, files: uniqueFiles });
    } catch (error) {
      return res.status(400).json({ error: error.message || "Could not update this avatar pack." });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST", "PUT"]);
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { pack, filename, dataUrl } = req.body || {};
    const safePack = normalizePackName(pack || "");
    if (!safePack || safePack !== pack) throw new Error("Use a lowercase pack name with letters, numbers, or hyphens.");
    if (!AVATAR_FILES.includes(filename)) throw new Error("Unknown avatar component.");
    const image = readPng(dataUrl);

    await mkdir(AVATAR_ROOT, { recursive: true });
    const directory = packDirectory(safePack);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), image);
    await recordSavedFile(safePack, filename);
    return res.status(201).json({ ok: true, pack: safePack, filename });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Could not save this image." });
  }
}
