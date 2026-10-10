'use strict';
/* =============== Fitme: odzież wierzchnia =============== */
function liningMat(T,P){const l=T.lining;if(l==='tartan')return fabric('twill','#c9b48a','tartan','#7a3b2e');if(l&&HEX.test(l))return fabric('satin',l);return fabric('satin',shade(P.color,-0.35));}
function lapelPair(G,mat,envF,gapF,yb,yg,W,peak){
  for(const sd of [-1,1]){
    const at=(u,v)=>{const y=lerp(yb,yg+(peak?0.032*u*v*v:0),v),env=envF(Math.min(y,1.46)),w=W*Math.pow(smooth(v),0.75)*(peak?1+0.18*v:1),x=Math.min(gapF(y)+0.001+u*w,env.rx*0.97);
      return V3(sd*x,y,frontZ(env,x)+0.004+0.005*u*(1-v*0.4));};
    G.add(mk(surf(8,26,at,{noAO:true}),mat));
    const pts=[];for(let k=0;k<=20;k++)pts.push(at(1,k/20).add(V3(0,0,0.0015)));cordsAlong(G,mat,pts,0.0022);
  }
}
function buildOuter(G,P=S.outer){
  const T=OUTERS[P.type];if(!T||P.type==='none')return;
  const SZ=sizeEase(P);
  const F=OUTER_FITS[P.fit]||OUTER_FITS.regular,prev=LAYERS.slice();
  const mat=P.mat&&(T.mats||[T.mat]).includes(P.mat)?P.mat:T.mat,pat=P.pattern||'solid',c2=P.color2||T.def2||'#e9e2d2';
  MK_STIFF=Math.min(1,(STIFF[mat]||0.4)+(T.structured?0.2:0)+(T.quilt?0.4:0)+(T.lapel?0.1:0));
  const m=fabric(mat,P.color,pat,c2),md=fabric(mat,shade(P.color,-0.07),pat,c2);
  const ribMat=T.ribStripe?fabric('rib',P.color,'breton',c2):fabric('rib',shade(P.color,-0.05));
  const top=NECK_Y,hem=T.hem+(F.hem||0)-SZ.len,e0=Math.max(0.006,T.e*F.m+SZ.d),sleeves=!T.sleeveless,drop=(F.drop||0)+(T.structured?0.012:0);
  const close=T.closure==='none'?'closed':(CLOSES[P.close]?P.close:'closed');
  const lapel=!!T.lapel,vrib=T.collar==='vrib',yb=T.yb||T.vb||1.2,yg=1.4,xg=0.074;
  const vX=y=>y<yb?0:lerp(0,xg,smooth((y-yb)/(yg-yb))*0.7+clamp((y-yb)/(yg-yb),0,1)*0.3);
  const openX=y=>0.085+0.03*smooth((1.18-y)/0.5)+(T.flare?0.03*smooth((1.0-y)/0.55):0);
  let gapX;
  if(close==='open')gapX=y=>Math.max(openX(y),lapel||vrib?vX(y):0);
  else if(close==='half')gapX=y=>y<1.24?0:lerp(0.002,0.062,smooth((y-1.24)/(top-1.24)));
  else gapX=y=>lapel||vrib?vX(y)*(T.closure==='zipAsym'?0.8:1):0;
  const easeAt=y=>{let e=e0;if(T.flare&&y<0.95)e+=T.flare*smooth((0.95-y)/Math.max(0.05,0.95-hem));if(T.band==='rib'&&y<hem+0.05)e=lerp(e*0.55,e,smooth((y-hem)/0.05));
    if(T.drawWaist)e-=0.01*gauss(y-1.04,0.03);if(y>1.28)e=lerp(e,Math.min(e,0.012+e*0.35),smooth((y-1.28)/0.12));if(y>1.45)e=lerp(e,0.012+e*0.3,smooth((y-1.45)/0.055));return e;};
  const rf0=y=>{const b=hangEnv(Math.min(y,1.52),prev);let r=addE(b,easeAt(y));
    if(sleeves){const c=topCap(y,Math.min(e0,0.012+e0*0.35),prev,drop);if(c)r=maxE(r,c);}
    else if(y>0.98){r.rx=Math.min(r.rx,b.rx+0.014+0.01*smooth((1.1-y)/0.12));}
    return r;};
  const isOpen=close!=='closed'||lapel||vrib,chestR=rf0(1.27);
  const qm=T.quilt?y=>1+0.05*Math.pow(Math.abs(Math.sin((y-hem)*Math.PI/0.085)),0.6):null;
  const mod=(a,t,s)=>{let k=qm?qm(s.y):1;
    if(!T.quilt)k*=1+(0.25*e0*Math.sin(a*5+s.y*6)*smooth((1.2-s.y)/0.3)+0.1*e0*fbm(Math.cos(a)*2.6,s.y*2.2,Math.sin(a)*2.6))/Math.max(s.rx,0.08);
    if(isOpen&&close!=='half'&&s.y<1.27){const fr=Math.max(0,Math.sin(a)),b0=s.rz-(s.off||0);k*=1+fr*fr*Math.max(0,chestR.rz*0.96-b0)/b0*0.85*smooth((1.27-s.y)/0.12);}
    return k;};
  const ringF=(y,off=0)=>{const r0=rf0(y),r=off?addE(r0,off):r0,aR=angAtX(r0,Math.max(gapX(y),0.0006));r.a0=Math.PI-aR;r.a1=aR+TAU;r.off=off;return r;};
  const at=(x,y,off=0.002)=>{const r=rf0(y),a=sideAng(x,r),k=mod(a,0,{y,rx:r.rx,rz:r.rz});return ringPt(r,a,y,k,0,off);};
  const thread=shade(P.color,lumHex(P.color)<0.3?0.12:-0.22);
  /* body */
  const nB=T.quilt?130:96;
  if(T.colorblock){G.add(mkMain(tube(vSamples(hem,1.17,50,y=>ringF(y)),{seg:84,mod}),m));G.add(mkMain(tube(vSamples(1.17,1.35,24,y=>ringF(y)),{seg:84,mod}),fabric(mat,c2)));G.add(mkMain(tube(vSamples(1.35,top,24,y=>ringF(y)),{seg:84,mod}),m));}
  else G.add(mkMain(tube(vSamples(hem,top,nB,y=>ringF(y)),{seg:84,mod}),m));
  let anyGap=false;for(let i=0;i<24;i++)if(gapX(lerp(hem,top,i/23))>0.01)anyGap=true;
  if(anyGap){const lm=mk(tube(vSamples(hem+0.004,top-0.004,60,y=>ringF(y,-0.0035)),{seg:84,mod}),liningMat(T,P));lm.userData.lining=true;G.add(lm);}
  /* front edges */
  const edge=(sd,off=0.0015)=>{const pts=[];for(let k=0;k<=44;k++){const y=lerp(hem,top,k/44),g=gapX(y);if(g<0.004)continue;const r=rf0(y),aR=angAtX(r,g),a=sd>0?aR:Math.PI-aR;pts.push(ringPt(r,a,y,mod(a,0,{y,rx:r.rx,rz:r.rz}),0,off));}return pts;};
  if(anyGap)for(const sd of [-1,1])cordsAlong(G,m,edge(sd),0.004);
  /* hem */
  const band=(y0,y1,mat2,bulge)=>G.add(mk(tube(vSamples(y0,y1,5,y=>ringF(y,0.002+roundE(y,y0,y1,bulge||0.003))),{seg:84}),mat2));
  if(T.band==='rib')band(hem,hem+0.05,ribMat);
  else if(T.band==='bind')band(hem,hem+0.014,md,0.002);
  else if(T.band==='cord'){band(hem,hem+0.03,md,0.002);for(const sd of [-1,1]){const p=at(sd*Math.max(0.09,gapX(hem+0.015)+0.03),hem+0.015,0.004);cordsAlong(G,plain('#1b1a19',.6),[p,p.clone().add(V3(0,-0.03,0.004)),p.clone().add(V3(0,-0.05,0.004))],0.0022);G.add(mk(rodGeo(p.clone().add(V3(0,-0.045,0.004)),p.clone().add(V3(0,-0.065,0.004)),0.0055,10),plain('#1b1a19',.5)));}}
  else if(T.band==='waist'){band(hem,hem+0.045,md,0.003);stitchRing(G,hem+0.04,y=>ringF(y,0.004),'#c98a3a');for(const sd of [-1,1]){const b=at(sd*0.16,hem+0.022,0.006);buttonAt(G,b,radialN(b),0.0065,metalMat('silver'),0.004);}}
  else{band(hem,hem+0.018,m,0.003);stitchRing(G,hem+0.024,y=>ringF(y),thread,0,mod);}
  /* collar */
  const gTop=gapX(top);
  switch(T.collar){
    case 'rib':standCollar(G,ribMat,{y:top-0.002,h:0.036,env:rf0,gapX:Math.max(gTop,0.0005)});break;
    case 'stand':standCollar(G,md,{y:top-0.002,h:0.045,env:rf0,gapX:Math.max(gTop,0.0005)});break;
    case 'standLow':standCollar(G,md,{y:top-0.002,h:0.024,env:rf0,gapX:Math.max(gTop,0.0005)});break;
    case 'standTall':standCollar(G,m,{y:top-0.004,h:0.08,env:y=>addE(rf0(y),0.006),gapX:Math.max(gTop,0.0005),lean:0.006,mod:(a,u,s)=>1+0.04*Math.abs(Math.sin(s.y*70))});break;
    case 'shirt':fallCollar(G,md,{y:top-0.004,env:rf0,gapX:Math.max(gTop,0.008),stand:0.028,drop:0.05,point:0.02,spread:0.016,tip:close==='closed'?undefined:0});break;
    case 'hood':hoodDown(G,m,{y:top-0.004,env:rf0,gapX:Math.max(gTop,0.042)});if(close!=='open')drawstrings(G,top-0.015,0.15,[-0.05,0.05],y=>addE(rf0(Math.min(y,top-0.01)),0.004));break;
    case 'notch':case 'peak':fallCollar(G,md,{y:top-0.004,env:rf0,gapX:xg-0.004,stand:0.016,drop:0.044,point:0.008,spread:0.012,tip:0});
      lapelPair(G,md,rf0,y=>Math.max(gapX(y),0.0008),Math.max(yb,hem+0.05),yg,T.collar==='peak'?0.092:0.074,T.collar==='peak');break;
    case 'vrib':{for(const sd of [-1,1]){const pts=[];for(let k=0;k<=30;k++){const y=lerp(hem+0.02,top,k/30),g=Math.max(gapX(y),0.0008),r=rf0(y),a=sd>0?angAtX(r,g):Math.PI-angAtX(r,g);pts.push(ringPt(r,a,y,1,0,0.0035));}if(close==='open'||T.closure==='none'?true:true)cordsAlong(G,ribMat,pts,0.0075);}
      const bk=[];for(let k=0;k<=24;k++){const r=rf0(top),gR=angAtX(r,Math.max(gTop,0.001)),a=lerp(Math.PI-gR,gR+TAU,k/24);bk.push(ringPt(r,a,top,1,0,0.003));}cordsAlong(G,ribMat,bk,0.0075);break;}
  }
  /* closures */
  const zipM=metalMat(mat==='leather'?'silver':'steel');
  const zipTeeth=()=>{const k='zipteeth';if(matCache.has(k))return matCache.get(k);const[c,ctx]=cnv(16,256);let map=null;if(ctx){ctx.fillStyle='#4a4d52';ctx.fillRect(0,0,16,256);for(let y=0;y<256;y+=4){ctx.fillStyle='#d9dce0';ctx.fillRect(y%8?0:8,y,8,3);}map=new THREE.CanvasTexture(c);map.wrapT=THREE.RepeatWrapping;map.repeat.set(1,24);}
    const m3=new THREE.MeshPhysicalMaterial({map,metalness:0.9,roughness:0.2,clearcoat:.8,clearcoatRoughness:.06,envMapIntensity:1.6,side:THREE.DoubleSide,vertexColors:true});matCache.set(k,m3);return m3;};
  const zipStrip=(y0,y1)=>{G.add(mk(patch(y=>rf0(y),FRONT-0.034,FRONT+0.034,y0,y1,0.0016,{nv:40,seg:3,mod}),plain(shade(P.color,-0.32),.8,0,'ztape')));G.add(mk(patch(y=>rf0(y),FRONT-0.009,FRONT+0.009,y0,y1,0.0028,{nv:40,seg:2,mod,uv01:true}),zipTeeth()));const p=at(0,y1-0.02,0.006),pull=mk(new THREE.BoxGeometry(0.011,0.028,0.003),zipM);pull.position.copy(p);G.add(pull);};
  if(T.closure==='zip'){
    if(close==='closed'){if(T.storm){G.add(mk(patch(y=>rf0(y),FRONT-0.07,FRONT+0.07,hem+0.01,top-0.01,0.004,{nv:40,seg:4,mod}),md));for(let i=0;i<6;i++){const b=at(0.03,lerp(top-0.05,hem+0.06,i/5),0.0075);buttonAt(G,b,radialN(b),0.0055,metalMat('steel'));}}else zipStrip(hem+0.004,top-0.004);}
    else if(close==='half'){zipStrip(hem+0.004,1.245);for(const sd of [-1,1])cordsAlong(G,zipM,edge(sd,0.002),0.0024);}
    else for(const sd of [-1,1])cordsAlong(G,zipM,edge(sd,0.002),0.0024);
  }
  if(T.closure==='zipAsym'){
    if(close==='closed'){const pts=[];for(let k=0;k<=24;k++){const y=lerp(hem+0.01,Math.max(yb,1.25),k/24),x=lerp(0.06,-0.065,smooth(k/24));pts.push(at(x,y,0.003));}cordsAlong(G,zipM,pts,0.003);}
    else for(const sd of [-1,1])cordsAlong(G,zipM,edge(sd,0.002),0.0024);
  }
  if(T.closure==='button'||T.closure==='snap'||T.closure==='double'){
    const snap=T.closure==='snap',bm=snap?metalMat('silver'):plain(shade(P.color,lumHex(P.color)<0.3?0.12:-0.35),.35),br=snap?0.0065:(lapel?0.0105:0.0078);
    const n=T.buttons||5,ys=[];
    if(lapel){for(let i=0;i<n;i++)ys.push(yb-0.004-i*0.1);}else{const yt=T.collar==='vrib'?yb:top-0.06;for(let i=0;i<n;i++)ys.push(lerp(yt,hem+0.07,n>1?i/(n-1):0));}
    for(const y of ys){if(y<hem+0.03)continue;
      if(close==='closed'){for(const x of T.closure==='double'?[-0.06,0.06]:[0]){const b=at(x,y,0.0045);buttonAt(G,b,radialN(b),br,bm);}}
      else{const xs=T.closure==='double'?[-1,1]:[-1];for(const sd of xs){const b=at(sd*(gapX(y)+0.02),y,0.0045);buttonAt(G,b,radialN(b),br,bm);}}}
  }
  /* pockets */
  const gp=y=>close==='closed'&&!lapel?0:gapX(y)+0.015;
  const flapX=(x0,x1,y0,y1,mt,o={})=>{for(const sd of [-1,1]){const xa=Math.max(x0,gp(y1)),xb=x1;if(xb-xa<0.03)continue;const e=rf0((y0+y1)/2),a0=sideAng(sd*xa,e),a1=sideAng(sd*xb,e);G.add(mk(patch(rf0,Math.min(a0,a1),Math.max(a0,a1),y0,y1,o.off||0.004,{nv:o.nv||3,seg:8,mod}),mt));
    if(o.btn){const b=at(sd*(xa+xb)/2,y0+0.008,0.008);buttonAt(G,b,radialN(b),0.005,o.btn);}}};
  const slashLine=(mt,x0,y0,x1,y1,r)=>{for(const sd of [-1,1]){const xa=Math.max(x0,gp(y0)+0.005);const pts=[];for(let k=0;k<=8;k++){const t=k/8;pts.push(at(sd*lerp(xa,x1,t),lerp(y0,y1,t),0.003));}cordsAlong(G,mt,pts,r);}};
  switch(T.pockets){
    case 'welt':slashLine(md,0.085,0.98,0.13,1.08,0.0045);break;
    case 'slant':slashLine(md,0.1,hem+0.08,0.15,hem+0.2,0.0028);break;
    case 'zip':slashLine(zipM,0.08,0.98,0.14,1.07,0.0024);break;
    case 'flap':case 'flapHip':{const y=Math.max(hem+0.05,T.pockets==='flapHip'?0.99:0.96);flapX(0.07,0.165,y,y+0.038,md,{btn:T.pockets==='flap'?plain(shade(P.color,-0.35),.4):null});if(T.pockets==='flapHip')slashLine(plain(shade(P.color,-0.4),.9),0.07,y+0.034,0.165,y+0.034,0.0015);break;}
    case 'patch2':case 'patch3':flapX(0.06,0.15,Math.max(hem+0.04,0.9),Math.max(hem+0.04,0.9)+0.12,m,{off:0.003,nv:6});
      if(T.pockets==='patch3'){const e=rf0(1.25),a0=angAtX(e,0.13),a1=angAtX(e,Math.max(0.05,gp(1.3)));if(a0<a1)G.add(mk(patch(rf0,a0,a1,1.19,1.3,0.003,{nv:5,seg:8,mod}),m));}break;
    case 'kangaroo':for(const sd of [-1,1]){const y0=hem+0.055,y1=hem+0.18,xa=Math.max(0.012,gp(y1)),e=rf0((y0+y1)/2),a0=sideAng(sd*xa,e),a1=sideAng(sd*0.15,e);G.add(mk(patch(rf0,Math.min(a0,a1),Math.max(a0,a1),y0,y1,0.004,{nv:6,seg:10,mod}),m));
      const pts=[];for(let k=0;k<=8;k++){const y=lerp(y0+0.01,y1-0.01,k/8);pts.push(at(sd*lerp(0.15,0.125,k/8),y,0.0055));}cordsAlong(G,md,pts,0.003);}break;
  }
  if(T.chestFlaps){flapX(0.045,0.12,1.2,1.3,m,{off:0.003,nv:5});flapX(0.042,0.123,1.28,1.312,md,{off:0.0058,btn:metalMat(mat==='denim'?'silver':'steel')});}
  if(T.chestWelt){const e=rf0(1.27),a0=angAtX(e,0.135),a1=angAtX(e,Math.max(0.065,gp(1.27)));if(a0<a1)G.add(mk(patch(rf0,a0,a1,1.255,1.272,0.003,{nv:2,seg:6,mod}),md));}
  if(T.chestPatch){const e=rf0(1.27),a0=angAtX(e,0.135),a1=angAtX(e,Math.max(0.05,gp(1.3)));if(a0<a1){G.add(mk(patch(rf0,a0,a1,1.18,1.31,0.003,{nv:6,seg:8,mod}),fabric('nylon',c2)));cordsAlong(G,zipM,[at(0.06,1.29,0.0045),at(0.125,1.29,0.0045)],0.0018);}}
  if(T.patch)decal(G,rf0,FRONT-0.78,FRONT-0.34,1.17,1.34,'letter',shade(c2,-0.5),c2,mod);
  if(T.epaulettes)for(const sd of [-1,1]){const pts=[],sides=[];for(let k=0;k<=8;k++){const x=lerp(0.1,BC.shX+0.04,k/8);let lo=1.3,hi=1.55;for(let i=0;i<18;i++){const mid=(lo+hi)/2;if(rf0(mid).rx>=x)lo=mid;else hi=mid;}pts.push(V3(sd*x,lo+0.004,0));sides.push(V3(0,0,1));}
    G.add(mk(ribbon(pts,sides,0.034),md));const b=pts[1].clone().add(V3(0,0.004,0));buttonAt(G,b,V3(0,1,0),0.005,plain(shade(P.color,-0.35),.4));}
  if(T.drawWaist){stitchRing(G,1.055,y=>ringF(y),thread,0,mod);stitchRing(G,1.03,y=>ringF(y),thread,0,mod);}
  if(T.belt){const y0=1.025,y1=1.065,bm=md;
    if(close==='closed'){G.add(mk(tube(vSamples(y0,y1,4,y=>addE(rf0(y),0.007)),{seg:84,mod}),bm));const b=at(0,(y0+y1)/2,0.012);const bk=mk(new THREE.TorusGeometry(0.022,0.004,8,4),plain(shade(P.color,-0.4),.4));bk.position.copy(b);bk.rotation.z=Math.PI/4;G.add(bk);}
    else{G.add(mk(patch(y=>rf0(y),-Math.PI+0.35,-0.35,y0,y1,0.007,{nv:4,seg:40,mod}),bm));for(const sd of [-1,1]){const p0=at(sd*rf0(1.04).rx*0.96,1.04,0.008),pts=[p0];for(let k=1;k<=5;k++)pts.push(p0.clone().add(V3(sd*0.004*k,-0.06*k,0.006*k)));G.add(mk(ribbon(pts,pts.map(()=>V3(0,0,1)),0.038),bm));}}}
  if(T.beltWaist){G.add(mk(tube(vSamples(hem+0.012,hem+0.042,3,y=>ringF(y,0.006)),{seg:84,mod}),md));const b=at(-0.11,hem+0.027,0.01);const bk=mk(new THREE.BoxGeometry(0.03,0.026,0.004),metalMat('silver'));bk.position.copy(b);bk.quaternion.copy(qFromTo(VZ,radialN(b)));G.add(bk);}
  /* sleeves */
  let sleeveF=null;
  if(sleeves){
    const len=Math.min(1.0,0.975+Math.max(0,SZ.sl)),se=Math.max(0.006,T.se*F.m+SZ.d*0.7);
    sleeveF=t=>{if(t>len+1e-9)return null;const inner=Math.max(armAt(t),sleeveEnv(t,prev));let r=inner+se;if(drop&&t<0.25)r+=drop*0.8*(1-t/0.25);if(T.cuff==='rib'&&t>len-0.06)r=inner+0.011;return r;};
    const smod=(a,tt,s)=>T.quilt?1+0.06*Math.pow(Math.abs(Math.sin(s.t*Math.PI/0.12)),0.6):1+(gauss(s.t-0.5,0.09)*0.16*se*Math.sin(s.t*46+a*1.5)*(0.6+0.4*Math.sin(a*2+1))+0.12*se*fbm(Math.cos(a)*2,s.t*5,Math.sin(a)*2))/s.rx;
    const sm=T.sleeves2?fabric('leather',c2):m;
    for(const side of [-1,1]){
      G.add(mkMain(tube(aSamples(-0.06,len,T.quilt?96:72,side,sleeveF),{seg:42,mod:smod}),sm));
      if(T.cuff==='rib')G.add(mk(tube(aSamples(len-0.06,len,5,side,t=>sleeveF(Math.min(t,len))+0.002),{seg:42}),ribMat));
      else if(T.cuff==='button'){G.add(mk(tube(aSamples(len-0.05,len,4,side,t=>sleeveF(len-0.06)+0.003),{seg:42}),md));const P0=armPt(len-0.025,side),f=armFrame(len-0.025,side),Pb=P0.clone().addScaledVector(f.u.clone().sub(f.v).normalize(),sleeveF(len-0.06)+0.0055);buttonAt(G,Pb,Pb.clone().sub(P0),0.0055,metalMat('silver'));}
      else{G.add(mk(tube(aSamples(len-0.02,len,3,side,t=>sleeveF(Math.min(t,len))+0.0025),{seg:42}),sm));}
      if(T.cuff==='zip'){const pts=[];for(let k=0;k<=5;k++){const t=len-0.09*k/5,f=armFrame(t,side);pts.push(armPt(t,side).addScaledVector(f.v.clone().negate(),sleeveF(t)+0.002));}cordsAlong(G,zipM,pts,0.0018);}
      if(T.cuffButtons)for(let i=0;i<3;i++){const t=len-0.035-i*0.016,f=armFrame(t,side),Pb=armPt(t,side).addScaledVector(f.u.clone().sub(f.v).normalize(),sleeveF(t)+0.002);buttonAt(G,Pb,f.u.clone().sub(f.v),0.0042,plain(shade(P.color,-0.35),.35));}
      if(T.stripes)for(const o of [-0.13,0.13]){const sp=aSamples(0.03,len-0.065,40,side,t=>sleeveF(t)+0.0012);G.add(mk(tube(sp,{a0:o-0.05,a1:o+0.05,seg:2,mod:smod}),fabric(mat,c2)));}
      if(T.sleevePocket&&side>0){const sp=aSamples(0.12,0.26,6,side,t=>sleeveF(t)+0.004);G.add(mk(tube(sp,{a0:-0.45,a1:0.45,seg:6}),md));const z=armPt(0.13,side).addScaledVector(armFrame(0.13,side).u,sleeveF(0.13)+0.007);cordsAlong(G,zipM,[z.clone().add(V3(0,0,0.02)),z.clone().add(V3(0,0,-0.02))],0.0016);}
    }
  }
  LAYERS.push({torso:y=>(y>=hem&&y<=top+0.03)?mulE(rf0(Math.min(y,top)),qm?1.05:1.02):null,sleeve:sleeveF,gap:anyGap?gapX:null});
}

/* sweater / sweatshirt worn between the base top and the jacket */
function buildMid(G){const P=S.mid;if(!P||P.type==='none'||!MID_ITEMS[P.type])return;if(MID_ITEMS[P.type]==='top')buildTop(G,P);else buildOuter(G,P);}
