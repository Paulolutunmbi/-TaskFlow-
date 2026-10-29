
# Use a lightweight official Node.js image
FROM node:24-bookworm-slim

# Set the application directory inside the container
WORKDIR /app

# Set the application to production mode
ENV NODE_ENV=production

# Copy dependency manifests first for better build caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy the application source code
COPY --chown=node:node . .

# Run the application as a non-root user
USER node

# Document the port used by TaskFlow
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
