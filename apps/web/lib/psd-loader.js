function flattenLayers(layers = [], result = []) {
  layers.forEach((layer) => {
    if (layer.children?.length) flattenLayers(layer.children, result);
    else result.push(layer);
  });
  return result;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not read a PSD layer")), "image/png");
  });
}

export async function readNamedPsd(file, { names, normalize, getSpec }) {
  const { readPsd } = await import("ag-psd");
  const psd = readPsd(await file.arrayBuffer(), { skipCompositeImageData: true, skipThumbnail: true });
  const urls = [];
  const seen = new Set();
  const layers = [];

  try {
    for (const [order, layer] of flattenLayers(psd.children).entries()) {
      const name = normalize(layer.name);
      if (!names.includes(name) || seen.has(name) || !layer.canvas) continue;
      const url = URL.createObjectURL(await canvasBlob(layer.canvas));
      urls.push(url);
      seen.add(name);
      layers.push({
        name,
        url,
        order,
        z: getSpec(name)?.z || order,
        left: layer.left || 0,
        top: layer.top || 0,
        width: layer.canvas.width,
        height: layer.canvas.height,
      });
    }
    layers.sort((left, right) => left.z - right.z);
    return {
      name: file.name,
      width: psd.width,
      height: psd.height,
      layers,
      missing: names.filter((name) => !seen.has(name)),
      urls,
    };
  } catch (error) {
    urls.forEach((url) => URL.revokeObjectURL(url));
    throw error;
  }
}

export function revokePsdModel(model) {
  model?.urls?.forEach((url) => URL.revokeObjectURL(url));
}
