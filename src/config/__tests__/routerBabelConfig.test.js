const fs = require('node:fs');
const path = require('node:path');

const babel = require('@babel/core');

describe('Expo Router Metro transform', () => {
  it('keeps require.context static when Metro inherits test mode', () => {
    const filename = require.resolve('expo-router/_ctx.ios.js');
    const result = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
      babelrc: false,
      caller: {
        name: 'metro',
        bundler: 'metro',
        platform: 'ios',
        projectRoot: process.cwd(),
        routerRoot: 'src/app',
        isDev: true,
        isNodeModule: true,
      },
      configFile: path.resolve(process.cwd(), 'babel.config.js'),
      cwd: process.cwd(),
      filename,
      root: process.cwd(),
    });

    expect(result.code).toContain('require.context("../../src/app"');
    expect(result.code).not.toContain('process.env.EXPO_ROUTER_APP_ROOT');
  });
});
