import { generateWishlist, supportedFonts } from '../../internal/image-processor-v2';
import { instance } from '../../db/instance';
import { TimestreamWriteClient, WriteRecordsCommand } from '@aws-sdk/client-timestream-write';

import type { _Record } from '@aws-sdk/client-timestream-write';
import type { FastifyRequest, FastifyReply, FastifyLoggerInstance } from 'fastify';
import type { wishlistV2 } from '../../internal/image-processor-v2';

const client = new TimestreamWriteClient({ region: 'us-east-2' });

async function metrics(wl: wishlistV2, log: FastifyLoggerInstance) {
  const recs: Array<_Record> = [];
  for (const c of wl.caps) {
    const hCap = instance.getColorway(c.id);
    if (!hCap) {
      continue;
    }
    recs.push({
      MeasureValue: '1',
      MeasureValueType: 'DOUBLE',
      MeasureName: 'wishlist-generation',
      Time: Date.now().toString(),
      TimeUnit: 'MILLISECONDS',
      Dimensions: [
        { Name: 'maker', Value: hCap.sculpt.artist.name },
        { Name: 'sculpt', Value: hCap.sculpt.name },
        { Name: 'colorway', Value: hCap.id }
      ]
    });
  }
  const command = new WriteRecordsCommand({ DatabaseName: 'keycap-archivist', TableName: 'wishlist', Records: recs });
  try {
    const res = await client.send(command);
    log.info(`${res.RecordsIngested?.Total} Metrics properly sent`);
  } catch (e) {
    log.error(e, 'Error during metric push');
  }
}

export const postWishlist = async (req: FastifyRequest<{ Body: wishlistV2 }>, resp: FastifyReply): Promise<void> => {
  try {
    const [imgBuffer] = await Promise.all([generateWishlist(req.log, req.body), metrics(req.body, req.log)]);
    if (!imgBuffer.isError) {
      if (req.headers.accept && req.headers.accept.includes('image/png')) {
        return resp
          .status(200)
          .header('Content-Disposition', 'attachment; filename="wishlist.png"')
          .header('Content-Type', 'image/png')
          .send(imgBuffer.result);
      } else {
        return resp.status(200).send({
          StatusCode: 200,
          Headers: {
            'Content-Disposition': `attachment; filename="wishlist.png"`,
            'Content-Type': `image/png`
          },
          IsBase64Encoded: true,
          Body: imgBuffer.result ? imgBuffer.result.toString('base64') : undefined
        });
      }
    }

    return resp.status(500).send('Oops! An error has occured');
  } catch (e) {
    req.log.error(e);
    return resp.status(500).send('Oops! An error has occured');
  }
};

export const getWishlistSettings = async (_: FastifyRequest, resp: FastifyReply): Promise<void> => {
  return resp.type('application/json').status(200).send({ fonts: supportedFonts });
};

export const checkWishlist = async (req: FastifyRequest<{ Body: wishlistV2 }>, resp: FastifyReply): Promise<void> => {
  try {
    const result = {
      hasError: false,
      errors: [] as Array<string>
    };
    for (const c of req.body.caps) {
      if (instance.getColorway(c.id) === undefined) {
        result.hasError = true;
        result.errors.push(c.id);
      }
    }
    if (req.body.tradeCaps) {
      for (const c of req.body.tradeCaps) {
        if (instance.getColorway(c.id) === undefined) {
          result.hasError = true;
          result.errors.push(c.id);
        }
      }
    }
    return resp.status(200).send(result);
  } catch (e) {
    req.log.error(e);
    return resp.status(500).send('Oops! An error has occured');
  }
};
