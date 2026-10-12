'use strict';
/* =============== Fitme: scena, interfejs, strony =============== */
const FEMALE_HAIR={style:'long',color:'#3d2a1e',texture:'wavy',fringe:'none',beard:'none',len:0.5};
const MALE_HAIR={style:'fade',color:'#2a1d16',texture:'straight',fringe:'none',beard:'none',len:0.5};
let S=sanitize(DEFAULT);

/* =============== state hygiene =============== */
function inList(v,list,def){return list.includes(v)?v:def;}
function hexOr(v,d){return HEX.test(v||'')?v.toLowerCase():d;}
function sizeOk(v,list){return v==='auto'||list.includes(v)?v:'auto';}
function midDefs(type){return MID_ITEMS[type]==='top'?[TOPS,TOP_FITS]:[OUTERS,OUTER_FITS];}
function fixState(s){
  s.mid=s.mid||clone(DEFAULT.mid);
  if(!TOPS[s.top.type])s.top.type='tee';
  const T=TOPS[s.top.type];
  s.top.fit=inList(s.top.fit,T.fits,T.fits.includes('regular')?'regular':T.fits[0]);
  s.top.mat=inList(s.top.mat,T.mats||[],'');s.top.neck=T.necks?inList(s.top.neck,T.necks,T.necks[0]):'';
  s.top.sleeve=inList(s.top.sleeve,T.sleeves,T.sleeves[0]);if(!T.tuck)s.top.tuck='out';
  if(MID_ITEMS[s.mid.type]){const[D,FT]=midDefs(s.mid.type),M=D[s.mid.type];s.mid.src=MID_ITEMS[s.mid.type];
    s.mid.fit=inList(s.mid.fit,M.fits,M.fits.includes('regular')?'regular':M.fits[0]);s.mid.mat=inList(s.mid.mat,M.mats||[],'');
    s.mid.neck=M.necks?inList(s.mid.neck,M.necks,M.necks[0]):'';s.mid.sleeve=M.sleeves?inList(s.mid.sleeve,M.sleeves,M.sleeves[0]):'';s.mid.tuck='out';
    if(!CLOSES[s.mid.close]||M.closure==='none')s.mid.close='closed';else if(s.mid.close==='half'&&M.closure!=='zip')s.mid.close='closed';}
  else{s.mid.type='none';s.mid.src='none';}
  for(const k of ['top','mid','outer'])s[k].size=sizeOk(s[k].size,SIZES);
  s.bottom.w=sizeOk(+s.bottom.w||s.bottom.w,WAISTS);s.bottom.l=sizeOk(+s.bottom.l||s.bottom.l,INSEAMS);s.shoes.eu=sizeOk(+s.shoes.eu||s.shoes.eu,EU_SIZES);
  const O=OUTERS[s.outer.type];
  if(s.outer.type!=='none'){s.outer.fit=inList(s.outer.fit,O.fits,'regular');s.outer.mat=inList(s.outer.mat,O.mats||[],'');
    if(O.closure==='none')s.outer.close='closed';else if(s.outer.close==='half'&&O.closure!=='zip')s.outer.close='closed';}
  const B=BOTTOMS[s.bottom.type];
  s.bottom.fit=inList(s.bottom.fit,B.fits,['straight','aline','pleated','slip','relaxed','skinny'].find(x=>B.fits.includes(x))||B.fits[0]);
  s.bottom.length=inList(s.bottom.length,B.lens,['full','knee','shorts','midi'].find(x=>B.lens.includes(x))||B.lens[0]);
  if(!RISES[s.bottom.rise])s.bottom.rise='mid';s.bottom.mat=inList(s.bottom.mat,B.mats||[],'');
  const SH=SHOES[s.shoes.type];s.shoes.mat=inList(s.shoes.mat,SH.ups||[],'');
  return s;
}
function sanitize(o){
  const s=clone(DEFAULT);if(!o||typeof o!=='object')return fixState(s);
  const old=!(o.v>=3);
  if(o.gender==='m'||o.gender==='f'){s.gender=o.gender;if(o.gender==='f'){s.height=168;s.hair=clone(FEMALE_HAIR);}}
  if(Number.isFinite(+o.height))s.height=clamp(Math.round(+o.height),150,205);
  if(Number.isFinite(+o.build))s.build=clamp(+o.build,0.85,1.35);
  if(Number.isFinite(+o.mus))s.mus=clamp(+o.mus,-1,1.6);if(Number.isFinite(+o.fat))s.fat=clamp(+o.fat,-1,2.4);
  if(old||!(o.v>=5)){if(!Number.isFinite(+o.mus)){const b=Number.isFinite(+o.build)?+o.build:1;s.mus=clamp(0.3+(b-1)*2,-1,1.6);s.fat=clamp(0.15+(b-1)*1.5,-1,1.4);s.build=1;}}
  if(o.fig&&typeof o.fig==='object')for(const k of Object.keys(FIG))if(Number.isFinite(+o.fig[k]))s.fig[k]=clamp(+o.fig[k],FIG[k][1],FIG[k][2]);
  if(Number.isInteger(o.skin)){if(old){s.skin=[1,3,5,7,9,10,11,13][o.skin]!=null?[1,3,5,7,9,10,11,13][o.skin]:3;if(o.skin>=5)s.finish='fabric';}else if(o.skin>=0&&o.skin<SKINS.length)s.skin=o.skin;}
  if(typeof o.pose==='string'&&POSES[o.pose])s.pose=o.pose;
  if(FINISHES[o.finish])s.finish=o.finish;else if(o.finish==='plush')s.finish='fabric';
  if(o.hair&&typeof o.hair==='object'){const h=o.hair;if(HAIR[h.style])s.hair.style=h.style;s.hair.color=hexOr(h.color,s.hair.color);if(HAIR_TEX[h.texture])s.hair.texture=h.texture;
    if(FRINGES[h.fringe])s.hair.fringe=h.fringe;if(BEARDS[h.beard])s.hair.beard=h.beard;if(Number.isFinite(+h.len))s.hair.len=clamp(+h.len,0,1);}
  const copyG=(slot,src,types,extra)=>{if(!src||typeof src!=='object')return;const d=s[slot];
    let t=src.type;if(slot==='outer'&&t==='coat')t='overcoat';if(slot==='shoes'&&t==='sneaker')t='court';
    if(types[t])d.type=t;
    for(const k of ['fit','length','rise','neck','sleeve','mat','close','buckle','socks','print'])if(typeof src[k]==='string')d[k]=src[k];
    for(const k of ['color','color2','sole','beltColor','sockColor'])if(k in d)d[k]=hexOr(src[k],d[k]);
    if(PATTERNS[src.pattern])d.pattern=src.pattern;
    for(const k of ['belt','rips','stripes'])if(typeof src[k]==='boolean')d[k]=src[k];
    if(slot==='top'){if(typeof src.tuck==='boolean')d.tuck=src.tuck?'in':'out';else if(TUCKS[src.tuck])d.tuck=src.tuck;}
    if(extra)extra(d,src);};
  const sz=(d,src)=>{if(typeof src.size==='string')d.size=src.size;for(const k of ['w','l','eu'])if(src[k]!=null&&k in d)d[k]=src[k]==='auto'?'auto':+src[k];};
  copyG('top',o.top,TOPS,sz);copyG('mid',o.mid,MID_ITEMS,sz);copyG('outer',o.outer,OUTERS,sz);copyG('bottom',o.bottom,BOTTOMS,sz);copyG('shoes',o.shoes,SHOES,sz);
  if(!PRINTS[s.top.print])s.top.print='none';if(!CLOSES[s.outer.close])s.outer.close='closed';if(!SOCKS[s.shoes.socks])s.shoes.socks='none';
  if(!['classic','western','web'].includes(s.bottom.buckle))s.bottom.buckle='classic';
  const a=o.acc;
  if(a&&typeof a==='object'){
    if(typeof a.cap==='string'){/* v1/v2 codes */
      if(HATS[a.cap])s.acc.cap.type=a.cap;s.acc.cap.color=hexOr(a.capColor,s.acc.cap.color);
      const met=METALS[a.metal]?a.metal:'silver';
      if(WATCHES[a.watch])s.acc.watch.type=a.watch;if(STRAPS[a.strap])s.acc.watch.strap=a.strap;s.acc.watch.metal=met;
      if(NECKLACES[a.chain])s.acc.chain.type=a.chain;s.acc.chain.metal=met;
      if(BRACELETS[a.bracelet])s.acc.bracelet.type=a.bracelet;s.acc.bracelet.metal=met;
    }else{
      const A=s.acc,g=(k,f)=>{if(a[k]&&typeof a[k]==='object')f(A[k],a[k]);};
      g('cap',(d,x)=>{if(HATS[x.type])d.type=x.type;d.color=hexOr(x.color,d.color);d.color2=hexOr(x.color2,d.color2);d.back=!!x.back;});
      g('glasses',(d,x)=>{if(GLASSES[x.type])d.type=x.type;d.frame=hexOr(x.frame,d.frame);d.lens=hexOr(x.lens,d.lens);});
      g('watch',(d,x)=>{if(WATCHES[x.type])d.type=x.type;d.hand=x.hand==='R'?'R':'L';if(STRAPS[x.strap])d.strap=x.strap;if(METALS[x.metal])d.metal=x.metal;d.dial=hexOr(x.dial,d.dial);});
      g('bracelet',(d,x)=>{if(BRACELETS[x.type])d.type=x.type;d.hand=x.hand==='L'?'L':'R';if(Number.isFinite(+x.pos))d.pos=clamp(+x.pos,0,1);if(Number.isFinite(+x.count))d.count=clamp(Math.round(+x.count),1,3);if(METALS[x.metal])d.metal=x.metal;});
      g('ring',(d,x)=>{if(RINGS[x.type])d.type=x.type;d.hand=x.hand==='L'?'L':'R';if(METALS[x.metal])d.metal=x.metal;});
      g('chain',(d,x)=>{if(NECKLACES[x.type])d.type=x.type;if(Number.isFinite(+x.len))d.len=clamp(+x.len,0,1);if(METALS[x.metal])d.metal=x.metal;});
      g('earrings',(d,x)=>{if(EARRINGS[x.type])d.type=x.type;if(['both','L','R'].includes(x.side))d.side=x.side;if(METALS[x.metal])d.metal=x.metal;});
      g('wallet',(d,x)=>{if(WALLETS[x.type])d.type=x.type;d.side=x.side==='L'?'L':'R';if(METALS[x.metal])d.metal=x.metal;});
      g('bag',(d,x)=>{if(BAGS[x.type])d.type=x.type;d.color=hexOr(x.color,d.color);});
      g('scarf',(d,x)=>{if(SCARVES[x.type])d.type=x.type;d.color=hexOr(x.color,d.color);d.color2=hexOr(x.color2,d.color2);if(PATTERNS[x.pattern])d.pattern=x.pattern;});
      g('tie',(d,x)=>{if(TIES[x.type])d.type=x.type;d.color=hexOr(x.color,d.color);d.color2=hexOr(x.color2,d.color2);if(PATTERNS[x.pattern])d.pattern=x.pattern;});
      g('bandana',(d,x)=>{if(BANDANAS[x.type])d.type=x.type;d.color=hexOr(x.color,d.color);d.color2=hexOr(x.color2,d.color2);if(PATTERNS[x.pattern])d.pattern=x.pattern;});
      g('headband',(d,x)=>{if(HEADBANDS[x.type])d.type=x.type;d.color=hexOr(x.color,d.color);d.color2=hexOr(x.color2,d.color2);if(PATTERNS[x.pattern])d.pattern=x.pattern;});
      g('gloves',(d,x)=>{if(GLOVES[x.type])d.type=x.type;d.color=hexOr(x.color,d.color);});
    }
  }
  return fixState(s);
}
function deepMerge(base,part){const b=clone(base);for(const k of Object.keys(part)){const v=part[k];if(v&&typeof v==='object'&&!Array.isArray(v)&&b[k]&&typeof b[k]==='object')b[k]=deepMerge(b[k],v);else b[k]=v;}return b;}
INSPO.forEach(f=>{const base=clone(DEFAULT);base.gender=f.s.gender;base.height=f.s.gender==='f'?168:180;base.hair=clone(f.s.gender==='f'?FEMALE_HAIR:MALE_HAIR);f.state=sanitize(deepMerge(base,f.s));});

/* =============== building =============== */
function disposeTree(o){o.traverse(n=>{if(n.geometry&&!n.geometry.userData.keep)n.geometry.dispose();});}
function safe(name,fn){try{fn();}catch(e){console.error('Fitme: '+name,e);}}
/* bone weights for the kept figure, computed while the person is not doing anything, so the first pose switch is quick too */
let warmT=0;function warmPose(){clearTimeout(warmT);warmT=setTimeout(()=>{if(!BUILT||BUILT.weighted)return;const run=()=>{if(!BUILT||BUILT.weighted)return;const saved=S;S=BUILT.state;try{setupBody();poseAssign(BUILT.G,BUILT.GS);BUILT.weighted=true;}catch(e){console.error('Fitme: pose warm',e);}finally{S=saved;}};
  if(window.requestIdleCallback)requestIdleCallback(run,{timeout:4000});else run();},900);}
/* the dressed figure before finalising is kept for the last outfit: changing only the pose re-bends it without dressing again */
let BUILT=null;
/* everything that only changes how things look, not their shape */
const LOOK_KEYS=new Set(['color','color2','sole','beltColor','sockColor','dial','frame','lens','pattern','metal','skin','finish','strap']);
function shapeKey(state){return JSON.stringify(state,(k,v)=>LOOK_KEYS.has(k)?undefined:(k==='pose'?'':v))+QUALITY;}
/* the garment builders alone (no fabric simulation): fast, used to get the materials of a new colourway */
/* the layers up to and including the shirt: things worn on the shirt (a tie) are laid on these, not on a sweater or coat */
let LAYERS_TOP=null;
function runBuilders(G,GS){
  LAYERS_TOP=null;safe('body',()=>buildBody(G));MK_CTX='cloth';MK_STIFF=0;MK_LAYER='bottom';safe('bottom',()=>buildBottom(G));MK_LAYER='top';safe('top',()=>buildTop(G));LAYERS_TOP=LAYERS.slice();MK_LAYER='mid';safe('mid',()=>buildMid(G));MK_LAYER='outer';safe('outer',()=>buildOuter(G));MK_CTX='none';MK_STIFF=0;MK_LAYER='none';
  MK_CTX='hair';safe('hair',()=>buildHair(G));MK_CTX='none';safe('acc',()=>buildAcc(G));safe('shoes',()=>buildShoes(GS,G));}
function matSeq(G,GS){const m=[],c=[];for(const g of [G,GS])g.traverse(o=>{if(o.isMesh){m.push(o.material);c.push(o.geometry.attributes.position.count);}});return{m,c};}
function buildInto(group,state,cache=true){
  const saved=S;S=state;
  try{
    for(const c of group.children.slice()){group.remove(c);disposeTree(c);}
    const key=JSON.stringify(Object.assign({},state,{pose:''}))+QUALITY,skey=shapeKey(state);
    let G,GS;
    if(cache&&BUILT&&BUILT.key===key){setupBody();G=BUILT.G;GS=BUILT.GS;}
    else if(cache&&BUILT&&BUILT.skey===skey&&BUILT.seq){
      /* same shapes, new colours / patterns / finishes: rebuild only the materials and swap them in */
      setupBody();LAYERS=[];PANTS=null;const G1=new THREE.Group(),GS1=new THREE.Group();runBuilders(G1,GS1);
      const seq=matSeq(G1,GS1),old=BUILT.seq;let ok=seq.m.length===old.m.length;const map=new Map();
      for(let i=0;ok&&i<seq.m.length;i++){if(seq.c[i]!==old.c[i]){ok=false;break;}const p=map.get(old.m[i]);if(p&&p!==seq.m[i]){ok=false;break;}map.set(old.m[i],seq.m[i]);}
      for(const g of [G1,GS1])g.traverse(o=>{if(o.isMesh&&!o.geometry.userData.keep)o.geometry.dispose();});
      if(ok){G=BUILT.G;GS=BUILT.GS;for(const g of [G,GS])g.traverse(o=>{if(o.isMesh&&map.has(o.material))o.material=map.get(o.material);});
        BUILT.key=key;BUILT.state=clone(state);BUILT.seq={m:BUILT.seq.m.map(x=>map.get(x)||x),c:BUILT.seq.c};}
    }
    if(!G){
      setupBody();LAYERS=[];PANTS=null;
      G=new THREE.Group();GS=new THREE.Group();
      runBuilders(G,GS);const seq=matSeq(G,GS);
      safe('shells',()=>buildShells(G,GS));
      if(cache){if(BUILT)BUILT.dispose();BUILT={key,skey,seq,G,GS,state:clone(state),weighted:false,dispose(){for(const g of [this.G,this.GS])g.traverse(o=>{if(o.isMesh&&!o.geometry.userData.keep)o.geometry.dispose();});}};}
    }
    const posed=S.pose&&S.pose!=='stand'&&POSES[S.pose];
    if(posed&&!(cache&&BUILT&&BUILT.G===G&&BUILT.weighted)){safe('pose weights',()=>poseAssign(G,GS));if(cache&&BUILT&&BUILT.G===G)BUILT.weighted=true;}
    const body=finalize(G,WARP,!cache);body.position.y=LIFT;const feet=finalize(GS,null,!cache);
    if(posed)safe('pose',()=>posePose(body,feet,S.pose));
    const out=new THREE.Group();out.add(body,feet);
    out.scale.set(BC.sxz,BC.sy,BC.sxz);
    group.add(out);
  }finally{S=saved;}
}

/* =============== options (saved in this browser) =============== */
const OPT_DEF={shadows:true,res:1,exposure:1,light:'studio',ped:true,spinSpeed:1.4,anim:true,fps:false,live:true,units:'cm',glints:true};
const OPT=(()=>{const o=Object.assign({},OPT_DEF);try{const s=JSON.parse(localStorage.getItem('fitme.opts')||'{}');for(const k of Object.keys(OPT_DEF))if(typeof s[k]===typeof OPT_DEF[k])o[k]=s[k];}catch(e){}return o;})();
function saveOpts(){try{localStorage.setItem('fitme.opts',JSON.stringify(OPT));}catch(e){}}
const LIGHTS={studio:{label:'Studio',key:[0xfff0dc,1.55],rim:[0xf4dcb4,1.05],rim2:[0xdfe7f5,0.45],fill:[0xfff6ea,0.14],hemi:0.14},
  day:{label:'Dzień',key:[0xfffaf2,1.7],rim:[0xdfe9ff,0.8],rim2:[0xe4ecf8,0.5],fill:[0xf4f7ff,0.24],hemi:0.24},
  warm:{label:'Ciepłe',key:[0xffdcae,1.5],rim:[0xffc98f,1.15],rim2:[0xffe2c4,0.35],fill:[0xffe9d0,0.12],hemi:0.12},
  cool:{label:'Chłodne',key:[0xeef3ff,1.5],rim:[0xc8d6ff,1.0],rim2:[0xdfe7f5,0.5],fill:[0xe8eeff,0.16],hemi:0.16},
  drama:{label:'Kontrastowe',key:[0xfff3e2,2.05],rim:[0xf6e2c0,1.45],rim2:[0xdfe7f5,0.2],fill:[0xffffff,0.03],hemi:0.05}};
/* push the options into a scene + renderer (main view, thumbnails) */
function applyOpts(sc,r,main){const L=sc.userData.lights,P=LIGHTS[OPT.light]||LIGHTS.studio;
  if(L){for(const k of ['key','rim','rim2','fill']){L[k].color.setHex(P[k][0]);L[k].intensity=P[k][1];}L.hemi.intensity=P.hemi;L.key.castShadow=!!OPT.shadows;}
  for(const o of sc.userData.ped||[])o.visible=!!OPT.ped;
  r.toneMappingExposure=0.82*OPT.exposure;
  if(main){const base=QUALITY==='high'?Math.max(window.devicePixelRatio||1,1.5):QUALITY==='perf'?(GL_INFO.soft?0.75:1):(window.devicePixelRatio||1);basePR=clamp(base*OPT.res,0.5,2.5);lowRes=false;r.setPixelRatio(basePR);
    if(controls)controls.autoRotateSpeed=OPT.spinSpeed;const f=$('#fps');if(f)f.hidden=!OPT.fps;r.shadowMap.needsUpdate=true;dirty=true;
    const st=$('#stage');if(st)window.dispatchEvent(new Event('resize'));}
}
let fpsN=0,fpsT=0;function fpsTick(){if(!OPT.fps)return;fpsN++;const t=performance.now();if(t-fpsT>500){const f=$('#fps');if(f)f.textContent=Math.round(fpsN*1000/(t-fpsT))+' FPS · '+Math.round(window.__lastBuild||0)+' ms'+(GL_INFO.soft?' · BEZ GPU':'')+(lowRes?' · podgląd':'');fpsN=0;fpsT=t;}}
const fmtLen=cm=>OPT.units==='in'?(cm/2.54).toFixed(cm<60?1:0).replace('.',',')+' in':Math.round(cm)+' cm';
const fmtHeight=cm=>{if(OPT.units!=='in')return cm+' cm';const t=Math.round(cm/2.54),ft=Math.floor(t/12);return ft+"'"+(t-ft*12)+'" ('+cm+' cm)';};

/* =============== scene & lighting =============== */
let renderer=null,scene=null,root=null,camera=null,controls=null,glOK=false,spin=false,dirty=true;
/* adaptive resolution: while the view moves and frames come slowly, draw at a lower pixel ratio; a sharp frame once it stops */
let basePR=1,lowRes=false,slowN=0,lastMove=0,lastFrame=0,wasMoving=false;
let tR=null,tScene=null,tRoot=null,tCam=null;
const reduceMotion=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const fly={active:false,t:0};
const pedMats=[];
function themeNow(){return document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';}
let backdrop='auto';
function backdropKey(){return backdrop==='auto'?(themeNow()==='dark'?'graphite':'studio'):backdrop;}
function applyBackdrop(){const[,a,b]=BACKDROPS[backdropKey()];const r=document.documentElement.style;r.setProperty('--bd-a',a);r.setProperty('--bd-b',b);
  const ped=mixHex(b,a,0.35),dark=lumHex(b)<0.3;pedMats.forEach(m=>{m.color.copy(lin(dark?shade(b,0.12):ped));m.sheen=dark?0.12:0.5;});
  $$('#backdrops button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.bd===backdrop)));const st=$('#stage');if(st)st.classList.toggle('dark-bd',dark);dirty=true;}
/* studio reflections: the room plus a few tiny, very bright lamps - polished metal shows them as crisp glints */
function envFor(r){const pm=new THREE.PMREMGenerator(r),room=new THREE.RoomEnvironment(),g=new THREE.SphereGeometry(0.32,12,8);
  for(const[x,y,z,k] of [[-8,12,10,70],[9,14,6,80],[0,17,-9,60],[12,7,-4,50],[-11,8,-8,50],[4,9,12,45]]){const m=new THREE.MeshBasicMaterial();m.color.setScalar(k);const l=new THREE.Mesh(g,m);l.position.set(x,y,z);room.add(l);}
  const t=pm.fromScene(room,0.035).texture;pm.dispose();return t;}
function contactShadow(){
  const[c,ctx]=cnv(128,128);if(!ctx)return null;
  const g=ctx.createRadialGradient(64,64,4,64,64,64);g.addColorStop(0,'rgba(40,30,20,.5)');g.addColorStop(.45,'rgba(40,30,20,.18)');g.addColorStop(1,'rgba(40,30,20,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const t=new THREE.CanvasTexture(c);const m=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.6),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=0.0015;return m;
}
function setupScene(sc,r){
  sc.environment=envFor(r);sc.userData.envI=0.55;
  const hemi=new THREE.HemisphereLight(0xfff6ea,0x5d554c,0.14);sc.add(hemi);
  const key=new THREE.DirectionalLight(0xfff0dc,1.55);key.position.set(2.8,3.8,2.2);key.castShadow=true;
  const sm=QUALITY==='high'?4096:QUALITY==='perf'?1024:2048;key.shadow.mapSize.set(sm,sm);Object.assign(key.shadow.camera,{left:-1.3,right:1.3,top:2.3,bottom:-0.3,near:0.5,far:12});key.shadow.bias=-0.001;key.shadow.normalBias=0.04;key.shadow.radius=4;sc.add(key);
  const rim=new THREE.DirectionalLight(0xf4dcb4,1.05);rim.position.set(-2.4,2.8,-3.2);sc.add(rim);
  const rim2=new THREE.DirectionalLight(0xdfe7f5,0.45);rim2.position.set(2.8,1.6,-2.5);sc.add(rim2);
  const fill=new THREE.DirectionalLight(0xfff6ea,0.14);fill.position.set(-3,1.2,2.8);sc.add(fill);
  sc.userData.lights={key,rim,rim2,fill,hemi};sc.userData.ped=[];
  const cs=contactShadow();if(cs){sc.add(cs);sc.userData.ped.push(cs);}
  const prof=[[0,0],[0.6,0],[0.632,-0.006],[0.648,-0.026],[0.646,-0.06],[0.62,-0.075],[0,-0.075]].map(p=>new THREE.Vector2(p[0],p[1]));
  const pm=new THREE.MeshPhysicalMaterial({color:lin('#d9d5ce'),roughness:.75,sheen:.5,sheenColor:lin('#ffffff')});pedMats.push(pm);
  const ped=new THREE.Mesh(new THREE.LatheGeometry(prof,96),pm);ped.receiveShadow=true;sc.add(ped);sc.userData.ped.push(ped);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(0.632,0.0045,10,128),new THREE.MeshPhysicalMaterial({color:lin('#c9a55e'),metalness:1,roughness:.28}));ring.rotation.x=Math.PI/2;ring.position.y=-0.005;sc.add(ring);sc.userData.ped.push(ring);
  applyOpts(sc,r,false);
}
function makeRenderer(opts){
  let r=null;try{r=new THREE.WebGLRenderer(Object.assign({antialias:true,alpha:true},opts||{}));}catch(e){r=null;}
  if(!r)return null;r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=0.82;r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;return r;
}
function init3D(){
  scene=new THREE.Scene();root=new THREE.Group();scene.add(root);
  const stage=$('#stage');renderer=makeRenderer();
  if(!renderer){stage.append(Object.assign(document.createElement('div'),{className:'nogl',textContent:'Ta przeglądarka nie obsługuje WebGL, więc manekin 3D się nie wyświetli. Spróbuj w Chrome, Firefoksie lub Safari z włączoną akceleracją sprzętową.'}));return;}
  glOK=true;stage.prepend(renderer.domElement);
  if(GL_INFO.soft)setTimeout(()=>toast('Grafika działa bez karty graficznej (renderowanie programowe: '+(GL_INFO.name.match(/swiftshader|llvmpipe|softpipe|software/i)||['?'])[0]+'). Włączyłem tryb wydajności — obraz będzie mniej płynny niż z GPU.'),1500);
  setupScene(scene,renderer);
  camera=new THREE.PerspectiveCamera(26,1,0.05,60);camera.position.set(0.9,1.2,4.9);
  controls=new THREE.OrbitControls(camera,renderer.domElement);
  controls.target.set(0,0.92,0);controls.enableDamping=true;controls.dampingFactor=0.07;controls.minDistance=0.35;controls.maxDistance=8;controls.maxPolarAngle=Math.PI*0.92;controls.screenSpacePanning=true;controls.autoRotateSpeed=1.4;
  controls.addEventListener('start',()=>{fly.active=false;});
  const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;};
  if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);else window.addEventListener('resize',resize);
  applyOpts(scene,renderer,true);resize();flyTo('full',10,true);
  /* render on demand: only while the camera moves, the model changed or something animates; the shadow map only after a rebuild */
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  const loop=()=>{requestAnimationFrame(loop);if(page!=='creator')return;
    if(fly.active){fly.t=Math.min(1,fly.t+1/40);const k=1-Math.pow(1-fly.t,3);camera.position.lerpVectors(fly.fromP,fly.toP,k);controls.target.lerpVectors(fly.fromT,fly.toT,k);if(fly.t>=1)fly.active=false;dirty=true;}
    controls.autoRotate=spin&&!fly.active;const moved=controls.update(),now=performance.now();
    if(moved||spin||fly.active){const dt=now-lastFrame;if(wasMoving){if(dt>34)slowN++;else if(dt<20)slowN=Math.max(0,slowN-1);}lastMove=now;
      if(!lowRes&&slowN>=3){lowRes=true;renderer.setPixelRatio(Math.max(0.35,basePR*0.5));}}
    else if(lowRes&&now-lastMove>200){lowRes=false;slowN=0;renderer.setPixelRatio(basePR);dirty=true;}
    wasMoving=!!(moved||spin||fly.active);
    if(moved||dirty||spin||OPT.fps){renderer.render(scene,camera);dirty=false;lastFrame=performance.now();fpsTick();}};
  loop();
}
function initThumbs(){
  if(tR!==null)return !!tR;
  tR=makeRenderer({preserveDrawingBuffer:true})||false;if(!tR)return false;
  tR.setPixelRatio(1);tR.setSize(420,560,false);tScene=new THREE.Scene();tRoot=new THREE.Group();tScene.add(tRoot);setupScene(tScene,tR);applyBackdrop();
  tCam=new THREE.PerspectiveCamera(26,420/560,0.05,60);return true;
}
function renderState(state){
  if(!initThumbs())return '';
  try{buildInto(tRoot,state,false);const k=state.height/177;tCam.position.set(0.75,1.2*k,4.6*k);tCam.lookAt(0,0.88*k,0);tR.render(tScene,tCam);
    let u=tR.domElement.toDataURL('image/webp',0.86);if(!u.startsWith('data:image/webp'))u=tR.domElement.toDataURL('image/png');return u;}catch(e){console.error(e);return '';}
}
const FOCUS={full:{y:0.8,d:5.2},upper:{y:1.4,d:1.7},head:{y:1.66,d:0.95},feet:{y:0.08,d:1.2}};
let focusKey='full';
function flyTo(key,azDeg,instant){
  if(!glOK)return;if(key)focusKey=key;
  const tall=camera.aspect<0.85,f=FOCUS[focusKey],k=S.height/177,ty=(focusKey==='feet'?f.y:f.y*k)+(tall&&focusKey==='full'?0.12:0),t=V3(0,ty,0);
  const cur=camera.position.clone().sub(controls.target),az=azDeg!=null?azDeg*Math.PI/180:Math.atan2(cur.x,cur.z);
  const pol=focusKey==='feet'?1.2:focusKey==='head'?1.5:1.42,d=f.d*(focusKey==='full'?k:1)*(tall?1.18:1);
  const p=V3(Math.sin(az)*Math.sin(pol)*d,ty+Math.cos(pol)*d,Math.cos(az)*Math.sin(pol)*d);
  if(reduceMotion||instant||!OPT.anim){camera.position.copy(p);controls.target.copy(t);controls.update();return;}
  Object.assign(fly,{active:true,t:0,fromP:camera.position.clone(),toP:p,fromT:controls.target.clone(),toT:t});
}

/* =============== tags =============== */
function computeTags(s=S){
  const score={},add=(arr,w=1)=>{(arr||[]).forEach(t=>score[t]=(score[t]||0)+w);};
  let win=0,sum=0;const acc=o=>{if(o){win+=o.winter||0;sum+=o.summer||0;}};
  const Tt=TOPS[s.top.type];add(Tt.tags);add((TOP_FITS[s.top.fit]||{}).tags);acc(Tt);if(s.top.sleeve==='none')sum+=0.6;
  const Bt=BOTTOMS[s.bottom.type];add(Bt.tags);add(((Bt.skirt?SKIRT_FITS:PANTS_FITS)[s.bottom.fit]||{}).tags);add((RISES[s.bottom.rise]||{}).tags,0.5);acc(Bt);acc((Bt.skirt?SKIRT_LEN:PANTS_LEN)[s.bottom.length]);
  if(s.mid&&s.mid.type!=='none'){const[D]=midDefs(s.mid.type),Mi=D[s.mid.type];add(Mi.tags,1.1);acc(Mi);}
  if(s.outer.type!=='none'){const O=OUTERS[s.outer.type];add(O.tags,1.2);add((OUTER_FITS[s.outer.fit]||{}).tags);acc(O);}else sum+=0.4;
  if(s.shoes.type!=='none'){const Sh=SHOES[s.shoes.type];add(Sh.tags);acc(Sh);}
  const A=s.acc;if(A.cap.type!=='none'){add(HAT_TAGS[A.cap.type],0.8);if(A.cap.type.includes('beanie')||A.cap.type==='fisherman')win+=0.8;}
  for(const k of ['glasses','watch','bracelet','chain','bag','scarf','tie'])if(A[k].type!=='none')add(ACC_TAGS[A[k].type],0.7);
  if(A.bandana&&A.bandana.type!=='none')add(['western','streetwear','grunge'],0.6);if(A.headband&&A.headband.type!=='none')add(['streetwear','y2k'],0.6);
  if(A.gloves&&A.gloves.type!=='none'){win+=A.gloves.type==='knit'?1:0.5;add(A.gloves.type==='fingerless'?['grunge','streetwear']:['classic'],0.5);}
  if(A.scarf.type!=='none')win+=1;if(A.glasses.type!=='none')sum+=0.3;
  const tags=Object.entries(score).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  const season=win-sum>=1.8?'Na zimę':sum-win>=1.4?'Na lato':'Przejściowy';
  return{tags,season};
}
const cap1=s=>s.charAt(0).toUpperCase()+s.slice(1);

/* =============== UI helpers =============== */
const ICON={
  tee:'<path d="M8 4 3.5 7l2 3.2L8 9v11h8V9l2.5 1.2 2-3.2L16 4c-.8 1.4-2.3 2.2-4 2.2S8.8 5.4 8 4z"/>',
  jacket:'<path d="M8.5 3.5 4 6.5V21h5v-9l3 3 3-3v9h5V6.5l-4.5-3L12 7z"/><path d="M12 7v14"/>',
  pants:'<path d="M7 3h10l1.2 18h-4.4L12 10.5 10.2 21H5.8z"/><path d="M7 6h10"/>',
  shoe:'<path d="M3 17.5c0-3 .5-6.5 1.5-8.5L9 10.5c1 2 3.5 2.6 5.5 3.1 2.8.6 5.5 1.3 6 2.6.4 1 .2 2.3-.5 2.3H3.6c-.4 0-.6-.4-.6-1z"/><path d="M3 16.5h18"/>',
  cap:'<path d="M4 15a8 8 0 0 1 16 0z"/><path d="M14 15h7"/><circle cx="12" cy="7" r=".6"/>',
  glasses:'<circle cx="6.5" cy="13" r="3.5"/><circle cx="17.5" cy="13" r="3.5"/><path d="M10 12.5c1.3-1 2.7-1 4 0M3 12l-1-3M21 12l1-3"/>',
  watch:'<rect x="9" y="2.5" width="6" height="4" rx="1"/><rect x="9" y="17.5" width="6" height="4" rx="1"/><circle cx="12" cy="12" r="5.2"/><path d="M12 9.5V12l1.6 1.2"/>',
  bracelet:'<ellipse cx="12" cy="12" rx="8" ry="4.5"/><ellipse cx="12" cy="12" rx="5.6" ry="2.6"/>',
  ring:'<circle cx="12" cy="14" r="6"/><path d="M9.5 8 12 4.5 14.5 8"/>',
  chain:'<path d="M5 4c0 6.5 3 10 7 10s7-3.5 7-10"/><path d="M12 14v6M9.8 16.3h4.4"/>',
  ear:'<path d="M8 10a4 4 0 1 1 8 0c0 3-3 3.5-3 6.5a2.5 2.5 0 0 1-5 0"/><circle cx="10.5" cy="20" r="1.6"/>',
  wallet:'<path d="M4 5c3 3 5 9 8 9s5-6 8-9"/><rect x="14" y="14" width="7" height="5" rx="1"/>',
  bag:'<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/>',
  scarf:'<path d="M6 4c2 2 10 2 12 0v4c-2 2-10 2-12 0z"/><path d="M9 9v11h4V9"/>',
  tie:'<path d="M10 3h4l-1 3 2 10-3 4-3-4 2-10z"/>',
  body:'<circle cx="12" cy="4.8" r="2.4"/><path d="M8 21v-7.5L6 13V9.5C6 8.4 6.9 7.5 8 7.5h8c1.1 0 2 .9 2 2V13l-2 .5V21"/><path d="M12 13.5V21"/>',
  skin:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16"/>',
  hair:'<path d="M5 14c0-6 3-10 7-10s7 4 7 10c0 2-1 5-2 6M5 14c0 2 1 5 2 6"/><path d="M8 9c2 1 6 1 8-1"/>',
  beard:'<path d="M6 8c0 7 3 12 6 12s6-5 6-12"/><path d="M9 13c2 1 4 1 6 0"/>',
  shirt:'<path d="M8 4 3.5 7l2 3.2L8 9v11h8V9l2.5 1.2 2-3.2L16 4l-4 3z"/><path d="M12 7v13M10.5 10h.01M10.5 13h.01M10.5 16h.01"/>',
  knit:'<path d="M8 4 3.5 7.5 5 18h3V9v11h8V9v9h3l1.5-10.5L16 4c-.8 1.2-2.3 2-4 2S8.8 5.2 8 4z"/><path d="M8 18h8M5.3 16h2.4M16.3 16h2.4"/>',
  hoodie:'<path d="M9 3.5c0 2 1.3 3.5 3 3.5s3-1.5 3-3.5"/><path d="M9 3.5 4 7l1.5 11H8v2h8v-2h2.5L20 7l-5-3.5"/><path d="M11 7v4M13 7v4M9 15h6"/>',
  puffer:'<path d="M8.5 3.5 4 6.5V20h16V6.5l-4.5-3"/><path d="M4 10h16M4 14h16M4 17.5h16M12 4v16"/>',
  coat:'<path d="M8.5 3 4 6v15h16V6l-4.5-3L12 7z"/><path d="M12 7v14M9.5 13h.01M9.5 16h.01M5 16h3"/>',
  blazer:'<path d="M8.5 3 4 6v15h16V6l-4.5-3L12 9z"/><path d="M8.5 3 10 9l2 0M15.5 3 14 9M12 9v12M15 15h3"/>',
  sweatpants:'<path d="M7 3h10l1 16h-4.5L12 10l-1.5 9H6z"/><path d="M6 19h4.5M13.5 19H18M7 6h10M11.5 6v2M12.5 6v2"/>',
  shorts:'<path d="M6 5h12l1 10h-5l-2-5-2 5H5z"/><path d="M6 8h12"/>',
  skirt:'<path d="M8 4h8l3.5 15h-15z"/><path d="M8 7h8M10 7l-1.5 12M14 7l1.5 12"/>',
  boot:'<path d="M7 3h6v10c2 .5 5 1.2 6.5 2.5.8.7.8 2.5-.5 2.5H5.5L5 3z"/><path d="M5.5 15h13"/>',
  loafer:'<path d="M3 16.5c0-2 .5-4 1.5-5h6c1.5 1 4 1.3 6.5 1.6 2.5.3 4 1.2 4 2.4v1H3z"/><path d="M9 12.5h4"/>',
  sandal:'<path d="M4 17.5h16c.5-1.5-1.5-2.5-4-2.5H5z"/><path d="M8 15c1-2 3-2.5 5-1M11 15l1-3"/>',
  bandana:'<path d="M4 6h16l-8 12z"/><path d="M4 6c-1.5 1-1.5 3 0 3M20 6c1.5 1 1.5 3 0 3"/><circle cx="12" cy="10" r="1"/>',
  headband:'<path d="M5 13a7 7 0 0 1 14 0"/><path d="M5 13c2-1.5 12-1.5 14 0M5 13v2c2-1.5 12-1.5 14 0v-2"/><path d="M19 14l2 4M19 14l-.5 4.5"/>',
  gloves:'<path d="M8 21v-4L5.5 13c-.6-1 .7-2 1.5-1.2L8.5 13V5.5a1 1 0 0 1 2 0V11V4a1 1 0 0 1 2 0v7V5a1 1 0 0 1 2 0v6.5-4.5a1 1 0 0 1 2 0V15c0 3-1 4-2 6z"/>',
  layers:'<path d="M12 4 3 9l9 5 9-5z"/><path d="M3 13l9 5 9-5"/>'
};
const svg=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]||ICON.body}</svg>`;
function el(tag,attrs={},html){const e=document.createElement(tag);for(const[k,v] of Object.entries(attrs)){if(k==='on')for(const[ev,f] of Object.entries(v))e.addEventListener(ev,f);else if(v!=null)e.setAttribute(k,v);}if(html!=null)e.innerHTML=html;return e;}
function chips(opts,cur,onPick,label){const c=el('div',{class:'chips',role:'group','aria-label':label||''});for(const[v,l] of opts)c.append(el('button',{class:'chip','aria-pressed':String(v===cur),on:{click:()=>onPick(v)}},esc(l)));return c;}
function swatches(pal,cur,onPick,label,custom=true){
  const c=el('div',{class:'sw',role:'group','aria-label':label||''});cur=(cur||'').toLowerCase();
  for(const[hex,name] of pal)c.append(el('button',{style:`background:${hex}`,title:name,'aria-label':name,'aria-pressed':String(hex.toLowerCase()===cur),on:{click:()=>onPick(hex)}}));
  if(custom){const inPal=pal.some(p=>p[0].toLowerCase()===cur);
    const cu=el('label',{class:'custom',title:'Własny kolor',style:inPal?'':`background:${cur};border:0;outline:2px solid var(--gold);outline-offset:2px`},inPal?'+':'');
    const inp=el('input',{type:'color',value:HEX.test(cur)?cur:'#888888','aria-label':'Własny kolor'});
    inp.addEventListener('input',e=>{cu.style.background=e.target.value;cu.style.border='0';});inp.addEventListener('change',e=>onPick(e.target.value));cu.append(inp);c.append(cu);}
  return c;
}
const nameIn=(pal,hex)=>{const p=pal.find(x=>x[0].toLowerCase()===(hex||'').toLowerCase());return p?p[1]:'własny';};
function palFor(mat){if(mat==='denim')return PAL.denim;if(mat==='leather'||mat==='suede')return PAL.leather;return PAL.basic;}
function shopLinks(q){
  const d=el('div',{class:'shop'}),qq=(q+(S.gender==='m'?' męskie':' damskie')).replace(/\s+/g,' ').trim();
  d.append(el('span',{},'Znajdź podobne'));
  d.append(el('a',{href:'https://www.vinted.pl/catalog?search_text='+encodeURIComponent(qq),target:'_blank',rel:'noopener'},'Vinted'));
  d.append(el('a',{href:'https://www.google.com/search?tbm=shop&q='+encodeURIComponent(qq),target:'_blank',rel:'noopener'},'Google Zakupy'));
  return d;
}
/* =============== accordion panels =============== */
const openCat={L:'bottom',R:null};let openSub=null,rightTab='acc';
function setOpen(node,open){node.classList.toggle('open',open);const h=node.querySelector(':scope > button');if(h)h.setAttribute('aria-expanded',String(open));}
function accItem(side,key,icon,label,summary,dot,build){
  const open=openCat[side]===key,w=el('div',{class:'acc'+(open?' open':'')});
  const h=el('button',{class:'acc-head','aria-expanded':String(open)});
  h.innerHTML=`<span class="ic">${svg(icon)}</span><span class="tx"><b>${esc(label)}</b><small>${esc(summary)}</small></span>${dot?`<span class="cdot" style="background:${dot}"></span>`:''}<span class="chev"></span>`;
  h.addEventListener('click',()=>{const was=openCat[side]===key;w.parentElement.querySelectorAll(':scope > .acc.open').forEach(a=>setOpen(a,false));if(!was){setOpen(w,true);openCat[side]=key;}else openCat[side]=null;});
  const body=el('div',{class:'acc-body'}),inner=el('div',{class:'acc-inner'}),pad=el('div',{class:'acc-pad'});
  if(open)build(pad);else{let built=false;h.addEventListener('click',()=>{if(!built){built=true;build(pad);}});}
  inner.append(pad);body.append(inner);w.append(h,body);return w;
}
function subRow(id,label,valHTML,content){
  const open=openSub===id,w=el('div',{class:'sub'+(open?' open':'')});
  const h=el('button',{class:'sub-head','aria-expanded':String(open)});
  h.innerHTML=`<span>${esc(label)}</span><span class="val">${valHTML}</span><span class="chev"></span>`;
  h.addEventListener('click',()=>{const was=openSub===id;w.parentElement.querySelectorAll(':scope > .sub.open').forEach(s=>setOpen(s,false));if(!was){setOpen(w,true);openSub=id;}else openSub=null;});
  const b=el('div',{class:'sub-body'}),i=el('div',{class:'sub-inner'}),pad=el('div',{class:'sub-pad'});pad.append(content);i.append(pad);b.append(i);w.append(h,b);return w;
}
function switchRow(label,checked,on){const r=el('label',{class:'inline'});const s=el('input',{type:'checkbox',class:'switch'});s.checked=checked;s.addEventListener('change',()=>on(s.checked));r.append(el('span',{},esc(label)),s);return r;}
function rangeRow(label,min,max,step,val,fmt,on){const g=el('div',{class:'rng'}),id='r'+Math.random().toString(36).slice(2,8);const o=el('output',{for:id},fmt(val)),r=el('input',{type:'range',id,min,max,step,value:val,'aria-label':label});
  r.addEventListener('input',()=>{o.textContent=fmt(+r.value);if(OPT.live)on(+r.value,true);});r.addEventListener('change',()=>{on(+r.value,false);});g.append(el('span',{},esc(label)),o,r);return g;}
const dotHTML=hex=>`<i style="background:${hex}"></i>`;
const colorRow=(id,label,pal,cur,set)=>subRow(id,label,dotHTML(cur)+esc(nameIn(pal,cur)),swatches(pal,cur,v=>{set(v);update();},label));
const chipRow=(id,label,dict,cur,set,keys)=>subRow(id,label,esc(dict[cur]||cur),chips((keys||Object.keys(dict)).map(k=>[k,dict[k]]),cur,v=>{set(v);update();},label));
const pct=v=>Math.round(v*100)+'%';
function slotDict(slot,type){return slot==='mid'?midDefs(type)[0]:{top:TOPS,outer:OUTERS,bottom:BOTTOMS,shoes:SHOES}[slot];}
function setType(slot,type){
  const P=S[slot],T=slotDict(slot,type)[type];P.type=type;P.mat='';if(slot==='mid')P.src=MID_ITEMS[type]||'none';
  if(T.defPat)P.pattern=T.defPat;else if(P.pattern==='breton'||P.pattern==='buffalo')P.pattern='solid';
  if(T.def2)P.color2=T.def2;if(slot==='top')P.print=T.defPrint||'none';
  const pal=palFor(T.mat||T.up);if(T.mat&&!pal.some(p=>p[0]===P.color))P.color=pal[Math.min(1,pal.length-1)][0];
  fixState(S);
}
function garmentSummary(k){
  const P=S[k];if(P.type==='none')return k==='mid'?'Brak — dodaj z kategorii Swetry albo Bluzy':'Brak';const T=slotDict(k,P.type)[P.type];
  const parts=[T.label];
  if(k==='top')parts.push((TOP_FITS[P.fit]||{}).label.toLowerCase());
  if(k==='mid')parts.push(((MID_ITEMS[P.type]==='top'?TOP_FITS:OUTER_FITS)[P.fit]||{}).label.toLowerCase());
  if(k==='outer'){parts.push(CLOSES[P.close].toLowerCase());}
  if(P.size&&P.size!=='auto')parts.push('rozm. '+P.size);if(k==='bottom'&&(P.w!=='auto'||P.l!=='auto'))parts.push((P.w!=='auto'?'W'+P.w:'')+(P.l!=='auto'?' L'+P.l:''));
  if(k==='shoes'&&P.eu!=='auto')parts.push('EU '+P.eu);
  if(k==='bottom'){parts.push(((T.skirt?SKIRT_FITS:PANTS_FITS)[P.fit]||{}).label.toLowerCase());if(P.length!=='full')parts.push(((T.skirt?SKIRT_LEN:PANTS_LEN)[P.length]||{}).label.toLowerCase());}
  if(P.pattern&&P.pattern!=='solid')parts.push(PATTERNS[P.pattern].toLowerCase());
  return parts.join(', ');
}
function garmentCommon(pad,k,P,T){
  const mats=T.mats||T.ups;const mat=P.mat||T.mat||T.up;
  if(mats&&mats.length>1)pad.append(subRow(k+'.mat','Materiał',esc(MATS[mat]||mat),chips(mats.map(m=>[m,MATS[m]||cap1(m)]),mat,v=>{P.mat=v;const pal=palFor(v);if(!pal.some(p=>p[0]===P.color))P.color=pal[1][0];update();},'Materiał')));
  const pal=k==='shoes'?PAL.shoe:palFor(mat);
  pad.append(colorRow(k+'.color',mat==='denim'?'Kolor / wash':'Kolor',pal,P.color,v=>P.color=v));
  if(k!=='shoes'){pad.append(chipRow(k+'.pat','Wzór',PATTERNS,P.pattern||'solid',v=>P.pattern=v));
    const needs2=(P.pattern&&P.pattern!=='solid')||T.print||T.trim||T.stripes||T.stripesOpt||T.sleeves2||T.colorblock||T.chestPatch||T.ribStripe||T.patch;
    if(needs2)pad.append(colorRow(k+'.c2',P.pattern&&P.pattern!=='solid'?'Kolor wzoru':'Kolor dodatków',PAL.basic,P.color2,v=>P.color2=v));}
}
/* body measurements for the size hints (measured on the current mannequin) */
function measNow(){try{const s0=S;setupBody();return BC.meas;}catch(e){return null;}}
function sizeHint(m,txt){return el('p',{class:'hint'},txt);}
function sizeRows(pad,k,P){
  const m=measNow();if(!m)return;
  if(k==='top'||k==='mid'||k==='outer'){
    const own=m.size,opts=[['auto','Mój ('+own+')'],...SIZES.map(z=>[z,z])];
    const D=k==='mid'?(MID_ITEMS[P.type]==='top'?'top':'outer'):k,T=slotDict(k,P.type)[P.type]||{};
    const base=D==='top'?((TOP_FITS[P.fit]||{}).e||0.02):((T.e||0.03)*((OUTER_FITS[P.fit]||{}).m||1));
    const SZ=sizeEase(P),feel=fitWord(base+SZ.d);
    const box=el('div');box.append(chips(opts,P.size,v=>{P.size=v;update();},'Rozmiar'));
    box.append(sizeHint(m,`Manekin: ${own} · klatka ${fmtLen(m.chest)} · talia ${fmtLen(m.waist)} · biodra ${fmtLen(m.hips)}. W tym rozmiarze: ${feel}.`));
    pad.append(subRow(k+'.size','Rozmiar',esc(P.size==='auto'?'Mój ('+own+')':P.size),box));
  }else if(k==='bottom'){
    const box=el('div');
    box.append(el('p',{class:'hint lab'},'Talia (W)'),chips([['auto','Mój (W'+m.W+')'],...WAISTS.map(w=>[w,'W'+w])],P.w,v=>{P.w=v==='auto'?'auto':+v;update();},'Talia'));
    if(!BOTTOMS[P.type].skirt)box.append(el('p',{class:'hint lab'},'Długość nogawki (L)'),chips([['auto','Moja (L'+m.L+')'],...INSEAMS.map(l=>[l,'L'+l])],P.l,v=>{P.l=v==='auto'?'auto':+v;update();},'Długość'));
    const dw=P.w==='auto'?0:(+P.w*2.54-m.waist);
    box.append(sizeHint(m,`Manekin: W${m.W} L${m.L} · talia ${fmtLen(m.waist)} · biodra ${fmtLen(m.hips)} · nogawka ${fmtLen(m.inseam)}.`+(P.w==='auto'?'':dw<-3?' Ten rozmiar będzie za ciasny w pasie.':dw>10?' Spodnie będą luźne i opadną na biodra.':'')+(P.l!=='auto'&&+P.l>m.L?' Dłuższa nogawka zmarszczy się nad butem.':'')));
    pad.append(subRow('bottom.size','Rozmiar',esc((P.w==='auto'?'W'+m.W:'W'+P.w)+' '+(P.l==='auto'?'L'+m.L:'L'+P.l)),box));
  }else if(k==='shoes'&&P.type!=='none'){
    const box=el('div');box.append(chips([['auto','Mój (EU '+m.eu+')'],...EU_SIZES.map(e=>[e,String(e)])],P.eu,v=>{P.eu=v==='auto'?'auto':+v;update();},'Rozmiar'));
    const d=P.eu==='auto'?0:+P.eu-m.eu;box.append(sizeHint(m,`Stopa manekina: ${Math.round(m.foot*10)/10} cm (EU ${m.eu}).`+(d<0?' Za małe buty — palce będą ściśnięte.':d>1?' Za duże — but będzie wyraźnie dłuższy od stopy.':'')));
    pad.append(subRow('shoes.size','Rozmiar',esc(P.eu==='auto'?'Mój (EU '+m.eu+')':'EU '+P.eu),box));
  }
}
/* everything currently worn, slot by slot */
/* the catalog in four departments, like a shop: tops, outerwear, bottoms, shoes */
const DEPTS={tops:'Góra',outer:'Okrycia',bottoms:'Dół',shoes:'Buty'};
const CAT_DEPT={tees:'tops',shirts:'tops',knit:'tops',sweats:'tops',jackets:'outer',down:'outer',coats:'outer',tailoring:'outer',jeans:'bottoms',trousers:'bottoms',sport:'bottoms',shorts:'bottoms',skirts:'bottoms',sneakers:'shoes',boots:'shoes',formal:'shoes',summer:'shoes'};
let dept=(()=>{try{const d=localStorage.getItem('fitme.dept');return DEPTS[d]?d:'tops';}catch(e){return 'tops';}})();
const SLOTS=[['top','tee','Góra'],['mid','knit','Sweter / bluza'],['outer','jacket','Kurtka / płaszcz'],['bottom','pants','Dół'],['shoes','shoe','Buty']];
function slotItems(slot){const out=[];for(const c of CATALOG)if(c.slot===slot)for(const it of c.items){const key=typeof it==='string'?it:it[0];if(!out.includes(key))out.push(key);}return out;}
function renderLeft(){
  const box=$('#accL');box.innerHTML='';
  box.append(el('h3',{class:'sec-h'},'Na sobie'));
  for(const[k,icon,label] of SLOTS){const P=S[k];const worn=P.type!=='none';
    box.append(accItem('L',k,icon,label,garmentSummary(k),worn?P.color:null,pad=>slotEditor(pad,k)));}
  box.append(el('h3',{class:'sec-h'},'Katalog'));
  const dp=el('div',{class:'dept',role:'group','aria-label':'Dział'});
  for(const[k,l] of Object.entries(DEPTS))dp.append(el('button',{'aria-pressed':String(k===dept),on:{click:()=>{dept=k;try{localStorage.setItem('fitme.dept',k);}catch(e){}renderLeft();}}},esc(l)));
  box.append(dp);
  for(const c of CATALOG){if(CAT_DEPT[c.id]!==dept)continue;const P=S[c.slot];
    const on=c.items.find(it=>{const key=typeof it==='string'?it:it[0];if(P.type!==key)return false;if(typeof it==='string')return true;return Object.entries(it[1]).every(([kk,v])=>P[kk]===v);});
    const lbl=it=>typeof it==='string'?slotDict(c.slot,it)[it].label:it[2];
    box.append(accItem('L','cat.'+c.id,c.icon,c.label,on?'Na sobie: '+lbl(on):'',null,pad=>{
      const opts=c.items.map((it,i)=>[String(i),lbl(it)]),cur=on?String(c.items.indexOf(on)):'';
      pad.append(chips(opts,cur,v=>{const it=c.items[+v],key=typeof it==='string'?it:it[0];setType(c.slot,key);if(typeof it!=='string')Object.assign(S[c.slot],it[1]);fixState(S);openCat.L=c.slot;openSub=null;update();},c.label));
      pad.append(el('p',{class:'hint'},{top:'Ubierasz jako pierwszą warstwę.',mid:'Zakładasz na koszulkę lub koszulę, pod kurtkę.',outer:'Zakładasz na wierzch.',bottom:'Zastępuje obecny dół.',shoes:'Zastępuje obecne buty.'}[c.slot]));
    }));}
}
function slotEditor(pad,k){
  const P=S[k];
  if(P.type==='none'){pad.append(el('p',{class:'hint'},k==='mid'?'Nic nie masz między koszulką a kurtką. Wybierz sweter lub bluzę w Katalogu poniżej.':'Brak — wybierz coś w Katalogu poniżej.'));return;}
  const T=slotDict(k,P.type)[P.type],items=slotItems(k);
  pad.append(chipRow(k+'.type','Model',Object.fromEntries(items.map(t=>[t,slotDict(k,t)[t].label])),P.type,v=>setType(k,v),items));
  if(k==='top'||(k==='mid'&&MID_ITEMS[P.type]==='top')){
    pad.append(chipRow(k+'.fit','Fit',Object.fromEntries(T.fits.map(f=>[f,TOP_FITS[f].label])),P.fit,v=>P.fit=v));
    sizeRows(pad,k,P);
    if(T.necks&&T.necks.length>1)pad.append(chipRow(k+'.neck','Dekolt',NECKS,P.neck,v=>P.neck=v,T.necks));
    if(T.sleeves.length>1)pad.append(chipRow(k+'.sleeve','Rękawy',SLEEVES,P.sleeve,v=>P.sleeve=v,T.sleeves));
    garmentCommon(pad,k,P,T);
    if(T.print)pad.append(chipRow(k+'.print','Nadruk',PRINTS,P.print,v=>P.print=v));
    if(T.tuck&&k==='top')pad.append(chipRow('top.tuck','Noszenie',TUCKS,P.tuck,v=>P.tuck=v));
    pad.append(shopLinks(`${T.label} ${(TOP_FITS[P.fit]||{}).label||''} ${nameIn(PAL.basic,P.color)}`));
  }else if(k==='outer'||k==='mid'){
    pad.append(chipRow(k+'.fit','Fit',Object.fromEntries(T.fits.map(f=>[f,OUTER_FITS[f].label])),P.fit,v=>P.fit=v));
    sizeRows(pad,k,P);
    if(T.closure!=='none')pad.append(chipRow(k+'.close','Zapięcie',CLOSES,P.close,v=>P.close=v,T.closure==='zip'?['closed','half','open']:['closed','open']));
    garmentCommon(pad,k,P,T);
    pad.append(shopLinks(`${T.label} ${nameIn(palFor(P.mat||T.mat),P.color)}`));
  }else if(k==='bottom'){
    const FT=T.skirt?SKIRT_FITS:PANTS_FITS,LT=T.skirt?SKIRT_LEN:PANTS_LEN;
    pad.append(chipRow('bottom.fit',T.skirt?'Krój':'Fit',Object.fromEntries(T.fits.map(f=>[f,FT[f].label])),P.fit,v=>P.fit=v));
    sizeRows(pad,k,P);
    pad.append(chipRow('bottom.len','Długość',Object.fromEntries(T.lens.map(l=>[l,LT[l].label])),P.length,v=>P.length=v));
    pad.append(chipRow('bottom.rise','Stan',Object.fromEntries(Object.entries(RISES).map(([kk,v])=>[kk,v.label])),P.rise,v=>P.rise=v));
    garmentCommon(pad,'bottom',P,T);
    if(T.belt){pad.append(switchRow('Pasek',!!P.belt,v=>{P.belt=v;update();}));
      if(P.belt){pad.append(colorRow('bottom.belt','Kolor paska',PAL.leather,P.beltColor,v=>P.beltColor=v));pad.append(chipRow('bottom.buckle','Klamra',{classic:'Klasyczna',western:'Western',web:'Parciany pas'},P.buckle,v=>P.buckle=v));}}
    if(T.rips)pad.append(switchRow('Przetarcia na kolanach',!!P.rips,v=>{P.rips=v;update();}));
    if(T.stripesOpt)pad.append(switchRow('Lampasy',!!P.stripes,v=>{P.stripes=v;update();}));
    pad.append(shopLinks(`${T.label} ${FT[P.fit]?FT[P.fit].label:''} ${nameIn(palFor(P.mat||T.mat),P.color)}`));
  }else if(k==='shoes'){
    sizeRows(pad,k,P);garmentCommon(pad,'shoes',P,T);
    if(!T.open)pad.append(colorRow('shoes.c2','Akcenty',PAL.shoe,P.color2,v=>P.color2=v));
    pad.append(colorRow('shoes.sole','Podeszwa',PAL.sole,P.sole,v=>P.sole=v));
    pad.append(chipRow('shoes.socks','Skarpety',SOCKS,P.socks,v=>P.socks=v));
    if(P.socks!=='none')pad.append(colorRow('shoes.sock','Kolor skarpet',PAL.basic,P.sockColor,v=>P.sockColor=v));
    pad.append(shopLinks(`${T.label} ${nameIn(PAL.shoe,P.color)}`));
  }
  pad.append(el('button',{class:'linkbtn',on:{click:()=>{S[k].type='none';if(k==='mid')S.mid.src='none';fixState(S);update();}}},k==='shoes'?'Zdejmij buty (boso)':'Zdejmij'));
}
const metalRow=(id,A)=>subRow(id,'Metal',dotHTML(METALS[A.metal].c)+esc(METALS[A.metal].label),chips(Object.entries(METALS).map(([k,v])=>[k,v.label]),A.metal,v=>{A.metal=v;update();},'Metal'));
const handRow=(id,A,label='Ręka')=>chipRow(id,label,{L:'Lewa',R:'Prawa'},A.hand,v=>A.hand=v);
function accDefs(){const A=S.acc;return[
  ['cap','cap','Czapka',HATS,A.cap.color,pad=>{pad.append(colorRow('cap.color','Kolor',PAL.basic,A.cap.color,v=>A.cap.color=v));if(A.cap.type==='trucker')pad.append(colorRow('cap.c2','Kolor siatki',PAL.basic,A.cap.color2,v=>A.cap.color2=v));
    if(A.cap.type==='baseball'||A.cap.type==='trucker')pad.append(switchRow('Daszkiem do tyłu',!!A.cap.back,v=>{A.cap.back=v;update();}));},q=>'czapka '+q],
  ['glasses','glasses','Okulary',GLASSES,A.glasses.frame,pad=>{pad.append(colorRow('gl.frame','Oprawki',PAL.frame,A.glasses.frame,v=>A.glasses.frame=v));pad.append(colorRow('gl.lens','Szkła',PAL.lens,A.glasses.lens,v=>A.glasses.lens=v));},q=>'okulary '+q],
  ['watch','watch','Zegarek',WATCHES,METALS[A.watch.metal].c,pad=>{pad.append(handRow('watch.hand',A.watch,'Na której ręce'));pad.append(chipRow('watch.strap','Pasek',STRAPS,A.watch.strap,v=>A.watch.strap=v));pad.append(metalRow('watch.metal',A.watch));
    pad.append(colorRow('watch.dial','Tarcza',[['#f1ece2','kremowa'],['#1b1b1c','czarna'],['#1b2a44','granatowa'],['#2f4a3a','zielona'],['#d9d6d0','srebrna']],A.watch.dial,v=>A.watch.dial=v));},q=>'zegarek '+q],
  ['bracelet','bracelet','Bransoletka',BRACELETS,METALS[A.bracelet.metal].c,pad=>{pad.append(handRow('br.hand',A.bracelet));
    pad.append(rangeRow('Pozycja na ręce',0,1,0.01,A.bracelet.pos,v=>v<0.15?'Nadgarstek':v<0.6?'Wyżej':'Przedramię',(v,live)=>{A.bracelet.pos=v;update(live);}));
    pad.append(chipRow('br.count','Ile sztuk',{1:'Jedna',2:'Dwie',3:'Trzy'},String(A.bracelet.count),v=>A.bracelet.count=+v));pad.append(metalRow('br.metal',A.bracelet));},q=>'bransoletka '+q],
  ['ring','ring','Pierścionki',RINGS,METALS[A.ring.metal].c,pad=>{pad.append(handRow('ring.hand',A.ring));pad.append(metalRow('ring.metal',A.ring));},q=>'pierścionek '+q],
  ['chain','chain','Naszyjnik',NECKLACES,METALS[A.chain.metal].c,pad=>{if(A.chain.type!=='choker')pad.append(rangeRow('Długość',0,1,0.01,A.chain.len,v=>v<0.33?'Krótki':v<0.66?'Średni':'Długi',(v,live)=>{A.chain.len=v;update(live);}));pad.append(metalRow('chain.metal',A.chain));},q=>'naszyjnik '+q],
  ['earrings','ear','Kolczyki',EARRINGS,METALS[A.earrings.metal].c,pad=>{pad.append(chipRow('ear.side','W którym uchu',{both:'Oba',L:'Lewe',R:'Prawe'},A.earrings.side,v=>A.earrings.side=v));pad.append(metalRow('ear.metal',A.earrings));},q=>'kolczyki '+q],
  ['wallet','wallet','Łańcuch do spodni',WALLETS,METALS[A.wallet.metal].c,pad=>{pad.append(chipRow('wal.side','Strona',{L:'Lewa',R:'Prawa'},A.wallet.side,v=>A.wallet.side=v));pad.append(metalRow('wal.metal',A.wallet));},q=>'wallet chain łańcuch do spodni'],
  ['bag','bag','Torba',BAGS,A.bag.color,pad=>{pad.append(colorRow('bag.color','Kolor',PAL.leather.concat(PAL.basic.slice(0,8)),A.bag.color,v=>A.bag.color=v));},q=>'torba '+q],
  ['scarf','scarf','Szalik',SCARVES,A.scarf.color,pad=>{pad.append(colorRow('sc.color','Kolor',PAL.basic,A.scarf.color,v=>A.scarf.color=v));pad.append(chipRow('sc.pat','Wzór',PATTERNS,A.scarf.pattern,v=>A.scarf.pattern=v));
    if(A.scarf.pattern!=='solid')pad.append(colorRow('sc.c2','Kolor wzoru',PAL.basic,A.scarf.color2,v=>A.scarf.color2=v));},q=>'szalik '+q],
  ['bandana','bandana','Bandana na szyję',BANDANAS,A.bandana.color,pad=>{pad.append(colorRow('ban.color','Kolor',PAL.basic,A.bandana.color,v=>A.bandana.color=v));pad.append(chipRow('ban.pat','Wzór',PATTERNS,A.bandana.pattern,v=>A.bandana.pattern=v));
    if(A.bandana.pattern!=='solid')pad.append(colorRow('ban.c2','Kolor wzoru',PAL.basic,A.bandana.color2,v=>A.bandana.color2=v));},q=>'bandana chusta na szyję '+q],
  ['headband','headband','Bandana na głowę',HEADBANDS,A.headband.color,pad=>{pad.append(colorRow('hb.color','Kolor',PAL.basic,A.headband.color,v=>A.headband.color=v));pad.append(chipRow('hb.pat','Wzór',PATTERNS,A.headband.pattern,v=>A.headband.pattern=v));
    if(A.headband.pattern!=='solid')pad.append(colorRow('hb.c2','Kolor wzoru',PAL.basic,A.headband.color2,v=>A.headband.color2=v));},q=>'bandana na głowę '+q],
  ['gloves','gloves','Rękawiczki',GLOVES,A.gloves.color,pad=>{pad.append(colorRow('gl.color','Kolor',A.gloves.type==='leather'||A.gloves.type==='driving'?PAL.leather:PAL.basic,A.gloves.color,v=>A.gloves.color=v));},q=>'rękawiczki '+q],
  ['tie','tie','Krawat',TIES,A.tie.color,pad=>{pad.append(colorRow('tie.color','Kolor',PAL.basic,A.tie.color,v=>A.tie.color=v));pad.append(chipRow('tie.pat','Wzór',PATTERNS,A.tie.pattern,v=>A.tie.pattern=v));
    if(A.tie.pattern!=='solid')pad.append(colorRow('tie.c2','Kolor wzoru',PAL.basic,A.tie.color2,v=>A.tie.color2=v));},q=>'krawat '+q]
];}
const ACC_GROUPS={all:'Wszystkie',head:'Głowa',neck:'Szyja',hands:'Dłonie',more:'Dodatki'};
const ACC_OF={cap:'head',glasses:'head',headband:'head',earrings:'head',chain:'neck',scarf:'neck',bandana:'neck',tie:'neck',watch:'hands',bracelet:'hands',ring:'hands',gloves:'hands',bag:'more',wallet:'more'};
let accGroup='all';
function renderRight(){
  const box=$('#accR');box.innerHTML='';
  $$('[data-rtab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rtab===rightTab)));
  if(rightTab==='acc'){
    const ag=el('div',{class:'dept',role:'group','aria-label':'Grupa akcesoriów'});
    for(const[k,l] of Object.entries(ACC_GROUPS))ag.append(el('button',{'aria-pressed':String(k===accGroup),on:{click:()=>{accGroup=k;renderRight();}}},esc(l)));
    box.append(ag);let lastG=null;
    const gOrd=Object.keys(ACC_GROUPS);for(const[k,icon,label,dict,dot,build,q] of accDefs().sort((a,b)=>gOrd.indexOf(ACC_OF[a[0]])-gOrd.indexOf(ACC_OF[b[0]]))){const A=S.acc[k],gk=ACC_OF[k];if(accGroup!=='all'&&gk!==accGroup)continue;
      if(accGroup==='all'&&gk!==lastG){box.append(el('h3',{class:'sec-h'},ACC_GROUPS[gk]));lastG=gk;}
      box.append(accItem('R',k,icon,label,dict[A.type],A.type==='none'?null:dot,pad=>{
        pad.append(chipRow(k+'.type','Typ',dict,A.type,v=>A.type=v));if(A.type==='none')return;build(pad);pad.append(shopLinks(q(dict[A.type].toLowerCase())));}));}
    return;
  }
  const H=S.hair;
  box.append(accItem('R','pose','body','Poza',(POSES[S.pose]||POSES.stand).label,null,pad=>{
    pad.append(chips(Object.entries(POSES).map(([k,v])=>[k,v.label]),S.pose||'stand',v=>{setPose(v);},'Poza'));
    pad.append(el('p',{class:'hint'},'Ubrania, buty, fryzura i dodatki zginają się razem z manekinem. Poza zapisuje się razem z fitem.'));}));
  const btNow=Object.values(BODY_TYPES).find(v=>Math.abs(v.mus-S.mus)<0.02&&Math.abs(v.fat-S.fat)<0.02);
  box.append(accItem('R','body','body','Sylwetka',`${S.gender==='m'?'Men':'Women'}, ${fmtHeight(S.height)}, ${btNow?btNow.label.toLowerCase():'własna'}`,null,pad=>{
    pad.append(chipRow('body.g','Wersja',{m:'Men',f:'Women'},S.gender,g=>{if(g!==S.gender){const was=JSON.stringify(S.hair)===JSON.stringify(S.gender==='f'?FEMALE_HAIR:MALE_HAIR);S.gender=g;
      if(g==='f'&&S.height===180)S.height=168;else if(g==='m'&&S.height===168)S.height=180;if(was)S.hair=clone(g==='f'?FEMALE_HAIR:MALE_HAIR);}flyTo(null);}));
    pad.append(rangeRow('Wzrost',150,205,1,S.height,v=>fmtHeight(v),(v,live)=>{S.height=v;update(live);}));
    const bt=Object.entries(BODY_TYPES).find(([k,v])=>Math.abs(v.mus-S.mus)<0.02&&Math.abs(v.fat-S.fat)<0.02);
    pad.append(el('p',{class:'hint lab'},'Typ sylwetki'),chips(Object.entries(BODY_TYPES).map(([k,v])=>[k,v.label]),bt?bt[0]:'',v=>{S.mus=BODY_TYPES[v].mus;S.fat=BODY_TYPES[v].fat;S.build=1;update();},'Typ sylwetki'));
    pad.append(rangeRow('Masa mięśniowa',-1,1.6,0.01,S.mus,v=>v<-0.4?'Mała':v<0.4?'Przeciętna':v<0.95?'Wysportowana':v<1.3?'Duża':'Kulturysta',(v,live)=>{S.mus=v;update(live);}));
    pad.append(rangeRow('Tkanka tłuszczowa',-1,2.4,0.01,S.fat,v=>v<-0.5?'Bardzo mało':v<-0.1?'Mało':v<0.4?'Przeciętnie':v<0.9?'Więcej':v<1.6?'Dużo':'Bardzo dużo',(v,live)=>{S.fat=v;update(live);}));
    pad.append(rangeRow('Wielkość szkieletu',0.9,1.12,0.01,S.build,v=>v<0.96?'Drobny':v<1.04?'Średni':'Duży',(v,live)=>{S.build=v;update(live);}));
    const prop=el('div');for(const[k,[label,lo,hi]] of Object.entries(FIG))prop.append(rangeRow(label,lo,hi,0.01,S.fig[k],pct,(v,live)=>{S.fig[k]=v;update(live);}));
    prop.append(el('button',{class:'linkbtn',on:{click:()=>{for(const k of Object.keys(FIG))S.fig[k]=1;update();}}},'Przywróć proporcje'));
    pad.append(subRow('body.fig','Proporcje',esc(Object.keys(FIG).some(k=>Math.abs(S.fig[k]-1)>0.005)?'własne':'domyślne'),prop));
  }));
  box.append(accItem('R','skin','skin','Skóra',SKINS[S.skin][1],SKINS[S.skin][0],pad=>{
    pad.append(subRow('skin.tone','Odcień',dotHTML(SKINS[S.skin][0])+esc(SKINS[S.skin][1]),swatches(SKINS,SKINS[S.skin][0],hex=>{const i=SKINS.findIndex(s=>s[0]===hex);if(i>=0){S.skin=i;update();}},'Odcień',false)));
    pad.append(chipRow('skin.fin','Wykończenie',FINISHES,S.finish,v=>S.finish=v));
  }));
  box.append(accItem('R','hair','hair','Fryzura',HAIR[H.style].label,H.style==='none'?null:H.color,pad=>{
    pad.append(chipRow('hair.style','Fryzura',Object.fromEntries(Object.entries(HAIR).map(([k,v])=>[k,v.label])),H.style,v=>H.style=v));
    if(H.style!=='none'){
      if(['bob','lob','long','mullet','wolf','curtains','afro','twists','dreads','braids','ponytail'].includes(H.style))pad.append(rangeRow('Długość',0,1,0.01,H.len,v=>v<0.33?'Krótsze':v<0.66?'Średnie':'Dłuższe',(v,live)=>{H.len=v;update(live);}));
      pad.append(chipRow('hair.tex','Rodzaj włosa',HAIR_TEX,H.texture,v=>H.texture=v));
      pad.append(colorRow('hair.color','Kolor',PAL.hair,H.color,v=>H.color=v));
      if(!['buzz','crew','fade','afro','cornrows','dreads','braids','twists'].includes(H.style))pad.append(chipRow('hair.fringe','Grzywka',FRINGES,H.fringe,v=>H.fringe=v));
    }
  }));
  box.append(accItem('R','beard','beard','Zarost',BEARDS[H.beard],H.beard==='none'?null:H.color,pad=>{
    pad.append(chipRow('beard','Zarost',BEARDS,H.beard,v=>H.beard=v));if(H.beard!=='none')pad.append(colorRow('beard.color','Kolor (wspólny z włosami)',PAL.hair,H.color,v=>H.color=v));
  }));
}
function renderTags(){const{tags,season}=computeTags();$('#tags').innerHTML=`<b>${esc(tags.map(cap1).join(', '))}</b><br>${esc(season)}`;}
let pending=false;
function update(live=false){
  if(!live){renderLeft();renderRight();renderPoses();}
  renderTags();
  if(pending)return;pending=true;
  const run=()=>{pending=false;if(root){const t0=performance.now();buildInto(root,S);window.__lastBuild=performance.now()-t0;warmPose();if(renderer)renderer.shadowMap.needsUpdate=true;dirty=true;}};
  if(glOK)requestAnimationFrame(run);else run();
}

/* =============== storage =============== */
const KEY='fitme.saved.v1',LIKES='fitme.likes.v1';
function load(k){try{const a=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(a)?a:[];}catch(e){return[];}}
function store(k,a){try{localStorage.setItem(k,JSON.stringify(a));return true;}catch(e){return false;}}
function encode(s){return 'FIT3.'+btoa(unescape(encodeURIComponent(JSON.stringify(s)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decode(code){const c=(code||'').trim(),m=c.match(/^FIT([123])\.(.+)$/);if(!m)throw new Error('prefix');let b=m[2].replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';
  const txt=m[1]==='3'?decodeURIComponent(escape(atob(b))):atob(b);return sanitize(JSON.parse(txt));}
let toastT=0;function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2400);}
function refreshCount(){const n=String(load(KEY).length);$$('.savedCount').forEach(e=>e.textContent=n);}

/* =============== pages =============== */
let page='creator';
const PAGE_LABEL={creator:'Kreator',explore:'Społeczność',mine:'Zachowane'};
function go(p){
  page=p;$$('[data-page]').forEach(t=>t.setAttribute('aria-current',t.dataset.page===p?'page':'false'));document.title='Fitme – '+PAGE_LABEL[p].toLowerCase();if(p==='creator')dirty=true;
  for(const id of ['creator','explore','mine']){const s=$('#pg-'+id),on=id===p;s.hidden=!on;if(on){s.classList.remove('enter');void s.offsetWidth;s.classList.add('enter');}}
  if(p==='explore')renderExplore();if(p==='mine')renderMine();
  window.scrollTo(0,0);closeMenu();
}
const thumbs=new Map();let io=null;
function reveal(node){if(reduceMotion||!('IntersectionObserver' in window)){node.classList.add('in');return;}
  if(!io)io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:0.08});io.observe(node);}
const PIECES=[['top','Górę'],['mid','Sweter / bluzę'],['outer','Wierzch'],['bottom','Dół'],['shoes','Buty'],['acc','Akcesoria'],['hair','Fryzurę']];
function fitCard(f,opts){
  const liked=load(LIKES).includes(f.id),{tags,season}=computeTags(f.state);
  const card=el('article',{class:'card'}),inn=el('div',{class:'card-in'}),shot=el('div',{class:'shot'});
  const src=f.thumb||thumbs.get(f.id);
  if(src)shot.append(el('img',{src,alt:'Outfit '+f.name,loading:'lazy'}));else shot.append(el('div',{class:'ph'},'Ubieram manekina…'));
  if(opts.like){const hb=el('button',{class:'heart','aria-pressed':String(liked),'aria-label':(liked?'Usuń polubienie: ':'Polub: ')+f.name},'<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>');
    hb.addEventListener('click',()=>{let L=load(LIKES);const on=!L.includes(f.id);L=on?[...L,f.id]:L.filter(x=>x!==f.id);store(LIKES,L);hb.setAttribute('aria-pressed',String(on));toast(on?'Polubiono: '+f.name:'Usunięto z polubionych');if(page==='mine')renderMine();});shot.append(hb);}
  const meta=el('div',{class:'meta'});meta.append(el('strong',{},esc(f.name)),el('small',{},esc(tags.map(cap1).join(', ')+'. '+season+'.')));
  const cta=el('div',{class:'cta'});
  cta.append(el('button',{class:'dark',on:{click:()=>{S=sanitize(clone(f.state));update();go('creator');flyTo('full');toast('Otwarto: '+f.name);}}},'Otwórz w kreatorze'));
  if(opts.take){const tk=el('div',{class:'take'});
    for(const[k,l] of PIECES){if((k==='outer'||k==='mid')&&(!f.state[k]||f.state[k].type==='none'))continue;if(k==='acc'&&Object.values(f.state.acc).every(a=>a.type==='none'))continue;
      tk.append(el('button',{on:{click:()=>{S[k]=clone(f.state[k]);S=sanitize(S);update();go('creator');toast('Dodano '+l.toLowerCase()+' z fitu „'+f.name+'”');}}},esc(l)));}
    const tb=el('button',{'aria-expanded':'false',on:{click:()=>{const on=!tk.classList.contains('on');tk.classList.toggle('on',on);tb.setAttribute('aria-expanded',String(on));}}},'Weź element');
    cta.append(tb);meta.append(cta,tk);}else meta.append(cta);
  if(opts.remove)cta.append(el('button',{on:{click:()=>{store(KEY,load(KEY).filter(x=>x.id!==f.id));refreshCount();renderMine();toast('Usunięto: '+f.name);}}},'Usuń'));
  inn.append(shot,meta);card.append(inn);reveal(card);return card;
}
let fStyle='all',fSeason='all';
function renderExplore(){
  const q=($('#q').value||'').trim().toLowerCase(),all=new Set();INSPO.forEach(f=>computeTags(f.state).tags.forEach(t=>all.add(t)));
  const fs=$('#fStyle');fs.innerHTML='';fs.append(el('span',{},'Styl'));fs.append(chips([['all','Wszystkie'],...[...all].sort().map(t=>[t,cap1(t)])],fStyle,v=>{fStyle=v;renderExplore();},'Styl'));
  const fz=$('#fSeason');fz.innerHTML='';fz.append(el('span',{},'Sezon'));fz.append(chips([['all','Każdy'],['Na lato','Na lato'],['Przejściowy','Przejściowy'],['Na zimę','Na zimę']],fSeason,v=>{fSeason=v;renderExplore();},'Sezon'));
  const grid=$('#exploreGrid');grid.innerHTML='';
  const list=INSPO.filter(f=>{const{tags,season}=computeTags(f.state);if(fStyle!=='all'&&!tags.includes(fStyle))return false;if(fSeason!=='all'&&season!==fSeason)return false;
    if(q){const st=f.state,hay=[f.name,...tags,season,TOPS[st.top.type].label,OUTERS[st.outer.type].label,BOTTOMS[st.bottom.type].label,SHOES[st.shoes.type].label,HAIR[st.hair.style].label,(PANTS_FITS[st.bottom.fit]||SKIRT_FITS[st.bottom.fit]||{}).label||''].join(' ').toLowerCase();if(!hay.includes(q))return false;}
    return true;});
  if(!list.length)grid.append(el('p',{class:'empty'},'Nic nie pasuje do tych filtrów. Zmień styl albo wyczyść wyszukiwanie.'));
  list.forEach((f,i)=>{const c=fitCard(f,{like:true,take:true});c.classList.add(['tall','','short','','tall','short'][i%6]||'x');grid.append(c);});queueThumbs();
}
let thumbBusy=false;
function queueThumbs(){
  if(thumbBusy)return;const next=INSPO.find(f=>!thumbs.has(f.id));if(!next)return;thumbBusy=true;
  setTimeout(()=>{thumbs.set(next.id,renderState(next.state));thumbBusy=false;const imgSrc=thumbs.get(next.id);
    $$('#exploreGrid .card, #mineGrid .card').forEach(c=>{const n=c.querySelector('strong');if(n&&n.textContent===next.name){const sh=c.querySelector('.shot'),ph=sh.querySelector('.ph');if(ph&&imgSrc){ph.remove();sh.prepend(el('img',{src:imgSrc,alt:'Outfit '+next.name}));}else if(ph)ph.textContent='Podgląd niedostępny';}});
    queueThumbs();},40);
}
let mineView='saved';
function renderMine(){
  $$('[data-mine]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mine===mineView)));
  const g=$('#mineGrid');g.innerHTML='';
  if(mineView==='saved'){const list=load(KEY).slice().reverse();if(!list.length)g.append(el('p',{class:'empty'},'Nie masz jeszcze zapisanych fitów. Ułóż outfit w kreatorze i kliknij „Zapisz fit”.'));
    list.forEach(it=>g.append(fitCard({id:it.id,name:it.name,state:sanitize(it.state),thumb:it.thumb},{remove:true})));}
  else{const L=load(LIKES),list=INSPO.filter(f=>L.includes(f.id));if(!list.length)g.append(el('p',{class:'empty'},'Nie masz polubionych fitów. Serduszkiem w Inspiracjach dodasz je tutaj.'));
    list.forEach(f=>g.append(fitCard(f,{like:true,take:true})));queueThumbs();}
}

/* =============== poses =============== */
const POSE_SHORT={stand:'Stoi',relaxed:'Luz',walk:'Chód',hip:'Biodro',open:'Szeroko',apose:'A',tpose:'T'};
function setPose(v){if(!POSES[v])return;S.pose=v;renderPoses();update();}
function renderPoses(){const b=$('#poses');if(!b)return;b.innerHTML='';b.append(el('span',{},'Poza'));
  for(const[k,v] of Object.entries(POSES))b.append(el('button',{'aria-pressed':String((S.pose||'stand')===k),title:v.label,'aria-label':'Poza: '+v.label,on:{click:()=>setPose(k)}},esc(POSE_SHORT[k]||v.label)));}

/* =============== options panel =============== */
function openOpts(){renderOpts();$('#dlgOpts').showModal();}
function optRow(label,sub,ctl){const r=el('div',{class:'opt'});r.append(el('span',{},esc(label)+(sub?'<small>'+esc(sub)+'</small>':'')));const c=el('div',{class:'ctl'});c.append(ctl);r.append(c);return r;}
function optSwitch(key,after){const s=el('input',{type:'checkbox',class:'switch','aria-label':key});s.checked=!!OPT[key];s.addEventListener('change',()=>{OPT[key]=s.checked;saveOpts();applyOpts(scene,renderer,true);if(after)after();});return s;}
function optRange(key,min,max,step,fmt){const w=el('div',{class:'ctl'}),o=el('output',{},fmt(OPT[key])),r=el('input',{type:'range',min,max,step,value:OPT[key],'aria-label':key});
  r.addEventListener('input',()=>{OPT[key]=+r.value;o.textContent=fmt(OPT[key]);applyOpts(scene,renderer,true);});r.addEventListener('change',saveOpts);w.append(o,r);return w;}
function optChips(key,dict,after){return chips(Object.entries(dict),OPT[key],v=>{OPT[key]=v;saveOpts();applyOpts(scene,renderer,true);if(tScene)applyOpts(tScene,tR,false);renderOpts();if(after)after();},key);}
function renderOpts(){const b=$('#optsBody');if(!b)return;b.innerHTML='';
  b.append(el('h4',{class:'opth'},'Grafika'));
  b.append(optRow('Jakość modeli','Wyższa = gęstsze siatki i ostrzejsze cienie, ale wolniejsze przebudowy. Zmiana przeładuje kreator.',
    chips([['perf','Wydajność'],['std','Standard'],['high','Wysoka']],QUALITY,v=>{if(v===QUALITY)return;try{localStorage.setItem('fitme.quality',v);}catch(e){}toast('Zmieniam jakość grafiki…');setTimeout(()=>location.reload(),350);},'Jakość')));
  b.append(optRow('Rozdzielczość obrazu','Mniej = płynniejszy obrót na słabszym sprzęcie.',optRange('res',0.5,2,0.05,v=>Math.round(v*100)+'%')));
  b.append(optRow('Cienie',null,optSwitch('shadows')));
  b.append(optRow('Licznik klatek (FPS)','Pokazuje płynność i czas ostatniej przebudowy.',optSwitch('fps')));
  b.append(el('h4',{class:'opth'},'Scena'));
  b.append(optRow('Oświetlenie',null,optChips('light',Object.fromEntries(Object.entries(LIGHTS).map(([k,v])=>[k,v.label])))));
  b.append(optRow('Jasność',null,optRange('exposure',0.6,1.5,0.01,v=>Math.round(v*100)+'%')));
  b.append(optRow('Podest pod manekinem',null,optSwitch('ped')));
  b.append(optRow('Prędkość obrotu','Dla przycisku „Obrót”.',optRange('spinSpeed',0.3,5,0.1,v=>v.toFixed(1)+'×')));
  b.append(optRow('Animacje kamery','Płynne przejścia między widokami.',optSwitch('anim')));
  b.append(el('h4',{class:'opth'},'Kreator'));
  b.append(optRow('Podgląd na żywo przy suwakach','Wyłącz, jeśli przesuwanie suwaków się tnie — manekin przebuduje się po puszczeniu.',optSwitch('live')));
  b.append(optRow('Jednostki',null,optChips('units',{cm:'Centymetry',in:'Cale'},()=>{renderLeft();renderRight();})));
  b.append(optRow('Motyw',null,chips([['light','Jasny'],['dark','Ciemny']],themeNow(),v=>{setTheme(v);renderOpts();},'Motyw')));
  b.append(el('h4',{class:'opth'},'Dane'));
  const del=el('button',{class:'pill',on:{click:()=>{const n=load(KEY).length;if(!n){toast('Nie masz zapisanych fitów');return;}if(!confirm('Usunąć wszystkie zapisane fity ('+n+')? Tego nie da się cofnąć.'))return;store(KEY,[]);refreshCount();if(page==='mine')renderMine();toast('Usunięto zapisane fity');}}},'Usuń zapisane fity');
  b.append(optRow('Zapisane fity','Tylko z tego komputera.',del));
}

/* =============== clear reset: the bare mannequin =============== */
function clearAll(){
  const before=clone(S);
  for(const k of ['top','mid','outer','bottom','shoes'])S[k].type='none';S.mid.src='none';S.shoes.socks='none';
  for(const k of Object.keys(S.acc))S.acc[k].type='none';
  S.hair.style='none';S.hair.beard='none';
  S=sanitize(S);openCat.L=null;update();flyTo('full');
  toastAction('Manekin jest pusty','Cofnij',()=>{S=sanitize(before);update();});
}
function toastAction(msg,label,fn){const t=$('#toast');t.innerHTML='';t.append(document.createTextNode(msg));const b=el('button',{on:{click:()=>{fn();t.classList.remove('on','act');}}},esc(label));t.append(b);
  t.classList.add('on','act');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on','act'),6000);}
/* =============== random outfit =============== */
function randomize(){
  const s=clone(S),fem=s.gender==='f',R=Math.random,pc=pal=>pick(pal)[0];
  const tops=Object.keys(TOPS).filter(k=>k!=='none'&&!MID_ITEMS[k]).filter(k=>fem||!['cami','corset','blouse'].includes(k)),T=TOPS[s.top.type=pick(tops)];
  Object.assign(s.top,{fit:pick(T.fits),mat:T.mats?pick(T.mats):'',neck:T.necks?pick(T.necks):'',sleeve:pick(T.sleeves),color:pc(PAL.basic),color2:pc(PAL.basic),pattern:T.defPat||(R()<0.75?'solid':pick(Object.keys(PATTERNS))),tuck:T.tuck&&R()<0.35?pick(['in','front']):'out',print:T.print&&R()<0.35?pick(Object.keys(PRINTS).slice(1)):'none'});
  if(R()<0.45)s.outer.type='none';else{const k=pick(Object.keys(OUTERS).slice(1)),O=OUTERS[k];s.outer.type=k;Object.assign(s.outer,{fit:pick(O.fits),mat:O.mats?pick(O.mats):'',close:O.closure==='zip'?pick(['closed','half','open']):pick(['closed','open']),color:pc(palFor(O.mat)),color2:O.def2||pc(PAL.basic),pattern:O.defPat||(R()<0.85?'solid':pick(['tartan','houndstooth','camo','buffalo']))});}
  if(R()<0.35){const k=pick(Object.keys(MID_ITEMS)),[D]=midDefs(k),Mi=D[k];s.mid.type=k;s.mid.src=MID_ITEMS[k];Object.assign(s.mid,{fit:pick(Mi.fits),mat:Mi.mats?pick(Mi.mats):'',color:pc(PAL.basic),color2:pc(PAL.basic),pattern:Mi.defPat||'solid'});}else{s.mid.type='none';s.mid.src='none';}
  const bottoms=Object.keys(BOTTOMS).filter(k=>k!=='none').filter(k=>fem?R()<0.5||!BOTTOMS[k].skirt:!BOTTOMS[k].skirt&&k!=='leggings'),B=BOTTOMS[s.bottom.type=pick(bottoms)];
  Object.assign(s.bottom,{fit:pick(B.fits),length:R()<0.6&&B.lens.includes('full')?'full':pick(B.lens),rise:pick(Object.keys(RISES)),mat:B.mats?pick(B.mats):'',pattern:R()<0.85?'solid':pick(['pinstripe','tartan','camo','houndstooth']),belt:R()<0.35,rips:R()<0.2,stripes:R()<0.3});
  s.bottom.color=pc(palFor(s.bottom.mat||B.mat));
  const shoes=Object.keys(SHOES).filter(k=>k!=='none'&&(fem||!['pump','ballet','maryjane','kneeboot'].includes(k))),SH=SHOES[s.shoes.type=pick(shoes)];
  Object.assign(s.shoes,{color:pc(PAL.shoe),color2:R()<0.6?s.shoes.color:pc(PAL.shoe),sole:pc(PAL.sole),mat:SH.ups?pick(SH.ups):'',socks:R()<0.4?pick(['ankle','crew']):'none',sockColor:pc(PAL.basic)});
  if(R()<0.6)s.shoes.color2=s.shoes.color;
  const A=s.acc,maybe=(p,dict)=>R()<p?pick(Object.keys(dict).slice(1)):'none';
  A.cap.type=maybe(0.3,HATS);A.cap.color=pc(PAL.basic);A.glasses.type=maybe(0.25,GLASSES);A.watch.type=maybe(0.4,WATCHES);A.bracelet.type=maybe(0.3,BRACELETS);A.bracelet.pos=R()*0.4;
  A.ring.type=maybe(0.2,RINGS);A.chain.type=maybe(0.35,NECKLACES);A.earrings.type=maybe(fem?0.6:0.2,EARRINGS);A.wallet.type=maybe(0.15,WALLETS);A.bag.type=maybe(0.3,BAGS);A.bag.color=pc(PAL.leather);
  A.scarf.type=s.outer.type!=='none'&&R()<0.2?pick(['wrap','long']):'none';A.tie.type='none';
  /* everything is drawn anew: a bandana, kerchief or gloves from the previous outfit must not stay on */
  A.bandana.type=maybe(0.08,BANDANAS);A.headband.type=A.cap.type==='none'?maybe(0.06,HEADBANDS):'none';A.gloves.type=s.outer.type!=='none'?maybe(0.12,GLOVES):'none';
  for(const k of ['bandana','headband','scarf'])A[k].color=pc(PAL.basic);A.gloves.color=pc(PAL.leather);
  const met=pick(Object.keys(METALS));for(const k of ['watch','bracelet','ring','chain','earrings','wallet'])A[k].metal=met;
  S=sanitize(s);update();
}

/* =============== menu & theme =============== */
function closeMenu(){const m=$('#menu');if(m.hidden)return;m.classList.remove('on');$('#burger').setAttribute('aria-expanded','false');setTimeout(()=>{if(!m.classList.contains('on'))m.hidden=true;},260);}
function openMenu(){const m=$('#menu');m.hidden=false;void m.offsetWidth;m.classList.add('on');$('#burger').setAttribute('aria-expanded','true');const first=m.querySelector('.mitem');if(first)first.focus();}
function setTheme(t){document.documentElement.setAttribute('data-theme',t);try{localStorage.setItem('fitme.theme',t);}catch(e){}$$('[data-theme-set]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeSet===t)));applyBackdrop();}
function wire(){
  $('#logo').addEventListener('click',e=>{e.preventDefault();go('creator');});
  $('#burger').addEventListener('click',()=>{$('#menu').hidden?openMenu():closeMenu();});
  document.addEventListener('click',e=>{if(!$('#menu').hidden&&!e.target.closest('#menu')&&!e.target.closest('#burger'))closeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#menu').hidden){closeMenu();$('#burger').focus();}});
  $$('[data-page]').forEach(t=>t.addEventListener('click',()=>go(t.dataset.page)));
  $('#btnOpts').addEventListener('click',openOpts);$('#mOpts').addEventListener('click',()=>{closeMenu();openOpts();});
  $('#optsReset').addEventListener('click',()=>{Object.assign(OPT,OPT_DEF);saveOpts();applyOpts(scene,renderer,true);if(tScene)applyOpts(tScene,tR,false);renderOpts();update();toast('Przywrócono domyślne opcje');});
  $('#dlgOpts').addEventListener('close',()=>{renderPoses();});
  $$('[data-theme-set]').forEach(b=>b.addEventListener('click',()=>setTheme(b.dataset.themeSet)));
  $('#mRandom').addEventListener('click',()=>{go('creator');randomize();});
  $('#mShare').addEventListener('click',()=>{go('creator');$('#btnShare').click();});
  $$('[data-rtab]').forEach(b=>b.addEventListener('click',()=>{rightTab=b.dataset.rtab;renderRight();}));
  const bd=$('#backdrops');bd.append(el('span',{},'Tło'));
  for(const[k,[label,a,b]] of [['auto',['Auto',null,null]],...Object.entries(BACKDROPS)])bd.append(el('button',{'data-bd':k,title:label,'aria-label':'Tło: '+label,'aria-pressed':String(k===backdrop),style:k==='auto'?'':`background:linear-gradient(160deg,${a},${b})`,class:k==='auto'?'auto':'',on:{click:()=>{backdrop=k;try{localStorage.setItem('fitme.backdrop',k);}catch(e){}applyBackdrop();}}},k==='auto'?'A':''));
  const vw=$('#views');
  vw.querySelectorAll('[data-focus]').forEach(b=>b.addEventListener('click',()=>{vw.querySelectorAll('[data-focus]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));flyTo(b.dataset.focus);}));
  $('#btnSpin').addEventListener('click',e=>{spin=!spin;e.currentTarget.setAttribute('aria-pressed',String(spin));});
  $('#btnRandom').addEventListener('click',randomize);
  $('#btnClear').addEventListener('click',clearAll);
  $('#mClear').addEventListener('click',()=>{go('creator');clearAll();});
  $$('dialog [data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  $('#btnSave').addEventListener('click',()=>{$('#saveName').value='Fit '+(load(KEY).length+1);$('#dlgSave').showModal();$('#saveName').select();});
  $('#saveOk').addEventListener('click',()=>{const name=($('#saveName').value||'').trim().slice(0,40)||'Bez nazwy',list=load(KEY);
    list.push({id:'s'+Date.now().toString(36),name,state:clone(S),thumb:renderState(S)});$('#dlgSave').close();
    if(store(KEY,list)){refreshCount();toast('Zapisano: '+name);}else toast('Ta przeglądarka blokuje zapis. Użyj „Udostępnij”, żeby zachować outfit jako kod.');});
  $('#saveName').addEventListener('keydown',e=>{if(e.key==='Enter')$('#saveOk').click();});
  $('#btnShare').addEventListener('click',()=>{$('#codeOut').value=encode(S);$('#codeErr').textContent='';$('#codeIn').value='';$('#dlgShare').showModal();});
  $('#codeCopy').addEventListener('click',async()=>{const t=$('#codeOut');try{await navigator.clipboard.writeText(t.value);toast('Skopiowano kod');}catch(e){t.select();toast('Zaznaczono kod. Skopiuj go skrótem klawiszowym.');}});
  $('#codeLoad').addEventListener('click',()=>{try{S=decode($('#codeIn').value);update();$('#dlgShare').close();toast('Wczytano fit z kodu');}catch(e){$('#codeErr').textContent='To nie jest poprawny kod fitu. Kod zaczyna się od „FIT” i trzeba go wkleić w całości.';}});
  let qt=0;$('#q').addEventListener('input',()=>{clearTimeout(qt);qt=setTimeout(renderExplore,180);});
  $$('[data-mine]').forEach(b=>b.addEventListener('click',()=>{mineView=b.dataset.mine;renderMine();}));
}
/* =============== boot =============== */
try{const h=decodeURIComponent((location.hash||'').slice(1));if(/^FIT[123]\./.test(h))S=decode(h);}catch(e){}
try{const b=localStorage.getItem('fitme.backdrop');if(b&&(b==='auto'||BACKDROPS[b]))backdrop=b;}catch(e){}
init3D();wire();setTheme(themeNow());renderPoses();update();refreshCount();
window.FITME={get S(){return S;},set S(v){S=v;},sanitize,buildInto,computeTags,encode,decode,randomize,renderState,go,update,get root(){return root;}};
