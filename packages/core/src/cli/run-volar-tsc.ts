import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js';
import { createGtsLanguagePlugin } from '../volar/gts-language-plugin.js';
import { loadConfig } from '../config/index.js';
// import * as vue from '@vue/language-core';

// const windowsPathReg = /\\/g;

export function run() {

  let runExtensions = ['.js', '.ts', '.gjs', '.gts', '.hbs'];
  let cwd = process.cwd();

	// const extensionsChangedException = new Error('extensions changed');
	const main = () => runTsc(
		require.resolve('typescript/lib/tsc'),
		runExtensions,
		(ts, options) => {

      const glintConfig = loadConfig(cwd);
      const gtsLanguagePlugin = createGtsLanguagePlugin(glintConfig);
      return [gtsLanguagePlugin];

			// const { configFilePath } = options.options;
			// const vueOptions = typeof configFilePath === 'string'
			// 	? vue.createParsedCommandLine(ts, ts.sys, configFilePath.replace(windowsPathReg, '/')).vueOptions
			// 	: vue.resolveVueCompilerOptions({});
			// const allExtensions = [
			// 	...vueOptions.extensions,
			// 	...vueOptions.vitePressExtensions,
			// 	...vueOptions.petiteVueExtensions,
			// ];
			// if (
			// 	runExtensions.length === allExtensions.length
			// 	&& runExtensions.every(ext => allExtensions.includes(ext))
			// ) {
			// 	const writeFile = options.host!.writeFile.bind(options.host);
			// 	options.host!.writeFile = (fileName, contents, ...args) => {
			// 		return writeFile(fileName, removeEmitGlobalTypes(contents), ...args);
			// 	};

      //   const glintConfig = loadConfig(cwd);
			// 	const gtsLanguagePlugin = createGtsLanguagePlugin(glintConfig);
			// 	return [gtsLanguagePlugin];
			// }
			// else {
			// 	runExtensions = allExtensions;
			// 	throw extensionsChangedException;
			// }
		}
	);

  main();
	// try {
	// } catch (err) {
	// 	if (err === extensionsChangedException) {
	// 		main();
	// 	} else {
	// 		console.error(err);
	// 	}
	// }
}

// const removeEmitGlobalTypesRegexp = /^[^\n]*__VLS_globalTypesStart[\w\W]*__VLS_globalTypesEnd[^\n]*\n?$/mg;

// export function removeEmitGlobalTypes(dts: string) {
// 	return dts.replace(removeEmitGlobalTypesRegexp, '');
// }
