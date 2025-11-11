# 1. Use an official Node.js runtime as a parent image
# Using a specific version is good practice for consistency
FROM node:18-alpine

# 2. Set the working directory in the container
WORKDIR /app

# 3. Copy package.json and package-lock.json
# This is done separately to leverage Docker's layer caching.
# Dependencies will only be re-installed if these files change.
COPY package*.json ./

# 4. Install application dependencies inside the container
RUN npm install

# 5. Copy the rest of your application's source code
COPY . .

# 6. Expose the port the app runs on
EXPOSE 3000

# 7. Define the command to run your app
CMD [ "npm", "start" ]