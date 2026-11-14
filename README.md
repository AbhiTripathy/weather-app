# Weather Forecast Application ⛅

A lean, high-fidelity, API-driven weather forecast application built with **React.js** and a secure **Node.js/Express.js** backend proxy.

Designed based on a clean, modern dashboard aesthetic with daily and hourly forecast breakdowns, live dynamic updates, and backend caching.

---

## ✨ Features

- **External API Integration with `async/await`**: Direct integration with OpenWeatherMap 5-day / 3-hour forecast & current weather APIs.
- **Backend Proxy for API Security**: Keeps private API keys secure on the server; the client never exposes secret credentials.
- **In-Memory Caching**: Implements a time-to-live (TTL) cache (default: 10 minutes) on the server to prevent rate-limiting and accelerate response times.
- **Error & Fallback Handling**:
  - Handles missing API keys gracefully with realistic fallback demo data matching the UI reference.
  - Returns clear HTTP 404 responses for invalid city names.
  - Catches upstream network or API failures with fallback states and retry capabilities.
- **Dynamic UI Updates**:
  - Search any city on the fly (click on the city name in the top-left).
  - Live clock and dynamic greeting (*Good Morning / Good Afternoon / Good Evening*).
  - 6-day daily forecast with "Today" pill highlight.
  - 3x2 hourly forecast grid matching the reference design.
- **Environment Configuration**: Configured via `.env` with configurable port, API key, and cache expiration.

---

## 🏗️ Project Architecture

```
weather/
├── server/                 # Node.js + Express backend
│   ├── .env.example        # Sample environment variables
│   ├── .env                # Server configuration (PORT, API key, Cache TTL)
│   ├── package.json        # Express, cors, dotenv
│   └── server.js           # API proxy, cache engine, fallback generator
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx         # Weather dashboard, state management, search
│   │   ├── index.css       # Clean layout matching design reference
│   │   └── main.jsx        # App entry point
│   ├── index.html          # HTML shell with Google Plus Jakarta Sans font
│   ├── package.json        # React 18, Lucide React, Vite
│   └── vite.config.js      # Development proxy setup
├── package.json            # Root workspace scripts
└── README.md
```

---

## 🚀 Quick Start (Running in under 2 minutes)

### 1. Start the Backend Proxy
Open a terminal in the root directory:
```bash
npm run server
```
*The server will start at `http://localhost:5000`.*

### 2. Start the Frontend
In a second terminal:
```bash
npm run client
```
*Open `http://localhost:3000` in your browser.*

---

## 🔑 Environment Configuration

In `server/.env`:
```env
PORT=5000
OPENWEATHER_API_KEY=your_openweathermap_api_key_here
CACHE_TTL_SECONDS=600
```
> **Note:** If `OPENWEATHER_API_KEY` is not provided, the application runs seamlessly in **Demo/Fallback mode** using simulated data matching the design reference, allowing instant testing without API registration!

---

## 🛠️ API Proxy Endpoints

- `GET /api/weather?city={cityName}&units=metric`: Fetches and formats current weather, daily forecasts, and hourly intervals.
- `GET /api/health`: Backend health status, cache size, and API key status.

---

## 📦 Git Commit Log
This project was built iteratively with structured git commits:
1. `chore: initial project repository and gitignore setup`
2. `feat(backend): implement express proxy with caching, env config, and fallback handler`
3. `feat(frontend): build React UI matching design reference with hourly/daily forecast and live search`
4. `docs: add comprehensive readme and root workspace scripts`
