const { withAppBuildGradle } = require('expo/config-plugins');

const marker = '// Gasway: bound CMake object paths for Windows Ninja.';

module.exports = function withWindowsCmakePathLimit(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('The Windows CMake path limit requires a Groovy app build.gradle.');
    }
    if (!mod.modResults.contents.includes(marker)) {
      mod.modResults.contents += `
${marker}
if (System.getProperty('os.name').toLowerCase().contains('windows')) {
    android.defaultConfig.externalNativeBuild.cmake.arguments.add('-DCMAKE_OBJECT_PATH_MAX=256')
}
`;
    }
    return mod;
  });
};
