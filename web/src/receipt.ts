import { demoReceipt, fieldLabels } from './workspace.ts';
import type { Field } from './workspace.ts';

export const receiptSections: readonly (readonly Field[])[] = [
  ['purchaseDate', 'orderNumber'],
  ['product', 'subtotal', 'total'],
  ['name', 'address', 'paymentDigits', 'paymentReference'],
];

export function sampleImage(): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 720;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('The sample receipt could not be rendered.'));

  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#18272e';
  context.font = 'bold 34px monospace';
  context.fillText(demoReceipt.merchant, 48, 70);
  context.font = '22px monospace';
  let y = 134;
  for (const section of receiptSections) {
    for (const field of section) {
      context.fillText(`${fieldLabels[field]}: ${demoReceipt[field]}`, 48, y);
      y += 43;
    }
    y += 38;
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The sample image is unavailable.')), 'image/png');
  });
}

export function processImage(file: File): Promise<Blob> {
  return createImageBitmap(file).then(image => {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
    image.close();
    if (!context) throw new Error('The receipt image could not be opened.');
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The receipt image could not be converted.')), 'image/jpeg', 0.92);
    });
  });
}
