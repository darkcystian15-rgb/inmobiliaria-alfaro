import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

// Static public artwork lets messaging services retrieve the preview without a session.
const logo = await sharp(await readFile(new URL('../public/branding/logo.png', import.meta.url)))
  .resize(640, 232).png().toBuffer();
const artwork = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f5f6f8"/>
  <path d="M920 0H1200V630H1100L760 290Z" fill="#ebedf1"/>
  <rect x="48" y="40" width="1104" height="550" rx="28" fill="white"/>
  <path d="M48 68Q48 40 76 40H1124Q1152 40 1152 68V76H48Z" fill="#e71925"/>
  <image x="280" y="108" width="640" height="232" href="data:image/png;base64,${logo.toString('base64')}"/>
  <text x="600" y="398" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="36" font-weight="700" fill="#172033">Intranet | Alberto Alfaro</text>
  <text x="600" y="441" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="24" fill="#526074">Acceso interno para gestionar inmuebles, visitas,</text>
  <text x="600" y="476" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="24" fill="#526074">tasaciones y publicaciones.</text>
  <rect x="429" y="510" width="342" height="46" rx="23" fill="#fff0f1"/>
  <text x="600" y="540" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="700" fill="#bd1620">INTRANET</text>
</svg>`);
await sharp(artwork).png().toFile(new URL('../public/branding/compartir-intranet-v2.png', import.meta.url).pathname);
console.log('Generated public/branding/compartir-intranet-v2.png (1200 × 630).');
