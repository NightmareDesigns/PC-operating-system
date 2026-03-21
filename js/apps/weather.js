/**
 * NightmareOS — Weather App
 * Displays simulated weather conditions with a polished UI.
 * Weather data is procedurally generated per session for a realistic feel.
 */

'use strict';

(function () {
  function open() {
    var el = WindowManager.create({
      id: 'weather',
      title: 'Weather',
      icon: '🌤️',
      width: 460,
      height: 520,
      content: buildUI(),
    });
    initWeather(el);
  }

  var CONDITIONS = [
    { name: 'Sunny',          icon: '☀️',  tempRange: [22, 35] },
    { name: 'Partly Cloudy',  icon: '⛅',  tempRange: [18, 28] },
    { name: 'Cloudy',         icon: '☁️',  tempRange: [14, 24] },
    { name: 'Light Rain',     icon: '🌦️', tempRange: [12, 20] },
    { name: 'Rainy',          icon: '🌧️', tempRange: [10, 18] },
    { name: 'Thunderstorm',   icon: '⛈️',  tempRange: [15, 25] },
    { name: 'Snowy',          icon: '🌨️', tempRange: [-5, 3] },
    { name: 'Foggy',          icon: '🌫️', tempRange: [8, 16] },
    { name: 'Windy',          icon: '💨',  tempRange: [10, 22] },
    { name: 'Clear Night',    icon: '🌙',  tempRange: [12, 22] },
  ];

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function generateWeather() {
    var cond = CONDITIONS[rand(0, CONDITIONS.length - 1)];
    return {
      condition: cond.name,
      icon: cond.icon,
      temp: rand(cond.tempRange[0], cond.tempRange[1]),
      feelsLike: rand(cond.tempRange[0] - 2, cond.tempRange[1] + 2),
      humidity: rand(30, 95),
      wind: rand(2, 45),
      windDir: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][rand(0, 7)],
      pressure: rand(990, 1035),
      visibility: rand(2, 20),
      uvIndex: rand(0, 11),
    };
  }

  function generateForecast() {
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var today = new Date().getDay();
    var forecast = [];
    for (var i = 1; i <= 5; i++) {
      var cond = CONDITIONS[rand(0, CONDITIONS.length - 1)];
      forecast.push({
        day: days[(today + i) % 7],
        icon: cond.icon,
        high: rand(cond.tempRange[0], cond.tempRange[1] + 3),
        low: rand(cond.tempRange[0] - 3, cond.tempRange[0] + 2),
      });
    }
    return forecast;
  }

  function buildUI() {
    return [
      '<div class="weather-app">',
      '  <div class="weather-location">',
      '    <input type="text" class="weather-search" id="weather-city" value="Nightmare City"',
      '           placeholder="Enter city…" aria-label="City name"/>',
      '    <button class="weather-refresh-btn" id="weather-refresh" title="Refresh">🔄</button>',
      '  </div>',
      '  <div class="weather-current" id="weather-current"></div>',
      '  <div class="weather-details" id="weather-details"></div>',
      '  <div class="weather-forecast-title">5-Day Forecast</div>',
      '  <div class="weather-forecast" id="weather-forecast"></div>',
      '</div>'
    ].join('\n');
  }

  function initWeather(el) {
    var cityInput = el.querySelector('#weather-city');

    function render() {
      var w = generateWeather();
      var city = escHtml(cityInput.value || 'Nightmare City');
      var now = new Date();
      var timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      el.querySelector('#weather-current').innerHTML = [
        '<div class="weather-main">',
        '  <span class="weather-icon-big">' + w.icon + '</span>',
        '  <div class="weather-temp-block">',
        '    <span class="weather-temp">' + w.temp + '°C</span>',
        '    <span class="weather-condition">' + escHtml(w.condition) + '</span>',
        '    <span class="weather-city-label">' + city + ' · ' + timeStr + '</span>',
        '  </div>',
        '</div>'
      ].join('\n');

      el.querySelector('#weather-details').innerHTML = [
        '<div class="weather-grid">',
        '  <div class="wg-item"><span class="wg-label">Feels Like</span><span class="wg-val">' + w.feelsLike + '°C</span></div>',
        '  <div class="wg-item"><span class="wg-label">Humidity</span><span class="wg-val">' + w.humidity + '%</span></div>',
        '  <div class="wg-item"><span class="wg-label">Wind</span><span class="wg-val">' + w.wind + ' km/h ' + w.windDir + '</span></div>',
        '  <div class="wg-item"><span class="wg-label">Pressure</span><span class="wg-val">' + w.pressure + ' hPa</span></div>',
        '  <div class="wg-item"><span class="wg-label">Visibility</span><span class="wg-val">' + w.visibility + ' km</span></div>',
        '  <div class="wg-item"><span class="wg-label">UV Index</span><span class="wg-val">' + w.uvIndex + '</span></div>',
        '</div>'
      ].join('\n');

      var forecast = generateForecast();
      el.querySelector('#weather-forecast').innerHTML = forecast.map(function (d) {
        return '<div class="wf-day"><span class="wf-name">' + d.day + '</span>' +
               '<span class="wf-icon">' + d.icon + '</span>' +
               '<span class="wf-temps">' + d.high + '° / ' + d.low + '°</span></div>';
      }).join('');
    }

    el.querySelector('#weather-refresh').addEventListener('click', render);
    cityInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') render();
    });

    render();
  }

  NightOS.registerApp('weather', {
    title: 'Weather',
    icon: '🌤️',
    open: open,
  });
})();
