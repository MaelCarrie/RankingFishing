// ─── Compression d'images avant upload (issue #19) ───────────────────────────
//
// Redimensionne à 1600 px max sur le plus grand côté et réencode en JPEG
// qualité 0.7. Fonctionne sur iOS, Android et web (expo-image-manipulator a
// une implémentation canvas sur web). En cas d'échec, on renvoie l'image
// d'origine : mieux vaut une photo lourde qu'une publication bloquée.

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export const IMAGE_MAX_DIMENSION = 1600;
export const IMAGE_JPEG_QUALITY = 0.7;

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  /** false si la compression a échoué et que l'URI d'origine est renvoyée */
  compressed: boolean;
}

interface CompressOptions {
  /** Dimensions connues (fournies par expo-image-picker) : évite un rendu de sondage */
  width?: number;
  height?: number;
  maxDimension?: number;
  quality?: number;
}

/** Calcule l'action de redimensionnement (null si l'image est déjà assez petite). */
export function computeResize(
  width: number,
  height: number,
  maxDimension = IMAGE_MAX_DIMENSION
): { width: number } | { height: number } | null {
  if (width <= 0 || height <= 0) return null;
  if (Math.max(width, height) <= maxDimension) return null;
  return width >= height ? { width: maxDimension } : { height: maxDimension };
}

export async function compressImage(uri: string, options: CompressOptions = {}): Promise<CompressedImage> {
  const maxDimension = options.maxDimension ?? IMAGE_MAX_DIMENSION;
  const quality = options.quality ?? IMAGE_JPEG_QUALITY;

  try {
    let width = options.width ?? 0;
    let height = options.height ?? 0;
    let context = ImageManipulator.manipulate(uri);

    // Dimensions inconnues : un premier rendu permet de les lire
    if (!width || !height) {
      const probe = await context.renderAsync();
      width = probe.width;
      height = probe.height;
      context = ImageManipulator.manipulate(probe);
    }

    const resize = computeResize(width, height, maxDimension);
    if (resize) context.resize(resize);
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality });

    return { uri: result.uri, width: result.width, height: result.height, compressed: true };
  } catch (e) {
    if (__DEV__) console.warn('[image] compression impossible, envoi de l\'original', e);
    return { uri, width: options.width ?? 0, height: options.height ?? 0, compressed: false };
  }
}

/** Compresse une liste d'URI en séquence (évite de saturer la mémoire avec 3 grosses photos). */
export async function compressImages(
  uris: string[],
  knownDims: Record<string, { width: number; height: number }> = {},
  options: Omit<CompressOptions, 'width' | 'height'> = {}
): Promise<string[]> {
  const out: string[] = [];
  for (const uri of uris) {
    // Les URL distantes (photo déjà en ligne, mock) ne sont pas retouchées
    if (/^https?:\/\//.test(uri)) {
      out.push(uri);
      continue;
    }
    const { uri: compressedUri } = await compressImage(uri, { ...options, ...knownDims[uri] });
    out.push(compressedUri);
  }
  return out;
}
