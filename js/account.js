'use strict';
/* =============== Fitme: konta i społeczność – interfejs ===============
   ekran powitania, baner zgód, logowanie i rejestracja, profile, kanały Społeczności, szczegóły fitu z komentarzami,
   powiadomienia, ustawienia konta i prywatności, dokumenty prawne. Dane: js/social.js (Social). */

/* ---------- drobiazgi ---------- */
const ICO={
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  dots:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  bell:'<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>'
};
const ico=(k,cls='ic12')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
const VIS={public:['Publiczny','globe','Każdy, także bez konta'],followers:['Obserwujący','users','Tylko osoby, które Cię obserwują'],private:['Tylko ja','lock','Widzisz go tylko Ty']};
const REASONS={illegal:'Treść nielegalna',hate:'Mowa nienawiści',harassment:'Nękanie lub zastraszanie',nudity:'Nagość lub treści seksualne',violence:'Przemoc lub groźby',
  spam:'Spam lub oszustwo',ip:'Naruszenie praw autorskich lub znaku towarowego',impersonation:'Podszywanie się',minor:'Zagrożenie dla małoletnich',other:'Inny powód'};
function plural(n,one,few,many){const a=Math.abs(n)%100,b=a%10;return n===1?one:(b>=2&&b<=4&&(a<10||a>=20))?few:many;}
function relTime(ts){
  const t=Date.parse(ts);if(!t)return '';const s=(Date.now()-t)/1000;
  if(s<60)return 'przed chwilą';if(s<3600){const m=Math.floor(s/60);return m+' min temu';}
  if(s<86400){const h=Math.floor(s/3600);return h+' godz. temu';}
  const d=Math.floor(s/86400);if(d===1)return 'wczoraj';if(d<7)return d+' '+plural(d,'dzień','dni','dni')+' temu';
  return new Date(t).toLocaleDateString('pl-PL',{day:'numeric',month:'short',year:new Date(t).getFullYear()===new Date().getFullYear()?undefined:'numeric'});
}
const fullDate=ts=>new Date(ts).toLocaleString('pl-PL',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
function hue(s){let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))%360;return h;}
const pname=p=>p?(p.display_name||'').trim()||p.username:'';
function avaEl(p,size){
  const d=el('span',{class:'ava','aria-hidden':'true'});if(size)d.style.cssText=`width:${size}px;height:${size}px;font-size:${Math.round(size*0.38)}px`;
  if(p&&p.avatar&&/^data:image\/(jpeg|png|webp);base64,/.test(p.avatar)){const i=new Image();i.alt='';i.decoding='async';i.src=p.avatar;d.append(i);}
  else{const n=pname(p)||'?';d.textContent=(Array.from(n)[0]||'?').toUpperCase();d.style.background=`hsl(${hue(p&&p.username||n)} 30% 46%)`;}
  return d;
}
function txt(tag,attrs,text){const e=el(tag,attrs||{});e.textContent=text==null?'':String(text);return e;}
/* akcja z obsługą błędu: komunikat z Social (po polsku) w dymku */
async function act(fn,btn){if(btn)btn.disabled=true;try{return await fn();}catch(e){console.error(e);toast(e.message||'Coś poszło nie tak.');return undefined;}finally{if(btn)btn.disabled=false;}}
function siteLink(hash){const base=/^https?:$/.test(location.protocol)?location.origin+location.pathname:FITME_CONFIG.site;return base+hash;}
async function copyText(t,msg){try{await navigator.clipboard.writeText(t);toast(msg||'Skopiowano');}catch(e){window.prompt('Skopiuj:',t);}}
function setHash(h){try{history.replaceState(null,'',h?h:location.pathname+location.search);}catch(e){}}
/* miniatura do bazy: WebP/JPEG najwyżej ~200 kB */
function shrinkThumb(url){return new Promise(res=>{
  if(!url){res(null);return;}if(url.length<200000&&/^data:image\/(webp|jpeg|png);base64,/.test(url)){res(url);return;}
  const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=300;c.height=400;c.getContext('2d').drawImage(i,0,0,300,400);
    let u=c.toDataURL('image/webp',0.8);if(!u.startsWith('data:image/webp'))u=c.toDataURL('image/jpeg',0.82);res(u.length<240000?u:null);};
  i.onerror=()=>res(null);i.src=url;});}
/* zdjęcie profilowe: kwadrat ze środka, 256 px, JPEG */
function avatarFrom(file){return new Promise((res,rej)=>{
  if(!file||!/^image\//.test(file.type)){rej(new Error('Wybierz plik graficzny (JPG, PNG lub WebP).'));return;}
  if(file.size>15e6){rej(new Error('To zdjęcie jest za duże (ponad 15 MB).'));return;}
  const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const s=Math.min(i.width,i.height),c=document.createElement('canvas');c.width=c.height=256;
    const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,256,256);g.drawImage(i,(i.width-s)/2,(i.height-s)/2,s,s,0,0,256,256);
    let q=0.86,u=c.toDataURL('image/jpeg',q);while(u.length>110000&&q>0.4){q-=0.12;u=c.toDataURL('image/jpeg',q);}res(u);};
    i.onerror=()=>rej(new Error('Nie udało się odczytać tego zdjęcia.'));i.src=r.result;};r.onerror=()=>rej(new Error('Nie udało się odczytać pliku.'));r.readAsDataURL(file);});}
function pwScore(p){let s=0;if(p.length>=8)s++;if(p.length>=12)s++;if(/[a-ząćęłńóśźż]/.test(p)&&/[A-ZĄĆĘŁŃÓŚŹŻ]/.test(p))s++;if(/\d/.test(p))s++;if(/[^\p{L}\p{N}]/u.test(p))s++;return Math.min(4,s);}
const UNAME_RE=/^[a-z0-9][a-z0-9._]{1,22}[a-z0-9]$/;
function unameProblem(u){if(u.length<3)return 'Co najmniej 3 znaki.';if(u.length>24)return 'Najwyżej 24 znaki.';if(!UNAME_RE.test(u))return 'Tylko małe litery, cyfry, kropka i podkreślnik (nie na początku ani na końcu).';if(/[._]{2}/.test(u))return 'Bez dwóch kropek ani podkreślników obok siebie.';return '';}
/* pole hasła z przyciskiem „Pokaż” */
function pwField(id,label,auto,extra){
  const f=el('label',{class:'fld'});f.append(txt('span',{},label));const w=el('div',{class:'pw'});
  const i=el('input',{type:'password',id,autocomplete:auto,required:'',minlength:'8',maxlength:'72'});const b=el('button',{type:'button','aria-label':'Pokaż hasło'},'Pokaż');
  b.addEventListener('click',()=>{const on=i.type==='password';i.type=on?'text':'password';b.textContent=on?'Ukryj':'Pokaż';b.setAttribute('aria-label',on?'Ukryj hasło':'Pokaż hasło');});
  w.append(i,b);f.append(w);if(extra)f.append(extra);return f;
}
function field(label,input,hint){const f=el(input.tagName==='DIV'?'div':'label',{class:'fld'});const s=el('span',{});s.append(document.createTextNode(label));if(hint)s.append(txt('small',{},hint));f.append(s,input);return f;}
/* małe menu przy przycisku (⋯, konto) */
let popEl=null;
function closePop(){if(popEl){popEl.remove();popEl=null;}}
function showPop(anchor,build,cls){
  closePop();const p=el('div',{class:'pop'+(cls?' '+cls:''),role:'menu'}),inn=el('div',{class:'pop-in'});p.append(inn);build(inn);document.body.append(p);popEl=p;
  const r=anchor.getBoundingClientRect(),w=p.offsetWidth,h=p.offsetHeight;
  let x=Math.min(window.innerWidth-w-8,Math.max(8,r.right-w)),y=r.bottom+8;if(y+h>window.innerHeight-8)y=Math.max(8,r.top-h-8);
  p.style.left=x+'px';p.style.top=y+'px';const f=p.querySelector('button');if(f)f.focus({preventScroll:true});return p;
}
document.addEventListener('click',e=>{if(popEl&&!e.target.closest('.pop')&&!e.target.closest('[data-pop]'))closePop();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&popEl)closePop();});
window.addEventListener('resize',closePop);
const popItem=(label,fn,cls)=>{const b=el('button',{class:'mitem'+(cls?' '+cls:''),role:'menuitem'});b.textContent=label;b.addEventListener('click',()=>{closePop();fn();});return b;};
/* okno z pytaniem / formularzem */
function ask({title,text,html,body,ok='OK',cancel='Anuluj',danger=false,onOk,blocking=false}){
  const d=$('#dlgAsk'),b=$('#askBody');b.innerHTML='';b.append(el('h3',{},esc(title)));
  if(text)b.append(txt('p',{},text));if(html)b.append(el('p',{},html));if(body)b.append(body);
  const err=el('div',{class:'err'}),row=el('div',{class:'drow'});b.append(err,row);
  if(cancel){const c=el('button',{class:'pill',type:'button'});c.textContent=cancel;c.addEventListener('click',()=>d.close());row.append(c);}
  const o=el('button',{class:'pill ink'+(danger?' danger':''),type:'button',style:'padding:9px 18px'});o.textContent=ok;row.append(o);
  o.addEventListener('click',async()=>{err.textContent='';o.disabled=true;try{const r=onOk?await onOk(b):true;if(r!==false)d.close();}catch(e){err.textContent=e.message||'Coś poszło nie tak.';}finally{o.disabled=false;}});
  d.oncancel=blocking?(e=>e.preventDefault()):null;
  d.showModal();const f=b.querySelector('input,textarea');if(f)f.focus();return d;
}

/* =============== zgody (baner „cookies”) =============== */
const Consent={
  need(){const c=consentGet();return !c||c.v!==1||!c.at||Date.now()-Date.parse(c.at)>365*864e5;},
  set(prefs){
    try{localStorage.setItem(CONSENT_KEY,JSON.stringify({v:1,prefs:!!prefs,at:new Date().toISOString()}));}catch(e){}
    try{if(prefs){
        /* to, co ustawiono przed decyzją, zostaje zapamiętane */
        for(const k of PREF_KEYS){const v=sessionStorage.getItem(k);if(v!=null){localStorage.setItem(k,v);sessionStorage.removeItem(k);}}
        prefSet('fitme.theme',themeNow());prefSet('fitme.opts',JSON.stringify(OPT));prefSet('fitme.backdrop',backdrop);prefSet('fitme.dept',dept);
      }else for(const k of PREF_KEYS)localStorage.removeItem(k);}catch(e){}
    this.hide();toast(prefs?'Zapisano: zapamiętujemy też Twoje preferencje':'Zapisano: tylko niezbędne dane');
  },
  show(){const c=$('#cookie');c.hidden=false;this.layout();},
  hide(){$('#cookie').hidden=true;this.layout();},
  layout(){const c=$('#cookie');document.documentElement.style.setProperty('--cookie-h',c.hidden?'0px':(c.offsetHeight+24)+'px');},
  settings(){
    const d=$('#dlgCookies'),b=$('#ckBody'),c=consentGet();b.innerHTML='';
    b.append(el('h3',{id:'ckTitle'},'Prywatność i cookies'));
    b.append(el('p',{},'Fitme nie używa reklam, analityki ani śledzenia. Wybierz, co możemy zapisywać w pamięci tego urządzenia. <button class="txtbtn" data-legal="cookies" style="padding:0">Pełna lista</button>'));
    const row=(t,sub,inp)=>{const r=el('div',{class:'switchrow'});const s=el('span',{});s.append(document.createTextNode(t),txt('small',{},sub));r.append(s,inp);return r;};
    const nec=el('input',{type:'checkbox',class:'switch',checked:'',disabled:'','aria-label':'Niezbędne (zawsze włączone)'});
    const pr=el('input',{type:'checkbox',class:'switch','aria-label':'Preferencje'});pr.checked=!!(c&&c.prefs);
    b.append(row('Niezbędne','Logowanie, Twoje zapisane i polubione fity, ten wybór. Zawsze włączone, bo bez nich aplikacja nie działa.',nec),
      row('Preferencje','Motyw, tło sceny, jakość grafiki, opcje, ostatni dział i historia oglądania w trybie gościa. Bez zgody działają do zamknięcia karty.',pr));
    if(c)b.append(txt('p',{style:'margin-top:10px;font-size:12.5px'},'Ostatnia decyzja: '+fullDate(c.at)+'.'));
    const rowB=el('div',{class:'drow'}),x=el('button',{class:'pill',type:'button'},'Anuluj'),ok=el('button',{class:'pill ink',type:'button',style:'padding:9px 18px'},'Zapisz wybór');
    x.addEventListener('click',()=>d.close());ok.addEventListener('click',()=>{this.set(pr.checked);d.close();});rowB.append(x,ok);b.append(rowB);d.showModal();
  }
};

/* =============== dokumenty prawne =============== */
function openLegal(key){
  if(!LEGAL_DOCS[key])key='terms';const d=$('#dlgLegal');
  $('#legalTitle').textContent=LEGAL_DOCS[key];
  const tabs=$('#legalTabs');tabs.innerHTML='';for(const[k,l] of Object.entries(LEGAL_DOCS)){const c=el('button',{class:'chip','aria-pressed':String(k===key),type:'button'});c.textContent=l;c.addEventListener('click',()=>openLegal(k));tabs.append(c);}
  const body=$('#legalBody');body.innerHTML=legalHTML(key);body.scrollTop=0;
  body.append(el('p',{style:'margin-top:14px;font-size:12.5px'},'<a href="'+esc(siteLink('').replace(/fitme\.html$|index\.html$/,'')+'legal.html#'+key)+'" target="_blank" rel="noopener">Otwórz jako stronę</a>'));
  if(!d.open)d.showModal();
}
document.addEventListener('click',e=>{const a=e.target.closest('[data-legal]');if(!a)return;e.preventDefault();closeMenu();openLegal(a.dataset.legal);});

/* =============== konto: logowanie, rejestracja, hasła =============== */
const Account={
  exTab:'inspo',exOff:0,exBefore:null,exSeq:0,mineView:null,opened:null,unread:0,syncT:0,applying:false,viewing:null,

  init(){
    this.renderHeader();
    $('#wGuest').addEventListener('click',()=>this.dismissWelcome());
    $('#wLogin').addEventListener('click',()=>{this.dismissWelcome(true);this.auth('login');});
    $('#wSignup').addEventListener('click',()=>{this.dismissWelcome(true);this.auth('signup');});
    $('#welcome').addEventListener('keydown',e=>{if(e.key==='Escape')this.dismissWelcome();});
    $('#ckYes').addEventListener('click',()=>Consent.set(true));
    $('#ckNo').addEventListener('click',()=>Consent.set(false));
    $('#ckMore').addEventListener('click',()=>Consent.settings());
    $('#mCookies').addEventListener('click',()=>{closeMenu();Consent.settings();});
    window.addEventListener('resize',()=>Consent.layout());
    if(Consent.need())Consent.show();
    if(!Social.on){$('#wAcct').hidden=true;$('#wNote').textContent='Fity zapisują się na tym urządzeniu. Możesz je też udostępniać kodem.';$('#wGuest').firstChild.textContent='Przejdź do projektowania ';$('.wor').hidden=true;}
    Social.onChange(ev=>this.onAuth(ev));
    window.addEventListener('hashchange',()=>this.route());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.pollUnread();});
    setInterval(()=>{if(!document.hidden)this.pollUnread();},60000);
    $('#dlgFit').addEventListener('close',()=>{if(/^#f\//.test(location.hash))setHash(page==='profile'&&this.viewing?'#u/'+this.viewing:'');});
    if(Social.on)Social.init().then(()=>this.afterInit()).catch(e=>{console.error('Fitme: konto',e);this.afterInit();});else this.afterInit();
  },
  afterInit(){
    /* link do profilu, fitu albo kod FIT: ktoś przyszedł coś zobaczyć, więc bez ekranu powitania */
    if(!Social.user&&!/^#(u\/|f\/|FIT)/.test(decodeURIComponent(location.hash||'')))this.showWelcome();
    /* wynik kliknięcia w link z maila */
    const h=new URLSearchParams(BOOT_HASH.replace(/^#/,''));
    if(h.get('error_description'))this.auth('login',{msg:/expired|invalid/i.test(h.get('error_code')+h.get('error_description'))?'Link wygasł albo został już użyty. Zaloguj się lub poproś o nowy link.':h.get('error_description'),bad:true});
    else if(h.get('type')==='signup'&&Social.user)toast('Adres potwierdzony. Witaj w Fitme, @'+(Social.profile?Social.profile.username:'')+'!');
    else if(h.get('type')==='email_change'&&Social.user)toast('Adres e-mail zmieniony');
    this.route();
  },
  route(){
    const h=decodeURIComponent(location.hash||'');let m;
    if((m=h.match(/^#u\/([a-z0-9._]{3,24})$/i)))this.showProfile(m[1]);
    else if((m=h.match(/^#f\/([0-9a-f-]{36})$/i)))this.openFit(m[1]);
  },
  onAuth(ev){
    this.renderHeader();
    if(ev==='PASSWORD_RECOVERY'){this.auth('newpass');return;}
    if(Social.user){this.dismissWelcome(true);if(ev==='SIGNED_IN'||ev==='INITIAL')this.afterSignIn(ev);}
    if(ev==='SIGNED_OUT'){this.unread=0;this._signedFor=null;refreshCount();if(page==='account')go('creator');if(page==='mine')renderMine();if(page==='explore'&&this.exTab==='following')this.exTab='latest';}
    if(page==='explore')renderExplore();if(page==='mine')renderMine();if(page==='profile'&&this.viewing)this.showProfile(this.viewing);
  },
  async afterSignIn(ev){
    if(this._signedFor===Social.uid)return;this._signedFor=Social.uid;
    this.pollUnread();this.refreshCount();
    const p=Social.settings&&Social.settings.prefs;
    if(p&&p.v&&p.sync!==false)this.applyPrefs(p);else if(!p||!p.v)this.pushPrefs();
    try{const c=await Social.consents();if(!c.some(x=>x.doc==='terms'&&x.version===FITME_CONFIG.legalVersion))this.askTerms();}catch(e){console.error(e);}
    const local=load(KEY).length;
    if(local&&ev==='SIGNED_IN'&&!this._askedMove){this._askedMove=true;setTimeout(()=>{if(!$('#dlgAsk').open)this.moveLocal();},700);}
  },
  askTerms(){
    ask({title:'Zaktualizowaliśmy dokumenty',html:'Żeby dalej korzystać z konta, zapoznaj się z nową wersją <a href="#" data-legal="terms">Regulaminu</a> i <a href="#" data-legal="privacy">Polityki prywatności</a> (z dnia '+esc(FITME_CONFIG.legalVersion)+') i ją zaakceptuj.',
      ok:'Akceptuję',cancel:'Wyloguj się',blocking:true,onOk:async()=>{await Social.acceptDocs(FITME_CONFIG.legalVersion);toast('Dziękujemy');}});
    const c=$('#askBody .drow .pill:not(.ink)');c.onclick=()=>{$('#dlgAsk').close();this.signOut();};
  },
  showWelcome(){let seen=null;try{seen=localStorage.getItem('fitme.welcomed');}catch(e){}if(seen)return;const w=$('#welcome');w.hidden=false;setTimeout(()=>{const b=Social.on?$('#wSignup'):$('#wGuest');b.focus();},60);},
  dismissWelcome(quiet){const w=$('#welcome');if(w.hidden)return;w.hidden=true;try{localStorage.setItem('fitme.welcomed','1');}catch(e){}if(!quiet)flyTo('full');},
  needLogin(msg){if(!Social.on){toast('Konta nie są włączone w tej wersji.');return;}this.auth('login',{msg});},

  /* ---------- okno logowania ---------- */
  auth(view,o={}){
    const d=$('#dlgAuth'),b=$('#authBody');b.innerHTML='';
    const head=(t,p)=>{b.append(el('h3',{id:'authTitle'},esc(t)));if(p)b.append(txt('p',{},p));};
    const msgBox=el('div',{class:'err',role:'alert'});if(o.msg){msgBox.textContent=o.msg;if(!o.bad)msgBox.style.color='var(--muted)';}
    const swap=(lead,label,to)=>{const l=el('div',{class:'lnk'});l.append(document.createTextNode(lead));const x=el('button',{type:'button',class:'txtbtn',style:'padding:0'});x.textContent=label;x.addEventListener('click',()=>this.auth(to,{email:(b.querySelector('input[type=email]')||{}).value}));l.append(x);return l;};
    const form=el('form',{novalidate:''});
    const close=el('button',{type:'button',class:'fd-x','aria-label':'Zamknij',style:'position:absolute;right:18px;top:18px'},'×');close.addEventListener('click',()=>d.close());
    b.style.position='relative';b.append(close);
    const email=el('input',{type:'email',id:'auEmail',autocomplete:'email',required:'',maxlength:'120',placeholder:'ty@example.com'});if(o.email)email.value=o.email;
    const submit=(label)=>{const s=el('button',{type:'submit',class:'pill ink block'});s.textContent=label;return s;};
    if(view==='login'){
      head('Zaloguj się','Wróć do swoich fitów, obserwowanych i powiadomień.');
      const pw=pwField('auPw','Hasło','current-password');const s=submit('Zaloguj się');
      const forgot=el('button',{type:'button',class:'txtbtn',style:'align-self:flex-start;padding:0'},'Nie pamiętasz hasła?');forgot.addEventListener('click',()=>this.auth('reset',{email:email.value}));
      form.append(field('E-mail',email),pw,forgot,msgBox,s,swap('Nie masz konta? ','Załóż je','signup'));
      form.addEventListener('submit',async e=>{e.preventDefault();msgBox.textContent='';msgBox.style.color='';
        if(!email.value.trim()||!$('#auPw').value){msgBox.textContent='Podaj e-mail i hasło.';return;}
        s.disabled=true;try{await Social.signIn(email.value.trim(),$('#auPw').value);d.close();toast('Zalogowano'+(Social.profile?' jako @'+Social.profile.username:''));}
        catch(err){msgBox.textContent=err.message;if(/potwierdź/i.test(err.message)){const r=el('button',{type:'button',class:'txtbtn',style:'padding:0 0 0 6px'},'Wyślij link ponownie');r.addEventListener('click',()=>act(async()=>{await Social.resend(email.value.trim());toast('Wysłaliśmy nowy link');},r));msgBox.append(r);}}
        finally{s.disabled=false;}});
    }else if(view==='signup'){
      head('Załóż konto','Publikuj fity, obserwuj innych i miej swoje stylizacje na każdym urządzeniu. To nic nie kosztuje.');
      const meter=el('div',{class:'meter','aria-hidden':'true'},'<i></i>'),pwHint=el('div',{class:'fhint'},'Co najmniej 8 znaków.');
      const pwBox=el('div',{style:'display:flex;flex-direction:column;gap:5px'});pwBox.append(meter,pwHint);
      const pw=pwField('auPw','Hasło','new-password',pwBox);
      const un=el('input',{type:'text',id:'auUser',autocomplete:'username',required:'',maxlength:'24',spellcheck:'false',autocapitalize:'none',placeholder:'twoja.nazwa'});
      const unW=el('div',{class:'uname'});unW.append(un);const unHint=el('div',{class:'fhint'},'Tak inni Cię znajdą. Małe litery, cyfry, kropka, podkreślnik.');
      const unF=field('Nazwa użytkownika',unW);unF.append(unHint);
      const dn=el('input',{type:'text',id:'auName',maxlength:'40',autocomplete:'name',placeholder:'np. Ola'});
      const age=el('input',{type:'checkbox',id:'auAge'}),tos=el('input',{type:'checkbox',id:'auTos'});
      const ageL=el('label',{class:'chk'});ageL.append(age,txt('span',{},'Mam ukończone '+FITME_CONFIG.minAge+' lat.'));
      const tosL=el('label',{class:'chk'});tosL.append(tos,el('span',{},'Akceptuję <a href="#" data-legal="terms">Regulamin</a> i <a href="#" data-legal="community">Zasady społeczności</a>. Zapoznałem(-am) się z <a href="#" data-legal="privacy">Polityką prywatności</a>.'));
      const s=submit('Załóż konto');
      form.append(field('E-mail',email),pw,unF,field('Nazwa wyświetlana',dn,'opcjonalnie'),ageL,tosL,msgBox,s,swap('Masz już konto? ','Zaloguj się','login'));
      let unT=0,unOk=false,unSeq=0;
      const pwI=pw.querySelector('input');
      pwI.addEventListener('input',()=>{const v=pwI.value,sc=pwScore(v),i=meter.firstChild;i.style.width=(v?Math.max(12,sc*25):0)+'%';i.style.background=['#A3341F','#A3341F','#C2862C','#7c9a3c','#3c7a3a'][sc];
        pwHint.textContent=v.length<8?'Co najmniej 8 znaków.':['Bardzo słabe','Słabe','Średnie','Dobre','Mocne'][sc]+' hasło.';});
      un.addEventListener('input',()=>{const v=un.value.toLowerCase().replace(/\s+/g,'');if(v!==un.value)un.value=v;unOk=false;clearTimeout(unT);
        const p=unameProblem(v);unHint.className='fhint'+(v&&p?' bad':'');unHint.textContent=v?p||'Sprawdzam…':'Tak inni Cię znajdą. Małe litery, cyfry, kropka, podkreślnik.';un.setAttribute('aria-invalid',String(!!(v&&p)));
        if(p)return;const seq=++unSeq;unT=setTimeout(async()=>{try{const ok=await Social.usernameAvailable(v);if(seq!==unSeq)return;unOk=ok;unHint.className='fhint '+(ok?'ok':'bad');unHint.textContent=ok?'@'+v+' jest wolna ✓':'@'+v+' jest zajęta albo zastrzeżona.';un.setAttribute('aria-invalid',String(!ok));}catch(e){if(seq===unSeq){unHint.textContent='';}}},380);});
      form.addEventListener('submit',async e=>{e.preventDefault();msgBox.textContent='';
        const em=email.value.trim(),u=un.value.trim();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){msgBox.textContent='Podaj poprawny adres e-mail.';email.focus();return;}
        if(pwI.value.length<8){msgBox.textContent='Hasło musi mieć co najmniej 8 znaków.';pwI.focus();return;}
        const up=unameProblem(u);if(up){msgBox.textContent='Nazwa użytkownika: '+up;un.focus();return;}
        if(!age.checked){msgBox.textContent='Konto może założyć osoba, która ukończyła '+FITME_CONFIG.minAge+' lat.';return;}
        if(!tos.checked){msgBox.textContent='Zaakceptuj Regulamin i Zasady społeczności.';return;}
        s.disabled=true;
        try{if(!unOk&&!(await Social.usernameAvailable(u))){msgBox.textContent='Ta nazwa użytkownika jest zajęta. Wybierz inną.';un.focus();return;}
          const r=await Social.signUp({email:em,password:pwI.value,username:u,displayName:dn.value.trim()});
          if(r.session){d.close();toast('Witaj w Fitme, @'+u+'!');}else this.auth('check',{email:em,exists:r.exists});}
        catch(err){msgBox.textContent=err.message;}finally{s.disabled=false;}});
    }else if(view==='check'){
      head('Sprawdź skrzynkę');
      b.append(el('div',{class:'ok-msg'},'Wysłaliśmy link potwierdzający na <b>'+esc(o.email||'')+'</b>. Kliknij go, a konto będzie gotowe.'+(o.exists?'<br><br>Jeśli masz już konto z tym adresem, nie wyślemy nowego linku: zaloguj się albo zresetuj hasło.':'')));
      b.append(txt('p',{style:'margin-top:12px;font-size:13px'},'Nie widzisz wiadomości? Zajrzyj do spamu. Link działa przez 24 godziny.'));
      const row=el('div',{class:'drow'}),re=el('button',{class:'pill',type:'button'},'Wyślij ponownie'),go2=el('button',{class:'pill ink',type:'button',style:'padding:9px 18px'},'Przejdź do logowania');
      let left=0,tm=0;const tick=()=>{re.disabled=left>0;re.textContent=left>0?'Wyślij ponownie ('+left+' s)':'Wyślij ponownie';if(left-->0)tm=setTimeout(tick,1000);};left=60;tick();
      re.addEventListener('click',()=>act(async()=>{await Social.resend(o.email);toast('Wysłaliśmy nowy link');left=60;clearTimeout(tm);tick();},re));
      go2.addEventListener('click',()=>{clearTimeout(tm);this.auth('login',{email:o.email,msg:'Po kliknięciu w link z maila zaloguj się tutaj.'});});
      row.append(re,go2);b.append(row);
    }else if(view==='reset'){
      head('Nie pamiętasz hasła?','Podaj adres e-mail konta. Wyślemy link do ustawienia nowego hasła.');
      const s=submit('Wyślij link');form.append(field('E-mail',email),msgBox,s,swap('Pamiętasz? ','Zaloguj się','login'));
      form.addEventListener('submit',async e=>{e.preventDefault();msgBox.textContent='';const em=email.value.trim();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){msgBox.textContent='Podaj poprawny adres e-mail.';return;}
        s.disabled=true;try{await Social.resetPassword(em);form.replaceWith(el('div',{class:'ok-msg'},'Jeśli konto z adresem <b>'+esc(em)+'</b> istnieje, wysłaliśmy na nie link. Kliknij go, a otworzy się okno ustawiania nowego hasła.'));}
        catch(err){msgBox.textContent=err.message;}finally{s.disabled=false;}});
    }else if(view==='newpass'){
      head('Ustaw nowe hasło','Wymyśl nowe hasło do konta'+(Social.user?' '+Social.user.email:'')+'.');
      const p1=pwField('auPw','Nowe hasło','new-password'),p2=pwField('auPw2','Powtórz hasło','new-password'),s=submit('Zapisz hasło');
      form.append(p1,p2,msgBox,s);
      form.addEventListener('submit',async e=>{e.preventDefault();msgBox.textContent='';const a=$('#auPw').value,c=$('#auPw2').value;
        if(a.length<8){msgBox.textContent='Hasło musi mieć co najmniej 8 znaków.';return;}if(a!==c){msgBox.textContent='Hasła się różnią.';return;}
        s.disabled=true;try{await Social.setPassword(a);d.close();toast('Nowe hasło zapisane');}catch(err){msgBox.textContent=err.message;}finally{s.disabled=false;}});
    }
    if(form.childNodes.length)b.append(form);
    /* fokus od razu (autofocus przy otwarciu okna), bez opóźnienia, które mogło przenieść kursor w trakcie pisania */
    const f=b.querySelector(view==='login'&&email.value?'#auPw':'input');
    if(f)f.autofocus=true;
    if(!d.open)d.showModal();else if(f)f.focus();
  },
  async signOut(scope){await act(()=>Social.signOut(scope));this._signedFor=null;toast(scope==='global'?'Wylogowano ze wszystkich urządzeń':'Wylogowano');},

  /* ---------- nagłówek i menu ---------- */
  renderHeader(){
    const slot=$('#acctSlot'),m=$('#mAcct');slot.innerHTML='';m.innerHTML='';
    if(!Social.on)return;
    m.append(el('div',{class:'msep'}));
    if(!Social.user){
      const b=el('button',{class:'pill',id:'hdrLogin'},'Zaloguj się');b.addEventListener('click',()=>this.auth('login'));slot.append(b);
      const a=el('button',{class:'mitem'},'Zaloguj się'),c=el('button',{class:'mitem'},'Załóż konto <small>za darmo</small>');
      a.addEventListener('click',()=>{closeMenu();this.auth('login');});c.addEventListener('click',()=>{closeMenu();this.auth('signup');});m.append(a,c);return;
    }
    const p=Social.profile||{username:'…'};
    const bell=el('button',{class:'iconbtn bell',id:'hdrBell','aria-label':'Powiadomienia','data-pop':'',title:'Powiadomienia'},ico('bell','')+(this.unread?'<span class="badge">'+(this.unread>9?'9+':this.unread)+'</span>':''));
    bell.addEventListener('click',()=>popEl&&popEl.classList.contains('npop')?closePop():this.showNotifications(bell));
    const me=el('button',{class:'acct-btn',id:'hdrMe','aria-label':'Konto: @'+p.username,'data-pop':'',title:'@'+p.username});me.append(avaEl(p));
    me.addEventListener('click',()=>popEl&&!popEl.classList.contains('npop')?closePop():showPop(me,inn=>{
      const h=el('div',{class:'phead'});h.append(txt('b',{},pname(p)),document.createTextNode('@'+p.username));inn.append(h);
      inn.append(popItem('Mój profil',()=>this.showProfile(p.username)),popItem('Moje fity',()=>{this.mineView='cloud';go('mine');}),
        popItem('Ustawienia konta',()=>this.showAccount('profile')),popItem('Prywatność',()=>this.showAccount('privacy')),popItem('Wyloguj się',()=>this.signOut()));
    }));
    slot.append(bell,me);
    for(const[l,f] of [['Mój profil',()=>this.showProfile(p.username)],['Ustawienia konta i prywatności',()=>this.showAccount('profile')],['Wyloguj się',()=>this.signOut()]]){
      const x=el('button',{class:'mitem'});x.textContent=l;x.addEventListener('click',()=>{closeMenu();f();});m.append(x);}
  },
  async pollUnread(){if(!Social.user)return;const n=await Social.unread();if(n!==this.unread){this.unread=n;this.renderHeader();}},
  async refreshCount(){if(!Social.user){refreshCount();return;}const n=await Social.myFitsCount();$$('.savedCount').forEach(e=>e.textContent=String(n));},

  /* ---------- preferencje na koncie ---------- */
  prefsPayload(){return{v:1,sync:true,opts:Object.assign({},OPT),theme:themeNow(),backdrop,quality:QUALITY,dept,inspoLikes:load(LIKES).slice(0,200)};},
  syncOn(){const p=Social.settings&&Social.settings.prefs;return !p||p.sync!==false;},
  prefsChanged(now){if(this.applying||!Social.user||!this.syncOn())return;clearTimeout(this.syncT);const go2=()=>Social.saveSettings({prefs:this.prefsPayload()}).catch(e=>console.error(e));if(now)go2();else this.syncT=setTimeout(go2,1500);},
  pushPrefs(){if(Social.user&&this.syncOn())Social.saveSettings({prefs:this.prefsPayload()}).catch(e=>console.error(e));},
  applyPrefs(p){
    this.applying=true;
    try{
      if(p.opts&&typeof p.opts==='object'){for(const k of Object.keys(OPT_DEF))if(typeof p.opts[k]===typeof OPT_DEF[k])OPT[k]=p.opts[k];saveOpts();applyOpts(scene,renderer,true);if(tScene)applyOpts(tScene,tR,false);}
      if(p.theme==='light'||p.theme==='dark')setTheme(p.theme);
      if(p.backdrop&&(p.backdrop==='auto'||BACKDROPS[p.backdrop])){backdrop=p.backdrop;prefSet('fitme.backdrop',backdrop);applyBackdrop();$$('[data-bd]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bd===backdrop)));}
      if(p.dept&&DEPTS[p.dept]){dept=p.dept;prefSet('fitme.dept',dept);}
      if(Array.isArray(p.inspoLikes)){const L=new Set(load(LIKES));p.inspoLikes.forEach(x=>{if(typeof x==='string'&&INSPO.some(f=>f.id===x))L.add(x);});store(LIKES,[...L]);}
      if(['perf','std','high'].includes(p.quality)&&p.quality!==QUALITY){prefSet('fitme.quality',p.quality);toast('Jakość grafiki z Twojego konta zadziała po ponownym otwarciu aplikacji');}
      renderLeft();renderRight();renderPoses();
    }finally{this.applying=false;}
    this.pushPrefs();
  },

  /* ---------- zapis fitu ---------- */
  prepSave(){
    const box=$('#saveCloud');box.innerHTML='';this._saveTo=null;
    if(!Social.on)return;
    if(!Social.user){const n=el('p',{style:'margin:12px 0 0;font-size:13px'},'Zapis na tym urządzeniu. ');const l=el('button',{type:'button',class:'txtbtn',style:'padding:0'},'Załóż konto');
      l.addEventListener('click',()=>{$('#dlgSave').close();this.auth('signup');});n.append(l,document.createTextNode(', żeby publikować fity i mieć je wszędzie.'));box.append(n);return;}
    let to='cloud',vis=(Social.settings&&Social.settings.default_visibility)||'public';this._saveTo='cloud';
    const where=chips([['cloud','Na moim koncie'],['device','Na tym urządzeniu']],to,v=>{to=v;this._saveTo=v;where.querySelectorAll('.chip').forEach((c,i)=>c.setAttribute('aria-pressed',String(['cloud','device'][i]===v)));extra.hidden=v!=='cloud';},'Gdzie zapisać');
    const extra=el('div',{style:'display:flex;flex-direction:column;gap:10px;margin-top:10px'});
    const desc=el('textarea',{id:'saveDesc',maxlength:'300',rows:'2',placeholder:'Opis (opcjonalnie): okazja, inspiracja, co z czym łączyć…','aria-label':'Opis fitu',style:'height:64px;font-family:inherit;word-break:normal'});
    const visHint=txt('div',{class:'fhint'},VIS[vis][2]);
    const vc=chips(Object.entries(VIS).map(([k,v])=>[k,v[0]]),vis,v=>{vis=v;this._saveVis=v;vc.querySelectorAll('.chip').forEach((c,i)=>c.setAttribute('aria-pressed',String(Object.keys(VIS)[i]===v)));visHint.textContent=VIS[v][2];},'Widoczność');
    this._saveVis=vis;
    const vl=el('div',{class:'fld'});vl.append(txt('span',{},'Kto zobaczy ten fit'),vc,visHint);
    extra.append(desc,vl);
    if(this.opened&&this.opened.owner&&this.opened.owner!==Social.uid)extra.append(txt('div',{class:'fhint'},'Zapiszemy go jako inspirowany fitem „'+this.opened.name+'”.'));
    box.append(el('div',{style:'margin-top:12px'}),where,extra);
  },
  saveTarget(){return Social.user&&this._saveTo==='cloud'?'cloud':'device';},
  async saveCloud(name){
    try{
      const thumb=await shrinkThumb(renderState(S));
      const row={name,description:(($('#saveDesc')||{}).value||'').trim().slice(0,300),state:clone(S),thumb,tags:computeTags(S).tags.slice(0,6),visibility:this._saveVis||'public'};
      if(this.opened&&this.opened.owner&&this.opened.owner!==Social.uid&&/^[0-9a-f-]{36}$/.test(this.opened.id))row.remix_of=this.opened.id;
      const f=await Social.createFit(row);this.opened=null;
      toastAction(row.visibility==='private'?'Zapisano na koncie: '+name:'Opublikowano: '+name,'Zobacz',()=>this.openFit(f.id));
      this.refreshCount();if(Social.profile)Social.loadMe().then(()=>this.renderHeader()).catch(()=>{});return true;
    }catch(e){toast(e.message);return false;}
  },
  async moveLocal(){
    const list=load(KEY);if(!list.length)return;let vis='private';
    const body=el('div',{});const vc=chips(Object.entries(VIS).map(([k,v])=>[k,v[0]]),vis,v=>{vis=v;vc.querySelectorAll('.chip').forEach((c,i)=>c.setAttribute('aria-pressed',String(Object.keys(VIS)[i]===v)));},'Widoczność');
    body.append(txt('p',{style:'margin:0 0 8px;font-size:13px'},'Widoczność przeniesionych fitów (zmienisz ją potem przy każdym z osobna):'),vc);
    ask({title:'Przenieść fity na konto?',text:'Na tym urządzeniu masz '+list.length+' '+plural(list.length,'zapisany fit','zapisane fity','zapisanych fitów')+'. Możesz przenieść je na konto, żeby mieć je na każdym urządzeniu.',body,ok:'Przenieś',cancel:'Nie teraz',
      onOk:async()=>{let n=0;const left=[];
        for(const it of list){try{await Social.createFit({name:String(it.name||'Fit').slice(0,40)||'Fit',state:sanitize(it.state),thumb:await shrinkThumb(it.thumb),tags:computeTags(sanitize(it.state)).tags.slice(0,6),visibility:vis});n++;}catch(e){left.push(it);if(/Za dużo/.test(e.message))break;}}
        store(KEY,left);refreshCount();this.refreshCount();toast('Przeniesiono '+n+' '+plural(n,'fit','fity','fitów')+(left.length?'. Pozostałe ('+left.length+') zostały na urządzeniu.':''));if(page==='mine')renderMine();}});
  },
  /* otwarcie fitu w kreatorze: historia oglądania i „inspirowane” przy zapisie */
  opened(ref,name,owner){
    this.opened={id:ref,name,owner};
    const r=(/^[0-9a-f-]{36}$/.test(ref)?'':'inspo:')+ref;
    if(Social.user)Social.addHistory(r,name).catch(()=>{});
    else if(prefsAllowed()){let h=[];try{h=JSON.parse(localStorage.getItem('fitme.history')||'[]');}catch(e){}if(!Array.isArray(h))h=[];
      h=[{ref:r,name:String(name||'').slice(0,40),seen_at:new Date().toISOString()},...h.filter(x=>x&&x.ref!==r)].slice(0,50);try{localStorage.setItem('fitme.history',JSON.stringify(h));}catch(e){}}
  },
  async openInCreator(id){
    const f=await act(()=>Social.getFit(id));if(f===undefined)return;
    if(!f){toast('Ten fit jest już niedostępny');return;}
    S=sanitize(f.state);update();if($('#dlgFit').open)$('#dlgFit').close();go('creator');flyTo('full');
    toast('Otwarto: '+f.name+(f.author?' · @'+f.author.username:''));this.opened(f.id,f.name,f.owner);
  },

  /* ---------- karty fitów z bazy ---------- */
  card(f,liked){
    const own=Social.uid&&f.owner===Social.uid;
    const card=el('article',{class:'card'}),inn=el('div',{class:'card-in'}),shot=el('div',{class:'shot'});
    if(f.thumb&&/^data:image\//.test(f.thumb)){const i=new Image();i.alt='Fit '+f.name;i.loading='lazy';i.src=f.thumb;shot.append(i);}else shot.append(el('div',{class:'ph'},'Bez podglądu'));
    const open=el('button',{class:'open','aria-label':'Szczegóły: '+f.name});open.addEventListener('click',()=>this.openFit(f.id));shot.append(open);
    if(own&&f.visibility!=='public')shot.append(el('span',{class:'vis'},ico(VIS[f.visibility][1])+esc(VIS[f.visibility][0])));
    const hb=el('button',{class:'heart','aria-pressed':String(!!liked),'aria-label':(liked?'Cofnij polubienie: ':'Polub: ')+f.name},'<svg viewBox="0 0 24 24">'+ICO.heart+'</svg>');
    const cnt=txt('span',{class:'cnt'},f.likes_count||'');if(!f.likes_count)cnt.hidden=true;hb.append(cnt);
    hb.addEventListener('click',()=>this.toggleLike(f,hb,cnt));shot.append(hb);
    const meta=el('div',{class:'meta'});meta.append(txt('strong',{},f.name));
    if(f.author){const by=el('button',{class:'byline'});by.append(avaEl(f.author),txt('span',{},'@'+f.author.username));by.addEventListener('click',()=>this.showProfile(f.author.username));meta.append(by);}
    meta.append(txt('small',{},[(f.tags||[]).slice(0,3).map(cap1).join(', '),relTime(f.created_at)].filter(Boolean).join(' · ')));
    const cta=el('div',{class:'cta'});const o=el('button',{class:'dark'},'Otwórz w kreatorze');o.addEventListener('click',()=>this.openInCreator(f.id));
    const det=el('button',{},f.comments_count?'Komentarze ('+f.comments_count+')':'Szczegóły');det.addEventListener('click',()=>this.openFit(f.id));cta.append(o,det);meta.append(cta);
    inn.append(shot,meta);card.append(inn);reveal(card);return card;
  },
  async toggleLike(f,btn,cnt){
    if(!Social.user){this.needLogin('Zaloguj się, żeby polubić ten fit.');return;}
    const on=btn.getAttribute('aria-pressed')!=='true';btn.setAttribute('aria-pressed',String(on));
    f.likes_count=Math.max(0,(f.likes_count||0)+(on?1:-1));if(cnt){cnt.textContent=f.likes_count||'';cnt.hidden=!f.likes_count;}
    try{await Social.like(f.id,on);}catch(e){btn.setAttribute('aria-pressed',String(!on));f.likes_count=Math.max(0,f.likes_count+(on?-1:1));if(cnt){cnt.textContent=f.likes_count||'';cnt.hidden=!f.likes_count;}toast(e.message);}
  },
  async fillGrid(grid,list,{append=false}={}){
    if(!append)grid.innerHTML='';const liked=await Social.likedIds(list.map(f=>f.id)).catch(()=>new Set());
    list.forEach((f,i)=>{const c=this.card(f,liked.has(f.id));if(grid.classList.contains('masonry'))c.classList.add(['tall','','short','','tall','short'][i%6]||'x');grid.append(c);});
  },

  /* ---------- Społeczność: zakładki ---------- */
  renderExplore(){
    const head=$('#exHead'),tabs=$('#exTabs');head.hidden=!Social.on;
    if(Social.on){tabs.innerHTML='';for(const[k,l] of [['inspo','Polecane'],['latest','Najnowsze'],['popular','Popularne'],['following','Obserwowani']]){
      const b=el('button',{'aria-pressed':String(k===this.exTab)});b.textContent=l;b.addEventListener('click',()=>{if(this.exTab===k)return;this.exTab=k;renderExplore();});tabs.append(b);}}
    const inspo=!Social.on||this.exTab==='inspo';
    $('#fStyle').hidden=!inspo;$('#fSeason').hidden=!inspo;$('#exPeople').hidden=true;$('#exMore').hidden=true;
    $('#q').placeholder=inspo?'Szukaj: baggy, trencz, dredy, old money…':'Szukaj fitów i osób: nazwa, styl, @nazwa…';
    $('#exLead').textContent=inspo?(Social.on?'Stylizacje przygotowane przez nas. Otwórz cały fit w kreatorze albo weź z niego jedną rzecz. Fity innych osób znajdziesz w „Najnowsze” i „Popularne”.':'Fity do podglądania: otwórz cały w kreatorze albo weź z niego jedną rzecz.')
      :{latest:'Najnowsze fity opublikowane przez społeczność.',popular:'Fity z największą liczbą polubień.',following:'Nowe fity osób, które obserwujesz.'}[this.exTab];
    if(inspo)return false;
    this.loadExplore(false);return true;
  },
  async loadExplore(more){
    const grid=$('#exploreGrid'),q=($('#q').value||'').trim(),seq=++this.exSeq,mode=this.exTab,moreB=$('#exMore');
    if(!more){grid.innerHTML='';grid.append(el('p',{class:'empty'},'Wczytuję…'));this.exOff=0;this.exBefore=null;}
    if(mode==='following'&&!Social.user){grid.innerHTML='';const n=el('div',{class:'notice'});n.append(txt('p',{},'Zaloguj się, żeby zobaczyć nowe fity osób, które obserwujesz.'));
      const b=el('button',{class:'pill ink'},'Zaloguj się');b.addEventListener('click',()=>this.auth('login'));n.append(b);grid.append(n);return;}
    const ppl=$('#exPeople');
    if(!more&&q.replace(/^@/,'').length>=2){Social.searchProfiles(q.replace(/^@/,'')).then(list=>{if(seq!==this.exSeq)return;ppl.innerHTML='';ppl.hidden=!list.length;
      for(const p of list){const b=el('button',{class:'person'});b.append(avaEl(p));const t=el('span',{});t.append(txt('b',{},pname(p)),txt('small',{},'@'+p.username+(p.is_private?' · prywatne':'')));b.append(t);b.addEventListener('click',()=>this.showProfile(p.username));ppl.append(b);}}).catch(()=>{});}
    try{
      const list=await Social.listFits({mode,q:q.replace(/^@/,''),before:this.exBefore,offset:this.exOff});
      if(seq!==this.exSeq)return;
      if(!more)grid.innerHTML='';
      if(!list.length&&!more){grid.append(el('p',{class:'empty'},q?'Nic nie pasuje do wyszukiwania.':mode==='following'?'Osoby, które obserwujesz, nie opublikowały jeszcze fitów. Znajdź kogoś w „Najnowsze”.':mode==='popular'?'Jeszcze nic nie zebrało polubień. Zajrzyj do „Najnowsze”.':'Jeszcze nikt nie opublikował fitu. Bądź pierwszy: ułóż outfit i zapisz go jako publiczny.'));moreB.hidden=true;return;}
      await this.fillGrid(grid,list,{append:true});
      this.exOff+=list.length;if(list.length)this.exBefore=list[list.length-1].created_at;
      moreB.innerHTML='';moreB.hidden=list.length<PAGE_N;const mb=el('button',{class:'pill'},'Pokaż więcej');mb.addEventListener('click',()=>act(()=>this.loadExplore(true),mb));moreB.append(mb);
    }catch(e){if(seq!==this.exSeq)return;grid.innerHTML='';grid.append(txt('p',{class:'empty'},e.message));}
  },

  /* ---------- Zachowane ---------- */
  renderMine(){
    const tabs=$('#mineTabs'),g=$('#mineGrid'),note=$('#mineNote');note.innerHTML='';g.innerHTML='';
    const user=!!Social.user,V=user?[['cloud','Na koncie'],['liked','Polubione'],['device','Na tym urządzeniu'],['history','Ostatnio oglądane']]:[['saved','Zapisane'],['liked','Polubione'],['history','Ostatnio oglądane']];
    if(!V.some(v=>v[0]===this.mineView))this.mineView=V[0][0];
    tabs.innerHTML='';for(const[k,l] of V){const b=el('button',{'aria-pressed':String(k===this.mineView)});b.textContent=l+(k==='device'||k==='saved'?' ('+load(KEY).length+')':'');b.addEventListener('click',()=>{this.mineView=k;renderMine();});tabs.append(b);}
    $('#mineLead').textContent=user?'Twoje fity na koncie są dostępne na każdym urządzeniu, na którym się zalogujesz.':'Twoje zapisane fity i te polubione w Społeczności. Bez konta zapisują się tylko na tym urządzeniu.';
    const v=this.mineView;
    if(v==='saved'||v==='device'){
      const list=load(KEY).slice().reverse();
      if(user&&list.length){const n=el('div',{class:'notice'});n.append(txt('p',{},'Te fity są tylko na tym urządzeniu. Przenieś je na konto, żeby mieć je wszędzie.'));const b=el('button',{class:'pill ink'},'Przenieś na konto');b.addEventListener('click',()=>this.moveLocal());n.append(b);note.append(n);}
      if(!list.length)g.append(el('p',{class:'empty'},'Nie masz fitów zapisanych na tym urządzeniu. Ułóż outfit w kreatorze i kliknij „Zapisz fit”.'));
      list.forEach(it=>g.append(fitCard({id:it.id,name:it.name,state:sanitize(it.state),thumb:it.thumb},{remove:true})));
      if(!user&&Social.on&&list.length){const n=el('div',{class:'notice'});n.append(txt('p',{},'Załóż konto, żeby publikować fity i mieć je na każdym urządzeniu.'));const b=el('button',{class:'pill ink'},'Załóż konto');b.addEventListener('click',()=>this.auth('signup'));n.append(b);note.append(n);}
      return true;
    }
    if(v==='cloud'){g.append(el('p',{class:'empty'},'Wczytuję…'));
      Social.listFits({owner:Social.uid}).then(async list=>{if(this.mineView!=='cloud'||page!=='mine')return;g.innerHTML='';
        if(!list.length){g.append(el('p',{class:'empty'},'Nie masz jeszcze fitów na koncie. Ułóż outfit i kliknij „Zapisz fit”.'));return;}
        await this.fillGrid(g,list);
        if(list.length>=PAGE_N){const m=el('div',{class:'more',style:'grid-column:1/-1'}),b=el('button',{class:'pill'},'Zobacz wszystkie na profilu');b.addEventListener('click',()=>this.showProfile(Social.profile.username));m.append(b);g.append(m);}
      }).catch(e=>{g.innerHTML='';g.append(txt('p',{class:'empty'},e.message));});return true;}
    if(v==='liked'){
      const L=load(LIKES),ins=INSPO.filter(f=>L.includes(f.id));
      const addInspo=()=>{ins.forEach(f=>g.append(fitCard(f,{like:true,take:true})));queueThumbs();};
      if(!user){if(!ins.length)g.append(el('p',{class:'empty'},'Nie masz polubionych fitów. Serduszkiem w Społeczności dodasz je tutaj.'));addInspo();return true;}
      g.append(el('p',{class:'empty'},'Wczytuję…'));
      Social.likedFits().then(async list=>{if(this.mineView!=='liked'||page!=='mine')return;g.innerHTML='';
        if(!list.length&&!ins.length){g.append(el('p',{class:'empty'},'Nie masz polubionych fitów. Serduszkiem w Społeczności dodasz je tutaj.'));return;}
        await this.fillGrid(g,list);addInspo();}).catch(e=>{g.innerHTML='';g.append(txt('p',{class:'empty'},e.message));});return true;
    }
    if(v==='history'){
      const show=async rows=>{if(this.mineView!=='history'||page!=='mine')return;g.innerHTML='';
        if(!rows.length){g.append(el('p',{class:'empty'},'Tu pojawią się fity, które otworzysz w kreatorze.'));return;}
        const ids=rows.filter(r=>!r.ref.startsWith('inspo:')).map(r=>r.ref),fits=user&&ids.length?await Social.fitsByIds(ids):[],byId=new Map(fits.map(f=>[f.id,f]));
        const liked=user?await Social.likedIds(fits.map(f=>f.id)).catch(()=>new Set()):new Set();
        for(const r of rows){if(r.ref.startsWith('inspo:')){const f=INSPO.find(x=>x.id===r.ref.slice(6));if(f)g.append(fitCard(f,{like:true,take:true}));}else if(byId.has(r.ref))g.append(this.card(byId.get(r.ref),liked.has(r.ref)));}
        queueThumbs();
        if(!g.children.length)g.append(el('p',{class:'empty'},'Fity z historii zostały usunięte albo nie są już widoczne.'));
        const n=el('div',{class:'notice'});n.append(txt('p',{},user?'Historię możesz wyłączyć w Ustawienia konta → Prywatność.':'Historia gościa jest zapisywana tylko na tym urządzeniu.'));
        const b=el('button',{class:'pill'},'Wyczyść historię');b.addEventListener('click',()=>act(async()=>{if(user)await Social.clearHistory();else try{localStorage.removeItem('fitme.history');}catch(e){}toast('Wyczyszczono historię');renderMine();},b));n.append(b);note.append(n);};
      if(user){g.append(el('p',{class:'empty'},'Wczytuję…'));Social.history().then(show).catch(e=>{g.innerHTML='';g.append(txt('p',{class:'empty'},e.message));});}
      else if(!prefsAllowed()){const n=el('div',{class:'notice'});n.append(txt('p',{},'Bez konta historię oglądania zapisujemy tylko za zgodą na preferencje.'));const b=el('button',{class:'pill ink'},'Ustawienia prywatności');b.addEventListener('click',()=>Consent.settings());n.append(b);note.append(n);}
      else{let h=[];try{h=JSON.parse(localStorage.getItem('fitme.history')||'[]');}catch(e){}show(Array.isArray(h)?h.filter(x=>x&&typeof x.ref==='string'):[]);}
      return true;
    }
    return true;
  },

  /* ---------- szczegóły fitu ---------- */
  async openFit(id){
    if(!Social.on)return;const d=$('#dlgFit'),b=$('#fitBody');
    b.innerHTML='<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--muted)">Wczytuję…</div>';if(!d.open)d.showModal();setHash('#f/'+id);
    let f;try{f=await Social.getFit(id);}catch(e){b.innerHTML='';b.append(txt('p',{style:'grid-column:1/-1;padding:40px;text-align:center'},e.message));return;}
    if(!f){b.innerHTML='';const p=el('div',{style:'grid-column:1/-1;padding:36px;text-align:center'});p.append(txt('p',{},'Ten fit nie istnieje albo nie masz do niego dostępu.'));const c=el('button',{class:'pill'},'Zamknij');c.addEventListener('click',()=>d.close());p.append(c);b.append(p);return;}
    const own=f.owner===Social.uid,au=f.author||{username:'?'};
    const[liked,coms,rel]=await Promise.all([Social.likedIds([f.id]).catch(()=>new Set()),Social.comments(f.id).catch(()=>[]),Social.user&&!own?Social.relation(f.owner).catch(()=>null):null]);
    b.innerHTML='';
    const shot=el('div',{class:'fd-shot'});if(f.thumb){const i=new Image();i.alt='Fit '+f.name;i.src=f.thumb;shot.append(i);}
    const side=el('div',{class:'fd-side'}),top=el('div',{class:'fd-top'});
    const ah=el('div',{class:'fd-author'}),who=el('button',{class:'who'});who.append(avaEl(au));const wt=el('span',{});wt.append(txt('b',{},pname(au)),txt('small',{},'@'+au.username));who.append(wt);
    who.addEventListener('click',()=>{d.close();this.showProfile(au.username);});ah.append(who);
    if(Social.user&&!own&&rel)ah.append(this.followBtn(f.owner,au,rel,()=>{}));
    const x=el('button',{class:'fd-x','aria-label':'Zamknij'},'×');x.addEventListener('click',()=>d.close());ah.append(x);top.append(ah);
    top.append(txt('h3',{class:'fd-name'},f.name));if(f.description)top.append(txt('p',{class:'fd-desc'},f.description));
    const metaBits=[(f.tags||[]).map(cap1).join(', '),relTime(f.created_at)];if(own)metaBits.push(VIS[f.visibility][0]);
    top.append(txt('div',{class:'fd-meta'},metaBits.filter(Boolean).join(' · ')));
    if(f.remix_of){const r=el('button',{class:'txtbtn',style:'padding:0;align-self:flex-start;font-size:12.5px'},'Inspirowany innym fitem →');r.addEventListener('click',()=>this.openFit(f.remix_of));top.append(r);}
    const acts=el('div',{class:'fd-acts'});
    const lk=el('button',{class:'pill','aria-pressed':String(liked.has(f.id)),'aria-label':'Polub'},'<svg viewBox="0 0 24 24">'+ICO.heart+'</svg><span>'+(f.likes_count||0)+'</span>');
    lk.addEventListener('click',()=>this.toggleLike(f,lk,null).then(()=>{lk.querySelector('span').textContent=f.likes_count||0;}));
    const op=el('button',{class:'pill ink'},'Otwórz w kreatorze');op.addEventListener('click',()=>this.openInCreator(f.id));
    const sh=el('button',{class:'pill','aria-label':'Kopiuj link'},'<svg viewBox="0 0 24 24">'+ICO.link+'</svg>Link');sh.addEventListener('click',()=>copyText(siteLink('#f/'+f.id),'Skopiowano link do fitu'));
    const more=el('button',{class:'pill','aria-label':'Więcej','data-pop':''},'<svg viewBox="0 0 24 24">'+ICO.dots+'</svg>');
    more.addEventListener('click',()=>showPop(more,inn=>{
      inn.append(popItem('Kopiuj kod FIT',()=>copyText(encode(sanitize(f.state)),'Skopiowano kod fitu')));
      for(const[k,l] of PIECES)if(!((k==='outer'||k==='mid')&&(!f.state[k]||f.state[k].type==='none')))inn.append(popItem('Weź '+l.toLowerCase(),()=>{S[k]=clone(sanitize(f.state)[k]);S=sanitize(S);update();d.close();go('creator');toast('Dodano '+l.toLowerCase()+' z fitu „'+f.name+'”');}));
      if(own){inn.append(popItem('Edytuj nazwę, opis, widoczność',()=>this.editFit(f)),popItem('Usuń fit',()=>this.deleteFit(f),'danger'));}
      else{inn.append(popItem('Zgłoś fit',()=>this.report('fit',f.id,'fit „'+f.name+'”')));if(Social.user)inn.append(popItem('Zablokuj @'+au.username,()=>this.block(au),'danger'));}
    }));
    acts.append(op,lk,sh,more);top.append(acts);
    const list=el('div',{class:'fd-com','aria-label':'Komentarze'});
    const drawCom=c=>{const r=el('div',{class:'com'}),a=avaEl(c.author);a.addEventListener('click',()=>{d.close();this.showProfile(c.author.username);});const bd=el('div',{class:'body'});
      const meta=el('small',{});meta.append(txt('b',{style:'color:var(--text)'},'@'+(c.author?c.author.username:'?')),document.createTextNode(' · '+relTime(c.created_at)));
      if(Social.user&&(c.user_id===Social.uid||own)){const del=el('button',{},'Usuń');del.addEventListener('click',()=>act(async()=>{await Social.deleteComment(c.id);r.remove();f.comments_count=Math.max(0,f.comments_count-1);},del));meta.append(del);}
      if(c.user_id!==Social.uid){const rp=el('button',{},'Zgłoś');rp.addEventListener('click',()=>this.report('comment',c.id,'komentarz @'+(c.author?c.author.username:'')));meta.append(rp);}
      bd.append(meta,txt('p',{},c.body));r.append(a,bd);return r;};
    if(!coms.length)list.append(txt('p',{class:'muted',style:'margin:0;font-size:13px'},'Nie ma jeszcze komentarzy.'));coms.forEach(c=>list.append(drawCom(c)));
    side.append(top,list);
    const mode=au.comments||'all',canCom=Social.user&&(own||mode==='all'||(mode==='followers'&&rel&&rel.following==='accepted'));
    if(canCom){const fm=el('form',{class:'fd-form'}),ta=el('textarea',{maxlength:'500',placeholder:'Dodaj komentarz…','aria-label':'Komentarz',required:''}),sb=el('button',{class:'pill ink',type:'submit'},'Wyślij');
      ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();fm.requestSubmit();}});
      fm.addEventListener('submit',e=>{e.preventDefault();const v=ta.value.trim();if(!v)return;act(async()=>{const c=await Social.addComment(f.id,v);ta.value='';const em=list.querySelector('p.muted');if(em)em.remove();list.append(drawCom(c));list.scrollTop=list.scrollHeight;f.comments_count++;},sb);});
      fm.append(ta,sb);side.append(fm);}
    else{const off=el('div',{class:'fd-off'});if(!Social.user){off.append(document.createTextNode('Zaloguj się, żeby komentować. '));const l=el('button',{class:'txtbtn',style:'padding:0'},'Zaloguj się');l.addEventListener('click',()=>this.auth('login'));off.append(l);}
      else off.textContent=mode==='none'?'Autor wyłączył komentarze.':'Komentować mogą tylko osoby obserwujące autora.';side.append(off);}
    b.append(shot,side);
  },
  editFit(f){
    const body=el('div',{style:'display:flex;flex-direction:column;gap:12px'});
    const nm=el('input',{type:'text',maxlength:'40',value:f.name}),ds=el('textarea',{maxlength:'300',rows:'3',style:'font-family:inherit;height:auto'});ds.value=f.description||'';
    let vis=f.visibility;const vc=chips(Object.entries(VIS).map(([k,v])=>[k,v[0]]),vis,v=>{vis=v;vc.querySelectorAll('.chip').forEach((c,i)=>c.setAttribute('aria-pressed',String(Object.keys(VIS)[i]===v)));},'Widoczność');
    const vf=el('div',{class:'fld'});vf.append(txt('span',{},'Widoczność'),vc);
    body.append(field('Nazwa',nm),field('Opis',ds,'do 300 znaków'),vf);
    ask({title:'Edytuj fit',body,ok:'Zapisz',onOk:async()=>{const n=nm.value.trim();if(!n)throw new Error('Podaj nazwę.');
      Object.assign(f,await Social.updateFit(f.id,{name:n,description:ds.value.trim(),visibility:vis}));toast('Zapisano zmiany');this.openFit(f.id);this.refreshLists();}});
  },
  deleteFit(f){ask({title:'Usunąć fit?',text:'„'+f.name+'” zniknie z Twojego profilu razem z polubieniami i komentarzami. Tego nie da się cofnąć.',ok:'Usuń',danger:true,
    onOk:async()=>{await Social.deleteFit(f.id);$('#dlgFit').close();toast('Usunięto: '+f.name);this.refreshCount();this.refreshLists();}});},
  refreshLists(){if(page==='explore')renderExplore();if(page==='mine')renderMine();if(page==='profile'&&this.viewing)this.showProfile(this.viewing);},

  /* ---------- obserwowanie, blokowanie, zgłoszenia ---------- */
  followBtn(id,p,rel,after){
    const b=el('button',{class:'pill'});
    const draw=()=>{const s=rel.following;b.className='pill'+(s==='none'?' ink':'');b.textContent=rel.blocked?'Odblokuj':s==='accepted'?'Obserwujesz':s==='pending'?'Wysłano prośbę':rel.followsMe?'Obserwuj również':'Obserwuj';};
    draw();
    b.addEventListener('click',()=>{
      if(!Social.user){this.needLogin('Zaloguj się, żeby obserwować @'+p.username+'.');return;}
      if(rel.blocked){act(async()=>{await Social.unblock(id);rel.blocked=false;draw();toast('Odblokowano @'+p.username);after&&after();},b);return;}
      if(rel.following==='none'){act(async()=>{rel.following=await Social.follow(id);draw();toast(rel.following==='pending'?'Wysłano prośbę o obserwowanie':'Obserwujesz @'+p.username);after&&after();},b);return;}
      const pend=rel.following==='pending';
      ask({title:pend?'Wycofać prośbę?':'Przestać obserwować?',text:pend?'Prośba do @'+p.username+' zostanie wycofana.':'Fity @'+p.username+' przestaną pojawiać się w „Obserwowani”.'+(p.is_private?' To konto jest prywatne: żeby znów je obserwować, trzeba będzie wysłać prośbę.':''),
        ok:pend?'Wycofaj':'Przestań obserwować',onOk:async()=>{await Social.unfollow(id);rel.following='none';draw();after&&after();}});
    });
    return b;
  },
  block(p){ask({title:'Zablokować @'+p.username+'?',text:'Ta osoba nie zobaczy Twojego profilu, fitów ani komentarzy i nie będzie mogła Cię obserwować. Obserwowanie zostanie zerwane w obie strony. Nie powiadomimy jej o tym. Odblokujesz ją w ustawieniach prywatności.',
    ok:'Zablokuj',danger:true,onOk:async()=>{await Social.block(p.id);toast('Zablokowano @'+p.username);if($('#dlgFit').open)$('#dlgFit').close();this.refreshLists();}});},
  report(type,id,label){
    const d=$('#dlgReport'),b=$('#repBody');b.innerHTML='';
    b.append(el('h3',{id:'repTitle'},'Zgłoś '+esc(label)));
    b.append(txt('p',{},'Zgłoszenie trafi do moderacji. Rozpatrzymy je bez zbędnej zwłoki i damy znać o decyzji. Osoba, której dotyczy zgłoszenie, nie zobaczy, kto je wysłał.'));
    const form=el('form',{novalidate:''}),rad=el('div',{class:'radio',role:'radiogroup','aria-label':'Powód'});
    for(const[k,l] of Object.entries(REASONS)){const lb=el('label',{});lb.append(el('input',{type:'radio',name:'rr',value:k}),txt('span',{},l));rad.append(lb);}
    const det=el('textarea',{maxlength:'1000',rows:'3',placeholder:'Wyjaśnij krótko, co jest nie tak (przy treściach nielegalnych: dlaczego uważasz je za nielegalne)',style:'font-family:inherit;height:auto'});
    const em=el('input',{type:'email',maxlength:'120',autocomplete:'email',placeholder:'ty@example.com'});
    const gf=el('input',{type:'checkbox'}),gl=el('label',{class:'chk'});gl.append(gf,txt('span',{},'Oświadczam, że informacje w zgłoszeniu są prawdziwe i zgłaszam w dobrej wierze.'));
    const err=el('div',{class:'err',role:'alert'}),row=el('div',{class:'drow'}),c=el('button',{class:'pill',type:'button'},'Anuluj'),s=el('button',{class:'pill ink',type:'submit',style:'padding:9px 18px'},'Wyślij zgłoszenie');
    c.addEventListener('click',()=>d.close());row.append(c,s);
    form.append(field('Powód',rad),field('Szczegóły',det,'opcjonalnie'));if(!Social.user)form.append(field('Twój e-mail do odpowiedzi',em));
    form.append(gl,err,row);b.append(form);
    form.addEventListener('submit',async e=>{e.preventDefault();err.textContent='';const r=(form.querySelector('input[name=rr]:checked')||{}).value;
      if(!r){err.textContent='Wybierz powód.';return;}if(!Social.user&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em.value.trim())){err.textContent='Podaj adres e-mail, żebyśmy mogli odpowiedzieć.';return;}
      if(!gf.checked){err.textContent='Potwierdź oświadczenie o dobrej wierze.';return;}
      s.disabled=true;try{await Social.report({type,id,reason:r,details:det.value.trim(),email:em.value.trim()});d.close();toast('Dziękujemy. Zgłoszenie zostało wysłane.');}catch(x){err.textContent=x.message;}finally{s.disabled=false;}});
    d.showModal();
  },
  async people(title,loader,opts={}){
    const d=$('#dlgList'),b=$('#listBody');b.innerHTML='';b.append(txt('h3',{},title));const l=el('div',{class:'plist'});l.append(txt('p',{class:'muted'},'Wczytuję…'));b.append(l);
    const row=el('div',{class:'drow'}),c=el('button',{class:'pill'},'Zamknij');c.addEventListener('click',()=>d.close());row.append(c);b.append(row);d.showModal();
    try{const list=await loader();l.innerHTML='';if(!list.length)l.append(txt('p',{class:'muted',style:'padding:8px'},opts.empty||'Pusto.'));
      for(const p of list){const r=el('div',{class:'prow'}),w=el('button',{class:'who'});w.append(avaEl(p));const t=el('span',{});t.append(txt('b',{},pname(p)),txt('small',{},'@'+p.username));w.append(t);
        w.addEventListener('click',()=>{d.close();this.showProfile(p.username);});r.append(w);
        if(opts.action){const[label,fn]=opts.action;const a=el('button',{class:'pill'});a.textContent=label;a.addEventListener('click',()=>act(async()=>{await fn(p);r.remove();},a));r.append(a);}l.append(r);}}
    catch(e){l.innerHTML='';l.append(txt('p',{class:'err'},e.message));}
  },

  /* ---------- profil ---------- */
  async showProfile(username){
    if(!Social.on)return;username=String(username).toLowerCase();this.viewing=username;
    go('profile',true);setHash('#u/'+username);
    const w=$('#profWrap');w.innerHTML='';w.append(el('p',{class:'empty'},'Wczytuję…'));
    let p;try{p=await Social.profileBy('username',username);}catch(e){w.innerHTML='';w.append(txt('p',{class:'empty'},e.message));return;}
    if(this.viewing!==username)return;w.innerHTML='';
    if(!p){const n=el('div',{class:'lockbox'});n.append(txt('b',{},'Nie ma takiego profilu'),txt('p',{},'Konto @'+username+' nie istnieje albo nie jest dostępne.'));w.append(n);return;}
    const me=p.id===Social.uid,rel=Social.user&&!me?await Social.relation(p.id).catch(()=>({following:'none',followsMe:false,blocked:false})):{following:'none',followsMe:false,blocked:false};
    document.title='Fitme – @'+p.username;
    const can=me||(!rel.blocked&&(!p.is_private||rel.following==='accepted'));
    const h=el('section',{class:'prof'});h.append(avaEl(p));const info=el('div',{});
    info.append(txt('h1',{},pname(p)));
    const hd=el('p',{class:'handle'});hd.append(document.createTextNode('@'+p.username));if(p.is_private)hd.append(el('span',{title:'Konto prywatne'},ico('lock')+' prywatne'));
    if(rel.followsMe)hd.append(el('span',{class:'chip',style:'padding:2px 8px;font-size:11.5px'},'Obserwuje Cię'));info.append(hd);
    if(p.bio)info.append(txt('p',{class:'bio'},p.bio));
    if(p.website&&/^https?:\/\//i.test(p.website)){const a=el('a',{class:'site',href:p.website,target:'_blank',rel:'noopener nofollow ugc'});a.textContent=p.website.replace(/^https?:\/\//i,'').replace(/\/$/,'');info.append(a);}
    const st=el('div',{class:'stats'});
    const stat=(n,lab,fn)=>{const b=el('button',{});b.append(txt('b',{},n),document.createTextNode(lab));if(fn&&can)b.addEventListener('click',fn);else b.disabled=true;return b;};
    st.append(stat(p.fits_count,plural(p.fits_count,'fit','fity','fitów')),
      stat(p.followers_count,plural(p.followers_count,'obserwujący','obserwujących','obserwujących'),()=>this.people('Obserwujący @'+p.username,()=>Social.followers(p.id),{empty:'Nikt jeszcze nie obserwuje.',action:me?['Usuń',x=>Social.removeFollower(x.id).then(()=>toast('Usunięto z obserwujących'))]:null})),
      stat(p.following_count,plural(p.following_count,'obserwowany','obserwowanych','obserwowanych'),()=>this.people('Obserwowani przez @'+p.username,()=>Social.following(p.id),{empty:'Nikogo jeszcze nie obserwuje.',action:me?['Przestań obserwować',x=>Social.unfollow(x.id)]:null})));
    info.append(st);
    const pa=el('div',{class:'pacts'});
    if(me){const e=el('button',{class:'pill ink'},'Edytuj profil');e.addEventListener('click',()=>this.showAccount('profile'));const s=el('button',{class:'pill'},'Ustawienia i prywatność');s.addEventListener('click',()=>this.showAccount('privacy'));pa.append(e,s);}
    else pa.append(this.followBtn(p.id,p,rel,()=>this.showProfile(username)));
    const more=el('button',{class:'pill','aria-label':'Więcej','data-pop':''},'<svg viewBox="0 0 24 24" class="ic12" style="width:16px;height:16px">'+ICO.dots+'</svg>');
    more.addEventListener('click',()=>showPop(more,inn=>{
      inn.append(popItem('Kopiuj link do profilu',()=>copyText(siteLink('#u/'+p.username),'Skopiowano link do profilu')));
      if(!me){if(Social.user&&rel.followsMe)inn.append(popItem('Usuń z obserwujących',()=>ask({title:'Usunąć z obserwujących?',text:'@'+p.username+' przestanie Cię obserwować. Nie powiadomimy tej osoby.',ok:'Usuń',onOk:async()=>{await Social.removeFollower(p.id);this.showProfile(username);}})));
        inn.append(popItem('Zgłoś profil',()=>this.report('profile',p.id,'profil @'+p.username)));
        if(Social.user)inn.append(rel.blocked?popItem('Odblokuj',()=>act(async()=>{await Social.unblock(p.id);toast('Odblokowano');this.showProfile(username);})):popItem('Zablokuj',()=>this.block(p),'danger'));}
    }));pa.append(more);info.append(pa);h.append(info);w.append(h);
    if(!can){const n=el('div',{class:'lockbox'});n.innerHTML=ico('lock','');n.append(txt('b',{},rel.blocked?'Zablokowano to konto':'To konto jest prywatne'),txt('p',{},rel.blocked?'Odblokuj, żeby znów widzieć fity.':'Obserwuj, żeby zobaczyć fity @'+p.username+'.'));w.append(n);return;}
    let tab='fits';const seg=el('div',{class:'seg',role:'group','aria-label':'Widok profilu'}),g=el('div',{class:'grid'}),moreW=el('div',{class:'more',hidden:''});
    const tabsDef=me?[['fits','Fity'],['liked','Polubione']]:[['fits','Fity']];
    const load2=async(append)=>{if(!append){g.innerHTML='';g.append(el('p',{class:'empty'},'Wczytuję…'));}
      try{const list=tab==='liked'?await Social.likedFits():await Social.listFits({owner:p.id,before:append?this._pBefore:null});
        if(!append)g.innerHTML='';if(!list.length&&!append)g.append(el('p',{class:'empty'},tab==='liked'?'Nie masz jeszcze polubionych fitów.':me?'Nie masz jeszcze fitów. Ułóż outfit i kliknij „Zapisz fit”.':'@'+p.username+' nie ma jeszcze widocznych fitów.'));
        await this.fillGrid(g,list,{append:true});this._pBefore=list.length?list[list.length-1].created_at:null;
        moreW.hidden=tab==='liked'||list.length<PAGE_N;moreW.innerHTML='';const mb=el('button',{class:'pill'},'Pokaż więcej');mb.addEventListener('click',()=>act(()=>load2(true),mb));moreW.append(mb);}
      catch(e){g.innerHTML='';g.append(txt('p',{class:'empty'},e.message));}};
    for(const[k,l] of tabsDef){const b=el('button',{'aria-pressed':String(k===tab)});b.textContent=l;b.addEventListener('click',()=>{tab=k;seg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));load2(false);});seg.append(b);}
    w.append(seg,g,moreW);load2(false);
  },

  /* ---------- powiadomienia ---------- */
  async showNotifications(anchor){
    const p=showPop(anchor,inn=>{const h=el('div',{class:'nhead'});h.append(txt('b',{},'Powiadomienia'));inn.append(h,txt('div',{class:'nempty'},'Wczytuję…'));},'npop'),inn=p.querySelector('.pop-in');
    let list;try{list=await Social.notifications();}catch(e){inn.lastChild.textContent=e.message;return;}
    if(popEl!==p)return;inn.lastChild.remove();
    if(!list.length){inn.append(txt('div',{class:'nempty'},'Nic nowego. Gdy ktoś zacznie Cię obserwować, polubi lub skomentuje Twój fit, zobaczysz to tutaj.'));}
    const TXT={follow:'zaczyna Cię obserwować',follow_request:'prosi o możliwość obserwowania Cię',follow_accept:'akceptuje Twoją prośbę o obserwowanie',like:'polubił(a) Twój fit',comment:'skomentował(a) Twój fit'};
    for(const n of list){const a=n.actor||{username:'?'},it=el('div',{class:'nitem'+(n.read_at?'':' unread'),role:'button',tabindex:'0'});it.append(avaEl(a));
      const t=el('div',{class:'tx2'});t.append(txt('b',{},'@'+a.username),document.createTextNode(' '+(TXT[n.kind]||'')+(n.fit&&(n.kind==='like'||n.kind==='comment')?' „'+n.fit.name+'”':'')));
      if(n.kind==='comment'&&n.comment)t.append(document.createTextNode(': '),txt('q',{},n.comment.body.slice(0,120)));
      t.append(txt('small',{},relTime(n.created_at)));
      if(n.kind==='follow_request'){const ac=el('div',{class:'acts'}),y=el('button',{class:'pill ink'},'Zatwierdź'),no=el('button',{class:'pill'},'Usuń');
        y.addEventListener('click',e=>{e.stopPropagation();act(async()=>{await Social.accept(a.id);ac.replaceWith(txt('small',{},'Zatwierdzono'));},y);});
        no.addEventListener('click',e=>{e.stopPropagation();act(async()=>{await Social.removeFollower(a.id);ac.replaceWith(txt('small',{},'Usunięto prośbę'));},no);});ac.append(y,no);t.append(ac);}
      it.append(t);if(n.fit&&n.fit.thumb){const i=new Image();i.alt='';i.src=n.fit.thumb;it.append(i);}
      const goTo=()=>{closePop();if(n.fit_id&&n.fit)this.openFit(n.fit_id);else this.showProfile(a.username);};
      it.addEventListener('click',goTo);it.addEventListener('keydown',e=>{if(e.key==='Enter')goTo();});inn.append(it);}
    if(list.some(n=>!n.read_at)){Social.markRead().then(()=>{this.unread=0;const bg=$('#hdrBell .badge');if(bg)bg.remove();}).catch(()=>{});}
  },

  /* ---------- ustawienia konta ---------- */
  showAccount(sec){
    if(!Social.user){this.needLogin('Zaloguj się, żeby zmienić ustawienia konta.');return;}
    this.accSec=sec||this.accSec||'profile';if(page!=='account')go('account');
    const w=$('#acctWrap');w.innerHTML='';w.append(el('header',{class:'hero'},'<h1>Konto</h1><p>Profil, prywatność, bezpieczeństwo i Twoje dane.</p>'));
    const S2=[['profile','Profil'],['privacy','Prywatność'],['activity','Aktywność'],['app','Ustawienia aplikacji'],['security','Bezpieczeństwo'],['data','Twoje dane'],['help','Pomoc i dokumenty']];
    const grid=el('div',{class:'acct'}),nav=el('nav',{class:'anav','aria-label':'Sekcje konta'}),box=el('div',{});
    for(const[k,l] of S2){const b=el('button',{'aria-current':String(k===this.accSec)});b.textContent=l;b.addEventListener('click',()=>this.showAccount(k));nav.append(b);}
    grid.append(nav,box);w.append(grid);
    const sec2=el('section',{class:'asec'}),inn=el('div',{class:'asec-in'});sec2.append(inn);box.append(sec2);
    this['acc_'+this.accSec](inn);
  },
  acc_profile(b){
    const p=Social.profile;b.append(txt('h2',{},'Profil'),txt('p',{},'Te informacje są publiczne, także przy koncie prywatnym.'));
    const f=el('form',{class:'aform',novalidate:''});let avatar=p.avatar;
    const av=el('div',{class:'avedit'}),avBox=el('div',{});const drawAv=()=>{avBox.innerHTML='';avBox.append(avaEl(Object.assign({},p,{avatar})));};drawAv();
    const file=el('input',{type:'file',accept:'image/jpeg,image/png,image/webp',class:'sr',id:'avFile'});
    const up=el('label',{class:'pill',for:'avFile',style:'cursor:pointer'},'Zmień zdjęcie'),rm=el('button',{class:'pill',type:'button'},'Usuń');
    file.addEventListener('change',async()=>{try{avatar=await avatarFrom(file.files[0]);drawAv();}catch(e){toast(e.message);}file.value='';});rm.addEventListener('click',()=>{avatar=null;drawAv();});
    const avs=el('div',{style:'display:flex;gap:8px;flex-wrap:wrap'});avs.append(up,rm,file);av.append(avBox,avs);
    const dn=el('input',{type:'text',maxlength:'40',value:p.display_name||''}),un=el('input',{type:'text',maxlength:'24',value:p.username,spellcheck:'false',autocapitalize:'none'});
    const unW=el('div',{class:'uname'});unW.append(un);const unH=el('div',{class:'fhint'});
    const bio=el('textarea',{maxlength:'160',rows:'3'});bio.value=p.bio||'';const bioH=el('div',{class:'fhint'},(p.bio||'').length+'/160');bio.addEventListener('input',()=>bioH.textContent=bio.value.length+'/160');
    const site=el('input',{type:'url',maxlength:'100',value:p.website||'',placeholder:'https://…'});
    let unT=0,unSeq=0;un.addEventListener('input',()=>{const v=un.value.toLowerCase().replace(/\s+/g,'');if(v!==un.value)un.value=v;clearTimeout(unT);if(v===p.username){unH.textContent='';return;}
      const pr=unameProblem(v);unH.className='fhint'+(pr?' bad':'');unH.textContent=pr||'Sprawdzam…';if(pr)return;const s=++unSeq;unT=setTimeout(async()=>{const ok=await Social.usernameAvailable(v).catch(()=>false);if(s!==unSeq)return;unH.className='fhint '+(ok?'ok':'bad');unH.textContent=ok?'@'+v+' jest wolna ✓':'@'+v+' jest zajęta albo zastrzeżona.';},380);});
    const unF=field('Nazwa użytkownika',unW,'zmienia też link do profilu');unF.append(unH);const bioF=field('Opis',bio);bioF.append(bioH);
    const save=el('button',{class:'pill ink',type:'submit',style:'align-self:flex-start;padding:10px 20px'},'Zapisz zmiany'),err=el('div',{class:'err'});
    f.append(av,field('Nazwa wyświetlana',dn),unF,bioF,field('Link',site,'np. Instagram lub strona'),err,save);b.append(f);
    f.addEventListener('submit',async e=>{e.preventDefault();err.textContent='';const u=un.value.trim(),ws=site.value.trim();
      if(u!==p.username){const pr=unameProblem(u);if(pr){err.textContent=pr;return;}}
      if(ws&&!/^https?:\/\/[^\s<>"]+$/i.test(ws)){err.textContent='Link musi zaczynać się od https:// (albo http://).';return;}
      const patch={display_name:dn.value.trim(),bio:bio.value.trim(),website:ws,avatar};if(u!==p.username)patch.username=u;
      save.disabled=true;try{await Social.updateProfile(patch);this.renderHeader();toast('Zapisano profil');this.showAccount('profile');}catch(x){err.textContent=x.message;}finally{save.disabled=false;}});
    const v=el('button',{class:'txtbtn',style:'margin-top:14px'},'Zobacz swój profil →');v.addEventListener('click',()=>this.showProfile(Social.profile.username));b.append(v);
  },
  acc_privacy(b){
    const p=Social.profile,s=Social.settings;b.append(txt('h2',{},'Prywatność'));
    const row=(t,sub,ctl)=>{const r=el('div',{class:'arow'}),x=el('span',{});x.append(document.createTextNode(t));if(sub)x.append(txt('small',{},sub));const c=el('div',{class:'ctl'});c.append(ctl);r.append(x,c);return r;};
    const priv=el('input',{type:'checkbox',class:'switch','aria-label':'Konto prywatne'});priv.checked=p.is_private;
    priv.addEventListener('change',()=>act(async()=>{await Social.updateProfile({is_private:priv.checked});toast(priv.checked?'Konto jest prywatne':'Konto jest publiczne');this.showAccount('privacy');return true;}).then(r=>{if(!r)priv.checked=!priv.checked;}));
    b.append(row('Konto prywatne','Fity widzą tylko zaakceptowane osoby obserwujące. Nazwa, zdjęcie i opis profilu zostają publiczne. Po przełączeniu na publiczne oczekujące prośby zostaną zaakceptowane.',priv));
    const cm=chips([['all','Wszyscy'],['followers','Obserwujący'],['none','Nikt']],p.comments,v=>act(async()=>{await Social.updateProfile({comments:v});toast('Zapisano');this.showAccount('privacy');}),'Kto może komentować');
    b.append(row('Kto może komentować Twoje fity',null,cm));
    const dv=chips(Object.entries(VIS).map(([k,v])=>[k,v[0]]),s.default_visibility,v=>act(async()=>{await Social.saveSettings({default_visibility:v});toast('Zapisano');this.showAccount('privacy');}),'Domyślna widoczność');
    b.append(row('Domyślna widoczność nowych fitów','Możesz ją zmienić przy każdym zapisie.',dv));
    const hs=el('input',{type:'checkbox',class:'switch','aria-label':'Historia oglądania'});hs.checked=s.history_on;
    hs.addEventListener('change',()=>act(async()=>{await Social.saveSettings({history_on:hs.checked});toast(hs.checked?'Historia oglądania włączona':'Historia oglądania wyłączona');return true;}).then(r=>{if(!r)hs.checked=!hs.checked;}));
    b.append(row('Historia oglądania','Zapisuje fity, które otwierasz w kreatorze (widzisz ją tylko Ty, w „Zachowane”).',hs));
    b.append(txt('h4',{},'Prośby o obserwowanie'));const rq=el('div',{class:'alist'});rq.append(txt('p',{class:'muted'},'Wczytuję…'));b.append(rq);
    Social.requests().then(list=>{rq.innerHTML='';if(!list.length)rq.append(txt('p',{class:'muted',style:'margin:4px 0'},p.is_private?'Brak oczekujących próśb.':'Konto jest publiczne: nowe osoby obserwują Cię od razu.'));
      for(const x of list){const it=el('div',{class:'it'});it.append(avaEl(x));const g=el('div',{class:'grow'});g.append(txt('b',{},pname(x)),txt('small',{},'@'+x.username));it.append(g);
        const y=el('button',{class:'pill ink'},'Zatwierdź'),n=el('button',{class:'pill'},'Usuń');y.addEventListener('click',()=>act(async()=>{await Social.accept(x.id);it.remove();toast('Zatwierdzono');},y));
        n.addEventListener('click',()=>act(async()=>{await Social.removeFollower(x.id);it.remove();},n));it.append(y,n);rq.append(it);}}).catch(e=>{rq.innerHTML='';rq.append(txt('p',{class:'err'},e.message));});
    b.append(txt('h4',{},'Zablokowane konta'));const bl=el('div',{class:'alist'});b.append(bl);
    Social.blocked().then(list=>{if(!list.length)bl.append(txt('p',{class:'muted',style:'margin:4px 0'},'Nikogo nie blokujesz.'));
      for(const x of list){const it=el('div',{class:'it'});it.append(avaEl(x));const g=el('div',{class:'grow'});g.append(txt('b',{},pname(x)),txt('small',{},'@'+x.username));it.append(g);
        const u=el('button',{class:'pill'},'Odblokuj');u.addEventListener('click',()=>act(async()=>{await Social.unblock(x.id);it.remove();toast('Odblokowano @'+x.username);},u));it.append(u);bl.append(it);}}).catch(e=>bl.append(txt('p',{class:'err'},e.message)));
  },
  acc_activity(b){
    b.append(txt('h2',{},'Aktywność'),txt('p',{},'Twoje komentarze, zgłoszenia i historia konta. Polubione i ostatnio oglądane fity są w zakładce „Zachowane”.'));
    const sec=(t,loader,draw,empty)=>{b.append(txt('h4',{},t));const l=el('div',{class:'alist'});l.append(txt('p',{class:'muted'},'Wczytuję…'));b.append(l);
      loader().then(rows=>{l.innerHTML='';if(!rows.length)l.append(txt('p',{class:'muted',style:'margin:4px 0'},empty));rows.forEach(r=>l.append(draw(r)));}).catch(e=>{l.innerHTML='';l.append(txt('p',{class:'err'},e.message));});};
    const h=el('button',{class:'pill',style:'margin-top:6px'},'Ostatnio oglądane fity');h.addEventListener('click',()=>{this.mineView='history';go('mine');});b.append(h);
    sec('Twoje komentarze',()=>Social.myComments(),c=>{const it=el('div',{class:'it'}),g=el('div',{class:'grow'});g.append(txt('p',{},c.body),txt('small',{},(c.fit?'pod „'+c.fit.name+'” · ':'')+relTime(c.created_at)));it.append(g);
      if(c.fit){const o=el('button',{class:'pill'},'Pokaż');o.addEventListener('click',()=>this.openFit(c.fit.id));it.append(o);}
      const d=el('button',{class:'pill danger'},'Usuń');d.addEventListener('click',()=>act(async()=>{await Social.deleteComment(c.id);it.remove();},d));it.append(d);return it;},'Nie masz jeszcze komentarzy.');
    const ST={open:'w trakcie',resolved:'rozpatrzone',rejected:'odrzucone'},TT={fit:'fit',comment:'komentarz',profile:'profil'};
    sec('Twoje zgłoszenia',()=>Social.myReports(),r=>{const it=el('div',{class:'it'}),g=el('div',{class:'grow'});g.append(txt('b',{},REASONS[r.reason]+' · '+TT[r.target_type]),txt('small',{},'Status: '+ST[r.status]+' · '+relTime(r.created_at)+(r.resolution?' · '+r.resolution:'')));it.append(g);return it;},'Nie wysłano żadnych zgłoszeń.');
    const EV={created:'Założenie konta',sign_in:'Logowanie',email_changed:'Zmiana adresu e-mail',password_changed:'Zmiana hasła',username_changed:'Zmiana nazwy użytkownika',privacy_changed:'Zmiana prywatności konta',consent:'Akceptacja dokumentu'};
    const DOC={terms:'Regulamin',privacy:'Polityka prywatności',age:'oświadczenie o wieku'};
    sec('Historia konta',()=>Social.events(),e=>{const it=el('div',{class:'it'}),g=el('div',{class:'grow'});let extra='';const dd=e.detail||{};
      if(e.kind==='username_changed')extra=' (@'+dd.from+' → @'+dd.to+')';else if(e.kind==='privacy_changed')extra=dd.private?' (prywatne)':' (publiczne)';else if(e.kind==='consent')extra=': '+(DOC[dd.doc]||dd.doc)+' '+(dd.version||'');
      g.append(txt('b',{},(EV[e.kind]||e.kind)+extra),txt('small',{},fullDate(e.at)));it.append(g);return it;},'Brak zdarzeń.');
  },
  acc_app(b){
    b.append(txt('h2',{},'Ustawienia aplikacji'),txt('p',{},'Motyw, tło, jakość grafiki, opcje kreatora i polubione stylizacje z „Polecanych” mogą podążać za Tobą na każde urządzenie.'));
    const r=el('div',{class:'arow'}),x=el('span',{});x.append(document.createTextNode('Synchronizuj z kontem'),txt('small',{},'Po zalogowaniu na innym urządzeniu ustawienia zostaną wczytane automatycznie.'));
    const sw=el('input',{type:'checkbox',class:'switch','aria-label':'Synchronizuj z kontem'});sw.checked=this.syncOn();
    sw.addEventListener('change',()=>act(async()=>{const p=Object.assign(this.prefsPayload(),{sync:sw.checked});await Social.saveSettings({prefs:p});toast(sw.checked?'Synchronizacja włączona':'Synchronizacja wyłączona');return true;}).then(r=>{if(!r)sw.checked=!sw.checked;}));
    const c=el('div',{class:'ctl'});c.append(sw);r.append(x,c);b.append(r);
    const r2=el('div',{class:'arow'}),x2=el('span',{});x2.append(document.createTextNode('Opcje grafiki i sceny'),txt('small',{},'Jakość, cienie, światło, jednostki i inne.'));const o=el('button',{class:'pill'},'Otwórz opcje');o.addEventListener('click',openOpts);
    const c2=el('div',{class:'ctl'});c2.append(o);r2.append(x2,c2);b.append(r2);
    const r3=el('div',{class:'arow'}),x3=el('span',{});x3.append(document.createTextNode('Prywatność i cookies'),txt('small',{},'Co zapisujemy w pamięci tego urządzenia.'));const k=el('button',{class:'pill'},'Zmień zgody');k.addEventListener('click',()=>Consent.settings());
    const c3=el('div',{class:'ctl'});c3.append(k);r3.append(x3,c3);b.append(r3);
  },
  acc_security(b){
    b.append(txt('h2',{},'Bezpieczeństwo'));
    b.append(txt('h4',{},'Adres e-mail'),txt('p',{style:'margin:0 0 8px'},'Obecny: '+Social.user.email));
    const ef=el('form',{class:'aform',novalidate:''}),em=el('input',{type:'email',maxlength:'120',placeholder:'nowy@example.com',autocomplete:'email'}),eb=el('button',{class:'pill',type:'submit',style:'align-self:flex-start'},'Zmień e-mail'),ee=el('div',{class:'err'});
    ef.append(field('Nowy adres',em),ee,eb);b.append(ef);
    ef.addEventListener('submit',async e=>{e.preventDefault();ee.textContent='';const v=em.value.trim();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){ee.textContent='Podaj poprawny adres.';return;}
      eb.disabled=true;try{await Social.setEmail(v);ef.replaceWith(el('div',{class:'ok-msg'},'Wysłaliśmy link potwierdzający na <b>'+esc(v)+'</b>. Zmiana zadziała po jego kliknięciu.'));}catch(x){ee.textContent=x.message;}finally{eb.disabled=false;}});
    b.append(txt('h4',{},'Hasło'));
    const pf=el('form',{class:'aform',novalidate:''}),cur=pwField('pwCur','Obecne hasło','current-password'),n1=pwField('pwNew','Nowe hasło','new-password'),n2=pwField('pwNew2','Powtórz nowe hasło','new-password'),pb=el('button',{class:'pill',type:'submit',style:'align-self:flex-start'},'Zmień hasło'),pe=el('div',{class:'err'});
    pf.append(cur,n1,n2,pe,pb);b.append(pf);
    pf.addEventListener('submit',async e=>{e.preventDefault();pe.textContent='';const c=$('#pwCur').value,a=$('#pwNew').value,a2=$('#pwNew2').value;
      if(a.length<8){pe.textContent='Nowe hasło musi mieć co najmniej 8 znaków.';return;}if(a!==a2){pe.textContent='Nowe hasła się różnią.';return;}
      pb.disabled=true;try{await Social.checkPassword(c).catch(()=>{throw new Error('Obecne hasło jest nieprawidłowe.');});await Social.setPassword(a);pf.reset();toast('Hasło zmienione');}catch(x){pe.textContent=x.message;}finally{pb.disabled=false;}});
    b.append(txt('h4',{},'Sesje'));
    const r=el('div',{class:'arow'}),x=el('span',{});x.append(document.createTextNode('Wyloguj ze wszystkich urządzeń'),txt('small',{},'Przydaje się, gdy logowałeś(-aś) się na cudzym komputerze. Historię logowań znajdziesz w „Aktywność”.'));
    const g=el('button',{class:'pill'},'Wyloguj wszędzie');g.addEventListener('click',()=>ask({title:'Wylogować wszędzie?',text:'Zostaniesz wylogowany(-a) na wszystkich urządzeniach, także na tym.',ok:'Wyloguj wszędzie',onOk:()=>this.signOut('global')}));
    const c=el('div',{class:'ctl'});c.append(g);r.append(x,c);b.append(r);
  },
  acc_data(b){
    b.append(txt('h2',{},'Twoje dane'),txt('p',{},'Zgodnie z RODO możesz w każdej chwili pobrać kopię swoich danych i usunąć konto.'));
    const r=el('div',{class:'arow'}),x=el('span',{});x.append(document.createTextNode('Pobierz moje dane'),txt('small',{},'Plik JSON: profil, ustawienia, fity, polubienia, komentarze, obserwowania, blokady, zgłoszenia, powiadomienia, historia i zgody.'));
    const dl=el('button',{class:'pill'},'Pobierz');dl.addEventListener('click',()=>act(async()=>{const data=await Social.exportData();const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const a=el('a',{href:URL.createObjectURL(blob),download:'fitme-'+(Social.profile?Social.profile.username:'dane')+'-'+new Date().toISOString().slice(0,10)+'.json'});document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);toast('Pobrano kopię danych');},dl));
    const c=el('div',{class:'ctl'});c.append(dl);r.append(x,c);b.append(r);
    b.append(txt('h4',{},'Zaakceptowane dokumenty'));const cl=el('div',{class:'alist'});b.append(cl);
    const DOC={terms:'Regulamin',privacy:'Polityka prywatności',age:'Oświadczenie: ukończone '+FITME_CONFIG.minAge+' lat'};
    Social.consents().then(rows=>{if(!rows.length)cl.append(txt('p',{class:'muted'},'Brak zapisanych zgód.'));for(const z of rows){const it=el('div',{class:'it'}),g=el('div',{class:'grow'});g.append(txt('b',{},DOC[z.doc]||z.doc),txt('small',{},'wersja '+z.version+' · '+fullDate(z.accepted_at)));it.append(g);
      if(LEGAL_DOCS[z.doc]){const o=el('button',{class:'pill'},'Czytaj');o.addEventListener('click',()=>openLegal(z.doc));it.append(o);}cl.append(it);}}).catch(e=>cl.append(txt('p',{class:'err'},e.message)));
    const dz=el('div',{class:'danger-zone'});dz.append(txt('b',{},'Usuń konto'),txt('p',{style:'margin:6px 0 12px;font-size:13.5px;color:var(--muted)'},'Usuniemy profil, wszystkie fity, polubienia, komentarze, obserwowania, historię i zgody. Tego nie da się cofnąć. Fity zapisane na tym urządzeniu zostaną.'));
    const del=el('button',{class:'pill danger'},'Usuń konto…');del.addEventListener('click',()=>this.deleteAccount());dz.append(del);b.append(dz);
  },
  acc_help(b){
    b.append(txt('h2',{},'Pomoc i dokumenty'));
    for(const[k,l] of Object.entries(LEGAL_DOCS)){const r=el('div',{class:'arow'});r.append(txt('span',{},l));const c=el('div',{class:'ctl'}),o=el('button',{class:'pill'},'Otwórz');o.addEventListener('click',()=>openLegal(k));c.append(o);r.append(c);b.append(r);}
    const O=FITME_CONFIG.operator;b.append(txt('p',{style:'margin-top:16px;font-size:13.5px'},O.email?'Kontakt: '+O.email:'Kontakt: zobacz „Zgłoszenia i kontakt”.'));
  },
  deleteAccount(){
    const u=Social.profile.username,body=el('div',{style:'display:flex;flex-direction:column;gap:12px'});
    const conf=el('input',{type:'text',autocomplete:'off',spellcheck:'false',placeholder:u});
    body.append(field('Wpisz swoją nazwę użytkownika: '+u,conf),pwField('delPw','Hasło','current-password'));
    ask({title:'Usunąć konto na zawsze?',text:'To usunie @'+u+' i wszystkie dane konta z serwera od razu (z kopii zapasowych najpóźniej po 30 dniach).',body,ok:'Usuń konto na zawsze',danger:true,
      onOk:async()=>{if(conf.value.trim().toLowerCase()!==u)throw new Error('Nazwa użytkownika się nie zgadza.');
        await Social.checkPassword($('#delPw').value).catch(()=>{throw new Error('Hasło jest nieprawidłowe.');});
        await Social.deleteAccount();this._signedFor=null;go('creator');toast('Konto zostało usunięte. Szkoda, że odchodzisz.');}});
  }
};
window.Account=Account;
