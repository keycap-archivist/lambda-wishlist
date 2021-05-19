import fastify from 'fastify';
import fastifyCORS from 'fastify-cors';
import pino from 'pino';

import { postWishlist } from './api/controllers/wishlist';
import { instance } from './db/instance';
import { build as buildSchemas } from './internal/schemas';

const GIT_REV = process.env.GIT_REVISION;
const logger = pino().child({ revision: GIT_REV });
const app = fastify({ logger });

buildSchemas(app);
app.register(fastifyCORS, { origin: true, methods: 'GET,POST' });
app.register(async () => {
  await instance.init();
});
app.get('/', {}, (_, reply) => {
  reply.send({ keycap: 'archivist', fku: 'nav', revision: GIT_REV });
});

app.route({
  method: 'POST',
  url: '/wishlist',
  schema: {
    body: {
      $ref: '#wishlist'
    }
  },
  handler: postWishlist
});

if (require.main === module) {
  app.listen(3000, '0.0.0.0', (err) => {
    if (err) console.error(err);
  });
}

export default app;
