/**
 * Per-scene routing configuration.
 *
 * Simple scenes (compose path): background-remove product, generate scene
 *   backdrop with FLUX Schnell, composite. ~$0.005/image. Product preservation
 *   is GUARANTEED (it's the literal source pixels on a new background).
 *
 * Complex scenes (edit path): FLUX Kontext Pro edits the source image directly.
 *   ~$0.04/image. Product preservation is best-effort — verified by Kimi.
 */

import type { RenderPath } from './types';

export type SceneId =
  | 'studio-white'
  | 'marble-flatlay'
  | 'moody-dark'
  | 'minimal-pastel'
  | 'colorful-pop'
  | 'wood-shelf'
  | 'lifestyle-home'
  | 'natural-outdoor';

// RenderPath is imported from types.ts (single source of truth)

export interface SceneConfig {
  id: SceneId;
  displayName: string;
  preferredPath: RenderPath;
  /** Prompt for FLUX Kontext (edit path) — must instruct product preservation */
  editPrompt: string;
  /** Prompt for FLUX Schnell (compose path) — describes the EMPTY scene backdrop only */
  composeScenePrompt: string;
}

export const SCENES: Record<SceneId, SceneConfig> = {
  'studio-white': {
    id: 'studio-white',
    displayName: 'Studio White',
    preferredPath: 'compose',
    editPrompt:
      'Place this product on a clean pure white seamless studio background. Soft directional lighting from upper left, subtle natural shadow beneath the product. Professional product photography, sharp focus, commercial quality, centered composition. Preserve the exact product shape, color, materials, and details.',
    composeScenePrompt:
      'A pure white seamless studio backdrop, soft diffused overhead lighting, subtle floor gradient, empty scene, professional product photography lighting setup, no objects, 1024x1024, high resolution',
  },
  'marble-flatlay': {
    id: 'marble-flatlay',
    displayName: 'Marble Flatlay',
    preferredPath: 'compose',
    editPrompt:
      'Place this product flat on a white and grey marble surface, top-down flatlay perspective. Bright even natural lighting. Preserve the exact product identity.',
    composeScenePrompt:
      'A luxurious white and grey marble surface, top-down flatlay view, bright even natural daylight, empty flat background, high-end product photography aesthetic, 1024x1024',
  },
  'moody-dark': {
    id: 'moody-dark',
    displayName: 'Moody Dark',
    preferredPath: 'compose',
    editPrompt:
      'Place this product on a dark textured background with a single dramatic warm side light. Deep shadows, cinematic mood. Preserve the exact product identity.',
    composeScenePrompt:
      'A dark textured slate or stone surface, single dramatic warm side light from left, deep atmospheric shadows, cinematic moody backdrop, empty scene, luxury product photography, 1024x1024',
  },
  'minimal-pastel': {
    id: 'minimal-pastel',
    displayName: 'Minimal Pastel',
    preferredPath: 'compose',
    editPrompt:
      'Place this product on a soft pastel gradient background — pink to cream. Bright even lighting, minimalist aesthetic. Preserve the exact product identity.',
    composeScenePrompt:
      'A soft pastel gradient background — blush pink fading to cream — bright even studio lighting, minimalist backdrop, empty scene, editorial product photography aesthetic, 1024x1024',
  },
  'colorful-pop': {
    id: 'colorful-pop',
    displayName: 'Colorful Pop',
    preferredPath: 'compose',
    editPrompt:
      'Place this product on a vibrant color-blocked background — coral and teal. Bold high-contrast lighting, playful pop-art aesthetic. Preserve the exact product identity.',
    composeScenePrompt:
      'A vibrant color-blocked backdrop — bold coral and teal panels — bright even studio lighting, high-contrast playful pop-art aesthetic, empty scene, no objects, 1024x1024',
  },
  'wood-shelf': {
    id: 'wood-shelf',
    displayName: 'Wood Shelf',
    preferredPath: 'edit',
    editPrompt:
      'Place this product on a warm wooden shelf with soft natural window light from the left. Rustic authentic atmosphere. Preserve the exact product shape, color, materials, and details.',
    composeScenePrompt:
      'A warm wooden shelf with soft natural window light from the left, rustic authentic atmosphere, empty shelf surface, product photography backdrop, 1024x1024',
  },
  'lifestyle-home': {
    id: 'lifestyle-home',
    displayName: 'Lifestyle Home',
    preferredPath: 'edit',
    editPrompt:
      'Place this product in a cozy modern home interior — soft neutral tones, warm afternoon light, a hint of greenery. Preserve the exact product identity, shape, colors, and details. Photorealistic lifestyle product photography.',
    composeScenePrompt:
      'A cozy modern home interior corner — soft neutral tones, warm afternoon light, subtle greenery — empty tabletop surface in foreground, lifestyle photography backdrop, 1024x1024',
  },
  'natural-outdoor': {
    id: 'natural-outdoor',
    displayName: 'Natural Outdoor',
    preferredPath: 'edit',
    editPrompt:
      'Place this product in a natural outdoor setting — soft grass, dappled sunlight through leaves, organic textures. Preserve the exact product identity. Photorealistic.',
    composeScenePrompt:
      'A natural outdoor setting — soft grass, dappled sunlight through leaves, organic textures, empty foreground for product placement, lifestyle product photography, 1024x1024',
  },
};

export function getScene(id: string): SceneConfig | undefined {
  return SCENES[id as SceneId];
}
