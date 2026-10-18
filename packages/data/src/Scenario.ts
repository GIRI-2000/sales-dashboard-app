import { date, decimal, entity, int, role, text, uuid } from '@microsoft/rayfin-core';

/** A saved what-if scenario. Team-readable, owner-editable. */
@entity()
@role('authenticated', 'read')
@role('authenticated', ['create', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.owner_id),
})
export class Scenario {
  @uuid() id!: string;
  @text({ min: 1, max: 120 }) name!: string;
  @int() baseYear!: number;
  @decimal() priceChangePct!: number;
  @decimal() discountChangePts!: number;
  @decimal() volumeChangePct!: number;
  @decimal() costChangePct!: number;
  @decimal() elasticity!: number;
  @decimal() baselineSales!: number;
  @decimal() baselineProfit!: number;
  @decimal() projectedSales!: number;
  @decimal() projectedProfit!: number;
  @text({ optional: true, max: 500 }) note?: string;
  @text({ max: 200 }) owner_id!: string;
  @text({ max: 200 }) ownerEmail!: string;
  @date() createdAt!: Date;
}
