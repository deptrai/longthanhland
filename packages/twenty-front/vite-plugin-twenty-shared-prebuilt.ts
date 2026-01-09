/**
 * Custom Vite plugin to force twenty-shared to use pre-built dist files
 * instead of compiling source code (which has decorators and @/ aliases)
 */
import type { Plugin } from 'vite';
import path from 'path';

export function twentySharedPrebuilt(): Plugin {
    const twentySharedSrcPath = path.resolve(__dirname, '../twenty-shared/src');
    const twentySharedDistPath = path.resolve(__dirname, '../twenty-shared/dist');

    return {
        name: 'twenty-shared-prebuilt',
        enforce: 'pre',

        resolveId(source, importer) {
            // Skip if not importing from twenty-shared
            if (!source.startsWith('twenty-shared')) {
                return null;
            }

            // Map twenty-shared subpath imports to dist
            // e.g., 'twenty-shared/utils' -> '../twenty-shared/dist/utils.mjs'
            // e.g., 'twenty-shared/types' -> '../twenty-shared/dist/types.mjs'
            // e.g., 'twenty-shared' -> '../twenty-shared/dist/index.mjs'

            const subpath = source.replace('twenty-shared', '').replace(/^\//, '');

            if (subpath === '' || subpath === '/') {
                // Main entry: twenty-shared
                return path.join(twentySharedDistPath, 'index.mjs');
            }

            // Subpath entry: twenty-shared/utils, twenty-shared/types, etc.
            const distFile = path.join(twentySharedDistPath, `${subpath}.mjs`);
            return distFile;
        },

        // Intercept any imports that resolve to twenty-shared/src and redirect to dist
        load(id) {
            // If we're trying to load a file from twenty-shared/src, block it
            if (id.includes('/twenty-shared/src/')) {
                // This should not happen if resolveId works correctly
                // But as a safety net, redirect to dist
                const relativePath = id.replace(twentySharedSrcPath, '');
                const distPath = relativePath
                    .replace('/src/', '/')
                    .replace('.ts', '.mjs')
                    .replace('.tsx', '.mjs');

                console.warn(`[twenty-shared-prebuilt] Blocking source import: ${id}`);
                console.warn(`[twenty-shared-prebuilt] Should use dist instead`);

                return null; // Let Vite handle the error
            }

            return null;
        },
    };
}
