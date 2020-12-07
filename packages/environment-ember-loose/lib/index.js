"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
function glimmerxEnvironment() {
    return {
        template: {
            typesPath: '@glint/environment-ember-loose/types',
            getPossibleScriptPaths(templatePath) {
                if (templatePath.endsWith(`${path_1.default.sep}template.hbs`)) {
                    // Pod component
                    return [templatePath.replace(/template\.hbs$/, 'component.ts')];
                }
                else {
                    // Colocated component
                    return [templatePath.replace(/\.hbs$/, '.ts')];
                }
            },
            getPossibleTemplatePaths(scriptPath) {
                if (scriptPath.endsWith(`${path_1.default.sep}component.ts`)) {
                    // Pod component
                    return [scriptPath.replace(/component\.ts$/, 'template.hbs')];
                }
                else {
                    // Colocated component
                    return [scriptPath.replace(/\.ts$/, '.hbs')];
                }
            },
        },
    };
}
exports.default = glimmerxEnvironment;
