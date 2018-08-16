FROM debian:latest

ENV TERM linux
ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update
RUN apt-get install -y --no-install-recommends apt-utils
RUN apt-get install -y jpegoptim
RUN apt-get install -y imagemagick
RUN apt-get install -y pngquant
RUN apt-get install -y webp
RUN apt-get install -y curl software-properties-common gnupg
RUN apt-get install -y make
RUN apt-get install -y build-essential
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get install -y nodejs

# Create app directory
WORKDIR /server

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install --production
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

RUN mkdir /imgsrvtmp

EXPOSE 80
EXPOSE 9222
CMD [ "npm", "start" ]
