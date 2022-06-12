FROM node:12
RUN mkdir -p /usr/src
WORKDIR /usr/src

# Install dependencies
COPY package*.json ./
RUN npm install
RUN npm i -g pm2

# Bundle app source
COPY . .

# Exports
EXPOSE 9000 

CMD ["pm2-runtime", "start", "./src/index.js"]