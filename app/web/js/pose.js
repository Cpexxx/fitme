'use strict';
/* =============== Fitme: pozy manekina =============== */
/* The whole dressed figure is built in the standing pose and then bent as one skinned model:
   MakeHuman's own bone weights (grouped into 19 bones), joints found on the reshaped body,
   dual-quaternion skinning so elbows and shoulders keep their volume. Clothes take the weights
   of the body point they were made from (shells) or of the nearest body point (everything else). */
const POSE_BONES=['hips','spine','chest','neck','head','clavL','uarmL','farmL','handL','clavR','uarmR','farmR','handR','thighL','shinL','footL','thighR','shinR','footR'];
const POSE_PARENT={hips:null,spine:'hips',chest:'spine',neck:'chest',head:'neck',clavL:'chest',uarmL:'clavL',farmL:'uarmL',handL:'farmL',clavR:'chest',uarmR:'clavR',farmR:'uarmR',handR:'farmR',
  thighL:'hips',shinL:'thighL',footL:'shinL',thighR:'hips',shinR:'thighR',footR:'shinR'};
/* angles in degrees, rotations about the rest pose axes (x: right-left, y: up, z: front); L is the figure's left (+x) */
const POSES={
  stand:{label:'Stoi',b:{}},
  relaxed:{label:'Swobodnie',b:{hips:[0,3,-3.5],spine:[0,-1.5,1.5],chest:[0,-1.5,2.5],neck:[0,0,-1],head:[2,-4,-2],
    thighL:[-7,-3,3.5],shinL:[13,0,0],footL:[-5,2,-1],thighR:[0,0,-1],shinR:[1,0,0],footR:[0,0,0],
    uarmL:[3,0,4],farmL:[-12,0,0],handL:[0,0,-4],uarmR:[-3,0,-3],farmR:[-16,0,0],handR:[0,0,4]},T:[-0.012,0,0]},
  walk:{label:'Chód',b:{hips:[0,6,0],spine:[2,-3,0],chest:[0,-4,0],head:[0,2,0],
    thighL:[-22,0,1],shinL:[7,0,0],footL:[13,0,0],thighR:[13,0,-1],shinR:[26,0,0],footR:[-14,0,0],
    uarmL:[14,0,2],farmL:[-8,0,0],uarmR:[-16,0,-2],farmR:[-22,0,0]},T:[0,-0.012,0]},
  hip:{label:'Ręka na biodrze',handRest:1,b:{hips:[0,-2,2],chest:[0,3,-1.5],head:[0,6,1],
    uarmL:[12,8,40],farmL:[-6,-25,-88],handL:[0,0,-12],uarmR:[-2,0,-4],farmR:[-12,0,0],
    thighR:[-4,-4,-3],shinR:[8,0,0],footR:[-3,-6,0],thighL:[0,0,1]},T:[0.008,0,0]},
  open:{label:'Szeroka postawa',b:{thighL:[0,-4,7],thighR:[0,4,-7],footL:[0,-5,-7],footR:[0,5,7],uarmL:[0,0,9],uarmR:[0,0,-9],farmL:[-10,0,0],farmR:[-10,0,0],chest:[-2,0,0],head:[-3,0,0]},T:[0,-0.006,0]},
  apose:{label:'A-pose',b:{uarmL:[0,0,33],uarmR:[0,0,-33],farmL:[0,0,4],farmR:[0,0,-4],thighL:[0,0,3],thighR:[0,0,-3],footL:[0,0,-3],footR:[0,0,3]}},
  tpose:{label:'T-pose',b:{clavL:[0,0,6],clavR:[0,0,-6],uarmL:[0,0,74],uarmR:[0,0,-74],farmL:[0,0,6],farmR:[0,0,-6],handL:[0,0,2],handR:[0,0,-2]}}
};
const POSE_IDX=Object.fromEntries(POSE_BONES.map((b,i)=>[b,i]));
/* control-mesh weights (4 per vertex) */
function poseBase(){const B=mhBase();if(B.skin)return B.skin;const D=MH_DATA;if(!D.skinI)return B.skin=null;
  const I=b64arr(D.skinI,Uint8Array),Wb=b64arr(D.skinW,Uint8Array),nv=B.nv,G=POSE_BONES.length,dense=new Float32Array(nv*G);
  const map=(D.groups||POSE_BONES).map(n=>POSE_IDX[n]);
  for(let i=0;i<nv;i++)for(let k=0;k<4;k++){const w=Wb[i*4+k]/255;if(w>0)dense[i*G+map[I[i*4+k]]]+=w;}
  return B.skin={dense,G};}
/* weights on a smoothed surface (same plan chain as the body / shell meshes) */
function poseDenseWeights(feet,hi){const B=mhBase(),key=(feet?'f':'n')+(hi?'2':'1');B.skinD=B.skinD||{};if(B.skinD[key])return B.skinD[key];
  const sb=poseBase();if(!sb)return null;const G=sb.G,nv=B.nv,p1=mhPlan(feet),p2=hi?mhPlan2(feet):null,n=hi?p2.n:p1.n,acc=new Float32Array(n*G);
  for(let c=0;c<G;c+=3){const W0=new Float32Array(nv*3);for(let i=0;i<nv;i++)for(let k=0;k<3&&c+k<G;k++)W0[i*3+k]=sb.dense[i*G+c+k];
    const R=hi?ccApply(p2,ccApply(p1,W0)):ccApply(p1,W0);for(let i=0;i<n;i++)for(let k=0;k<3&&c+k<G;k++)acc[i*G+c+k]=R[i*3+k];}
  const I=new Uint8Array(n*4),W=new Float32Array(n*4);
  for(let i=0;i<n;i++){const o=i*G,top=[];for(let g=0;g<G;g++){const w=acc[o+g];if(w>0.004)top.push([w,g]);}top.sort((a,b)=>b[0]-a[0]);let s=0;
    for(let k=0;k<4&&k<top.length;k++)s+=top[k][0];for(let k=0;k<4;k++){if(k<top.length){I[i*4+k]=top[k][1];W[i*4+k]=top[k][0]/(s||1);}}}
  return B.skinD[key]={I,W,n};}
/* joints on the reshaped body (nominal heights) */
function poseJoints(){const M=BC.core,P=M.P,A=MH_DATA[BC.g]&&MH_DATA[BC.g].anch;if(!A)return null;const J={};
  for(const b of POSE_BONES){const a=A[b];if(!a){J[b]=null;continue;}let x=0,y=0,z=0;for(const i of a.ids){x+=P[i*3];y+=P[i*3+1];z+=P[i*3+2];}const n=a.ids.length||1;J[b]=V3(x/n+a.off[0],y/n+a.off[1],z/n+a.off[2]);}
  /* the hip pivot: between the hip joints */
  if(J.thighL&&J.thighR)J.hips=J.thighL.clone().add(J.thighR).multiplyScalar(0.5).setY(Math.max(J.thighL.y,J.thighR.y)+0.06);
  return J;}
/* spatial hash of the shell base surface (integer cell keys, trunk/legs and arms kept apart) */
function poseHash(){const Bs=shellBase(1);if(Bs.hash)return Bs.hash;const P=Bs.P,n=Bs.n,cs=0.03,reg=Bs.reg;
  const key=(a,b,c)=>((a+512)*1024+(b+512))*1024+(c+512);const T=new Map(),A=new Map(),L3=new Map(),L4=new Map();
  for(let i=0;i<n;i++){const M=(reg[i]===1||reg[i]===2)?A:reg[i]===3?L3:reg[i]===4?L4:T,kk=key(Math.floor(P[i*3]/cs),Math.floor(P[i*3+1]/cs),Math.floor(P[i*3+2]/cs));let L=M.get(kk);if(!L)M.set(kk,L=[]);L.push(i);}
  /* nearest point among one family; also returns the squared distance */
  /* cell bounds of every family: rings that cannot reach it are skipped */
  const bnd=new Map();for(const M of [T,A,L3,L4]){const b=[1e9,1e9,1e9,-1e9,-1e9,-1e9];for(const k of M.keys()){const c=k%1024-512,bb=Math.floor(k/1024)%1024-512,a=Math.floor(k/1048576)-512;b[0]=Math.min(b[0],a);b[1]=Math.min(b[1],bb);b[2]=Math.min(b[2],c);b[3]=Math.max(b[3],a);b[4]=Math.max(b[4],bb);b[5]=Math.max(b[5],c);}bnd.set(M,b);}
  /* nearest point per family, remembered per half-cell (skin weights are smooth, a few mm make no difference) */
  const memo=new Map([[T,new Map()],[A,new Map()],[L3,new Map()],[L4,new Map()]]),hc=cs*0.5;
  const near=(M,x,y,z,maxR)=>{const mk=((Math.floor(x/hc)+1024)*2048+(Math.floor(y/hc)+1024))*2048+(Math.floor(z/hc)+1024)+maxR*1e12,mm=memo.get(M);let hit=mm.get(mk);
    if(hit===undefined){hit=near0(M,(Math.floor(x/hc)+0.5)*hc,(Math.floor(y/hc)+0.5)*hc,(Math.floor(z/hc)+0.5)*hc,maxR)[0];mm.set(mk,hit);}
    if(hit<0)return[-1,1e9];const dx=P[hit*3]-x,dy=P[hit*3+1]-y,dz=P[hit*3+2]-z;return[hit,dx*dx+dy*dy+dz*dz];};
  const near0=(M,x,y,z,maxR)=>{const cx=Math.floor(x/cs),cy=Math.floor(y/cs),cz=Math.floor(z/cs);let best=-1,bd=1e9;const b=bnd.get(M);
    const r0=Math.max(0,b[0]-cx,cx-b[3],b[1]-cy,cy-b[4],b[2]-cz,cz-b[5]);if(r0>maxR)return[-1,1e9];
    for(let r=r0;r<=maxR;r++){for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++){const edge=Math.abs(a)===r||Math.abs(b)===r,step=edge||r===0?1:2*r;for(let c=-r;c<=r;c+=step){const L=M.get(key(cx+a,cy+b,cz+c));if(!L)continue;
        for(let li=0;li<L.length;li++){const i=L[li];const dx=P[i*3]-x,dy=P[i*3+1]-y,dz=P[i*3+2]-z,d=dx*dx+dy*dy+dz*dz;if(d<bd){bd=d;best=i;}}}}
      if(best>=0&&Math.sqrt(bd)<r*cs)break;}
    return[best,bd];};
  const best=(...rs)=>rs.reduce((a,b)=>b[1]<a[1]?b:a);
  /* legs only exist below the hips: far above them the leg maps are not searched at all */
  const legY=Bs.cy+0.15,lm=(x,y,z,M,m)=>y<legY?near(M,x,y,z,m):[-1,1e9];
  return Bs.hash={cs,trunk:(x,y,z,m=8)=>best(near(T,x,y,z,m),lm(x,y,z,L3,m),lm(x,y,z,L4,m)),leg:(sd,x,y,z,m=8)=>best(near(T,x,y,z,m),lm(x,y,z,sd===3?L3:L4,m)),arm:(x,y,z,m=8)=>near(A,x,y,z,m),any:(x,y,z)=>best(near(T,x,y,z,8),lm(x,y,z,L3,8),lm(x,y,z,L4,8),near(A,x,y,z,8)),near2:(x,y,z)=>best(near(T,x,y,z,1),near(L3,x,y,z,1),near(L4,x,y,z,1),near(A,x,y,z,1))};}
/* weights for every mesh of the figure, written as skinI/skinW attributes before the merge */
function poseAssign(G,GS){
  const Bs=shellBase(1),hi=GEO_Q>1,DW=poseDenseWeights(true,false);if(!DW)return false;const H=poseHash(),hd=POSE_IDX.head,NG=POSE_BONES.length;
  const headY=BC.headC.y-BC.hd.ry*0.92,reg=Bs.reg,Ct=Bs.C;
  const winv=yw=>{let lo=-0.2,hi2=1.2;for(let i=0;i<28;i++){const m=(lo+hi2)/2;if((WARP?WARP.Y(m):m)<yw)lo=m;else hi2=m;}return(lo+hi2)/2;};
  const v=new THREE.Vector3(),acc=new Float32Array(NG);
  /* top 4 of a dense weight row */
  const put=(I,W,o,row)=>{let s=0;for(let k=0;k<4;k++){let bi=-1,bw=0;for(let g=0;g<NG;g++)if(row[g]>bw){bw=row[g];bi=g;}if(bi<0){I[o+k]=0;W[o+k]=0;continue;}I[o+k]=bi;W[o+k]=bw;s+=bw;row[bi]=-row[bi]-1;}
    for(let g=0;g<NG;g++)if(row[g]<0)row[g]=-row[g]-1;for(let k=0;k<4;k++)W[o+k]=s?W[o+k]/s:0;};
  const addD=(D,i,w)=>{for(let k=0;k<4;k++){const ww=D.W[i*4+k];if(ww>0)acc[D.I[i*4+k]]+=ww*w;}};
  const doMesh=(o,shoe)=>{if(!o.visible)return;const g=o.geometry,p=g.attributes.position,n=p.count;if(!n)return;const I=new Float32Array(n*4),W=new Float32Array(n*4);
    const ud=g.userData;let direct=null;
    if(ud.src&&ud.src.length===n)direct=DW;
    else if(ud.bodyFeet!=null&&ud.bodyPlanN===n)direct=poseDenseWeights(ud.bodyFeet,hi);
    else if(ud.bodySrc&&ud.bodySrc.length===n){const D=poseDenseWeights(ud.bodySrcFeet,hi);if(D&&D.I.length===ud.bodySrcN*4)direct=D;}
    o.updateMatrixWorld(true);const mw=o.matrixWorld;
    /* small rigid pieces (buttons, rings, chain links, hair locks, eyelets): one lookup at the centre, one transform */
    if(!direct){g.computeBoundingBox();const bb=g.boundingBox;if(bb.max.distanceTo(bb.min)*mw.getMaxScaleOnAxis()<0.11||o.userData.rigid){const c=bb.getCenter(new THREE.Vector3()).applyMatrix4(mw);let y=c.y;if(shoe)y=winv(y-LIFT);
      acc.fill(0);const hw=smooth((y-headY)/0.05);if(hw<1){const[j]=H.any(c.x,y,c.z);if(j>=0)addD(DW,j,1-hw);}if(hw>0)acc[hd]+=hw;const row=acc.slice();put(I,W,0,row);
      for(let i=1;i<n;i++)for(let k=0;k<4;k++){I[i*4+k]=I[k];W[i*4+k]=W[k];}
      g.setAttribute('skinI',new THREE.BufferAttribute(I,4));g.setAttribute('skinW',new THREE.BufferAttribute(W,4));return;}}
    /* one piece follows one part of the body: a trouser hem one leg, a cuff one arm; trunk pieces take an arm only where clearly on it (sleeve seams), never a hand hanging next to a hem */
    let mode='split',side=0;if(!direct){const ax=ud.axis;
      if(ax==='armL'||ax==='armR'){mode='arm';side=ax==='armL'?1:2;}
      else if(ax==='legL'||ax==='legR'){mode='leg';side=ax==='legL'?3:4;}
      else if(!(ax==='torso'||['top','mid','outer','bottom'].includes(o.userData.layer))){const st=Math.max(1,Math.floor(n/12));let arm=0,tot=0;
        for(let i=0;i<n;i+=st){v.fromBufferAttribute(p,i).applyMatrix4(mw);let y=v.y;if(shoe)y=winv(y-LIFT);const[j]=H.any(v.x,y,v.z);if(j>=0){tot++;if(reg[j]===1||reg[j]===2)arm++;}}
        if(arm>tot*0.5)mode='arm';}}
    const pos=p.array;
    for(let i=0;i<n;i++){acc.fill(0);let x=pos[i*3],y=pos[i*3+1],z=pos[i*3+2];v.set(x,y,z).applyMatrix4(mw);x=v.x;y=v.y;z=v.z;if(shoe)y=winv(y-LIFT);
      const hw=smooth((y-headY)/0.05);
      if(direct)addD(direct,ud.src?ud.src[i]:ud.bodySrc?ud.bodySrc[i]:i,1-hw);
      else if(hw<1){let j=-1;
        if(mode==='arm'){j=H.arm(x,y,z)[0];if(side&&j>=0&&reg[j]!==side){const t=H.trunk(x,y,z)[0];if(t>=0)j=t;}}
        else{const[jt,dt]=mode==='leg'?H.leg(side,x,y,z):H.trunk(x,y,z);j=jt;
          if(mode==='leg'&&j>=0&&reg[j]>=3&&reg[j]!==side){/* the other leg: stay on the trunk side of this one */}
          if(mode==='split'&&y>BC.shY-0.36){const lim=Math.min(8,Math.ceil(0.55*Math.sqrt(dt)/H.cs)+1),[ja,da]=H.arm(x,y,z,lim);if(ja>=0&&Ct[ja*3+1]<0.42&&da<0.3*dt)j=ja;}}
        if(j>=0)addD(DW,j,1-hw);}
      if(hw>0)acc[hd]+=hw;put(I,W,i*4,acc);}
    /* small rigid things (watch, ring, glasses, buttons, hair locks): one transform for the whole piece */
    g.computeBoundingBox();const bb=g.boundingBox,diag=bb.max.distanceTo(bb.min)*mw.getMaxScaleOnAxis();
    if(!direct&&(diag<0.11||o.userData.rigid)){acc.fill(0);for(let i=0;i<n;i++)for(let k=0;k<4;k++)acc[I[i*4+k]]+=W[i*4+k];for(let i=0;i<n;i++){const r=acc.slice();put(I,W,i*4,r);}}
    else if(!direct&&g.index&&n>60&&mode==='split'){/* draped tubes (skirts, coat skirts): blend the weights along the fabric so the legs do not tear it */
      const ix=g.index.array,deg=new Uint32Array(n+1);for(let t=0;t<ix.length;t++)deg[ix[t]+1]+=2;for(let i=0;i<n;i++)deg[i+1]+=deg[i];const nb=new Uint32Array(deg[n]),fill=deg.slice(0,n);
      for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2];nb[fill[a]++]=b;nb[fill[a]++]=c;nb[fill[b]++]=a;nb[fill[b]++]=c;nb[fill[c]++]=a;nb[fill[c]++]=b;}
      const used=[...new Set(Array.from(I).filter((_,q)=>W[q]>0))],U=used.length,uix=new Int16Array(NG).fill(-1);used.forEach((gb,q)=>uix[gb]=q);
      let cur=new Float32Array(n*U),nxt=new Float32Array(n*U);for(let i=0;i<n;i++)for(let k=0;k<4;k++)if(W[i*4+k]>0)cur[i*U+uix[I[i*4+k]]]+=W[i*4+k];
      const its=o.userData.kept?40:6;
      for(let it=0;it<its;it++){for(let i=0;i<n;i++){const o2=i*U,c0=deg[i],c1=deg[i+1],f=c1>c0?0.5/(c1-c0):0;for(let gg=0;gg<U;gg++)nxt[o2+gg]=cur[o2+gg]*(f?0.5:1);
          for(let q=c0;q<c1;q++){const oj=nb[q]*U;for(let gg=0;gg<U;gg++)nxt[o2+gg]+=cur[oj+gg]*f;}}const t=cur;cur=nxt;nxt=t;}
      const row=new Float32Array(NG);for(let i=0;i<n;i++){row.fill(0);for(let q=0;q<U;q++)row[used[q]]=cur[i*U+q];put(I,W,i*4,row);}}
    g.setAttribute('skinI',new THREE.BufferAttribute(I,4));g.setAttribute('skinW',new THREE.BufferAttribute(W,4));};
  G.updateMatrixWorld(true);G.traverse(o=>{if(o.isMesh)doMesh(o,false);});
  if(GS){GS.updateMatrixWorld(true);GS.traverse(o=>{if(o.isMesh)doMesh(o,true);});}
  return true;
}
/* bone transforms (in the space of a finalised group) as dual quaternions */
function poseBoneDQ(J,def,lift){
  const Ms={},out=new Float32Array(POSE_BONES.length*8),q=new THREE.Quaternion(),e=new THREE.Euler(),T=new THREE.Matrix4(),R=new THREE.Matrix4(),Ti=new THREE.Matrix4(),pos=new THREE.Vector3(),sc=new THREE.Vector3();
  const jf=b=>{const j=J[b]||J[POSE_PARENT[b]]||V3(0,1,0);return V3(j.x,(WARP?WARP.Y(j.y):j.y)+lift,j.z);};
  for(const b of POSE_BONES){const a=(def.b||{})[b]||[0,0,0],p=jf(b);
    e.set(a[0]*Math.PI/180,a[1]*Math.PI/180,a[2]*Math.PI/180,'YXZ');R.makeRotationFromEuler(e);
    T.makeTranslation(p.x,p.y,p.z);Ti.makeTranslation(-p.x,-p.y,-p.z);const L=T.clone().multiply(R).multiply(Ti);
    if(b==='hips'&&def.T)L.premultiply(new THREE.Matrix4().makeTranslation(def.T[0],def.T[1],def.T[2]));
    const par=POSE_PARENT[b];Ms[b]=par?Ms[par].clone().multiply(L):L;}
  POSE_BONES.forEach((b,i)=>{Ms[b].decompose(pos,q,sc);const o=i*8;out[o]=q.x;out[o+1]=q.y;out[o+2]=q.z;out[o+3]=q.w;
    /* dual part: 0.5 * (t,0) * q */
    const tx=pos.x,ty=pos.y,tz=pos.z;out[o+4]=0.5*(tx*q.w+ty*q.z-tz*q.y);out[o+5]=0.5*(-tx*q.z+ty*q.w+tz*q.x);out[o+6]=0.5*(tx*q.y-ty*q.x+tz*q.w);out[o+7]=-0.5*(tx*q.x+ty*q.y+tz*q.z);});
  return out;}
function poseSkinGeo(g,DQ){
  const p=g.attributes.position,nr=g.attributes.normal,SI=g.attributes.skinI,SW=g.attributes.skinW;if(!SI||!SW)return;
  const n=p.count,P=p.array,N=nr?nr.array:null,I=SI.array,W=SW.array;
  for(let i=0;i<n;i++){let a0=0,a1=0,a2=0,a3=0,b0=0,b1=0,b2=0,b3=0,r0=0,r1=0,r2=0,r3=0,first=true;
    for(let k=0;k<4;k++){const w=W[i*4+k];if(w<=0)continue;const o=I[i*4+k]*8;let s=w;
      if(first){r0=DQ[o];r1=DQ[o+1];r2=DQ[o+2];r3=DQ[o+3];first=false;}else if(DQ[o]*r0+DQ[o+1]*r1+DQ[o+2]*r2+DQ[o+3]*r3<0)s=-w;
      a0+=DQ[o]*s;a1+=DQ[o+1]*s;a2+=DQ[o+2]*s;a3+=DQ[o+3]*s;b0+=DQ[o+4]*s;b1+=DQ[o+5]*s;b2+=DQ[o+6]*s;b3+=DQ[o+7]*s;}
    if(first)continue;const L=Math.hypot(a0,a1,a2,a3)||1;a0/=L;a1/=L;a2/=L;a3/=L;b0/=L;b1/=L;b2/=L;b3/=L;
    /* translation = 2 * dual * conj(real) */
    const tx=2*(-b3*a0+b0*a3-b1*a2+b2*a1),ty=2*(-b3*a1+b0*a2+b1*a3-b2*a0),tz=2*(-b3*a2-b0*a1+b1*a0+b2*a3);
    const rot=(x,y,z)=>{const ix=a3*x+a1*z-a2*y,iy=a3*y+a2*x-a0*z,iz=a3*z+a0*y-a1*x,iw=-a0*x-a1*y-a2*z;return[ix*a3+iw*-a0+iy*-a2-iz*-a1,iy*a3+iw*-a1+iz*-a0-ix*-a2,iz*a3+iw*-a2+ix*-a1-iy*-a0];};
    const q=rot(P[i*3],P[i*3+1],P[i*3+2]);P[i*3]=q[0]+tx;P[i*3+1]=q[1]+ty;P[i*3+2]=q[2]+tz;
    if(N){const m=rot(N[i*3],N[i*3+1],N[i*3+2]);N[i*3]=m[0];N[i*3+1]=m[1];N[i*3+2]=m[2];}}
  p.needsUpdate=true;if(nr)nr.needsUpdate=true;g.computeBoundingSphere();g.computeBoundingBox();}
/* bend the finalised body + feet groups; afterwards the lowest point stands on the floor again */
/* position of one skinned vertex under a set of bone dual quaternions */
function poseSkinPt(DQ,I,W,P,i,out){let a0=0,a1=0,a2=0,a3=0,b0=0,b1=0,b2=0,b3=0,r0=0,r1=0,r2=0,r3=0,first=true;
  for(let k=0;k<4;k++){const w=W[i*4+k];if(w<=0)continue;const o=I[i*4+k]*8;let s=w;
    if(first){r0=DQ[o];r1=DQ[o+1];r2=DQ[o+2];r3=DQ[o+3];first=false;}else if(DQ[o]*r0+DQ[o+1]*r1+DQ[o+2]*r2+DQ[o+3]*r3<0)s=-w;
    a0+=DQ[o]*s;a1+=DQ[o+1]*s;a2+=DQ[o+2]*s;a3+=DQ[o+3]*s;b0+=DQ[o+4]*s;b1+=DQ[o+5]*s;b2+=DQ[o+6]*s;b3+=DQ[o+7]*s;}
  if(first){out[0]=P[i*3];out[1]=P[i*3+1];out[2]=P[i*3+2];return;}const L=Math.hypot(a0,a1,a2,a3)||1;a0/=L;a1/=L;a2/=L;a3/=L;b0/=L;b1/=L;b2/=L;b3/=L;
  const tx=2*(-b3*a0+b0*a3-b1*a2+b2*a1),ty=2*(-b3*a1+b0*a2+b1*a3-b2*a0),tz=2*(-b3*a2-b0*a1+b1*a0+b2*a3),x=P[i*3],y=P[i*3+1],z=P[i*3+2];
  const ix=a3*x+a1*z-a2*y,iy=a3*y+a2*x-a0*z,iz=a3*z+a0*y-a1*x,iw=-a0*x-a1*y-a2*z;
  out[0]=ix*a3+iw*-a0+iy*-a2-iz*-a1+tx;out[1]=iy*a3+iw*-a1+iz*-a0-ix*-a2+ty;out[2]=iz*a3+iw*-a2+ix*-a1-iy*-a0+tz;}
/* in a pose the hands can come to rest on (and sink into) a hip, a thigh or the clothes over them (relaxed hips, a walk):
   the hands are posed, their gap to whatever is beside them measured, and each upper arm swung out until they clear */
function poseHandClear(body,J,def){const meshes=[];body.traverse(o=>{if(o.isMesh&&o.geometry.attributes.skinI)meshes.push(o.geometry);});if(!meshes.length)return def;
  const arm=new Set(['uarmL','farmL','handL','uarmR','farmR','handR'].map(b=>POSE_IDX[b])),hand={1:POSE_IDX.handL,'-1':POSE_IDX.handR};
  /* per mesh: hand vertices (mostly hand bone) and other vertices (no arm bone at all) below the chest */
  const H=[],O=[];for(const g of meshes){const I=g.attributes.skinI.array,W=g.attributes.skinW.array,P=g.attributes.position.array,N=g.attributes.normal.array,n=P.length/3;
    for(let i=0;i<n;i++){let wa=0,wh=0;for(let k=0;k<4;k++){const b=I[i*4+k],w=W[i*4+k];if(arm.has(b))wa+=w;if(b===hand[1]||b===hand[-1])wh+=w;}
      if(wh>0.6&&(i%2===0))H.push([g,i]);else if(wa<0.02&&P[i*3+1]<1.25&&P[i*3+1]>0.45&&Math.abs(P[i*3])>0.04)O.push([g,i]);}}
  if(!H.length||!O.length)return def;
  let d2={b:Object.assign({},def.b||{}),T:def.T};const p=new Float32Array(3),cs=0.015;
  for(let pass=0;pass<4;pass++){const DQ=poseBoneDQ(J,d2,0),grid=new Map();
    for(const[g,i] of O){poseSkinPt(DQ,g.attributes.skinI.array,g.attributes.skinW.array,g.attributes.position.array,i,p);const k=Math.floor(p[0]/cs)+','+Math.floor(p[1]/cs)+','+Math.floor(p[2]/cs);let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(p[0],p[1],p[2],g,i);}
    const worst={1:0,'-1':0};
    for(const[g,i] of H){poseSkinPt(DQ,g.attributes.skinI.array,g.attributes.skinW.array,g.attributes.position.array,i,p);const sd=p[0]>=0?1:-1;let bd=9,bj=null;
      const gx=Math.floor(p[0]/cs),gy=Math.floor(p[1]/cs),gz=Math.floor(p[2]/cs);/* (the hand on the hip pose rests the hand on purpose) */if(def.handRest&&def.handRest===sd)continue;
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){const a=grid.get((gx+dx)+','+(gy+dy)+','+(gz+dz));if(!a)continue;for(let q=0;q<a.length;q+=5){const d=Math.hypot(p[0]-a[q],p[1]-a[q+1],p[2]-a[q+2]);if(d<bd){bd=d;bj=q;bj={x:a[q],y:a[q+1],z:a[q+2],g:a[q+3],i:a[q+4]};}}}
      if(!bj)continue;/* closer than ~1 cm to the body (or anything worn on it) beside it: the fingers touch it or sink in */const need=0.01-bd;if(need>worst[sd])worst[sd]=need;}
    if(worst[1]<=0.001&&worst[-1]<=0.001)break;
    for(const sd of [1,-1]){if(worst[sd]<=0.001)continue;const k=sd>0?'uarmL':'uarmR',a=(d2.b[k]||[0,0,0]).slice();a[2]+=sd*Math.min(6,(worst[sd]+0.003)/0.6*180/Math.PI*1.3);d2.b[k]=a;}}
  return d2;}
function posePose(body,feet,key){let def=POSES[key];if(!def||key==='stand')return;const J=poseJoints();if(!J)return;
  def=poseHandClear(body,J,def);
  const dqB=poseBoneDQ(J,def,0),dqF=poseBoneDQ(J,def,LIFT);
  body.traverse(o=>{if(o.isMesh)poseSkinGeo(o.geometry,dqB);});feet.traverse(o=>{if(o.isMesh)poseSkinGeo(o.geometry,dqF);});
  let lo=1e9;body.traverse(o=>{if(o.isMesh&&o.geometry.boundingBox)lo=Math.min(lo,o.geometry.boundingBox.min.y+body.position.y);});feet.traverse(o=>{if(o.isMesh&&o.geometry.boundingBox)lo=Math.min(lo,o.geometry.boundingBox.min.y);});
  if(lo<1e8&&Math.abs(lo)>1e-4){body.position.y-=lo;feet.position.y-=lo;}}
