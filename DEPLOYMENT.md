# Product Deals Finder - Deployment Guide

This document provides instructions for deploying the Product Deals Finder application to a production environment.

## Prerequisites

Before deploying, ensure you have:
- A SerpAPI key (sign up at https://serpapi.com/)
- Access to a MongoDB database (cloud-based like MongoDB Atlas recommended for production)
- Node.js hosting environment (Heroku, DigitalOcean, AWS, etc.)

## Deployment Steps

### 1. Prepare the Environment

1. Create a production MongoDB database
2. Obtain your SerpAPI key
3. (Optional) Set up Redis for enhanced caching

### 2. Configure Environment Variables

Set the following environment variables in your hosting platform:

```
MONGODB_URI=your_mongodb_connection_string
SERPAPI_KEY=your_serpapi_key
PORT=8080 (or as provided by your hosting platform)
REDIS_ENABLED=true (if using Redis)
REDIS_URL=your_redis_connection_string (if using Redis)
```

### 3. Deploy the Application - Example we consider here as Heroku

#### For Heroku:

1. Create a new Heroku app
2. Set the environment variables in Heroku's settings
3. Connect your GitHub repository or use Heroku CLI to deploy
4. Add the MongoDB add-on or connect to your external MongoDB
5. (Optional) Add the Redis add-on if using Redis caching

#### For DigitalOcean App Platform:

1. Create a new App
2. Connect to your GitHub repository
3. Configure environment variables
4. Select appropriate instance size
5. Deploy the application

#### For AWS Elastic Beanstalk:

1. Create a new application
2. Create a new environment (Web server environment)
3. Upload your application code as a .zip file
4. Configure environment properties
5. Deploy the application

### 4. Verify Deployment

After deployment:

1. Check that the application loads correctly
2. Test the product search functionality
3. Verify that product deals are being fetched correctly
4. Confirm that recent searches are being saved

### 5. Production Optimizations

For optimal performance in production:

1. Enable Redis caching to reduce SerpAPI calls
2. Set up a CDN for static assets
3. Implement proper error logging and monitoring
4. Consider setting up auto-scaling if expecting high traffic

## Troubleshooting Common Deployment Issues

- **Application crashes on startup**: Check environment variables and MongoDB connection
- **Deals not loading**: Verify SerpAPI key is correct and has sufficient quota
- **Slow performance**: Enable Redis caching and optimize MongoDB queries
- **Memory issues**: Check for memory leaks and optimize resource usage

## Maintenance

Regular maintenance tasks:

1. Monitor SerpAPI usage to avoid exceeding quotas
2. Update Node.js dependencies regularly for security patches
3. Back up MongoDB data periodically
4. Monitor application logs for errors and performance issues