/* dev-only QA helpers (not published) */
window.__montage=async(list,cam,cols=6)=>{initThumbs();const imgs=[];for(const [label,mut] of list){const s=clone(DEFAULT);mut(s);const st=sanitize(s);buildInto(tRoot,st);const k=st.height/177;
  tCam.position.set(cam.p[0],cam.p[1]*k,cam.p[2]);tCam.lookAt(cam.t[0],cam.t[1]*k,cam.t[2]);tR.setClearColor(0xcfcac2,1);tR.render(tScene,tCam);imgs.push([label,tR.domElement.toDataURL('image/jpeg',0.85)]);}
  tR.setClearColor(0x000000,0);
  let ov=document.getElementById('__ov');if(!ov){ov=document.createElement('div');ov.id='__ov';document.body.append(ov);}
  ov.style.cssText=`position:fixed;inset:0;z-index:999;background:#d8d4cd;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px;padding:4px;overflow:auto;align-content:start`;
  ov.innerHTML=imgs.map(([l,u])=>`<figure style="margin:0;position:relative"><img src="${u}" style="width:100%;display:block"><figcaption style="position:absolute;left:4px;top:2px;font:700 14px Arial;color:#000;background:#fffa;padding:0 3px">${l}</figcaption></figure>`).join('');return imgs.length;};
window.__close=()=>{const o=document.getElementById('__ov');if(o)o.remove();};
window.__cam=async(px,py,pz,tx,ty,tz)=>{fly.active=false;camera.position.set(px,py,pz);controls.target.set(tx,ty,tz);controls.update();await new Promise(r=>setTimeout(r,400));};
window.__set=async(mut)=>{const s=clone(DEFAULT);mut&&mut(s);FITME.S=sanitize(s);FITME.update();await new Promise(r=>setTimeout(r,700));return window.__lastBuild|0;};
window.CAM={head:{p:[0.32,1.7,0.62],t:[0,1.655,0]},headSide:{p:[0.66,1.7,0.0],t:[0,1.655,0]},headBack:{p:[0.3,1.72,-0.62],t:[0,1.64,0]},upper:{p:[0.6,1.32,2.15],t:[0,1.2,0]},full:{p:[0.75,1.15,4.4],t:[0,0.9,0]},legs:{p:[0.5,0.55,1.6],t:[0,0.5,0]},feet:{p:[0.45,0.25,0.75],t:[0,0.06,0.04]},torso:{p:[0.5,1.15,1.7],t:[0,1.1,0]}};
window.__devReady=true;
window.__bodyOnly=(st)=>{const saved=S;S=st;try{setupBody();LAYERS=[];const G=new THREE.Group();buildBody(G);const out=new THREE.Group();const b=finalize(G,WARP);out.add(b);out.scale.set(BC.sxz,BC.sy,BC.sxz);return out;}finally{S=saved;}};
window.__montageBody=async(list,cam,cols=6)=>{initThumbs();const imgs=[];for(const [label,mut] of list){const s=clone(DEFAULT);mut(s);const st=sanitize(s);for(const c of tRoot.children.slice())tRoot.remove(c);tRoot.add(__bodyOnly(st));const k=st.height/177;
  tCam.position.set(cam.p[0],cam.p[1]*k,cam.p[2]);tCam.lookAt(cam.t[0],cam.t[1]*k,cam.t[2]);tR.setClearColor(0xf2f2f2,1);tR.render(tScene,tCam);imgs.push([label,tR.domElement.toDataURL('image/jpeg',0.9)]);}
  tR.setClearColor(0,0);let ov=document.getElementById('__ov');if(!ov){ov=document.createElement('div');ov.id='__ov';document.body.append(ov);}
  ov.style.cssText=`position:fixed;inset:0;z-index:999;background:#d8d4cd;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px;padding:4px;overflow:auto;align-content:start`;
  ov.innerHTML=imgs.map(([l,u])=>`<figure style="margin:0;position:relative"><img src="${u}" style="width:100%;display:block"><figcaption style="position:absolute;left:4px;top:2px;font:700 14px Arial;background:#fffa">${l}</figcaption></figure>`).join('');return imgs.length;};
window.__big=async(list,bg=0xe9e7e3)=>{initThumbs();tR.setSize(600,800,false);tCam.aspect=600/800;tCam.updateProjectionMatrix();const imgs=[];for(const [label,mut,cam] of list){const s=clone(DEFAULT);mut(s);const st=sanitize(s);for(const c of tRoot.children.slice())tRoot.remove(c);tRoot.add(cam.body?__bodyOnly(st):(()=>{const g=new THREE.Group();buildInto(g,st);return g;})());const k=st.height/177;
 tCam.position.set(cam.p[0],cam.p[1]*k,cam.p[2]);tCam.lookAt(cam.t[0],cam.t[1]*k,cam.t[2]);tR.setClearColor(bg,1);tR.render(tScene,tCam);imgs.push([label,tR.domElement.toDataURL('image/jpeg',0.9)]);}
 tR.setClearColor(0,0);tR.setSize(420,560,false);tCam.aspect=420/560;tCam.updateProjectionMatrix();
 let ov=document.getElementById('__ov');if(!ov){ov=document.createElement('div');ov.id='__ov';document.body.append(ov);}
 ov.style.cssText=`position:fixed;inset:0;z-index:999;background:#555;display:grid;grid-template-columns:repeat(${Math.min(list.length,4)},1fr);gap:4px;padding:4px;overflow:auto;align-content:start`;
 ov.innerHTML=imgs.map(([l,u])=>`<figure style="margin:0;position:relative"><img src="${u}" style="width:100%;display:block"><figcaption style="position:absolute;left:4px;top:2px;font:700 14px Arial;background:#fffa">${l}</figcaption></figure>`).join('');return imgs.length;};
window.BV={body:1,p:[0,1.0,3.3],t:[0,0.92,0]};window.BS={body:1,p:[3.3,1.0,0.3],t:[0,0.92,0]};window.B34={body:1,p:[1.6,1.1,2.9],t:[0,0.92,0]};
window.__dev=()=>new Promise(r=>{const s=document.createElement('script');s.src='dev.js?'+Date.now();s.onload=r;document.head.append(s);});
window.__hard=async()=>{for(const f of ['core','data','mh','mhdata','body','hair','clothes','outer','shoes','acc','app'])await fetch('js/'+f+'.js',{cache:'reload'});await fetch('fitme.html',{cache:'reload'});await fetch('dev.js',{cache:'reload'});};
window.LOOK=s=>{s.top.type='shirt';s.top.color='#f4f1ea';s.top.tuck='in';s.outer.type='overcoat';s.outer.color='#1e1e1f';s.outer.close='open';s.bottom.type='suit';s.bottom.fit='wide';s.bottom.length='stacked';s.bottom.color='#1e1e1f';s.acc.cap.type='beanie';s.acc.cap.color='#1e1e1f';s.shoes.type='court';};
