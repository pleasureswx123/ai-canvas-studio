const OUTPUT_TYPE = 'image/png';

function loadEditableImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败，无法编辑'));
    image.src = src;
  });
}

function canvasToFile(canvas, name) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('图片导出失败'));
        return;
      }
      resolve(new File([blob], name, { type: OUTPUT_TYPE }));
    }, OUTPUT_TYPE);
  });
}

function outputName(baseName, suffix) {
  const safeBase = (baseName || 'image').replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
  return `${safeBase || 'image'}_${suffix}.png`;
}

export async function createCroppedImageFile(src, aspectRatio, baseName) {
  const image = await loadEditableImage(src);
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  let cropWidth = image.naturalWidth;
  let cropHeight = image.naturalHeight;

  if (sourceRatio > aspectRatio) {
    cropWidth = Math.round(cropHeight * aspectRatio);
  } else {
    cropHeight = Math.round(cropWidth / aspectRatio);
  }

  const sourceX = Math.round((image.naturalWidth - cropWidth) / 2);
  const sourceY = Math.round((image.naturalHeight - cropHeight) / 2);
  const canvas = document.createElement('canvas');
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  return canvasToFile(canvas, outputName(baseName, `crop_${String(aspectRatio).replace('.', '_')}`));
}

export async function createAnnotatedImageFile(src, text, baseName) {
  const image = await loadEditableImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  const label = text.trim();
  const fontSize = Math.max(24, Math.round(canvas.width * 0.035));
  const padding = Math.round(fontSize * 0.65);
  ctx.font = `700 ${fontSize}px Inter, Microsoft YaHei, sans-serif`;
  const labelWidth = Math.min(ctx.measureText(label).width, canvas.width - padding * 4);
  const boxWidth = Math.round(labelWidth + padding * 2);
  const boxHeight = Math.round(fontSize + padding * 1.6);
  const x = padding;
  const y = canvas.height - boxHeight - padding;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
  ctx.fillRect(x, y, boxWidth, boxHeight);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(2, Math.round(canvas.width * 0.002));
  ctx.strokeRect(x, y, boxWidth, boxHeight);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + padding, y + boxHeight / 2, boxWidth - padding * 2);

  return canvasToFile(canvas, outputName(baseName, 'annotated'));
}
