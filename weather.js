// Weather Forecast feature — isolated module, no dependencies.
// Data: Open-Meteo Forecast API + Open-Meteo Geocoding API (both free, no key required).
// Indian PIN codes are resolved from a bundled local dataset (pincodes-in.json)
// because Open-Meteo's geocoder has no Indian postal-code coverage.

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const PINCODE_DATA_URL = 'pincodes-in.json';

const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;      // 10 min — minimizes repeat forecast calls
const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day — city coordinates rarely change

const DEFAULT_LOCATION = { name: 'New Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090 };

// WMO weather codes -> friendly description + emoji icon.
const WEATHER_CODES = {
  0: { desc: 'Clear sky', icon: '☀️', iconNight: '🌙' },
  1: { desc: 'Mainly clear', icon: '🌤️', iconNight: '🌙' },
  2: { desc: 'Partly cloudy', icon: '⛅', iconNight: '☁️' },
  3: { desc: 'Overcast', icon: '☁️', iconNight: '☁️' },
  45: { desc: 'Fog', icon: '🌫️', iconNight: '🌫️' },
  48: { desc: 'Rime fog', icon: '🌫️', iconNight: '🌫️' },
  51: { desc: 'Light drizzle', icon: '🌦️', iconNight: '🌦️' },
  53: { desc: 'Moderate drizzle', icon: '🌦️', iconNight: '🌦️' },
  55: { desc: 'Dense drizzle', icon: '🌧️', iconNight: '🌧️' },
  56: { desc: 'Light freezing drizzle', icon: '🌧️', iconNight: '🌧️' },
  57: { desc: 'Dense freezing drizzle', icon: '🌧️', iconNight: '🌧️' },
  61: { desc: 'Slight rain', icon: '🌧️', iconNight: '🌧️' },
  63: { desc: 'Moderate rain', icon: '🌧️', iconNight: '🌧️' },
  65: { desc: 'Heavy rain', icon: '🌧️', iconNight: '🌧️' },
  66: { desc: 'Light freezing rain', icon: '🌧️', iconNight: '🌧️' },
  67: { desc: 'Heavy freezing rain', icon: '🌧️', iconNight: '🌧️' },
  71: { desc: 'Slight snow', icon: '🌨️', iconNight: '🌨️' },
  73: { desc: 'Moderate snow', icon: '🌨️', iconNight: '🌨️' },
  75: { desc: 'Heavy snow', icon: '❄️', iconNight: '❄️' },
  77: { desc: 'Snow grains', icon: '🌨️', iconNight: '🌨️' },
  80: { desc: 'Slight rain showers', icon: '🌦️', iconNight: '🌦️' },
  81: { desc: 'Moderate rain showers', icon: '🌧️', iconNight: '🌧️' },
  82: { desc: 'Violent rain showers', icon: '⛈️', iconNight: '⛈️' },
  85: { desc: 'Slight snow showers', icon: '🌨️', iconNight: '🌨️' },
  86: { desc: 'Heavy snow showers', icon: '❄️', iconNight: '❄️' },
  95: { desc: 'Thunderstorm', icon: '⛈️', iconNight: '⛈️' },
  96: { desc: 'Thunderstorm, slight hail', icon: '⛈️', iconNight: '⛈️' },
  99: { desc: 'Thunderstorm, heavy hail', icon: '⛈️', iconNight: '⛈️' },
};

const els = {};

function cacheEls() {
  [
    'wx-search-form', 'wx-city-input', 'wx-geo-btn', 'wx-suggestions', 'wx-status',
    'wx-skeleton', 'wx-error', 'wx-retry-btn',
    'wx-current', 'wx-location-name', 'wx-updated', 'wx-current-icon',
    'wx-current-temp', 'wx-current-condition', 'wx-stats-grid',
    'wx-hourly-section', 'wx-hourly-scroll', 'wx-rain-section', 'wx-rain-chart',
    'wx-daily-section', 'wx-daily-list',
  ].forEach((id) => { els[id] = document.getElementById(id); });
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { value, expires } = JSON.parse(raw);
    if (Date.now() > expires) {
      localStorage.removeItem(key);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function cacheSet(key, value, ttlMs) {
  try {
    localStorage.setItem(key, JSON.stringify({ value, expires: Date.now() + ttlMs }));
  } catch {
    // Storage unavailable (private mode, quota) — fail silently, cache is optional.
  }
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function geocodeCity(query) {
  const key = `wx:geocode:${query.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
  const data = await fetchJSON(url);
  const results = (data.results || []).map((r) => ({
    name: r.name,
    admin1: r.admin1 || '',
    country: r.country || '',
    latitude: r.latitude,
    longitude: r.longitude,
  }));
  cacheSet(key, results, GEOCODE_CACHE_TTL_MS);
  return results;
}

const INDIAN_PINCODE_RE = /^\d{6}$/;

let pincodeIndexPromise = null;

function loadPincodeIndex() {
  if (!pincodeIndexPromise) {
    pincodeIndexPromise = fetchJSON(PINCODE_DATA_URL).catch((err) => {
      pincodeIndexPromise = null; // allow retry on next lookup
      throw err;
    });
  }
  return pincodeIndexPromise;
}

async function lookupIndianPincode(pincode) {
  const index = await loadPincodeIndex();
  const entry = index[pincode];
  if (!entry) return null;
  const [lat, lon, name, district, state] = entry;
  return [{
    name: `${name} — ${pincode}`,
    admin1: district,
    country: state ? `${state}, India` : 'India',
    latitude: lat,
    longitude: lon,
  }];
}

// Resolves a search query to geocoding results. 6-digit queries are tried
// against the bundled Indian PIN code dataset first (Open-Meteo has no
// Indian postal coverage); anything else — or a miss — falls through to
// the Open-Meteo geocoder, which does cover many other countries' postcodes.
async function searchLocation(query) {
  const trimmed = query.trim();
  if (INDIAN_PINCODE_RE.test(trimmed)) {
    try {
      const local = await lookupIndianPincode(trimmed);
      if (local) return local;
    } catch {
      // Local dataset unavailable — fall through to Open-Meteo.
    }
  }
  return geocodeCity(trimmed);
}

async function fetchWeather(lat, lon) {
  const key = `wx:weather:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code,uv_index,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max',
    timezone: 'auto',
    forecast_days: '7',
  });
  const data = await fetchJSON(`${FORECAST_URL}?${params.toString()}`);
  cacheSet(key, data, WEATHER_CACHE_TTL_MS);
  return data;
}

function weatherIcon(code, isDay) {
  const entry = WEATHER_CODES[code] || WEATHER_CODES[0];
  return isDay ? entry.icon : entry.iconNight;
}

function weatherDesc(code) {
  return (WEATHER_CODES[code] || WEATHER_CODES[0]).desc;
}

function formatTimeString(isoLocal) {
  // isoLocal e.g. "2026-07-16T18:42" — already in the location's local time
  // (timezone=auto), so we format it by hand rather than via Date to avoid
  // the browser re-applying its own timezone offset.
  const timePart = isoLocal.split('T')[1];
  if (!timePart) return '';
  let [h, m] = timePart.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`;
}

function formatHourLabel(isoLocal) {
  const timePart = isoLocal.split('T')[1];
  let [h] = timePart.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h} ${suffix}`;
}

function formatDayLabel(dateStr, index) {
  if (index === 0) return 'Today';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function findCurrentHourIndex(hourlyTimes, currentTime) {
  const idx = hourlyTimes.findIndex((t) => t >= currentTime);
  return idx === -1 ? 0 : idx;
}

function setStatus(message) {
  els['wx-status'].textContent = message || '';
}

function showSkeleton() {
  els['wx-skeleton'].hidden = false;
  els['wx-current'].hidden = true;
  els['wx-hourly-section'].hidden = true;
  els['wx-rain-section'].hidden = true;
  els['wx-daily-section'].hidden = true;
  els['wx-error'].hidden = true;
}

function hideSkeleton() {
  els['wx-skeleton'].hidden = true;
}

function showError(message) {
  hideSkeleton();
  els['wx-error'].hidden = false;
  els['wx-error'].querySelector('.wx-error-text').textContent = message;
  els['wx-current'].hidden = true;
  els['wx-hourly-section'].hidden = true;
  els['wx-rain-section'].hidden = true;
  els['wx-daily-section'].hidden = true;
}

function hideError() {
  els['wx-error'].hidden = true;
}

function renderStat(label, value) {
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value;
  const wrap = document.createElement('div');
  wrap.append(dt, dd);
  return wrap;
}

function renderCurrent(data, locationLabel) {
  const c = data.current;
  const isDay = c.is_day === 1;
  const hourIdx = findCurrentHourIndex(data.hourly.time, c.time);
  const rainProb = data.hourly.precipitation_probability?.[hourIdx] ?? 0;
  const uvIndex = data.hourly.uv_index?.[hourIdx] ?? data.daily.uv_index_max?.[0] ?? 0;

  els['wx-location-name'].textContent = locationLabel;
  els['wx-updated'].textContent = `Updated ${formatTimeString(c.time)}`;
  els['wx-current-icon'].textContent = weatherIcon(c.weather_code, isDay);
  els['wx-current-temp'].textContent = `${Math.round(c.temperature_2m)}°C`;
  els['wx-current-condition'].textContent = weatherDesc(c.weather_code);

  els['wx-stats-grid'].innerHTML = '';
  els['wx-stats-grid'].append(
    renderStat('Feels like', `${Math.round(c.apparent_temperature)}°C`),
    renderStat('Humidity', `${c.relative_humidity_2m}%`),
    renderStat('Wind speed', `${Math.round(c.wind_speed_10m)} km/h`),
    renderStat('Rain chance', `${rainProb}%`),
    renderStat('UV index', `${Math.round(uvIndex)}`),
    renderStat('Sunrise', formatTimeString(data.daily.sunrise[0])),
    renderStat('Sunset', formatTimeString(data.daily.sunset[0])),
  );

  els['wx-current'].hidden = false;
}

function renderHourly(data) {
  const hourIdx = findCurrentHourIndex(data.hourly.time, data.current.time);
  const slice = {
    time: data.hourly.time.slice(hourIdx, hourIdx + 24),
    temp: data.hourly.temperature_2m.slice(hourIdx, hourIdx + 24),
    rain: data.hourly.precipitation_probability.slice(hourIdx, hourIdx + 24),
    code: data.hourly.weather_code.slice(hourIdx, hourIdx + 24),
    isDay: data.hourly.is_day.slice(hourIdx, hourIdx + 24),
  };

  els['wx-hourly-scroll'].innerHTML = '';
  slice.time.forEach((t, i) => {
    const item = document.createElement('div');
    item.className = 'wx-hour-item';
    item.setAttribute('role', 'listitem');
    item.innerHTML = `
      <p class="wx-hour-time">${i === 0 ? 'Now' : formatHourLabel(t)}</p>
      <p class="wx-hour-icon" aria-hidden="true">${weatherIcon(slice.code[i], slice.isDay[i] === 1)}</p>
      <p class="wx-hour-temp">${Math.round(slice.temp[i])}°C</p>
      <p class="wx-hour-rain">💧 ${slice.rain[i]}%</p>
    `;
    els['wx-hourly-scroll'].append(item);
  });

  els['wx-hourly-section'].hidden = false;
}

function renderRainChart(data) {
  const hourIdx = findCurrentHourIndex(data.hourly.time, data.current.time);
  const times = data.hourly.time.slice(hourIdx, hourIdx + 24);
  const rain = data.hourly.precipitation_probability.slice(hourIdx, hourIdx + 24);

  const chart = els['wx-rain-chart'];
  chart.innerHTML = '';
  times.forEach((t, i) => {
    const pct = rain[i];
    const col = document.createElement('div');
    col.className = 'wx-rain-bar-col';
    col.innerHTML = `
      <span class="wx-rain-value">${pct}%</span>
      <span class="wx-rain-bar-track"><span class="wx-rain-bar" style="height:${Math.max(pct, 2)}px"></span></span>
      <span class="wx-rain-hour">${i === 0 ? 'Now' : formatHourLabel(t)}</span>
    `;
    chart.append(col);
  });

  const maxRain = rain.length ? Math.max(...rain) : 0;
  chart.setAttribute('aria-label', `Rain chance over the next 24 hours, peaking at ${maxRain}%`);

  els['wx-rain-section'].hidden = false;
}

function renderDaily(data) {
  els['wx-daily-list'].innerHTML = '';
  data.daily.time.forEach((dateStr, i) => {
    const item = document.createElement('div');
    item.className = 'wx-day-item';
    item.setAttribute('role', 'listitem');
    item.innerHTML = `
      <span class="wx-day-name">${formatDayLabel(dateStr, i)}</span>
      <span class="wx-day-icon" aria-hidden="true">${weatherIcon(data.daily.weather_code[i], true)}</span>
      <span class="wx-day-condition">${weatherDesc(data.daily.weather_code[i])}</span>
      <span class="wx-day-temps">${Math.round(data.daily.temperature_2m_max[i])}° <span class="wx-low">${Math.round(data.daily.temperature_2m_min[i])}°</span></span>
    `;
    els['wx-daily-list'].append(item);
  });

  els['wx-daily-section'].hidden = false;
}

// Monotonically-increasing token identifying the most recent load request.
// Because a slower request (e.g. an uncached city) can resolve after a
// faster one fired afterward (e.g. a cached city), we must ignore any
// response that isn't from the latest request — otherwise stale data can
// overwrite the UI after the user has already moved on to a new search.
let loadToken = 0;

async function loadWeather(lat, lon, locationLabel) {
  const thisLoadToken = ++loadToken;
  showSkeleton();
  setStatus('');
  try {
    const data = await fetchWeather(lat, lon);
    if (thisLoadToken !== loadToken) return; // superseded by a newer request
    hideSkeleton();
    hideError();
    renderCurrent(data, locationLabel);
    renderHourly(data);
    renderRainChart(data);
    renderDaily(data);
  } catch (err) {
    if (thisLoadToken !== loadToken) return;
    showError('Could not load weather right now. Please check your connection and try again.');
  }
}

let lastRequest = null;

// Remembers the exact input text a search resolved to, so re-submitting the
// same (already-resolved) text reuses the known coordinates instead of
// re-geocoding a descriptive label like "Infotech Park (Hinjawadi) — 411057"
// that was never meant to be searched again.
let resolvedQuery = null;

function loadWeatherWithRetry(lat, lon, locationLabel, queryText) {
  lastRequest = { lat, lon, locationLabel };
  if (queryText !== undefined) resolvedQuery = { text: queryText, lat, lon, locationLabel };
  loadWeather(lat, lon, locationLabel);
}

function renderSuggestions(results) {
  const box = els['wx-suggestions'];
  box.innerHTML = '';
  if (!results.length) {
    box.hidden = true;
    els['wx-city-input'].setAttribute('aria-expanded', 'false');
    return;
  }
  results.forEach((r) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wx-suggestion-item';
    btn.setAttribute('role', 'option');
    const subLabel = [r.admin1, r.country].filter(Boolean).join(', ');
    btn.innerHTML = `${r.name}${subLabel ? `<span class="wx-suggestion-sub">${subLabel}</span>` : ''}`;
    btn.addEventListener('click', () => {
      const label = [r.name, r.country].filter(Boolean).join(', ');
      box.hidden = true;
      els['wx-city-input'].value = r.name;
      els['wx-city-input'].setAttribute('aria-expanded', 'false');
      loadWeatherWithRetry(r.latitude, r.longitude, label, r.name);
    });
    box.append(btn);
  });
  box.hidden = false;
  els['wx-city-input'].setAttribute('aria-expanded', 'true');
}

const handleCityInput = debounce(async (query) => {
  if (!query || query.trim().length < 2) {
    renderSuggestions([]);
    return;
  }
  try {
    const results = await searchLocation(query);
    renderSuggestions(results);
  } catch {
    renderSuggestions([]);
  }
}, 400);

// Guards against an older, slower search submission resolving after a
// newer one and clobbering its status message or triggering a stale load.
let searchToken = 0;

async function handleSearchSubmit(e) {
  e.preventDefault();
  const query = els['wx-city-input'].value.trim();
  if (!query) return;
  if (resolvedQuery && resolvedQuery.text === query) {
    searchToken++;
    els['wx-suggestions'].hidden = true;
    loadWeatherWithRetry(resolvedQuery.lat, resolvedQuery.lon, resolvedQuery.locationLabel, query);
    return;
  }
  const thisSearchToken = ++searchToken;
  try {
    setStatus('Searching…');
    const results = await searchLocation(query);
    if (thisSearchToken !== searchToken) return; // superseded by a newer search
    setStatus('');
    if (!results.length) {
      setStatus(INDIAN_PINCODE_RE.test(query)
        ? `PIN code "${query}" not found. Please check the code or search by city name.`
        : `No results for "${query}". Try a different city name.`);
      return;
    }
    els['wx-suggestions'].hidden = true;
    const top = results[0];
    const label = [top.name, top.country].filter(Boolean).join(', ');
    loadWeatherWithRetry(top.latitude, top.longitude, label, query);
  } catch {
    if (thisSearchToken !== searchToken) return;
    showError('City search failed. Please check your connection and try again.');
  }
}

function handleGeolocate() {
  if (!('geolocation' in navigator)) {
    setStatus('Geolocation is not supported in this browser. Please search for a city instead.');
    return;
  }
  setStatus('Locating you…');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setStatus('');
      loadWeatherWithRetry(pos.coords.latitude, pos.coords.longitude, 'Your Location');
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        setStatus('Location access was denied. You can search for a city instead.');
      } else {
        setStatus('Could not determine your location. Please search for a city instead.');
      }
    },
    { timeout: 10000 },
  );
}

function init() {
  cacheEls();

  els['wx-search-form'].addEventListener('submit', handleSearchSubmit);
  els['wx-city-input'].addEventListener('input', (e) => handleCityInput(e.target.value));
  els['wx-city-input'].addEventListener('blur', () => {
    setTimeout(() => { els['wx-suggestions'].hidden = true; }, 150);
  });
  els['wx-geo-btn'].addEventListener('click', handleGeolocate);
  els['wx-retry-btn'].addEventListener('click', () => {
    if (lastRequest) {
      loadWeatherWithRetry(lastRequest.lat, lastRequest.lon, lastRequest.locationLabel);
    } else {
      loadWeatherWithRetry(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude,
        `${DEFAULT_LOCATION.name}, ${DEFAULT_LOCATION.country}`);
    }
  });

  loadWeatherWithRetry(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude,
    `${DEFAULT_LOCATION.name}, ${DEFAULT_LOCATION.country}`);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
