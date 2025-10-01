const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');

if (isWatch) {
    const ctx = esbuild.context({
        entryPoints: ['src/extension.ts'],
        bundle: true,
        outfile: 'out/extension.js',
        format: 'cjs',
        platform: 'node',
        external: [
            'vscode'
        ],
        loader: {
            '.ts': 'ts',
            '.js': 'js'
        },
        sourcemap: true,
        minify: false
    });

    ctx.then(context => {
        context.watch();
        console.log('Watching extension files...');
    }).catch(() => process.exit(1));
} else {
    esbuild.build({
        entryPoints: ['src/extension.ts'],
        bundle: true,
        outfile: 'out/extension.js',
        format: 'cjs',
        platform: 'node',
        external: [
            'vscode'
        ],
        loader: {
            '.ts': 'ts',
            '.js': 'js'
        },
        sourcemap: true,
        minify: false
    }).catch(() => process.exit(1));
}
