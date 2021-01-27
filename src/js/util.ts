import { Options } from './defaults.js';

export function prepareCSSVariables(OPTS: Options) :void {
  document.documentElement.style.setProperty('--tiny', Number(OPTS.space) / 1000 + 'em');
  document.documentElement.style.setProperty('--page-font-size', Number(OPTS.fontsize) + '%');
}
