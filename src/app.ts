import fastify from 'fastify';
import fastifyCORS from 'fastify-cors';

import { postWishlist } from './api/controllers/wishlist';
import { instance } from './db/instance';
import { build as buildSchemas } from './internal/schemas';

const app = fastify({ logger: true });

buildSchemas(app);
app.register(fastifyCORS, { origin: true, methods: 'GET,POST' });

app.get('/', {}, (_, reply) => {
  reply.send({ hello: 'world' });
});

app.route({
  method: 'POST',
  url: '/wishlist',
  schema: {
    body: {
      $ref: '#wishlist'
    }
  },
  preHandler: async () => {
    await instance.init();
  },
  handler: postWishlist
});

if (require.main === module) {
  app.listen(3000, '0.0.0.0', (err) => {
    if (err) console.error(err);
  });
}

export default app;
