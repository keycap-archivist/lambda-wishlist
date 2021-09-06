import fastify from 'fastify';
import fastifyCORS from 'fastify-cors';
import pino from 'pino';

import { postWishlist, getWishlistSettings, checkWishlist } from './api/controllers/wishlist';
import { instance } from './db/instance';
import { build as buildSchemas } from './internal/schemas';
import { initImgProcessor } from './internal/image-processor-v2';

const GIT_REV = process.env.GIT_REVISION;
const logger = pino().child({ revision: GIT_REV });
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
  handler: checkWishlist
});

app.route({
  method: 'GET',
  url: '/wishlist/settings',
  handler: getWishlistSettings
});

if (require.main === module) {
  app.listen(3001, '0.0.0.0', (err) => {
    if (err) console.error(err);
  });
}

export default app;
