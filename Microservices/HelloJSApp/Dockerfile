FROM node:8

# Create app directory
WORKDIR /hellojapp

COPY package*.json /hellojapp/

RUN npm install --unsafe-perm

COPY . /hellojapp/

EXPOSE 6001

CMD npm start