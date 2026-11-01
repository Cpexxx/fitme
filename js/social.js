'use strict';
/* =============== Fitme: konta i społeczność – warstwa danych (Supabase) ===============
   Bez skonfigurowanego serwera (js/config.js) Social.on === false i aplikacja działa w trybie gościa.
   Wszystko, kto co widzi i może zmienić, pilnują reguły RLS w bazie (supabase/schema.sql); tu są tylko zapytania. */
/* adres z linku w mailu (#access_token=…&type=signup|recovery albo #error=…) – zapamiętany, zanim supabase-js go przetworzy i wyczyści */
const BOOT_HASH=location.hash||'';
const CLOUD_ON=!!(FITME_CONFIG.cloud.url&&FITME_CONFIG.cloud.anonKey&&window.supabase&&window.supabase.createClient);
const SB=CLOUD_ON?window.supabase.createClient(FITME_CONFIG.cloud.url,FITME_CONFIG.cloud.anonKey,
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit',storageKey:'fitme.auth'}}):null;
/* adres, na który wracają linki z maili (potwierdzenie, reset hasła); aplikacja desktopowa nie ma adresu w sieci */
const SITE_URL=/^https?:$/.test(location.protocol)?location.origin+location.pathname:FITME_CONFIG.site;
const PROFILE_COLS='id,username,display_name,avatar,bio,website,is_private,comments,followers_count,following_count,fits_count,created_at';
const AUTHOR='author:profiles!fits_owner_fkey(id,username,display_name,avatar,comments,is_private)';
const FIT_COLS='id,owner,name,description,thumb,tags,visibility,likes_count,comments_count,created_at,updated_at,remix_of,'+AUTHOR;
const PAGE_N=24;

/* komunikaty po polsku dla błędów serwera logowania i bazy */
function socialErr(e){
  if(!e)return '';const m=String(e.message||e.error_description||e.msg||e),code=e.code||'';
  if(/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(m))return 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.';
  if(/Invalid login credentials/i.test(m))return 'Nieprawidłowy e-mail lub hasło.';
  if(/Email not confirmed/i.test(m))return 'Najpierw potwierdź adres e-mail – link jest w wiadomości od nas.';
  if(/User already registered|already been registered/i.test(m))return 'Konto z tym adresem e-mail już istnieje. Zaloguj się albo zresetuj hasło.';
  if(/Database error saving new user|username_reserved/i.test(m))return 'Ta nazwa użytkownika jest zajęta albo zastrzeżona. Wybierz inną.';
  if(/Password should be at least|weak.?password/i.test(m))return 'Hasło jest za słabe: użyj co najmniej 8 znaków, najlepiej z cyframi i znakami specjalnymi.';
  if(/New password should be different/i.test(m))return 'Nowe hasło musi się różnić od obecnego.';
  if(/only request this after|rate limit|too many requests|over_email_send_rate_limit/i.test(m))return 'Za dużo prób w krótkim czasie. Odczekaj chwilę i spróbuj ponownie.';
  if(/Unable to validate email|invalid format|email_address_invalid/i.test(m))return 'To nie wygląda na poprawny adres e-mail.';
  if(/expired|invalid.*(token|otp)/i.test(m))return 'Link wygasł albo został już użyty. Poproś o nowy.';
  if(/JWT|not_signed_in|session/i.test(m))return 'Sesja wygasła. Zaloguj się ponownie.';
  if(code==='23505'&&/username/.test(m))return 'Ta nazwa użytkownika jest już zajęta.';
  if(code==='23505')return 'To już jest zapisane.';
  if(code==='23514')return 'Niepoprawne dane: sprawdź długość i format pól.';
  if(code==='42501'||/row-level security/i.test(m))return 'Nie masz do tego uprawnień.';
  if(/blocked/.test(m))return 'Nie możesz wykonać tej akcji wobec tego konta.';
  if(code==='P0001')return m;
  return 'Coś poszło nie tak ('+m.slice(0,120)+'). Spróbuj ponownie.';
}
class SocialError extends Error{constructor(e){super(socialErr(e));this.raw=e;}}
const need=r=>{if(r.error)throw new SocialError(r.error);return r.data;};
/* do filtrów PostgREST trafiają tylko litery, cyfry, spacje i kilka znaków (przecinki i nawiasy psułyby składnię) */
const cleanQ=q=>String(q||'').normalize('NFC').replace(/[^\p{L}\p{N} ._-]/gu,' ').trim().slice(0,40);

const Social={
  on:CLOUD_ON,user:null,profile:null,settings:null,listeners:[],
  onChange(f){this.listeners.push(f);},
  emit(ev){for(const f of this.listeners)try{f(ev);}catch(e){console.error(e);}},
  get uid(){return this.user?this.user.id:null;},
  async init(){
    if(!SB)return;
    SB.auth.onAuthStateChange((ev,session)=>{setTimeout(()=>this.applySession(ev,session),0);});
    const{data}=await SB.auth.getSession();await this.applySession('INITIAL',data.session);
  },
  async applySession(ev,session){
    const u=session?session.user:null,changed=(u&&u.id)!==(this.user&&this.user.id);
    this.user=u;
    if(!u){this.profile=null;this.settings=null;if(changed||ev==='SIGNED_OUT'||ev==='INITIAL')this.emit(ev);return;}
    if(changed||ev==='INITIAL'||ev==='USER_UPDATED'){try{await this.loadMe();}catch(e){console.error('Fitme: profil',e);}}
    this.emit(ev);
  },
  async loadMe(){
    const[p,s]=await Promise.all([SB.from('profiles').select(PROFILE_COLS).eq('id',this.uid).maybeSingle(),SB.from('user_settings').select('*').eq('id',this.uid).maybeSingle()]);
    this.profile=need(p);this.settings=need(s)||{prefs:{},history_on:true,default_visibility:'public'};
  },

  /* ---------- konto ---------- */
  async usernameAvailable(name){return !!need(await SB.rpc('username_available',{name}));},
  async signUp({email,password,username,displayName}){
    const r=await SB.auth.signUp({email,password,options:{emailRedirectTo:SITE_URL,data:{username:username.toLowerCase(),display_name:displayName||'',
      terms_version:FITME_CONFIG.legalVersion,privacy_version:FITME_CONFIG.legalVersion,age_confirmed:true}}});
    const d=need(r);
    /* Supabase nie zdradza, że adres jest zajęty (ochrona przed sprawdzaniem cudzych e-maili): pusta lista tożsamości = konto istnieje */
    if(d.user&&Array.isArray(d.user.identities)&&d.user.identities.length===0)return{exists:true};
    return{session:!!d.session};
  },
  async resend(email){need(await SB.auth.resend({type:'signup',email,options:{emailRedirectTo:SITE_URL}}));},
  async signIn(email,password){need(await SB.auth.signInWithPassword({email,password}));},
  async signOut(scope='local'){const r=await SB.auth.signOut({scope});if(r.error&&!/session/i.test(r.error.message))throw new SocialError(r.error);},
  async resetPassword(email){need(await SB.auth.resetPasswordForEmail(email,{redirectTo:SITE_URL}));},
  async setPassword(password){need(await SB.auth.updateUser({password}));},
  async checkPassword(password){need(await SB.auth.signInWithPassword({email:this.user.email,password}));},
  async setEmail(email){need(await SB.auth.updateUser({email},{emailRedirectTo:SITE_URL}));},
  /* po usunięciu użytkownika serwer nie zna już sesji: kasujemy ją tylko lokalnie (bez zapytania /logout, które zwróciłoby 403) */
  async deleteAccount(){need(await SB.rpc('delete_my_account'));try{localStorage.removeItem('fitme.auth');}catch(e){}await SB.auth.signOut({scope:'local'}).catch(()=>{});},

  /* ---------- profile ---------- */
  async profileBy(field,value){return need(await SB.from('profiles').select(PROFILE_COLS).eq(field,value).maybeSingle());},
  async updateProfile(patch){const p=need(await SB.from('profiles').update(patch).eq('id',this.uid).select(PROFILE_COLS).single());this.profile=p;this.emit('PROFILE');return p;},
  async searchProfiles(q){q=cleanQ(q);if(q.length<2)return[];
    return need(await SB.from('profiles').select('id,username,display_name,avatar,is_private,followers_count').or(`username.ilike.*${q}*,display_name.ilike.*${q}*`).order('followers_count',{ascending:false}).limit(8));},
  async saveSettings(patch){if(!this.uid)return;const s=need(await SB.from('user_settings').update(patch).eq('id',this.uid).select('*').single());this.settings=s;return s;},

  /* ---------- fity ---------- */
  async listFits({mode='latest',owner=null,before=null,offset=0,q=''}={}){
    if(mode==='following'){const r=await SB.rpc('feed_following',{lim:PAGE_N,before}).select(FIT_COLS);return need(r);}
    let x=SB.from('fits').select(FIT_COLS);
    /* kanały społeczności pokazują tylko fity dla innych; swoje prywatne widzisz w „Zachowane” i na profilu */
    if(owner)x=x.eq('owner',owner);else x=x.neq('visibility','private');
    q=cleanQ(q);if(q)x=x.or(`name.ilike.*${q}*,tags.cs.{"${q.toLowerCase()}"}`);
    if(mode==='popular')return need(await x.gt('likes_count',0).order('likes_count',{ascending:false}).order('created_at',{ascending:false}).range(offset,offset+PAGE_N-1));
    if(before)x=x.lt('created_at',before);
    return need(await x.order('created_at',{ascending:false}).limit(PAGE_N));
  },
  async fitsByIds(ids){if(!ids.length)return[];return need(await SB.from('fits').select(FIT_COLS).in('id',ids.slice(0,100)));},
  async myFitsCount(){if(!this.uid)return 0;const r=await SB.from('fits').select('id',{count:'exact',head:true}).eq('owner',this.uid);return r.error?0:(r.count||0);},
  async getFit(id){return need(await SB.from('fits').select(FIT_COLS+',state').eq('id',id).maybeSingle());},
  async createFit(f){return need(await SB.from('fits').insert(f).select(FIT_COLS).single());},
  async updateFit(id,patch){return need(await SB.from('fits').update(patch).eq('id',id).select(FIT_COLS).single());},
  async deleteFit(id){need(await SB.from('fits').delete().eq('id',id));},
  async likedIds(ids){if(!this.uid||!ids.length)return new Set();
    return new Set(need(await SB.from('likes').select('fit_id').eq('user_id',this.uid).in('fit_id',ids)).map(r=>r.fit_id));},
  async like(id,on){if(on){const r=await SB.from('likes').insert({fit_id:id});if(r.error&&r.error.code!=='23505')throw new SocialError(r.error);}
    else need(await SB.from('likes').delete().eq('user_id',this.uid).eq('fit_id',id));},
  async likedFits(){const rows=need(await SB.from('likes').select('created_at,fit:fits('+FIT_COLS+')').eq('user_id',this.uid).order('created_at',{ascending:false}).limit(120));
    return rows.map(r=>r.fit).filter(Boolean);},

  /* ---------- komentarze ---------- */
  async comments(fitId){return need(await SB.from('comments').select('id,body,created_at,user_id,author:profiles!comments_user_id_fkey(id,username,display_name,avatar)').eq('fit_id',fitId).order('created_at').limit(200));},
  async addComment(fitId,body){return need(await SB.from('comments').insert({fit_id:fitId,body}).select('id,body,created_at,user_id,author:profiles!comments_user_id_fkey(id,username,display_name,avatar)').single());},
  async deleteComment(id){need(await SB.from('comments').delete().eq('id',id));},
  async myComments(){return need(await SB.from('comments').select('id,body,created_at,fit:fits(id,name)').eq('user_id',this.uid).order('created_at',{ascending:false}).limit(100));},

  /* ---------- obserwowanie i blokowanie ---------- */
  async relation(id){
    if(!this.uid||id===this.uid)return{following:'none',followsMe:false,blocked:false};
    const[a,b,c]=await Promise.all([SB.from('follows').select('status').eq('follower',this.uid).eq('followee',id).maybeSingle(),
      SB.from('follows').select('status').eq('follower',id).eq('followee',this.uid).maybeSingle(),SB.from('blocks').select('blocked').eq('blocker',this.uid).eq('blocked',id).maybeSingle()]);
    return{following:need(a)?a.data.status:'none',followsMe:!!(need(b)&&b.data.status==='accepted'),blocked:!!need(c)};
  },
  async follow(id){return need(await SB.from('follows').insert({followee:id}).select('status').single()).status;},
  async unfollow(id){need(await SB.from('follows').delete().eq('follower',this.uid).eq('followee',id));},
  async removeFollower(id){need(await SB.from('follows').delete().eq('follower',id).eq('followee',this.uid));},
  async accept(id){need(await SB.from('follows').update({status:'accepted'}).eq('follower',id).eq('followee',this.uid));},
  async followers(id){return need(await SB.from('follows').select('created_at,p:profiles!follows_follower_fkey(id,username,display_name,avatar,is_private)').eq('followee',id).eq('status','accepted').order('created_at',{ascending:false}).limit(200)).map(r=>r.p).filter(Boolean);},
  async following(id){return need(await SB.from('follows').select('created_at,p:profiles!follows_followee_fkey(id,username,display_name,avatar,is_private)').eq('follower',id).eq('status','accepted').order('created_at',{ascending:false}).limit(200)).map(r=>r.p).filter(Boolean);},
  async requests(){return need(await SB.from('follows').select('created_at,p:profiles!follows_follower_fkey(id,username,display_name,avatar)').eq('followee',this.uid).eq('status','pending').order('created_at',{ascending:false})).map(r=>r.p).filter(Boolean);},
  async block(id){const r=await SB.from('blocks').insert({blocked:id});if(r.error&&r.error.code!=='23505')throw new SocialError(r.error);},
  async unblock(id){need(await SB.from('blocks').delete().eq('blocker',this.uid).eq('blocked',id));},
  async blocked(){return need(await SB.from('blocks').select('created_at,p:profiles!blocks_blocked_fkey(id,username,display_name,avatar)').eq('blocker',this.uid).order('created_at',{ascending:false})).map(r=>r.p).filter(Boolean);},

  /* ---------- zgłoszenia (DSA) ---------- */
  async myReports(){return need(await SB.from('reports').select('target_type,reason,status,resolution,created_at,resolved_at').eq('reporter',this.uid).order('created_at',{ascending:false}).limit(50));},
  async report({type,id,reason,details,email}){
    const row={target_type:type,target_id:id,reason,details:details||'',good_faith:true};if(!this.uid)row.reporter_email=email;
    need(await SB.from('reports').insert(row));
  },

  /* ---------- powiadomienia ---------- */
  async notifications(){return need(await SB.from('notifications').select('id,kind,created_at,read_at,fit_id,comment_id,actor:profiles!notifications_actor_fkey(id,username,display_name,avatar),fit:fits(id,name,thumb),comment:comments(body)').eq('user_id',this.uid).order('created_at',{ascending:false}).limit(60));},
  async unread(){if(!this.uid)return 0;const r=await SB.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',this.uid).is('read_at',null);return r.error?0:(r.count||0);},
  async markRead(){need(await SB.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',this.uid).is('read_at',null));},

  /* ---------- historia, zgody, historia konta ---------- */
  async addHistory(ref,name){if(!this.uid||!this.settings||!this.settings.history_on)return;
    await SB.from('history').upsert({ref:String(ref).slice(0,64),name:String(name||'').slice(0,40)},{onConflict:'user_id,ref'});},
  async history(){return need(await SB.from('history').select('ref,name,seen_at').eq('user_id',this.uid).order('seen_at',{ascending:false}).limit(200));},
  async clearHistory(){need(await SB.from('history').delete().eq('user_id',this.uid));},
  async consents(){return need(await SB.from('consents').select('doc,version,accepted_at').eq('user_id',this.uid).order('accepted_at',{ascending:false}));},
  async acceptDocs(version){const r=await SB.from('consents').insert([{doc:'terms',version},{doc:'privacy',version}]);if(r.error&&r.error.code!=='23505')throw new SocialError(r.error);},
  async events(){return need(await SB.from('account_events').select('kind,detail,at').eq('user_id',this.uid).order('at',{ascending:false}).limit(200));},

  /* ---------- kopia danych (RODO art. 15 i 20) ---------- */
  async exportData(){
    const u=this.uid,q=t=>SB.from(t).select('*');
    const[profile,settings,fits,likes,comments,following,followers,blocks,notifications,history,consents,events,reports]=await Promise.all([
      q('profiles').eq('id',u).single(),q('user_settings').eq('id',u).single(),q('fits').eq('owner',u),q('likes').eq('user_id',u),q('comments').eq('user_id',u),
      q('follows').eq('follower',u),q('follows').eq('followee',u),q('blocks').eq('blocker',u),q('notifications').eq('user_id',u),q('history').eq('user_id',u),
      q('consents').eq('user_id',u),q('account_events').eq('user_id',u),q('reports').eq('reporter',u)]);
    const all={profile,settings,fits,likes,comments,following,followers,blocks,notifications,history,consents,events,reports};
    for(const[k,v] of Object.entries(all))all[k]=need(v);
    return{format:'fitme-export-1',exported_at:new Date().toISOString(),
      account:{id:u,email:this.user.email,created_at:this.user.created_at,last_sign_in_at:this.user.last_sign_in_at,email_confirmed_at:this.user.email_confirmed_at},...all};
  }
};
