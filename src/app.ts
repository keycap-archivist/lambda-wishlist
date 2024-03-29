import fastify from 'fastify';
import fastifyCORS from '@fastify/cors';
import pino from 'pino';

import { postWishlist, getWishlistSettings, checkWishlist, textWishlist } from './api/controllers/wishlist';
import { instance } from './db/instance';
import { build as buildSchemas } from './internal/schemas';
import { initImgProcessor } from './internal/image-processor-v2';

const GIT_REV = process.env.GIT_REVISION;
const logger = pino(pino.destination({ sync: true })).child({ revision: GIT_REV });
const app = fastify({ logger, exposeHeadRoutes: true, pluginTimeout: 20000 });

buildSchemas(app);
app.register(fastifyCORS, { origin: true, methods: 'GET,POST' });
app.register(async () => {
  initImgProcessor();
  await instance.init();
});

app.get('/wishlist/info', {}, (_, reply) => {
  reply.send({ keycap: 'archivist', revision: GIT_REV });
});

app.route({
  method: 'POST',
  url: '/wishlist/text',
  schema: {
    body: {
      $ref: '#wishlist'
    }
  },
  handler: textWishlist
});

app.route({
  method: 'POST',
  url: '/wishlist/generate',
  schema: {
    body: {
      $ref: '#wishlist'
    }
  },
  handler: postWishlist
});

app.route({
  method: 'POST',
  url: '/wishlist/check',
  schema: {
    body: {
      $ref: '#wishlist'
    }
  },
  handler: checkWishlist as () => void
});

app.route({
  method: 'GET',
  url: '/wishlist/settings',
  handler: getWishlistSettings as () => void
});

if (require.main === module) {
  app.listen({ port: 3001, host: '0.0.0.0' }, (err) => {
    if (err) console.error(err);
  });
}

export default app;
