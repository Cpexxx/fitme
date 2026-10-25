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
  /* the real (pitched, as worn) foot in shoe space: lasts are fitted around it slice by slice */
  {const B=mhBase(),P=M.P.slice();mhPitch(P,M.ank,BC.footA);const pts=[];
    let z0=9,z1=-9;for(let i=0;i<B.nv;i++){if(B.footw[i]<0.35||P[i*3]<0)continue;pts.push(P[i*3],MP.G(P[i*3+1])+LIFT,P[i*3+2]);if(B.footw[i]>=0.5){z0=Math.min(z0,P[i*3+2]);z1=Math.max(z1,P[i*3+2]);}}
    BC.footPts=Float32Array.from(pts);
    /* in heels the pitched foot is shorter seen from above: the last is measured on it, or the toes end up mid-shoe */
    BC.footP={zmin:z0,zmax:z1,len:z1-z0};}
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
  /* under the jawline the head tucks in towards the neck (all round except the chin): the jaw reads as an edge, not a bowl;
     the chin is spared over a wide, smooth span (a narrow one cut a hooked groove at each corner of the chin) */
  if(ny<-0.2&&BC.neckR){const back=smooth((0.3-s)/0.85),chin=Math.pow(Math.max(0,s),1.5)*smooth((0.85-Math.abs(c))/0.7),tb=smooth((-ny-0.2)/0.8)*back,tj=smooth((-ny-0.55)/0.4)*(1-chin),t=Math.max(tb*tb*0.85,tj*0.6),hr=Math.hypot(x,z),nr=BC.neckR*1.12;if(hr>nr&&t>0){const k=lerp(hr,nr,t)/hr;x*=k;z*=k;}}
  if(h){const L=Math.hypot(x,y,z)||1,k=(L+h)/L;x*=k;y*=k;z*=k;}
  return V3(BC.headC.x+x,BC.headC.y+y,BC.headC.z+z);
}
/* where the head meets the neck strip: low on the occiput at the back and the sides, under the chin at the front */
/* where the head meets the neck strip: low on the occiput at the back, under the chin at the front, changing gradually
   around the jaw (a sudden change folded the strip there) */
function headAttachTh(ph){const s=seXY(ph,2.12)[1];return Math.acos(lerp(-0.52,-0.88,smooth((s+0.25)/1.15)));}
/* the strip from the neck's ring (tangent to the upright neck) to the skull (tangent to the head surface): cubic Hermite */
function neckLoftPt(ph,v){
  const NL=BC.neckLoft,th=headAttachTh(ph),P1=headPt(th,ph),d=0.004,T1=headPt(th-d,ph).sub(headPt(th+d,ph)).normalize();
  /* the ring point in the same direction as seen from the head's axis (monotonic around: the strip never twists) */
  const a=Math.atan2(P1.z-BC.headC.z,P1.x-BC.headC.x),r0=neckRingR(NL,a),P0=V3(NL.cx+Math.cos(a)*r0,NL.y,NL.cz+Math.sin(a)*r0);
  const L=P1.distanceTo(P0),v2=v*v,v3=v2*v,h00=2*v3-3*v2+1,h10=v3-2*v2+v,h01=-2*v3+3*v2,h11=v3-v2;
  const A=NL.ax?V3(NL.ax[0],NL.ax[1],NL.ax[2]).normalize():V3(0,1,0);
  return P0.multiplyScalar(h00).add(A.multiplyScalar(L*h10)).add(P1.multiplyScalar(h01)).add(T1.multiplyScalar(L*h11));
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
function bodyPatch(geo,fs,th,mat,opt={}){if(!Array.isArray(fs))fs=[fs];const P=geo.attributes.position,N=geo.attributes.normal,I=geo.index.array,n=P.count,AW=geo.userData.armw;
  /* the arms are one more clipping constraint (arm weight under 0.25), interpolated along the edges like the others:
     a smooth side edge instead of a staircase along the mesh faces */
  const ARM=()=>0;if(AW)fs=[...fs,ARM];
  const pos=[],nor=[],uv=[],src=[],thAt=typeof th==='function'?th:()=>th,L=fs.length,V=new Float32Array(n*L);
  for(let i=0;i<n;i++)for(let k=0;k<L;k++)V[i*L+k]=fs[k]===ARM?0.25-AW[i]:fs[k](P.getX(i),P.getY(i),P.getZ(i));
  const pt=i=>({x:P.getX(i),y:P.getY(i),z:P.getZ(i),nx:N.getX(i),ny:N.getY(i),nz:N.getZ(i),s:i,f:fs.map((_,k)=>V[i*L+k])});
  const mix=(a,b,t,k)=>{const q={x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t),nx:lerp(a.nx,b.nx,t),ny:lerp(a.ny,b.ny,t),nz:lerp(a.nz,b.nz,t),s:t<0.5?a.s:b.s};
    q.f=fs.map((fn,j)=>j<=k||fn===ARM?lerp(a.f[j],b.f[j],t):fn(q.x,q.y,q.z));return q;};
  for(let t=0;t<I.length;t+=3){const a=I[t],b=I[t+1],c=I[t+2];let ok=true;for(let k=0;k<L;k++){if(V[a*L+k]<=0&&V[b*L+k]<=0&&V[c*L+k]<=0){ok=false;break;}}if(!ok)continue;
    let poly=[pt(a),pt(b),pt(c)];
    for(let k=0;k<L&&poly.length>=3;k++){const out=[];for(let q=0;q<poly.length;q++){const A=poly[q],Bv=poly[(q+1)%poly.length],fa=A.f[k],fb=Bv.f[k];if(fa>0)out.push(A);if((fa>0)!==(fb>0))out.push(mix(A,Bv,fa/(fa-fb),k));}poly=out;}
    if(poly.length<3)continue;
    for(let q=1;q+1<poly.length;q++)for(const v of [poly[0],poly[q],poly[q+1]]){const l=Math.hypot(v.nx,v.ny,v.nz)||1,nx=v.nx/l,ny=v.ny/l,nz=v.nz/l,h=thAt(v.x,v.y,v.z);
      pos.push(v.x+nx*h,v.y+ny*h,v.z+nz*h);nor.push(nx,ny,nz);uv.push(Math.atan2(v.z,v.x)*0.12/TILE,v.y/TILE);src.push(v.s);}}
  if(!pos.length)return null;
  /* hull:[y0,y1]: the front between those heights spans the body taut (a sports bra: straight over the cleavage and from
     the apex down to the band); the lift is blurred (no crease round the apex) and tilts the body normals by its slope */
  if(opt.hull){const [y0,y1]=opt.hull,C=0.004,X0=-0.26,NX=Math.ceil(0.52/C)+1,NY=Math.ceil((y1-y0)/C)+1,nv=pos.length/3,Z=new Float32Array(NX*NY).fill(-9);
    /* the front height field, rasterised from the (front-facing) triangles */
    for(let t=0;t<nv;t+=3){if(nor[t*3+2]+nor[t*3+5]+nor[t*3+8]<1.05)continue;const X=[0,1,2].map(k=>(pos[(t+k)*3]-X0)/C),Y=[0,1,2].map(k=>(pos[(t+k)*3+1]-y0)/C),Zt=[0,1,2].map(k=>pos[(t+k)*3+2]);
      const d=(X[1]-X[0])*(Y[2]-Y[0])-(X[2]-X[0])*(Y[1]-Y[0]);if(Math.abs(d)<1e-9)continue;
      for(let r=Math.max(0,Math.ceil(Math.min(...Y)));r<=Math.min(NY-1,Math.floor(Math.max(...Y)));r++)for(let c=Math.max(0,Math.ceil(Math.min(...X)));c<=Math.min(NX-1,Math.floor(Math.max(...X)));c++){
        const u=((c-X[0])*(Y[2]-Y[0])-(X[2]-X[0])*(r-Y[0]))/d,v=((X[1]-X[0])*(r-Y[0])-(c-X[0])*(Y[1]-Y[0]))/d;if(u<-1e-6||v<-1e-6||u+v>1+1e-6)continue;
        const z=Zt[0]+u*(Zt[1]-Zt[0])+v*(Zt[2]-Zt[0]),q=r*NX+c;if(z>Z[q])Z[q]=z;}}
    /* taut: the upper convex hull along each row (over the cleavage), then up each column (from the band to the apex) */
    const H=Z.slice(),hull=(n,at)=>{const h=[];for(let j=0;j<n;j++){const v=H[at(j)];if(v<-8)continue;
        while(h.length>1){const [j1,v1]=h[h.length-2],[j2,v2]=h[h.length-1];if((v2-v1)*(j-j1)<=(v-v1)*(j2-j1))h.pop();else break;}h.push([j,v]);}
      for(let a=0;a+1<h.length;a++){const [j1,v1]=h[a],[j2,v2]=h[a+1];for(let j=j1+1;j<j2;j++)if(H[at(j)]>-8)H[at(j)]=v1+(v2-v1)*(j-j1)/(j2-j1);}};
    for(let r=0;r<NY;r++)hull(NX,j=>r*NX+j);for(let c=0;c<NX;c++)hull(NY,j=>j*NX+c);
    let L=new Float32Array(NX*NY);for(let q=0;q<L.length;q++)L[q]=Z[q]>-8?Math.min(0.03,H[q]-Z[q]):0;
    for(let it=0;it<24;it++){const L2=new Float32Array(L.length);for(let r=0;r<NY;r++)for(let c=0;c<NX;c++){let a=0,w=0;
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if(rr<0||rr>=NY||cc<0||cc>=NX)continue;const ww=(dr?1:2)*(dc?1:2);a+=L[rr*NX+cc]*ww;w+=ww;}L2[r*NX+c]=a/w;}L=L2;}
    const at=(r,c)=>L[clamp(r,0,NY-1)*NX+clamp(c,0,NX-1)];
    for(let i=0;i<nv;i++){const fx=(pos[i*3]-X0)/C,fy=(pos[i*3+1]-y0)/C,c=Math.floor(fx),r=Math.floor(fy),tx=fx-c,ty=fy-r;
      const a=at(r,c),b=at(r,c+1),e=at(r+1,c),f=at(r+1,c+1),w=smooth((nor[i*3+2]-0.2)/0.3)*smooth((pos[i*3+1]-y0)/0.012);if(!w)continue;
      pos[i*3+2]+=lerp(lerp(a,b,tx),lerp(e,f,tx),ty)*w;
      const lx=lerp(b-a,f-e,ty)/C*w,ly=lerp(e-a,f-b,tx)/C*w,nz=nor[i*3+2],nx=nor[i*3]/nz-lx,ny=nor[i*3+1]/nz-ly,l=Math.hypot(nx,ny,1);nor[i*3]=nx/l;nor[i*3+1]=ny/l;nor[i*3+2]=1/l;}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const ix=new Uint32Array(pos.length/3);for(let i=0;i<ix.length;i++)ix[i]=i;g.setIndex(new THREE.BufferAttribute(ix,1));
  g.userData.bodySrc=src;g.userData.bodySrcFeet=!!geo.userData.bodyFeet;g.userData.bodySrcN=n;
  const m=mk(g,mat);m.userData.under=1;return m;}
/* a strap laid over the body: path points pulled onto the surface (nearest body point + normal), flat ribbon */
function bodyStrap(G,geo,path,w,lift,mat){const P=geo.attributes.position,N=geo.attributes.normal,n=P.count;
  const curve=new THREE.CatmullRomCurve3(path,false,'centripetal'),pts=curve.getSpacedPoints(64),out=[],nrm=[];
  let lo=9,hi=-9;for(const p of path){lo=Math.min(lo,p.y);hi=Math.max(hi,p.y);}const AW=geo.userData.armw,cand=[];for(let i=0;i<n;i++){const y=P.getY(i);if(y>lo-0.04&&y<hi+0.04&&Math.abs(P.getX(i))<BC.shX*1.05&&!(AW&&AW[i]>0.45))cand.push(i);}
  for(const p of pts){let bd=9,bj=-1;for(const i of cand){const d=(P.getX(i)-p.x)**2+(P.getY(i)-p.y)**2+(P.getZ(i)-p.z)**2;if(d<bd){bd=d;bj=i;}}
    const nn=V3(N.getX(bj),N.getY(bj),N.getZ(bj));out.push(V3(P.getX(bj),P.getY(bj),P.getZ(bj)).addScaledVector(nn,lift));nrm.push(nn);}
  /* smooth the snapped path a little (vertex to vertex it zig-zags) */
  for(let it=0;it<3;it++)for(let k=1;k<out.length-1;k++)out[k].lerp(out[k-1].clone().add(out[k+1]).multiplyScalar(0.5),0.5);
  /* smoothing cuts the corners of a convex stretch (the top of the shoulder): every point back above its nearest body point */
  for(const p of out){let bd=9,bj=-1;for(const i of cand){const d=(P.getX(i)-p.x)**2+(P.getY(i)-p.y)**2+(P.getZ(i)-p.z)**2;if(d<bd){bd=d;bj=i;}}
    const nx=N.getX(bj),ny=N.getY(bj),nz=N.getZ(bj),h=(p.x-P.getX(bj))*nx+(p.y-P.getY(bj))*ny+(p.z-P.getZ(bj))*nz;if(h<lift){p.x+=nx*(lift-h);p.y+=ny*(lift-h);p.z+=nz*(lift-h);}}
  const sides=out.map((p,k)=>{const tn=(k<out.length-1?out[k+1].clone().sub(p):p.clone().sub(out[k-1])).normalize();return nrm[k].clone().cross(tn).normalize();});
  const m=mk(ribbon(out,sides,w,{noAO:true}),mat);m.userData.under=1;G.add(m);}
function buildUnder(G){const U=S.under;if(!U)return;const fem=S.gender==='f';
  const SH=SHOES[S.shoes.type]||{},showFeet=S.shoes.type==='none'||SH.open||SH.low||SH.clog,geo=bodyGeo(!!showFeet);
  /* the crotch from the hip joint (the shell's own crotch line drops where heavy or muscular thighs meet lower down: the
     briefs slid down onto the thighs) */
  const cy=BC.core.J.hipL[1]-0.075,nav=BC.core.spots&&BC.core.spots[2]?BC.core.spots[2][1]:cy+0.19,lx=BC.legX;
  /* 'auto': black for men (charcoal heather on a dark mannequin), a soft nude for women */
  const dark=lumHex((SKINS[S.skin]||SKINS[0])[0])<0.25,c1=U.color&&U.color!=='auto'?U.color:fem?'#d9c2ae':dark?'#5d6066':'#1e1e1f',c2=U.color2&&U.color2!=='auto'?U.color2:fem?shade(c1,-0.05):dark?'#2c2e33':'#2b2b2d';
  const main=fabric('jersey',c1),band=fabric('rib',c2);
  const prevCtx=MK_CTX,prevLayer=MK_LAYER;MK_CTX='none';MK_LAYER='none';
  /* briefs / boxers: waist line (a touch higher at the back) and leg openings around each leg (outer, front, inner, back
     heights over the crotch) */
  const B=U.bottom;if(B&&B!=='none'){
    /* the waistband a few centimetres under the navel at the front, over the top of the seat at the back */
    const W={boxer:0.55,trunk:0.55,brief:0.52,hipster:0.4,boyshort:0.52,high:0.9}[B]*(nav-cy)+cy+(fem&&B==='brief'?0.015:0);
    const L={boxer:[-0.165,-0.17,-0.172,-0.17],trunk:[-0.095,-0.1,-0.102,-0.1],brief:[0.085,0.03,-0.01,-0.005],
      hipster:[0.05,0.022,-0.01,-0.012],boyshort:[-0.05,-0.058,-0.062,-0.06],high:[0.085,0.03,-0.01,-0.005]}[B];
    const H=(x,z)=>{const t=Math.atan2(z,Math.abs(x)-lx),c=Math.cos(t),sn=Math.sin(t),a0=(L[0]+L[2])/2,a1=(L[0]-L[2])/2;return cy+a0+a1*c+(sn>0?sn*(L[1]-a0):-sn*(L[3]-a0));};
    const wy=(x,z)=>W+0.03*Math.max(0,-z/Math.hypot(x,z)||0);
    const fB=(x,y,z)=>Math.min(wy(x,z)-y,y-H(x,z));
    const fW=(x,y,z)=>wy(x,z)-y,fL=(x,y,z)=>y-H(x,z),m1=bodyPatch(geo,[fW,fL],0.0011,main);if(m1)G.add(m1);
    const wbH=fem?0.014:0.03,m2=bodyPatch(geo,[(x,y,z)=>fW(x,y,z)+0.0004,fL,(x,y,z)=>y-(wy(x,z)-wbH)],0.0024,band);if(m2)G.add(m2);
    /* leg openings: a narrow elastic edge (boxers: a short hem) */
    const m3=bodyPatch(geo,[fW,(x,y,z)=>fL(x,y,z)+0.0003,(x,y,z)=>H(x,z)+(B==='boxer'||B==='trunk'?0.015:0.009)-y],0.0022,B==='boxer'||B==='trunk'?main:band);if(m3)G.add(m3);}
  /* bra: one continuous outline Top(x,z) over a band (front: gore, cups, side wings; back: the band or a racerback),
     every edge a smooth curve of the body coordinates, straps laid over the shoulders along the real surface */
  if(fem&&U.bra&&U.bra!=='none'&&BC.core.spots&&BC.core.spots[1]){
    const sp=BC.core.spots,ax=Math.abs(sp[1][0]),ay=sp[1][1],yu=ay-0.085,T=U.bra,k=BC.shX/0.175,sports=T==='sports';
    const P=geo.attributes.position,AW=geo.userData.armw;
    /* a point on the body surface: the vertex nearest (x,y) on the front (s=1) or the back (s=-1); s=0: the top of the shoulder (max y) at (x,z) */
    const onBody=(x,a,s)=>{for(let r=0.008;r<0.04;r*=1.5){let best=null,bv=-9;for(let i=0;i<P.count;i++){if(AW&&AW[i]>0.45)continue;
      const px=P.getX(i),py=P.getY(i),pz=P.getZ(i);if(Math.abs(px-x)>r||Math.abs((s?py:pz)-a)>r||s*pz<0)continue;const v=s?-Math.hypot(px-x,py-a):py;if(v>bv){bv=v;best=V3(px,py,pz);}}if(best)return best;}return V3(x,a,0);};
    const smax=(a,b,r)=>{const h=clamp(0.5+0.5*(b-a)/r,0,1);return lerp(a,b,h)+r*h*(1-h);};
    const fr=z=>smooth((z+0.04)/0.06),bandY=yu+0.012,wingY=ay-0.01,yb0=yu-(sports?0.05:T==='bralette'?0.035:0.03);
    /* front neckline / cup tops along x (dx from the apex; sports: a scoop, then the armhole falling from the strap to the side) */
    const pk={tshirt:[ay+0.055,0.008,0.08,1.4,0.1,-0.035],balconette:[ay+0.03,0.02,0.06,2,0.11,-0.045]}[T];
    const topF=x=>{const X=Math.abs(x),dx=X-ax;
      if(sports){const t=X<0.075*k?ay+0.03+0.05*(X/(0.075*k))**2:ay+0.08;return X<0.1*k?t:ay+0.08*(1-Math.sqrt(Math.max(0,1-((0.155*k-Math.min(X,0.155*k))/(0.055*k))**2)));}
      if(T==='bralette'){const d=Math.hypot(dx,0.01),tri=ay+0.07-(dx<0?1.9:2.4)*(d-0.01);return smax(tri,bandY,0.01);}
      const [Pk,d0,dr,pw,sp0,gr]=pk,cup=dx<d0?Pk-dr*Math.pow((d0-dx)/sp0,pw):Pk-(Pk-wingY)*smooth((dx-d0)/0.04);
      return smax(smax(cup,ay+gr,0.012),bandY,0.01);};
    /* back: the band rising into the side wings (sports: a panel and the racerback stem up the spine) */
    /* (the rise towards the sides by the angle round the torso: by |x| a broad back rose into a box across it) */
    const topB=(x,z)=>{const X=Math.abs(x),a=Math.atan2(X,Math.max(1e-4,-z));
      if(sports){const pn=yu+0.05+(ay-0.005-yu-0.05)*smooth((a-0.75)/0.6);return smax(pn,yu+0.05+(ay+0.02-yu-0.05)*(1-smooth((X-0.02)/0.03)),0.01);}
      return T==='bralette'?bandY:bandY+(wingY-bandY)*smooth((a-0.85)/0.55);};
    const top=(x,z)=>lerp(topB(x,z),topF(x),fr(z));
    let fBra=(x,y,z)=>Math.min(y-yb0,top(x,z)-y);
    /* racerback straps: up from the front panel, over the trapezius, down to the spine; distance to the path on the body */
    if(sports){const path=[];for(const sd of [-1,1]){const c=new THREE.CatmullRomCurve3([onBody(sd*0.0875*k,ay+0.07,1),onBody(sd*0.09*k,ay+0.125,1),onBody(sd*0.09*k,-0.035,0),
        onBody(sd*0.08*k,ay+0.11,-1),onBody(sd*0.04*k,ay+0.045,-1),onBody(0,ay+0.012,-1)],false,'centripetal');path.push(...c.getSpacedPoints(60));}
      const hw=y=>0.017-0.003*smooth((y-(ay+0.1))/0.04),f0=fBra;
      fBra=(x,y,z)=>{let d=9;for(const q of path){const e=(q.x-x)**2+(q.y-y)**2+(q.z-z)**2;if(e<d)d=e;}return smax(f0(x,y,z),hw(y)-Math.sqrt(d),0.008);};}
    /* molded cups: padding thickest over the bust, thinning to a bare edge */
    const pad={tshirt:0.0032,balconette:0.0028,bralette:0,sports:0.0006}[T];
    const cupTh=(x,y,z)=>0.0014+pad*smooth((top(x,z)-y)/0.025)*smooth((y-yu)/0.03)*Math.exp(-(((Math.abs(x)-ax)/0.07)**2))*fr(z);
    /* a sports bra compresses: the jersey spans the bust (taut over the cleavage and from the apex to the band) */
    const mb=bodyPatch(geo,fBra,cupTh,main,sports?{hull:[yu,ay+0.09]}:{});if(mb)G.add(mb);
    /* under a strapless top (corset) the bra is strapless too */
    const strapless=S.top&&TOPS[S.top.type]&&TOPS[S.top.type].strap===0;
    if(!sports&&!strapless){for(const sd of [-1,1]){const rx=T==='bralette'?ax:ax+pk[1],ry=T==='bralette'?ay+0.064:pk[0]-0.005;
      bodyStrap(G,geo,[onBody(sd*rx,ry,1),onBody(sd*0.095*k,ay+0.12,1),onBody(sd*0.095*k,-0.035,0),onBody(sd*0.1*k,ay+0.09,-1),onBody(sd*0.105*k,yu+0.035,-1),onBody(sd*0.105*k,bandY-0.002,-1)],
        T==='bralette'?0.007:0.011,0.0024,band);}}
    /* the elastic underband (sports, bralette) */
    if(sports||T==='bralette'){const mb2=bodyPatch(geo,[fBra,(x,y,z)=>y-yb0+0.0003,(x,y,z)=>yb0+(sports?0.025:0.02)-y],0.0024,band);if(mb2)G.add(mb2);}}
  MK_CTX=prevCtx;MK_LAYER=prevLayer;}
function buildBody(G){
  const skin=skinMat();
  const SH=SHOES[S.shoes.type]||{},showFeet=S.shoes.type==='none'||SH.open||SH.low||SH.clog;
  {const bm=mk(bodyGeo(!!showFeet),skin);bm.userData.bodySkin=1;G.add(bm);}
  /* the head ends on the line where the neck strip starts (both share it exactly): watertight and smooth */
  if(BC.neckLoft){G.add(mk(surf(96,64,(u,v)=>{const ph=-u*TAU;return headPt(v*headAttachTh(ph),ph);},{wrapU:true,noAO:true}),skin));
    {const nm=mk(surf(96,14,(u,v)=>neckLoftPt(-u*TAU,1-v),{wrapU:true,noAO:true}),skin);nm.userData.bodyNeck=1;G.add(nm);}}
  else G.add(mk(surf(96,64,(u,v)=>headPt(v*Math.PI,-u*TAU),{wrapU:true,noAO:true}),skin));
}
