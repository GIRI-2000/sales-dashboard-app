//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

// Uses the pure-JavaScript React plugin: Windows Application Control on this
// machine blocks the native SWC binary that @vitejs/plugin-react loads.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    globals: true,
    testTimeout: 15_000,
    include: ['src/**/*.spec.{ts,tsx}'],
    /**
     * The template's stage-3 decorator fixture only verified the SWC decorator
     * options removed above. The frontend never runs decorated classes (entities
     * live in packages/data and the browser imports @rayfin-app/shared), so the
     * fixture is excluded rather than re-plumbed.
     */
    exclude: ['src/test/stage3-decorator.spec.ts'],
    passWithNoTests: true,
  },
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
});
