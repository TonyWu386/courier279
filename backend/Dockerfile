FROM node
RUN mkdir /usr/src/app
WORKDIR /usr/src/app
ENV PATH /usr/src/app/:$PATH
COPY package.json /usr/src/app/package.json
RUN npm install --silent
EXPOSE 3001
