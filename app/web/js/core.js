'use strict';
/* =============== Fitme: narzędzia, geometria, materiały =============== */
const $=(s,el=document)=>el.querySelector(s);
const $$=(s,el=document)=>Array.from(el.querySelectorAll(s));
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const gauss=(x,w)=>Math.exp(-(x*x)/(w*w));
const TAU=Math.PI*2,FRONT=Math.PI/2,BACKA=-Math.PI/2;
const HEX=/^#[0-9a-f]{6}$/i;
const clone=o=>JSON.parse(JSON.stringify(o));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pick=a=>a[Math.floor(Math.random()*a.length)];
function wrapA(a){a=(a+Math.PI)%TAU;if(a<0)a+=TAU;return a-Math.PI;}
/* smooth (cubic Hermite) interpolation of profile tables */
function interp(tab,x){
  const n=tab.length;
  if(x<=tab[0][0]) return tab[0].slice(1);
  if(x>=tab[n-1][0]) return tab[n-1].slice(1);
  let i=1;while(x>tab[i][0]) i++;
  const p1=tab[i-1],p2=tab[i],p0=tab[Math.max(0,i-2)],p3=tab[Math.min(n-1,i+1)];
  const h=p2[0]-p1[0],t=(x-p1[0])/h,t2=t*t,t3=t2*t;
  return p1.slice(1).map((v,k)=>{
    const a=p0[k+1],b=p2[k+1],c=p3[k+1];
    const m1=(b-a)/((p2[0]-p0[0])||1)*h,m2=(c-v)/((p3[0]-p1[0])||1)*h;
    const r=(2*t3-3*t2+1)*v+(t3-2*t2+t)*m1+(-2*t3+3*t2)*b+(t3-t2)*m2;
    const lo=Math.min(v,b),hi=Math.max(v,b),pad=(hi-lo)*0.15;
    return clamp(r,lo-pad,hi+pad);
  });
}
const interp1=(tab,x)=>interp(tab,x)[0];
function shade(hex,f){
  const n=parseInt(hex.slice(1),16);let r=n>>16&255,g=n>>8&255,b=n&255;
  const t=f<0?0:255,p=Math.abs(f);
  r=Math.round((t-r)*p+r);g=Math.round((t-g)*p+g);b=Math.round((t-b)*p+b);
  return '#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);
}
function mixHex(a,b,t){const A=parseInt(a.slice(1),16),B2=parseInt(b.slice(1),16);const r=Math.round(lerp(A>>16&255,B2>>16&255,t)),g=Math.round(lerp(A>>8&255,B2>>8&255,t)),bb=Math.round(lerp(A&255,B2&255,t));return '#'+((1<<24)|(r<<16)|(g<<8)|bb).toString(16).slice(1);}
function lumHex(hex){const n=parseInt(hex.slice(1),16);return((n>>16&255)*0.299+(n>>8&255)*0.587+(n&255)*0.114)/255;}
function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function nz3(x,y,z){return Math.sin(x*1.7+Math.sin(y*2.3+z*1.1)*1.3)*Math.sin(y*1.9+Math.sin(z*1.3+x*2.1)*1.3)*Math.sin(z*2.2+Math.sin(x*1.5+y*1.7)*1.3);}
function fbm(x,y,z){return nz3(x,y,z)*0.6+nz3(x*2.13+5.1,y*2.13,z*2.13+1.7)*0.3+nz3(x*4.31,y*4.31+3.3,z*4.31)*0.15;}

/* =============== geometry =============== */
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const VX=V3(1,0,0),VY=V3(0,1,0),VZ=V3(0,0,1);
const TILE=0.07;
/* render quality: the desktop app runs 'high' (denser garments, twice-smoothed body, sharper shadows) */
/* WebGL drawn by the CPU (no GPU driver / no access to it: SwiftShader, llvmpipe): every frame costs ~10-100x more */
const GL_INFO=(()=>{try{const c=document.createElement('canvas'),gl=c.getContext('webgl2')||c.getContext('webgl');if(!gl)return{name:'',soft:false};const d=gl.getExtension('WEBGL_debug_renderer_info'),name=d?String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL)):'';
  const lose=gl.getExtension('WEBGL_lose_context');if(lose)lose.loseContext();return{name,soft:/swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(name)};}catch(e){return{name:'',soft:false};}})();
const QUALITY=(()=>{let q=null;try{q=localStorage.getItem('fitme.quality');}catch(e){}return ['perf','std','high'].includes(q)?q:GL_INFO.soft?'perf':(window.FITME_APP?'high':'std');})();
const GEO_Q=QUALITY==='high'?1.6:QUALITY==='perf'?0.8:1;
const zbk=r=>r.rzb!=null?r.rzb:r.rz;
const addE=(r,e)=>({rx:r.rx+e,rz:r.rz+e,rzb:zbk(r)+e,n:r.n});
const mulE=(r,k)=>({rx:r.rx*k,rz:r.rz*k,rzb:zbk(r)*k,n:r.n});
const maxE=(a,b)=>!b?a:({rx:Math.max(a.rx,b.rx),rz:Math.max(a.rz,b.rz),rzb:Math.max(zbk(a),zbk(b)),n:Math.max(a.n||2,b.n||2)});
/* superellipse unit direction */
function seXY(a,n){const c=Math.cos(a),s=Math.sin(a);if(!n||Math.abs(n-2)<1e-3)return[c,s];const p=2/n;return[Math.sign(c)*Math.pow(Math.abs(c),p),Math.sign(s)*Math.pow(Math.abs(s),p)];}
/* angle (right side, front quadrant) where the ring's x equals xo */
function angAtX(env,xo){const n=env.n||2;return Math.acos(clamp(Math.pow(clamp(xo/env.rx,0,0.999),n/2),0,1));}
function frontZ(env,x,back){const n=env.n||2,t=Math.min(1,Math.abs(x)/env.rx);return (back?zbk(env):env.rz)*Math.pow(Math.max(0,1-Math.pow(t,n)),1/n);}
function envPt(env,a,y,off=0,cx=0,cz=0){const[c,s]=seXY(a,env.n);return V3(cx+c*(env.rx+off),y,cz+s*((s>=0?env.rz:zbk(env))+off));}
function envR(env,a){const[c,s]=seXY(a,env.n);return Math.hypot(c*env.rx,s*(s>=0?env.rz:zbk(env)));}

/* fake ambient occlusion baked into vertex colours */
let BC={legX:0.092,shX:0.178};
function aoAt(x,y,z,nx,ny,nz){
  let a=1;
  a*=1-0.14*clamp(-ny,0,1);
  const ax=Math.abs(x),lx=BC.legX;
  a*=1-0.18*clamp(-Math.sign(x||1)*nx,0,1)*smooth((y-0.3)/0.5)*(1-smooth((y-0.86)/0.06))*(1-smooth((ax-lx-0.01)/0.04));
  a*=1-0.14*smooth(1-ax/0.06)*smooth(1-Math.abs(y-0.82)/0.05);
  const sx=BC.shX*0.92,sy=1.34;
  a*=1-0.24*smooth(1-Math.hypot(ax-sx,(y-sy)*0.8)/0.075);
  a*=1-0.1*clamp(Math.sign(x)*nx,0,1)*smooth((ax-0.1)/0.03)*(1-smooth((ax-0.19)/0.03))*smooth((y-0.86)/0.05)*(1-smooth((y-1.33)/0.05));
  a*=1-0.12*smooth(1-y/0.06);
  return clamp(a,0.55,1);
}
/* lofted tube through cross-section samples {c,rx,rz,rzb,n,[a0,a1],[u,v]} */
function tube(samples,o={}){
  const seg=Math.max(1,Math.round((o.seg||48)*(o.seg&&o.seg<=8?1:GEO_Q))),n=samples.length,A0=o.a0!=null?o.a0:0,A1=o.a1!=null?o.a1:TAU;
  const per=samples.some(s=>s.a0!=null);
  const full=!per&&Math.abs(A1-A0-TAU)<1e-6;
  let avg=0;for(const s of samples)avg+=(s.rx+s.rz)/2;avg/=n;
  const s0=samples[Math.floor(n/2)],span=(s0.a1!=null?s0.a1:A1)-(s0.a0!=null?s0.a0:A0);
  const uRep=o.uv01?1:(o.uRep||Math.max(1,Math.round(span*avg/TILE)));
  let total=0;for(let i=1;i<n;i++)total+=samples[i].c.distanceTo(samples[i-1].c);
  const vRep=o.uv01?1/Math.max(total,1e-6):(o.vRep||1/TILE);
  const cnt=n*(seg+1),pos=new Float32Array(cnt*3),uv=new Float32Array(cnt*2);
  let acc=0,p=0,q=0;
  for(let i=0;i<n;i++){
    const s=samples[i];if(i)acc+=s.c.distanceTo(samples[i-1].c);
    const a0=s.a0!=null?s.a0:A0,a1=s.a1!=null?s.a1:A1,u=s.u||o.u||VX,v=s.v||o.v||VZ,t=n>1?i/(n-1):0;
    for(let j=0;j<=seg;j++){
      const a=a0+(a1-a0)*j/seg,[ca,sa]=seXY(a,s.n);
      const m=o.mod?o.mod(a,t,s):1,rx=s.rx*m,rz=(sa>=0?s.rz:zbk(s))*m;
      pos[p++]=s.c.x+u.x*ca*rx+v.x*sa*rz;pos[p++]=s.c.y+u.y*ca*rx+v.y*sa*rz;pos[p++]=s.c.z+u.z*ca*rx+v.z*sa*rz;
      uv[q++]=o.uFlip?(1-j/seg)*uRep:j/seg*uRep;uv[q++]=acc*vRep;
    }
  }
  const idx=new Uint32Array((n-1)*seg*6);let w=0;
  for(let i=0;i<n-1;i++)for(let j=0;j<seg;j++){const a=i*(seg+1)+j,b=a+seg+1;idx[w++]=a;idx[w++]=b;idx[w++]=a+1;idx[w++]=b;idx[w++]=b+1;idx[w++]=a+1;}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  g.setIndex(new THREE.BufferAttribute(idx,1));g.computeVertexNormals();
  const nr=g.attributes.normal;
  if(full) for(let i=0;i<n;i++){const a=i*(seg+1),b=a+seg;const x=nr.getX(a)+nr.getX(b),y=nr.getY(a)+nr.getY(b),z=nr.getZ(a)+nr.getZ(b),l=Math.hypot(x,y,z)||1;nr.setXYZ(a,x/l,y/l,z/l);nr.setXYZ(b,x/l,y/l,z/l);}
  const col=new Float32Array(cnt*3);let flips=0;
  for(let i=0;i<n;i++){const c=samples[i].c;for(let j=0;j<=seg;j++){
    const k=i*(seg+1)+j,x=pos[k*3],y=pos[k*3+1],z=pos[k*3+2];let nx=nr.getX(k),ny=nr.getY(k),nzz=nr.getZ(k);
    if((x-c.x)*nx+(y-c.y)*ny+(z-c.z)*nzz<0){nx=-nx;ny=-ny;nzz=-nzz;nr.setXYZ(k,nx,ny,nzz);flips++;}
    const a=o.noAO?1:aoAt(x,y,z,nx,ny,nzz);col[k*3]=col[k*3+1]=col[k*3+2]=a;}}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  {const s=samples[Math.floor(n/2)];g.userData.axis=s.t!=null&&s.u?(s.c.x>=0?'armL':'armR'):Math.abs(s.c.x)>0.03?(s.c.x>0?'legL':'legR'):'torso';}
  /* winding must agree with the outward normals, or DoubleSide lighting flips them back inside */
  if(flips>cnt/2)for(let t=0;t<idx.length;t+=3){const tmp=idx[t+1];idx[t+1]=idx[t+2];idx[t+2]=tmp;}
  return g;
}
function vSamples(y0,y1,n,fn,x=0,z=0){if(n>=8)n=Math.round(n*GEO_Q);const out=[];for(let i=0;i<=n;i++){const y=i===n?y1:lerp(y0,y1,i/n),r=fn(y);out.push({c:V3(x,y,z),rx:r.rx,rz:r.rz,rzb:zbk(r),n:r.n,a0:r.a0,a1:r.a1,off:r.off,y});}return out;}
/* generic parametric surface f(u,v)->Vector3 */
function surf(nu,nv,f,o={}){
  const W=nu+1,N=W*(nv+1),pos=new Float32Array(N*3),uv=new Float32Array(N*2);
  let k=0,q=0;
  for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const P=f(i/nu,j/nv);pos[k++]=P.x;pos[k++]=P.y;pos[k++]=P.z;uv[q++]=i/nu*(o.uRep||1);uv[q++]=j/nv*(o.vRep||1);}
  const idx=new Uint32Array(nu*nv*6);let w=0;
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*W+i,b=a+W;idx[w++]=a;idx[w++]=b;idx[w++]=a+1;idx[w++]=b;idx[w++]=b+1;idx[w++]=a+1;}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  g.setIndex(new THREE.BufferAttribute(idx,1));g.computeVertexNormals();
  const nr=g.attributes.normal;
  if(o.wrapU) for(let j=0;j<=nv;j++){const a=j*W,b=a+nu;const x=nr.getX(a)+nr.getX(b),y=nr.getY(a)+nr.getY(b),z=nr.getZ(a)+nr.getZ(b),l=Math.hypot(x,y,z)||1;nr.setXYZ(a,x/l,y/l,z/l);nr.setXYZ(b,x/l,y/l,z/l);}
  const col=new Float32Array(N*3);
  for(let i=0;i<N;i++){const a=o.noAO?1:aoAt(pos[i*3],pos[i*3+1],pos[i*3+2],0,0,0)*(o.dim||1);col[i*3]=col[i*3+1]=col[i*3+2]=a;}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  return g;
}
/* flat band along a path: pts (Vector3[]), side directions (Vector3[]) */
function ribbon(pts,sides,width,o={}){
  const n=pts.length,wf=typeof width==='function'?width:()=>width;let L=0;const acc=[0];
  for(let i=1;i<n;i++){L+=pts[i].distanceTo(pts[i-1]);acc.push(L);}
  return surf(o.cols||2,n-1,(u,v)=>{const i=Math.round(v*(n-1)),w=wf(v)*(u-0.5)+(o.shift||0);const P=pts[i].clone().addScaledVector(sides[i],w);if(o.bulge){P.addScaledVector(o.bulge[i],o.bulgeH*Math.sin(Math.PI*u));}return P;},{vRep:L/TILE,uRep:o.uRep||1,noAO:o.noAO});
}
/* thin round cord through points */
function cordGeo(pts,r,closed=false,radial=8,segs){
  const curve=new THREE.CatmullRomCurve3(pts,closed,'centripetal');
  return new THREE.TubeGeometry(curve,segs||Math.max(8,pts.length*4),r,radial,closed);
}
function stitchGeo(pts,closed=false){
  const g=cordGeo(pts,0.0011,closed,4);
  let L=0;for(let i=1;i<pts.length;i++)L+=pts[i].distanceTo(pts[i-1]);if(closed)L+=pts[0].distanceTo(pts[pts.length-1]);
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*L/0.009);
  return g;
}
let MK_CTX='none',MK_STIFF=0,MK_LAYER='none';
/* how much a fabric resists taking the body's shape (0 stretch jersey .. 1 heavy wool / padding) */
const STIFF={jersey:0,rib:0,tricot:0.1,mesh:0.1,knit:0.25,cable:0.4,waffle:0.15,pique:0.15,fleece:0.35,pile:0.45,poplin:0.3,oxford:0.35,linen:0.3,satin:0.15,velvet:0.3,flannel:0.35,
  twill:0.5,gabardine:0.6,canvas:0.65,denim:0.55,cord:0.55,wool:0.75,nylon:0.6,leather:0.6,suede:0.55,rubber:0.8};
function mk(geo,mat){const m=new THREE.Mesh(geo,mat);m.userData.ctx=MK_CTX;m.userData.stiff=MK_STIFF;m.userData.layer=MK_LAYER;return m;}
/* main fabric surface of a garment: used as the pattern for its shell (shell.js) */
function mkMain(geo,mat){const m=mk(geo,mat);m.userData.main=true;return m;}
function place(mesh,pos,quat,scale){if(pos)mesh.position.copy(pos);if(quat)mesh.quaternion.copy(quat);if(scale!=null){if(typeof scale==='number')mesh.scale.setScalar(scale);else mesh.scale.copy(scale);}return mesh;}
const qFromTo=(a,b)=>new THREE.Quaternion().setFromUnitVectors(a.clone().normalize(),b.clone().normalize());
/* capsule from point a to b */
function capsule(a,b,r,mat,rad=10){const d=b.clone().sub(a),L=d.length();const m=mk(new THREE.CapsuleGeometry(r,Math.max(0.0001,L),4,rad),mat);m.position.copy(a).addScaledVector(d,0.5);m.quaternion.copy(qFromTo(VY,d));return m;}
function rodGeo(a,b,r,rad=8){const d=b.clone().sub(a),L=d.length();const g=new THREE.CylinderGeometry(r,r,L,rad,1);const m=new THREE.Matrix4().compose(a.clone().addScaledVector(d,0.5),qFromTo(VY,d),V3(1,1,1));g.applyMatrix4(m);return g;}
/* solid slab from a closed plan outline (x,z) with per-point bottom/top heights */
function slab(outline,yb,yt,o={}){
  const n=outline.length,pos=[],idx=[];
  const top=outline.map((p,i)=>[p[0],yt(p,i),p[1]]),bot=outline.map((p,i)=>[p[0],yb(p,i),p[1]]);
  // walls
  for(let i=0;i<n;i++){pos.push(...bot[i]);pos.push(...top[i]);}
  for(let i=0;i<n;i++){const j=(i+1)%n,a=i*2,b=i*2+1,c=j*2,d=j*2+1;idx.push(a,c,b,b,c,d);}
  const tri=THREE.ShapeUtils.triangulateShape(outline.map(p=>new THREE.Vector2(p[0],p[1])),[]);
  const baseT=pos.length/3;top.forEach(p=>pos.push(...p));
  const baseB=pos.length/3;bot.forEach(p=>pos.push(...p));
  for(const t of tri){idx.push(baseT+t[0],baseT+t[1],baseT+t[2]);idx.push(baseB+t[0],baseB+t[2],baseB+t[1]);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  const uv=[];for(let i=0;i<pos.length/3;i++)uv.push(pos[i*3]/TILE,pos[i*3+2]/TILE+pos[i*3+1]/TILE);
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);
  const ng=g.toNonIndexed();ng.computeVertexNormals();g.dispose();return ng;
}

/* =============== merge + vertical warp =============== */
const KEEP=['position','normal','uv','color'];
/* optional per-vertex data carried through the merge (zeros where a mesh has none) */
const EXTRA={seamD:4,seamM:4,skinI:4,skinW:4};
function prepGeo(g,m){
  const gg=g.clone();
  if(!gg.index){const n=gg.attributes.position.count,ix=new Uint32Array(n);for(let i=0;i<n;i++)ix[i]=i;gg.setIndex(new THREE.BufferAttribute(ix,1));}
  for(const k of Object.keys(gg.attributes)) if(!KEEP.includes(k)&&!EXTRA[k]) gg.deleteAttribute(k);
  const n=gg.attributes.position.count;
  if(!gg.attributes.normal) gg.computeVertexNormals();
  if(!gg.attributes.uv) gg.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(n*2),2));
  if(!gg.attributes.color) gg.setAttribute('color',new THREE.BufferAttribute(new Float32Array(n*3).fill(1),3));
  gg.applyMatrix4(m);return gg;
}
function mergeGeos(list){
  let nv=0,ni=0;for(const g of list){nv+=g.attributes.position.count;ni+=g.index.count;}
  const P=new Float32Array(nv*3),N=new Float32Array(nv*3),U=new Float32Array(nv*2),C=new Float32Array(nv*3),I=new Uint32Array(ni);
  let ov=0,oi=0;
  for(const g of list){const c=g.attributes.position.count;
    P.set(g.attributes.position.array,ov*3);N.set(g.attributes.normal.array,ov*3);U.set(g.attributes.uv.array,ov*2);C.set(g.attributes.color.array,ov*3);
    const ix=g.index.array;for(let i=0;i<ix.length;i++)I[oi+i]=ix[i]+ov;ov+=c;oi+=ix.length;}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3));
  g.setAttribute('uv',new THREE.BufferAttribute(U,2));g.setAttribute('color',new THREE.BufferAttribute(C,3));g.setIndex(new THREE.BufferAttribute(I,1));
  for(const[k,sz] of Object.entries(EXTRA)){if(!list.some(x=>x.attributes[k]))continue;const A=new Float32Array(nv*sz);let o=0;for(const x of list){const c=x.attributes.position.count;if(x.attributes[k])A.set(x.attributes[k].array.subarray(0,c*sz),o*sz);o+=c;}g.setAttribute(k,new THREE.BufferAttribute(A,sz));}
  return g;
}
function makeWarp(segs){
  const lo=-0.3,hi=2.6,step=0.002,b=0.035,N=Math.round((hi-lo)/step);
  const kAt=y=>{let k=1;for(const[y0,y1,kk] of segs){const w=smooth((y-y0)/b+0.5)*(1-smooth((y-y1)/b+0.5));k*=1+(kk-1)*w;}return k;};
  const T=new Float32Array(N+1);let Y=0;for(let i=1;i<=N;i++){const y=lo+(i-0.5)*step;Y+=kAt(y)*step;T[i]=Y;}
  const zero=(0-lo)/step,z0=T[Math.floor(zero)]+(T[Math.ceil(zero)]-T[Math.floor(zero)])*(zero%1);
  const Yf=y=>{const f=clamp((y-lo)/step,0,N-1e-6),i=Math.floor(f);return T[i]+(T[i+1]-T[i])*(f-i)-z0;};
  return{Y:Yf,k:kAt,id:segs.every(s=>Math.abs(s[2]-1)<1e-4)};
}
function warpGeo(g,W){
  if(!W||W.id) return;
  const p=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<p.count;i++){const y=p.getY(i),k=W.k(y);p.setY(i,W.Y(y));const nx=n.getX(i),ny=n.getY(i)/k,nz=n.getZ(i),l=Math.hypot(nx,ny,nz)||1;n.setXYZ(i,nx/l,ny/l,nz/l);}
}
function finalize(G,W,free=true){
  G.updateMatrixWorld(true);
  const buckets=new Map();
  G.traverse(o=>{if(!o.isMesh||!o.visible)return;const g=prepGeo(o.geometry,o.matrixWorld);if(o.userData.ctx==='cloth'&&typeof conformGeo==='function')conformGeo(g,o.geometry.userData.axis,o.userData.stiff||0);let b=buckets.get(o.material);if(!b){b=[];buckets.set(o.material,b);}b.push(g);});
  if(free)G.traverse(o=>{if(o.isMesh&&!o.geometry.userData.keep)o.geometry.dispose();});
  const out=new THREE.Group();
  for(const[mat,list] of buckets){const g=mergeGeos(list);list.forEach(x=>x.dispose());warpGeo(g,W);g.computeBoundingSphere();
    if(mat.userData.needAttr)for(const[k,sz] of Object.entries(mat.userData.needAttr))if(!g.attributes[k])g.setAttribute(k,new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*sz),sz));
    if(mat.side===THREE.DoubleSide&&!mat.transparent)mat.shadowSide=THREE.BackSide;const m=new THREE.Mesh(g,mat);m.castShadow=!mat.userData.noShadow;m.receiveShadow=true;if(mat.transparent)m.renderOrder=2;out.add(m);}
  return out;
}

/* =============== textures & materials =============== */
const texCache=new Map(),matCache=new Map();
function cnv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;let ctx=null;try{ctx=c.getContext('2d');}catch(e){}return[c,ctx];}
const lin=hex=>new THREE.Color(hex).convertSRGBToLinear();
const MATDEF={
  denim:{r:.92,sh:.12,b:.016},twill:{r:.9,sh:.45,b:.007},gabardine:{r:.86,sh:.45,b:.005},canvas:{r:.94,sh:.3,b:.012},linen:{r:.95,sh:.4,b:.012},
  jersey:{r:.92,sh:.7,b:.004},pique:{r:.93,sh:.6,b:.01},rib:{r:.9,sh:.7,b:.018},waffle:{r:.92,sh:.7,b:.016},fleece:{r:.96,sh:1,b:.006},pile:{r:1,sh:1,b:.04},
  oxford:{r:.9,sh:.45,b:.008},poplin:{r:.84,sh:.4,b:.003},flannel:{r:.97,sh:1,b:.008},knit:{r:.97,sh:1,b:.016},cable:{r:.97,sh:1,b:.055},
  wool:{r:.95,sh:.55,b:.008},cord:{r:.92,sh:.95,b:.045},nylon:{r:.62,sh:.25,b:.003,cc:.08},satin:{r:.46,sh:.7,b:.002,cc:.04},tricot:{r:.66,sh:.5,b:.003,cc:.03},
  leather:{r:.58,sh:0,b:.0025,cc:.12},suede:{r:1,sh:.9,b:.01},velvet:{r:.92,sh:1,b:.004},mesh:{r:.85,sh:.3,b:.03},rubber:{r:.82,sh:0,b:.004},cork:{r:1,sh:.2,b:.03}
};
/* knit-type structures drawn at their real size (a 256 px tile is ~7 cm): soft shapes, no pixel noise */
function paintStruct(ctx,Z,kind,g,R){
  const soft=(x,y,rx,ry,v,rot)=>{ctx.save();ctx.translate(x,y);ctx.rotate(rot||0);ctx.scale(rx,ry);const gr=ctx.createRadialGradient(0,0,0,0,0,1);gr.addColorStop(0,g(v));gr.addColorStop(1,g(128));ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,1,0,7);ctx.fill();ctx.restore();};
  switch(kind){
    case 'knit':{/* stockinette: columns of V loops, ~4.5 mm wide, ~3.5 mm tall */
      const cw=16,rh=12;for(let y=-rh;y<Z+rh;y+=rh)for(let x=0;x<Z;x+=cw){soft(x+cw*0.27,y+rh*0.5,cw*0.3,rh*0.62,200,0.5);soft(x+cw*0.73,y+rh*0.5,cw*0.3,rh*0.62,200,-0.5);
        ctx.fillStyle=g(70);ctx.fillRect(x+cw*0.47,y,cw*0.06,rh);}break;}
    case 'waffle':{const c=24;for(let y=0;y<Z;y+=c)for(let x=0;x<Z;x+=c){ctx.fillStyle=g(92);ctx.fillRect(x+4,y+4,c-8,c-8);soft(x+c/2,y+c/2,c*0.32,c*0.32,70);}
      for(let k=0;k<Z;k+=c){ctx.fillStyle=g(186);ctx.fillRect(k-1.5,0,3,Z);ctx.fillRect(0,k-1.5,Z,3);}break;}
    case 'pique':{const c=10;for(let y=0;y<Z;y+=c)for(let x=(y/c%2)*c/2;x<Z;x+=c)soft(x+c/2,y+c/2,c*0.38,c*0.38,82);break;}
    case 'pile':{for(let i=0;i<520;i++){const x=R()*Z,y=R()*Z,s=5+R()*7;soft(x,y,s,s*0.8,128+(R()<.5?40:-34),R()*3);}break;}
    case 'cord':{const w=14;for(let x=0;x<Z;x+=w){const gr=ctx.createLinearGradient(x,0,x+w,0);gr.addColorStop(0,g(70));gr.addColorStop(0.2,g(150));gr.addColorStop(0.5,g(190));gr.addColorStop(0.8,g(150));gr.addColorStop(1,g(70));ctx.fillStyle=gr;ctx.fillRect(x,0,w,Z);}break;}
    case 'mesh':{const c=16;for(let y=0;y<Z;y+=c)for(let x=(y/c%2)*c/2;x<Z;x+=c)soft(x+c/2,y+c/2,c*0.3,c*0.3,40);break;}
    default:return false;}
  return true;}
function weaveTex(kind){
  const key='w|'+kind;if(texCache.has(key))return texCache.get(key);
  const Z=256,[c,ctx]=cnv(Z,Z);if(!ctx){texCache.set(key,null);return null;}
  const R=rng(hash(key));ctx.fillStyle='#808080';ctx.fillRect(0,0,Z,Z);
  const g=v=>`rgb(${v},${v},${v})`;
  const noise=(n,amp,sz=1)=>{for(let i=0;i<n;i++){const v=128+Math.round((R()*2-1)*amp);ctx.fillStyle=g(v);ctx.fillRect(R()*Z,R()*Z,sz,sz);}};
  const diag=(step,amp,w)=>{ctx.lineWidth=w;for(let k=-Z;k<2*Z;k+=step){ctx.strokeStyle=g(128+amp);ctx.beginPath();ctx.moveTo(k,0);ctx.lineTo(k+Z,Z);ctx.stroke();ctx.strokeStyle=g(128-amp);ctx.beginPath();ctx.moveTo(k+step/2,0);ctx.lineTo(k+step/2+Z,Z);ctx.stroke();}};
  const vstr=(step,amp)=>{for(let x=0;x<Z;x+=step){const gr=ctx.createLinearGradient(x,0,x+step,0);gr.addColorStop(0,g(128-amp));gr.addColorStop(.5,g(128+amp));gr.addColorStop(1,g(128-amp));ctx.fillStyle=gr;ctx.fillRect(x,0,step,Z);}};
  const grid=(step,amp)=>{for(let y=0;y<Z;y+=step)for(let x=0;x<Z;x+=step){ctx.fillStyle=g(128+((x/step+y/step)%2?amp:-amp));ctx.fillRect(x,y,step,step);}};
  if(paintStruct(ctx,Z,kind,g,R)){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;texCache.set(key,t);return t;}
  switch(kind){
    case 'denim':diag(4,40,1.6);noise(5000,40);break;
    case 'twill':case 'gabardine':diag(4,26,1.2);noise(2000,15);break;
    case 'canvas':case 'oxford':grid(2,30);noise(3000,20);break;
    case 'poplin':noise(3000,12);break;
    case 'linen':for(let i=0;i<160;i++){ctx.fillStyle=g(128+(R()<.5?40:-40));ctx.fillRect(0,R()*Z,Z,1+R()*1.5);ctx.fillRect(R()*Z,0,1+R()*1.5,Z);}noise(3000,30);break;
    case 'jersey':case 'tricot':noise(6000,18);break;
    case 'pique':for(let y=0;y<Z;y+=4)for(let x=(y/4%2)*2;x<Z;x+=4){ctx.fillStyle=g(70);ctx.fillRect(x,y,2,2);}break;
    case 'rib':vstr(16,50);noise(1500,15);break;
    case 'waffle':for(let y=0;y<Z;y+=10)for(let x=0;x<Z;x+=10){ctx.fillStyle=g(70);ctx.fillRect(x+2,y+2,6,6);}break;
    case 'knit':for(let x=0;x<Z;x+=8)for(let y=0;y<Z;y+=8){ctx.fillStyle=g(175);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+4,y+6);ctx.lineTo(x+8,y);ctx.lineTo(x+8,y+3);ctx.lineTo(x+4,y+9);ctx.lineTo(x,y+3);ctx.fill();}noise(1500,20);break;
    case 'cable':for(let x=0;x<Z;x+=8)for(let y=0;y<Z;y+=8){ctx.fillStyle=g(160);ctx.fillRect(x+1,y+1,6,6);}
      for(const cx of [40,128,216]){for(let y=-20;y<Z+20;y+=32){ctx.lineWidth=12;ctx.strokeStyle=g(220);ctx.beginPath();ctx.moveTo(cx-14,y);ctx.bezierCurveTo(cx-14,y+16,cx+14,y+16,cx+14,y+32);ctx.stroke();ctx.strokeStyle=g(190);ctx.beginPath();ctx.moveTo(cx+14,y);ctx.bezierCurveTo(cx+14,y+16,cx-14,y+16,cx-14,y+32);ctx.stroke();}ctx.fillStyle=g(40);ctx.fillRect(cx-26,0,3,Z);ctx.fillRect(cx+23,0,3,Z);}break;
    case 'wool':noise(9000,30);diag(8,8,2);break;
    case 'flannel':case 'fleece':case 'velvet':noise(8000,22,2);break;
    case 'pile':for(let i=0;i<1400;i++){ctx.fillStyle=g(128+Math.round((R()*2-1)*70));ctx.beginPath();ctx.arc(R()*Z,R()*Z,2+R()*5,0,7);ctx.fill();}break;
    case 'suede':noise(9000,20,2);break;
    case 'cord':vstr(10,70);noise(2000,12);break;
    case 'nylon':case 'satin':noise(1200,8);break;
    case 'leather':for(let i=0;i<500;i++){ctx.fillStyle=g(128+(R()<.5?14:-18));ctx.beginPath();ctx.arc(R()*Z,R()*Z,2+R()*8,0,7);ctx.fill();}noise(3000,10);break;
    case 'mesh':for(let y=0;y<Z;y+=8)for(let x=(y/8%2)*4;x<Z;x+=8){ctx.fillStyle=g(40);ctx.beginPath();ctx.arc(x+4,y+4,2.2,0,7);ctx.fill();}break;
    case 'cork':for(let i=0;i<3000;i++){ctx.fillStyle=g(128+Math.round((R()*2-1)*60));ctx.fillRect(R()*Z,R()*Z,1+R()*3,1+R()*3);}break;
    default:noise(2000,15);
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;texCache.set(key,t);return t;
}
function drawPattern(ctx,Z,pat,c1,c2,R){
  const band=(x,y,w,h,col,a)=>{ctx.globalAlpha=a;ctx.fillStyle=col;ctx.fillRect(x,y,w,h);ctx.globalAlpha=1;};
  switch(pat){
    case 'breton':for(let k=0;k<3;k++)band(0,k*Z/3+Z/12,Z,Z/3*0.42,c2,1);break;
    case 'pinstripe':for(let k=0;k<7;k++)band(k*Z/7,0,Math.max(2,Z/140),Z,c2,0.9);break;
    case 'gingham':{const n=6,w=Z/n/2;for(let k=0;k<n;k++){band(k*Z/n,0,w,Z,c2,.5);band(0,k*Z/n,Z,w,c2,.5);}break;}
    case 'tartan':{const sett=[[0,.18,c2,.62],[.24,.3,shade(c1,-.45),.55],[.34,.355,shade(c1,.6),.75],[.42,.6,c2,.45],[.66,.69,shade(c2,.5),.7],[.76,.94,shade(c1,-.35),.4]];
      for(const[a,b,col,al] of sett){band(a*Z,0,(b-a)*Z,Z,col,al);band(0,a*Z,Z,(b-a)*Z,col,al);}break;}
    case 'buffalo':band(0,0,Z/2,Z,c2,.55);band(0,0,Z,Z/2,c2,.55);break;
    case 'houndstooth':{const n=6,cs=Z/n;ctx.fillStyle=c2;for(let i=0;i<n;i++)for(let j=0;j<n;j++){if((i+j)%2)continue;const x=i*cs,y=j*cs;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+cs*.5,y);ctx.lineTo(x+cs,y+cs*.5);ctx.lineTo(x+cs,y+cs);ctx.lineTo(x+cs*.5,y+cs);ctx.lineTo(x+cs*.5,y+cs*1.5);ctx.lineTo(x,y+cs);ctx.lineTo(x-cs*.5,y+cs*.5);ctx.closePath();ctx.fill();}break;}
    case 'camo':{const cols=[c2,shade(c1,-0.35),mixHex(c1,c2,.5),shade(c2,-.3)];for(let i=0;i<46;i++){const x=R()*Z,y=R()*Z,rx=Z*(0.05+R()*0.09),ry=Z*(0.03+R()*0.06),rot=R()*3;ctx.fillStyle=cols[i%4];for(const ox of [-Z,0,Z])for(const oy of [-Z,0,Z]){ctx.beginPath();ctx.ellipse(x+ox,y+oy,rx,ry,rot,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(x+ox+rx*.6,y+oy+ry*.4,rx*.7,ry*.8,rot+1,0,7);ctx.fill();}}break;}
    case 'dots':{const n=6,cs=Z/n;ctx.fillStyle=c2;for(let j=0;j<n;j++)for(let i=0;i<n;i++){ctx.beginPath();ctx.arc(i*cs+(j%2?cs/2:0)+cs/4,j*cs+cs/2,cs*0.15,0,7);ctx.fill();}break;}
    case 'paisley':{
      const drop=(x,y,s,rot,col,fill)=>{ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(s,s);ctx.beginPath();ctx.moveTo(0,-1);ctx.bezierCurveTo(0.9,-0.9,1.1,0.4,0.2,0.95);ctx.bezierCurveTo(-0.5,1.3,-1,0.6,-0.7,0.1);ctx.bezierCurveTo(-0.45,-0.35,-0.2,-0.5,0,-1);ctx.closePath();
        if(fill){ctx.fillStyle=col;ctx.fill();}else{ctx.strokeStyle=col;ctx.lineWidth=0.09;ctx.stroke();}ctx.restore();};
      const n=5,cs=Z/n;
      for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=i*cs+(j%2?cs/2:0)+cs*0.25,y=j*cs+cs*0.5,rot=(i+j)%2?0.6:-2.4,sz=cs*0.3;
        for(const ox of [-Z,0,Z])for(const oy of [-Z,0,Z]){drop(x+ox,y+oy,sz,rot,c2,false);drop(x+ox,y+oy,sz*0.62,rot,c2,false);drop(x+ox,y+oy,sz*0.3,rot,c2,true);
          ctx.fillStyle=c2;for(let k=0;k<8;k++){const a=k/8*TAU;ctx.beginPath();ctx.arc(x+ox+Math.cos(a)*sz*1.35,y+oy+Math.sin(a)*sz*1.35,sz*0.07,0,7);ctx.fill();}}}
      for(let i=0;i<60;i++){ctx.fillStyle=c2;ctx.beginPath();ctx.arc(R()*Z,R()*Z,Z*0.006,0,7);ctx.fill();}
      break;}
    case 'heather':for(let i=0;i<26000;i++){ctx.fillStyle=R()<.5?shade(c1,.25):shade(c1,-.22);ctx.fillRect(R()*Z,R()*Z,1+R()*2,1);}break;
  }
}
function colorTex(kind,hex,pat,hex2){
  const key='c|'+kind+'|'+hex+'|'+pat+'|'+(pat==='solid'?'':hex2);
  if(texCache.has(key))return texCache.get(key);
  const Z=pat==='solid'?256:512,[c,ctx]=cnv(Z,Z);if(!ctx){texCache.set(key,null);return null;}
  const R=rng(hash(key));ctx.fillStyle=hex;ctx.fillRect(0,0,Z,Z);
  if(pat&&pat!=='solid')drawPattern(ctx,Z,pat,hex,hex2,R);
  const L=a=>`rgba(255,255,255,${a})`,D=a=>`rgba(0,0,0,${a})`,sc=Z/256;
  const noise=(n,a,sz=1)=>{for(let i=0;i<n;i++){ctx.fillStyle=R()<.5?L(a*R()):D(a*R());ctx.fillRect(R()*Z,R()*Z,sz*sc,sz*sc);}};
  switch(kind){
    case 'denim':ctx.lineWidth=1.3*sc;for(let k=-Z;k<2*Z;k+=4*sc){ctx.strokeStyle=L(.07);ctx.beginPath();ctx.moveTo(k,0);ctx.lineTo(k+Z,Z);ctx.stroke();}noise(5000,.14);for(let i=0;i<40;i++){ctx.fillStyle=L(.05*R());ctx.fillRect(R()*Z,0,(1+R()*2)*sc,Z);}break;
    case 'linen':for(let i=0;i<120;i++){ctx.fillStyle=R()<.5?L(.07):D(.05);ctx.fillRect(0,R()*Z,Z,sc);ctx.fillRect(R()*Z,0,sc,Z);}noise(2500,.06);break;
    case 'wool':noise(9000,.08);break;
    case 'flannel':case 'fleece':case 'pile':case 'suede':case 'velvet':noise(6000,.06,2);break;
    case 'leather':for(let i=0;i<220;i++){ctx.fillStyle=R()<.5?L(.018):D(.025);ctx.beginPath();ctx.arc(R()*Z,R()*Z,(2+R()*6)*sc,0,7);ctx.fill();}break;
    case 'knit':case 'waffle':case 'pique':case 'cord':case 'pile':{const[c2,x2]=cnv(256,256);const R2=rng(hash('s'+kind));x2.fillStyle='#808080';x2.fillRect(0,0,256,256);paintStruct(x2,256,kind,v=>`rgb(${v},${v},${v})`,R2);
      ctx.globalCompositeOperation='overlay';ctx.globalAlpha=kind==='pile'?0.35:0.45;const k=Z/256;ctx.save();ctx.scale(k,k);ctx.drawImage(c2,0,0);ctx.restore();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';break;}
    case 'rib':for(let x=0;x<Z;x+=6*sc){ctx.fillStyle=D(.08);ctx.fillRect(x,0,2*sc,Z);}break;
    case 'mesh':for(let y=0;y<Z;y+=8*sc)for(let x=(y/(8*sc)%2)*4*sc;x<Z;x+=8*sc){ctx.fillStyle=D(.35);ctx.beginPath();ctx.arc(x+4*sc,y+4*sc,2*sc,0,7);ctx.fill();}break;
    case 'cork':for(let i=0;i<3000;i++){ctx.fillStyle=R()<.5?L(.1):D(.14);ctx.fillRect(R()*Z,R()*Z,2*sc,2*sc);}break;
    default:noise(2500,.04);
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;t.anisotropy=8;
  const rep={tartan:.5,buffalo:.5,camo:.42}[pat]||1;t.repeat.set(rep,rep);
  texCache.set(key,t);return t;
}
const BUMPY={cable:0.35,cord:0.35,waffle:0.5,pique:0.4,pile:0.3,knit:0.45,rib:0.3,leather:0.6,suede:0.35,mesh:0.4,cork:0.6,fleece:0.2};
function fabric(kind,hex,pat='solid',hex2='#1e1e1f'){
  if(!HEX.test(hex||''))hex='#888888';if(!HEX.test(hex2||''))hex2='#1e1e1f';
  const key=['f',kind,hex,pat||'solid',pat&&pat!=='solid'?hex2:''].join('|');if(matCache.has(key))return matCache.get(key);
  /* only coarse structures get relief: fine weaves (oxford, poplin, twill...) live in the colour map, a bump that fine shimmers as moire */
  const D=MATDEF[kind]||MATDEF.twill,map=colorTex(kind,hex,pat||'solid',hex2),bump=BUMPY[kind]?weaveTex(kind):null;
  const m=new THREE.MeshPhysicalMaterial({color:map?0xffffff:lin(hex),map,roughness:D.r,metalness:0,sheen:(D.sh||0)*lerp(0.15,1,smooth(lumHex(hex)*1.6)),sheenRoughness:.6,sheenColor:lin(shade(hex,lerp(.06,.4,lumHex(hex)))),
    clearcoat:D.cc||0,clearcoatRoughness:.5,envMapIntensity:0.4,side:THREE.DoubleSide,vertexColors:true});
  if(bump){m.bumpMap=bump;m.bumpScale=D.b*0.45*BUMPY[kind];}
  matCache.set(key,m);return m;
}
/* everything reads matte except polished metal and stones: those catch sharp highlights from the studio lights */
const SHINY=['gem','pearl','bead','dial','lens'];
function plain(hex,rough=.8,metal=0,key='',extra){
  const k='p|'+hex+'|'+rough+'|'+metal+'|'+key;if(matCache.has(k))return matCache.get(k);
  const met=metal>=0.5,shiny=SHINY.includes(key),ex=Object.assign({},extra||{});
  if(!met&&!shiny){rough=Math.max(rough,0.6);if(ex.clearcoat)ex.clearcoat=Math.min(ex.clearcoat,0.12);}
  if(met){rough=rough*0.75;ex.clearcoat=1;ex.clearcoatRoughness=0.05;}
  const m=new THREE.MeshPhysicalMaterial(Object.assign({color:lin(hex),roughness:rough,metalness:metal,envMapIntensity:met?1.8:shiny?1.2:0.4,side:THREE.DoubleSide,vertexColors:true},ex));
  matCache.set(k,m);return m;
}
function metalMat(key){const M=METALS[key]||METALS.silver;return plain(M.c,M.r,M.m,'metal');}
function stitchTex(dir){
  const key='st'+dir;if(texCache.has(key))return texCache.get(key);
  const [c,ctx]=cnv(32,32);if(!ctx){texCache.set(key,null);return null;}
  ctx.fillStyle='#fff';ctx.beginPath();
  if(dir==='v'){ctx.roundRect?ctx.roundRect(11,2,10,20,5):ctx.rect(11,2,10,20);}else{ctx.roundRect?ctx.roundRect(2,11,20,10,5):ctx.rect(2,11,20,10);}
  ctx.fill();const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;texCache.set(key,t);return t;
}
function stitchMat(hex,dir='h'){
  const k='s|'+hex+dir;if(matCache.has(k))return matCache.get(k);
  const map=stitchTex(dir);
  const m=new THREE.MeshStandardMaterial({color:lin(hex),map,alphaTest:map?.5:0,roughness:.8,side:THREE.DoubleSide,vertexColors:true});
  m.userData.noShadow=true;matCache.set(k,m);return m;
}
/* hair strands: dir 'v' = strands along v, 'u' = along u */
function hairTex(hex,dir,kind){
  const key='h|'+hex+dir+kind;if(texCache.has(key))return texCache.get(key);
  const Z=512,[c,ctx]=cnv(Z,Z);if(!ctx){texCache.set(key,null);return null;}
  const R=rng(hash(key));ctx.fillStyle=hex;ctx.fillRect(0,0,Z,Z);
  if(dir==='u'){ctx.translate(Z,0);ctx.rotate(Math.PI/2);}
  if(kind==='coil'){for(let i=0;i<900;i++){ctx.strokeStyle=R()<.5?`rgba(255,255,255,${.06+R()*.1})`:`rgba(0,0,0,${.1+R()*.2})`;ctx.lineWidth=1+R();ctx.beginPath();ctx.arc(R()*Z,R()*Z,1.5+R()*3,0,Math.PI*(1+R()));ctx.stroke();}}
  else if(kind==='braid'){for(let y=0;y<Z;y+=16)for(let x=0;x<Z;x+=32){ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x+8,y+8,9,5,0.7,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(x+24,y+16,9,5,-0.7,0,7);ctx.fill();}
    for(let i=0;i<300;i++){ctx.strokeStyle=`rgba(255,255,255,${.05+R()*.08})`;const x=R()*Z;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+(R()-.5)*20,Z);ctx.stroke();}}
  else{/* clumps: broad soft light/dark bands of random width, then fine low-contrast strands */
    let x=0;while(x<Z){const w=6+R()*22,g=ctx.createLinearGradient(x,0,x+w,0),k=R()*.1;g.addColorStop(0,`rgba(0,0,0,${.07+k})`);g.addColorStop(.45,`rgba(255,255,255,${.03+R()*.05})`);g.addColorStop(1,`rgba(0,0,0,${.07+k})`);ctx.fillStyle=g;ctx.fillRect(x,0,w,Z);x+=w;}
    for(let i=0;i<900;i++){const x2=R()*Z,l=R()<.5;ctx.strokeStyle=l?`rgba(255,255,255,${.015+R()*.04})`:`rgba(0,0,0,${.02+R()*.06})`;ctx.lineWidth=.4+R()*.8;ctx.beginPath();ctx.moveTo(x2,-4);ctx.bezierCurveTo(x2+(R()-.5)*5,Z*.33,x2+(R()-.5)*5,Z*.66,x2+(R()-.5)*3,Z+4);ctx.stroke();}}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;t.anisotropy=8;texCache.set(key,t);return t;
}
function hairMat(hex,dir='v',kind='strand'){
  const k='hm|'+hex+dir+kind;if(matCache.has(k))return matCache.get(k);
  const map=hairTex(hex,dir,kind);
  const m=new THREE.MeshPhysicalMaterial({color:map?0xffffff:lin(hex),map,bumpMap:map,bumpScale:kind==='braid'?.001:kind==='coil'?.0022:.004,roughness:kind==='strand'?.78:.88,metalness:0,sheen:kind==='strand'?.2:.1,sheenRoughness:.45,sheenColor:lin(shade(hex,.22)),envMapIntensity:.38,
    side:THREE.DoubleSide,vertexColors:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  matCache.set(k,m);return m;
}
function stubbleMat(hex){
  const k='stub|'+hex;if(matCache.has(k))return matCache.get(k);
  const [c,ctx]=cnv(128,128);let map=null;
  if(ctx){const R=rng(7);ctx.clearRect(0,0,128,128);for(let i=0;i<2600;i++){ctx.fillStyle=`rgba(255,255,255,${.25+R()*.6})`;ctx.fillRect(R()*128,R()*128,1,1);}map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;}
  const m=new THREE.MeshStandardMaterial({color:lin(hex),alphaMap:map,transparent:true,opacity:.75,roughness:.9,depthWrite:false,side:THREE.FrontSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  m.userData.noShadow=true;matCache.set(k,m);return m;
}
/* decals (prints, patches, rips) */
function decalTex(kind,hex,extra){
  const key='d|'+kind+'|'+hex+'|'+(extra||'');if(texCache.has(key))return texCache.get(key);
  const Z=512,[c,ctx]=cnv(Z,Z);if(!ctx){texCache.set(key,null);return null;}
  ctx.clearRect(0,0,Z,Z);ctx.fillStyle=hex;ctx.strokeStyle=hex;ctx.textAlign='center';ctx.textBaseline='middle';
  const R=rng(hash(key));
  switch(kind){
    case 'logo':ctx.lineWidth=26;ctx.beginPath();ctx.arc(256,256,180,0,7);ctx.stroke();ctx.font='900 250px Georgia,serif';ctx.fillText('F',256,272);break;
    case 'text':ctx.font='italic 900 150px Georgia,serif';ctx.fillText('Fitme',256,230);ctx.font='700 46px Archivo,Arial,sans-serif';ctx.fillText('ATELIER · EST. 2026',256,350);break;
    case 'star':{ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?95:230;ctx.lineTo(256+Math.cos(a)*r,256+Math.sin(a)*r);}ctx.closePath();ctx.fill();break;}
    case 'cross':{const w=58;ctx.fillRect(256-w/2,40,w,430);ctx.fillRect(110,150,292,w);for(const[x,y] of [[256,40],[256,470],[110,179],[402,179]]){ctx.beginPath();ctx.arc(x,y,44,0,7);ctx.fill();}ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(256-8,60,16,390);break;}
    case 'flames':for(let i=0;i<9;i++){const x=40+i*54,h=220+R()*170;ctx.beginPath();ctx.moveTo(x-34,500);ctx.bezierCurveTo(x-50,500-h*.5,x+10,500-h*.7,x,500-h);ctx.bezierCurveTo(x+40,500-h*.55,x+44,500-h*.3,x+34,500);ctx.closePath();ctx.fill();}break;
    case 'number':ctx.font='900 330px Archivo,Arial,sans-serif';ctx.lineWidth=14;ctx.strokeStyle=shade(hex,-0.5);ctx.strokeText('10',256,280);ctx.fillText('10',256,280);break;
    case 'letter':ctx.fillStyle=extra||'#7a3b2e';ctx.font='900 400px Georgia,serif';ctx.lineWidth=40;ctx.strokeStyle=hex;ctx.strokeText('F',256,290);ctx.fillText('F',256,290);break;
    case 'rip':{ctx.fillStyle=extra;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(256+(R()-.5)*60,180+i*80,150+R()*40,22+R()*16,0,0,7);ctx.fill();}
      ctx.strokeStyle='#efe9dc';ctx.lineWidth=7;for(let y=120;y<420;y+=14){ctx.beginPath();ctx.moveTo(90+R()*40,y);ctx.bezierCurveTo(200,y+6,320,y-6,420-R()*40,y+(R()-.5)*6);ctx.stroke();}
      ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=3;for(let i=0;i<120;i++){const x=80+R()*350,y=100+R()*330;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(R()-.5)*14,y+R()*20);ctx.stroke();}break;}
  }
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;texCache.set(key,t);return t;
}
function decalMat(kind,hex,extra){
  const k='dm|'+kind+hex+(extra||'');if(matCache.has(k))return matCache.get(k);
  const map=decalTex(kind,hex,extra);
  const m=new THREE.MeshPhysicalMaterial({map,transparent:true,alphaTest:.35,roughness:.75,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,vertexColors:true});
  m.userData.noShadow=true;matCache.set(k,m);return m;
}
