import climateData from './climate-history.json';
import cityClimateData from './city-climate-timeseries.json';
import type { TimeSeriesPoint } from './mumbai-data';

export type CityKey = 'mumbai' | 'pune' | 'navi_mumbai';

export interface ClimatePeriodFilter {
  year: number;
  month: number | 'all' | 'monsoon'; // 1-12, 'all', or 'monsoon' (6-9)
}

export interface HistoricalStormEvent {
  title: string;
  year: number;
  month: number;
  dayIndexInPeriod?: number;
  date: string;
  rainfall3Day: number;
  description: string;
}

export const DIGITAL_TWIN_YEARS = [2019, 2020, 2021, 2022, 2023, 2024] as const;

export const CITY_HISTORICAL_EVENTS: Record<CityKey, HistoricalStormEvent[]> = {
  mumbai: [
    {
      title: '2024 Convective',
      year: 2024,
      month: 7,
      dayIndexInPeriod: 8,
      date: '2024-07-09',
      rainfall3Day: 269.6,
      description: 'Intense convective precipitation event with suburban pooling across Central Mumbai.',
    },
    {
      title: '2024 July Deluge',
      year: 2024,
      month: 7,
      dayIndexInPeriod: 21,
      date: '2024-07-22',
      rainfall3Day: 264.8,
      description: 'Severe high-tide squall causing citywide urban drainage overflows.',
    },
    {
      title: '2023 Red Alert Storm',
      year: 2023,
      month: 7,
      dayIndexInPeriod: 19,
      date: '2023-07-20',
      rainfall3Day: 375.6,
      description: 'Statewide extreme monsoon vortex delivering 375mm coastal rainfall surge.',
    },
    {
      title: '2022 Monsoon Surge',
      year: 2022,
      month: 7,
      dayIndexInPeriod: 6,
      date: '2022-07-07',
      rainfall3Day: 427.1,
      description: 'Continuous mid-monsoon squall line over Western Ghats & coastal lowlands.',
    },
    {
      title: '2021 Konkan Flood',
      year: 2021,
      month: 7,
      dayIndexInPeriod: 19,
      date: '2021-07-20',
      rainfall3Day: 501.9,
      description: 'Historic high-intensity cloudburst line triggering major suburban inundation.',
    },
    {
      title: '2020 Coastal Squall',
      year: 2020,
      month: 8,
      dayIndexInPeriod: 5,
      date: '2020-08-06',
      rainfall3Day: 445.3,
      description: 'Gale-force coastal front with extreme tidal backflow across Mumbai harbor.',
    },
    {
      title: '2019 Great Deluge',
      year: 2019,
      month: 7,
      dayIndexInPeriod: 1,
      date: '2019-07-02',
      rainfall3Day: 494.1,
      description: 'Catastrophic 494mm surge breaking municipal drainage capacities.',
    },
    {
      title: '2005 Historic Deluge',
      year: 2005,
      month: 7,
      dayIndexInPeriod: 26,
      date: '2005-07-27',
      rainfall3Day: 565.9,
      description: 'Catastrophic 26-27 July cloudburst deluge breaking municipal records.',
    },
    {
      title: '1991 All-Time Peak',
      year: 1991,
      month: 6,
      dayIndexInPeriod: 9,
      date: '1991-06-10',
      rainfall3Day: 646.5,
      description: 'Historical 3-day precipitation record of 646.5mm in recorded climate dataset.',
    },
  ],
  navi_mumbai: [
    {
      title: '2024 Creek Deluge',
      year: 2024,
      month: 7,
      date: '2024-07-26',
      rainfall3Day: 456.1,
      description: 'Catastrophic creek backflow and CIDCO sector inundation across Navi Mumbai.',
    },
    {
      title: '2024 Early Influx',
      year: 2024,
      month: 7,
      date: '2024-07-09',
      rainfall3Day: 244.2,
      description: 'Intense rain surge along Thane Creek lowlands and Palm Beach corridor.',
    },
    {
      title: '2023 Extreme Surge',
      year: 2023,
      month: 7,
      date: '2023-07-20',
      rainfall3Day: 656.8,
      description: 'Historic 657mm deluge breaking municipal drainage near Belapur & Vashi.',
    },
    {
      title: '2022 Mid-July Squall',
      year: 2022,
      month: 7,
      date: '2022-07-15',
      rainfall3Day: 462.6,
      description: 'Sustained monsoon vortex flooding low-lying coastal nodes.',
    },
    {
      title: '2021 Konkan Cloudburst',
      year: 2021,
      month: 7,
      date: '2021-07-20',
      rainfall3Day: 530.5,
      description: 'Extreme coastal rain band saturating creek buffer basins.',
    },
    {
      title: '2020 Coastal Front',
      year: 2020,
      month: 8,
      date: '2020-08-07',
      rainfall3Day: 369.0,
      description: 'Harbor squalls causing tidal backflow into storm canals.',
    },
    {
      title: '2019 Panvel Surge',
      year: 2019,
      month: 7,
      date: '2019-07-28',
      rainfall3Day: 613.1,
      description: 'Record 613mm storm surge overwhelming Sion-Panvel drainage.',
    },
  ],
  pune: [
    {
      title: '2024 Mutha River Deluge',
      year: 2024,
      month: 7,
      date: '2024-07-26',
      rainfall3Day: 155.1,
      description: 'Khadakwasla dam discharge surge flooding Sinhagad Rd & Deccan lowlands.',
    },
    {
      title: '2024 July Red Alert',
      year: 2024,
      month: 7,
      date: '2024-07-25',
      rainfall3Day: 129.0,
      description: 'Intense catchment squall triggering citywide riverbank alerts.',
    },
    {
      title: '2023 Late Monsoon Storm',
      year: 2023,
      month: 9,
      date: '2023-09-29',
      rainfall3Day: 52.5,
      description: 'Convective thunderstorm causing sudden suburban waterlogging.',
    },
    {
      title: '2022 Ghat Runoff Surge',
      year: 2022,
      month: 7,
      date: '2022-07-14',
      rainfall3Day: 118.0,
      description: 'Heavy Western Ghat runoff rapidly raising Mula-Mutha river levels.',
    },
    {
      title: '2021 Hill Catchment Surge',
      year: 2021,
      month: 7,
      date: '2021-07-24',
      rainfall3Day: 70.3,
      description: 'Cloudburst line over surrounding hills and Katraj basin.',
    },
    {
      title: '2020 Nisarga Depression',
      year: 2020,
      month: 6,
      date: '2020-06-05',
      rainfall3Day: 113.5,
      description: 'Post-cyclone depression bringing severe squalls across Pune.',
    },
    {
      title: '2019 July Peak Squall',
      year: 2019,
      month: 7,
      date: '2019-07-28',
      rainfall3Day: 144.9,
      description: 'Major monsoon squall overflowing canals across Hadapsar & Kothrud.',
    },
    {
      title: '2019 Ambil Odha Flash Flood',
      year: 2019,
      month: 9,
      date: '2019-09-26',
      rainfall3Day: 115.3,
      description: 'Devastating cloudburst triggering sudden Ambil Odha flash floods.',
    },
  ],
};

export const NOTABLE_HISTORICAL_EVENTS: HistoricalStormEvent[] = CITY_HISTORICAL_EVENTS.mumbai;

export function getNotableHistoricalEvents(city: CityKey = 'mumbai', year?: number): HistoricalStormEvent[] {
  const events = CITY_HISTORICAL_EVENTS[city] || CITY_HISTORICAL_EVENTS.mumbai;
  if (year !== undefined) {
    const yearEvents = events.filter((e) => e.year === year);
    if (yearEvents.length > 0) return yearEvents;
  }
  return events.slice(0, 3);
}

export function getYearPeakNote(city: CityKey, year: number): string {
  const notes: Record<CityKey, Record<number, string>> = {
    mumbai: {
      2024: '270mm Deluge',
      2023: '376mm Storm',
      2022: '427mm Surge',
      2021: '502mm Konkan',
      2020: '445mm Squall',
      2019: '494mm Record',
    },
    navi_mumbai: {
      2024: '456mm Deluge',
      2023: '657mm Surge',
      2022: '463mm Squall',
      2021: '531mm Cloudburst',
      2020: '369mm Coastal',
      2019: '613mm Record',
    },
    pune: {
      2024: '155mm Mutha Deluge',
      2023: '53mm Storm',
      2022: '118mm Ghat Surge',
      2021: '70mm Surge',
      2020: '114mm Nisarga',
      2019: '145mm Flash Flood',
    },
  };
  return notes[city]?.[year] || `${year} Telemetry`;
}

export const MONTH_NAMES = [
  { value: 1, label: 'Jan', fullName: 'January' },
  { value: 2, label: 'Feb', fullName: 'February' },
  { value: 3, label: 'Mar', fullName: 'March' },
  { value: 4, label: 'Apr', fullName: 'April' },
  { value: 5, label: 'May', fullName: 'May' },
  { value: 6, label: 'Jun', fullName: 'June' },
  { value: 7, label: 'Jul', fullName: 'July' },
  { value: 8, label: 'Aug', fullName: 'August' },
  { value: 9, label: 'Sep', fullName: 'September' },
  { value: 10, label: 'Oct', fullName: 'October' },
  { value: 11, label: 'Nov', fullName: 'November' },
  { value: 12, label: 'Dec', fullName: 'December' },
];

export const AVAILABLE_YEARS: number[] = climateData.availableYears || [2024];

const byYearMonth = (climateData as any).dataByYearMonth as Record<string, TimeSeriesPoint[]>;

/**
 * Returns dynamic climate time series data filtered by selected Year, Month/Monsoon, and City.
 */
export function getTimeSeriesForPeriod(
  year: number,
  month: number | 'all' | 'monsoon',
  city: CityKey = 'mumbai'
): TimeSeriesPoint[] {
  let monthsToInclude: number[] = [];

  if (month === 'all') {
    monthsToInclude = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  } else if (month === 'monsoon') {
    monthsToInclude = [6, 7, 8, 9]; // June to September
  } else {
    monthsToInclude = [month];
  }

  const result: TimeSeriesPoint[] = [];
  const cityTwin = (cityClimateData as any).cities?.[city];

  for (const m of monthsToInclude) {
    const key = `${year}-${String(m).padStart(2, '0')}`;

    // 1. First priority: Real digital twin dataset for the specified city (2019 - 2024 Monsoon)
    if (cityTwin && cityTwin[key] && Array.isArray(cityTwin[key])) {
      result.push(...cityTwin[key]);
      continue;
    }

    // 2. Second priority: Historical archives or non-monsoon months
    const legacyDays = byYearMonth[key];
    if (legacyDays && Array.isArray(legacyDays)) {
      if (city === 'mumbai') {
        result.push(...legacyDays);
      } else {
        const rainMultiplier = city === 'pune' ? 0.62 : 1.04;
        const soilMultiplier = city === 'pune' ? 0.82 : 1.12;
        const tempOffset = city === 'pune' ? -2.5 : -0.6;
        result.push(
          ...legacyDays.map((pt) => ({
            ...pt,
            rainfall_3day_sum: Math.round(pt.rainfall_3day_sum * rainMultiplier * 10) / 10,
            rainfall_daily: pt.rainfall_daily ? Math.round(pt.rainfall_daily * rainMultiplier * 10) / 10 : 0,
            soil_moisture: Math.min(0.95, Math.round(pt.soil_moisture * soilMultiplier * 1000) / 1000),
            land_surface_temp: Math.round((pt.land_surface_temp + tempOffset) * 10) / 10,
          }))
        );
      }
    }
  }

  // Fallback to avoid empty array if specific month is missing
  if (result.length === 0) {
    const fallbackKey = '2024-07';
    if (cityTwin && cityTwin[fallbackKey]) return cityTwin[fallbackKey];
    return byYearMonth[fallbackKey] || [];
  }

  return result;
}
