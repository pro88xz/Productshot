import type { SceneStyle } from '@/lib/replicate/scenes';

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type GenerateRequest = {
  source_image_url: string;
  scene_style_ids: string[];
};

export type GenerateResponse = {
  generation_id: string;
  status: GenerationStatus;
  output_urls?: string[];
  error?: string;
  remaining_credits?: number;
};

export type UploadResponse = {
  source_image_url: string;
  storage_path: string;
};

export type GenerationHistoryItem = {
  id: string;
  status: GenerationStatus;
  source_image_url: string;
  output_image_urls: string[];
  scene_styles: SceneStyle[];
  credits_used: number;
  created_at: string;
  completed_at: string | null;
};
