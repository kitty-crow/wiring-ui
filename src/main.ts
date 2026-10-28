import { EditorApp } from './app/EditorApp';
import { initKofi } from '../vendor/pages/src/run/kofi.ts';

new EditorApp();

// Same pinned GitHub Pages Ko-fi widget used by app-kittycrow-dev.
// Defer the optional third-party script until the editor itself has loaded;
// the permanent footer link still works if the widget cannot load offline.
window.addEventListener('load',()=>{
  initKofi({
    user:'kittycrow',
    header:'.topbar',
    footer:'.footer-links',
    footerText:'Buy me a coffee',
    separator:'',
    desktopText:'Buy me a coffee?',
    background:'#5bc0de',
    text:'#323842',
    wideAt:721
  });
},{once:true});
