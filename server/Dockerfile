FROM node:16-alpine3.16

# Establece el directorio de trabajo en el contenedor
WORKDIR /app

# Copia el package.json y el package-lock.json al contenedor
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de los archivos de la aplicación al contenedor
COPY . .

# Expone el puerto en el que tu aplicación va a correr
EXPOSE 3000

# Define el comando para correr tu aplicación
CMD ["node", "server.js"]