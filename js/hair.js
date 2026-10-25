'use strict';
/* =============== Fitme: fryzury i zarost =============== */
/* hairline height (cos of polar angle) by angular distance from the front */
const HAIRLINE=[[0,.5],[.4,.47],[.68,.4],[.9,.31],[1.08,.24],[1.25,.19],[1.45,.19],[1.7,.16],[1.95,.02],[2.3,-.25],[2.7,-.45],[Math.PI,-.52]];
const HTEX={straight:{amp:.0012,f:12,vol:1,wave:0},wavy:{amp:.0025,f:11,vol:1.12,wave:1},curly:{amp:.004,f:13,vol:1.25,wave:2},coily:{amp:.005,f:15,vol:1.35,wave:3}};
const HAT_LINES={baseball:[[0,.3],[1,.2],[1.57,.12],[2.4,-.04],[Math.PI,-.1]],beanie:[[0,.33],[1.57,.1],[2.4,-.08],[Math.PI,-.14]],fisherman:[[0,.5],[1.57,.36],[Math.PI,.2]],
  bucket:[[0,.24],[1.57,.12],[Math.PI,0]],flat:[[0,.26],[1.57,.12],[Math.PI,-.06]],beret:[[0,.42],[1.57,.3],[Math.PI,.18]],fedora:[[0,.3],[1.57,.18],[Math.PI,.04]]};
HAT_LINES.trucker=HAT_LINES.baseball;HAT_LINES.kufi=[[0,.34],[1.57,.24],[Math.PI,.18]];HAT_LINES.kerchief=[[0,.37],[1.57,.1],[2.5,-.12],[Math.PI,-.17]];
/* a kerchief tied over the head flattens the hair like a cap */
function capType(){const c=S.acc.cap.type;if(c&&c!=='none')return c;return S.acc.headband&&S.acc.headband.type==='full'?'kerchief':'none';}
const angFront=ph=>Math.abs(wrapA(ph-FRONT));
function hairlineNy(ph){return interp1(HAIRLINE,angFront(ph));}
function hatLineNy(ph){const t=capType(),tab=HAT_LINES[t];if(!tab)return null;let d=angFront(ph);const back=S.acc.cap.back&&(t==='baseball'||t==='trucker');if(back)d=Math.PI-d;
  /* with glasses on, a cap with a brim sits higher at the front: the brim clears the frame (it cut through it) */
  return interp1(tab,d)+(back?0:hatLiftNy(t)*smooth((1.6-d)/0.9));}
const BRIM_DROP={baseball:0.014,trucker:0.014,flat:0.008,fedora:0.004,bucket:0.03};
function hatLiftNy(t){if(!BRIM_DROP[t]||typeof glassesTopY!=='function')return 0;const yT=glassesTopY();if(yT==null)return 0;
  const hc=BC.headC,ry=BC.hd.ry,tab=HAT_LINES[t],edge=hc.y+ry*interp1(tab,0);return Math.max(0,(yT+0.004-(edge-BRIM_DROP[t]))/ry);}
/* a headband across the forehead lies over the hair: the hair under it is pressed below its surface (it went through it at
   the sides and the back). Returns how far the band covers a point (0..1) and the band's height over the scalp */
const HB_H=0.011;
function hairBandK(ny,ph){const A=S.acc.headband;if(!A||A.type!=='forehead')return 0;const f=0.5+0.5*Math.sin(ph),c=lerp(-0.12,0.42,f),hw=0.12*(0.75+0.25*Math.sin(ph));return 1-smooth((Math.abs(ny-c)-hw)/0.045);}
function hairTexP(){return HTEX[S.hair.texture]||HTEX.straight;}
const hairLen=(a,b)=>lerp(a,b,clamp(S.hair.len!=null?S.hair.len:0.5,0,1));
/* ---------- shell over the scalp ---------- */
/* the last scalp shell's height over the head: a hanging sheet's strands run over it from the crown */
let SHELL_HF=null;
function hairShell(G,mat,hf,o={}){
  /* (under strands running from the crown, o.under: a plain surface - its noise and clumps stood through the strands) */
  if(o.under!=null)o=Object.assign({},o,{noise:0,messy:0});
  const T=hairTexP(),hc=BC.headC,SH=[];SHELL_HF=hf;
  const g=surf(128,40,(u,v)=>{let shd=1;
    const ph=u*TAU,thMax=Math.acos(clamp(hairlineNy(ph)+(o.line||0),-0.98,0.98)),th=v*thMax,ny=Math.cos(th),d=angFront(ph);
    const dir=headPt(th,ph,0,false).sub(hc).normalize();
    let h=hf(ny,d,ph,dir);
    /* under a hanging sheet (o.under: from this angle from the front) the scalp's hair is the sheet's own: the shell keeps
       down to the skin there (as thick as the sheet's inner strands it stood between them) */
    const uK=o.under!=null?smooth((d-o.under)/0.15)*(1-smooth((ny-0.38)/0.14)):0;
    h*=lerp(1,T.vol,smooth(h/0.02));
    if(o.noise!==0) h+=(o.noise||1)*T.amp*fbm(dir.x*T.f,dir.y*T.f,dir.z*T.f)*smooth(h/0.006);
    /* combed clumps running from the crown */
    if(h>0.006&&o.noise!==0){const cf=foldP(Math.atan2(dir.z,dir.x)*26+3*fbm(dir.x*2,dir.y*2,dir.z*2)),k=smooth((h-0.006)/0.01);h+=0.0028*(o.clump!=null?o.clump:1)*cf*k;shd=lerp(1,lerp(0.9,1.02,cf*0.5+0.5),k);}
    if(o.messy) h+=o.messy*Math.abs(nz3(dir.x*9+1,dir.y*9,dir.z*9))*smooth((ny-0.38)/0.3);
    const band=o.band||(h>0.03?0.32:h>0.015?0.22:0.17);h*=lerp(o.edge!=null?o.edge:0.35,1,Math.sqrt(smooth((1-v)/band)));
    const hl=hatLineNy(ph);if(hl!=null&&ny>hl-0.05)h=Math.min(h,0.0045);
    {const bk=hairBandK(ny,ph);if(bk>0)h=lerp(h,Math.min(h,HB_H-0.003),bk);}
    if(uK>0)h=lerp(h,0.0012,uK);
    SH.push(shd*lerp(0.88,1,smooth(h/0.008)));
    return headPt(th,ph,Math.max(h,0.0012),false);
  },{wrapU:true,uRep:12,vRep:2,noAO:true});
  hairShade(g,SH);hairOutward(g,false);G.add(mk(g,mat));
  if(o.cards)hairCards(G,g,128,40,Object.assign({wrapU:true,out:'centre'},o.cards));
  return g;
}
/* shading normals pointing out of the hair (the surface winding faces inwards on some shells: lit from behind they read
   darker than the strands over them) */
function hairOutward(g,axis){const p=g.attributes.position.array,n=g.attributes.normal.array,hc=BC.headC;let inw=0,cnt=0;
  for(let k=0;k<p.length/3;k+=7){const ox=p[k*3]-hc.x,oy=axis?0:p[k*3+1]-hc.y,oz=p[k*3+2]-hc.z;inw+=(n[k*3]*ox+n[k*3+1]*oy+n[k*3+2]*oz<0)?1:0;cnt++;}
  if(inw>cnt/2){for(let k=0;k<n.length;k++)n[k]=-n[k];const ix=g.index.array;for(let t=0;t<ix.length;t+=3){const q=ix[t+1];ix[t+1]=ix[t+2];ix[t+2]=q;}g.attributes.normal.needsUpdate=true;}}
/* depth in the hair: partings and roots darker, the crowns of the clumps lighter (multiplies the vertex colours) */
function hairShade(g,SH){const c=g.attributes.color;if(!c||SH.length!==c.count)return;for(let i=0;i<c.count;i++){c.setXYZ(i,c.getX(i)*SH[i],c.getY(i)*SH[i],c.getZ(i)*SH[i]);}c.needsUpdate=true;}
/* ---------- hanging sheet (bob, long hair, mullet, fringe) ---------- */
/* a fringe (over the forehead only): each column hangs from the scalp, clear of the head, bridging its hollows */
function sheetColsStatic(o,nu,nv){
  const T=hairTexP(),hc=BC.headC,cols=[],shs=[];
  for(let i=0;i<=nu;i++){
    const u=i/nu,ph0=lerp(o.ph0,o.ph1,u),y0=o.y0(ph0),col=[],shc=[];let Rp=null,y1=o.y1(ph0);
    /* the ends are not cut with a ruler: a soft, uneven line (longer and shorter sections) */
    {const ct=0.5+0.5*Math.sin(ph0*7+1.6*fbm(ph0*2,1.3,2.1));y1-=0.016*ct*smooth((y0-y1-0.06)/0.12);}
    /* pass 1: the radius each row needs (head + thickness) */
    const PH=[],RQ=[],st=Math.abs(y1-y0)/nv;
    for(let j=0;j<=nv;j++){
      const v=j/nv,y=lerp(y0,y1,v),ph=ph0,hr=headHorizR(y,ph),th=lerp(o.thin||0.006,o.thick,smooth(v/0.2));
      let R=hr!=null?hr+th:0;
      if(hr!=null){const bk=hairBandK((y-hc.y)/BC.hd.ry,ph);if(bk>0)R=lerp(R,Math.min(R,hr+HB_H-0.003),bk);}
      if(hr!=null)R+=0.017*gauss(angFront(ph)-Math.PI/2,0.33)*gauss(y-(hc.y-0.012),0.045);
      if(hr==null)R=Math.max(R,BC.neckR+0.016);
      PH.push(ph);RQ.push(R);}
    /* pass 2: hair is stiff enough to bridge: above an obstacle (the nape, the upper back, a collar) it already leans out
       towards it (at most ~55 degrees from vertical) instead of stepping out where it meets it */
    for(let j=nv-1;j>=0;j--)RQ[j]=Math.max(RQ[j],RQ[j+1]-1.4*st);
    for(let j=0;j<=nv;j++){
      const v=j/nv,y=lerp(y0,y1,v),ph=PH[j];let R=RQ[j];
      /* and it never pulls in faster than that */
      if(Rp!=null)R=Math.max(R,Rp-0.5*st);
      Rp=R;
      let Rw=R+(o.flare||0)*smooth(v)*smooth(v);
      if(T.wave)Rw+=0.0028*T.wave*Math.sin((y0-y)*(36+T.wave*22)+ph*3)*smooth(v/0.3);
      /* hair falls in clumps: rounded ridges with narrow partings, growing towards the ends */
      const cl=foldP(ph0*22+2.2*fbm(ph0*3,y*3,1))*0.5+0.5;Rw+=(0.0012+0.003*smooth(v/0.5))*(1-0.75*smooth((v-0.78)/0.22))*(cl-0.5)+0.0012*fbm(ph*9,y*14,2)-0.006*smooth((v-0.88)/0.12);
      shc.push(lerp(0.9,1.03,cl)*lerp(0.92,1,smooth(v/0.25)));
      const pw=ph+(T.wave?0.01*T.wave*Math.sin((y0-y)*28+ph*5)*smooth(v/0.3):0);
      col.push(V3(Math.cos(pw)*Rw,y,hc.z+Math.sin(pw)*Rw));
    }
    cols.push(col);shs.push(shc);
  }
  return {cols,shs};
}
/* collision field for falling hair: the radius a strand keeps round the head axis (the head) and round the body axis (the
   torso and the clothes over it), tabulated over height and angle, with its slope in y: on a near-flat surface (the top of
   the shoulders, the crown) a strand is pushed up onto it, not out sideways */
/* the body's and the clothes' largest radius round the body's axis per (height row, angle) - their triangles sampled every
   few mm; cells between samples filled from their neighbours along the row; 0 where nothing is (above yB, below the figure) */
function bodyRadii(G,yTop,yBot,DY,NA,NY,yB){const BR=new Float32Array(NY*NA),v=new THREE.Vector3();G.updateMatrixWorld(true);let any=false;
  G.traverse(o=>{if(!o.isMesh||!(o.userData.bodySkin||o.userData.ctx==='cloth'))return;const g=o.geometry,p=g.attributes.position;if(!p)return;
    const n=p.count,W=new Float32Array(n*3);for(let i=0;i<n;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);W[i*3]=v.x;W[i*3+1]=v.y;W[i*3+2]=v.z;}
    const ix=g.index?g.index.array:null,nt=ix?ix.length/3:n/3;
    for(let t=0;t<nt;t++){const a=(ix?ix[t*3]:t*3)*3,b=(ix?ix[t*3+1]:t*3+1)*3,c=(ix?ix[t*3+2]:t*3+2)*3;
      const y0=Math.min(W[a+1],W[b+1],W[c+1]),y1=Math.max(W[a+1],W[b+1],W[c+1]);if(y1<yBot||y0>yB)continue;
      const e=Math.max(Math.hypot(W[b]-W[a],W[b+1]-W[a+1],W[b+2]-W[a+2]),Math.hypot(W[c]-W[a],W[c+1]-W[a+1],W[c+2]-W[a+2]),Math.hypot(W[c]-W[b],W[c+1]-W[b+1],W[c+2]-W[b+2])),m=Math.min(24,Math.max(1,Math.ceil(e/0.003)));
      for(let i=0;i<=m;i++)for(let k=0;i+k<=m;k++){const u=i/m,w2=k/m,x=W[a]+(W[b]-W[a])*u+(W[c]-W[a])*w2,y=W[a+1]+(W[b+1]-W[a+1])*u+(W[c+1]-W[a+1])*w2,z=W[a+2]+(W[b+2]-W[a+2])*u+(W[c+2]-W[a+2])*w2;
        if(y>yB||y<yBot)continue;const j=Math.round((yTop-y)/DY);if(j<0||j>=NY)continue;const q=j*NA+((Math.round(((Math.atan2(z,x)/TAU)+1)%1*NA))%NA),r=Math.hypot(x,z);if(r>BR[q]){BR[q]=r;any=true;}}}});
  if(!any)return null;
  /* (each cell the largest of itself and its neighbours up and down: a row sampled between the triangles' sample points
     read lower than the surface) */
  {const B0=BR.slice();for(let j=1;j<NY-1;j++)for(let a=0;a<NA;a++){const k=j*NA+a;BR[k]=Math.max(B0[k],B0[k-NA],B0[k+NA]);}}
  /* (gaps along a row filled from the nearest filled cells either side, up to 6 cells away) */
  for(let j=0;j<NY;j++){const o=j*NA;for(let a=0;a<NA;a++){if(BR[o+a]>0)continue;let l=0,r=0,dl=0,dr=0;for(let d=1;d<=6;d++){if(!l&&BR[o+(a-d+NA)%NA]>0){l=BR[o+(a-d+NA)%NA];dl=d;}if(!r&&BR[o+(a+d)%NA]>0){r=BR[o+(a+d)%NA];dr=d;}}
    if(l&&r)BR[o+a]=(l*dr+r*dl)/(dl+dr);}}
  return BR;}
function hairField(yTop,yBot,G){
  const hc=BC.headC,ry=BC.hd.ry,DY=0.004,NA=180,NY=Math.ceil((yTop-yBot)/DY)+2,Hd=new Float32Array(NY*NA),Bd=new Float32Array(NY*NA),yB=hc.y-ry*0.55;
  /* with the figure at hand: the true surface of the body and the clothes, as the largest radius round the body's axis per
     angle and height (the envelope, a rounded box per height, stood several cm proud of the upper chest at the front
     corners - the hair lay on it, in the air in front of the chest); never more than the envelope: round the shoulders the
     arms and sleeves are in the way of a radius from the axis, and a point on top of the shoulder was flung out over them) */
  const BR=G?bodyRadii(G,yTop,yBot,DY,NA,NY,yB):null;
  for(let j=0;j<NY;j++){const y=yTop-j*DY,env=y<yB?bodyEnv(y,LAYERS):null;
    for(let a=0;a<NA;a++){const ph=a/NA*TAU,hr=headHorizR(y,ph);Hd[j*NA+a]=hr!=null?hr:0;Bd[j*NA+a]=env?envR(env,ph):0;}
    /* (the true surface only below the shoulders, eased in over 4 cm - over the top of the shoulders a radius from the axis
       does not describe a roof, and the rows' sampling jumped there) */
    const wB=BR?1-smooth((y-(BC.shY-0.07))/0.04):0;if(wB>0)for(let a=0;a<NA;a++){const k=j*NA+a;if(BR[k]>0&&Bd[k]>0)Bd[k]=lerp(Bd[k],Math.min(BR[k],Bd[k]),wB);}}
  const at=(T,y,ph,out)=>{const fj=(yTop-y)/DY;if(fj<0||fj>NY-1.001){out[0]=0;return;}const j=Math.floor(fj),tj=fj-j,fa=(((ph%TAU)+TAU)%TAU)/TAU*NA,a=Math.floor(fa)%NA,ta=fa-Math.floor(fa),a1=(a+1)%NA;
    const r0=lerp(T[j*NA+a],T[j*NA+a1],ta),r1=lerp(T[(j+1)*NA+a],T[(j+1)*NA+a1],ta);
    /* no surface at this height on either row: none (an edge row keeps its own value) */
    if(r0<=0&&r1<=0){out[0]=0;return;}out[0]=lerp(r0>0?r0:r1,r1>0?r1:r0,tj);out[1]=((r0>0?r0:r1)-(r1>0?r1:r0))/DY;};
  let sig=yTop.toFixed(4)+','+yBot.toFixed(4);{let h=0;for(let i=0;i<Bd.length;i+=7)h=(h*31+Math.round(Bd[i]*1e4)+Math.round(Hd[i]*1e4)*7)%1000000007;sig+=','+h;}
  return {sig,head:(y,ph,out)=>at(Hd,y,ph,out),body:(y,ph,out)=>at(Bd,y,ph,out)};
}
/* strands of falling hair, simulated (position-based): each one fixed at its root on the scalp, inextensible, stiff against
   bending, pulled by gravity, held off the head and the body (with friction where it rests on them), its neighbours in the
   sheet holding it loosely (it fans, it does not tear). Below the shoulders the front locks are drawn in front of them, the
   rest behind (a push forwards or back where they rest on the shoulder decides the side). A root gives its angle and height on the scalp (or its first two points, p0 and p1), its length, the side it falls
   to (bias) and where it settles across (xt). Returns the strands as columns of points (root first) */
const DRAPE_CACHE=new Map();
function hairDrape(roots,nv,o){
  /* the same hair over the same body and clothes drapes the same: remembered (a change of colour, shoes, ... is free) */
  const key=nv+'|'+(o.steps||0)+'|'+[o.thin,o.thick,o.bodyClr,o.lat,o.band,o.stiff,o.latK||0,o.pushZ||0].join(',')+'|'+o.field.sig+'|'+roots.map(r=>[r.ph,r.y,r.len,r.bias,r.xt,r.p0?r.p0.x+','+r.p0.y+','+r.p0.z+','+r.p1.x+','+r.p1.y+','+r.p1.z:''].map(v=>typeof v==='number'?v.toFixed(5):v).join(',')).join(';');
  const hit=DRAPE_CACHE.get(key);if(hit)return hit.map(c=>c.map(p=>p.clone()));
  /* a wide sheet: every third strand is simulated, the ones between follow their neighbours (kept off the body); in high
     quality every strand is */
  let cols;if(o.lat!==false&&roots.length>12&&!o.all&&QUALITY!=='high'){const gi=[];for(let i=0;i<roots.length;i+=3)gi.push(i);if(gi[gi.length-1]!==roots.length-1)gi.push(roots.length-1);
    const gc=hairDrapeSim(gi.map(i=>roots[i]),nv,o);cols=[];
    for(let q=0;q+1<gi.length;q++){const a=gi[q],b=gi[q+1];for(let i=a;i<b;i++){if(i===a){cols.push(gc[q]);continue;}const t=(i-a)/(b-a);
      cols.push(gc[q].map((P,j)=>{const p=P.clone().lerp(gc[q+1][j],t);return j<2?p:hairKeepOff(p,j/nv,o);}));}}
    cols.push(gc[gc.length-1]);}
  else cols=hairDrapeSim(roots,nv,o);
  DRAPE_CACHE.set(key,cols);if(DRAPE_CACHE.size>12)DRAPE_CACHE.delete(DRAPE_CACHE.keys().next().value);
  return cols.map(c=>c.map(p=>p.clone()));
}
/* push a point between simulated strands out of the head and body (as the strands themselves are) */
function hairKeepOff(p,v,o){const hc=BC.headC,F=o.field,t=[0,0],cl=lerp(o.thin,o.thick,smooth(v/0.2));
  for(let it=0;it<2;it++){{const dx=p.x,dz=p.z-hc.z,r=Math.hypot(dx,dz)||1e-6;F.head(p.y,Math.atan2(dz,dx),t);if(t[0]>0&&r<t[0]+cl){const d=(t[0]+cl-r)/(1+t[1]*t[1]);p.x+=dx/r*d;p.z+=dz/r*d;p.y-=t[1]*d;}}
    {const dx=p.x,dz=p.z,r=Math.hypot(dx,dz)||1e-6;F.body(p.y,Math.atan2(dz,dx),t);if(t[0]>0&&r<t[0]+o.bodyClr){const d=(t[0]+o.bodyClr-r)/(1+t[1]*t[1]);p.x+=dx/r*d;p.z+=dz/r*d;p.y-=t[1]*d;}}}
  return p;}
function hairDrapeSim(roots,nv,o){
  const hc=BC.headC,ry=BC.hd.ry,n=roots.length,np=nv+1,F=o.field,tmp=[0,0];
  const X=new Float32Array(n*np*3),Q=new Float32Array(n*np*3),D=new Float32Array(n*np*3),CT=new Uint8Array(n*np),CB=new Uint8Array(n*np),SEG=new Float32Array(n),CL=new Float32Array(np);
  for(let j=0;j<np;j++)CL[j]=lerp(o.thin,o.thick,smooth(j/nv/0.2));
  /* how far a point keeps from the head: its clearance, more over the ears, less under a headband */
  const headClr=(j,y,ph)=>{let c=CL[j]+0.017*gauss(angFront(ph)-Math.PI/2,0.33)*gauss(y-(hc.y-0.012),0.045);
    if(o.band){const bk=hairBandK((y-hc.y)/ry,ph);if(bk>0)c=lerp(c,Math.min(c,HB_H-0.003),bk);}return c;};
  const yHd=hc.y-ry*0.98,yBd=hc.y-ry*0.55,collide=(k,j)=>{let hit=0;const x=X[k],y=X[k+1],z=X[k+2];
    /* head (axis through its centre) */
    if(y>yHd){const dx=x,dz=z-hc.z,r=Math.sqrt(dx*dx+dz*dz)||1e-6,ph=Math.atan2(dz,dx);F.head(y,ph,tmp);
      if(tmp[0]>0){const R=tmp[0]+headClr(j,y,ph);if(r<R){const g=tmp[1],nn=1+g*g,d=(R-r)/nn;X[k]+=dx/r*d;X[k+2]+=dz/r*d;X[k+1]-=g*d;hit|=1;}}}
    /* body and clothes (axis through the torso; pushZ: a sheet on the front is pushed straight forward, not out from the
       axis, which spread its columns sideways) */
    if(X[k+1]<yBd){const dx=X[k],dz=X[k+2],r=Math.sqrt(dx*dx+dz*dz)||1e-6,ph=Math.atan2(dz,dx);F.body(X[k+1],ph,tmp);
      if(tmp[0]>0){const R=tmp[0]+o.bodyClr;if(r<R){if(o.pushZ&&dz>0){X[k+2]=Math.max(dz,Math.sqrt(Math.max(0,R*R-dx*dx)));hit|=2;}else{const g=tmp[1],nn=1+g*g,d=(R-r)/nn;X[k]+=dx/r*d;X[k+2]+=dz/r*d;X[k+1]-=g*d;hit|=2;}}}}
    return hit;};
  /* start: hanging straight down from the root, pushed out of the head and body */
  for(let s=0;s<n;s++){const R0=roots[s],seg=R0.len/nv;SEG[s]=seg;
    for(let j=0;j<np;j++){const k=(s*np+j)*3;
      if(j<2&&R0.p0){const P=j?R0.p1:R0.p0;X[k]=P.x;X[k+1]=P.y;X[k+2]=P.z;}
      else if(j<2){const y=R0.y-j*seg,hr=headHorizR(y,R0.ph),r=(hr!=null?hr:BC.neckR)+o.thin;X[k]=Math.cos(R0.ph)*r;X[k+1]=y;X[k+2]=hc.z+Math.sin(R0.ph)*r;}
      else{const p=(s*np+j-1)*3;X[k]=X[p];X[k+1]=X[p+1]-seg;X[k+2]=X[p+2];for(let it=0;it<6;it++)collide(k,j);}
      Q[k]=X[k];Q[k+1]=X[k+1];Q[k+2]=X[k+2];}}
  /* rest spacing between neighbouring strands (the sheet may fan out to half as much again, not further) */
  const LAT=new Float32Array(n*np);for(let s=0;s+1<n;s++)for(let j=0;j<np;j++){const a=(s*np+j)*3,b=a+np*3;LAT[s*np+j]=Math.hypot(X[a]-X[b],X[a+1]-X[b+1],X[a+2]-X[b+2])*(o.latK||1.5)+(o.latK?0:0.002);}
  const loose=o.lat===false,dt=o.dt||(loose?1/65:1/50),G=9.8*dt*dt,yS=BC.shY+0.03,steps=o.steps||(loose?150:80),stiff=o.stiff!=null?o.stiff:0.01;
  for(let st=0;st<steps;st++){
    const damp=st<steps*0.6?0.95:0.85;
    for(let s=0;s<n;s++){const bias=roots[s].bias;for(let j=2;j<np;j++){const k=(s*np+j)*3,vx=(X[k]-Q[k])*damp,vy=(X[k+1]-Q[k+1])*damp,vz=(X[k+2]-Q[k+2])*damp;
      Q[k]=X[k];Q[k+1]=X[k+1];Q[k+2]=X[k+2];const w=bias?gauss(X[k+1]-yS,0.07):0;
      /* the push to the front or back moves hair above the shoulders (it picks its side before it lands: landing on
         top it slid along it like a flap) and hair resting on them (off them, down to its tip), never hair already
         falling below them */
      X[k]+=vx+(roots[s].xt-X[k])*8*w*dt*dt;X[k+1]+=vy-G;X[k+2]+=vz+(CT[s*np+j]||X[k+1]>yS+0.03?bias*16*w*dt*dt:0);}}
    /* neighbours in the sheet: at most half as far again apart as they started */
    if(o.lat!==false)for(let s=0;s+1<n;s++)for(let j=2;j<np;j++){const a=(s*np+j)*3,b=a+np*3,dx=X[b]-X[a],dy=X[b+1]-X[a+1],dz=X[b+2]-X[a+2],d=Math.sqrt(dx*dx+dy*dy+dz*dz),L=LAT[s*np+j];
      if(d>L){const c=(d-L)/d*0.5;X[a]+=dx*c;X[a+1]+=dy*c;X[a+2]+=dz*c;X[b]-=dx*c;X[b+1]-=dy*c;X[b+2]-=dz*c;}}
    /* follow the leader, from the root down: each particle exactly one segment from its parent (the strand cannot stretch),
       its direction drawn a little towards the segment above (stiffness), then out of the head and body */
    for(let s=0;s<n;s++){const L=SEG[s],aMax=Math.min(0.7,L/(o.rmin||0.06)),cosMax=Math.cos(aMax),sinMax=Math.sin(aMax);for(let j=2;j<np;j++){const k=(s*np+j)*3,a=k-3,b=k-6;D[k]=X[k];D[k+1]=X[k+1];D[k+2]=X[k+2];
      let dx=X[k]-X[a],dy=X[k+1]-X[a+1],dz=X[k+2]-X[a+2],d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1e-9;dx/=d;dy/=d;dz/=d;
      {const pd=Math.sqrt((X[a]-X[b])**2+(X[a+1]-X[b+1])**2+(X[a+2]-X[b+2])**2)||1e-9,px=(X[a]-X[b])/pd,py=(X[a+1]-X[b+1])/pd,pz=(X[a+2]-X[b+2])/pd;
        dx+=(px-dx)*stiff;dy+=(py-dy)*stiff;dz+=(pz-dz)*stiff;d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1e-9;dx/=d;dy/=d;dz/=d;d=1;
        /* hair cannot fold tighter than a few centimetres round: the bend per segment is limited (a tip that met the
           shoulder lifts off it a little instead of lying flat along its top) */
        const c=dx*px+dy*py+dz*pz;if(c<cosMax){let qx=dx-px*c,qy=dy-py*c,qz=dz-pz*c;const ql=Math.sqrt(qx*qx+qy*qy+qz*qz)||1e-9;qx/=ql;qy/=ql;qz/=ql;
          dx=px*cosMax+qx*sinMax;dy=py*cosMax+qy*sinMax;dz=pz*cosMax+qz*sinMax;}}
      X[k]=X[a]+dx/d*L;X[k+1]=X[a+1]+dy/d*L;X[k+2]=X[a+2]+dz/d*L;
      let hit=0;for(let r=0;r<2;r++){const h=collide(k,j);if(!h)break;hit|=h;const ex=X[k]-X[a],ey=X[k+1]-X[a+1],ez=X[k+2]-X[a+2],ed=Math.sqrt(ex*ex+ey*ey+ez*ez)||1e-9;X[k]=X[a]+ex/ed*L;X[k+1]=X[a+1]+ey/ed*L;X[k+2]=X[a+2]+ez/ed*L;}
      /* friction: a strand resting on the shoulder slides off it slowly */
      CT[s*np+j]=hit?1:0;CB[s*np+j]=hit&2?1:0;if(hit){Q[k]=lerp(Q[k],X[k],0.45);Q[k+1]=lerp(Q[k+1],X[k+1],0.45);Q[k+2]=lerp(Q[k+2],X[k+2],0.45);}
      D[k]=X[k]-D[k];D[k+1]=X[k+1]-D[k+1];D[k+2]=X[k+2]-D[k+2];}
      /* the moves made by the leader-following become velocity unless taken back: each particle takes back most of its
         child's move (the damping of "dynamic follow the leader") */
      for(let j=2;j+1<np;j++){const k=(s*np+j)*3;Q[k]+=0.9*D[k+3];Q[k+1]+=0.9*D[k+4];Q[k+2]+=0.9*D[k+5];}}
    /* a cloth sheet (latK: a scarf's end) keeps its width: its columns are held at their spacing after they fall (the
       collision pushes each one out from the body's axis, spreading the sheet into a cape), then kept off the body */
    if(o.latK)for(let it=0;it<3;it++){for(let s=0;s+1<n;s++)for(let j=2;j<np;j++){const a=(s*np+j)*3,b=a+np*3,dx=X[b]-X[a],dy=X[b+1]-X[a+1],dz=X[b+2]-X[a+2],d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1e-9,L=LAT[s*np+j]/o.latK;
        if(Math.abs(d-L)>L*0.03){const c=(d-L)/d*0.5;X[a]+=dx*c;X[a+1]+=dy*c;X[a+2]+=dz*c;X[b]-=dx*c;X[b+1]-=dy*c;X[b+2]-=dz*c;}}
      for(let s=0;s<n;s++)for(let j=2;j<np;j++)collide((s*np+j)*3,j);}}
  /* hair that ends just past where it meets the shoulders or a collar rests there (its ends a little beyond the
     contact): left to lie on, it slid down the slope of the shoulder and lay out flat to its tip like a wing */
  const yRest=BC.shY+0.15;
  for(let s=0;s<n;s++){const L=SEG[s];let j0=-1;for(let j=2;j<np;j++){const k=(s*np+j)*3;if(CB[s*np+j]&&X[k+1]<yRest){j0=j;break;}}
    if(j0<0||(np-1-j0)*L>=0.05)continue;const je=Math.min(np-1,j0+Math.max(1,Math.round(0.025/L))),ke=(s*np+je)*3;
    for(let j=je+1;j<np;j++){const k=(s*np+j)*3;X[k]=X[ke];X[k+1]=X[ke+1];X[k+2]=X[ke+2];}}
  const cols=[];for(let s=0;s<n;s++){const c=[];for(let j=0;j<np;j++){const k=(s*np+j)*3;c.push(V3(X[k],X[k+1],X[k+2]));}cols.push(c);}
  return cols;
}
/* how a strand rooted at angle ph falls over the shoulders (S.hair.drape): side +1 in front of them, -1 down the back;
   xt: where it settles across the body. auto: the locks from the front of the head in front, the rest behind; front:
   all but the back of the head in front; left/right: that side of the head (the mannequin's own, front to well behind the ear)
   in front of that shoulder, the rest down the back */
function drapeSide(ph,mode){const af=angFront(ph),sx=Math.cos(ph)>=0?1:-1,back={side:-1,xt:clamp(Math.cos(ph)*0.12,-0.085,0.085)};
  if(mode==='back')return back;
  if(mode==='left'||mode==='right'){const t=mode==='left'?1:-1;return sx===t&&af<2.6?{side:1,xt:t*lerp(0.05,0.11,smooth((af-0.9)/1.7))}:back;}
  const sA=mode==='front'?2.3:1.5;return af<sA?{side:1,xt:sx*lerp(0.06,0.13,smooth((af-0.9)/(sA-0.9)))}:back;}
function hairSheet(G,mat,o){
  const T=hairTexP(),hc=BC.headC,nv=o.nv||48;
  if(o.noBody){const nu=o.nu||96,{cols,shs}=sheetColsStatic(o,nu,nv);return sheetMesh(G,mat,o,cols,shs,nu,nv);}
  /* hair long enough to reach the shoulders parts over them: locks in front, the rest down the back */
  const span=o.ph1-o.ph0,yMin=Math.min(...Array.from({length:25},(_,i)=>o.y1(o.ph0+span*i/24))),split=yMin<BC.shY+0.08,mode=S.hair.drape||'auto';
  /* one panel per run of strands falling the same way (a parting over each shoulder where the side changes) */
  const parts=[];if(split){const K=240;let a=o.ph0,cur=drapeSide(o.ph0,mode).side;
      for(let k=1;k<=K;k++){const ph=o.ph0+span*k/K,sd=drapeSide(ph,mode).side;if(sd!==cur){const b=ph-span/K/2;parts.push([a,b,cur]);a=b;cur=sd;}}
      parts.push([a,o.ph1,cur]);
      /* neighbouring panels overlap a little where they part (sharing only the boundary strand let light through a crack
         from the crown down) */
      for(let i=0;i<parts.length;i++){if(i>0)parts[i][0]-=0.035;if(i<parts.length-1)parts[i][1]+=0.035;}}
  else parts.push([o.ph0,o.ph1,0]);
  const field=hairField(hc.y+BC.hd.ry*0.7,yMin-0.25);
  let last=null;
  for(const [p0,p1,side] of parts){const nu=Math.max(8,Math.round((o.nu||96)*(p1-p0)/span)),roots=[],ys=[];
    for(let i=0;i<=nu;i++){const ph=lerp(p0,p1,i/nu),y0=o.y0(ph);let y1=o.y1(ph);
      /* the ends are not cut with a ruler: a soft, uneven line (longer and shorter sections) */
      {const ct=0.5+0.5*Math.sin(ph*7+1.6*fbm(ph*2,1.3,2.1));y1-=0.016*ct*smooth((y0-y1-0.06)/0.12);}
            const D=side?drapeSide(ph,mode):{xt:0};roots.push({ph,y:y0,len:(y0-y1)*1.02,bias:side,xt:D.xt});}
    const cols=hairDrape(roots,nv,{field,thin:o.thin||0.006,thick:o.thick+(side<0?0.0015:0),bodyClr:0.013+(side<0?0.0015:0),band:!!(S.acc.headband&&S.acc.headband.type==='forehead'),stiff:o.stiff});
    /* texture over the drape: waves, clumps with partings, flare and thinning ends (along the outward horizontal) */
    const shs=[];
    for(let i=0;i<=nu;i++){const col=cols[i],ph0=roots[i].ph,shc=[];
      for(let j=0;j<=nv;j++){const v=j/nv,P=col[j],dx=P.x,dz=P.z-hc.z,r=Math.hypot(dx,dz)||1e-6,ph=Math.atan2(dz,dx),y=P.y;
        let Rw=r+(o.flare||0)*smooth(v)*smooth(v);
        const cl=foldP(ph0*22+2.2*fbm(ph0*3,y*3,1))*0.5+0.5;Rw+=(0.0012+0.003*smooth(v/0.5))*(1-0.75*smooth((v-0.78)/0.22))*(cl-0.5)+0.0012*fbm(ph*9,y*14,2)-0.006*smooth((v-0.88)/0.12);
        shc.push(lerp(0.9,1.03,cl)*lerp(0.92,1,smooth(v/0.25)));
        col[j]=V3(Math.cos(ph)*Rw,y,hc.z+Math.sin(ph)*Rw);}
      shs.push(shc);}
    const pi=parts.findIndex(q=>q[0]===p0);last=sheetMesh(G,mat,Object.assign({},o,{openL:pi===0&&o.ph1-o.ph0<TAU-0.01,openR:pi===parts.length-1&&o.ph1-o.ph0<TAU-0.01,splitL:pi>0,splitR:pi<parts.length-1},o.cards?{cards:Object.assign({},o.cards,{count:Math.round(o.cards.count*(p1-p0)/span)})}:{}),cols,shs,nu,nv);}
  return last;
}
function sheetMesh(G,mat,o,cols,shs,nu,nv){
  /* the hanging hair is strands (sheetStrands); a dark, matte core under all of them (deeper than the deepest), ending
     above the tips, keeps the body from showing through between them: it is only ever seen in the shadow between locks */
  /* (it ends higher in long hair, where the strands part and thin out more; it stays inside the strands' thinning at the
     open and the parted edges: its edge and end showed there as a tab) */
  let Ls=0;{const c=cols[Math.round(nu/2)];for(let j=0;j<nv;j++)Ls+=c[j].distanceTo(c[j+1]);}
  const hc=BC.headC,th=o.thick||0.015,jMax=Math.max(2,Math.round(nv*lerp(0.86,0.66,smooth((Ls-0.2)/0.25)))),SH=[];
  const uL=o.openL?0.13:o.splitL?0.05:0,uR=o.openR?0.87:o.splitR?0.95:1,iL=Math.round(uL*nu),iR=Math.round(uR*nu),nuC=Math.max(2,iR-iL);
  const g=surf(nuC,jMax,(u,v)=>{const i=iL+Math.round(u*nuC),j=Math.round(v*jMax),P=cols[i][j],dx=P.x,dz=P.z-hc.z,r=Math.hypot(dx,dz)||1e-6,k=th*0.95+0.0015+0.002*smooth(v/0.2)+0.012*smooth((v-0.55)/0.45);
    SH.push(0.75);return V3(P.x-dx/r*k,P.y,P.z-dz/r*k);},{uRep:o.uRep||10,vRep:2,noAO:true});
  hairShade(g,SH);hairOutward(g,true);G.add(mk(g,hairCoreMat(S.hair.color)));
  sheetStrands(G,cols,nu,nv,o);
  return g;
}
/* ---------- strands ----------
   how many strands a style gets per unit of its old card count / per sheet column, by quality */
const STRAND_Q=QUALITY==="high"?0.85:QUALITY==="perf"?0.38:0.62;
/* strand geometry: a list of polylines (flat xyz arrays) with a root and a tip width and a tone; each point becomes two
   vertices on the centre line (strandMat turns the ribbon to the camera); tones darken towards the root and inside */
function strandGeo(list){
  let nPt=0,nSeg=0;for(const s of list){nPt+=s.K;nSeg+=s.K-1;}if(!nSeg)return null;
  const pos=new Float32Array(nPt*6),nor=new Float32Array(nPt*6),uv=new Float32Array(nPt*4),col=new Float32Array(nPt*6),idx=new Uint32Array(nSeg*6);
  let v=0,w=0;
  for(const s of list){const P=s.P,K=s.K,b0=v;
    for(let k=0;k<K;k++){const a=Math.max(0,k-1)*3,c=Math.min(K-1,k+1)*3;let tx=P[c]-P[a],ty=P[c+1]-P[a+1],tz=P[c+2]-P[a+2];const tl=Math.hypot(tx,ty,tz)||1;tx/=tl;ty/=tl;tz/=tl;
      const t=k/(K-1),wd=lerp(s.w0,s.w1,Math.pow(t,1.4))*0.5*(s.wIn?smooth(t/s.wIn):1),sh=s.tone*(s.ao?s.ao[k]:1)*lerp(s.root!=null?s.root:0.7,1,smooth(t/0.14));
      for(let e=0;e<2;e++){const q=v*3;pos[q]=P[k*3];pos[q+1]=P[k*3+1];pos[q+2]=P[k*3+2];nor[q]=tx;nor[q+1]=ty;nor[q+2]=tz;uv[v*2]=e?wd:-wd;uv[v*2+1]=t;col[q]=col[q+1]=col[q+2]=sh;v++;}}
    for(let k=0;k+1<K;k++){const a=b0+k*2;idx[w++]=a;idx[w++]=a+1;idx[w++]=a+2;idx[w++]=a+1;idx[w++]=a+3;idx[w++]=a+2;}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setIndex(new THREE.BufferAttribute(idx,1));
  g.userData.keepNormals=true;g.userData.strands=true;return g;}
function addStrands(G,list){const g=strandGeo(list);if(g)G.add(mk(g,strandMat(S.hair.color)));}
/* strands over a hair surface (a scalp shell, a fringe, a bun, a ponytail): each runs from a root on the surface along the
   comb direction (the surface's v) to its length or the edge of the hair, a little under or over the surface, rising
   off it towards the tip. o: count (in the old card units), len, lift, fan, drift, dir (-1 combed from the hairline back),
   v0/v1, endRand (top layer ends at different heights), kind (short / coil / strand), minNy */
function hairCards(G,g,nu,nv,o){
  const p=g.attributes.position.array,n=g.attributes.normal.array,W=nu+1,hc=BC.headC,R=rng(o.seed||(nu*7+nv)),ry=BC.hd.ry,T=hairTexP();
  /* outward normals (the surface winding is not consistent between shells and sheets) */
  let RC=null;if(o.out==='ring'){RC=new Float32Array((nv+1)*3);for(let j=0;j<=nv;j++){for(let i=0;i<nu;i++){const k=(j*W+i)*3;RC[j*3]+=p[k]/nu;RC[j*3+1]+=p[k+1]/nu;RC[j*3+2]+=p[k+2]/nu;}}}
  const N=new Float32Array(n.length);for(let k=0;k<n.length/3;k++){let x=n[k*3],y=n[k*3+1],z=n[k*3+2];const j=Math.floor(k/W),cx=RC?RC[j*3]:hc.x,cy=RC?RC[j*3+1]:hc.y,cz=RC?RC[j*3+2]:hc.z,ox=p[k*3]-cx,oy=o.out==='axis'?0:p[k*3+1]-cy,oz=p[k*3+2]-cz;if(x*ox+y*oy+z*oz<0){x=-x;y=-y;z=-z;}N[k*3]=x;N[k*3+1]=y;N[k*3+2]=z;}
  const smp=(u,v,P,Q)=>{u=o.wrapU?((u%1)+1)%1:clamp(u,0,1);v=clamp(v,0,1);const fu=u*nu,fv=v*nv,i=Math.min(nu-1,Math.floor(fu)),j=Math.min(nv-1,Math.floor(fv)),a=fu-i,b=fv-j;
    const w=[(1-a)*(1-b),a*(1-b),(1-a)*b,a*b],ks=[j*W+i,j*W+i+1,(j+1)*W+i,(j+1)*W+i+1];
    P.set(0,0,0);Q.set(0,0,0);for(let q=0;q<4;q++){const k=ks[q]*3;P.x+=p[k]*w[q];P.y+=p[k+1]*w[q];P.z+=p[k+2]*w[q];Q.x+=N[k]*w[q];Q.y+=N[k+1]*w[q];Q.z+=N[k+2]*w[q];}Q.normalize();};
  const P=V3(),Q=V3(),P2=V3(),Q2=V3(),dir=o.dir||1,v0=o.v0!=null?o.v0:0.06,v1=o.v1!=null?o.v1:0.97;
  /* under a hat / kerchief the hair is pressed flat: no strands where it covers the head (they stood through it) */
  const hatOn=capType()!=='none';
  /* minNy: the strands end above that height - each at its own height over a band of 0.22 (all cut at the line they
     ended in a ruler-straight edge across the back of the head) */
  let minNyS=o.minNy;
  const okP=Pt=>{const ny=(Pt.y-hc.y)/ry;if(minNyS!=null&&ny<=minNyS)return false;if(hairBandK(ny,Math.atan2(Pt.z-hc.z,Pt.x-hc.x))>0.05)return false;if(hatOn){const hl=hatLineNy(Math.atan2(Pt.z-hc.z,Pt.x-hc.x));if(hl!=null&&ny>hl-0.1)return false;}return true;};
  const coil=o.kind==='coil',short=o.kind==='short',count=Math.round(o.count*(coil?10:13)*STRAND_Q),list=[],cp=[],cn=[],cs=[];
  for(let c=0;c<count;c++){
    /* (roots over the whole surface right down to the edge, so their tips do not all end on one line part-way down) */
    minNyS=o.minNy!=null?o.minNy+0.22*Math.pow(R(),1.6):null;
    let u=R(),v=dir>0?lerp(v0,v1-0.02,Math.pow(R(),0.75)):lerp(v1,v0+0.1,Math.pow(R(),0.9));smp(u,v,P,Q);if(!okP(P))continue;
    /* most strands lie in the hair's surface, some just under it (depth), a few stand a little proud (the top layer) */
    /* front: (o.front) only over the forehead (af < o.front), each strand swept towards its side, into the hanging hair */
    const phP=Math.atan2(P.z-hc.z,P.x),afP=angFront(phP);if(o.front&&afP>o.front)continue;const sdP=wrapA(phP-FRONT)>=0?1:-1;
    const L=o.len*(0.55+0.75*R()),depth=R(),h0=(o.lift||0.0015)*(depth<0.25?-1.6:depth<0.8?lerp(-0.6,0.6,R()):lerp(0.6,1.6,R())),fan=(o.fan!=null?o.fan:0.004)*(0.25+R()*0.75),drift=o.front?sdP*(0.5+0.6*R())*(0.4+0.6*smooth(afP/0.5)):(R()-0.5)*(o.drift!=null?o.drift:0.06);
    const ds=clamp(L/26,0.0025,0.01),vEnd=o.endRand?lerp(v1*o.endRand,v1,R()):v1,sw=(R()-0.5)*2,swF=L*(25+R()*25),swA=0.0009*(1+T.wave)*R(),ph=R()*TAU;
    cp.length=0;cn.length=0;cs.length=0;let acc=0;
    while(acc<=L){smp(u,v,P,Q);if(!okP(P))break;cp.push(P.clone());cn.push(Q.clone());
      smp(u+drift*0.02,v+dir*0.01,P2,Q2);const d=P2.distanceTo(P);if(d<1e-7)break;const dv=0.01/d*ds;v+=dir*dv;u+=drift*dv*(1+0.3*sw*Math.sin(acc*20));acc+=ds;if(v>vEnd||v<0)break;}
    const K=cp.length;if(K<3)continue;
    const F=new Float32Array(K*3);
    for(let k=0;k<K;k++){const t=k/(K-1),C=cp[k],Nk=cn[k],Tg=(k<K-1?cp[k+1].clone().sub(C):C.clone().sub(cp[k-1])).normalize(),sd=Nk.clone().cross(Tg).normalize();
      /* combed back (dir -1) the strands lie on the hair: their tips do not stand up off it (lit from below they shone white) */
      let h=(dir<0?Math.min(h0,0.0006):h0)+fan*t*t*(dir<0?0.25:1),lat=swA*Math.sin(ph+t*swF);
      /* coils: a tight helix round the strand's path; waves: a soft side-to-side and up-and-down */
      if(coil){const a=ph+acc*0+t*L/0.006;lat+=0.0022*Math.cos(a);h+=0.0022*Math.sin(a)+0.002;}
      else if(T.wave){const a=ph+t*L*(60+T.wave*25),k=o.front?0.4*smooth(t/0.6):1;lat+=0.0012*T.wave*k*Math.sin(a);h+=0.0008*T.wave*k*Math.cos(a);}
      const X=C.clone().addScaledVector(Nk,h).addScaledVector(sd,lat);F[k*3]=X.x;F[k*3+1]=X.y;F[k*3+2]=X.z;}
    /* (over a scalp shell, which is darker than the free strands of a sheet: close to its tone, a few lighter, no white) */
    const tone=(0.7+0.12*R())*(h0>0?1.04:h0<-0.001?0.86:0.95);
    list.push({P:F,K,w0:(coil?0.0006:short?0.00045:0.0004)*(0.8+0.4*R()),w1:0.00012,tone,root:0.72});}
  addStrands(G,list);}
/* the strands of a hanging sheet of hair (cols: the simulated outer surface, nu+1 columns of nv+1 points from the root).
   Strands fill the sheet's thickness (darker inside), gather into locks that narrow towards their ends, each lock with its
   own length and a slow sway down its length (the hair flows instead of hanging like a curtain), a few strays */
function sheetStrands(G,cols,nu,nv,o){
  const hc=BC.headC,th=o.thick||0.015,T=hairTexP(),R=rng(nu*131+nv*7+Math.round((o.ph0||0)*1000)),list=[];
  const NS=Math.round(nu*120*STRAND_Q),NCL=Math.max(6,Math.round(nu*1.5));
  /* the sheet's length (sway and frizz go by waves per metre, not per strand: a bob crinkled like a perm) */
  let Ls=0;{const c=cols[Math.round(nu/2)];for(let j=0;j<nv;j++)Ls+=c[j].distanceTo(c[j+1]);}
  const locks=[];for(let k=0;k<NCL;k++)locks.push({u:(k+0.5+(R()-0.5)*0.8)/NCL,len:1-R()*lerp(0.06,0.16,smooth((Ls-0.15)/0.3)),amp:0.002+0.005*R(),f:Ls*(1.6+2.4*R()),ph:R()*TAU,pull:0.18+0.22*R(),fwd:(R()-0.5)*0.004});
  /* a sheet starting at the scalp ring: each strand starts higher up, at the crown or the parting, and runs down over the
     head to the ring (the crown read as a separate cap with an edge where the hanging hair began) */
  const crown=o.crown,ry=BC.hd.ry;
  /* per column: the head's polar angle at the sheet's first point (searched once per column, not per strand) */
  const TH0=new Float32Array(nu+1);if(crown)for(let i=0;i<=nu;i++){const C=cols[i][0],ph=Math.atan2(C.z-hc.z,C.x);let lo=0.02,hi=Math.PI*0.9;for(let it=0;it<18;it++){const md=(lo+hi)/2;if(headPt(md,ph,0,false).y>C.y)lo=md;else hi=md;}TH0[i]=(lo+hi)/2;}
  /* the sideways sway of the hair: a smooth field across the sheet (neighbouring strands move together; a sway per lock
     opened gaps between the locks) */
  const SW=[];for(let k=0;k<4;k++)SW.push({ku:(1+k*1.7)*TAU*(0.6+0.8*R()),kt:Ls*(1.2+1.6*R())*TAU,ph:R()*TAU,a:(0.0035/(1+k*0.7))*(0.6+0.8*R())});
  const swayAt=(u,t)=>{let v=0;for(const w of SW)v+=w.a*Math.sin(w.ku*u+w.kt*t+w.ph);return v;};
  /* the waves' phase drifts slowly across the sheet: neighbouring locks wave nearly together (a phase per lock made a
     sawtooth across the hair) */
  const WP=[R()*TAU,R()*TAU,0.8+R()*0.8,2+R()*1.5],wvPh=u=>1.1*Math.sin(u*TAU*WP[2]+WP[0])+0.4*Math.sin(u*TAU*WP[3]+WP[1]);
  const at=(u,j,out)=>{const fu=clamp(u,0,1)*nu,i=Math.min(nu-1,Math.floor(fu)),a=fu-i,A=cols[i][j],B=cols[i+1][j];out.set(lerp(A.x,B.x,a),lerp(A.y,B.y,a),lerp(A.z,B.z,a));
    return B.clone().sub(A);};
  const P=V3(),Pn=V3(),side=V3();
  for(let s=0;s<NS;s++){
    let u0=R();
    /* at the open edges of the hair (by the face) the strands thin out and the edge frays: no ruler-straight side */
    /* (where the hair parts over a shoulder too, less: the two panels overlap there) */
    const eL=o.openL?smooth(u0/0.12):o.splitL?0.35+0.65*smooth(u0/0.1):1,eR=o.openR?smooth((1-u0)/0.12):o.splitR?0.35+0.65*smooth((1-u0)/0.1):1;if(R()>Math.min(eL,eR)*0.85+0.15)continue;const edgeK=1-Math.min(eL,eR);
    let best=0,bd=9;for(let k=0;k<NCL;k++){const d=Math.abs(locks[k].u-u0);if(d<bd){bd=d;best=k;}}const L=locks[best];
    /* depth in the sheet: half the strands near its outer surface, the rest spread through it (they fill the gaps between
       the locks: the core showed through there) */
    const dep=R()<0.5?1-0.25*R():R(),lenS=L.len*(0.9+0.1*R()),fly=R()<0.025,fA=fly?0.004+0.012*R():0,fPh=R()*TAU,fr=0.0004+0.0006*R(),frF=Ls*(10+R()*14),frP=R()*TAU;
    const tEnd=Math.min(1,lenS),K0=Math.max(3,Math.round(tEnd*nv)+1);
    /* the part over the scalp: from a root between the crown and the ring, along the head's meridian */
    /* roots spread between the crown's whorl and the ring, each strand running down the head's meridian with a slight
       swirl round the whorl (a continuous direction field: partings drawn as fans left seams between them) */
    let KC=0,ph0=0,thR=0,th0=0,phR=0;const P0s=V3();if(crown){at(u0,0,P);P0s.copy(P);ph0=Math.atan2(P.z-hc.z,P.x);
      /* the head's polar angle whose surface point is at the sheet's first point's height (headPt's angle is not the height) */
      {const fu=u0*nu,i=Math.min(nu-1,Math.floor(fu));th0=lerp(TH0[i],TH0[i+1],fu-i);}
      thR=lerp(0.03,th0-0.04,Math.pow(R(),1.3));phR=ph0+0.35*(1-thR/th0);
      KC=Math.max(3,Math.round((Math.abs(th0-thR)+Math.abs(wrapA(ph0-phR))*0.8)*ry/0.011));}
    /* (the crown part eases into the sheet over ~3 cm: the drape lifts the sheet off the head over the ears and a shorter
       blend drew a ledge round the head) */
    const K=K0+KC,F=new Float32Array(K*3),AO=new Float32Array(K),NE=Math.max(4,Math.round(0.03/Math.max(1e-3,Ls/nv)));
    for(let k=0;k<KC;k++){const t=k/KC,th=lerp(thR,th0,t),ph=phR+wrapA(ph0-phR)*Math.pow(t,0.55)+(R()-0.5)*0.003,ny=Math.cos(th),dirH=headPt(th,ph,0,false).sub(hc).normalize();
      /* just over the shell's surface (its clumps stand up to ~3 mm proud of its height), never inside it */
      const hs=SHELL_HF?Math.max(0.002,SHELL_HF(ny,angFront(ph),ph,dirH)):0.008,Q=headPt(th,ph,hs*lerp(1.0,1.15,dep)+0.0022+0.0012*dep,false);
      /* (its end runs into the sheet's first point exactly: the head's parameter angle is not its height, and the strand
         jumped a centimetre from the scalp down to the sheet) */
      const eB=smooth((t-0.7)/0.3);Q.lerp(P0s,eB);F[k*3]=Q.x;F[k*3+1]=Q.y;F[k*3+2]=Q.z;AO[k]=lerp(0.75,1,dep);}
    for(let k=0;k<K0;k++){const tt=(KC?(k+1)/K0:k/(K0-1))*tEnd,fj=Math.min(nv-1e-4,tt*nv),j=Math.min(nv-1,Math.floor(fj)),b=fj-j,q=(k+KC)*3;
      /* the lock pulls its strands together towards the ends */
      const pull=L.pull*smooth((tt-0.15)/0.7)*smooth((Ls-0.12)/0.3),u=lerp(u0,L.u,pull);
      const d1=at(u,j,P),d2=at(u,j+1,Pn);P.lerp(Pn,b);d1.lerp(d2,b);side.copy(d1).normalize();
      const dx=P.x,dz=P.z-hc.z,r=Math.hypot(dx,dz)||1e-6,nx=dx/r,nz=dz/r;
      /* inside the sheet's thickness (less of it towards the ends, where the hair thins), the lock's sway, fine frizz */
      /* a lock is round in section: its middle stands out of the sheet, its edges sink into it */
      const du=(u0-L.u)*NCL*2,bul=th*0.35*(1-Math.min(1,du*du))*smooth((tt-0.12)/0.3)*(1-0.4*smooth((tt-0.6)/0.4));
      const inn=(th*(1-dep)*0.85*(1-0.45*smooth((tt-0.5)/0.5))-bul*(0.5+0.5*dep))*(KC?smooth(tt/0.22):1),sw=swayAt(u,tt)*smooth(tt/0.3),fz=fr*Math.sin(frP+tt*frF*TAU)*smooth(tt/0.2);
      let ox=-nx*inn+side.x*(sw+fz),oy=side.y*(sw+fz),oz=-nz*inn+side.z*(sw+fz);
      /* the lock comes forward or back a little as a whole; a stray lifts away from the hair */
      const out=L.fwd*smooth(tt/0.4)+fA*smooth((tt-0.25)/0.75);ox+=nx*out;oz+=nz*out;
      if(fly){const a=fPh+tt*6;ox+=side.x*fA*0.6*Math.sin(a);oy+=fA*0.3*Math.cos(a);oz+=side.z*fA*0.6*Math.sin(a);}
      /* waves and curls run together within a lock (its own phase), not across the whole sheet (it read as corrugated) */
      if(T.wave){const a=wvPh(u)+L.ph*0.45+tt*Ls*(36+T.wave*22)+frP*0.03,A=(0.0032+0.0026*T.wave)*smooth(tt/0.18)*(0.75+0.25*dep);ox+=nx*A*Math.cos(a)+side.x*A*0.5*Math.sin(a);oz+=nz*A*Math.cos(a)+side.z*A*0.5*Math.sin(a);}
      if(edgeK>0){const a=fPh+tt*9;ox+=side.x*edgeK*0.006*Math.sin(a);oz+=side.z*edgeK*0.006*Math.sin(a);}
      /* (where the scalp part ends the strand eases into the sheet over a few points) */
      let X=P.x+ox,Y=P.y+oy,Z=P.z+oz;if(KC&&k<NE){const e=smooth((k+1)/(NE+1)),pq=(KC-1)*3;X=lerp(F[pq],X,e);Y=lerp(F[pq+1],Y,e);Z=lerp(F[pq+2],Z,e);}
      F[q]=X;F[q+1]=Y;F[q+2]=Z;AO[k+KC]=lerp(KC?lerp(0.8,0.68,smooth(tt/0.25)):0.68,1,dep);}
    const tone=(1.04+0.16*R())*(dep>0.85?1.05:1);
    /* the joint between the scalp part and the hanging part: smoothed over a few points either side, then the points
       spread evenly along the strand (they bunched up at the joint and the strand kinked there: a dark seam round the head) */
    if(KC){const a0=Math.max(1,KC-6),a1=Math.min(K-2,KC+NE+3);for(let it=0;it<6;it++)for(let k=a0;k<=a1;k++)for(let c=0;c<3;c++){const q=k*3+c;F[q]+=0.5*((F[q-3]+F[q+3])*0.5-F[q]);}
}
    /* (then resampled evenly to ~1 cm segments, 6.5 mm in wavy hair: enough for its curves) */
    const S0=new Float32Array(K);for(let k=1;k<K;k++)S0[k]=S0[k-1]+Math.hypot(F[k*3]-F[k*3-3],F[k*3+1]-F[k*3-2],F[k*3+2]-F[k*3-1]);
    const K2=Math.max(4,Math.min(K,Math.round(S0[K-1]/(T.wave?0.0065:0.011))+1)),F2=new Float32Array(K2*3),A2=new Float32Array(K2);let m=0;
    for(let k=0;k<K2;k++){const sv=S0[K-1]*k/(K2-1);while(m<K-2&&S0[m+1]<sv)m++;const w=clamp((sv-S0[m])/((S0[m+1]-S0[m])||1),0,1);for(let c=0;c<3;c++)F2[k*3+c]=lerp(F[m*3+c],F[m*3+3+c],w);A2[k]=lerp(AO[m],AO[m+1],w);}
    /* (short hair ends blunt: its strands barely taper) */
    /* (without the crown part a strand starts at the sheet's top, under the scalp's strands: it fades in there instead of
       starting as a dark line of roots) */
    const w0=0.00042*(0.8+0.4*R());list.push({P:F2,K:K2,w0,w1:w0*lerp(0.75,0.38,smooth((Ls-0.15)/0.3)),tone,ao:A2,root:crown?0.78:1,wIn:crown?0:0.07});}
  addStrands(G,list);}
/* ---------- flowing hair: independent guide hairs, simulated; the drawn strands follow them ----------
   Long hair is not a sheet: each guide is a hair of its own, rooted on the scalp, combed away from the parting, falling
   under gravity, inextensible, soft to bend (stiffer for the first few cm off the scalp), resting on the head, the face's
   sides, the shoulders, the back and the arms, and kept apart from the other guides (hair has volume: it stacks in
   layers instead of passing through itself). The drawn strands are interpolated between neighbouring guides (only where
   those stay together: no strand cuts across a shoulder between a lock in front and one behind) and gather into the
   nearest guide towards their ends (locks). */
/* the head as a radius per direction from its centre (sampled from headPt; the crown and the face included) */
let HEAD_TAB=null;
function headTab(){const hc=BC.headC,key=[hc.x,hc.y,hc.z,BC.hd.rx,BC.hd.ry,BC.hd.zf,BC.hd.zb,BC.jaw,BC.neckR].join(',');if(HEAD_TAB&&HEAD_TAB.key===key)return HEAD_TAB;
  const NT=64,NP=128,R=new Float32Array(NT*NP),tb=(dx,dy,dz,d)=>[clamp(Math.acos(clamp(dy/d,-1,1))/Math.PI*NT,0,NT-1.001),((Math.atan2(dz,dx)/TAU+1)%1)*NP];
  for(let i=0;i<=256;i++)for(let j=0;j<512;j++){const P=headPt(i/256*Math.PI,j/512*TAU,0),dx=P.x-hc.x,dy=P.y-hc.y,dz=P.z-hc.z,d=Math.hypot(dx,dy,dz);if(d<1e-6)continue;
    const[a,b]=tb(dx,dy,dz,d),k=Math.floor(a)*NP+Math.floor(b)%NP;if(d>R[k])R[k]=d;}
  for(let it=0;it<4;it++)for(let a=0;a<NT;a++)for(let b=0;b<NP;b++){const k=a*NP+b;if(R[k]>0)continue;let s=0,c=0;for(const[da,db] of [[1,0],[-1,0],[0,1],[0,-1]]){const aa=a+da;if(aa<0||aa>=NT)continue;const v=R[aa*NP+(b+db+NP)%NP];if(v>0){s+=v;c++;}}if(c)R[k]=s/c;}
  const at=(dx,dy,dz,d)=>{const[a,b]=tb(dx,dy,dz,d),a0=Math.floor(a),b0=Math.floor(b)%NP,ta=a-a0,tb2=b-Math.floor(b),a1=Math.min(NT-1,a0+1),b1=(b0+1)%NP;
    return lerp(lerp(R[a0*NP+b0],R[a0*NP+b1],tb2),lerp(R[a1*NP+b0],R[a1*NP+b1],tb2),ta);};
  let mx=0;for(let k=0;k<R.length;k++)mx=Math.max(mx,R[k]);
  return HEAD_TAB={key,at,max:mx};}
/* the scalp region a hanging style grows from; o: gap (half-angle of the face), ring (no crown: a band round the back),
   hat: under a hat only a band just under its edge */
/* how far from the front (angle) the hairline reaches down to height ny (the forehead and temples are bare above the face) */
function hairlineAf(ny){if(ny>=HAIRLINE[0][1])return 0;for(let i=1;i<HAIRLINE.length;i++){const[a1,y1]=HAIRLINE[i],[a0,y0]=HAIRLINE[i-1];if(ny>=y1)return lerp(a0,a1,(y0-ny)/((y0-y1)||1));}return Math.PI;}
function flowRootOK(ny,ph,o){const hl=hairlineNy(ph);if(ny<hl+0.015)return false;const af=angFront(ph);
  if(o.hatOn){const hl2=hatLineNy(ph);if(hl2!=null&&(ny>hl2-0.05||ny<hl2-0.3))return false;}
  if(o.ring){if(af<o.gap||ny>o.ringNy+0.06||ny<o.ringNy-0.22)return false;}
  if(af<o.gap&&ny<0.42)return false;
  return true;}
/* comb direction at a root: away from a centre parting (from the front hairline to the crown) and down, a little back
   at the front (the hair over the forehead is swept to the sides, never forward over the face) */
function flowComb(P,o){const hc=BC.headC,ry=BC.hd.ry,A=headPt(Math.acos(clamp(hairlineNy(FRONT)+0.02,-0.9,0.95)),FRONT,0),B=headPt(0.42,BACKA,0);
  const ab=B.clone().sub(A),t=clamp(P.clone().sub(A).dot(ab)/ab.lengthSq(),0,1),Q=A.clone().addScaledVector(ab,t),n=P.clone().sub(hc).normalize();
  let v=P.clone().sub(Q);if(Math.abs(P.x-hc.x)<1e-4)v.x+=0.001;v.addScaledVector(n,-v.dot(n));const vl=v.length()||1;v.multiplyScalar(1/vl);
  const down=V3(0,-1,0).addScaledVector(n,n.y);const fz=Math.sin(FRONT)*(P.z-hc.z)>0?smooth((P.z-hc.z)/(BC.hd.zf*0.7)):0;
  const d=v.multiplyScalar(lerp(1.2,0.5,t)+0.5*fz).add(down.multiplyScalar(0.55*(1-0.5*fz))).add(V3(0,0,-Math.sin(FRONT)*0.12*fz));d.addScaledVector(n,-d.dot(n));return d.normalize();}
const FLOW_CACHE=new Map(),STRAND_CACHE=new Map();
/* a light version for the thumbnails (Społeczność, saved fits: a few hundred pixels, many of them in a row - the full
   simulation took tens of seconds per long-haired fit and froze the page): fewer guides, a shorter settle, fewer strands */
let HAIR_LOD=0;
/* (the 'perf' quality - chosen for weak hardware, and by default without a GPU, where every strand is drawn in software
   and thousands of overlapping ones took tens of seconds a frame: fewer guides, strands and points) */
function hairFlow(G,o){
  const hc=BC.headC,ry=BC.hd.ry,T=hairTexP(),hat=capType()!=='none',mode=S.hair.drape||'auto',band=!!(S.acc.headband&&S.acc.headband.type==='forehead');
  const ro={gap:o.gap,ring:!!o.ring,ringNy:0.5,hatOn:hat};
  /* guides: a Fibonacci spread over the scalp region */
  const lod=HAIR_LOD,NGT=lod?120:QUALITY==='perf'?260:(o.guides||420),cand=[];{const M=6000,ga=Math.PI*(3-Math.sqrt(5));for(let i=0;i<M;i++){const ny=1-2*(i+0.5)/M;if(ny<-0.6)break;const ph=wrapA(i*ga);if(flowRootOK(ny,ph,ro))cand.push([ny,ph]);}}
  const stepC=Math.max(1,cand.length/NGT),gd=[];for(let f=0;f<cand.length;f+=stepC){const[ny,ph]=cand[Math.floor(f)];gd.push({ny,ph});}
  /* (no scalp left to grow from - a deep hat over a style hanging from a ring: the caller falls back to the sheet) */
  if(gd.length<12)return false;
  const ringY=ph=>o.y0(ph),tipY=ph=>o.y1(ph);
  /* each guide's length: over the scalp to the ring (where the old sheet started) and down to the tip line, uneven */
  const R0=rng(4711);
  for(const g of gd){const th=Math.acos(clamp(g.ny,-0.99,0.995));g.P=headPt(th,g.ph,0.0015);g.dir=flowComb(g.P,o);
    /* the part on the scalp follows the comb (a streamline over the head, held there by the hair around it) down to the
       ring the style hangs from; from there the hair is free */
    const HT=headTab(),SP=[g.P.clone()];let P=g.P.clone(),dv=g.dir.clone(),arc=0;
    for(let it=0;it<90;it++){const ph=Math.atan2(P.z-hc.z,P.x-hc.x);if(it>0&&P.y<ringY(ph))break;
      const d2=flowComb(P,o);dv.lerp(d2,0.45).normalize();P=P.clone().addScaledVector(dv,0.005);
      const dx=P.x-hc.x,dy=P.y-hc.y,dz=P.z-hc.z,dd=Math.hypot(dx,dy,dz)||1,Rr=HT.at(dx,dy,dz,dd)+0.0036;P.set(hc.x+dx*Rr/dd,hc.y+dy*Rr/dd,hc.z+dz*Rr/dd);
      arc+=0.005;SP.push(P.clone());}
    const phE=Math.atan2(P.z-hc.z,P.x-hc.x),yr=P.y;
    let y1=tipY(phE);{const ct=0.5+0.5*Math.sin(phE*7+1.6*fbm(phE*2,1.3,2.1));y1-=0.016*ct*smooth((yr-y1-0.06)/0.12);}
    g.S=SP;g.arc=arc;g.tipY=y1;g.L=Math.max(arc+0.03,arc+Math.max(0,yr-y1)*1.02*(1-0.03*R0()));}
  const yMin=Math.min(...gd.map(g=>g.P.y-g.L)),field=hairField(hc.y+ry*1.05,yMin-0.2,G);
  const key=[NGT,o.gap,o.ring?1:0,hat?1:0,band?1:0,mode,field.sig,ry,BC.hd.rx,hc.y,gd.map(g=>g.L.toFixed(4)).join(',').length,gd.reduce((s,g)=>s+g.L,0).toFixed(5),o.dmin||0,o.tipCurl||0,S.hair.texture||'',(S.acc.scarf&&S.acc.scarf.type)||''].join('|');
  let sim=FLOW_CACHE.get(key);
  if(!sim){const so=Object.assign({},o,{field,band,mode,hat},lod?{steps:100}:{});
    /* two passes: the first tells where each guide's tip comes to rest (hair from the crown leaves the skull above the
       ring and lies down the back's curve), the guide is then cut so its tip rests on the style's line */
    const s1=flowSim(gd,Object.assign({},so,{steps:lod?60:120}));
    /* (a cut to the shoulders: the hair hanging free between them ends level with what rests on them - one line) */
    const shCut=gd.reduce((a,g)=>a+g.tipY,0)/gd.length>BC.shY-0.09;
    for(let i=0;i<gd.length;i++){const g=gd[i],P=s1[i].P,K=s1[i].K,ty=shCut?Math.max(gd[i].tipY,BC.shY+0.02):gd[i].tipY;let low=9;for(let k=0;k<K;k++)low=Math.min(low,P[k*3+1]);
      /* the tip's height against the target; hair resting on the shoulders or the back is measured along its rest */
      const over=ty-low;if(over>0){let acc=0,cut=g.L;for(let k=1;k<K;k++){acc+=Math.hypot(P[k*3]-P[k*3-3],P[k*3+1]-P[k*3-2],P[k*3+2]-P[k*3-1]);if(P[k*3+1]<ty){cut=acc;break;}}g.L=Math.max(g.arc+0.03,cut);}
      else{/* a tip short of the line: hanging free the guide is lengthened; in a cut to the shoulders (the style's line on
           average there), resting on the shoulder, it is cut a few cm past where it lands there instead (lengthened, it slid out along the shoulder: the ends
           splayed out flat, a ruff); long hair only rests there on its way down the back or the front */
        let land=-1,acc=0,sA=0;for(let k=1;k<K;k++){const dl=Math.hypot(P[k*3]-P[k*3-3],P[k*3+1]-P[k*3-2],P[k*3+2]-P[k*3-1]);acc+=dl;
          if(acc>g.arc+0.02&&P[k*3+1]<BC.shY+0.1&&(P[k*3+1]-P[k*3-2])>-0.55*dl){land=k;sA=acc;break;}}
        g.L=land>0&&shCut?Math.max(g.arc+0.03,Math.min(g.L,sA+0.025)):Math.max(g.arc+0.03,g.L-over*0.9);}}
    sim=flowSim(gd,so);
    /* the settled hair hangs lower than after the first, shorter pass: a guide reaching below the style's line is cut
       there (the free hair between the shoulders hung a tail below the hair resting on them) */
    for(let i=0;i<gd.length;i++){const g=gd[i],q=sim[i],P=q.P,K=q.K,ty=(shCut?Math.max(g.tipY,BC.shY+0.02):g.tipY)-0.006;let acc=0;
      for(let k=1;k<K;k++){const dl=Math.hypot(P[k*3]-P[k*3-3],P[k*3+1]-P[k*3-2],P[k*3+2]-P[k*3-1]);if(P[k*3+1]<ty&&acc+dl>g.arc+0.03&&k>=4){
          const f=clamp((P[k*3-2]-ty)/((P[k*3-2]-P[k*3+1])||1),0,1);for(let c=0;c<3;c++)P[k*3+c]=lerp(P[k*3-3+c],P[k*3+c],f);
          g.L=acc+dl*f;sim[i]={P:P.slice(0,(k+1)*3),AO:q.AO.slice(0,k+1),K:k+1,L:g.L};break;}acc+=dl;}}
    FLOW_CACHE.set(key,sim);if(FLOW_CACHE.size>8)FLOW_CACHE.delete(FLOW_CACHE.keys().next().value);}
  else for(let i=0;i<gd.length;i++)gd[i].L=sim[i].L;
  /* (QA: window.__guidesOnly draws the guides alone, window.__perGuide sets the strands per guide) */
  if(window.__guidesOnly){addStrands(G,sim.map(q=>({P:q.P,K:q.K,w0:0.0015,w1:0.0015,tone:1,root:1})));return true;}
  /* the strands too (a new colour, clothes the hair does not touch: the same hair) */
  const skey=key+'|'+STRAND_Q+'|'+(window.__perGuide||0)+'|'+lod;let list=STRAND_CACHE.get(skey);
  if(window.__strandsQA){if(!list){list=flowStrands(gd,sim,o,ro);STRAND_CACHE.set(skey,list);if(STRAND_CACHE.size>2)STRAND_CACHE.delete(STRAND_CACHE.keys().next().value);}addStrands(G,list);return true;}
  if(!list){list=flowLocks(gd,sim);STRAND_CACHE.set(skey,list);if(STRAND_CACHE.size>2)STRAND_CACHE.delete(STRAND_CACHE.keys().next().value);}
  G.add(mk(lockGeo(list),lockMat(S.hair.color)));return true;
}
/* the simulation of the guides; returns per guide its points (flat xyz) and an occlusion per point */
function flowSim(gd,o){
  const hc=BC.headC,ry=BC.hd.ry,F=o.field,HT=headTab(),tmp=[0,0],seg=0.015,n=gd.length,mode=o.mode;
  const off=new Int32Array(n+1);for(let i=0;i<n;i++){gd[i].K=Math.max(5,Math.ceil(gd[i].L/seg)+1);off[i+1]=off[i]+gd[i].K;}
  const NP=off[n],X=new Float32Array(NP*3),Q=new Float32Array(NP*3),D=new Float32Array(NP*3),SEGL=new Float32Array(n),GI=new Int32Array(NP),KI=new Int32Array(NP),CT=new Uint8Array(NP),CB=new Uint8Array(NP),TP=new Uint8Array(NP),AC=new Float32Array(NP*3),XS=X;
  for(let i=0;i<n;i++){SEGL[i]=gd[i].L/(gd[i].K-1);for(let k=0;k<gd[i].K;k++){GI[off[i]+k]=i;KI[off[i]+k]=k;}}
  /* clearance: thin at the root (the hair lies on the scalp), the hair's own thickness further on */
  const clr=(k,y,ph)=>{let c=0.0016+0.0022*smooth(k*seg/0.066);if(o.band){const bk=hairBandK((y-hc.y)/ry,ph);if(bk>0)c=lerp(c,Math.min(c,HB_H-0.003),bk);}return c;};
  const gapA=o.gap-0.06,yFace0=hc.y-ry*1.05,yFace1=hc.y+ry*(hairlineNy(FRONT)-0.02),yNeck=hc.y-ry*0.55,yS=BC.shY;
  const arms=[];for(const sd of [-1,1])for(let t=0.02;t<=0.62;t+=0.04){const c=armPt(t,sd),r=Math.max(armAt(t),(typeof sleeveEnv==='function'&&LAYERS?sleeveEnv(t,LAYERS):0))+0.008;arms.push([c.x,c.y,c.z,r]);}
  /* a scarf's wrap round the neck (two rounded passes, see buildScarf): the hair lies over it, not through it */
  const scY0=1.485,scf=!!(S.acc.scarf&&S.acc.scarf.type&&S.acc.scarf.type!=='none'),SCR=new Float32Array(48);
  if(scf)for(let j=0;j<48;j++){const y=scY0-0.004+j*0.002,u=(y-(scY0+0.04))/0.044,nb=bodyEnv(Math.min(y,1.53),LAYERS),nr=Math.max(BC.neckR+0.012,Math.min(nb.rx,BC.neckR+0.035));SCR[j]=Math.abs(u)<1?nr+0.014+0.036*Math.sqrt(1-u*u):0;}
  /* (the face's open angle per height, tabulated; the arms' nearest reach to the body's axis; the head's largest radius) */
  const FGA=new Float32Array(64);for(let j=0;j<64;j++){const ny=(yFace0+(yFace1-yFace0)*j/63-hc.y)/ry;FGA[j]=Math.min(gapA,Math.max(0.35,hairlineAf(ny)-0.04));}
  let armX=9;for(const a of arms)armX=Math.min(armX,Math.abs(a[0])-a[3]-0.06);const HTM2=(HT.max+0.008)**2;
  const collide=(p,k,X=XS)=>{let hit=0;const x=X[p],y=X[p+1],z=X[p+2];
    /* head (radius per direction from its centre) */
    /* (the cheap tests first: below the head, or clear of its largest radius, nothing to look up) */
    {const dx=x-hc.x,dy=y-hc.y,dz=z-hc.z,d2=dx*dx+dy*dy+dz*dz;if(dy>-ry*0.8&&d2<HTM2){const d=Math.sqrt(d2)||1e-6,R=HT.at(dx,dy,dz,d)+clr(k,y,Math.atan2(dz,dx));if(d<R){const s=R/d;X[p]=hc.x+dx*s;X[p+1]=hc.y+dy*s;X[p+2]=hc.z+dz*s;hit|=1;}}}
    /* the lower head and the neck (radius per height round the head's axis), the body and clothes round the body's axis */
    if(X[p+1]<hc.y-ry*0.5&&X[p+1]>hc.y-ry*0.98){const dx=X[p]-hc.x,dz=X[p+2]-hc.z,r=Math.hypot(dx,dz)||1e-6,ph=Math.atan2(dz,dx);F.head(X[p+1],ph,tmp);if(tmp[0]>0){const R=tmp[0]+clr(k,X[p+1],ph);if(r<R){const g=tmp[1],d=(R-r)/(1+g*g);X[p]+=dx/r*d;X[p+2]+=dz/r*d;X[p+1]-=g*d;hit|=1;}}}
    if(X[p+1]<yNeck){const dx=X[p],dz=X[p+2],r=Math.hypot(dx,dz)||1e-6,ph=Math.atan2(dz,dx);F.body(X[p+1],ph,tmp);if(tmp[0]>0){const R=tmp[0]+0.006;if(r<R){const g=tmp[1],d=(R-r)/(1+g*g);X[p]+=dx/r*d;X[p+2]+=dz/r*d;X[p+1]-=g*d;hit|=g<-1.2?10:2;}}}
    if(scf){const j=Math.round((X[p+1]-scY0+0.004)/0.002);if(j>=0&&j<48&&SCR[j]>0){const r=Math.hypot(X[p],X[p+2])||1e-6;if(r<SCR[j]){X[p]*=SCR[j]/r;X[p+2]*=SCR[j]/r;hit|=2;}}}
    /* the arms */
    if(X[p+1]<yS+0.05&&Math.abs(X[p])>armX)for(const a of arms){const dx=X[p]-a[0],dy=X[p+1]-a[1],dz=X[p+2]-a[2];if(Math.abs(dy)>0.05)continue;const r=Math.hypot(dx,dz)||1e-6;if(r<a[3]){X[p]+=dx/r*(a[3]-r);X[p+2]+=dz/r*(a[3]-r);hit|=2;}}
    /* the face stays open: nothing hangs in front of it (between the temples, from the forehead's hairline to the chin) */
    if(X[p+1]>yFace0&&X[p+1]<yFace1&&k>2&&X[p+2]>hc.z){const dx=X[p]-hc.x,dz=X[p+2]-hc.z,ph=Math.atan2(dz,dx),af=angFront(ph),fj=(X[p+1]-yFace0)/(yFace1-yFace0)*63,j0=Math.min(62,Math.floor(fj)),gA=lerp(FGA[j0],FGA[j0+1],fj-j0);if(af<gA){const r=Math.hypot(dx,dz),s=wrapA(ph-FRONT)>=0?1:-1,np=FRONT+s*gA;X[p]=hc.x+Math.cos(np)*r;X[p+2]=hc.z+Math.sin(np)*r;hit|=4;}}
    return hit;};
  /* start: from the root along the comb direction, turning down, kept off the head and body */
  const KS=new Int32Array(n);
  for(let i=0;i<n;i++){const g=gd[i],L=SEGL[i],SP=g.S||[g.P];KS[i]=Math.max(2,Math.min(g.K-2,Math.floor((g.arc||0)/L)+1));let dx=g.dir.x,dy=g.dir.y,dz=g.dir.z;
    for(let k=0;k<g.K;k++){const p=(off[i]+k)*3;
      if(k<KS[i]){const f=Math.min(SP.length-1.001,k*L/0.005),a=Math.floor(f),u=f-a,A=SP[a],B=SP[Math.min(SP.length-1,a+1)];X[p]=lerp(A.x,B.x,u);X[p+1]=lerp(A.y,B.y,u);X[p+2]=lerp(A.z,B.z,u);
        if(k>0){const ex=X[p]-X[p-3],ey=X[p+1]-X[p-2],ez=X[p+2]-X[p-1],el=Math.hypot(ex,ey,ez)||1;dx=ex/el;dy=ey/el;dz=ez/el;}}
      else{if(k>1){dx*=0.82;dy=dy*0.82-0.18;dz*=0.82;const l=Math.hypot(dx,dy,dz)||1;dx/=l;dy/=l;dz/=l;}X[p]=X[p-3]+dx*L;X[p+1]=X[p-2]+dy*L;X[p+2]=X[p-1]+dz*L;
        for(let r=0;r<3;r++)collide(p,k);const ex=X[p]-X[p-3],ey=X[p+1]-X[p-2],ez=X[p+2]-X[p-1],el=Math.hypot(ex,ey,ez)||1;dx=ex/el;dy=ey/el;dz=ez/el;X[p]=X[p-3]+dx*L;X[p+1]=X[p-2]+dy*L;X[p+2]=X[p-1]+dz*L;}
      Q[p]=X[p];Q[p+1]=X[p+1];Q[p+2]=X[p+2];}}
  /* hair-hair: particles of different guides keep dmin apart (spatial hash) */
  const dmin=(o.dmin||0.0034)*(1+0.25*(hairTexP().wave||0)),cs=dmin,HS=1<<17,head=new Int32Array(HS),next=new Int32Array(NP);
  const hk=(ix,iy,iz)=>(((ix*73856093)^(iy*19349663)^(iz*83492791))>>>0)&(HS-1);
  /* (each pair once: the particle's own cell, later particles only, and the 13 cells on one side of it - not all 27 with
     every pair met twice; a third of the time) */
  const CI=new Int32Array(NP*3),HOFF=[];for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++)if(a>0||(a===0&&(b>0||(b===0&&c>0))))HOFF.push(a,b,c);
  const repel=()=>{head.fill(-1);for(let q=0;q<NP;q++){if(KI[q]<KS[GI[q]])continue;const p=q*3,ix=Math.floor(X[p]/cs),iy=Math.floor(X[p+1]/cs),iz=Math.floor(X[p+2]/cs),h=hk(ix,iy,iz);CI[p]=ix;CI[p+1]=iy;CI[p+2]=iz;next[q]=head[h];head[h]=q;}
    AC.fill(0);const d2m=dmin*dmin;
    const pair=(q,r)=>{const p=q*3,s=r*3,dx=X[s]-X[p],dy=X[s+1]-X[p+1],dz=X[s+2]-X[p+2],d2=dx*dx+dy*dy+dz*dz;
      if(d2<d2m&&d2>1e-12){const d=Math.sqrt(d2),f=(dmin-d)/d*0.25;AC[p]-=dx*f;AC[p+1]-=dy*f;AC[p+2]-=dz*f;AC[s]+=dx*f;AC[s+1]+=dy*f;AC[s+2]+=dz*f;}};
    for(let q=0;q<NP;q++){if(KI[q]<KS[GI[q]])continue;const p=q*3,ix=CI[p],iy=CI[p+1],iz=CI[p+2],gq=GI[q];
      let r=head[hk(ix,iy,iz)];while(r>=0){if(r>q&&GI[r]!==gq)pair(q,r);r=next[r];}
      for(let o=0;o<39;o+=3){r=head[hk(ix+HOFF[o],iy+HOFF[o+1],iz+HOFF[o+2])];while(r>=0){if(GI[r]!==gq)pair(q,r);r=next[r];}}}
    for(let q=0;q<NP;q++){const p=q*3;X[p]+=AC[p];X[p+1]+=AC[p+1];X[p+2]+=AC[p+2];}};
  /* waves / curls: amplitude, wavelength, helix or not; waves take their phase from a smooth field over the scalp
     (neighbouring locks wave together, a few centimetres apart no longer: one phase over the whole head
     drew level stripes, a washboard), curls each their own (ringlets are not in step), of uneven size and either hand */
  /* (straight hair too: a slow, gentle S along each lock - no hair hangs like a plumb line) */
  const TX=hairTexP(),R1=rng(77+n),WA=[0.009,0.009,0.0065,0.0055][TX.wave||0],WH=TX.wave>=2,
    WLg=gd.map(()=>TX.wave?[1,0.095,0.062,0.044][TX.wave]*(WH?0.82+0.4*R1():0.94+0.12*R1()):0.26+0.16*R1()),
    WP=gd.map(g=>WH?R1()*TAU:5*fbm(g.P.x*4.5+3,g.P.y*4.5,g.P.z*4.5)+0.4*R1()),
    WAg=gd.map(g=>WA*(WH?0.65+0.7*R1():TX.wave?0.7+0.6*clamp(0.5+fbm(g.P.x*6+11,g.P.y*6,g.P.z*6),0,1)+0.1*R1():0.5+R1())),
    HAND=gd.map(()=>R1()<0.5?-1:1),
    /* a wave is flat: a zigzag in a plane tilted out of the hair's surface (the light catches its crests - in the surface
       alone the waves did not show in thick hair; side to side and in and out a quarter apart it was a twist, not a wave) */
    WPL=gd.map(g=>{const a=(TX.wave?0.32:0.25)+0.25*fbm(g.P.x*3.1+7,g.P.y*3.1,g.P.z*3.1)+0.15*(R1()-0.5);return[Math.cos(a),Math.sin(a)];});
  const dt=1/50,Gv=9.8*dt*dt,steps=o.steps||260,side=new Float32Array(n),xt=new Float32Array(n),rmin=o.rmin||0.022,sideStep=Math.min(70,Math.round(steps*0.45));let sideSet=false;
  for(let st=0;st<steps;st++){
    const damp=st<steps*0.6?0.94:0.82;
    /* which way each guide falls over the shoulders, once the hair has settled on the head */
    if(st===sideStep&&!sideSet){sideSet=true;for(let i=0;i<n;i++){let best=-1,bd=9;for(let k=0;k<gd[i].K;k++){const p=(off[i]+k)*3,d=Math.abs(X[p+1]-(yS+0.12));if(d<bd){bd=d;best=p;}}
      if(bd<0.03&&gd[i].P.y-gd[i].L<yS-0.02){const D2=drapeSide(Math.atan2(X[best+2]-hc.z,X[best]),mode);side[i]=D2.side;xt[i]=D2.xt;}}}
    for(let q=0;q<NP;q++){if(KI[q]<KS[GI[q]])continue;const p=q*3,i=GI[q],vx=(X[p]-Q[p])*damp,vy=(X[p+1]-Q[p+1])*damp,vz=(X[p+2]-Q[p+2])*damp;Q[p]=X[p];Q[p+1]=X[p+1];Q[p+2]=X[p+2];
      /* (the push over the shoulder acts only where the hair lies on a near-level surface - the top of the shoulder; on the
         chest and the back, and still beside the neck, the hair hangs under its own weight: pushed all round the shoulder's
         height, it was flung forward and back and stood off the body, in the air in front of the chest and behind the back) */
      let fx=0,fz=0;if(side[i]&&TP[q]){fx=(xt[i]-X[p])*8*dt*dt;fz=side[i]*16*dt*dt;}
      X[p]+=vx+fx;X[p+1]+=vy-Gv;X[p+2]+=vz+fz;}
    if(st%2===0||st>steps-40)repel();
    /* follow the leader from the root: inextensible, a little stiff (more so near the root), never folding tighter than rmin */
    for(let i=0;i<n;i++){const L=SEGL[i],aMax=Math.min(0.9,L/rmin),cM=Math.cos(aMax),sM=Math.sin(aMax),o0=off[i];
      for(let k=KS[i];k<gd[i].K;k++){const q=o0+k,p=q*3,a=p-3,b=p-6;D[p]=X[p];D[p+1]=X[p+1];D[p+2]=X[p+2];
        let dx=X[p]-X[a],dy=X[p+1]-X[a+1],dz=X[p+2]-X[a+2],d=Math.hypot(dx,dy,dz)||1e-9;dx/=d;dy/=d;dz/=d;
        const pd=Math.hypot(X[a]-X[b],X[a+1]-X[b+1],X[a+2]-X[b+2])||1e-9,px=(X[a]-X[b])/pd,py=(X[a+1]-X[b+1])/pd,pz=(X[a+2]-X[b+2])/pd,s=k*L,stf=lerp(0.3,0.015,smooth((s-(gd[i].arc||0))/0.07));
        dx+=(px-dx)*stf;dy+=(py-dy)*stf;dz+=(pz-dz)*stf;d=Math.hypot(dx,dy,dz)||1e-9;dx/=d;dy/=d;dz/=d;
        /* bob ends turn under (towards the neck); the waves and curls are laid on afterwards (see below) */
        {const hd=X[a+1]>hc.y-ry*0.6,ox0=X[a]-(hd?hc.x:0),oz0=X[a+2]-(hd?hc.z:0),ol=Math.hypot(ox0,oz0)||1,ox=ox0/ol,oz=oz0/ol;
          if(o.tipCurl){const u=s/gd[i].L,cu=o.tipCurl*smooth((u-0.6)/0.4);dx-=ox*cu;dz-=oz*cu;}
          d=Math.hypot(dx,dy,dz)||1e-9;dx/=d;dy/=d;dz/=d;}
        const c=dx*px+dy*py+dz*pz;if(c<cM){let qx=dx-px*c,qy=dy-py*c,qz=dz-pz*c;const ql=Math.hypot(qx,qy,qz)||1e-9;qx/=ql;qy/=ql;qz/=ql;dx=px*cM+qx*sM;dy=py*cM+qy*sM;dz=pz*cM+qz*sM;}
        X[p]=X[a]+dx*L;X[p+1]=X[a+1]+dy*L;X[p+2]=X[a+2]+dz*L;
        let hit=0;for(let r=0;r<2;r++){const h=collide(p,k);if(!h)break;hit|=h;const ex=X[p]-X[a],ey=X[p+1]-X[a+1],ez=X[p+2]-X[a+2],ed=Math.hypot(ex,ey,ez)||1e-9;X[p]=X[a]+ex/ed*L;X[p+1]=X[a+1]+ey/ed*L;X[p+2]=X[a+2]+ez/ed*L;}
        CT[q]=hit?1:0;CB[q]=hit&2?1:0;TP[q]=hit&8?1:0;if(hit){Q[p]=lerp(Q[p],X[p],0.5);Q[p+1]=lerp(Q[p+1],X[p+1],0.5);Q[p+2]=lerp(Q[p+2],X[p+2],0.5);}
        D[p]=X[p]-D[p];D[p+1]=X[p+1]-D[p+1];D[p+2]=X[p+2]-D[p+2];}
      for(let k=KS[i];k+1<gd[i].K;k++){const p=(o0+k)*3;Q[p]+=0.9*D[p+3];Q[p+1]+=0.9*D[p+4];Q[p+2]+=0.9*D[p+5];}}}
  /* occlusion: how much hair lies further out from each point (density sampled outward over 3 cm) */
  const AO=new Float32Array(NP);{const c2=0.008,M=new Map(),kk=(a,b,c)=>a+','+b+','+c;
    for(let q=0;q<NP;q++){const p=q*3,k=kk(Math.floor(X[p]/c2),Math.floor(X[p+1]/c2),Math.floor(X[p+2]/c2));M.set(k,(M.get(k)||0)+1);}
    for(let q=0;q<NP;q++){const p=q*3,y=X[p+1],cx=y>hc.y-ry*0.6?hc.x:0,cy=y>hc.y-ry*0.6?hc.y:y,cz=y>hc.y-ry*0.6?hc.z:0;let ox=X[p]-cx,oy=X[p+1]-cy,oz=X[p+2]-cz;const ol=Math.hypot(ox,oy,oz)||1;ox/=ol;oy/=ol;oz/=ol;
      let s=0;for(let j=1;j<=4;j++){const t=j*0.0075;s+=M.get(kk(Math.floor((X[p]+ox*t)/c2),Math.floor((X[p+1]+oy*t)/c2),Math.floor((X[p+2]+oz*t)/c2)))||0;}AO[q]=Math.exp(-s*0.045*seg/0.011);}
    /* (smoothed along each guide: no blotches) */
    for(let it=0;it<4;it++)for(let i=0;i<n;i++){const a=off[i],b=off[i+1];let pv=AO[a];for(let q=a+1;q<b-1;q++){const c=AO[q];AO[q]=(pv+c*2+AO[q+1])/4;pv=c;}}}
  /* the hair's set: waves and curls laid on the settled guides as an offset in each guide's frame - a shape the hair holds,
     not a force (pushed into every step, the waves fought gravity, grew and crossed their neighbours: a net of locks).
     Each guide is resampled along a smooth curve through its points, finer for curls (11 mm points drew a curl as a
     zigzag); its length is that of the path the lock takes, the curl coils round it (curly hair is shorter than straight) */
  const fine=WH?0.003:TX.wave?0.005:seg,T3=[0,0,0],tmpP=new Float32Array(3);
  const out=[];for(let i=0;i<n;i++){const K0=gd[i].K,o0=off[i],L=SEGL[i],arc=gd[i].arc||0,K=Math.max(K0,Math.round((K0-1)*L/fine)+1),P=new Float32Array(K*3),AOg=new Float32Array(K),ds=L*(K0-1)/(K-1);
    /* vertex tangents of the settled guide */
    const TV=new Float32Array(K0*3);for(let k=0;k<K0;k++){const a=(o0+Math.max(0,k-1))*3,b=(o0+Math.min(K0-1,k+1))*3;let tx=X[b]-X[a],ty=X[b+1]-X[a+1],tz=X[b+2]-X[a+2];const tl=Math.hypot(tx,ty,tz)||1;TV[k*3]=tx/tl;TV[k*3+1]=ty/tl;TV[k*3+2]=tz/tl;}
    let ph=WP[i],yPrev=0,ph0g=0;
    for(let k=0;k<K;k++){const f=k*ds/L,a=Math.min(K0-2,Math.floor(f)),u=f-a,s=f*L,ia=Math.max(0,a-1),ib=Math.min(K0-1,a+2),u2=u*u,u3=u2*u;
      /* the base: a Catmull-Rom curve through the guide's points */
      for(let c=0;c<3;c++){const p0=X[(o0+ia)*3+c],p1=X[(o0+a)*3+c],p2=X[(o0+a+1)*3+c],p3=X[(o0+ib)*3+c];tmpP[c]=0.5*(2*p1+(p2-p0)*u+(2*p0-5*p1+4*p2-p3)*u2+(3*p1-p0-3*p2+p3)*u3);
        T3[c]=lerp(TV[a*3+c],TV[a*3+3+c],u);}
      let tl=Math.hypot(T3[0],T3[1],T3[2])||1;const tx=T3[0]/tl,ty=T3[1]/tl,tz=T3[2]/tl,x=tmpP[0],y=tmpP[1],z=tmpP[2];
      /* the frame: N out of the head (higher up) or the body (lower down), B across the hair's surface */
      const w=smooth((y-(hc.y-ry*0.95))/(ry*0.35));let nx=x-hc.x*w,ny=0,nz=z-hc.z*w;{const dd=nx*tx+ny*ty+nz*tz;nx-=tx*dd;ny-=ty*dd;nz-=tz*dd;const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;}
      const bx=ty*nz-tz*ny,by=tz*nx-tx*nz,bz=tx*ny-ty*nx;
      /* (waves go by height: two locks side by side, one lying deeper in the hair, wave together at the same height - by
         length along each they drifted apart and the strands blended between them crossed) */
      const us=s-arc;if(us>0){if(WH)ph+=TAU*ds/(WLg[i]*(1+0.16*Math.sin(us*11+WP[i]*3)));else ph+=TAU*Math.max(Math.abs(y-yPrev),0.35*ds)/WLg[i];}
      else if(!WH)ph=WP[i]+TAU*(hc.y-y)/WLg[i];yPrev=y;
      const ramp=smooth((us+0.005)/(WH?0.04:0.07)),Am=WAg[i]*ramp*(1+(WH?0.25:0.3)*smooth((us-0.05)/0.3));
      let ob,on;if(WH){ob=Math.cos(ph)*HAND[i]-Math.cos(WP[i])*HAND[i]*ramp;on=Math.sin(ph)*(TX.wave===2?0.6:1);}
      else{if(us<=0)ph0g=ph;const sw=Math.sin(ph)-Math.sin(ph0g)*ramp;ob=sw*WPL[i][0];on=sw*WPL[i][1];}
      const q=k*3;P[q]=x+(bx*ob+nx*on)*Am;P[q+1]=y+(by*ob+ny*on)*Am;P[q+2]=z+(bz*ob+nz*on)*Am;
      /* (kept off the head, the body and the arms) */
      if(a+1>=KS[i])for(let r=0;r<2;r++)if(!collide(q,a+1,P))break;
      AOg[k]=lerp(AO[o0+a],AO[o0+a+1],u);}
    out.push({P,AO:AOg,K,L:gd[i].L});}
  return out;}
/* the drawn strands: roots spread over the same region, each following its nearest guides */
function flowStrands(gd,sim,o,ro){
  const hc=BC.headC,ry=BC.hd.ry,T=hairTexP(),HT=headTab(),R=rng(9091+gd.length),n=gd.length;
  /* per guide: unit tangents and a transported frame (N: out of the scalp at the root) */
  const FR=sim.map((s,i)=>{const K=s.K,P=s.P,Tg=new Float32Array(K*3),N=new Float32Array(K*3);let nx=gd[i].P.x-hc.x,ny=gd[i].P.y-hc.y,nz=gd[i].P.z-hc.z;
    for(let k=0;k<K;k++){const a=Math.max(0,k-1)*3,b=Math.min(K-1,k+1)*3;let tx=P[b]-P[a],ty=P[b+1]-P[a+1],tz=P[b+2]-P[a+2];const tl=Math.hypot(tx,ty,tz)||1;tx/=tl;ty/=tl;tz/=tl;
      const dd=nx*tx+ny*ty+nz*tz;nx-=tx*dd;ny-=ty*dd;nz-=tz*dd;const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;Tg.set([tx,ty,tz],k*3);N.set([nx,ny,nz],k*3);}
    return{Tg,N};});
  /* a guide's point at fraction t of its length (linear between its points) */
  const gAt=(i,t,out,o3)=>{const s=sim[i],f=clamp(t,0,1)*(s.K-1),k=Math.min(s.K-2,Math.floor(f)),u=f-k,P=s.P;for(let c=0;c<3;c++)out[o3+c]=lerp(P[k*3+c],P[k*3+3+c],u);return k;};
  /* (curly hair: fewer strands - each is three times as long in points, and the curls fill the volume anyway; a strand's
     points every 15 mm in straight hair (the guides are smooth curves), 7.5 mm in waves, 4.8 mm in curls) */
  const per=window.__perGuide||Math.round((o.perGuide||70)*STRAND_Q/0.62*(T.wave>=2?0.4:1)*(HAIR_LOD||QUALITY==='perf'?0.6:1)),NS=n*per,list=[];
  const gp=gd.map(g=>g.P),ph0=gd.map(()=>R()*TAU),cTip=gd.map(()=>0.25+0.35*R());
  const A=new Float32Array(3),B3=new Float32Array(3);
  let made=0,tries=0;
  while(made<NS&&tries<NS*6){tries++;
    const ny=1-2*R(),ph=wrapA(R()*TAU);if(ny<-0.6||!flowRootOK(ny,ph,ro))continue;made++;
    const P0=headPt(Math.acos(clamp(ny,-0.99,0.995)),ph,0.0012);
    /* the three nearest guide roots, inverse-distance weights */
    let nb=[[-1,9],[-1,9],[-1,9]];for(let i=0;i<n;i++){const d=gp[i].distanceToSquared(P0);if(d<nb[2][1]){nb[2]=[i,d];nb.sort((a,b)=>a[1]-b[1]);}}
    nb=nb.filter(q=>q[0]>=0);const w0=nb.map(q=>1/(Math.sqrt(q[1])+0.002)),i0=nb[0][0];
    /* uneven ends: each strand a little shorter or longer than its guides */
    const tEnd=lerp(0.86,1,Math.pow(R(),0.6)),fly=R()<0.02,dep=R(),tone=(1.02+0.16*R());
    const Lm=nb.reduce((s,q,j)=>s+gd[q[0]].L*w0[j],0)/w0.reduce((a,b)=>a+b,0),sp=(T.wave>=2?0.0048:T.wave?0.0075:0.015)*(HAIR_LOD?1.6:QUALITY==='perf'?1.3:1),K=Math.max(4,Math.round(tEnd*Lm/sp)+1);
    const Fp=new Float32Array(K*3),AO=new Float32Array(K);
    /* the offset from each guide's root to this strand's root, in that guide's frame at the root */
    const offs=nb.map(([i])=>{const Tg=FR[i].Tg,N=FR[i].N,ox=P0.x-gp[i].x,oy=P0.y-gp[i].y,oz=P0.z-gp[i].z,bx=Tg[1]*N[2]-Tg[2]*N[1],by=Tg[2]*N[0]-Tg[0]*N[2],bz=Tg[0]*N[1]-Tg[1]*N[0];return[ox*N[0]+oy*N[1]+oz*N[2],ox*bx+oy*by+oz*bz,ox*Tg[0]+oy*Tg[1]+oz*Tg[2]];});
    /* (over the scalp the strands blend their guides and lie flat; they gather into locks only once off the head) */
    const Lg=gd[i0].L,arcG=gd[i0].arc||0,wph=ph0[i0]+(R()-0.5)*0.5,curlR=0.0035+0.002*R(),sCl=0.6+0.8*R();
    /* the strand's place along a neighbouring guide: over the scalp in proportion, from where the hair leaves the scalp
       on by the same distance (the same fraction of two guides of different lengths put a strand's points on different
       heights: it cut across the hair, and blended out of step its waves cancelled out) */
    const fG=gd[i0].L-arcG,tOf=(i,s)=>{const g=gd[i],a=g.arc||0;return Math.min(1,s<arcG?(arcG>1e-4?s/arcG*a:s)/g.L:(a+s-arcG)/g.L);};
    /* the lock gathers its strands only towards its end (gathered all the way down, each lock read as a feather) */
    const clEnd=smooth((fG-0.04)/0.2);
    const WF=[1,1,1],dsP=Lg*tEnd/(K-1);
    for(let k=0;k<K;k++){const t=k/(K-1)*tEnd,sP=t*Lg,uF=fG>1e-3?(sP-arcG)/fG:0,cr=smooth((uF-0.4)/0.6)*clEnd;let sx=0,sy=0,sz=0,sw=0;gAt(i0,t,B3,0);
      for(let j=0;j<nb.length;j++){const i=nb[j][0],kk=gAt(i,j?tOf(i,sP):t,A,0);const dv=Math.hypot(A[0]-B3[0],A[1]-B3[1],A[2]-B3[2]);
        /* (the strand blends its neighbouring guides all the way down while they stay together - an even fall of hair;
           where they part (over a shoulder, one in front and one behind) it keeps to its own; towards the end it belongs
           to its own lock) */
        /* (a neighbour once parted stays parted, and is let go of gradually: the waves move the guides to and fro and a
           weight following their distance point by point threw the strand from one to the other, across the hair) */
        if(j){WF[j]=Math.min(WF[j],Math.max(1-smooth((dv-0.014)/0.014),WF[j]-dsP/0.05));}
        let w=w0[j]*(j===0?1:(1-0.9*cr)*WF[j]);if(w<=0)continue;
        const Tg=FR[i].Tg,N=FR[i].N,t3=kk*3,bx=Tg[t3+1]*N[t3+2]-Tg[t3+2]*N[t3+1],by=Tg[t3+2]*N[t3]-Tg[t3]*N[t3+2],bz=Tg[t3]*N[t3+1]-Tg[t3+1]*N[t3],cl=lerp(1,cTip[i]*sCl,cr),[on,ob,ot]=offs[j];
        const px=A[0]+(N[t3]*on+bx*ob)*cl+Tg[t3]*ot*(1-smooth(t/0.05)),py=A[1]+(N[t3+1]*on+by*ob)*cl+Tg[t3+1]*ot*(1-smooth(t/0.05)),pz=A[2]+(N[t3+2]*on+bz*ob)*cl+Tg[t3+2]*ot*(1-smooth(t/0.05));
        sx+=px*w;sy+=py*w;sz+=pz*w;sw+=w;}
      let x=sx/sw,y=sy/sw,z=sz/sw;
      /* waves (a lock's strands wave together) and curls; frizz; a rare stray lifting off */
      const kn=Math.min(sim[i0].K-1,Math.round(t*(sim[i0].K-1)))*3,Tg=FR[i0].Tg,N=FR[i0].N,bx=Tg[kn+1]*N[kn+2]-Tg[kn+2]*N[kn+1],by=Tg[kn+2]*N[kn]-Tg[kn]*N[kn+2],bz=Tg[kn]*N[kn+1]-Tg[kn+1]*N[kn],s=t*gd[i0].L,ramp=smooth((s-0.04)/0.08);
      /* (the waves and curls are in the guides; each curly strand also coils a little round its lock) */
      if(T.wave>=2){const a=wph*3+s*TAU/(0.011+0.004*T.wave),Aw=0.0009*T.wave*ramp;const c1=Math.cos(a),s1=Math.sin(a);x+=bx*Aw*c1+N[kn]*Aw*s1;y+=by*Aw*c1+N[kn+1]*Aw*s1;z+=bz*Aw*c1+N[kn+2]*Aw*s1;}
      {const fr=0.0007*ramp*Math.sin(wph*3+s*70);x+=bx*fr;y+=by*fr;z+=bz*fr;}
      if(fly){const f=0.012*smooth((t-0.3)/0.7);x+=N[kn]*f+bx*f*0.5*Math.sin(wph);y+=N[kn+1]*f;z+=N[kn+2]*f;}
      /* never inside the head (nor the dark scalp under the hair); layered over it by depth */
      {const dx=x-hc.x,dy=y-hc.y,dz=z-hc.z,d=Math.hypot(dx,dy,dz)||1e-6;if(dy>-ry*0.8){const Rr=HT.at(dx,dy,dz,d)+0.0026+0.0022*dep*(1-smooth((t*Lg-arcG)/0.05));if(d<Rr){x=hc.x+dx*Rr/d;y=hc.y+dy*Rr/d;z=hc.z+dz*Rr/d;}}}
      Fp[k*3]=x;Fp[k*3+1]=y;Fp[k*3+2]=z;
      const ao=sim[i0].AO[Math.min(sim[i0].K-1,Math.round(t*(sim[i0].K-1)))];AO[k]=lerp(0.72,1,ao)*lerp(0.86,1,dep);}
    list.push({P:Fp,K,w0:0.00042*(0.8+0.4*R()),w1:0.00011,tone,ao:AO,root:0.82});}
  return list;}
/* the locks (the look since round 16): one per guide, a closed, flattened tube along it - a lock of many hairs drawn as one
   sculpted piece, as games draw hair, instead of thousands of single strands. Over the scalp each lock is broad and flat,
   lying like a shingle over its neighbours (each at its own small height above the scalp: no two coincide); off the head
   it narrows and fills out and tapers to a point at its end; curls are narrow and round. Section: an ellipse whose edges
   curl in towards the head, its seam on the inner side. Returns flat arrays (built into a geometry by lockGeo). */
function flowLocks(gd,sim){
  const hc=BC.headC,ry=BC.hd.ry,T=hairTexP(),R=rng(5151+gd.length),n=gd.length,M=8,WH=T.wave>=2;
  /* (curls: every other guide makes a lock - a thick round rope coiling a little round its axis, its grooves twisted with
     the coil: a ringlet as games draw it. Thin tubes along the coils, or ribbons, read as noodles or crumpled paper) */
  const drawn=WH?Math.ceil(n/2):n,sc=Math.sqrt(420/drawn),WS=0.024*sc,WF=(WH?0.012:T.wave?0.024:0.022)*Math.min(1.5,sc),TH=WH?0.012:0.0045,CW=WH?[0,0,0.062,0.044][T.wave]:0;
  const sp=(WH?0.0045:T.wave?0.0075:0.012)*(HAIR_LOD?1.5:1);
  const KL=sim.map((q,i)=>WH&&i%2?0:Math.max(4,Math.round(q.L/sp)+1));let nv=0,ni=0;for(const k of KL){if(!k)continue;nv+=k*(M+1);ni+=(k-1)*M*6;}
  const P=new Float32Array(nv*3),N=new Float32Array(nv*3),U=new Float32Array(nv*2),C=new Float32Array(nv*3),HT=new Float32Array(nv*3),I=new Uint32Array(ni);
  let v=0,w=0;const A=[0,0,0],Tg=[0,0,0];
  for(let i=0;i<n;i++){const q=sim[i],K=q.K,G=q.P,arc=gd[i].arc||0,Kl=KL[i];if(!Kl)continue;
    /* the guide's length along its points, to place the lock's rings evenly by length */
    const S=new Float32Array(K);for(let k=1;k<K;k++)S[k]=S[k-1]+Math.hypot(G[k*3]-G[k*3-3],G[k*3+1]-G[k*3-2],G[k*3+2]-G[k*3-1]);const Lg=S[K-1]||1e-6;
    const wk=0.82+0.36*R(),tone=0.95+0.12*R(),h0=0.0005+0.0013*R(),tipW=0.22+0.25*R(),fr=Math.max(1e-3,Lg-arc);
    let m0=0;const v0=v;
    /* (each lock starts 1 cm before its root, back along its direction, tucked under the parting: the locks of both sides
       meet there - starting at their roots, up to a spacing apart from the line, they left a gap widening at the front) */
    const EX=0.01;
    for(let j=0;j<Kl;j++){const s=-EX+(Lg+EX)*j/(Kl-1);while(m0<K-2&&S[m0+1]<s)m0++;const u=s<0?s/((S[1]-S[0])||1):clamp((s-S[m0])/((S[m0+1]-S[m0])||1),0,1);
      for(let c=0;c<3;c++){A[c]=lerp(G[m0*3+c],G[m0*3+3+c],u);Tg[c]=G[m0*3+3+c]-G[m0*3+c];}
      /* (the tangent smoothed over the neighbouring segments: the highlight runs on without steps) */
      if(m0>0)for(let c=0;c<3;c++)Tg[c]+=(G[m0*3+c]-G[m0*3-3+c])*(1-u);if(m0<K-2)for(let c=0;c<3;c++)Tg[c]+=(G[m0*3+6+c]-G[m0*3+3+c])*u;
      let tl=Math.hypot(Tg[0],Tg[1],Tg[2])||1;const tx=Tg[0]/tl,ty=Tg[1]/tl,tz=Tg[2]/tl,x=A[0],y=A[1],z=A[2];
      /* out of the head (round its centre) higher up, out of the body (round its axis) lower down */
      const hw=smooth((y-(hc.y-ry*0.95))/(ry*0.35));let nx=x-hc.x*hw,ny=(y-hc.y)*hw,nz=z-hc.z*hw;{const dd=nx*tx+ny*ty+nz*tz;nx-=tx*dd;ny-=ty*dd;nz-=tz*dd;const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;}
      const bx=ty*nz-tz*ny,by=tz*nx-tx*nz,bz=tx*ny-ty*nx;
      /* (a curl's twist: the angle of the guide round the coil's axis - the guide averaged over a turn - in this frame) */
      let tw=0;if(WH&&s>arc){let ax=0,ay=0,az=0,cn=0;for(let k=Math.max(0,m0-40);k<Math.min(K,m0+41);k++){if(Math.abs(S[k]-s)>CW*0.5)continue;ax+=G[k*3];ay+=G[k*3+1];az+=G[k*3+2];cn++;}
        if(cn>2){const rx=x-ax/cn,ry2=y-ay/cn,rz=z-az/cn;tw=Math.atan2(rx*nx+ry2*ny+rz*nz,rx*bx+ry2*by+rz*bz)/TAU;}}
      /* the width and thickness along the lock */
      const us=s-arc,a=1-smooth((us+0.005)/0.05),f=clamp(us/fr,0,1),tap=1-(1-tipW)*smooth((f-0.45)/0.55),end=Math.sqrt(clamp((1-s/Lg)/0.06,0,1)),root=s<0?lerp(0.25,0.55,1+s/EX):lerp(0.55,1,smooth(s/0.012));
      const hwid=0.5*lerp(WF*wk*tap,WS*wk,a)*end*root,hth=0.5*lerp(TH*lerp(0.55,1,tap),0.0028,a)*end*root,lift=h0*a-(s<0?0.003*(-s/EX):0);
      const ao=q.AO[clamp(Math.round(m0+u),0,K-1)],sh=tone*lerp(0.5,1,ao)*lerp(0.85,1,smooth(s/0.04));
      for(let m=0;m<=M;m++){const th=-Math.PI/2+TAU*m/M,ct=Math.cos(th),st=Math.sin(th),ox=ct*hwid,oy=st*hth-0.35*hth*ct*ct+lift;
        const ex=ct/(hwid||1e-6),ey=st/(hth||1e-6),el=Math.hypot(ex,ey)||1,qb=ex/el,qn=ey/el,o3=v*3;
        P[o3]=x+bx*ox+nx*oy;P[o3+1]=y+by*ox+ny*oy;P[o3+2]=z+bz*ox+nz*oy;
        N[o3]=bx*qb+nx*qn;N[o3+1]=by*qb+ny*qn;N[o3+2]=bz*qb+nz*qn;HT[o3]=tx;HT[o3+1]=ty;HT[o3+2]=tz;
        U[v*2]=m/M+tw;U[v*2+1]=0;C[o3]=C[o3+1]=C[o3+2]=sh;v++;}}
    for(let j=0;j+1<Kl;j++)for(let m=0;m<M;m++){const a=v0+j*(M+1)+m,b=a+M+1;I[w++]=a;I[w++]=b;I[w++]=a+1;I[w++]=a+1;I[w++]=b;I[w++]=b+1;}}
  return{P,N,U,C,HT,I};}
/* a geometry from the locks' arrays (copies: the hair is moved in place afterwards - over a collar, onto the clothes - and
   the arrays stay cached) */
function lockGeo(L){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(L.P.slice(),3));g.setAttribute('normal',new THREE.BufferAttribute(L.N.slice(),3));
  g.setAttribute('uv',new THREE.BufferAttribute(L.U.slice(),2));g.setAttribute('color',new THREE.BufferAttribute(L.C.slice(),3));g.setAttribute('hairT',new THREE.BufferAttribute(L.HT.slice(),3));
  g.setIndex(new THREE.BufferAttribute(L.I.slice(),1));g.userData.keepNormals=true;return g;}
function tubeAlong(curve,n,rf,o={}){
  const fr=curve.computeFrenetFrames(n,false),out=[];
  for(let i=0;i<=n;i++){const t=i/n,r=rf(t);out.push({c:curve.getPointAt(t),rx:r,rz:r,u:fr.normals[i],v:fr.binormals[i],t});}
  return tube(out,{seg:o.seg||12,noAO:true,uRep:o.uRep||3,vRep:o.vRep||1/0.03});
}
/* clearance radius for falling hair at height y in direction ph */
function hairClear(y,ph,extra){
  const hr=headHorizR(y,ph);let R=Math.max(hr!=null?hr+extra:0,envR(bodyEnv(y,LAYERS),ph)+extra*0.8);
  if(hr==null)R=Math.max(R,BC.neckR+extra);return R;
}
function hairLocks(G,mat,o){
  const hc=BC.headC,n=o.n,ga=Math.PI*(3-Math.sqrt(5)),R=rng(17),locks=[];
  for(let i=0;i<n*3&&locks.length<600;i++){
    const yy=1-(i/(n*3-1))*1.6;if(yy<-0.6)break;
    const rr=Math.sqrt(Math.max(0,1-yy*yy)),ph0=i*ga;let ph=Math.atan2(Math.sin(ph0)*rr,Math.cos(ph0)*rr);
    const ny=yy;if(ny<hairlineNy(ph)+0.06)continue;
    const th=Math.acos(ny),P0=headPt(th,ph,o.base||0.008,false),pts=[P0];
    const out=P0.clone().sub(hc).normalize();
    let p=P0.clone().addScaledVector(out,o.stand||0.02);p.y-=0.006;
    /* locks from the front of the head are combed back over it first (they do not fall over the face) */
    if(angFront(ph)<1.05&&!o.short){const v=P0.clone().sub(hc);for(let k=1;k<=4;k++){const a=-k*0.36,c=Math.cos(a),sn=Math.sin(a);const w=V3(v.x,v.y*c-v.z*sn,v.y*sn+v.z*c);w.multiplyScalar((w.length()+(o.base||0.008)+o.r*1.6+0.004)/w.length());p=hc.clone().add(w);pts.push(p.clone());}ph=Math.atan2(p.z-hc.z,p.x);}
    else pts.push(p.clone());
    locks.push({pts,ph,len:o.len*(0.85+R()*0.3)});}
  if(o.short){for(const L of locks){const pts=L.pts;let p=pts[pts.length-1],ph=L.ph;const steps=Math.max(3,Math.round(L.len/0.045)),dy=L.len/steps;let Rp=Math.hypot(p.x,p.z-hc.z);
      for(let k=0;k<steps;k++){const y=p.y-dy*0.5;const need=hairClear(y,ph,0.014+o.r);const Rn=Math.max(need,Rp-0.012+0.01);Rp=Rn;p=V3(Math.cos(ph)*Rn,y,hc.z+Math.sin(ph)*Rn);pts.push(p.clone());}
      const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');G.add(mk(tubeAlong(curve,Math.max(8,steps*3),t=>o.r*(1-0.3*t*t)*(t<0.04?0.8:1),{seg:7}),mat));}
    return;}
  /* long locks (dreads, braids) hang as simulated strands: over the head, resting on the shoulders, down the back or in
     front of the shoulders (the ones from the front and sides of the head), each its own way */
  const nv=18,roots=locks.map(L=>{const p0=L.pts[L.pts.length-2],p1=L.pts[L.pts.length-1],D=drapeSide(L.ph,S.hair.drape||'auto');
    return {p0,p1,ph:L.ph,len:L.len,bias:D.side,xt:D.xt};});
  const yMin=Math.min(...roots.map(r=>r.p1.y-r.len)),field=hairField(hc.y+BC.hd.ry,yMin-0.2);
  const cols=hairDrape(roots,nv,{field,thin:o.r+0.003,thick:o.r+0.003,bodyClr:o.r+0.005,lat:false,band:!!(S.acc.headband&&S.acc.headband.type==='forehead')});
  locks.forEach((L,i)=>{const pts=L.pts.slice(0,-2).concat(cols[i]);const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
    G.add(mk(tubeAlong(curve,Math.max(16,pts.length*2),t=>o.r*(1-0.3*t*t)*(t<0.04?0.8:1),{seg:7}),mat));});
}
function hairBun(G,mat,ny,ph,r){
  const hc=BC.headC,th=Math.acos(ny),P=headPt(th,ph,0.008+r*0.75,false);
  const b=mk(new THREE.SphereGeometry(1,32,22),mat);b.scale.set(r,r*0.86,r*0.95);b.position.copy(P);b.quaternion.copy(qFromTo(VY,P.clone().sub(hc)));G.add(b);
  /* strands wound round the bun (cards over its surface, from the top down and round) */
  {b.updateMatrix();const sg=b.geometry.clone().applyMatrix4(b.matrix);hairCards(G,sg,32,22,{wrapU:true,out:'ring',len:r*2.2,count:160,w:0.014,lift:0.001,fan:0.002,v0:0.04,v1:0.96,drift:0.5,kind:hairTexP().wave>=2?'coil':'strand'});}
  const tie=mk(new THREE.TorusGeometry(r*0.55,0.004,8,24),plain('#1b1a19',.6));tie.position.copy(headPt(th,ph,0.01,false));tie.quaternion.copy(qFromTo(VZ,P.clone().sub(hc)));G.add(tie);
}
function hairTail(G,mat,ny,len,r){
  const hc=BC.headC,th=Math.acos(ny),P0=headPt(th,BACKA,0.006,false),pts=[P0];
  let p=P0.clone().add(V3(0,0.012,-0.04));pts.push(p.clone());
  const steps=6;
  for(let k=1;k<=steps;k++){const y=P0.y-len*k/steps;const R=hairClear(y,BACKA,0.012+r*(1-k/steps*0.5));p=V3(0,y,hc.z-R);pts.push(p);}
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
  const rf=t=>r*(0.62+0.5*Math.sin(Math.min(1,t*1.6+0.15)*Math.PI*0.8))*(1-0.75*smooth((t-0.6)/0.4));
  /* the tail is strands filling its volume (a dark core inside them, thinner, ending before the tip) */
  G.add(mk(tubeAlong(curve,40,t=>rf(t)*0.72*(1-smooth((t-0.7)/0.25)),{seg:12,uRep:5}),hairCoreMat(S.hair.color)));
  tailStrands(G,curve,rf);
  const tie=mk(new THREE.TorusGeometry(r*0.62,0.004,8,24),plain('#1b1a19',.6));tie.position.copy(pts[1]);tie.quaternion.copy(qFromTo(VZ,pts[2].clone().sub(pts[1])));G.add(tie);
}
/* strands of a ponytail: each at its own place in the tail's section (denser outside), following the tail's line with a
   slow twist and a gentle sway, the ends at different lengths (the tip is a soft brush, not a cut) */
function tailStrands(G,curve,rf){
  const T=hairTexP(),R=rng(911),N=Math.round(1400*STRAND_Q/0.62*0.62+600),NP=40,fr=curve.computeFrenetFrames(NP,false),C=[],list=[];
  for(let i=0;i<=NP;i++)C.push(curve.getPointAt(i/NP));const Ltot=curve.getLength();
  for(let s=0;s<N;s++){const a0=R()*TAU,rr=Math.sqrt(0.15+0.85*R()),tEnd=lerp(0.78,1,Math.pow(R(),0.6)),tw=(R()-0.5)*1.2,ph=R()*TAU,K=Math.max(4,Math.round(tEnd*NP)+1),F=new Float32Array(K*3),AO=new Float32Array(K);
    for(let k=0;k<K;k++){const t=k/(K-1)*tEnd,f=t*NP,i=Math.min(NP-1,Math.floor(f)),b=f-i,P=C[i].clone().lerp(C[i+1],b),Nn=fr.normals[i].clone().lerp(fr.normals[i+1],b),Bn=fr.binormals[i].clone().lerp(fr.binormals[i+1],b);
      const a=a0+tw*t*TAU*0.5,rad=rf(t)*rr*(1+0.04*Math.sin(ph+t*9)),w=T.wave?0.004*T.wave*Math.sin(ph+t*Ltot*(18+8*T.wave)):0;
      P.addScaledVector(Nn,Math.cos(a)*rad+w*Math.cos(ph)).addScaledVector(Bn,Math.sin(a)*rad+w*Math.sin(ph));F[k*3]=P.x;F[k*3+1]=P.y;F[k*3+2]=P.z;AO[k]=lerp(0.55,1,rr*rr);}
    list.push({P:F,K,w0:0.00045*(0.8+0.4*R()),w1:0.00012,tone:0.95+0.18*R(),ao:AO,root:0.85});}
  addStrands(G,list);}
function hairFringe(G,mat,kind,thick){
  const hc=BC.headC,ry=BC.hd.ry,w=0.85;
  const y1={straight:ph=>hc.y+ry*0.2,curtain:ph=>{const d=Math.abs(ph-FRONT)/w;return hc.y+ry*(0.38-0.32*smooth(d));},side:ph=>hc.y+ry*(0.44-0.34*smooth((ph-FRONT+w)/(2*w)))}[kind];
  if(!y1)return;
  hairSheet(G,mat,{ph0:FRONT-w,ph1:FRONT+w,y0:()=>hc.y+ry*0.66,y1,thick:thick||0.011,thin:0.008,nu:60,nv:26,noBody:true,uRep:16,cards:{len:0.06,count:260,w:0.02,lift:0.0014,fan:0.0015,v0:0.02,v1:1,drift:0.03}});
}
/* ---------- style catalogue ---------- */
function afroH(R,lift){const hc=BC.headC,C2=hc.clone().add(V3(0,lift,-0.012));return(ny,d,ph,dir)=>{const o=hc.clone().sub(C2),b=o.dot(dir),t=-b+Math.sqrt(Math.max(0,b*b-(o.lengthSq()-R*R)));const base=headPt(Math.acos(ny),ph,0,false).distanceTo(hc);return Math.max(0.006,t-base);};}
function buildHair(G){
  const H=S.hair,st=H.style;SHELL_HF=null;
  buildBeard(G);
  if(!HAIR[st]||st==='none')return;
  const hc=BC.headC,ry=BC.hd.ry,T=hairTexP();
  const mat=hairMat(H.color,'v',T.wave>=2&&['afro','curlytop'].includes(st)?'coil':'strand'),bmat=hairMat(H.color,'v','braid');
  const front=d=>smooth((0.9-d)/0.9);
  const hat=capType()!=='none';
  const sheetTo={bob:hairLen(hc.y-0.06,hc.y-0.13),lob:hairLen(1.5,1.38),long:hairLen(1.32,1.02),mullet:hairLen(1.52,1.38),wolf:hairLen(1.53,1.4),curtains:hairLen(hc.y-0.04,hc.y-0.11)};
  /* hanging hair: independent simulated hairs (hairFlow); the old sheet only for a fringe */
  const sheet=(gap,to,thick,o={})=>{if(!hairFlow(G,Object.assign({gap,ring:!!o.noCrown,y0:ph=>{const hl=hat?hatLineNy(ph):null;return hc.y+ry*(hl!=null?Math.min(0.5,hl-0.05):0.5);},y1:ph=>to+(o.choppy?0.025*nz3(ph*6,1,2):0)+(o.longBack?-0.03*smooth((angFront(ph)-1.6)/1.2):0)},o)))sheetOld(gap,to,thick,o);};
  const sheetOld=(gap,to,thick,o={})=>hairSheet(G,mat,Object.assign({ph0:FRONT+gap,ph1:FRONT-gap+TAU,y0:ph=>{const hl=hat?hatLineNy(ph):null;return hc.y+ry*(hl!=null?Math.min(0.5,hl-0.05):0.5);},y1:ph=>to+(o.choppy?0.025*nz3(ph*6,1,2):0)+(o.longBack?-0.03*smooth((angFront(ph)-1.6)/1.2):0),thick,
    /* the sheet leaves the scalp shell tangentially (as thick as the shell where it starts): a thin start grew out of the shell as a ledge */
    thin:thick*0.85,crown:!hat&&!o.noCrown},o));
  /* under flowing hair: a thin dark scalp (the strands themselves cover the head, from the parting and the crown down) */
  /* (under the locks: nearly the hair's own colour - a darker core showed through every gap between them as a dark wedge) */
  const flowShell=()=>hairShell(G,hairCoreMat(H.color,-0.07),()=>0.0012,{noise:0,edge:.6});
  let fr=H.fringe&&H.fringe!=='none'?H.fringe:null;
  /* strand cards per style: length, width, count; dir -1 = combed from the hairline back (pulled back / slicked) */
  const C=(len,count,o={})=>Object.assign({len:len*2.4,count:Math.round(count*1.6),w:0.02,lift:0.0018,fan:0.0025},o,o.w?{w:o.w*1.4}:{});
  const coil=T.wave>=2,ck=coil?'coil':'strand';
  switch(st){
    case 'buzz':hairShell(G,hairMat(H.color,'v','coil'),()=>0.0016,{edge:.8,noise:0});break;
    case 'crew':hairShell(G,mat,ny=>0.004+0.011*smooth((ny-0.25)/0.5),{edge:.5,noise:.5,clump:.4,cards:C(0.03,320,{kind:'short',w:0.012,fan:0.002,minNy:0.15})});break;
    case 'fade':hairShell(G,mat,(ny,d)=>0.0016+0.024*smooth((ny-0.42)/0.33)*(1+0.25*front(d)),{edge:.7,noise:1,clump:.4,messy:0.006,cards:C(0.04,300,{kind:coil?'coil':'short',fan:0.006,minNy:0.5})});break;
    case 'quiff':hairShell(G,mat,(ny,d)=>0.002+smooth((ny-0.42)/0.3)*(0.014+0.032*gauss(d,0.75)*(1-0.55*smooth((ny-0.78)/0.2))),{edge:.6,noise:.5,clump:.4,cards:C(0.05,320,{dir:-1,minNy:0.45,fan:0.005})});break;
    case 'slick':hairShell(G,mat,ny=>0.005+0.013*smooth((ny-0.15)/0.6),{edge:.4,noise:.2,clump:.3,cards:C(0.07,300,{dir:-1,fan:0.0015,lift:0.0012,w:0.016,drift:0.02})});break;
    case 'sidepart':hairShell(G,mat,(ny,d,ph,dir)=>{let h=0.004+0.017*smooth((ny-0.2)/0.55)*(1+0.3*smooth((dir.x+0.2)/0.6));h-=0.007*gauss(dir.x+0.33,0.035)*smooth((ny-0.45)/0.2)*smooth((dir.z+0.2)/0.4);return h;},{edge:.4,noise:.4,clump:.4,cards:C(0.06,340,{fan:0.003,minNy:0.1})});break;
    case 'curtains':if(hat)hairShell(G,hat?mat:hairCoreMat(H.color),ny=>0.008+0.01*smooth((ny-0.2)/0.6),{under:hat?null:1.0,edge:.5,clump:.4,cards:hat?C(0.06,260,{endRand:0.55}):C(0.08,800,{kind:'strand',front:1.15,v0:0.2,v1:1,fan:0.0008,lift:0.0007})});else flowShell();sheet(1.05,sheetTo.curtains,0.011,{flare:-0.006,cards:C(0.1,160,{w:0.018,v0:0.02,v1:1})});fr=fr||'curtain';break;
    case 'curlytop':hairShell(G,mat,(ny,d)=>0.002+0.038*smooth((ny-0.42)/0.3)*(1+0.15*front(d)),{edge:.5,noise:1.2,clump:.4,cards:C(0.035,420,{kind:'coil',minNy:0.45,fan:0.007,drift:0.3})});break;
    case 'afro':{const base=afroH(hat?0.13:hairLen(0.14,0.19),hat?0:0.03);hairShell(G,mat,(ny,d,ph,dir)=>base(ny,d,ph,dir)*(1+0.07*fbm(dir.x*4,dir.y*4,dir.z*4)),{edge:.04,noise:1.2,band:.38,cards:C(0.03,520,{kind:'coil',w:0.016,fan:0.006,drift:0.5,lift:0.002})});break;}
    case 'twists':hairShell(G,mat,()=>0.01,{edge:.5,noise:.5});if(!hat)hairLocks(G,bmat,{n:70,len:hairLen(0.06,0.14),r:0.0072,stand:0.02,short:true});break;
    case 'cornrows':hairShell(G,bmat,(ny,d,ph,dir)=>0.0035+0.0045*Math.abs(Math.sin(dir.x*34)),{edge:.6,noise:0});break;
    case 'dreads':hairShell(G,bmat,()=>0.011,{edge:.5,noise:.3});hairLocks(G,bmat,{n:hat?40:80,len:hairLen(0.22,0.55),r:0.0078,stand:0.014});break;
    case 'braids':hairShell(G,bmat,(ny,d,ph,dir)=>0.006+0.003*Math.abs(Math.sin(dir.x*30)),{edge:.5,noise:0});hairLocks(G,bmat,{n:hat?60:115,len:hairLen(0.3,0.66),r:0.0055,stand:0.01});break;
    case 'mullet':hairShell(G,mat,ny=>0.008+0.016*smooth((ny-0.3)/0.5),{edge:.5,noise:1,clump:.4,messy:.004,cards:C(0.05,300,{endRand:0.55,kind:ck,fan:0.006})});sheet(1.75,sheetTo.mullet,0.016,{noCrown:1,choppy:1,flare:0.008,cards:C(0.09,160,{kind:ck,w:0.018,v0:0.02,v1:1,fan:0.006})});break;
    case 'wolf':if(hat)hairShell(G,hat?mat:hairCoreMat(H.color),ny=>0.012+0.022*smooth((ny-0.2)/0.6),{under:hat?null:0.93,edge:.5,noise:1.2,clump:.4,messy:.008,cards:hat?C(0.06,340,{endRand:0.55,kind:ck,fan:0.008,drift:0.12}):C(0.08,800,{kind:'strand',front:1.15,v0:0.2,v1:1,fan:0.003,lift:0.0012})});else flowShell();sheet(0.98,sheetTo.wolf,0.022,{choppy:1,flare:0.012,cards:C(0.1,240,{kind:ck,w:0.02,v0:0.02,v1:1,fan:0.008,drift:0.1})});fr=fr||'curtain';break;
    case 'pixie':hairShell(G,mat,(ny,d)=>0.008+0.018*smooth((ny-0.1)/0.6)*(1+0.3*front(d)),{edge:.45,noise:.8,clump:.4,messy:.004,cards:C(0.045,340,{kind:ck,fan:0.005,drift:0.1})});fr=fr||'side';break;
    case 'bob':if(hat)hairShell(G,hat?mat:hairCoreMat(H.color),ny=>0.01+0.012*smooth((ny-0.2)/0.6),{under:hat?null:0.8099999999999999,edge:.5,clump:.4,cards:hat?C(0.06,280,{endRand:0.55,kind:ck}):C(0.09,800,{kind:'strand',front:1.15,v0:0.2,v1:1,fan:0.0008,lift:0.0007})});else flowShell();sheet(0.86,sheetTo.bob,0.017,{tipCurl:0.12,flare:-0.004,cards:C(0.1,260,{kind:ck,w:0.02,v0:0.02,v1:1})});break;
    case 'lob':if(hat)hairShell(G,hat?mat:hairCoreMat(H.color),ny=>0.01+0.012*smooth((ny-0.2)/0.6),{under:hat?null:0.87,edge:.5,clump:.4,cards:hat?C(0.06,280,{endRand:0.55,kind:ck}):C(0.09,800,{kind:'strand',front:1.15,v0:0.2,v1:1,fan:0.0008,lift:0.0007})});else flowShell();sheet(0.92,sheetTo.lob,0.017,{tipCurl:0.05,flare:0.01,longBack:1,cards:C(0.13,320,{kind:ck,w:0.022,v0:0.02,v1:1})});break;
    case 'long':if(hat)hairShell(G,hat?mat:hairCoreMat(H.color),ny=>0.007+0.009*smooth((ny-0.2)/0.6),{under:hat?null:0.87,edge:.5,clump:.4,cards:hat?C(0.06,280,{endRand:0.55,kind:ck}):C(0.09,800,{kind:'strand',front:1.15,v0:0.2,v1:1,fan:0.0008,lift:0.0007})});else flowShell();sheet(0.92,sheetTo.long,0.017,{flare:0.01,nv:64,cards:C(0.18,380,{kind:ck,w:0.024,v0:0.02,v1:1})});break;
    case 'ponytail':hairShell(G,mat,ny=>0.005+0.006*smooth((ny-0.2)/0.6),{edge:.4,noise:.3,clump:.3,cards:C(0.07,300,{dir:-1,fan:0.0015,lift:0.0012,drift:0.02})});if(!hat||capType()==='baseball'||capType()==='trucker'||capType()==='kerchief')hairTail(G,mat,0.3,hairLen(0.2,0.45),0.024);break;
    case 'bun':hairShell(G,mat,ny=>0.005+0.006*smooth((ny-0.2)/0.6),{edge:.4,noise:.3,clump:.3,cards:C(0.07,300,{dir:-1,fan:0.0015,lift:0.0012,drift:0.02})});if(!hat)hairBun(G,mat,0.62,BACKA,0.046);break;
    case 'manbun':hairShell(G,mat,ny=>0.006+0.008*smooth((ny-0.2)/0.6),{edge:.4,noise:.4,clump:.3,cards:C(0.07,300,{dir:-1,fan:0.002,lift:0.0012,drift:0.02})});if(!hat)hairBun(G,mat,0.78,BACKA,0.034);break;
    case 'spacebuns':hairShell(G,mat,ny=>0.005+0.006*smooth((ny-0.2)/0.6),{edge:.4,noise:.3,clump:.3,cards:C(0.06,280,{fan:0.0015,lift:0.0012})});if(!hat){hairBun(G,mat,0.72,FRONT+1.15,0.037);hairBun(G,mat,0.72,FRONT-1.15,0.037);}break;
  }
  if(fr&&!hat)hairFringe(G,mat,fr,['bob','lob','long','wolf','curtains'].includes(st)?0.016:0.011);
}
/* ---------- facial hair ---------- */
function beardPatch(G,mat,dmax,nyTop,nyBot,hf){
  G.add(mk(surf(48,22,(u,v)=>{const ph=FRONT+(u*2-1)*dmax,d=Math.abs(ph-FRONT),t0=Math.acos(clamp(nyTop(d),-0.99,0.99)),t1=Math.acos(clamp(nyBot(d),-0.995,0.99)),th=lerp(t0,t1,v),ny=Math.cos(th);
    const edge=smooth(Math.min(v,1-v*0.3)/0.15)*smooth((dmax-d)/0.12);return headPt(th,ph,Math.max(0.0005,hf(ny,d)*lerp(0.04,1,edge)),true);},{noAO:true,uRep:10,vRep:2}),mat));
}
function buildBeard(G){
  const B=S.hair.beard;if(!B||B==='none')return;
  const col=S.hair.color,mat=hairMat(col,'v','coil');
  const top=d=>interp1([[0,-.4],[.4,-.36],[.8,-.24],[1.15,-.12],[1.32,-.12]],d);
  switch(B){
    case 'stubble':beardPatch(G,stubbleMat(shade(col,-0.1)),1.32,top,()=>-0.995,()=>0.0007);break;
    case 'short':beardPatch(G,mat,1.32,top,()=>-0.995,(ny,d)=>0.0035+0.003*smooth((-ny-0.6)/0.3));break;
    case 'full':beardPatch(G,mat,1.32,top,()=>-0.995,(ny,d)=>0.006+0.016*smooth((-ny-0.55)/0.35)*smooth((0.9-d)/0.6)+0.004*smooth((-ny-0.3)/0.3));break;
    case 'goatee':beardPatch(G,mat,0.48,()=>-0.5,()=>-0.98,(ny)=>0.004+0.006*smooth((-ny-0.7)/0.2));beardPatch(G,mat,0.52,()=>-0.33,()=>-0.43,()=>0.004);break;
    case 'mustache':beardPatch(G,mat,0.56,()=>-0.32,()=>-0.44,(ny,d)=>0.0045+0.002*gauss(d,0.3));break;
  }
}
