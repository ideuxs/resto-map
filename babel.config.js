const fs = require('node:fs');
const path = require('node:path');

const expoBabelPreset = require('expo/internal/babel-preset');

/**
 * Metro normally inlines EXPO_ROUTER_APP_ROOT through its routerRoot request
 * option. A Metro process started with NODE_ENV=test intentionally skips that
 * replacement in babel-preset-expo, though, and Metro then rejects the dynamic
 * require.context call before the bundle can be built. Keep the fallback local
 * to Expo Router's context entry files so Jest's test-only semantics remain
 * unchanged everywhere else.
 */
function restohubRouterContextRoot({ types: t }) {
  return {
    name: 'restohub-router-context-root',
    visitor: {
      MemberExpression(nodePath, state) {
        const member = nodePath.node;
        const envMember = member.object;

        if (
          !t.isMemberExpression(envMember) ||
          !t.isIdentifier(envMember.object, { name: 'process' }) ||
          !t.isIdentifier(envMember.property, { name: 'env' }) ||
          !t.isIdentifier(member.property, { name: 'EXPO_ROUTER_APP_ROOT' })
        ) {
          return;
        }

        const filename = state.filename || state.file?.opts?.filename;
        const normalizedFilename = typeof filename === 'string' ? filename.replaceAll('\\', '/') : '';
        const basename = normalizedFilename.split('/').pop() || '';

        if (!normalizedFilename.includes('/expo-router/') || !basename.startsWith('_ctx')) {
          return;
        }

        const projectRoot = state.file?.opts?.root || process.cwd();
        const appFolder = fs.existsSync(path.join(projectRoot, 'src', 'app')) ? 'src/app' : 'app';
        const absoluteAppFolder = path.resolve(projectRoot, appFolder);
        const relativeAppFolder = path
          .relative(path.dirname(filename), absoluteAppFolder)
          .split(path.sep)
          .join('/');

        nodePath.replaceWith(t.stringLiteral(relativeAppFolder.startsWith('.') ? relativeAppFolder : `./${relativeAppFolder}`));
      },
    },
  };
}

module.exports = {
  presets: [expoBabelPreset],
  plugins: [restohubRouterContextRoot],
};
