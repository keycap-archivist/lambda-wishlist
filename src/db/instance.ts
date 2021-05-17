export type Artist = {
  id: string;
  name: string;
  instagram?: string;
  discord?: string;
  website?: string;
  sculpts: Sculpt[];
};

export type Sculpt = {
  id: string;
  name: string;
  colorways: Colorway[];
};

export interface SculptDetailed extends Sculpt {
  artist: Artist;
}

export interface Colorway {
  id: string;
  name: string;
  number?: number;
  img?: string;
}

export interface ColorwayDetailed extends Colorway {
  sculpt: SculptDetailed;
  isPrioritized?: boolean;
}

interface ApiDb {
  version: string;
  data: Artist[];
}

import { S3 } from '@aws-sdk/client-s3';

import { readableToString } from '../internal/utils';

const client = new S3({ region: 'us-east-2' });

class CatalogDB {
  db: ApiDb = { version: '', data: [] };
  async init(): Promise<void> {
    await this.loadDb();
  }
  // TODO: add stub
  async loadDb(): Promise<void> {
    if (this.db.data.length !== 0) {
      console.info('Db already in memory, skipping');
      return;
    }
    const s = process.hrtime();
    const data = await client.getObject({ Bucket: 'db.keycap-archivist.com', Key: 'catalog.json' });
    const str = await readableToString(data.Body as any);
    this.db = this.format(JSON.parse(str), 'AMAZON');
    const hrend = process.hrtime(s);
    console.info('Load DB (hr): %ds %dms', hrend[0], hrend[1] / 1000000);
  }
  getDbVersion(): string {
    return this.db.version;
  }
  format(_db: Artist[], version: string): ApiDb {
    const out = {
      version: version,
      data: _db
    };
    return out;
  }
  getArtist(artistId: string): Artist | undefined {
    return this.db.data.find((x) => x.id === artistId);
  }
  getSculpt(sculptId: string): SculptDetailed | undefined {
    let match: Sculpt | undefined;
    for (const a of this.db.data) {
      match = a.sculpts.find((x) => {
        return x && x.id === sculptId;
      });
      if (match) {
        const out = Object.assign({}, match) as SculptDetailed;
        out.artist = { name: a.name, id: a.id, sculpts: [] };
        return out;
      }
    }
  }
  getColorway(colorwayId: string): ColorwayDetailed | undefined {
    let match: Colorway | undefined;
    for (const a of this.db.data) {
      for (const s of a.sculpts) {
        match = s.colorways.find((x) => {
          return x && x.id === colorwayId;
        });
        if (match) {
          const out = Object.assign({}, match) as ColorwayDetailed;
          out.sculpt = { name: s.name, id: s.id, colorways: [], artist: { id: a.id, name: a.name, sculpts: [] } };
          return out;
        }
      }
    }
  }
  getSculpts(artistId: string): Sculpt[] {
    const sculpts = this.db.data.find((x) => x.id === artistId);
    if (!sculpts) {
      return [];
    }
    return sculpts.sculpts;
  }
  getColorways(sculptId: string): Colorway[] {
    let match: Sculpt | undefined;
    for (const a of this.db.data) {
      match = a.sculpts.find((x) => {
        return x && x.id === sculptId;
      });
      if (match) {
        return match.colorways;
      }
    }
    return [];
  }
}

export const instance = new CatalogDB();
