'use strict';

const { applyPatch } = require('../lib/patch.cjs');
const args = process.argv.slice(2);
const index = args.indexOf('--tree');
if (index < 0 || !args[index + 1] || args.some((arg, i) => i !== index && i !== index + 1 && arg !== '--dry-run')) {
    process.stderr.write('用法：node scripts/patch.cjs --tree <app.asar 解包目录> [--dry-run]\n');
    process.exitCode = 1;
} else {
    try {
        const result = applyPatch(args[index + 1], args.includes('--dry-run'));
        process.stdout.write(JSON.stringify({ version: result.version, dryRun: args.includes('--dry-run'), alreadyPatched: result.alreadyPatched, changedFiles: Object.keys(result.files) }, null, 2) + '\n');
    } catch (error) {
        process.stderr.write(error.message + '\n');
        process.exitCode = 1;
    }
}
