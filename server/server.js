const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const API_KEY = process.env.OPENWEATHER_API_KEY;
const CACHE_TTL_MS = (parseInt(process.env.CACHE_TTL_SECONDS, 10) || 600) * 1000; // default 10 mins

// Middleware
app.use(cors());
app.use(express.json());

// In-memory cache: key -> { data, timestamp }
const cache = new Map();

// Helper to clean expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}, 60 * 1000);

// Helper to format date as DD.MM.YYYY
function formatDate(date = new Date()) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

// Fallback data generator matching reference design or requested city
function generateFallbackWeather(city = 'Multan') {
  const today = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Format daily forecast starting from today
  const daily = [];
  const sampleTemps = [20, 32, 12, 13, 22, 22];
  const sampleConditions = ['Mist', 'Sunny', 'Rainy', 'Rainy', 'Mist', 'Mist'];
  
  for (let i = 0; i < 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    daily.push({
      day: i === 0 ? 'Today' : days[d.getDay()],
      temp: sampleTemps[i] ?? 20,
      condition: sampleConditions[i] ?? 'Cloudy',
      icon: sampleConditions[i] === 'Sunny' ? '01d' : (sampleConditions[i] === 'Rainy' ? '10d' : '50d')
    });
  }

  // Format hourly forecast (next 6 hours)
  const hourly = [];
  const hourlyTemps = [20, 21, 21, 20, 21, 21];
  const hourlyConditions = ['Cloudy', 'Rainy', 'Rainy', 'Cloudy', 'Rainy', 'Rainy'];
  
  const currentHour = today.getHours();
  for (let i = 0; i < 6; i++) {
    const targetHour = (currentHour + i + 1) % 24;
    const period = targetHour >= 12 ? 'PM' : 'AM';
    const displayHour = targetHour % 12 === 0 ? 12 : targetHour % 12;
    hourly.push({
      time: `${displayHour} ${period}`,
      temp: hourlyTemps[i] ?? 20,
      condition: hourlyConditions[i] ?? 'Cloudy',
      icon: hourlyConditions[i] === 'Rainy' ? '10d' : '04d'
    });
  }

  return {
    city: city.charAt(0).toUpperCase() + city.slice(1),
    country: 'PK',
    date: formatDate(today),
    current: {
      temp: 20,
      condition: 'Cloudy',
      description: 'broken clouds',
      icon: '04d',
      windSpeed: '6.1 mph',
      windSpeedRaw: 6.1,
      humidity: 90,
      feelsLike: 19
    },
    daily,
    hourly,
    source: 'fallback',
    message: API_KEY ? 'Simulated fallback data due to external API limit or response' : 'Demo mode: using mock data (Configure OPENWEATHER_API_KEY in .env for live data)'
  };
}

// Transform raw OpenWeatherMap responses into clean frontend payload
function transformWeatherData(currentData, forecastData, units = 'metric') {
  const speedUnit = units === 'imperial' ? 'mph' : 'm/s';
  const windMph = units === 'imperial' 
    ? currentData.wind.speed 
    : (currentData.wind.speed * 2.23694); // convert m/s to mph for display

  // Group forecast by day
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyMap = new Map();
  const todayStr = new Date().toISOString().split('T')[0];

  forecastData.list.forEach(item => {
    const itemDate = new Date(item.dt * 1000);
    const dateKey = itemDate.toISOString().split('T')[0];
    
    // Pick daytime reading around 12:00 or closest
    if (!dailyMap.has(dateKey) || item.dt_txt.includes('12:00:00')) {
      const isToday = dateKey === todayStr;
      dailyMap.set(dateKey, {
        day: isToday ? 'Today' : daysOfWeek[itemDate.getDay()],
        temp: Math.round(item.main.temp),
        condition: item.weather[0].main,
        icon: item.weather[0].icon
      });
    }
  });

  const daily = Array.from(dailyMap.values()).slice(0, 6);

  // Take next 6 hourly forecast intervals
  const hourly = forecastData.list.slice(0, 6).map(item => {
    const date = new Date(item.dt * 1000);
    const hours = date.getHours();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    return {
      time: `${displayHour} ${period}`,
      temp: Math.round(item.main.temp),
      condition: item.weather[0].main,
      icon: item.weather[0].icon
    };
  });

  return {
    city: currentData.name,
    country: currentData.sys.country,
    date: formatDate(new Date(currentData.dt * 1000)),
    current: {
      temp: Math.round(currentData.main.temp),
      condition: currentData.weather[0].main,
      description: currentData.weather[0].description,
      icon: currentData.weather[0].icon,
      windSpeed: `${windMph.toFixed(1)} mph`,
      windSpeedRaw: windMph,
      humidity: currentData.main.humidity,
      feelsLike: Math.round(currentData.main.feels_like)
    },
    daily,
    hourly,
    source: 'api'
  };
}

// Weather Proxy Route
app.get('/api/weather', async (req, res) => {
  const city = (req.query.city || 'Multan').trim();
  const units = req.query.units || 'metric';
  const cacheKey = `${city.toLowerCase()}_${units}`;

  // 1. Check in-memory cache
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({
        ...cached.data,
        source: 'cache'
      });
    }
    cache.delete(cacheKey);
  }

  // 2. If no valid API key, use fallback handler
  if (!API_KEY || API_KEY === 'your_api_key_here') {
    const fallbackData = generateFallbackWeather(city);
    return res.json(fallbackData);
  }

  // 3. Fetch from OpenWeatherMap API using async/await
  try {
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${units}&appid=${API_KEY}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=${units}&appid=${API_KEY}`;

    const [weatherRes, forecastRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(forecastUrl)
    ]);

    if (!weatherRes.ok || !forecastRes.ok) {
      if (weatherRes.status === 404) {
        return res.status(404).json({ error: `City "${city}" not found. Please verify the city name.` });
      }
      if (weatherRes.status === 401) {
        console.warn('Invalid API key provided, falling back to simulated data');
        return res.json(generateFallbackWeather(city));
      }
      throw new Error(`OpenWeather API returned ${weatherRes.status}`);
    }

    const currentData = await weatherRes.json();
    const forecastData = await forecastRes.json();

    const formattedPayload = transformWeatherData(currentData, forecastData, units);

    // Store in cache
    cache.set(cacheKey, {
      data: formattedPayload,
      timestamp: Date.now()
    });

    res.json(formattedPayload);
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    // Graceful fallback on unexpected network or upstream failure
    const fallback = generateFallbackWeather(city);
    fallback.message = `Showing fallback data due to API error: ${error.message}`;
    res.json(fallback);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(API_KEY && API_KEY !== 'your_api_key_here'),
    cachedItemsCount: cache.size
  });
});

app.listen(PORT, () => {
  console.log(`Weather backend proxy server running on http://localhost:${PORT}`);
});
