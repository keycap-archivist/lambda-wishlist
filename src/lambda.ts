import awsLambdaFastify from '@fastify/aws-lambda';
import app from './app';

const proxy = awsLambdaFastify(app, { binaryMimeTypes: ['image/png'] });

module.exports.handler = proxy;
