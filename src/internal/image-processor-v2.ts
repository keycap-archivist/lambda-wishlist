import { createCanvas, loadImage, registerFont } from 'canvas';
import { merge, cloneDeep } from 'lodash';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { S3 } from '@aws-sdk/client-s3';

import { instance } from '../db/instance';
import { readableHRTimeMs, readableToBuffer } from '../internal/utils';

import type { ColorwayDetailed } from '../db/instance';
import type { Image, CanvasRenderingContext2D } from 'canvas';
import type { FastifyLoggerInstance } from 'fastify';

export const supportedFonts: Array<string> = [];
const client = new S3({ region: 'us-east-2' });

export interface cap {
  id: string;
  legend?: string;
  legendColor?: string;
}

export interface wishlistCap extends cap {
  isPriority?: boolean;
}

export interface wishlistResult {
  isError: boolean;
  result?: Buffer;
  metrics?: Record<string, number>;
  time?: number;
}

interface textCustomization {
  color: string;
  font: string;
}

interface textOption extends textCustomization {
  text: string;
}

interface social extends textCustomization {
  discord: string;
  reddit: string;
}

export interface wishlistSetting {
  capsPerLine: number;
  priority: textCustomization;
  title: textOption;
  tradeTitle: textOption;
  legends: textCustomization;
  extraText: textOption;
  background: {
    color: string;
  };
  social?: social;
}

export interface wishlistV2 {
  caps: wishlistCap[];
  tradeCaps?: cap[];
  settings?: wishlistSetting;
}

interface sanitizedWishlist {
  caps: wishlistCap[];
  tradeCaps: cap[];
  settings: wishlistSetting;
}

interface hydratedWishlistCap extends ColorwayDetailed, wishlistCap {
  imgBuffer?: Buffer
}

const defaultWishlistSettings: wishlistSetting = Object.freeze({
  capsPerLine: 3,
  priority: { color: 'red', font: 'Roboto' },
  title: { color: 'red', text: '', font: 'Roboto' },
  tradeTitle: { color: 'red', text: '', font: 'Roboto' },
  legends: { color: 'red', font: 'Roboto' },
  extraText: { color: 'red', text: '', font: 'Roboto' },
  background: { color: 'black' }
});

const MARGIN_SIDE = 10;
const MARGIN_BOTTOM = 60;
const LINE_HEIGHT = 22;
const EXTRA_TEXT_MARGIN = 50;
const SOCIAL_ICONS_MARGIN = 70;
const HEADER_HEIGHT = 90;
const THUMB_RADIUS = 10;

const IMG_WIDTH = 250;
const IMG_HEIGTH = IMG_WIDTH;
const rowHeight = IMG_HEIGTH + MARGIN_BOTTOM;

let redditLogo: Image, discordLogo: Image, kaLogo: Image;
let isWarm = false;

async function warmUp() {
  const p = [];
  p.push(
    loadImage(assetsBuffer.redditLogo).then((d) => {
      redditLogo = d;
    })
  );
  p.push(
    loadImage(assetsBuffer.discordLogo).then((d) => {
      discordLogo = d;
    })
  );
  p.push(
    loadImage(assetsBuffer.kaLogo).then((d) => {
      kaLogo = d;
    })
  );
  await Promise.all(p);
  isWarm = true;
}

async function drawTheCap(
  context: CanvasRenderingContext2D,
  settings: wishlistSetting,
  cap: hydratedWishlistCap,
  x: number,
  y: number
): Promise<void> {
  let _img: Image;
  if (cap.imgBuffer) {
    _img = await loadImage(cap.imgBuffer);
  } else {
    throw new Error('No imgBuffer')
  }

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
  Tctx.quality = 'fast';

  Tctx.fillStyle = settings.background.color;
  Tctx.fillRect(0, 0, IMG_WIDTH, IMG_HEIGTH);

  Tctx.beginPath();
  Tctx.moveTo(THUMB_RADIUS, 0);
  Tctx.lineTo(IMG_WIDTH - THUMB_RADIUS, 0);
  Tctx.quadraticCurveTo(IMG_WIDTH, 0, IMG_WIDTH, THUMB_RADIUS);
  Tctx.lineTo(IMG_WIDTH, IMG_HEIGTH - THUMB_RADIUS);
  Tctx.quadraticCurveTo(IMG_WIDTH, IMG_HEIGTH, IMG_WIDTH - THUMB_RADIUS, IMG_HEIGTH);
  Tctx.lineTo(THUMB_RADIUS, IMG_HEIGTH);
  Tctx.quadraticCurveTo(0, IMG_HEIGTH, 0, IMG_HEIGTH - THUMB_RADIUS);
  Tctx.lineTo(0, THUMB_RADIUS);
  Tctx.quadraticCurveTo(0, 0, THUMB_RADIUS, 0);
  Tctx.closePath();
  Tctx.clip();

  let legendColor = cap.legendColor ? cap.legendColor : settings.legends.color;
  if (cap.isPriority) {
    legendColor = settings.priority.color;
    const thickness = 4;
    drawBorder(Tctx, IMG_WIDTH, IMG_HEIGTH, thickness, settings.priority.color);
    Tctx.drawImage(
      _img,
      sx,
      sy,
      w - thickness * 2,
      h - thickness * 2,
      thickness,
      thickness,
      IMG_WIDTH - thickness * 2,
      IMG_HEIGTH - thickness * 2
    );
  } else {
    Tctx.drawImage(_img, sx, sy, w, h, 0, 0, IMG_WIDTH, IMG_HEIGTH);
  }

  const b: Buffer = Tcanvas.toBuffer('image/jpeg', { quality: 1, progressive: true });
  const i = await loadImage(b);
  context.drawImage(i, x, y);

  context.font = `20px ${settings.legends.font}`;
  context.fillStyle = legendColor;
  context.textAlign = 'center';

  if (cap.legend) {
    context.fillText(fitText(context, cap.legend, IMG_WIDTH), x + IMG_WIDTH / 2, y + IMG_HEIGTH + LINE_HEIGHT);
  } else {
    const legend = `${cap.sculpt.name} ${cap.name}`;
    if (!isTextFittingSpace(context, legend, IMG_WIDTH)) {
      context.fillText(fitText(context, cap.sculpt.name, IMG_WIDTH), x + IMG_WIDTH / 2, y + IMG_HEIGTH + LINE_HEIGHT);
      context.fillText(fitText(context, cap.name, IMG_WIDTH), x + IMG_WIDTH / 2, y + IMG_HEIGTH + LINE_HEIGHT * 2);
    } else {
      context.fillText(legend, x + IMG_WIDTH / 2, y + IMG_HEIGTH + LINE_HEIGHT);
    }
  }
}

function calcWidth(capsPerline: number): number {
  return capsPerline * IMG_WIDTH + capsPerline * (MARGIN_SIDE * 2);
}

function calcHeight(w: sanitizedWishlist): number {
  const nbCaps = w.caps.length;
  const nbTradeCaps = w.tradeCaps.length;
  const maxCaps = Math.max(nbTradeCaps, nbCaps);
  if (maxCaps < w.settings.capsPerLine) {
    w.settings.capsPerLine = maxCaps;
  } else if (w.settings.capsPerLine < 1) {
    w.settings.capsPerLine = 1;
  }
  const nbRows = Math.ceil(nbCaps / w.settings.capsPerLine) + Math.ceil(nbTradeCaps / w.settings.capsPerLine);

  let out = HEADER_HEIGHT + rowHeight * nbRows;

  // Header of tradecaps
  if (nbTradeCaps) {
    out += 60;
  }

  let botMarginAdded = false;
  // Add extra size for additionnal text
  if (w.settings.extraText && w.settings.extraText.text && w.settings.extraText.text.trim().length) {
    out += EXTRA_TEXT_MARGIN;
    out += 25;
    botMarginAdded = true;
  }
  if (w.settings.social) {
    out += SOCIAL_ICONS_MARGIN;
  }
  if (!botMarginAdded) {
    out += 25;
  }
  return out;
}

export async function generateWishlist(appLogger: FastifyLoggerInstance, w: wishlistV2): Promise<wishlistResult> {
  if (!isWarm) {
    await warmUp();
  }
  const time = process.hrtime();
  w.settings = merge(cloneDeep(defaultWishlistSettings), w.settings) as wishlistSetting;
  if (!w.tradeCaps) w.tradeCaps = [];
  w.caps = w.caps
    .map((c) => {
      const hydratedCap = instance.getColorway(c.id);
      if (hydratedCap) {
        return merge(c, hydratedCap);
      }
    })
    .filter(Boolean) as wishlistCap[];

  // If no caps founds means that ids are wrong and wishlist can't be generated
  if (!w.caps.length) {
    appLogger.error('No caps found for the wishlist');
    return { isError: true };
  }

  w.tradeCaps = w.tradeCaps
    .map((c) => {
      const hydratedCap = instance.getColorway(c.id);
      if (hydratedCap) {
        return merge(c, hydratedCap);
      }
    })
    .filter(Boolean) as cap[];
  const p = [];
  const canvasHeight = calcHeight(w as sanitizedWishlist);
  const canvasWidth = calcWidth(w.settings.capsPerLine);
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  ctx.quality = 'fast';

  ctx.fillStyle = w.settings.background.color;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  let y = HEADER_HEIGHT;
  let idx = 0;

  const timeGetFiles = process.hrtime()
  const getBuffersPromises = []
  for (const cap of w.caps as Array<hydratedWishlistCap>) {
    getBuffersPromises.push(getImgBuffer(cap).then(b =>
      cap.imgBuffer = b
    ))
  }
  for (const cap of w.tradeCaps as Array<hydratedWishlistCap>) {
    getBuffersPromises.push(getImgBuffer(cap).then(b =>
      cap.imgBuffer = b
    ))
  }
  await Promise.all(getBuffersPromises)
  const diffGetFiles = process.hrtime(timeGetFiles);
  const durationGetFiles = readableHRTimeMs(diffGetFiles);

  appLogger.info(`generateWishlist-v2 getFiles %d caps %d ms`, w.caps.length, durationGetFiles);

  for (const cap of w.caps) {
    if (idx === w.settings.capsPerLine) {
      idx = 0;
      y += rowHeight;
    }
    p.push(drawTheCap(ctx, w.settings, cap as hydratedWishlistCap, idx++ * (IMG_WIDTH + MARGIN_SIDE) + MARGIN_SIDE, y));
  }

  await Promise.all(p);

  // Title
  ctx.font = `60px ${w.settings.title.font}`;
  ctx.fillStyle = w.settings.title.color;
  ctx.textAlign = 'center';
  ctx.fillText(w.settings.title.text ? w.settings.title.text : 'Wishlist', canvasWidth / 2, 60);

  if (w.tradeCaps.length) {
    let y = HEADER_HEIGHT + Math.ceil(w.caps.length / w.settings.capsPerLine) * rowHeight + LINE_HEIGHT;
    ctx.font = `60px ${w.settings.tradeTitle.font}`;
    ctx.fillStyle = w.settings.tradeTitle.color;
    ctx.textAlign = 'center';
    ctx.fillText(w.settings.tradeTitle.text ? w.settings.tradeTitle.text : 'Trade List', canvasWidth / 2, y);
    y += 20;
    idx = 0;
    for (const cap of w.tradeCaps) {
      if (idx === w.settings.capsPerLine) {
        idx = 0;
        y += rowHeight;
      }
      p.push(
        drawTheCap(ctx, w.settings, cap as hydratedWishlistCap, idx++ * (IMG_WIDTH + MARGIN_SIDE) + MARGIN_SIDE, y)
      );
    }
  }

  await Promise.all(p);
  if (w.settings.extraText && w.settings.extraText.text.length) {
    // Extra text
    ctx.font = `20px ${w.settings.extraText.font}`;
    ctx.fillStyle = w.settings.extraText.color;
    ctx.textAlign = 'left';
    ctx.fillText(
      w.settings.extraText.text,
      MARGIN_SIDE,
      canvasHeight - 20 - (w.settings.social ? SOCIAL_ICONS_MARGIN : 0)
    );
    ctx.fillStyle = w.settings.extraText.color;
    ctx.fillRect(
      MARGIN_SIDE,
      canvasHeight - EXTRA_TEXT_MARGIN - (w.settings.social ? SOCIAL_ICONS_MARGIN : 0),
      canvasWidth - MARGIN_SIDE * 2,
      2
    );
  }

  // draw social
  if (w.settings.social) {
    ctx.textAlign = 'left';
    ctx.font = `20px ${w.settings.social.font}`;
    ctx.fillStyle = w.settings.social.color;
    const textMargin = MARGIN_SIDE + 35;
    if (w.settings.social.reddit) {
      ctx.drawImage(redditLogo, 0, 0, 100, 100, MARGIN_SIDE, canvasHeight - SOCIAL_ICONS_MARGIN - 5, 25, 25);
      ctx.fillText(w.settings.social.reddit, textMargin, canvasHeight - 55);
    }
    if (w.settings.social.discord) {
      ctx.drawImage(discordLogo, 0, 0, 100, 100, MARGIN_SIDE - 1, canvasHeight - SOCIAL_ICONS_MARGIN / 2 - 5, 27, 27);
      ctx.fillText(w.settings.social.discord, textMargin, canvasHeight - 20);
    }
  }
  ctx.textAlign = 'left';
  ctx.font = `20px ${w.settings.title.font}`;
  ctx.fillStyle = w.settings.title.color;
  ctx.drawImage(
    kaLogo,
    0,
    0,
    100,
    100,
    canvasWidth - 250 - MARGIN_SIDE,
    canvasHeight - SOCIAL_ICONS_MARGIN / 2 - 5,
    27,
    27
  );
  ctx.fillText('keycap-archivist.com', canvasWidth - 215 - MARGIN_SIDE, canvasHeight - 20);

  if (w.caps.findIndex((x) => x.isPriority === true) > -1) {
    ctx.font = `20px ${w.settings.priority.font}`;
    ctx.fillStyle = w.settings.priority.color;
    ctx.textAlign = 'left';
    ctx.fillText('Priorities', MARGIN_SIDE, 30);
  }

  const outBuffer = canvas.toBuffer('image/jpeg', { quality: 0.9, progressive: true });
  const diff = process.hrtime(time);
  const duration = readableHRTimeMs(diff);
  appLogger.info(`generateWishlist-v2 %d caps %d ms`, w.caps.length, duration);
  return { result: outBuffer, isError: false, time: duration, metrics: {} };
}

const assetsBuffer = {
  discordLogo: readFileSync(resolve(join(__dirname, '..', 'assets', 'img', 'discord_logo.png'))),
  redditLogo: readFileSync(resolve(join(__dirname, '..', 'assets', 'img', 'reddit_logo.png'))),
  kaLogo: readFileSync(resolve(join(__dirname, '..', 'assets', 'img', 'ka_logo.png')))
};

export function initImgProcessor(): void {
  const fontPath = resolve(join(__dirname, '..', 'assets', 'fonts'));
  for (const f of readdirSync(fontPath)) {
    const family = f.split('.')[0].split('-')[0];
    registerFont(join(fontPath, f), { family });
    supportedFonts.push(family);
  }
}

async function getImgBuffer(colorway: { id: string }): Promise<Buffer> {
  const data = await client.getObject({ Bucket: 'cdn.keycap-archivist.com', Key: `keycaps/250/${colorway.id}.jpg` });
  const out = await readableToBuffer(data.Body as NodeJS.ReadableStream);
  return out;
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
