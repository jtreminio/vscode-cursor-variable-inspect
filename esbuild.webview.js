const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');

if (isWatch) {
    const ctx = esbuild.context({
        entryPoints: ['src/webview/client.ts'],
        bundle: false, // Single file output for webview
        outfile: 'out/webview/client.js',
        format: 'iife', // IIFE for browser context
        platform: 'browser',
        loader: {
            '.ts': 'ts',
            '.js': 'js'
        },
        sourcemap: true,
        minify: false
    });

    ctx.then(context => {
        context.watch();
        console.log('Watching webview files...');
    }).catch(() => process.exit(1));
} else {
    esbuild.build({
        entryPoints: ['src/webview/client.ts'],
        bundle: false,
        outfile: 'out/webview/client.js',
        format: 'iife',
        platform: 'browser',
        loader: {
            '.ts': 'ts',
            '.js': 'js'
        },
        sourcemap: true,
        minify: false
    }).catch(() => process.exit(1));
}
