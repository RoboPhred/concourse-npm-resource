FROM node:5
WORKDIR /opt/resource
COPY check.js check
COPY in.js in
COPY out.js out
COPY package.json package.json
RUN npm i --quiet & \
    chmod +x /opt/resource/check /opt/resource/in /opt/resource/out
