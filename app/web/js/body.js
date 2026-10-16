'use strict';
/* =============== Fitme: ciało manekina (szkielet, wymiary, siatka) =============== */
/* nominal 1.80 m figure; the surface is the MakeHuman mesh from mh.js */
const ARM0=[[-0.12,0.05],[0,0.05],[0.25,0.044],[0.5,0.038],[0.62,0.04],[0.88,0.03],[1,0.026],[1.1,0.026]];
let LAYERS=[],LIFT=0,WARP=null,PANTS=null;
function setupBody(){
  const g=S.gender==='f'?'f':'m',F=S.fig,b=S.build;
  const mus=clamp(S.mus!=null?S.mus:0.3,-1,1.6),fat=clamp(S.fat!=null?S.fat:0.15,-1,2.4);
  BC={g,F,b,mus,fat,bra:g==='f'&&!!(S.under&&S.under.bra&&S.under.bra!=='none'),handK:(g==='f'?0.9:1)*Math.pow(b,0.25)*(1+0.05*Math.max(0,mus)+0.04*Math.max(0,fat))};
  const M=coreModel(),H=mhBase()[g].head;
  BC.core=M;BC.legX=M.LX;BC.shX=M.shX;BC.shY=M.shY;
  /* the real foot (heel, toe, width, centre): shoe lasts are fitted around it */
  {const B=mhBase(),P=M.P;let zmin=9,zmax=-9,xmin=9,xmax=-9;for(let i=0;i<B.nv;i++){if(B.footw[i]<0.5||P[i*3]<0)continue;zmin=Math.min(zmin,P[i*3+2]);zmax=Math.max(zmax,P[i*3+2]);xmin=Math.min(xmin,P[i*3]);xmax=Math.max(xmax,P[i*3]);}
    BC.foot={zmin,zmax,len:zmax-zmin,w:xmax-xmin,cx:(xmin+xmax)/2};}
  BC.S=M.S.clone();BC.E=M.E.clone();BC.W=M.W.clone();
  if(!M.arm)M.arm=armTable(M);
  fitTables(M);FIT_ENV=new Array(781);FIT_HANG=new Array(201);
  BC.neckR=(()=>{const t=M.torso(1.56);return(t.rx+(t.rz+t.rzb)/2)/2;})();
  const hk=F.head,MP=mhMap(g);BC.map=MP;
  const SH=SHOES[S.shoes.type]||{},bare=S.shoes.type==='none',hh=bare?0:(SH.stiletto||SH.heel||0),st=bare?0:(SH.sole||0.02);
  LIFT=hh+st;BC.footFloor=hh?-hh+0.0015:null;BC.footA=footPitch(hh,M.ank.y,BC.foot.zmin+0.72*BC.foot.len-M.ank.z);
  /* height works like in people: mostly longer legs (and a bit of torso), the head barely changes and the frame widens only slightly */
  const H0=g==='f'?168:180,h=clamp((S.height||H0)/H0,0.8,1.25);
  const mk=hk2=>{const SW=makeWarp([[0.10,0.84,1.07*F.legs*Math.pow(h,hk2?0.8:0)],[0.84,1.48,F.torso*Math.pow(h,hk2?0.4:0)],[1.48,1.585,F.neckL]]);return{Y:y=>MP.G(SW.Y(y)),k:y=>SW.k(y)*MP.k(SW.Y(y)),id:false};};
  const E=EGG[g],Wref=mk(false);WARP=mk(true);
  const sRef=(H0/100)/(Wref.Y(MP.hb+2*E.ry*hk)+LIFT);
  let kh=1,sy=1;for(let i=0;i<4;i++){sy=((S.height||H0)/100)/(WARP.Y(MP.hb+2*E.ry*hk*kh)+LIFT);kh=sRef*Math.pow(h,0.2)/sy;}
  const sxz=sRef*Math.pow(h,0.4),kw=sRef*Math.pow(h,0.2)/sxz;
  BC.sy=sy;BC.sxz=sxz;
  const hb=Math.pow(b,0.3)*Math.pow(F.shoulders,0.18)*(1+0.03*Math.max(0,mus)),hw=hb*(1+0.07*Math.max(0,fat)-0.03*Math.max(0,-fat)+0.025*Math.max(0,mus)),hd=hb*(1+0.04*Math.max(0,fat));
  /* the head never looks pinned onto a thicker neck: it is at least ~1.4x the neck's half width, a heavier face is fuller at the jaw */
  const nk=(()=>{const t=M.torso(1.54);return Math.max(t.rx,(t.rz+t.rzb)/2);})(),nk0=g==='f'?0.052:0.06,neckK=Math.max(1,Math.pow(nk/nk0,0.75));
  BC.hd={rx:E.rx*hk*kw*Math.max(hw,neckK),ry:E.ry*hk*kh*Math.max(hb,Math.pow(neckK,0.5)),zf:E.zf*hk*kw*Math.max(hd,neckK*0.97),zb:E.zb*hk*kw*Math.max(hd,neckK*0.97)};
  BC.jaw=clamp(0.76+0.05*Math.max(0,fat)+0.03*Math.max(0,mus-0.5),0.76,0.92);
  BC.headC=V3(0,MP.hb+BC.hd.ry,H.c[2]+0.004+MH_DZ);
  BC.meas=bodyMeasures();
  BC.arm={geos:[]};
}
/* =============== envelopes (measured from the sculpt) =============== */
function torsoAt(y){return BC.core.torso(y);}
function legAt(y){return BC.core.leg(y);}
function legShape(y){const r=legAt(y);return{rx:r,rz:r,rzb:r,n:2};}
function neckRad(y){const t=torsoAt(Math.max(y,1.47));return Math.max(t.rx,t.rz);}
function legEnv(y,layers){const yy=Math.min(y,0.9);let r=legAt(yy);if(layers)for(const L of layers)if(L.leg){const v=L.leg(yy);if(v!=null)r=Math.max(r,v);}
  const rx=BC.legX+r,k=BC.legX/rx,rz=r/Math.sqrt(Math.max(0.25,1-k*k))*1.03;return{rx,rz,rzb:rz,n:2.3};}
function bodyEnv(y,layers){
  const legs=legEnv(y,layers);let r;
  if(y<0.8)r=legs;
  else{const t=y<1.1?maxE(torsoAt(y),BC.core.hips(y)):torsoAt(y),w=smooth((y-0.8)/0.16);r=maxE(t,{rx:lerp(legs.rx,t.rx,w),rz:lerp(legs.rz,t.rz,w),rzb:lerp(legs.rzb,t.rzb,w),n:lerp(2.3,t.n,w)});}
  if(layers)for(const L of layers)if(L.torso){const v=L.torso(y);if(v)r=maxE(r,v);}
  return r;
}
/* fabric hangs over edges of the layers below instead of tucking under them
   (hanging over the body itself is handled by the true-shape fit in fit.js) */
function layerEnvAt(y,layers){let r=null;if(layers)for(const L of layers)if(L.torso){const v=L.torso(y);if(v)r=r?maxE(r,v):v;}return r;}
function drapeEnv(y,layers){let r=bodyEnv(y,layers);if(!layers||!layers.length)return r;
  for(let yy=Math.ceil(y/0.01+1e-6)*0.01;yy<=Math.min(1.42,y+0.2);yy+=0.01){const v=layerEnvAt(yy,layers);if(!v)continue;const u=mulE(v,1-0.3*(yy-y));if(yy>1.3)u.rx=0;r=maxE(r,u);}
  return r;}
/* loose, heavy garments hang almost straight from the chest, shoulder blades and seat */
function hangEnv(y,layers){let r=bodyEnv(y,layers);for(let yy=Math.ceil(y/0.01+1e-6)*0.01;yy<=Math.min(1.42,y+0.85);yy+=0.01){const u=mulE(bodyEnv(yy,layers),1-0.1*(yy-y));if(yy>1.3)u.rx=0;r=maxE(r,u);}return r;}
function frontEnv(y,layers,x=0){const keep=layers.filter(L=>!(L.gap&&L.gap(y)>Math.abs(x)+0.004));return bodyEnv(y,keep);}
function legsUnionR(a,r,lx){const c=Math.cos(a),sn=Math.sin(a);let best=0;for(const cx of [-lx,lx]){const p=cx*c,d=Math.abs(cx*sn);if(d<r)best=Math.max(best,p+Math.sqrt(r*r-d*d));}return best;}
function crotchMod(rLeg,lx,yTop=0.93,yBot=0.79,minR){return(a,t,s)=>{const y=s.y;if(y>yTop)return 1;const w=smooth((y-yBot)/(yTop-yBot)),[c,sn]=seXY(a,s.n),cur=Math.hypot(c*s.rx,sn*(sn>=0?s.rz:zbk(s)));const pa=Math.atan2(sn*(sn>=0?s.rz:zbk(s)),c*s.rx),u=Math.max(legsUnionR(pa,rLeg(y),lx),0.006,minR?minR(pa,y):0);return lerp(u/cur,1,w);};}
function sleeveEnv(t,layers){let r=0;for(const L of layers)if(L.sleeve){const v=L.sleeve(t);if(v!=null)r=Math.max(r,v);}return r;}
/* =============== arms =============== */
function armAt(t){return BC.core&&BC.core.arm?BC.core.arm(Math.min(t,1)):interp1(ARM0,t)*BC.b;}
function armPt(t,side){
  const S0=BC.S,E=BC.E,W=BC.W,b=0.08;
  const L=tt=>tt<=0.5?S0.clone().lerp(E,tt/0.5):E.clone().lerp(W,(tt-0.5)/0.5);
  let p;
  if(t>0.5-b&&t<0.5+b){const A=L(0.5-b),C=L(0.5+b),u=(t-(0.5-b))/(2*b);p=A.multiplyScalar((1-u)*(1-u)).add(E.clone().multiplyScalar(2*u*(1-u))).add(C.multiplyScalar(u*u));}
  else p=L(t);
  p.x*=side;return p;
}
function armFrame(t,side){
  const d=armPt(t+0.01,side).sub(armPt(t-0.01,side)).normalize();
  const out=V3(side,0,0),u=out.clone().addScaledVector(d,-out.dot(d)).normalize();
  const v=new THREE.Vector3().crossVectors(d,u).multiplyScalar(side).normalize();
  return{d,u,v};
}
function aSamples(t0,t1,n,side,rf){if(n>=8)n=Math.round(n*GEO_Q);const out=[];for(let i=0;i<=n;i++){const t=i===n?t1:lerp(t0,t1,i/n),r=rf(t),f=armFrame(t,side);out.push({c:armPt(t,side),rx:r,rz:r,t,u:f.u,v:f.v});}return out;}
function armMatrix(t,side){const f=armFrame(t,side);return new THREE.Matrix4().makeBasis(f.u,f.d.clone().negate(),f.v).setPosition(armPt(t,side));}
function localGroup(m){const g=new THREE.Group();g.matrixAutoUpdate=false;g.matrix.copy(m);return g;}
const FINGERS=[[0.024,0.074,0.0082],[0.008,0.082,0.0084],[-0.008,0.077,0.008],[-0.023,0.062,0.0071]];
function fingerSeg(i){
  const M=BC.core,inv=armMatrix(1,1).invert(),j=k=>M.armJ(M.J[k]).applyMatrix4(inv),f=i+2;
  const A=j('f'+f+'1L'),J1=j('f'+f+'1tL'),T2=j('f'+f+'2tL'),d1=J1.clone().sub(A),L1=d1.length(),d2=T2.clone().sub(J1),L2=d2.length();
  return{A,d1:d1.normalize(),L1,J:J1,d2:d2.normalize(),L2,r:FINGERS[i][2]*BC.handK};
}
/* =============== head: smooth egg like a display mannequin =============== */
function headPt(th,ph,h=0){
  const D=BC.hd;let ny=Math.cos(th),sr=Math.sin(th);
  /* the lower half is squarer than an egg: jaw angles and a chin instead of a rounded point (a weak, receding jaw) */
  if(ny<0){const p=0.8;ny=-Math.pow(-ny,p);sr=Math.pow(sr,p);const l=Math.hypot(ny,sr);ny/=Math.max(1,l);sr/=Math.max(1,l);}
  const wx=D.rx*(ny<0?lerp(1,Math.max(BC.jaw||0.76,BC.g==='f'?0.8:0.86),Math.pow(-ny,1.8)):1-0.06*ny*ny);
  const zf=D.zf*(ny<0?lerp(1,0.88,Math.pow(-ny,2)):1-0.05*ny*ny);
  const zb=D.zb*(ny<-0.2?lerp(1,0.8,smooth((-ny-0.2)/0.8)):1+0.03*gauss(ny-0.3,0.35));
  const[c,s]=seXY(ph,2.12);
  let x=wx*sr*c,z=(s>=0?zf:zb)*sr*s,y=D.ry*ny;
  /* a jaw, not an egg: the chin comes forward a little */
  if(s>0)z+=0.006*s*smooth((-ny-0.5)/0.32)*gauss(c,0.55);
  /* the lowest point is the chin at the front, not the middle of an egg: the lower half leans forward */
  if(ny<0)z+=D.zf*0.3*Math.pow(-ny,1.7);
  /* behind the jaw and at the back the skull runs smoothly into the neck (no round bottom with the neck stuck under it) */
  /* under the jawline the head tucks in towards the neck (all round except the chin): the jaw reads as an edge, not a bowl */
  if(ny<-0.2&&BC.neckR){const back=smooth((0.3-s)/0.85),chin=gauss(c,0.4)*smooth(s/0.4),tb=smooth((-ny-0.2)/0.8)*back,tj=smooth((-ny-0.6)/0.3)*(1-chin),t=Math.max(tb*tb*0.85,tj*0.7),hr=Math.hypot(x,z),nr=BC.neckR*1.12;if(hr>nr&&t>0){const k=lerp(hr,nr,t)/hr;x*=k;z*=k;}}
  if(h){const L=Math.hypot(x,y,z)||1,k=(L+h)/L;x*=k;y*=k;z*=k;}
  return V3(BC.headC.x+x,BC.headC.y+y,BC.headC.z+z);
}
function headHorizR(y,ph){const ny=(y-BC.headC.y)/BC.hd.ry;if(ny<-0.97||ny>0.999)return null;const P=headPt(Math.acos(ny),ph,0);return Math.hypot(P.x,P.z-BC.headC.z);}
function earPos(side){const P=headPt(Math.acos(-0.12),side>0?0:Math.PI,0);P.x+=side*0.002;P.z-=0.01;return P;}
/* =============== skin =============== */
/* every finish draws the mannequin seams; 'fabric' adds the jersey cover (knit only visible up close) */
const SEAM_GLSL={
  vpars:'attribute vec4 seamD;\nattribute vec4 seamM;\nvarying vec4 vSeamD;\nvarying vec4 vSeamM;\nvarying vec3 vObjP;\nvarying vec3 vObjN;\n',
  vmain:'vSeamD=seamD;vSeamM=seamM;vObjP=position;vObjN=normal;\n',
  fpars:`varying vec4 vSeamD;
varying vec4 vSeamM;
varying vec3 vObjP;
varying vec3 vObjN;
uniform float uKnit;
float knitPat(vec2 q){float a=q.x/0.0028,b=q.y/0.0021;float col=abs(fract(a)-0.5)*2.0;float row=fract(b+col*0.55);return smoothstep(0.0,0.35,col)*(1.0-col*0.5)*(0.6+0.4*sin(6.2832*row));}
float knitH(vec3 p,vec3 n){vec3 w=abs(n);w=pow(w,vec3(4.0));w/=(w.x+w.y+w.z+1e-5);return knitPat(p.zy)*w.x+knitPat(p.xz)*w.y+knitPat(p.xy)*w.z;}
vec3 fitPerturb(vec3 sp,vec3 sn,vec2 dH,float fd){vec3 sx=dFdx(sp),sy=dFdy(sp);vec3 r1=cross(sy,sn),r2=cross(sn,sx);float det=dot(sx,r1)*fd;vec3 g=sign(det)*(dH.x*r1+dH.y*r2);return normalize(abs(det)*sn-g);}
`,
  fcolor:`{float sl=0.0,sa=0.0;for(int i=0;i<4;i++){float d=vSeamD[i];float fw=max(fwidth(d),1e-5);float l=1.0-smoothstep(0.0005,0.0005+fw*1.6,abs(d));sl=max(sl,l*vSeamM[i]);sa=max(sa,(1.0-smoothstep(0.0,0.006,abs(d)))*vSeamM[i]);}
  float lumS=dot(diffuseColor.rgb,vec3(0.3,0.59,0.11));
  if(lumS<0.08)diffuseColor.rgb+=vec3(0.035*sl+0.006*sa);else diffuseColor.rgb*=(1.0-0.3*sl)*(1.0-0.06*sa);
  if(uKnit>0.0){float m=sin(vObjP.x*61.0+sin(vObjP.y*47.0)*1.7)*sin(vObjP.y*53.0+sin(vObjP.z*59.0)*1.3);diffuseColor.rgb*=1.0-0.018*uKnit*m;}}
`,
  fnormal:`if(uKnit>0.0){float fwk=length(fwidth(vObjP));float amp=(1.0-smoothstep(0.0004,0.0011,fwk))*uKnit;if(amp>0.0){float kh=knitH(vObjP,normalize(vObjN))*0.0005*amp;normal=fitPerturb(-vViewPosition,normal,vec2(dFdx(kh),dFdy(kh)),faceDirection);}}
`};
function seamShader(m,knit){
  m.userData.needAttr={seamD:4,seamM:4};
  m.onBeforeCompile=sh=>{sh.uniforms.uKnit={value:knit};
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\n'+SEAM_GLSL.vpars).replace('#include <begin_vertex>','#include <begin_vertex>\n'+SEAM_GLSL.vmain);
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+SEAM_GLSL.fpars).replace('#include <color_fragment>','#include <color_fragment>\n'+SEAM_GLSL.fcolor).replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+SEAM_GLSL.fnormal);};
  m.customProgramCacheKey=()=>'seams'+knit;return m;
}
function skinMat(){
  const hex=(SKINS[S.skin]||SKINS[3])[0],f=FINISHES[S.finish]?S.finish:'fabric',k='skin|'+f+'|'+hex;if(matCache.has(k))return matCache.get(k);
  let m;
  if(f==='fabric')m=new THREE.MeshPhysicalMaterial({color:lin(hex),roughness:.93,metalness:0,sheen:.75,sheenRoughness:.62,sheenColor:lin(shade(hex,.35)),envMapIntensity:.45,side:THREE.DoubleSide,vertexColors:true});
  else if(f==='gloss')m=new THREE.MeshPhysicalMaterial({color:lin(hex),roughness:.3,clearcoat:.5,clearcoatRoughness:.3,sheen:.1,sheenColor:lin(shade(hex,.3)),envMapIntensity:.6,side:THREE.DoubleSide,vertexColors:true});
  else m=new THREE.MeshPhysicalMaterial({color:lin(hex),roughness:.78,sheen:.3,sheenRoughness:.55,sheenColor:lin(shade(hex,.3)),envMapIntensity:.5,side:THREE.DoubleSide,vertexColors:true});
  seamShader(m,f==='fabric'?1:0);matCache.set(k,m);return m;
}
/* ---------- underwear: cut from the body's own surface (smooth edges along a mask field), a hair off the skin ---------- */
/* f(x,y,z) > 0 inside; the edge runs where f crosses 0. th: offset along the normal. Keeps the body vertex ids for posing */
/* fs: one or more constraints f(x,y,z) > 0 inside; each triangle is clipped by every constraint in turn (a band narrower
   than a triangle is still cut exactly), the function evaluated at the clipped points themselves */
function bodyPatch(geo,fs,th,mat){if(!Array.isArray(fs))fs=[fs];const P=geo.attributes.position,N=geo.attributes.normal,I=geo.index.array,n=P.count,AW=geo.userData.armw;
  const pos=[],nor=[],uv=[],src=[],thAt=typeof th==='function'?th:()=>th,V=new Float32Array(n*fs.length);
  for(let i=0;i<n;i++)for(let k=0;k<fs.length;k++)V[i*fs.length+k]=AW&&AW[i]>0.25?-1:fs[k](P.getX(i),P.getY(i),P.getZ(i));
  const pt=i=>({x:P.getX(i),y:P.getY(i),z:P.getZ(i),nx:N.getX(i),ny:N.getY(i),nz:N.getZ(i),s:i,f:fs.map((_,k)=>V[i*fs.length+k])});
  const mix=(a,b,t,k)=>{const q={x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t),nx:lerp(a.nx,b.nx,t),ny:lerp(a.ny,b.ny,t),nz:lerp(a.nz,b.nz,t),s:t<0.5?a.s:b.s};
    q.f=fs.map((fn,j)=>j<=k?lerp(a.f[j],b.f[j],t):fn(q.x,q.y,q.z));return q;};
  for(let t=0;t<I.length;t+=3){const a=I[t],b=I[t+1],c=I[t+2];let ok=true;for(let k=0;k<fs.length;k++){const L=fs.length;if(V[a*L+k]<=0&&V[b*L+k]<=0&&V[c*L+k]<=0&&!(fs.length>1)){ok=false;break;}}if(!ok)continue;
    let poly=[pt(a),pt(b),pt(c)];
    for(let k=0;k<fs.length&&poly.length>=3;k++){const out=[];for(let q=0;q<poly.length;q++){const A=poly[q],Bv=poly[(q+1)%poly.length],fa=A.f[k],fb=Bv.f[k];if(fa>0)out.push(A);if((fa>0)!==(fb>0))out.push(mix(A,Bv,fa/(fa-fb),k));}poly=out;}
    if(poly.length<3)continue;
    for(let q=1;q+1<poly.length;q++)for(const v of [poly[0],poly[q],poly[q+1]]){const l=Math.hypot(v.nx,v.ny,v.nz)||1,nx=v.nx/l,ny=v.ny/l,nz=v.nz/l,h=thAt(v.x,v.y,v.z);
      pos.push(v.x+nx*h,v.y+ny*h,v.z+nz*h);nor.push(nx,ny,nz);uv.push(Math.atan2(v.z,v.x)*0.12/TILE,v.y/TILE);src.push(v.s);}}
  if(!pos.length)return null;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const ix=new Uint32Array(pos.length/3);for(let i=0;i<ix.length;i++)ix[i]=i;g.setIndex(new THREE.BufferAttribute(ix,1));
  g.userData.bodySrc=src;g.userData.bodySrcFeet=!!geo.userData.bodyFeet;g.userData.bodySrcN=n;
  const m=mk(g,mat);m.userData.under=1;return m;}
/* a strap laid over the body: path points pulled onto the surface (nearest body point + normal), flat ribbon */
function bodyStrap(G,geo,path,w,lift,mat){const P=geo.attributes.position,N=geo.attributes.normal,n=P.count;
  const curve=new THREE.CatmullRomCurve3(path,false,'centripetal'),pts=curve.getSpacedPoints(40),out=[],nrm=[];
  let lo=9,hi=-9;for(const p of path){lo=Math.min(lo,p.y);hi=Math.max(hi,p.y);}const AW=geo.userData.armw,cand=[];for(let i=0;i<n;i++){const y=P.getY(i);if(y>lo-0.04&&y<hi+0.04&&Math.abs(P.getX(i))<BC.shX*1.05&&!(AW&&AW[i]>0.2))cand.push(i);}
  for(const p of pts){let bd=9,bj=-1;for(const i of cand){const d=(P.getX(i)-p.x)**2+(P.getY(i)-p.y)**2+(P.getZ(i)-p.z)**2;if(d<bd){bd=d;bj=i;}}
    const nn=V3(N.getX(bj),N.getY(bj),N.getZ(bj));out.push(V3(P.getX(bj),P.getY(bj),P.getZ(bj)).addScaledVector(nn,lift));nrm.push(nn);}
  /* smooth the snapped path a little (vertex to vertex it zig-zags) */
  for(let it=0;it<3;it++)for(let k=1;k<out.length-1;k++)out[k].lerp(out[k-1].clone().add(out[k+1]).multiplyScalar(0.5),0.5);
  const sides=out.map((p,k)=>{const tn=(k<out.length-1?out[k+1].clone().sub(p):p.clone().sub(out[k-1])).normalize();return nrm[k].clone().cross(tn).normalize();});
  const m=mk(ribbon(out,sides,w,{noAO:true}),mat);m.userData.under=1;G.add(m);}
function buildUnder(G){const U=S.under;if(!U)return;const fem=S.gender==='f';
  const SH=SHOES[S.shoes.type]||{},showFeet=S.shoes.type==='none'||SH.open||SH.low||SH.clog,geo=bodyGeo(!!showFeet);
  const cy=shellBase(1).cy,nav=BC.core.spots&&BC.core.spots[2]?BC.core.spots[2][1]:cy+0.25,lx=BC.legX;
  /* 'auto': black for men, a soft nude for women (against a light mannequin it reads as underwear, not a swimsuit) */
  const dark=lumHex((SKINS[S.skin]||SKINS[0])[0])<0.25,c1=U.color&&U.color!=='auto'?U.color:fem?'#d9c2ae':dark?'#a3a3a5':'#1e1e1f',c2=U.color2&&U.color2!=='auto'?U.color2:fem?shade(c1,-0.05):dark?'#5b5d61':'#2b2b2d';
  const main=fabric('jersey',c1),band=fabric('rib',c2);
  const prevCtx=MK_CTX,prevLayer=MK_LAYER;MK_CTX='none';MK_LAYER='none';
  /* briefs / boxers: waist line (a touch higher at the back) and leg openings around each leg (outer, front, inner, back
     heights over the crotch) */
  const B=U.bottom;if(B&&B!=='none'){
    const W={boxer:0.42,trunk:0.42,brief:0.4,hipster:0.3,boyshort:0.42,high:0.9}[B]*(nav-cy)+cy+(fem&&B==='brief'?0.02:0);
    const L={boxer:[-0.165,-0.17,-0.172,-0.17],trunk:[-0.095,-0.1,-0.102,-0.1],brief:fem?[0.085,0.03,-0.01,-0.005]:[0.075,0.022,-0.012,0],
      hipster:[0.05,0.022,-0.01,-0.012],boyshort:[-0.05,-0.058,-0.062,-0.06],high:[0.085,0.03,-0.01,-0.005]}[B];
    const H=(x,z)=>{const t=Math.atan2(z,Math.abs(x)-lx),c=Math.cos(t),sn=Math.sin(t),a0=(L[0]+L[2])/2,a1=(L[0]-L[2])/2;return cy+a0+a1*c+(sn>0?sn*(L[1]-a0):-sn*(L[3]-a0));};
    const wy=(x,z)=>W+0.012*Math.max(0,-z/Math.hypot(x,z)||0);
    const fB=(x,y,z)=>Math.min(wy(x,z)-y,y-H(x,z));
    const fW=(x,y,z)=>wy(x,z)-y,fL=(x,y,z)=>y-H(x,z),m1=bodyPatch(geo,[fW,fL],0.0011,main);if(m1)G.add(m1);
    const wbH=fem?0.014:0.03,m2=bodyPatch(geo,[(x,y,z)=>fW(x,y,z)+0.0004,fL,(x,y,z)=>y-(wy(x,z)-wbH)],0.0024,band);if(m2)G.add(m2);
    /* leg openings: a narrow elastic edge (boxers: a short hem) */
    const m3=bodyPatch(geo,[fW,(x,y,z)=>fL(x,y,z)+0.0003,(x,y,z)=>H(x,z)+(B==='boxer'||B==='trunk'?0.015:0.009)-y],0.0022,B==='boxer'||B==='trunk'?main:band);if(m3)G.add(m3);}
  /* bra: band under the bust, cups round each apex, the gore between them, straps over the shoulders */
  if(fem&&U.bra&&U.bra!=='none'&&BC.core.spots&&BC.core.spots[1]){
    const sp=BC.core.spots,ax=Math.abs(sp[1][0]),ay=sp[1][1],yu=ay-0.085,T=U.bra;
    const bandF=(x,y,z)=>Math.min(y-(yu-(T==='sports'?0.05:0.03)),yu+0.014-y);
    const cup=(x,y,z)=>{if(z<0)return -1;const dx=Math.abs(x)-ax,dy=y-ay,ry=dy>0?(T==='balconette'?0.032:T==='bralette'?0.06:0.055):0.09,rx=dx>0?0.08:0.07;
      let f=1-Math.hypot(dx/rx,dy/ry);if(T==='bralette')f=Math.min(f,(ay+0.065-y)*0.75-Math.abs(dx)+0.0);return f*0.05;};
    const gore=(x,y,z)=>z>0?Math.min(ax-Math.abs(x),y-yu,yu+0.035-y,0.02):-1;
    /* sports bra: front up to a scoop between the cups, the back a band and a racerback (a Y narrowing to the neck) */
    const sports=(x,y,z)=>{const top=z>0?ay+0.07-0.035*gauss(x,0.05):yu+0.055;let f=Math.min(y-(yu-0.05),top-y);
      if(z<=0){const t=clamp((y-(yu+0.045))/(BC.shY-0.05-(yu+0.045)),0,1),hw=0.032+0.2*Math.pow(1-t,2.2);f=Math.max(f,Math.min(hw-Math.abs(x),BC.shY-0.05-y,y-(yu-0.05)));}return f;};
    const fBra=T==='sports'?(x,y,z)=>Math.abs(x)>BC.shX*0.82?-1:sports(x,y,z):(x,y,z)=>Math.abs(x)>BC.shX*0.8?-1:Math.max(bandF(x,y,z),cup(x,y,z),gore(x,y,z));
    const cupTh=(x,y,z)=>0.0014+0.0012*Math.max(0,cup(x,y,z)/0.05);
    const mb=bodyPatch(geo,fBra,cupTh,main);if(mb)G.add(mb);
    /* under a strapless top (corset) the bra is strapless too */
    const strapless=S.top&&TOPS[S.top.type]&&TOPS[S.top.type].strap===0;
    if(T!=='sports'&&!strapless){for(const sd of [-1,1]){const fx=sd*(ax+0.012),ty=T==='balconette'?ay+0.03:ay+0.05;
      bodyStrap(G,geo,[V3(fx,ty,0.12),V3(sd*BC.shX*0.55,BC.shY-0.02,0.07),V3(sd*BC.shX*0.52,BC.shY+0.01,0.0),V3(sd*BC.shX*0.5,BC.shY-0.05,-0.08),V3(sd*(ax+0.005),yu+0.03,-0.11),V3(sd*(ax+0.01),yu-0.012,-0.12)],T==='bralette'?0.007:0.011,0.0024,band);}}
    else{const mb2=bodyPatch(geo,[fBra,(x,y,z)=>y-(yu-0.05)+0.0003,(x,y,z)=>yu-0.025-y],0.0024,band);if(mb2)G.add(mb2);}}
  MK_CTX=prevCtx;MK_LAYER=prevLayer;}
function buildBody(G){
  const skin=skinMat();
  const SH=SHOES[S.shoes.type]||{},showFeet=S.shoes.type==='none'||SH.open||SH.low||SH.clog;
  G.add(mk(bodyGeo(!!showFeet),skin));
  G.add(mk(surf(96,64,(u,v)=>headPt(v*Math.PI,-u*TAU),{wrapU:true,noAO:true}),skin));

}
