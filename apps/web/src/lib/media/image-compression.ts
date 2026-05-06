type ImageCompressionOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
  minimumSizeToCompress?: number;
};

function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function fitWithinBounds(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: maxWidth, height: maxHeight };
  }

  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function loadImage(source: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(source);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Impossible de lire la photo."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function isCompressibleImageFile(file: File): boolean {
  return isImageMimeType(file.type);
}

export async function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire la photo."));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Photo invalide."));
      }
    };
    reader.readAsDataURL(blob);
  });
}

export async function readImageDimensions(
  blob: Blob,
): Promise<{ width: number; height: number }> {
  const image = await loadImage(blob);
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

export async function compressImageFile(
  file: File,
  options: ImageCompressionOptions = {},
): Promise<File> {
  if (!isCompressibleImageFile(file)) {
    return file;
  }

  const maxWidth = options.maxWidth ?? 1600;
  const maxHeight = options.maxHeight ?? 1600;
  const quality = options.quality ?? 0.82;
  const mimeType = options.mimeType ?? "image/jpeg";
  const minimumSizeToCompress = options.minimumSizeToCompress ?? 0;

  if (file.size <= minimumSizeToCompress) {
    return file;
  }

  try {
    const image = await loadImage(file);
    const { width, height } = fitWithinBounds(
      image.naturalWidth,
      image.naturalHeight,
      maxWidth,
      maxHeight,
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, mimeType, quality);
    });

    if (!blob || blob.size <= 0) {
      return file;
    }

    const normalizedBaseName = file.name.replace(/\.[^.]+$/, "");
    const extension = mimeType === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${normalizedBaseName}.${extension}`, {
      type: mimeType,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
