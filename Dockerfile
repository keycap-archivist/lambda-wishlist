ARG FUNCTION_DIR="/function"
ARG GIT_REV

FROM node:14.15.1-slim as build-img

COPY ./ /src
WORKDIR /src
RUN yarn
RUN yarn build

FROM node:14.15.1-buster

ARG FUNCTION_DIR
RUN apt-get update
RUN apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    g++ \
    make \
    cmake \
    unzip \
    libcurl4-openssl-dev

WORKDIR ${FUNCTION_DIR}
ENV GIT_REVISION="${GIT_REV}"
COPY --from=build-img /src/dist ${FUNCTION_DIR}
COPY --from=build-img /src/package.json ${FUNCTION_DIR}/package.json
RUN yarn --production=true
RUN yarn add aws-lambda-ric


ENTRYPOINT ["/usr/local/bin/npx", "aws-lambda-ric"]
CMD ["lambda.handler"]

