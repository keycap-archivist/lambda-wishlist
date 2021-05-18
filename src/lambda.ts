import awsLambdaFastify from 'aws-lambda-fastify';
import app from './app';

const proxy = awsLambdaFastify(app);

module.exports.handler = proxy;
