import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const RUNWARE_KEY = process.env.RUNWARE_API_KEY || 'SPDjcZuEoVmhWHHK539S5ZrCYa1sxSNW';

async function generateFlawlessSheerLace() {
  console.log('Regenerating Sheer Noir French Lace Bodysuit with perfect anatomy (both arms visible)...');
  const taskUUID = crypto.randomUUID();

  const prompt = 'Full length 9:16 vertical studio fashion lookbook photograph of a beautiful female fashion model standing elegantly facing the camera, both arms naturally resting by her sides, both hands clearly visible, wearing a delicate sheer black French floral lace lingerie bodysuit with scalloped edges and satin straps, complete full-body head to toe vertical view, pristine luxury minimalist studio, soft flattering editorial lighting, flawless human anatomy, 8k photorealistic masterpiece, sharp focus, raw photo';

  const res = await fetch('https://api.runware.ai/v1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([
      { taskType: 'authentication', apiKey: RUNWARE_KEY },
      {
        taskType: 'imageInference',
        taskUUID,
        positivePrompt: prompt,
        negativePrompt: 'missing limbs, missing arms, amputee, deformed arms, bad hands, mutated fingers, extra limbs, cropped body, cropped head, blurry, low quality',
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

  console.log('Generated URL:', url);
  const imgRes = await fetch(url);
  const buffer = await imgRes.arrayBuffer();

  const targetFile1 = path.join(process.cwd(), 'public', 'wardrobe', 'outfit-sheer-lace.jpg');
  const targetFile2 = path.join(process.cwd(), 'server', 'public', 'wardrobe', 'outfit-sheer-lace.jpg');

  fs.writeFileSync(targetFile1, Buffer.from(buffer));
  fs.writeFileSync(targetFile2, Buffer.from(buffer));

  console.log(`✅ Saved new 9:16 full-body image to ${targetFile1} (${fs.statSync(targetFile1).size} bytes)`);
  console.log(`✅ Saved new 9:16 full-body image to ${targetFile2} (${fs.statSync(targetFile2).size} bytes)`);
}

generateFlawlessSheerLace().catch(console.error);
