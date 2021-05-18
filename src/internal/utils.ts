import { readFileSync } from 'fs';
import { createCanvas, loadImage } from 'canvas';
import { join, resolve } from 'path';
import type { ColorwayDetailed } from '../db/instance';

// export const cachePath = resolve(join(__dirname, '..', '..', 'img-cache'));
// export const submissionCachePath = resolve(join(__dirname, '..', '..', 'submission-cache'));
export const assetsBuffer = {
  discordLogo: readFileSync(resolve(join(__dirname, '..', 'assets', 'img', 'discord_logo.png'))),
  redditLogo: readFileSync(resolve(join(__dirname, '..', 'assets', 'img', 'reddit_logo.png'))),
  kaLogo: readFileSync(resolve(join(__dirname, '..', 'assets', 'img', 'ka_logo.png')))
};

// export const supportedFonts = [];

// export function initImgProcessor(): void {
//   if (!existsSync(cachePath)) {
//     mkdirSync(cachePath);
//   }
//   if (!existsSync(submissionCachePath)) {
//     mkdirSync(submissionCachePath);
//   } else {
//     for (const f of readdirSync(submissionCachePath)) {
//       const id = parse(f).name;
//       cacheMap.set(id, id);
//       appLogger.info(`Add ${id} to submissionCache`);
//     }
//   }
//   const fontPath = resolve(join(__dirname, '..', 'assets', 'fonts'));
//   for (const f of readdirSync(fontPath)) {
//     const family = f.split('.')[0].split('-')[0];
//     registerFont(join(fontPath, f), { family });
//     supportedFonts.push(family);
//   }
// }

// export async function getSubmissionBuffer(id: string): Promise<Buffer> {
//   let output: Buffer;
//   const filePath = join(submissionCachePath, `${id}.jpg`);
//   if (
//     await FSpromises.access(filePath, constants.R_OK)
//       .then(() => true)
//       .catch(() => false)
//   ) {
//     output = await FSpromises.readFile(filePath);
//   }
//   return output;
// }
import { S3 } from '@aws-sdk/client-s3';

const client = new S3({ region: 'us-east-2' });

const NS_PER_SEC = 1e9;

export function readableHRTime(diff: [number, number]): string {
  return `${(diff[0] * NS_PER_SEC + diff[1]) / 1000000} ms`;
}

export async function getImgBuffer(colorway: ColorwayDetailed): Promise<Buffer> {
  const timeLoad = process.hrtime();
  const data = await client.getObject({ Bucket: 'cdn.keycap-archivist.com', Key: `keycaps/250/${colorway.id}.jpg` });
  const diffLoad = process.hrtime(timeLoad);
  const out = await readableToBuffer(data.Body as any);
  console.log(`getImgBuffer ${colorway.id} ${readableHRTime(diffLoad)}`);
  return out;
}

export async function resizeImg(imgBuffer: Buffer): Promise<Buffer> {
  const IMG_HEIGTH = 500;
  const IMG_WIDTH = 500;
  const _img = await loadImage(imgBuffer);

  let h: number, w: number, sx: number, sy: number;
  if (_img.width > _img.height) {
    h = _img.height;
    w = h;
    sy = 0;
    sx = Math.ceil((_img.width - _img.height) / 2);
  } else {
    sx = 0;
    sy = Math.ceil((_img.height - _img.width) / 2);
    w = _img.width;
    h = w;
  }
  const Tcanvas = createCanvas(IMG_WIDTH, IMG_HEIGTH);
  const Tctx = Tcanvas.getContext('2d');

  Tctx.drawImage(_img, sx, sy, w, h, 0, 0, IMG_WIDTH, IMG_HEIGTH);

  return Tcanvas.toBuffer('image/jpeg', { quality: 1, progressive: true, chromaSubsampling: false });
}

export function isTextFittingSpace(
  ctx: CanvasRenderingContext2D,
  legend: string,
  maxWidth: number,
  margin = 10
): boolean {
  const measurement = ctx.measureText(legend);
  if (measurement.width > maxWidth - margin) {
    return false;
  }
  return true;
}

export function fitText(ctx: CanvasRenderingContext2D, legend: string, maxWidth: number): string {
  let outLegend = legend.trim();
  if (isTextFittingSpace(ctx, outLegend, maxWidth)) {
    return outLegend;
  }
  while (!isTextFittingSpace(ctx, `${outLegend}...`, maxWidth)) {
    outLegend = outLegend.trim().slice(0, -1);
  }
  return `${outLegend.trim()}...`;
}

export function drawBorder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  thickness = 1,
  color = '#F00'
): void {
  ctx.fillStyle = color;
  ctx.fillRect(0 - thickness, 0 - thickness, width + thickness * 2, height + thickness * 2);
}

// export async function addSubmission(submission: any, imgBuffer: Buffer): Promise<void> {
//   appLogger.info(submission);
//   cacheMap.set(submission.id, submission.id);
//   await writeFile(join(submissionCachePath, `${submission.id}.jpg`), imgBuffer);
// }

// const discordHook = process.env.DISCORD_WEBHOOK as string;

// export async function discordSubmissionUpdate(submission): Promise<void> {
//   const output: string[] = [];
//   output.push('**New Submission**');
//   output.push(`Maker: ${submission.maker}`);
//   output.push(`Sculpt: ${submission.sculpt}`);
//   output.push(`Colorway: ${submission.colorway}`);
//   output.push(`Image link: https://app.keycap-archivist.com/api/v2/submission/${submission.id}`);
//   await axios.post(discordHook, {
//     content: output.join('\n')
//   });
// }

// export async function discordSubmitCapName(colorway: ColorwayDetailed, name: string): Promise<void> {
//   const output: string[] = [];
//   output.push('**Colorway Name Correction**');
//   output.push(`Maker: ${colorway.sculpt.artist.name}`);
//   output.push(`Sculpt: ${colorway.sculpt.name}`);
//   if (colorway.name.length) {
//     output.push(`Correction : ${colorway.name} => ${name}`);
//   } else {
//     output.push(`Name is : ${name}`);
//   }
//   output.push(`Image link: https://app.keycap-archivist.com/api/v2/img/${colorway.id}`);
//   await axios.post(discordHook, {
//     content: output.join('\n')
//   });
// }

export async function readableToString(readable: NodeJS.ReadableStream): Promise<string> {
  let result = '';
  for await (const chunk of readable) {
    result += chunk;
  }
  return result;
}

export async function readableToBuffer(readable: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
