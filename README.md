# Product Deals Finder App

A modern web application that allows users to search for multiple products (up to 5) and find the best shopping deals for each product from across the web.

![image](https://github.com/user-attachments/assets/f883f48c-a633-4ea2-9e2f-97d85e7d0142)



## Features

- **Multi-Product Search**: Search for up to 5 products simultaneously
- **Autocomplete**: Real-time product suggestions as you type
- **Grouped Deals**: All your deals are grouped based on the product
- **Recent Searches**: Quickly access your previous searches
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Result Filtering**: Filter results by source, price, and ratings

## Enhancements
- **Deal Comparison**: View and compare deals from multiple sources
- **Load More**: Pagination support for viewing additional deals
- **Authentication**: Allow Using Google, Facebook.
- **Dashboard**: Show all the user search history in the main grid( From Most frequent times to least frequent time in a graph format), How much you saved after you since you joined in our family. Provision to store list of search (Max 5) - Create/Update/Delete/Select number of lists with name.
  - Users to save their search and as well provide an option to save for quicker search in autocomplete with dropdown from existing if any but this option only for authenticated user. Pick if any selected list available to that loggedIn user.

## Tech Stack

### Frontend
- HTML5, CSS3, JavaScript
- Tailwind CSS for styling
- Axios for API requests

### Backend
- Node.js with Express
- MongoDB for database
- SerpAPI integration for product deals
- Redis (optional) for enhanced caching

## Project Structure
```
PRODUCT-DEALS-APP/
├── .vscode/                     # VSCode settings (optional)
│   └── settings.json
├── public/                      # Static assets served at /
│   ├── favicon.ico
│   ├── placeholder.png
│   └── assets/                  # any other images, icons, etc.
├── src/                         # all app source lives here
│   ├── pages/                   # Next.js pages & API routes
│   │   ├── api/                 
│   │   │   ├── autocomplete.js  # was autocompleteController.js
│   │   │   └── deals.js         # was dealsController.js
│   │   ├── _app.js              # global App wrapper
│   │   └── index.js             # your main UI entry
│   ├── components/              # reusable React components
│   │   ├── Autocomplete/        
│   │   │   └── Autocomplete.jsx
│   │   ├── DealsList/           
│   │   │   └── DealsList.jsx
│   │   └── Layout.jsx           # header/footer, etc.
│   ├── lib/                     # “server-side” helpers
│   │   ├── db.js                # mongoose connect
│   │   ├── redis.js             # redis client
│   │   ├── serpApi.js           # SerpAPI wrapper
│   │   └── config.js            # env & allowed sources
│   ├── models/                  # Mongoose schemas
│   │   ├── Product.js
│   │   ├── ProductHistory.js
│   │   └── ProductResponse.js
│   ├── data/                    # static seed data
│   │   └── products.json
│   └── utils/                   # pure-JS utilities
│       └── sourceFilter.js
├── styles/                      # global & component CSS
│   ├── globals.css              # imports tailwind base/utilities
│   └── tailwind.config.js       # your Tailwind setup
├── .env.example                 # sample env vars
├── .env.local                   # dev env vars (git-ignored)
├── next.config.js               # Next.js custom config
├── package.json                 
├── README.md                    
├── SETUP.md                     
├── DEPLOYMENT.md                
└── USAGE_POLICIES.md            
```

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/nuthanm/product-deals-app.git
   cd product-deals-app
   ```
2. Set up the backend:
    ```
    cd backend
    npm install
    cp .env.example .env
    Windows: copy .env.example .env
    # Edit .env with your MongoDB URI and SerpAPI key
   ```
3. Start the application:
   ```
     npm start
     npm run dev
   ```
4. To stop the application
   ```
    CTRL + C and press Y
   ```
## API Endpoints
```
GET /api/autocomplete?query=<search_term> - Get autocomplete suggestions
POST /api/deals - Get deals for multiple products (up to 5 )
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| MONGODB_URI | MongoDB connection string | Yes |
| PORT | Server port (default: 3000) | No |
| SERPAPI_KEY | SerpAPI key for fetching deals | Yes |
| REDIS_ENABLED | Enable Redis caching (true/false) | No |
| REDIS_URL | Redis connection string | If Redis enabled |
| ALLOWED_SOURCES | Comma-separated list of allowed sources | Yes |
| FEATURED_LIMIT | Number of features to allow | Yes |
| MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS | Default is 2 | Yes |
| MAXIMUM_PRODUCTS_PERDAY_USER_AUTHENTICATED | Max is 5 | Yes |
| SOURCE_UPDATE_DAYS | Json object where it holds key value pair - On which day source updates the prices | Yes |

## File wise tech stack for your understand
| Category          | Technology                        | Purpose                                                | Reference                                              |
|-------------------|-----------------------------------|--------------------------------------------------------|--------------------------------------------------------|
| **Frontend**      | HTML5                             | Main UI structure                                      | `index.html`                                           |
|                   | Tailwind CSS                      | Utility-first styling                                  | `index.html`                                           |
|                   | Font Awesome                      | Icon library                                           | `index.html`                                           |
|                   | JavaScript (Vanilla)              | DOM manipulation & state management                    | `app.js`                                               |
|                   | Axios                             | HTTP client for API requests                           | `app.js`                                               |
|                   | localStorage                      | Persist “Recent Searches”                              | `app.js`                                               |
| **Backend**       | Node.js                           | JavaScript runtime                                     | `server.js`, `index.js`                                |
|                   | Express.js                        | Web framework & routing                                | `server.js`, `index.js`                                |
|                   | dotenv                            | Environment-variable management                         | `server.js`                                            |
|                   | CORS                              | Cross-origin request support                           | `server.js`                                            |
| **Controllers**   | AutocompleteController            | `/api/autocomplete` endpoint with caching               | `autocompleteController.js`                            |
|                   | DealsController                   | `/api/deals` endpoint with SerpAPI integration          | `dealsController.js`                                   |
| **Database**      | MongoDB (via Mongoose)            | Primary data store & ODM                               | `Product.js`, `ProductHistory.js`, `ProductResponse.js`|
|                   | Redis                             | Optional caching layer for autocomplete & deals        | Config in `autocompleteController.js`, `dealsController.js` |
| **External API**  | SerpAPI                           | Fetch live product deals                               | Integrated in `dealsController.js`                     |
| **Static Data**   | products.json                     | Fallback seed list for autocomplete                    | `products.json`                                        |
| **Deployment**    | Railway                           | Hosted production API endpoint                         | Deployed API at `window.API_BASE_URL`                  |
| **Config**        | `.env`                            | SERPAPI_KEY, MONGODB_URI, REDIS_URL, ALLOWED_SOURCES    | `.env`                                                 |

### During Development we tested the application using
**Backend:** [Rail](https://railway.com/)

**Frontend:** [Vercel](https://vercel.com/)

### It's time to Gratitude
**[Manus](https://manus.im/)** and **[Open AI - ChatGpt](https://chatgpt.com/)**
