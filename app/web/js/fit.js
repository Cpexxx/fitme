'use strict';
/* =============== Fitme: dopasowanie ubrań do prawdziwego kształtu ciała ===============
   Garments are authored around smooth elliptical cross-sections of the body. Before rendering,
   every garment vertex is moved from that ellipse onto the real outline of the mannequin
   (the convex hull of each slice, i.e. how stretched fabric lies on it). Snug areas take the
   full body shape (chest, shoulder blades, waist, thighs, biceps); loose areas keep their own
   drape and only follow the body a little. The shift is a smooth space deformation, so pockets,
   buttons, belts and collars stay exactly where they sit on the fabric. */
const FIT_NA=96;
/* convex hull of 2D points (flat [x,z,...]) sampled as radius per direction around the origin */
function hullPolar(pts,NA=FIT_NA){
  const n=pts.length/2,out=new Float32Array(NA);if(n<3)return null;
  const idx=Array.from({length:n},(_,i)=>i).sort((a,b)=>pts[a*2]-pts[b*2]||pts[a*2+1]-pts[b*2+1]);
  const cr=(o,a,b)=>(pts[a*2]-pts[o*2])*(pts[b*2+1]-pts[o*2+1])-(pts[a*2+1]-pts[o*2+1])*(pts[b*2]-pts[o*2]);
  const lo=[],hi=[];
  for(const i of idx){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],i)<=0)lo.pop();lo.push(i);}
  for(let k=idx.length-1;k>=0;k--){const i=idx[k];while(hi.length>=2&&cr(hi[hi.length-2],hi[hi.length-1],i)<=0)hi.pop();hi.push(i);}
  const H=lo.slice(0,-1).concat(hi.slice(0,-1));if(H.length<3)return null;
  for(let k=0;k<NA;k++){const th=k/NA*TAU,dx=Math.cos(th),dz=Math.sin(th);let best=0;
    for(let e=0;e<H.length;e++){const a=H[e],b=H[(e+1)%H.length],ax=pts[a*2],az=pts[a*2+1],ex=pts[b*2]-ax,ez=pts[b*2+1]-az;
      const den=dx*ez-dz*ex;if(Math.abs(den)<1e-12)continue;const t=(ax*ez-az*ex)/den,u=(ax*dz-az*dx)/den;if(t>0&&u>=-1e-6&&u<=1+1e-6)best=Math.max(best,t);}
    out[k]=best;}
  for(let k=0;k<NA;k++)if(!out[k]){let a=k,b=k;while(!out[(a+NA-1)%NA]&&a>k-NA)a--;while(!out[(b+1)%NA]&&b<k+NA)b++;out[k]=Math.max(out[(a+NA-1)%NA],out[(b+1)%NA]);}
  return out;
}
/* stack of polar slices along a parameter, with gaps filled and a light vertical smoothing */
function polarStack(x0,step,N,collect,band){
  const rows=[];for(let k=0;k<N;k++){const pts=collect(x0+k*step,band);rows.push(pts.length>=6?hullPolar(pts):null);}
  for(let k=0;k<N;k++)if(!rows[k]){let j=k;while(j>=0&&!rows[j])j--;let i=k;while(i<N&&!rows[i])i++;rows[k]=rows[j>=0?j:i]||new Float32Array(FIT_NA).fill(0.05);}
  /* upper-envelope smoothing: removes slice-to-slice noise without letting the outline sink into the body */
  for(let p=0;p<6;p++){const c=rows.map(r=>r.slice());for(let k=0;k<N;k++)for(let a=0;a<FIT_NA;a++){const A=c[Math.max(0,k-1)][a],B=c[k][a],C=c[Math.min(N-1,k+1)][a],A2=c[Math.max(0,k-2)][a],C2=c[Math.min(N-1,k+2)][a],a2=(a+1)%FIT_NA,a0=(a+FIT_NA-1)%FIT_NA;
    let ang=0;for(let d=-5;d<=5;d++)ang+=c[k][(a+d+FIT_NA)%FIT_NA]*(6-Math.abs(d));ang/=36;
    rows[k][a]=Math.max(B*0.998,(A2+2*A+3*B+2*C+C2)/9*0.55+ang*0.45);}}
  const at=(th,x)=>{const f=clamp((x-x0)/step,0,N-1-1e-6),j=Math.floor(f),t=f-j,g=((th/TAU*FIT_NA)%FIT_NA+FIT_NA)%FIT_NA,k=Math.floor(g),u=g-k,k2=(k+1)%FIT_NA;
    return lerp(lerp(rows[j][k],rows[j][k2],u),lerp(rows[j+1][k],rows[j+1][k2],u),t);};
  for(const r of rows)for(let a=0;a<FIT_NA;a++)r[a]+=0.0015;
  return{rows,at};
}
/* stiff fabric: each slice replaced by the smallest rounded superellipse around it, then smoothed vertically */
function shellStack(st,N,x0,step,rv){
  const rows=st.rows.map(r=>{const pts=[];for(let a=0;a<FIT_NA;a++){const th=a/FIT_NA*TAU;pts.push([Math.cos(th)*r[a],Math.sin(th)*r[a]]);}
    const e=fitPts(pts),o=new Float32Array(FIT_NA);for(let a=0;a<FIT_NA;a++)o[a]=seRadial(e,a/FIT_NA*TAU);return o;});
  for(let p=0;p<4;p++){const c=rows.map(r=>r.slice());for(let k=0;k<N;k++)for(let a=0;a<FIT_NA;a++){let s=0,w=0;for(let dk=-rv;dk<=rv;dk++){const ww=rv+1-Math.abs(dk);s+=c[clamp(k+dk,0,N-1)][a]*ww;w+=ww;}rows[k][a]=Math.max(s/w,c[k][a]*0.985);}}
  return(th,x)=>{const f=clamp((x-x0)/step,0,N-1-1e-6),j=Math.floor(f),t=f-j,g=((th/TAU*FIT_NA)%FIT_NA+FIT_NA)%FIT_NA,k=Math.floor(g),u=g-k,k2=(k+1)%FIT_NA;
    return lerp(lerp(rows[j][k],rows[j][k2],u),lerp(rows[j+1][k],rows[j+1][k2],u),t);};
}
/* heavily smoothed copy of a polar stack: loose fabric only sees the overall shape */
function blurStack(st,N,x0,step,ra=4,rv=4){
  const rows=st.rows.map(r=>r.slice());
  for(let p=0;p<3;p++){const c=rows.map(r=>r.slice());for(let k=0;k<N;k++)for(let a=0;a<FIT_NA;a++){let s=0,w=0;
    for(let da=-ra;da<=ra;da++){const ww=ra+1-Math.abs(da);s+=c[k][(a+da+FIT_NA)%FIT_NA]*ww;w+=ww;}
    for(let dk=-rv;dk<=rv;dk++){if(!dk)continue;const ww=(rv+1-Math.abs(dk))*0.6;s+=c[clamp(k+dk,0,N-1)][a]*ww;w+=ww;}rows[k][a]=s/w;}}
  return(th,x)=>{const f=clamp((x-x0)/step,0,N-1-1e-6),j=Math.floor(f),t=f-j,g=((th/TAU*FIT_NA)%FIT_NA+FIT_NA)%FIT_NA,k=Math.floor(g),u=g-k,k2=(k+1)%FIT_NA;
    return lerp(lerp(rows[j][k],rows[j][k2],u),lerp(rows[j+1][k],rows[j+1][k2],u),t);};
}
/* measure the hull slices of the posed mannequin (nominal heights) */
function fitTables(m){
  if(m.fit)return m.fit;
  /* measure the smoothed (rendered) surface, with the vertex weights carried through the subdivision */
  const B0=mhBase(),plan=mhPlan(true),P=(()=>{const R=ccApply(plan,m.P);smoothSpots(R,plan,m.spots);return R;})(),nv=plan.n,W0=new Float32Array(B0.nv*3);
  for(let i=0;i<B0.nv;i++){W0[i*3]=B0.armw[i];W0[i*3+1]=B0.legw[i];W0[i*3+2]=B0.footw[i];}
  const Wt=ccApply(plan,W0),B={armw:new Float32Array(nv),legw:new Float32Array(nv),footw:new Float32Array(nv)},LX=m.LX;
  for(let i=0;i<nv;i++){B.armw[i]=Wt[i*3];B.legw[i]=Wt[i*3+1];B.footw[i]=Wt[i*3+2];}
  /* sort vertex indices by height once */
  const tor=[],leg=[],rawL=[],capY=m.shY-0.07;for(let i=0;i<nv;i++){const x=P[i*3],y=P[i*3+1],z=P[i*3+2];
    if(B.armw[i]<=0.35||y>capY)rawL.push(i);if(B.armw[i]>0.35)continue;tor.push(i);
    if(x>0.004&&y<0.97&&!(y<0.14&&B.footw[i]>0.3))leg.push(i);}
  const byY=list=>list.sort((a,b)=>P[a*3+1]-P[b*3+1]);byY(tor);byY(leg);
  const slab=(list,y,band,fn)=>{let lo=0,hi=list.length;while(lo<hi){const mid=(lo+hi)>>1;if(P[list[mid]*3+1]<y-band)lo=mid+1;else hi=mid;}
    const out=[];for(let k=lo;k<list.length;k++){const i=list[k];if(P[i*3+1]>y+band)break;fn(i,out);}return out;};
  const T=polarStack(0.02,0.01,165,(y,b)=>slab(tor,y,b,(i,o)=>o.push(P[i*3],P[i*3+2])),0.01);
  const L=polarStack(0.02,0.01,95,(y,b)=>slab(leg,y,b,(i,o)=>o.push(P[i*3]-LX,P[i*3+2])),0.01);
  /* arms: slices along the shoulder-elbow-wrist path, in the sleeve's own frame */
  const arm=[];for(let i=0;i<nv;i++){if(B.armw[i]<0.6||P[i*3]<0)continue;const q=armProj(P[i*3],P[i*3+1],P[i*3+2]);if(q&&q.t<1.04)arm.push([q.t,q.lu,q.lv]);}
  arm.sort((a,b)=>a[0]-b[0]);
  const A=polarStack(-0.06,0.02,55,(t,b)=>{const o=[];for(const q of arm){if(q[0]<t-b)continue;if(q[0]>t+b)break;o.push(q[1],q[2]);}return o;},0.026);
  /* raw outline of the trunk (max radius per direction) so nothing is ever pushed inside the skin */
  const RN=FIT_NA,RAW=Array.from({length:165},()=>new Float32Array(RN));
  for(const i of rawL){const x=P[i*3],y=P[i*3+1],z=P[i*3+2],r=Math.hypot(x,z),k=((Math.round(Math.atan2(z,x)/TAU*RN)%RN)+RN)%RN;
    for(let j=Math.max(0,Math.ceil((y-0.01-0.02)/0.01));j<=Math.min(164,Math.floor((y+0.01-0.02)/0.01));j++)if(r>RAW[j][k])RAW[j][k]=r;}
  const raw=(th,y)=>{const j=clamp(Math.round((y-0.02)/0.01),0,164),k=((Math.round(th/TAU*RN)%RN)+RN)%RN;return Math.max(RAW[j][k],RAW[j][(k+1)%RN],RAW[j][(k+RN-1)%RN]);};
  /* fabric hangs over hollows below the chest and shoulder blades instead of tucking into them */
  T.tightRows=T.rows.map(r=>r.slice());const TD=T.rows.map(r=>r.slice());
  for(let k=0;k<165;k++){const y=0.02+k*0.01;if(y<0.98)continue;const w=smooth((y-0.98)/0.08);
    for(let j=k+1;j<=Math.min(164,k+34);j++){const yy=0.02+j*0.01;if(yy>1.44)break;const f=1-0.12*(yy-y)-1.6*(yy-y)*(yy-y);
      for(let a=0;a<FIT_NA;a++){const c=lerp(T.rows[k][a],T.rows[j][a]*f,w);if(c>TD[k][a])TD[k][a]=c;}}}
  const T0=T.at;T.at=(th,y)=>{const f=clamp((y-0.02)/0.01,0,163.999),j=Math.floor(f),t=f-j,g=((th/TAU*FIT_NA)%FIT_NA+FIT_NA)%FIT_NA,k=Math.floor(g),u=g-k,k2=(k+1)%FIT_NA;
    return lerp(lerp(TD[j][k],TD[j][k2],u),lerp(TD[j+1][k],TD[j+1][k2],u),t);};T.tight=T0;
  T.rows=TD;
  /* round the draped slices a little towards a smooth superellipse (only ever outwards) */
  {const sh=shellStack(T,165,0.02,0.01,3);for(let k=0;k<165;k++){const y=0.02+k*0.01,w=0.35*smooth((y-1.0)/0.1)*(1-smooth((y-1.45)/0.06));if(w<=0)continue;
    for(let a=0;a<FIT_NA;a++){const v=sh(a/FIT_NA*TAU,y);if(v>TD[k][a])TD[k][a]=lerp(TD[k][a],v,w);}}}
  /* loose and heavy fabric hangs almost straight from the chest / shoulder blades / seat down to the hem */
  {const T0r=T.tightRows,TL=T0r.map(r=>r.slice());for(let k=0;k<165;k++){const y=0.02+k*0.01;for(let j=k+1;j<165;j++){const yy=0.02+j*0.01;if(yy>1.44||yy-y>0.85)break;const f=1-0.1*(yy-y);
      for(let a=0;a<FIT_NA;a++){const sn=Math.sin(a/FIT_NA*TAU),c=T0r[j][a]*f*(yy>1.3?sn*sn:1);if(c>TL[k][a])TL[k][a]=c;}}}
    for(let k=0;k<165;k++)for(let a=0;a<FIT_NA;a++)TL[k][a]=Math.max(TL[k][a],TD[k][a]);
    T.blur=blurStack({rows:TL},165,0.02,0.01,6,6);}L.blur=blurStack(L,95,0.02,0.01,5,4);A.blur=blurStack(A,55,-0.06,0.02,5,2);
  T.shell=shellStack(T,165,0.02,0.01,5);L.shell=shellStack(L,95,0.02,0.01,4);A.shell=shellStack(A,55,-0.06,0.02,2);
  let fz0=1,fz1=-1;for(let i=0;i<nv;i++){if(B.footw[i]<0.5||P[i*3]<0)continue;fz0=Math.min(fz0,P[i*3+2]);fz1=Math.max(fz1,P[i*3+2]);}
  return m.fit={T,L,A,raw,foot:fz1>fz0?fz1-fz0:0.26};
}
/* position along the arm path (t: 0 shoulder, .5 elbow, 1 wrist) and local frame coordinates, left arm */
function armProj(x,y,z){
  const S0=BC.S,E=BC.E,W=BC.W;let best=null;
  for(const[a,b,t0,t1] of [[S0,E,0,0.5],[E,W,0.5,1]]){const abx=b.x-a.x,aby=b.y-a.y,abz=b.z-a.z,L2=abx*abx+aby*aby+abz*abz;
    let u=((x-a.x)*abx+(y-a.y)*aby+(z-a.z)*abz)/L2;u=clamp(u,t0>0?0:-0.25,t1<1?1:1.25);
    const cx=a.x+abx*u,cy=a.y+aby*u,cz=a.z+abz*u,d=Math.hypot(x-cx,y-cy,z-cz);if(!best||d<best.d)best={d,t:lerp(t0,t1,u)};}
  const f=armFrame(best.t,1),c=armPt(best.t,1),ox=x-c.x,oy=y-c.y,oz=z-c.z;
  return{t:best.t,lu:ox*f.u.x+oy*f.u.y+oz*f.u.z,lv:ox*f.v.x+oy*f.v.y+oz*f.v.z,c,f,d:best.d};
}
/* radius of a superellipse ring in a given direction */
function seRadial(e,th){const c=Math.abs(Math.cos(th)),s=Math.sin(th),rz=s>=0?e.rz:zbk(e),n=e.n||2;return 1/Math.pow(Math.pow(c/e.rx,n)+Math.pow(Math.abs(s)/rz,n),1/n);}
/* how strongly fabric at a given ease takes the body's shape */
const fitLoose=e=>smooth((e-0.006)/0.065);
let FIT_ST=0;
const fitTarget=(st,th,x,e)=>{const w=fitLoose(e);return w<=0?st.at(th,x):lerp(st.at(th,x),st.blur(th,x),w);};
let FIT_HANG=null;
function fitHangAt(y){const f=clamp((y+0.05)/0.01,0,199.999),k=Math.floor(f),t=f-k,g=i=>{let e=FIT_HANG[i];if(!e)e=FIT_HANG[i]=hangEnv(-0.05+i*0.01,null);return e;},a=g(k),b=g(k+1);
  return{rx:lerp(a.rx,b.rx,t),rz:lerp(a.rz,b.rz,t),rzb:lerp(zbk(a),zbk(b),t),n:lerp(a.n||2,b.n||2,t)};}
/* stiff, structured fabric keeps most of its own cut */
const fitGain=()=>1;
let FIT_ENV=null;
function fitEnvK(k){let e=FIT_ENV[k];if(!e)e=FIT_ENV[k]=bodyEnv(-0.05+k*0.0025,null);return e;}
/* body ellipse at any height, interpolated so the shift field has no steps */
function fitEnvAt(y){const f=clamp((y+0.05)/0.0025,0,779.999),k=Math.floor(f),t=f-k,a=fitEnvK(k),b=fitEnvK(k+1);
  return{rx:lerp(a.rx,b.rx,t),rz:lerp(a.rz,b.rz,t),rzb:lerp(zbk(a),zbk(b),t),n:lerp(a.n||2,b.n||2,t)};}
function mapTorso(x,y,z,out){
  const F=BC.core.fit,r=Math.hypot(x,z);if(r<1e-5||y>1.66){out[0]=x;out[1]=y;out[2]=z;return;}
  const th=Math.atan2(z,x),Rs=seRadial(fitEnvAt(y),th),e=r-Rs,w=fitLoose(e),Rp=F.T.at(th,y),Rl=F.T.blur(th,y),Hs=w>0?seRadial(fitHangAt(y),th):Rs;
  /* the shoulder cap is shaped around the arm, leave it alone */
  const wy=(1-smooth((y-1.58)/0.06))*(1-smooth((Math.abs(x)-BC.shX*0.78)/(BC.shX*0.25))*smooth((y-(BC.shY-0.11))/0.05));
  let r2=r+lerp(Rp-Rs,Rl-Hs,w)*wy;
  const rw=F.raw(th,y);if(rw>0&&r>rw-0.03)r2=Math.max(r2,rw+0.0025);
  const k=r2/r;out[0]=x*k;out[1]=y;out[2]=z*k;
}
function mapLeg(x,y,z,side,out){
  const F=BC.core.fit,cx=side*BC.legX,dx=(x-cx)*side,r=Math.hypot(dx,z);
  if(r<1e-5||y>0.98){mapTorso(x,y,z,out);return;}
  const yy=Math.min(y,0.95),th=Math.atan2(z,dx),Rs=legAt(yy),e=r-Rs,Rp=fitTarget(F.L,th,yy,e),r2=r+(Rp-Rs)*fitGain(),k=r2/r;
  const lx=cx+(x-cx)*k,lz=z*k,w=smooth((y-0.78)/0.12);
  if(w>0){mapTorso(x,y,z,out);out[0]=lerp(lx,out[0],w);out[2]=lerp(lz,out[2],w);}else{out[0]=lx;out[1]=y;out[2]=lz;}
}
function mapArm(x,y,z,side,out){
  const F=BC.core.fit,q=armProj(x*side,y,z),r=Math.hypot(q.lu,q.lv);
  if(r<1e-5||q.t>1.02){out[0]=x;out[1]=y;out[2]=z;return;}
  const th=Math.atan2(q.lv,q.lu),t=Math.max(q.t,-0.06),Rs=armAt(clamp(t,0,1)),e=r-Rs,Rp=fitTarget(F.A,th,t,e);
  const d=(Rp-Rs)*(1-smooth((q.t-0.97)/0.05))*fitGain(),k=d/r;
  let ax=(x*side+q.lu*q.f.u.x*k+q.lv*q.f.v.x*k)*side,ay=y+q.lu*q.f.u.y*k+q.lv*q.f.v.y*k,az=z+q.lu*q.f.u.z*k+q.lv*q.f.v.z*k;
  const w=smooth((0.16-q.t)/0.12);
  if(w>0){mapTorso(x,y,z,out);out[0]=lerp(ax,out[0],w);out[1]=lerp(ay,out[1],w);out[2]=lerp(az,out[2],w);}else{out[0]=ax;out[1]=ay;out[2]=az;}
}
/* which body part a detail (button, cord, panel) belongs to, from where it sits */
function fitAxisOf(geo){
  geo.computeBoundingBox();const c=geo.boundingBox.getCenter(new THREE.Vector3());
  const side=c.x>=0?1:-1,q=armProj(c.x*side,c.y,c.z);
  if(q.t>0.1&&q.t<1.03&&q.d<armAt(clamp(q.t,0,1))+0.045&&Math.abs(c.x)>BC.shX*0.75)return side>0?'armL':'armR';
  if(PANTS&&!PANTS.skirt&&c.y<0.84&&Math.abs(Math.abs(c.x)-BC.legX)<legAt(c.y)+0.06)return side>0?'legL':'legR';
  return 'torso';
}
const FIT_TMP=[0,0,0],FIT_A=[0,0,0],FIT_B=[0,0,0];
function conformGeo(g,axis,stiff=0){
  if(!BC.core||!BC.core.fit)return;FIT_ST=stiff;
  if(!axis||axis==='auto')axis=fitAxisOf(g);
  const kind=axis.slice(0,3),side=axis.endsWith('R')?-1:1;
  const map=kind==='arm'?(x,y,z,o)=>mapArm(x,y,z,side,o):kind==='leg'?(x,y,z,o)=>mapLeg(x,y,z,side,o):mapTorso;
  const p=g.attributes.position,n=g.attributes.normal,np=p.count,eps=0.008;
  const tx=V3(0,0,0),ty=V3(0,0,0),nn=V3(0,0,0);
  for(let i=0;i<np;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);map(x,y,z,FIT_TMP);
    if(n){nn.set(n.getX(i),n.getY(i),n.getZ(i));
      /* carry the normal through the deformation with finite differences */
      tx.set(1,0,0);if(Math.abs(nn.x)>0.8)tx.set(0,1,0);tx.addScaledVector(nn,-tx.dot(nn)).normalize();ty.crossVectors(nn,tx);
      map(x+tx.x*eps,y+tx.y*eps,z+tx.z*eps,FIT_A);map(x+ty.x*eps,y+ty.y*eps,z+ty.z*eps,FIT_B);
      const ax=FIT_A[0]-FIT_TMP[0],ay=FIT_A[1]-FIT_TMP[1],az=FIT_A[2]-FIT_TMP[2],bx=FIT_B[0]-FIT_TMP[0],by=FIT_B[1]-FIT_TMP[1],bz=FIT_B[2]-FIT_TMP[2];
      let cx=ay*bz-az*by,cy=az*bx-ax*bz,cz=ax*by-ay*bx;const l=Math.hypot(cx,cy,cz);
      if(l>1e-12){cx/=l;cy/=l;cz/=l;if(cx*nn.x+cy*nn.y+cz*nn.z<0){cx=-cx;cy=-cy;cz=-cz;}n.setXYZ(i,cx,cy,cz);}}
    p.setXYZ(i,FIT_TMP[0],FIT_TMP[1],FIT_TMP[2]);
  }
}

/* =============== measurements of the mannequin (centimetres) and illustrative sizes =============== */
function polarPerim(fn,y){let L=0,px=0,pz=0;for(let a=0;a<=FIT_NA;a++){const th=a/FIT_NA*TAU,r=fn(th,y),x=Math.cos(th)*r,z=Math.sin(th)*r;if(a)L+=Math.hypot(x-px,z-pz);px=x;pz=z;}return L;}
function bodyMeasures(){
  const M=BC.core,F=M.fit,T=F.T.tight,k=BC.sxz*100;
  let chest=0,waist=1e9,hips=0;
  for(let y=1.18;y<=1.4;y+=0.01)chest=Math.max(chest,polarPerim(T,y));
  for(let y=1.0;y<=1.2;y+=0.01)waist=Math.min(waist,polarPerim(T,y));
  for(let y=0.8;y<=1.0;y+=0.01)hips=Math.max(hips,polarPerim(T,y));
  const crotch=0.8,inseam=(WARP.Y(crotch)*BC.sy)*100,foot=(F.foot||0.26)*k;
  const m={chest:chest*k,waist:waist*k,hips:hips*k,inseam,foot,at:y=>polarPerim(T,y)*k};
  const C=SIZE_CHEST[BC.g];let bi=0;for(let i=1;i<C.length;i++)if(Math.abs(C[i]-m.chest)<Math.abs(C[bi]-m.chest))bi=i;m.sizeIdx=bi;m.size=SIZES[bi];
  m.eu=clamp(Math.round(1.5*(m.foot+1.5)),EU_SIZES[0],EU_SIZES[EU_SIZES.length-1]);
  m.waistband=m.at(1.0);m.W=clamp(Math.round(m.waistband/2.54/2)*2,WAISTS[0],WAISTS[WAISTS.length-1]);m.L=clamp(Math.round(m.inseam/2.54/2)*2,INSEAMS[0],INSEAMS[INSEAMS.length-1]);
  return m;
}
/* extra ease (nominal metres) a chosen size adds over the mannequin's own size */
/* ease past ~3.5 cm (big sizes, oversized) does not blow the garment up: the extra cloth hangs and folds instead */
function easeCap(e,c=0.035){return e<=c?e:c+(e-c)*0.45;}
function sizeEase(P){
  const m=BC.meas;if(!m||!P||!P.size||P.size==='auto'||!SIZES.includes(P.size))return{d:0,len:0,sl:0,diff:0};
  const i=SIZES.indexOf(P.size),chart=SIZE_CHEST[BC.g][i],d=(chart-m.chest)/TAU/100/BC.sxz,diff=i-m.sizeIdx;
  return{d,len:diff*0.012,sl:diff*0.016,diff};
}
/* how a top of the given ease will feel, for the size hint */
function fitWord(totalEase){return totalEase<0.002?'mocno opina, za mały':totalEase<0.009?'przylega':totalEase<0.024?'swobodny':totalEase<0.045?'luźny':'bardzo luźny / oversize';}
/* inverse of the vertical warp (world height -> nominal) */
function warpInv(yw){let lo=-0.2,hi=2.4;for(let i=0;i<40;i++){const m=(lo+hi)/2;if(WARP.Y(m)*BC.sy<yw)lo=m;else hi=m;}return(lo+hi)/2;}
