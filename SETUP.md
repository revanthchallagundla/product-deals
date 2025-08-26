# Product Deals Finder - Setup Instructions

This document provides detailed instructions for setting up and deploying the Product Deals Finder application.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- SerpAPI key (sign up at https://serpapi.com/)
- Redis (optional, for enhanced caching)

## Frontend Setup

1. Navigate to the project root directory:
   ```
   cd product-deals-app
   ```

2. Open the `src/assets/app.js` file and update the `API_BASE_URL` variable if needed:
   ```javascript
   const API_BASE_URL = '/api'; // Change this if your API is hosted elsewhere
   ```

## Backend Setup

1. Navigate to the backend directory:
   ```
   cd product-deals-app/backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the provided `.env.example`:
   ```
   cp .env.example .env
   (or)
   copy .env.example .env
   ```

4. Edit the `.env` file and update the following variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `PORT`: The port for the backend server (default: 3000)
   - `SERPAPI_KEY`: Your SerpAPI key
   - `REDIS_ENABLED`: Set to 'true' if you want to use Redis caching
   - `REDIS_URL`: Your Redis connection string (if Redis is enabled)

## Running the Application Locally

1. Start the backend server:
   ```
   cd backend
   npm start
   ```

2. Access the application in your browser:
   ```
   http://localhost:3000
   ```

## Deployment Options

### Option 1: Traditional Hosting

1. Deploy the backend to a Node.js hosting service (e.g., Heroku, DigitalOcean, AWS):
   - Set up environment variables in your hosting platform
   - Deploy the backend code

2. Deploy the frontend to a static hosting service (e.g., Netlify, Vercel, GitHub Pages):
   - Update the `API_BASE_URL` in `app.js` to point to your deployed backend
   - Upload the `src` directory contents

### Option 2: Combined Deployment

Since the backend serves the frontend, you can deploy the entire application to a Node.js hosting service:

1. Ensure your MongoDB and Redis (if used) are accessible from your hosting environment
2. Set up environment variables in your hosting platform
3. Deploy the entire project directory

## Production Considerations

1. **Security**:
   - Ensure your MongoDB instance is properly secured
   - Use environment variables for all sensitive information
   - Consider implementing rate limiting for API endpoints

2. **Performance**:
   - Enable Redis caching for improved performance
   - Consider implementing a CDN for static assets

3. **Monitoring**:
   - Set up logging and monitoring for your production environment
   - Monitor SerpAPI usage to avoid exceeding quotas

## Troubleshooting

- **API Connection Issues**: Verify that the `API_BASE_URL` in the frontend matches your backend URL
- **MongoDB Connection Errors**: Check your MongoDB connection string and ensure the database is accessible
- **SerpAPI Errors**: Verify your API key and check SerpAPI's status page for any service disruptions

## Additional Resources

- SerpAPI Documentation: https://serpapi.com/docs
- MongoDB Documentation: https://docs.mongodb.com/
- Redis Documentation: https://redis.io/documentation
