import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

// Keep the editable SVG source; PNG is broadly supported by social crawlers.
await sharp(fileURLToPath(new URL('../public/og-default.svg', import.meta.url)))
  .png()
  .toFile(fileURLToPath(new URL('../public/og-default.png', import.meta.url)));
