import { Options } from './defaults.js';

export function prepareCSSVariables(OPTS: Options) :void {
  document.documentElement.style.setProperty('--tiny', `${OPTS.space / 1000}em`);
  document.documentElement.style.setProperty('--page-font-size', `${OPTS.fontsize}%`);
}
