import categoryEconomicsDax from './category-economics.dax?raw';
import countrySignalsDax from './country-signals.dax?raw';
import monthlyTrendDax from './monthly-trend.dax?raw';
import productSignalsDax from './product-signals.dax?raw';
import regionCategoryDax from './region-category.dax?raw';
import unhappyCustomersDax from './unhappy-customers.dax?raw';
import yearsDax from './years.dax?raw';

/** Connector alias declared in rayfin/rayfin.yml by `rayfin connector add`. */
export const connection = 'salesmodel';

function forYear(dax: string, year: number | undefined) {
  // Year is always an integer chosen from the model's own year list.
  return year ? dax.replaceAll('{{YEAR}}', String(Math.trunc(year))) : '';
}

/** Yearly KPI totals - also drives the year picker. */
export const yearlyKpis = () => ({ connection, query: yearsDax });
/** Month-by-month actuals, last year and model target for one year. */
export const monthlyTrend = (year?: number) => ({ connection, query: forYear(monthlyTrendDax, year) });
/** Region x category actuals - the baseline for the plan grid. */
export const regionCategory = (year?: number) => ({ connection, query: forYear(regionCategoryDax, year) });
/** Category unit economics - the baseline for the scenario lab. */
export const categoryEconomics = (year?: number) => ({ connection, query: forYear(categoryEconomicsDax, year) });
/** Countries whose sales fell versus last year. */
export const countrySignals = (year?: number) => ({ connection, query: forYear(countrySignalsDax, year) });
/** Products that lost money in the year. */
export const productSignals = (year?: number) => ({ connection, query: forYear(productSignalsDax, year) });
/** Highest-value orders rated 1-2 stars. */
export const unhappyCustomers = (year?: number) => ({ connection, query: forYear(unhappyCustomersDax, year) });
