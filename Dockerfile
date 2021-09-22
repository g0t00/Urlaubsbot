FROM node:12.18.3-stretch AS client-builder
USER node
COPY --chown=node:node client/package.json /home/node/app/package.json
COPY --chown=node:node client/package-lock.json /home/node/app/package-lock.json
WORKDIR /home/node/app
RUN npm ci
COPY --chown=node:node client/. /home/node/app/
COPY --chown=node:node lib/interfaces.ts /home/node/app/src/

RUN npx webpack


FROM node:12.18.3-stretch
USER node
COPY --chown=node:node package.json /home/node/app/package.json
COPY --chown=node:node package-lock.json /home/node/app/package-lock.json
WORKDIR /home/node/app
RUN npm ci
COPY --chown=node:node lib lib
COPY --chown=node:node tsconfig.json tsconfig.json
RUN npm run build
# COPY views views
COPY --from=client-builder --chown=node:node /home/node/app/index.html client/index.html
COPY --from=client-builder --chown=node:node /home/node/app/style.css client/style.css
COPY --from=client-builder --chown=node:node /home/node/app/dist/ client/dist/
CMD npm start