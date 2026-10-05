import climateData from './climate-history.json';
import type { TimeSeriesPoint } from './mumbai-data';

export interface ClimatePeriodFilter {
  year: number;
  month: number | 'all' | 'monsoon'; // 1-12, 'all', or 'monsoon' (6-9)
}

export interface HistoricalStormEvent {
  title: string;
  year: number;
  month: number;
  dayIndexInPeriod: number;
  date: string;
  rainfall3Day: number;
  description: string;
}

export const NOTABLE_HISTORICAL_EVENTS: HistoricalStormEvent[] = [
  {
    title: '2024 Peak Storm',
    year: 2024,
    month: 7,
    dayIndexInPeriod: 8, // Jul 09
    date: '2024-07-09',
    rainfall3Day: 269.6,
    description: 'Intense convective precipitation event with widespread suburban lowlands pooling.',
  },
  {
    title: '2024 July Deluge',
    year: 2024,
    month: 7,
    dayIndexInPeriod: 21, // Jul 22
    date: '2024-07-22',
    rainfall3Day: 264.8,
    description: 'Second major monsoon surge causing river drainage backflows.',
  },
  {
    title: '2019 Great Flood',
    year: 2019,
    month: 7,
    dayIndexInPeriod: 1, // Jul 02
    date: '2019-07-02',
    rainfall3Day: 375.2,
    description: 'Massive coastal squall line delivering over 375mm across 72 hours.',
  },
  {
    title: '2005 Historic Deluge',
    year: 2005,
    month: 7,
    dayIndexInPeriod: 26, // Jul 27
    date: '2005-07-27',
    rainfall3Day: 565.9,
    description: 'Catastrophic 26-27 July cloudburst deluge breaking municipal records.',
  },
  {
    title: '1991 All-Time Peak',
    year: 1991,
    month: 6,
    dayIndexInPeriod: 9, // Jun 10
    date: '1991-06-10',
    rainfall3Day: 646.5,
    description: 'Historical 3-day precipitation record of 646.5mm in recorded climate dataset.',
  },
];

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
 * Returns dynamic climate time series data filtered by selected Year and Month/Monsoon.
 */
export function getTimeSeriesForPeriod(year: number, month: number | 'all' | 'monsoon'): TimeSeriesPoint[] {
  let monthsToInclude: number[] = [];

  if (month === 'all') {
    monthsToInclude = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  } else if (month === 'monsoon') {
    monthsToInclude = [6, 7, 8, 9]; // June to September
  } else {
    monthsToInclude = [month];
  }

  const result: TimeSeriesPoint[] = [];

  for (const m of monthsToInclude) {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    const days = byYearMonth[key];
    if (days && Array.isArray(days)) {
      result.push(...days);
    }
  }

  // Fallback to avoid empty array if specific month is missing
  if (result.length === 0) {
    const fallbackKey = '2024-07';
    return byYearMonth[fallbackKey] || [];
  }

  return result;
}
