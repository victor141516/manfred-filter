import { JSDOM } from 'jsdom';
import {attribute} from './module';

console.log('Let\'s check...')

if ((new JSDOM('<div id="a">text</div>').window.document.getElementById('a') as HTMLDivElement).textContent !== 'text') throw new Error('Something is misconfigured (external modules/DOM types)')
if (attribute !== 'value') throw new Error('Something is misconfigured (relative modules)')

console.log('OK!')
