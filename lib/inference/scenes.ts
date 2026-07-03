/**
 * Per-scene routing + composite configuration.
 *
 * Two paths:
 *   compose: bg-remove product, generate scene backdrop, sharp composite.
 *            Guaranteed product preservation. ~$0.005/image.
 *   edit:    FLUX Kontext Pro edits source directly.
 *            Best-effort preservation, verified by Kimi. ~$0.04/image.
 *
 * Compose scenes also carry a `composite` config that tells sharp:
 *   - where to place the product (verticalAnchor 0.0=top, 1.0=bottom)
 *   - how big to scale it (heightRatio 0-1 of scene height)
 *   - what kind of shadow to cast (direction + softness + opacity)
 *   - what tone shift to apply (warmth/brightness match to scene)
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

export type ShadowDirection = 'below' | 'below-left' | 'below-right' | 'beneath-flat';

export interface CompositeConfig {
  /** Product cutout height as fraction of scene height (0.0-1.0) */
  heightRatio: number;
  /** Vertical anchor: 0.0 = top edge of scene, 1.0 = bottom edge. Product center lands here. */
  verticalAnchor: number;
  /** Horizontal anchor: 0.0 = left, 0.5 = centered, 1.0 = right */
  horizontalAnchor: number;
  /** Shadow direction — 'beneath-flat' for top-down scenes with no ground plane */
  shadowDirection: ShadowDirection;
  /** Shadow softness (gaussian blur sigma, pixels) — larger = softer, more diffuse */
  shadowBlurSigma: number;
  /** Shadow opacity (0.0-1.0) — how dark the shadow is */
  shadowOpacity: number;
  /** Warmth shift: negative = cooler, positive = warmer (-0.15 to 0.15 typical) */
  toneWarmth: number;
  /** Brightness multiplier applied to product before compositing (0.85-1.15) */
  toneBrightness: number;
  /** Saturation multiplier (0.85-1.15) — moody scenes desaturate slightly */
  toneSaturation: number;
}

export interface SceneConfig {
  id: SceneId;
  displayName: string;
  preferredPath: RenderPath;
  /** Prompt for FLUX Kontext (edit path) */
  editPrompt: string;
  /** Prompt for FLUX Schnell (compose path) — describes EMPTY backdrop only */
  composeScenePrompt: string;
  /** Composite settings — only used when preferredPath === 'compose' */
  composite?: CompositeConfig;
}

export const SCENES: Record<SceneId, SceneConfig> = {
  'studio-white': {
    id: 'studio-white',
    displayName: 'Studio White',
    preferredPath: 'compose',
    editPrompt:
      'Place this product on a clean pure white seamless studio background. Soft directional lighting from upper left, subtle natural shadow beneath the product. Keep the product in its original position and orientation. Professional product photography, sharp focus, commercial quality, centered composition. Preserve the exact product shape, color, materials, and details.',
    composeScenePrompt:
      'A pure white seamless studio backdrop with a subtle floor-to-wall gradient, soft diffused overhead lighting, empty scene with no objects, professional product photography lighting setup, minimalist, 1024x1024',
    composite: {
      heightRatio: 0.55,
      verticalAnchor: 0.62, // slightly below center so product sits on the floor gradient
      horizontalAnchor: 0.5,
      shadowDirection: 'below',
      shadowBlurSigma: 18,
      shadowOpacity: 0.28,
      toneWarmth: 0.02,
      toneBrightness: 1.02,
      toneSaturation: 1.0,
    },
  },

  'marble-flatlay': {
    id: 'marble-flatlay',
    displayName: 'Marble Flatlay',
    preferredPath: 'compose',
    editPrompt:
      'Place this product flat on a white and grey marble surface, top-down flatlay perspective. Bright even natural lighting. Keep the product in its original orientation. Preserve the exact product identity.',
    composeScenePrompt:
      'A luxurious white and grey veined marble surface photographed top-down, bright even natural daylight, empty flat background, high-end product photography aesthetic, no objects, 1024x1024',
    composite: {
      heightRatio: 0.48,
      verticalAnchor: 0.5, // dead center — top-down view has no ground plane
      horizontalAnchor: 0.5,
      shadowDirection: 'beneath-flat', // soft radial shadow directly under product
      shadowBlurSigma: 24,
      shadowOpacity: 0.32,
      toneWarmth: -0.02,
      toneBrightness: 1.03,
      toneSaturation: 0.97,
    },
  },

  'moody-dark': {
    id: 'moody-dark',
    displayName: 'Moody Dark',
    preferredPath: 'compose',
    editPrompt:
      'Place this product on a dark textured background with a single dramatic warm side light. Keep the product in its original orientation. Deep shadows, cinematic mood. Preserve the exact product identity.',
    composeScenePrompt:
      'A dark textured slate or stone surface with a single dramatic warm side light coming from the left, deep atmospheric shadows on the right, cinematic moody backdrop, empty scene, luxury product photography, no objects, 1024x1024',
    composite: {
      heightRatio: 0.5,
      verticalAnchor: 0.66, // lower-third for cinematic weight
      horizontalAnchor: 0.5,
      shadowDirection: 'below-right', // side light from left = shadow falls right
      shadowBlurSigma: 22,
      shadowOpacity: 0.55, // heavier shadow in dark scene
      toneWarmth: 0.08, // warm tint from the side light
      toneBrightness: 0.88, // scene is dark, tone the product down
      toneSaturation: 0.9,
    },
  },

  'minimal-pastel': {
    id: 'minimal-pastel',
    displayName: 'Minimal Pastel',
    preferredPath: 'compose',
    editPrompt:
      'Place this product on a soft pastel gradient background — pink to cream. Bright even lighting, minimalist aesthetic. Keep the product in its original orientation. Preserve the exact product identity.',
    composeScenePrompt:
      'A soft pastel gradient background — blush pink fading to cream — bright even studio lighting, minimalist backdrop, empty scene, editorial product photography aesthetic, no objects, 1024x1024',
    composite: {
      heightRatio: 0.52,
      verticalAnchor: 0.58,
      horizontalAnchor: 0.5,
      shadowDirection: 'below',
      shadowBlurSigma: 20,
      shadowOpacity: 0.18, // soft & subtle to preserve airy feel
      toneWarmth: 0.05,
      toneBrightness: 1.05,
      toneSaturation: 0.95,
    },
  },

  'colorful-pop': {
    id: 'colorful-pop',
    displayName: 'Colorful Pop',
    preferredPath: 'compose',
    editPrompt:
      'Place this product on a vibrant color-blocked background — coral and teal. Bold high-contrast lighting, playful pop-art aesthetic. Keep the product in its original orientation. Preserve the exact product identity.',
    composeScenePrompt:
      'A vibrant color-blocked backdrop — bold coral and teal panels intersecting at the horizon — bright even studio lighting, high-contrast playful pop-art aesthetic, empty scene, no objects, 1024x1024',
    composite: {
      heightRatio: 0.58, // hero shot — a bit larger
      verticalAnchor: 0.55,
      horizontalAnchor: 0.5,
      shadowDirection: 'below',
      shadowBlurSigma: 16,
      shadowOpacity: 0.35,
      toneWarmth: 0.0,
      toneBrightness: 1.05,
      toneSaturation: 1.08, // pop the product's colors to match scene energy
    },
  },

  'wood-shelf': {
    id: 'wood-shelf',
    displayName: 'Wood Shelf',
    preferredPath: 'edit',
    editPrompt:
      'Place this product on a warm wooden shelf with soft natural window light from the left. Keep the product in its original position and orientation — do not stand upright objects that were lying flat. Rustic authentic atmosphere. Preserve the exact product shape, color, materials, and details.',
    composeScenePrompt:
      'A warm wooden shelf with soft natural window light from the left, rustic authentic atmosphere, empty shelf surface, no objects, product photography backdrop, 1024x1024',
  },

  'lifestyle-home': {
    id: 'lifestyle-home',
    displayName: 'Lifestyle Home',
    preferredPath: 'edit',
    editPrompt:
      'Place this product in a cozy modern home interior — soft neutral tones, warm afternoon light, a hint of greenery. Keep the product in its original position and orientation — do not stand upright objects that were lying flat. Preserve the exact product identity, shape, colors, and details. Photorealistic lifestyle product photography.',
    composeScenePrompt:
      'A cozy modern home interior corner — soft neutral tones, warm afternoon light, subtle greenery — empty tabletop surface in foreground, no objects, lifestyle photography backdrop, 1024x1024',
  },

  'natural-outdoor': {
    id: 'natural-outdoor',
    displayName: 'Natural Outdoor',
    preferredPath: 'edit',
    editPrompt:
      'Place this product in a natural outdoor setting — soft grass, dappled sunlight through leaves, organic textures. Keep the product in its original position and orientation — do not stand upright objects that were lying flat. Preserve the exact product identity. Photorealistic.',
    composeScenePrompt:
      'A natural outdoor setting — soft grass, dappled sunlight through leaves, organic textures, empty foreground for product placement, no objects, lifestyle product photography, 1024x1024',
  },
};

export function getScene(id: string): SceneConfig | undefined {
  return SCENES[id as SceneId];
}
