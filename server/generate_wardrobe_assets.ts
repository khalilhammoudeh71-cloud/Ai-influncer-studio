import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const RUNWARE_KEY = process.env.RUNWARE_API_KEY || 'SPDjcZuEoVmhWHHK539S5ZrCYa1sxSNW';

const OUTFITS = [
  {
    id: 'outfit-sheer-lace',
    name: 'Sheer Noir French Lace Bodysuit',
    prompt: 'Full length 9:16 vertical fashion lookbook photograph of a single female model standing full body head to toe, wearing a delicate sheer black French floral lace lingerie bodysuit, scalloped edges, satin straps, alluring silhouette, soft studio lighting, ultra realistic 8k, raw photography, single person only',
  },
  {
    id: 'outfit-satin-slip',
    name: 'Silk & French Lace Rose Slip',
    prompt: 'Full length 9:16 vertical fashion lookbook photograph of a single female model standing full body head to toe, wearing a luxurious champagne-rose silk slip nightdress with black French lace trim, draped cowl neckline, floor length silk drape, luxury bedroom lighting, 8k, single person only',
  },
  {
    id: 'outfit-velvet-noir',
    name: 'Midnight Velvet Backless Gown',
    prompt: 'Full length 9:16 vertical red carpet photograph of a single female model standing full body head to toe, wearing an exquisite backless midnight black silk velvet haute couture evening gown, delicate gold embroidery, floor-length dramatic drape, 8k, single person only',
  },
  {
    id: 'outfit-silk-champagne',
    name: 'Golden Hour Liquid Silk Dress',
    prompt: 'Full length 9:16 vertical photograph of a single female model standing full body head to toe, wearing a liquid metallic champagne gold silk column dress, architectural high neckline, minimalist atelier tailoring, 8k, single person only',
  },
  {
    id: 'outfit-corset-satin',
    name: 'Bespoke Satin Corset & Slit Skirt',
    prompt: 'Full length 9:16 vertical runway photograph of a single female model standing full body head to toe, wearing a bespoke structured ivory satin boned corset with high-waisted fluid silk high-slit skirt, haute couture runway styling, 8k, single person only',
  },
  {
    id: 'outfit-emerald-slit',
    name: 'Emerald Silk High-Slit Gown',
    prompt: 'Full length 9:16 vertical photograph of a single female model standing full body head to toe, wearing a breathtaking emerald green satin evening gown with a high thigh-high slit, draped cowl neckline, luxury penthouse background, 8k, single person only',
  },
  {
    id: 'outfit-leather-moto',
    name: 'Distressed Leather & Ribbed Crop',
    prompt: 'Full length 9:16 vertical street style photograph of a single female model standing full body head to toe, wearing an oversized vintage distressed black leather motorcycle jacket over a sleek ribbed white crop top and high-waisted tailored black trousers, 8k, single person only',
  },
  {
    id: 'outfit-bronze-bikini',
    name: 'Metallic Bronze Ring Bikini',
    prompt: 'Full length 9:16 vertical swimwear photograph of a single female model standing full body head to toe, wearing a minimalist metallic bronze two-piece bikini with gold ring hardware accents, sunkissed skin, luxury yacht sun deck, 8k, single person only',
  },
  {
    id: 'outfit-sculpt-gym',
    name: 'Sculpt Ribbed Athleisure Set',
    prompt: 'Full length 9:16 vertical fitness lookbook photograph of a single female model standing full body head to toe, wearing a premium seamless taupe ribbed sports bra and matching high-waisted sculpting leggings, modern fitness aesthetic, 8k, single person only',
  },
];

async function generateWithRunware(promptText: string): Promise<string> {
  const taskUUID = crypto.randomUUID();
  const res = await fetch('https://api.runware.ai/v1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([
      { taskType: 'authentication', apiKey: RUNWARE_KEY },
      {
        taskType: 'imageInference',
        taskUUID,
        positivePrompt: `${promptText}, photorealistic 8k, full body standing shot, single subject, highly detailed garment texture, clean lighting`,
        negativePrompt: 'cropped, headshot, blurry, low resolution, multiple subjects, extra limbs, bad anatomy, deformed',
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
  return url;
}

async function run() {
  const outDir = path.join(process.cwd(), 'public', 'wardrobe');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`Generating 9:16 full-body images for ${OUTFITS.length} wardrobe items via Runware...`);

  for (const item of OUTFITS) {
    const targetFile = path.join(outDir, `${item.id}.jpg`);
    console.log(`\nGenerating [${item.name}] -> ${targetFile}`);

    try {
      const imgUrl = await generateWithRunware(item.prompt);
      console.log(`Generated: ${imgUrl}`);
      const imgRes = await fetch(imgUrl);
      const buffer = await imgRes.arrayBuffer();
      fs.writeFileSync(targetFile, Buffer.from(buffer));
      console.log(`✅ Saved ${targetFile} (${fs.statSync(targetFile).size} bytes)`);
    } catch (err: any) {
      console.error(`❌ Failed to generate ${item.id}:`, err.message);
    }
  }

  console.log('\n✨ All 9:16 wardrobe assets generated successfully!');
}

run();
