/**
 * Pre-defined scene styles for product photography generation.
 * Each scene has a prompt template that gets fed to FLUX Kontext.
 */

export type SceneStyle = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  thumbnail?: string;
};

export const SCENE_STYLES: SceneStyle[] = [
  {
    id: 'studio-white',
    name: 'Studio White',
    description: 'Clean white background, soft shadow, e-commerce ready',
    prompt:
      'Place this product on a clean pure white seamless studio background. Soft directional lighting from upper left, subtle natural shadow beneath the product. Professional product photography, sharp focus, commercial quality, centered composition. Preserve the exact product shape, color, materials, and details.',
  },
  {
    id: 'marble-flatlay',
    name: 'Marble Flatlay',
    description: 'Top-down on white marble, minimalist styling',
    prompt:
      'Place this product as a top-down flatlay on a polished white Carrara marble surface with subtle grey veining. Soft natural daylight from above, gentle shadows. Minimalist composition with negative space. Editorial product photography, high-end aesthetic. Preserve the exact product shape, color, materials, and details.',
  },
  {
    id: 'wood-shelf',
    name: 'Wood Shelf',
    description: 'On warm wooden shelf, lifestyle atmosphere',
    prompt:
      'Place this product on a warm walnut wooden shelf or surface. Warm ambient lighting suggesting late afternoon, soft shadows, subtle bokeh background with hints of greenery. Lifestyle product photography, inviting and warm aesthetic. Preserve the exact product shape, color, materials, and details.',
  },
  {
    id: 'lifestyle-home',
    name: 'Lifestyle Home',
    description: 'In a styled home setting, real-world context',
    prompt:
      'Place this product in a styled modern home interior — on a console table near a softly blurred window with sheer curtains, beside a small ceramic vase with eucalyptus. Natural diffused window light, warm and inviting. Lifestyle photography for home goods, authentic feel. Preserve the exact product shape, color, materials, and details.',
  },
  {
    id: 'moody-dark',
    name: 'Moody Dark',
    description: 'Low-key lighting, dramatic shadows',
    prompt:
      'Place this product on a dark slate or black textured stone surface with dramatic low-key side lighting from one direction. Deep shadows, rich tonal contrast, moody atmosphere. Dark luxe aesthetic for premium products. Preserve the exact product shape, color, materials, and details.',
  },
  {
    id: 'minimal-pastel',
    name: 'Minimal Pastel',
    description: 'Soft pastel background, clean and modern',
    prompt:
      'Place this product against a soft pastel gradient background — gentle blush pink fading to cream. Soft even lighting, minimal shadow, very clean and modern aesthetic. Bright and airy product photography. Preserve the exact product shape, color, materials, and details.',
  },
  {
    id: 'natural-outdoor',
    name: 'Natural Outdoor',
    description: 'Outdoor natural light, organic feel',
    prompt:
      'Place this product on a natural outdoor surface — weathered wood or stone — with soft dappled sunlight filtering through leaves. Bokeh of greenery in the background. Natural earthy tones, organic and authentic feel. Preserve the exact product shape, color, materials, and details.',
  },
  {
    id: 'colorful-pop',
    name: 'Colorful Pop',
    description: 'Vibrant color blocking, social media ready',
    prompt:
      'Place this product against a vibrant solid bold-color backdrop (rich coral, deep teal, or sunshine yellow — pick what complements the product). Hard light, crisp shadows, contemporary editorial pop aesthetic. Eye-catching for social media. Preserve the exact product shape, color, materials, and details.',
  },
];

export function getSceneById(id: string): SceneStyle | undefined {
  return SCENE_STYLES.find((s) => s.id === id);
}
