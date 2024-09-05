# https://hub.docker.com/_/node
FROM node:22-slim as builder

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND yarn.lock are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package.json yarn.lock ./

# Install production dependencies.
RUN yarn install

# Copy local code to the container image.
COPY . ./

# Build artifacts
RUN yarn build

# Runner configuration
FROM node:22-slim as runner

# ARG APP
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install --production=true
COPY --from=builder /usr/src/app/dist ./dist
EXPOSE ${PORT}/tcp
USER 1000:1000
CMD yarn start:prod
