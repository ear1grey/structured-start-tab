import {loadOptions, saveOptions} from './options.mjs';

document.addEventListener('DOMContentLoaded', loadOptions);
document.getElementById('save').addEventListener('click', saveOptions);
