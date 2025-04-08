# Axiom: Quantitative Investment Platform

Axiom is a sophisticated quantitative investment platform that democratizes algorithmic trading for individual investors and financial advisors. This repository contains the full codebase for the Axiom platform.

## Overview

Axiom bridges the gap between professional trading capabilities and retail investors through AI-powered strategies. Key features include:

- **Algorithmic Trading Strategies**: Pre-built and customizable trading algorithms
- **Backtesting Engine**: Test strategies against historical market data
- **Real-time Data Processing**: Connect to market data providers
- **Portfolio Management**: Track and manage investment positions
- **Strategy Marketplace**: Share and discover trading strategies

## Architecture

Axiom is built using a modern tech stack:

- **Backend**: Python with FastAPI, SQLAlchemy, and TimescaleDB
- **Frontend**: Next.js with TypeScript, Tailwind CSS, and D3.js
- **Data Processing**: Pandas, NumPy, and machine learning libraries
- **External APIs**: Alpaca, Yahoo Finance

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 14+
- PostgreSQL 13+ (with TimescaleDB extension)
- Redis (optional, for caching)

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/axiom.git
   cd axiom
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the backend directory with the following variables:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/axiom
   TIMESCALE_URL=postgresql://postgres:postgres@localhost:5432/axiom_timeseries
   SECRET_KEY=your-secret-key-for-development
   ALPACA_API_KEY=your-alpaca-api-key
   ALPACA_API_SECRET=your-alpaca-api-secret
   ALPACA_API_BASE_URL=https://paper-api.alpaca.markets
   DEBUG=True
   ```

5. Create the database:
   ```bash
   psql -U postgres
   CREATE DATABASE axiom;
   CREATE DATABASE axiom_timeseries;
   ```

6. Run database migrations:
   ```bash
   python -c "from backend.models import Base, engine; Base.metadata.create_all(engine)"
   ```

7. Start the backend server:
   ```bash
   python main.py
   ```

   The API will be available at http://localhost:8000.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with the following variable:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at http://localhost:3000.

## Development Workflow

### Adding a New Strategy

1. Create a new strategy class in `backend/algorithms/`
2. Implement the required methods: `validate_parameters`, `generate_signals`, and `calculate_position_sizes`
3. Register the strategy in the frontend `StrategyBuilder` component

### Creating a New API Endpoint

1. Add a new route file in `backend/api/`
2. Implement the endpoint logic in `backend/services/`
3. Register the route in `backend/main.py`

### Adding a New UI Component

1. Create the component in `frontend/src/components/`
2. Add any required API service calls in `frontend/src/services/`
3. Include the component in the appropriate page

## Deployment

### Docker Deployment

Axiom can be deployed using Docker and Docker Compose:

```bash
docker-compose up -d
```

This will start the backend, frontend, PostgreSQL, and Redis services.

### Cloud Deployment

For production deployment, consider using:

- **Backend**: AWS ECS, Google Cloud Run, or Azure Container Apps
- **Frontend**: Vercel, Netlify, or AWS Amplify
- **Database**: AWS RDS, Google Cloud SQL, or Azure Database for PostgreSQL
- **Cache**: AWS ElastiCache, Google Cloud Memorystore, or Azure Cache for Redis

## Roadmap

Refer to the project breakdown document for the detailed development roadmap, which includes:

1. **MVP Phase** (Months 0-4)
2. **Market Validation Phase** (Months 5-9)
3. **Growth Phase** (Months 10-18)
4. **Expansion Phase** (Months 19-36)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.