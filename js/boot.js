'use strict';
/* =============== Fitme: start aplikacji =============== */
try{const h=decodeURIComponent((location.hash||'').slice(1));if(/^FIT[123]\./.test(h))S=decode(h);}catch(e){}
{const b=prefGet('fitme.backdrop');if(b&&(b==='auto'||BACKDROPS[b]))backdrop=b;}
init3D();wire();setTheme(themeNow());renderPoses();update();refreshCount();
Account.init();
window.FITME={get S(){return S;},set S(v){S=v;},sanitize,buildInto,computeTags,encode,decode,randomize,renderState,go,update,get root(){return root;},Social,Account};
