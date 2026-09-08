export const WEATHER_TYPES = Object.freeze({
  DAY: 'day',
  SUNNY: 'sunny',
  CLOUDY: 'cloudy',
  WINDY: 'windy',
  RAIN: 'rain',
  STORM: 'storm',
  TORNADO: 'tornado',
  NIGHT: 'night',
});

export const WEATHER_ORDER = Object.freeze([
  WEATHER_TYPES.DAY,
  WEATHER_TYPES.SUNNY,
  WEATHER_TYPES.CLOUDY,
  WEATHER_TYPES.WINDY,
  WEATHER_TYPES.RAIN,
  WEATHER_TYPES.STORM,
  WEATHER_TYPES.TORNADO,
  WEATHER_TYPES.NIGHT,
]);

export const WEATHER_CONFIG = Object.freeze({
  firstChangeDelay: 7.5,
  durationMin: 11,
  durationMax: 18,
  [WEATHER_TYPES.DAY]: {
    icon: '🌤️',
    vi: 'Ban ngày',
    en: 'Day',
    background: 0xccecff,
    fallMultiplier: 1,
    windStrength: 0,
  },
  [WEATHER_TYPES.SUNNY]: {
    icon: '☀️',
    vi: 'Trời nắng',
    en: 'Sunny',
    background: 0xbfe8ff,
    fallMultiplier: 1,
    windStrength: 0,
  },
  [WEATHER_TYPES.CLOUDY]: {
    icon: '☁️',
    vi: 'Nhiều mây',
    en: 'Cloudy',
    background: 0xb8cedc,
    fallMultiplier: 1,
    windStrength: 0,
  },
  [WEATHER_TYPES.WINDY]: {
    icon: '💨',
    vi: 'Có gió',
    en: 'Windy',
    background: 0xc4e3f4,
    fallMultiplier: 1,
    windStrength: 0.82,
  },
  [WEATHER_TYPES.RAIN]: {
    icon: '🌧️',
    vi: 'Trời mưa',
    en: 'Rainy',
    background: 0x9fb9cf,
    fallMultiplier: 1.15,
    windStrength: 0.12,
  },
  [WEATHER_TYPES.STORM]: {
    icon: '⛈️',
    vi: 'Bão',
    en: 'Storm',
    background: 0x66768d,
    fallMultiplier: 1.25,
    windStrength: 1.18,
  },
  [WEATHER_TYPES.TORNADO]: {
    icon: '🌪️',
    vi: 'Lốc xoáy',
    en: 'Tornado',
    background: 0x8595a4,
    fallMultiplier: 1.02,
    windStrength: 0,
  },
  [WEATHER_TYPES.NIGHT]: {
    icon: '🌙',
    vi: 'Ban đêm',
    en: 'Night',
    background: 0x0d2448,
    fallMultiplier: 1,
    windStrength: 0,
  },
});

export function weatherLabel(type, language) {
  const config = WEATHER_CONFIG[type] ?? WEATHER_CONFIG[WEATHER_TYPES.DAY];
  return language === 'en' ? config.en : config.vi;
}
