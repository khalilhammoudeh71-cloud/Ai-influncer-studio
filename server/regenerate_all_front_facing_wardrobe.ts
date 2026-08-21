import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const RUNWARE_KEY = process.env.RUNWARE_API_KEY;
if (!RUNWARE_KEY) throw new Error('RUNWARE_API_KEY is required');

const ALL_OTHER_OUTFITS = [
  {
    id: 'outfit-velvet-noir',
    name: 'Midnight Velvet Gold-Embroidered Gown',
    prompt: 'Medium 2/3rds vertical 9:16 fashion lookbook photograph of a beautiful female model standing facing forward directly towards camera, wearing an exquisite midnight black silk velvet haute couture evening gown with intricate baroque gold embroidery down the front bodice and neckline, luxury red carpet gala background with warm soft lighting, flawless human anatomy, sharp focus, 8k photorealistic'
  },
  {
    id: 'outfit-silk-champagne',
    name: 'Golden Hour Liquid Silk Dress',
    prompt: 'Medium 2/3rds vertical 9:16 fashion lookbook photograph of a beautiful female model standing facing forward directly towards camera, wearing a liquid metallic champagne silk column dress with architectural high neckline, glowing warm golden sunset reflections in a luxury Parisian apartment, flawless human anatomy, sharp focus, 8k photorealistic'
  },
  {
    id: 'outfit-corset-satin',
    name: 'Bespoke Satin Corset & Slit Skirt',
    prompt: 'Medium 2/3rds vertical 9:16 fashion lookbook photograph of a beautiful female model standing facing forward directly towards camera, wearing a bespoke structured ivory satin boned corset top with a high-waisted fluid draped silk slit skirt, couture architectural tailoring, minimalist high-fashion studio, flawless human anatomy, sharp focus, 8k photorealistic'
  },
  {
    id: 'outfit-emerald-slit',
    name: 'Emerald Silk High-Slit Gown',
    prompt: 'Medium 2/3rds vertical 9:16 fashion lookbook photograph of a beautiful female model standing facing forward directly towards camera, wearing a breathtaking emerald green satin evening gown with a high thigh slit, draped cowl neckline, platinum diamond necklace, luxury modern penthouse view, flawless human anatomy, sharp focus, 8k photorealistic'
  },
  {
    id: 'outfit-leather-moto',
    name: 'Distressed Leather & Ribbed Crop',
    prompt: 'Medium 2/3rds vertical 9:16 fashion lookbook photograph of a beautiful female model standing facing forward directly towards camera, wearing an oversized vintage distressed black leather motorcycle jacket over a sleek ribbed white crop top and high-waisted tailored black trousers, city street background, flawless human anatomy, sharp focus, 8k photorealistic'
  },
  {
    id: 'outfit-bronze-bikini',
    name: 'Metallic Bronze Ring Bikini',
    prompt: 'Medium 2/3rds vertical 9:16 fashion lookbook photograph of a beautiful female model standing facing forward directly towards camera, wearing a minimalist metallic bronze two-piece bikini with gold ring hardware accents, sunkissed radiant skin, luxury yacht wooden sun deck background, sunlit ocean horizon, flawless human anatomy, sharp focus, 8k photorealistic'
  },
  {
    id: 'outfit-sculpt-gym',
    name: 'Sculpt Ribbed Athleisure Set',
    prompt: 'Medium 2/3rds vertical 9:16 fashion lookbook photograph of a beautiful female model standing facing forward directly towards camera, wearing a premium seamless taupe ribbed sports bra and matching high-waisted sculpting leggings, modern sunlit luxury fitness studio, athletic aesthetic, flawless human anatomy, sharp focus, 8k photorealistic'
  }
];

async function generateSingleOutfit(item: typeof ALL_OTHER_OUTFITS[0]) {
  console.log(`Generating front-facing ${item.name} (${item.id})...`);
  const taskUUID = crypto.randomUUID();

  const res = await fetch('https://api.runware.ai/v1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([
      { taskType: 'authentication', apiKey: RUNWARE_KEY },
      {
        taskType: 'imageInference',
        taskUUID,
        positivePrompt: item.prompt,
        negativePrompt: 'back turned, facing away, looking away, rear view, missing limbs, deformed face, bad eyes, amputee, mutated fingers, extra limbs, cropped head, blurry, low quality',
        model: 'runware:100@1',
        width: 768,
        height: 1344,
        numberResults: 1,
        outputFormat: 'JPG',
      }
    ])
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Runware HTTP ${res.status}: ${errText}`);
  }

  const json = await res.json() as any;
  if (json.errors && json.errors.length > 0) {
    throw new Error(`Runware error: ${json.errors[0].message}`);
  }

  const url = json.data?.[0]?.imageURL;
  if (!url) throw new Error('No image URL returned from Runware');

  console.log(`  -> URL: ${url}`);
  const imgRes = await fetch(url);
  const buffer = await imgRes.arrayBuffer();

  const targetFile1 = path.join(process.cwd(), 'public', 'wardrobe', `${item.id}.jpg`);
  const targetFile2 = path.join(process.cwd(), 'server', 'public', 'wardrobe', `${item.id}.jpg`);

  fs.writeFileSync(targetFile1, Buffer.from(buffer));
  fs.writeFileSync(targetFile2, Buffer.from(buffer));

  console.log(`  ✅ Saved front-facing ${item.id}.jpg (${fs.statSync(targetFile1).size} bytes)`);
}

async function main() {
  console.log('Regenerating all other wardrobe categories to be 100% front-facing...');
  for (const item of ALL_OTHER_OUTFITS) {
    try {
      await generateSingleOutfit(item);
    } catch (e) {
      console.error(`Failed to generate ${item.id}:`, e);
    }
  }
  console.log('All wardrobe categories are now front-facing!');
}

main().catch(console.error);
