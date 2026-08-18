"use client";

// Resize/compress an image in the browser before upload. Real phone photos
// (especially several at once, e.g. front/side/back angles) can be several
// MB each — uploading them at full size risks hitting the server's request
// body size limit before any of our code even runs, which shows up as a
// generic network failure rather than a helpful error. Shrinking client-side
// keeps the actual upload small regardless of the original photo size, and
// also normalizes odd formats (e.g. iPhone HEIC) to a plain JPEG.
export async function resizeImageClient(
  file: File,
  maxDimension = 1600,
  quality = 0.85,
): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // fall back to the original if decoding fails

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
