/**
 * Navigation strategy factory.
 * Returns the appropriate strategy based on the publisher's navigation type.
 */

export { StaticStrategy } from './static.js';
export { PaginatedStrategy } from './paginated.js';
export { CarouselStrategy } from './carousel.js';
export { InfiniteScrollStrategy } from './infinite-scroll.js';
export { MultiClickStrategy } from './multi-click.js';
export type { INavigationStrategy, NavigationOptions, NavigationResult } from './types.js';

import type { NavigationStrategy } from '../../types.js';
import type { INavigationStrategy } from './types.js';
import { StaticStrategy } from './static.js';
import { PaginatedStrategy } from './paginated.js';
import { CarouselStrategy } from './carousel.js';
import { InfiniteScrollStrategy } from './infinite-scroll.js';
import { MultiClickStrategy } from './multi-click.js';

export function createNavigationStrategy(type: NavigationStrategy): INavigationStrategy {
  switch (type) {
    case 'static':
      return new StaticStrategy();
    case 'paginated':
      return new PaginatedStrategy();
    case 'carousel':
      return new CarouselStrategy();
    case 'infinite-scroll':
      return new InfiniteScrollStrategy();
    case 'multi-click':
      return new MultiClickStrategy();
    default:
      throw new Error(`Unknown navigation strategy: ${type}`);
  }
}
