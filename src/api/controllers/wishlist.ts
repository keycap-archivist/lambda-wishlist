// import { v4 as uuidv4 } from 'uuid';

// import { getImgBuffer, supportedFonts, addSubmission } from '#app/internal/utils';
import { generateWishlist } from '../../internal/image-processor-v2';
// import { instance } from '#app/db/instance';
// import { getSubmissionBuffer, discordSubmissionUpdate, discordSubmitCapName } from '#app/internal/utils';

// import type { ColorwayDetailed } from '#app/db/instance';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { wishlistCap, wishlistV2 } from '../../internal/image-processor-v2';

export const postWishlist = async (req: FastifyRequest<{ Body: wishlistV2 }>, resp: FastifyReply): Promise<void> => {
  try {
    const imgBuffer = await generateWishlist(req.log, req.body);
    if (imgBuffer) {
      return resp
        .header('content-disposition', `attachment; filename="wishlist.png"`)
        .type('image/png')
        .status(200)
        .send(imgBuffer);
    }

    return resp.status(500).send('Oops! An error has occured');
  } catch (e) {
    req.log.error(e);
    resp.status(500).send('Oops! An error has occured');
  }
};

// export const getWishlistSettings = async (_: FastifyRequest, resp: FastifyReply): Promise<void> => {
//   resp.type('application/json').status(200).send({ fonts: supportedFonts });
// };

// export const getSubmissionCap = async (req: FastifyRequest, resp: FastifyReply): Promise<void> => {
//   const params = req.params as Record<string, string>;
//   const b = await getSubmissionBuffer(params.id);
//   if (!b) {
//     resp.status(404).send('Not found');
//     return;
//   }
//   resp.header('content-disposition', `filename="${params.id}.jpg"`).type('image/jpeg').status(200).send(b);
// };

// export const submitCap = async (
//   req: FastifyRequest<{ Body: { maker: string; sculpt: string; colorway: string; data: { data: Buffer }[] } }>,
//   resp: FastifyReply
// ): Promise<void> => {
//   const { maker, sculpt, colorway, data } = req.body;
//   const submission = { maker, sculpt, colorway, id: uuidv4() };
//   await addSubmission(submission, data[0].data);
//   await discordSubmissionUpdate(submission);
//   resp.status(200).send('OK');
// };

// export const submitName = async (
//   req: FastifyRequest<{ Body: { id: string; name: string } }>,
//   resp: FastifyReply
// ): Promise<void> => {
//   const { id, name } = req.body;

//   const colorway = instance.getColorway(id);

//   if (!colorway) {
//     resp.status(404).send('Not found');
//     return;
//   }

//   await discordSubmitCapName(colorway, name);
//   resp.status(200).send('OK');
// };
