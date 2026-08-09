const { withPodfile, withPodfileProperties } = require('@expo/config-plugins');

const MARKER = '# RestoHub: Xcode 26 fmt compatibility';

const PODFILE_PATCH = `
    ${MARKER}
    # React Native 0.81 ships fmt 11, whose consteval detection is incompatible
    # with Apple Clang 21. Remove after React Native bundles fmt 12.1 or newer.
    fmt_base = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      patched = content.gsub(/^#\\s*define FMT_USE_CONSTEVAL 1$/, '#  define FMT_USE_CONSTEVAL 0')
      if patched != content
        File.chmod(0644, fmt_base)
        File.write(fmt_base, patched)
      end
    end
`;

function withXcode26FmtFix(config) {
  config = withPodfileProperties(config, (podfileConfig) => {
    podfileConfig.modResults['ios.buildReactNativeFromSource'] = 'true';
    return podfileConfig;
  });

  return withPodfile(config, (podfileConfig) => {
    const contents = podfileConfig.modResults.contents;
    if (contents.includes(MARKER)) return podfileConfig;

    const postInstallEnd = /(^  post_install do \|installer\|[\s\S]*?)(^  end\nend\s*$)/m;
    if (!postInstallEnd.test(contents)) {
      throw new Error('Unable to locate the RestoHub iOS post_install block.');
    }

    podfileConfig.modResults.contents = contents.replace(
      postInstallEnd,
      `$1${PODFILE_PATCH}$2`
    );
    return podfileConfig;
  });
}

module.exports = withXcode26FmtFix;
