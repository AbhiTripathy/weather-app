import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle, Wind, Droplets, Compass } from 'lucide-react';

export default function App() {
  const [city, setCity] = useState('Multan');
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Keep live time updated
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch weather from backend proxy
  const fetchWeather = async (targetCity = city) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/weather?city=${encodeURIComponent(targetCity)}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Unable to fetch weather (Status: ${res.status})`);
      }

      const data = await res.json();
      setWeatherData(data);
      setCity(data.city);
    } catch (err) {
      setError(err.message || 'Failed to connect to weather server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather('Multan');
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    fetchWeather(searchInput.trim());
    setIsSearching(false);
    setSearchInput('');
  };

  // Determine greeting based on current hour
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  // Format 12:27 PM
  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="app-container">
      {/* Top Banner for Error or Demo Mode */}
      {error && (
        <div className="status-banner error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => fetchWeather(city)} className="banner-btn">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {weatherData?.source === 'fallback' && !error && (
        <div className="status-banner info-banner">
          <span>⚡ {weatherData.message}</span>
        </div>
      )}

      {/* Main Weather Card matching the reference design */}
      <div className="weather-card">
        {/* LEFT PANEL: Main forecast & daily breakdown */}
        <section className="left-panel">
          {/* Header: City Name / Search & Date */}
          <header className="card-header">
            {isSearching ? (
              <form onSubmit={handleSearch} className="city-search-form">
                <input
                  type="text"
                  autoFocus
                  placeholder="Enter city (e.g. London, Tokyo)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="city-input"
                />
                <button type="submit" className="search-submit-btn">Search</button>
                <button
                  type="button"
                  onClick={() => setIsSearching(false)}
                  className="search-cancel-btn"
                >
                  ✕
                </button>
              </form>
            ) : (
              <div className="city-display" onClick={() => setIsSearching(true)} title="Click to search another city">
                <h1 className="city-name">{weatherData ? weatherData.city : city}</h1>
                <Search size={16} className="city-search-icon" />
              </div>
            )}

            <div className="date-display">
              {weatherData?.date || '21.04.2021'}
            </div>
          </header>

          {/* Center Hero: Huge Temperature, Icons & Condition */}
          <div className="hero-weather">
            <div className="hero-temp-row">
              <span className="big-temp">
                {loading && !weatherData ? '--' : weatherData?.current.temp}
              </span>
              <span className="degree-symbol">°</span>

              {/* Side Indicators: Wind & Humidity */}
              <div className="hero-metrics">
                <div className="metric-item">
                  <Wind size={20} className="metric-icon" strokeWidth={1.8} />
                  <span>{weatherData?.current.windSpeed || '6.1 mph'}</span>
                </div>
                <div className="metric-item">
                  <Droplets size={20} className="metric-icon" strokeWidth={1.8} />
                  <span>{weatherData?.current.humidity ?? 90}%</span>
                </div>
              </div>
            </div>

            <div className="hero-condition">
              {weatherData?.current.condition || 'Cloudy'}
            </div>
          </div>

          {/* Daily Forecast Row */}
          <div className="daily-forecast-row">
            {weatherData?.daily?.map((dayItem, idx) => {
              const isToday = dayItem.day.toLowerCase() === 'today' || idx === 0;
              return (
                <div
                  key={`${dayItem.day}-${idx}`}
                  className={`daily-card ${isToday ? 'active-today' : ''}`}
                >
                  <span className="day-name">{dayItem.day}</span>
                  <span className="day-temp">{dayItem.temp}°</span>
                  <span className="day-condition">{dayItem.condition}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* RIGHT PANEL: Sidebar with Greeting, Time, Feels Like, Hourly Forecast */}
        <aside className="right-panel">
          <div className="greeting-section">
            <h2 className="greeting-text">{getGreeting()}</h2>
            <div className="clock-time">{formattedTime}</div>
          </div>

          {/* Secondary mini snapshot */}
          <div className="mini-weather-summary">
            <div className="mini-temp-row">
              <span className="mini-temp">{weatherData?.current.temp ?? 20}°</span>
              <div className="mini-metrics">
                <div className="mini-metric">
                  <Wind size={13} strokeWidth={1.6} />
                  <span>{weatherData?.current.windSpeed || '6.1 mph'}</span>
                </div>
                <div className="mini-metric">
                  <Droplets size={13} strokeWidth={1.6} />
                  <span>{weatherData?.current.humidity ?? 90}%</span>
                </div>
              </div>
            </div>
            <div className="feels-like">
              Feels like {weatherData?.current.feelsLike ?? 19}°
            </div>
            <div className="mini-condition">
              {weatherData?.current.condition || 'Cloudy'}
            </div>
          </div>

          {/* Hourly Forecast Section */}
          <div className="hourly-section">
            <h3 className="hourly-title">Hourly Forecast</h3>
            <div className="hourly-grid">
              {weatherData?.hourly?.map((hourItem, idx) => (
                <div key={`${hourItem.time}-${idx}`} className="hourly-card">
                  <span className="hourly-time">{hourItem.time}</span>
                  <span className="hourly-temp">{hourItem.temp}°</span>
                  <span className="hourly-condition">{hourItem.condition}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <footer className="app-footer">
        <span>Clean API-Driven Weather Project • Backend Proxy & Cache Active</span>
        <button 
          onClick={() => fetchWeather(city)} 
          className="refresh-btn"
          disabled={loading}
          title="Refresh forecast data"
        >
          <RefreshCw size={13} className={loading ? 'spinning' : ''} />
          {loading ? 'Updating...' : 'Refresh'}
        </button>
      </footer>
    </div>
  );
}
