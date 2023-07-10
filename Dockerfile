# Используем базовый образ Node.js 18
FROM node:18

# Создаем директорию приложения
WORKDIR /usr/src/app

#ffmpeg для работы с голосом
RUN apt update
RUN apt install -y ffmpeg

# Копируем зависимости приложения в образ
COPY *.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем остальные файлы приложения в образ
COPY ./src ./src
COPY ./config ./config

# Открываем порт, на котором будет работать приложение
EXPOSE 3000

# Запускаем приложение
CMD [ "npm", "run", "start:dev" ]