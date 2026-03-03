"use server";
import { createClient } from '@/utils/supabase/server';
import sharp from 'sharp';

export async function uploadCampaignImage(base64Image: string, campaignId: string) {
  const supabase = await createClient();
  
  // 1. Processar imagem (Reduz de MBs para KBs)
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, 'base64');
  const processedBuffer = await sharp(buffer)
    .resize(800, 450, { fit: 'cover' }) // Proporção 16:9 para cards
    .webp({ quality: 80 })
    .toBuffer();

  // 2. Upload
  const fileName = `covers/${campaignId}-${Date.now()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from('campaign-assets') // Crie esse bucket no painel do Supabase
    .upload(fileName, processedBuffer, { contentType: 'image/webp', upsert: true });

  if (uploadError) throw uploadError;

  // 3. Pegar URL e atualizar banco
  const { data: { publicUrl } } = supabase.storage.from('campaign-assets').getPublicUrl(fileName);
  
  await supabase
    .from('campaigns')
    .update({ image_url: publicUrl })
    .eq('id', campaignId);

  return publicUrl;
}