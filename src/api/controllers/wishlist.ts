import { generateWishlist, supportedFonts } from '../../internal/image-processor-v2';
import { instance } from '../../db/instance';

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { wishlistV2 } from '../../internal/image-processor-v2';

export const postWishlist = async (req: FastifyRequest<{ Body: wishlistV2 }>, resp: FastifyReply): Promise<void> => {
  try {
    const imgBuffer = await generateWishlist(req.log, req.body);
    if (!imgBuffer.isError) {
      if (req.headers.accept.includes('image/png')) {
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
          Body: imgBuffer.result.toString('base64')
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
      errors: []
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
