
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SRC_DIR = path.resolve(__dirname, 'packages/twenty-shared/src');

function resolveAlias(filePath, importPath) {
    if (!importPath.startsWith('@/')) return importPath;

    const targetPathInSrc = importPath.substring(2); // 'utils/foo'
    const absoluteTargetPath = path.join(SRC_DIR, targetPathInSrc);
    const fileDir = path.dirname(filePath);

    let relativePath = path.relative(fileDir, absoluteTargetPath);

    if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
    }

    return relativePath;
}

const files = glob.sync('**/*.ts', { cwd: SRC_DIR, absolute: true });
let fixedCount = 0;

files.forEach(filePath => {
    if (filePath.endsWith('.d.ts')) return;

    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let hasChanges = false;

    // Replace imports like: from '@/...'
    // Regex to capture import paths starting with @/
    // Support ' and " quotes
    const importRegex = /(from\s+['"])(@\/[^'"]+)(['"])/g;

    newContent = newContent.replace(importRegex, (match, prefix, importPath, suffix) => {
        const relativePath = resolveAlias(filePath, importPath);
        if (relativePath !== importPath) {
            hasChanges = true;
            return `${prefix}${relativePath}${suffix}`;
        }
        return match;
    });

    // Also handle dynamic imports or require if any (less likely in TS src but valid)
    // const dynamicImportRegex = /(import\s*\(['"])(@\/[^'"]+)(['"]\))/g;
    // newContent = newContent.replace(dynamicImportRegex, ...)

    if (hasChanges) {
        console.log(`Fixing imports in: ${path.relative(process.cwd(), filePath)}`);
        fs.writeFileSync(filePath, newContent, 'utf8');
        fixedCount++;
    }
});

console.log(`Finished! Fixed imports in ${fixedCount} files.`);
