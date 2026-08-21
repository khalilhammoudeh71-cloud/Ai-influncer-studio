import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const RUNWARE_KEY = process.env.RUNWARE_API_KEY || '';

const LINGERIE_OUTFITS = [
  {
    id: 'outfit-scarlet-corset',
    name: 'Scarlet Satin & Chantilly Lace Corset',
    prompt: 'Medium 2/3rds vertical 9:16 fashion lookbook photograph of a beautiful female model standing facing forward directly towards camera, wearing an exquisite ruby scarlet red satin boned corset with black Chantilly lace overlay, scalloped sweetheart neckline, matching red satin briefs, luxury bedroom suite background with warm soft lighting, perfect human anatomy, sharp focus, 8k photorealistic'
  },
  {
    id: 'outfit-emerald-teddy',
    name: 'Emerald Silk & Sheer Mesh Halter Teddy',
    prompt: 'Medium 2/3rds vertical 9:16 fashion lookbook photograph of a beautiful female model standing facing forward directly towards camera, wearing a luxurious jewel-tone emerald green silk and sheer black illusion mesh halter teddy bodysuit with a plunging neckline and delicate gold hardware, modern penthouse master bedroom, flawless anatomy, 8k photorealistic'
  },
  {
    id: 'outfit-midnight-robe',
    name: 'Midnight Blue Floral Lace Bralette & Robe',
    prompt: 'Medium 2/3rds vertical 9:16 fashion lookbook photograph of a beautiful female model standing facing forward directly towards camera, wearing a sheer dark navy midnight blue floral embroidered lace bralette set under an open sheer silk chiffon kimono robe, luxury ambient bedroom lighting, flawless anatomy, 8k photorealistic'
  },
  {
    id: 'outfit-pearl-babydoll',
    name: 'Champagne Pearl Silk & Lace Babydoll',
    prompt: 'Medium 2/3rds vertical 9:16 fashion lookbook photograph of a beautiful female model standing facing forward directly towards camera, wearing an iridescent champagne-pearl liquid silk babydoll slip with sheer ivory Chantilly lace bust and delicate double straps, soft morning sunbeams on silk sheets, flawless anatomy, 8k photorealistic'
  },
  {
    id: 'outfit-velvet-bustier',
    name: 'Vintage Noir Velvet & Guipure Bustier',
    prompt: 'Medium 2/3rds vertical 9:16 fashion lookbook photograph of a beautiful female model standing facing forward directly towards camera, wearing a structured noir black velvet bustier with gold-trimmed guipure lace cups and exposed boning channels, matching velvet bottoms, moody Parisian luxury boudoir, flawless anatomy, 8k photorealistic'
  },
  {
    id: 'outfit-blush-chemise',
    name: 'Blush Rose Sheer Pleated Tulle Chemise',
    prompt: 'Medium 2/3rds vertical 9:16 fashion lookbook photograph of a beautiful female model standing facing forward directly towards camera, wearing a delicate pastel blush rose sheer pleated tulle and silk chemise with embroidered floral appliqués, sweet heart neckline, luxury satin bedroom, flawless anatomy, 8k photorealistic'
  }
];

async function generateSingleLingerie(item: typeof LINGERIE_OUTFITS[0]) {
  console.log(`Generating ${item.name} (${item.id})...`);
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
        negativePrompt: 'back turned, facing away, missing limbs, deformed face, bad eyes, amputee, mutated fingers, extra limbs, cropped head, blurry, low quality',
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

  console.log(`  ✅ Saved ${item.id}.jpg (${fs.statSync(targetFile1).size} bytes)`);
}

async function main() {
  console.log('Generating 6 new distinct luxury lingerie outfits for Wardrobe Studio...');
  for (const item of LINGERIE_OUTFITS) {
    try {
      await generateSingleLingerie(item);
    } catch (e) {
      console.error(`Failed to generate ${item.id}:`, e);
    }
  }
  console.log('Done generating lingerie catalog!');
}

main().catch(console.error);
