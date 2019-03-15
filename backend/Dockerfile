FROM node:alpine
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV DOCKERIZE_VERSION v0.6.1
COPY dockerize-alpine-linux-amd64-v0.6.1.tar.gz /root/dockerize.tar.gz
RUN tar -C /usr/local/bin -xzvf /root/dockerize.tar.gz \
    && rm /root/dockerize.tar.gz

ENV PATH /usr/src/app/:$PATH
COPY package.json /usr/src/app/package.json
RUN npm install --silent
EXPOSE 3001

CMD dockerize -wait tcp://db:3306 -timeout 60m node app.js
