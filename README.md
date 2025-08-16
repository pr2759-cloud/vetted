# Vetted - AI-Powered Product Discovery Platform

An intelligent product discovery platform that combines AI-powered search with real-time sentiment analysis to help users find products they'll actually love.

## 🚀 Features

- **Intelligent Search**: Natural language product discovery powered by AI
- **Sentiment Analysis**: Real-time analysis of reviews and social mentions
- **Trending Insights**: Track product momentum and popularity
- **Chat Interface**: Conversational product discovery experience
- **Responsive Design**: Optimized for desktop and mobile devices
- **Real-time Updates**: Live sentiment and trending data

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Query** for state management
- **React Router** for navigation
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **MongoDB** for data storage
- **Redis** for caching
- **JWT** for authentication
- **Winston** for logging
- **Express Rate Limit** for API protection

### Infrastructure
- **Docker & Docker Compose** for containerization
- **Nginx** for reverse proxy (production)
- **MongoDB Express** for database admin
- **Redis Commander** for cache management

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js (>=16.0.0)
- npm (>=8.0.0)
- Docker & Docker Compose (optional)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/vetted.git
   cd vetted
   ```

2. **Install dependencies**
   ```bash
   npm run setup
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend at http://localhost:3000
   - Backend at http://localhost:3001

### Docker Development

1. **Start with Docker Compose**
   ```bash
   docker-compose up
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - MongoDB Admin: http://localhost:8081 (admin/admin123)
   - Redis Commander: http://localhost:8082

## 📁 Project Structure

```
vetted/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript definitions
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json
├── backend/                 # Node.js Express backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── services/       # Business logic
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   └── config/         # Configuration
│   └── package.json
├── docker-compose.yml      # Docker services
├── .env.example           # Environment variables template
└── package.json          # Root package.json
```

## 🔧 Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both frontend and backend for production
- `npm run test` - Run tests for both applications
- `npm run lint` - Lint both applications
- `npm run setup` - Install all dependencies

### Frontend
- `npm run frontend:dev` - Start frontend development server
- `npm run frontend:build` - Build frontend for production
- `npm run frontend:test` - Run frontend tests
- `npm run frontend:lint` - Lint frontend code

### Backend
- `npm run backend:dev` - Start backend in development mode
- `npm run backend:build` - Build backend for production
- `npm run backend:test` - Run backend tests
- `npm run backend:lint` - Lint backend code

## 🌐 API Documentation

The API documentation is available at http://localhost:3001/api/docs when running in development mode with `ENABLE_SWAGGER_DOCS=true`.

### Main Endpoints

- `POST /api/search` - Search for products
- `GET /api/search/suggestions` - Get search suggestions
- `GET /api/products` - Get products with filters
- `GET /api/products/trending` - Get trending products
- `GET /api/sentiment/:productId` - Get product sentiment

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Production
```bash
docker-compose -f docker-compose.yml --profile production up
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 Environment Variables

Key environment variables to configure:

- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection URL
- `JWT_SECRET` - Secret for JWT token signing
- `FRONTEND_URL` - Frontend URL for CORS

See `.env.example` for complete configuration options.

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill processes on ports 3000/3001
   npx kill-port 3000 3001
   ```

2. **MongoDB connection issues**
   - Ensure MongoDB is running
   - Check MONGODB_URI in .env

3. **Redis connection issues**
   - Ensure Redis is running
   - Check REDIS_URL in .env

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with React, Node.js, and MongoDB
- UI components inspired by modern design systems
- Sentiment analysis powered by community data

---

**Made with ❤️ by the Vetted Team**
