# 1. Use Node.js to build the app
FROM node:18-slim

WORKDIR /app

# 2. Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# 3. Copy the rest of the React code
COPY . .

# 4. Expose the React dev port
EXPOSE 3000

# 5. Start the React development server
CMD ["npm", "start"]