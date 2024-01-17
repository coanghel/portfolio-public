# syntax=docker/dockerfile:1.4
FROM node:lts AS development

ENV CI=true
ENV PORT=3000

WORKDIR /code
COPY package.json /code/package.json
COPY package-lock.json /code/package-lock.json
RUN npm ci
COPY . /code

CMD ["npm", "start"]

FROM development AS production
RUN <<EOF
npm run build
EOF

FROM nginx:1.25.0-alpine
RUN rm /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=production /code/build /var/www
CMD ["nginx", "-g", "daemon off;"]