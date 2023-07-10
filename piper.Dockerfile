FROM node:18

# Установка зависимостей Piper
RUN apt  update -y

RUN apt install tar

WORKDIR /usr/src/piper

COPY ./piper/models ./models
RUN mkdir piper_installer
RUN mkdir src

COPY ./piper/installer/piper_amd64.tar.gz ./piper_installer

RUN tar -xvzf ./piper_installer/piper_amd64.tar.gz

WORKDIR /usr/src/piper/src
RUN npm i -g nodemon

COPY ./piper/src/package.json ./

RUN npm i

CMD ["nodemon", "./piper-server/server.js"]