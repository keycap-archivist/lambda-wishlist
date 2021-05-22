import { generateWishlist, supportedFonts } from '../../internal/image-processor-v2';

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { wishlistV2 } from '../../internal/image-processor-v2';

export const postWishlist = async (req: FastifyRequest<{ Body: wishlistV2 }>, resp: FastifyReply): Promise<void> => {
  try {
    const imgBuffer = await generateWishlist(req.log, req.body);
    if (imgBuffer) {
      return resp.send({
        StatusCode: 200,
        Headers: {
          'Content-Disposition': `attachment; filename="wishlist.png"`,
          'Content-Type': `image/png`
        },
        IsBase64Encoded: true,
        Body: imgBuffer.toString('base64')
      });
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
