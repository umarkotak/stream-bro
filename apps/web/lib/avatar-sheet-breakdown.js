const MAX_IMAGE_EDGE = 2048;
const TARGET_PIECES = 14;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image."));
    };
    image.src = url;
  });
}

function pixelMatchesBackground(data, offset, background) {
  const alpha = data[offset + 3];
  if (background.transparent) return alpha < 32;
  if (alpha < 16) return true;
  const red = data[offset] - background.red;
  const green = data[offset + 1] - background.green;
  const blue = data[offset + 2] - background.blue;
  return Math.sqrt((red * red) + (green * green) + (blue * blue)) < 34;
}

function detectBackground(data, width, height) {
  const points = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  let red = 0;
  let green = 0;
  let blue = 0;
  let alpha = 0;
  points.forEach(([x, y]) => {
    const offset = ((y * width) + x) * 4;
    red += data[offset];
    green += data[offset + 1];
    blue += data[offset + 2];
    alpha += data[offset + 3];
  });
  return {
    red: red / points.length,
    green: green / points.length,
    blue: blue / points.length,
    transparent: (alpha / points.length) < 32,
  };
}

function findForeground(imageData) {
  const { data, width, height } = imageData;
  const length = width * height;
  const background = detectBackground(data, width, height);
  const outside = new Uint8Array(length);
  const queue = new Int32Array(length);
  let head = 0;
  let tail = 0;

  function add(index) {
    if (outside[index]) return;
    const offset = index * 4;
    if (!pixelMatchesBackground(data, offset, background)) return;
    outside[index] = 1;
    queue[tail++] = index;
  }

  for (let x = 0; x < width; x += 1) {
    add(x);
    add(((height - 1) * width) + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    add(y * width);
    add((y * width) + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) add(index - 1);
    if (x < width - 1) add(index + 1);
    if (y > 0) add(index - width);
    if (y < height - 1) add(index + width);
  }

  const foreground = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    if (!outside[index] && data[(index * 4) + 3] > 15) foreground[index] = 1;
    if (outside[index]) data[(index * 4) + 3] = 0;
  }
  return foreground;
}

function findComponents(mask, width, height) {
  const queue = new Int32Array(width * height);
  const minimumPixels = Math.max(20, Math.round(width * height * 0.00002));
  const components = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] !== 1) continue;
    let head = 0;
    let tail = 0;
    let pixels = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    mask[start] = 2;
    queue[tail++] = start;

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);
      pixels += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const nextY = y + offsetY;
        if (nextY < 0 || nextY >= height) continue;
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (!offsetX && !offsetY) continue;
          const nextX = x + offsetX;
          if (nextX < 0 || nextX >= width) continue;
          const next = (nextY * width) + nextX;
          if (mask[next] !== 1) continue;
          mask[next] = 2;
          queue[tail++] = next;
        }
      }
    }

    if (pixels >= minimumPixels) components.push({ minX, minY, maxX, maxY, pixels });
  }

  return components
    .sort((left, right) => right.pixels - left.pixels)
    .slice(0, 100);
}

function componentDistance(left, right) {
  const x = Math.max(0, left.minX - right.maxX - 1, right.minX - left.maxX - 1);
  const y = Math.max(0, left.minY - right.maxY - 1, right.minY - left.maxY - 1);
  return Math.sqrt((x * x) + (y * y));
}

function mergeToTarget(components) {
  const groups = components.map((component) => ({ ...component }));
  while (groups.length > TARGET_PIECES) {
    let bestLeft = 0;
    let bestRight = 1;
    let bestDistance = Infinity;
    for (let left = 0; left < groups.length; left += 1) {
      for (let right = left + 1; right < groups.length; right += 1) {
        const distance = componentDistance(groups[left], groups[right]);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestLeft = left;
          bestRight = right;
        }
      }
    }
    const left = groups[bestLeft];
    const right = groups[bestRight];
    groups[bestLeft] = {
      minX: Math.min(left.minX, right.minX),
      minY: Math.min(left.minY, right.minY),
      maxX: Math.max(left.maxX, right.maxX),
      maxY: Math.max(left.maxY, right.maxY),
      pixels: left.pixels + right.pixels,
    };
    groups.splice(bestRight, 1);
  }
  return groups.sort((left, right) => {
    const yDifference = left.minY - right.minY;
    return Math.abs(yDifference) > 12 ? yDifference : left.minX - right.minX;
  });
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create a detected image.")), "image/png");
  });
}

export async function breakdownAvatarSheet(file) {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const context = source.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is not available in this browser.");
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const foreground = findForeground(imageData);
  context.putImageData(imageData, 0, 0);

  const components = mergeToTarget(findComponents(foreground, width, height));
  if (!components.length) throw new Error("No separated artwork was found. Use a white or transparent background.");

  const padding = Math.max(4, Math.round(Math.min(width, height) * 0.006));
  const pieces = [];
  for (const [index, component] of components.entries()) {
    const left = Math.max(0, component.minX - padding);
    const top = Math.max(0, component.minY - padding);
    const right = Math.min(width - 1, component.maxX + padding);
    const bottom = Math.min(height - 1, component.maxY + padding);
    const canvas = document.createElement("canvas");
    canvas.width = right - left + 1;
    canvas.height = bottom - top + 1;
    const pieceContext = canvas.getContext("2d");
    if (!pieceContext) throw new Error("Could not create a detected image.");
    pieceContext.drawImage(source, left, top, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    const blob = await canvasBlob(canvas);
    pieces.push({
      id: `piece-${index + 1}`,
      canvas,
      url: URL.createObjectURL(blob),
      width: canvas.width,
      height: canvas.height,
      left,
      top,
    });
  }

  return { width, height, pieces };
}

export function revokeBreakdown(result) {
  result?.pieces?.forEach((piece) => URL.revokeObjectURL(piece.url));
}

export async function createAvatarBreakdownPsd({ result, assignments, layerSpecs }) {
  const { writePsd } = await import("ag-psd");
  const size = Math.max(512, result.width, result.height);
  const pieceByLayer = new Map();
  result.pieces.forEach((piece) => {
    const layerName = assignments[piece.id];
    if (layerName) pieceByLayer.set(layerName, piece);
  });

  const orderedBackToFront = [...layerSpecs].sort((left, right) => left.z - right.z);
  const composite = document.createElement("canvas");
  composite.width = size;
  composite.height = size;
  const compositeContext = composite.getContext("2d");
  if (!compositeContext) throw new Error("Canvas is not available in this browser.");

  orderedBackToFront
    .filter((layer) => layer.name === "body-base.png" || layer.name === "head-base.png" || layer.name === "hair-base.png")
    .forEach((layer) => {
      const piece = pieceByLayer.get(layer.name);
      if (!piece) return;
      compositeContext.drawImage(piece.canvas, Math.round((size - piece.width) / 2), Math.round((size - piece.height) / 2));
    });

  const children = [...layerSpecs]
    .sort((left, right) => right.z - left.z)
    .map((layer) => {
      const piece = pieceByLayer.get(layer.name);
      const hidden = layer.name === "eye-state-closed.png"
        || (layer.name.startsWith("mouth-state-") && layer.name !== "mouth-state-idle.png");
      if (!piece) return { name: layer.name, hidden };
      return {
        name: layer.name,
        hidden,
        left: Math.round((size - piece.width) / 2),
        top: Math.round((size - piece.height) / 2),
        canvas: piece.canvas,
      };
    });

  return writePsd(
    { width: size, height: size, canvas: composite, children },
    { generateThumbnail: false, trimImageData: true, noBackground: true },
  );
}
