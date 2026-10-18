//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Teach tailwind-merge the app's custom font-size tokens (text-100 … text-hero-1000).
 * Without this it treats `text-200` as a colour and silently drops it whenever a
 * colour class such as `text-muted-foreground` is merged in the same cn() call,
 * which made labels render at the browser default size and overflow their cards.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['100', '200', '300', '400', '500', '600', 'hero-700', 'hero-800', 'hero-900', 'hero-1000'],
    },
  },
});

/**
 * Merge Tailwind CSS class names with conflict resolution.
 *
 *   cn("px-2 py-1", isActive && "bg-primary text-primary-foreground")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
