const fs = require('node:fs');
const path = require('node:path');

const { createRoutesManifest } = require('expo-router/build/routes-manifest');

function collectRouteFiles(directory, relativeDirectory = '') {
  return fs.readdirSync(directory).flatMap((entry) => {
    const absolutePath = path.join(directory, entry);
    const relativePath = path.join(relativeDirectory, entry);
    if (fs.statSync(absolutePath).isDirectory()) {
      return collectRouteFiles(absolutePath, relativePath);
    }
    return /\.[tj]sx?$/.test(entry) ? [`./${relativePath.split(path.sep).join('/')}`] : [];
  });
}

describe('Expo Router entry route', () => {
  it('maps the native root URL to an application route', () => {
    const manifest = createRoutesManifest(collectRouteFiles(path.resolve('src/app')), {});
    const rootRoute = manifest.htmlRoutes.find((route) => new RegExp(route.namedRegex).test('/'));
    expect(rootRoute?.file).toBe('./index.tsx');
  });
});
