import { ActionItem } from './ActionItem.js';
import { SalesPlan } from './SalesPlan.js';
import { Scenario } from './Scenario.js';
import type { UniversalAppSchema } from '@rayfin-app/shared';

/**
 * The app's own Rayfin SQL tables. Keep in step with `UniversalAppSchema`
 * in `@rayfin-app/shared`.
 */
export type { UniversalAppSchema };
export { ActionItem, SalesPlan, Scenario };

export const schema = [SalesPlan, Scenario, ActionItem];
