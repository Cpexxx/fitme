'use strict';
/* =============== Fitme: manekin z siatki MakeHuman (CC0) =============== */
/* base mesh is posed offline (mhdata.js); here it is reshaped by the sliders, smoothed with
   one Catmull-Clark step and measured so the garments know where the body surface is */
const va=v=>[v.x,v.y,v.z];
const r3=x=>Math.round(x*1000)/1000;
function b64arr(s,T){const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new T(u.buffer);}
const MH={};
function mhBase(){
  if(MH.ready)return MH;
  const D=MH_DATA;MH.nv=D.nv;
  const idx=b64arr(D.index,Uint16Array),nq=idx.length/6,Q=new Uint32Array(nq*4);
  for(let f=0;f<nq;f++){Q[f*4]=idx[f*6];Q[f*4+1]=idx[f*6+1];Q[f*4+2]=idx[f*6+2];Q[f*4+3]=idx[f*6+5];}
  MH.Q=Q;MH.label=b64arr(D.label,Uint8Array);
  const n8=(s)=>{const a=b64arr(s,Uint8Array),o=new Float32Array(a.length);for(let i=0;i<a.length;i++)o[i]=a[i]/255;return o;};
  MH.armw=n8(D.armw);MH.legw=n8(D.legw);MH.footw=n8(D.footw);
  for(const g of ['m','f']){const q=b64arr(D[g].pos,Int16Array),p=new Float32Array(q.length);for(let i=0;i<q.length;i++)p[i]=q[i]/10000;MH[g]={pos:p,J:D[g].joints,head:D[g].head,d:{},dj:D[g].djoints||{}};
    for(const[k,s] of Object.entries(D[g].delta||{})){const dq=b64arr(s,Int16Array),dd=new Float32Array(dq.length);for(let i=0;i<dq.length;i++)dd[i]=dq[i]/10000;MH[g].d[k]=dd;}}
  MH.sub={};MH.ready=true;return MH;
}
/* Catmull-Clark as a sparse linear map from control points to refined points (topology is fixed) */
function ccPlan(Q,nv){
  const nf=Q.length/4,eMap=new Map(),eF=[],eV=[],vF=Array.from({length:nv},()=>[]),vE=Array.from({length:nv},()=>[]);
  const ek=(a,b)=>a<b?a*65536+b:b*65536+a;
  const fe=new Uint32Array(nf*4);
  for(let f=0;f<nf;f++)for(let k=0;k<4;k++){const a=Q[f*4+k],b=Q[f*4+(k+1)%4],key=ek(a,b);let e=eMap.get(key);
    if(e===undefined){e=eV.length;eMap.set(key,e);eV.push([a,b]);eF.push([]);vE[a].push(e);vE[b].push(e);}eF[e].push(f);fe[f*4+k]=e;vF[a].push(f);}
  const ne=eV.length,rows=[];
  const add=(m,i,w)=>m.set(i,(m.get(i)||0)+w);
  for(let v=0;v<nv;v++){const m=new Map(),E=vE[v],bnd=E.filter(e=>eF[e].length<2);
    if(!E.length){m.set(v,1);}
    else if(bnd.length>=2){add(m,v,0.75);for(const e of bnd.slice(0,2)){const o=eV[e][0]===v?eV[e][1]:eV[e][0];add(m,o,0.125);}}
    else{const n=E.length,Fs=vF[v];
      for(const f of Fs)for(let k=0;k<4;k++)add(m,Q[f*4+k],0.25/Fs.length/n);
      for(const e of E){add(m,eV[e][0],1/n/n);add(m,eV[e][1],1/n/n);}
      add(m,v,(n-3)/n);}
    rows.push(m);}
  for(let f=0;f<nf;f++){const m=new Map();for(let k=0;k<4;k++)add(m,Q[f*4+k],0.25);rows.push(m);}
  for(let e=0;e<ne;e++){const m=new Map(),[a,b]=eV[e],F2=eF[e];
    if(F2.length<2){add(m,a,0.5);add(m,b,0.5);}
    else{add(m,a,0.25);add(m,b,0.25);for(const f of F2)for(let k=0;k<4;k++)add(m,Q[f*4+k],0.0625);}
    rows.push(m);}
  let nnz=0;for(const m of rows)nnz+=m.size;
  const off=new Uint32Array(rows.length+1),src=new Uint32Array(nnz),w=new Float32Array(nnz);let p=0;
  rows.forEach((m,i)=>{off[i]=p;for(const[s,ww] of m){src[p]=s;w[p]=ww;p++;}});off[rows.length]=p;
  const ix=new Uint32Array(nf*24);let t=0;
  for(let f=0;f<nf;f++){const fp=nv+f;for(let k=0;k<4;k++){const v=Q[f*4+k],e1=nv+nf+fe[f*4+k],e0=nv+nf+fe[f*4+(k+3)%4];
    ix[t++]=v;ix[t++]=e1;ix[t++]=fp;ix[t++]=v;ix[t++]=fp;ix[t++]=e0;}}
  return{off,src,w,n:rows.length,ix};
}
function ccApply(plan,P){const n=plan.n,out=new Float32Array(n*3),{off,src,w}=plan;
  for(let i=0;i<n;i++){let x=0,y=0,z=0;for(let k=off[i];k<off[i+1];k++){const s=src[k]*3,ww=w[k];x+=P[s]*ww;y+=P[s+1]*ww;z+=P[s+2]*ww;}out[i*3]=x;out[i*3+1]=y;out[i*3+2]=z;}return out;}
function mhPlan(feet){
  const B=mhBase(),key=feet?'f':'n';if(B.sub[key])return B.sub[key];
  let Q=B.Q;
  if(!feet){const keep=[];for(let f=0;f<Q.length/4;f++){let s=0;for(let k=0;k<4;k++)s+=B.footw[Q[f*4+k]];if(s/4<0.55)keep.push(Q[f*4],Q[f*4+1],Q[f*4+2],Q[f*4+3]);}Q=Uint32Array.from(keep);}
  return B.sub[key]=ccPlan(Q,B.nv);
}
/* =============== measurement helpers =============== */
function smoothArr(arr,passes=3,rad=2){for(let p=0;p<passes;p++){const c=arr.map(v=>typeof v==='number'?v:Object.assign({},v));for(let i=0;i<arr.length;i++){let w=0,acc=null;for(let j=-rad;j<=rad;j++){const q=clamp(i+j,0,arr.length-1),ww=rad+1-Math.abs(j),v=c[q];w+=ww;
  if(typeof v==='number')acc=(acc||0)+v*ww;else{acc=acc||{rx:0,rz:0,rzb:0,n:0};acc.rx+=v.rx*ww;acc.rz+=v.rz*ww;acc.rzb+=v.rzb*ww;acc.n+=v.n*ww;}}
  if(typeof acc==='number')arr[i]=Math.max(acc/w,typeof c[i]==='number'?c[i]*0.985:0);else arr[i]={rx:Math.max(acc.rx/w,c[i].rx*0.99),rz:Math.max(acc.rz/w,c[i].rz*0.99),rzb:Math.max(acc.rzb/w,c[i].rzb*0.99),n:acc.n/w};}}return arr;}
function table(y0,step,arr,passes=3){smoothArr(arr,passes);const n=arr.length;return y=>{const f=clamp((y-y0)/step,0,n-1-1e-6),i=Math.floor(f),t=f-i,a=arr[i],b=arr[i+1];
  return typeof a==='number'?a+(b-a)*t:{rx:a.rx+(b.rx-a.rx)*t,rz:a.rz+(b.rz-a.rz)*t,rzb:a.rzb+(b.rzb-a.rzb)*t,n:a.n+(b.n-a.n)*t};};}
/* smallest rounded superellipse (n<=2.6) around a set of xz points */
function fitPts(pts,mirror){
  if(!pts.length)return{rx:0.01,rz:0.01,rzb:0.01,n:2,r:0.01};
  let rx=1e-3,rz=1e-3,rzb=1e-3;for(const[x,z] of pts){rx=Math.max(rx,Math.abs(x));if(z>0)rz=Math.max(rz,z);else rzb=Math.max(rzb,-z);}
  let best=null;for(const[nn,g] of [[2,3.14],[2.2,3.26],[2.4,3.36],[2.6,3.44]]){let k=1;for(const[x,z] of pts)k=Math.max(k,Math.pow(Math.pow(Math.abs(x)/rx,nn)+Math.pow(Math.abs(z)/(z>0?rz:rzb),nn),1/nn));
    const area=k*k*rx*(rz+rzb)*g;if(!best||area<best.area)best={area,k,n:nn};}
  rx*=best.k;rz*=best.k;rzb*=best.k;return{rx,rz,rzb,n:best.n,r:Math.max(rx,rz,rzb)};
}
const MODEL_CACHE={core:new Map()};
function cacheGet(kind,key,make){const m=MODEL_CACHE[kind];if(m.has(key)){const v=m.get(key);m.delete(key);m.set(key,v);return v;}
  const v=make();m.set(key,v);while(m.size>6){const k0=m.keys().next().value,o=m.get(k0);m.delete(k0);if(o&&o.dispose)o.dispose();}return v;}
/* toe-down rotation so the ball of the foot reaches the footbed when wearing heels */
function footPitch(hh,ay=0.08,dz=0.14){if(hh<=0)return 0;let lo=0,hi=1.2;for(let i=0;i<30;i++){const a=(lo+hi)/2,y=-ay*Math.cos(a)-dz*Math.sin(a);if(y>-ay-hh)lo=a;else hi=a;}return(lo+hi)/2;}
/* =============== reshaping =============== */
/* returns deformed control points + joints for the current sliders */
/* body type: muscle and fat (-1..1, a little past 1 allowed) blend the MakeHuman macro shapes (real body types, not scaling) */
function mhMorph(g,mus,fat){const B=mhBase(),M=B[g],key=g+r3(mus)+'|'+r3(fat);B.morph=B.morph||new Map();if(B.morph.has(key))return B.morph.get(key);
  /* past muscle 1.0 the most muscular MakeHuman shape blends into a bodybuilder one (lean, bigger chest, lats, shoulders,
     arms and legs; tools/mh 'mx') instead of extrapolating the delta, which turned lumpy, like plasticine */
  const wx=M.d.mx&&mus>1?clamp((mus-1)/0.5,0,1.2):0;
  const P=M.pos.slice(),J={},ws=wx?[['mp',1-wx],['mx',wx],[fat>0?'wp':'wn',Math.min(1,Math.abs(fat))]]:[[mus>0?'mp':'mn',mus>1?1+(mus-1)*0.55:Math.abs(mus)],[fat>0?'wp':'wn',Math.min(1,Math.abs(fat))]];
  for(const[k,w] of ws){const d=M.d[k];if(!d||!w)continue;for(let i=0;i<P.length;i++)P[i]+=d[i]*w;}
  /* muscular and heavy at once: a little extra volume the two shapes alone miss */
  if(mus>0&&fat>0&&M.d.wp){const w=0.25*Math.min(mus,fat);for(let i=0;i<P.length;i++)P[i]+=M.d.wp[i]*w;}
  /* past the heaviest MakeHuman shape: more volume everywhere fat is stored (belly and trunk most, thighs, upper arms, neck; not hands, feet or the head) */
  if(fat>1){const f=fat-1,Q=B.Q,nv=B.nv,N=new Float32Array(nv*3),fem=g==='f';
    for(let q=0;q<Q.length;q+=4){const a=Q[q],b=Q[q+1],c=Q[q+2],d=Q[q+3];const ux=P[c*3]-P[a*3],uy=P[c*3+1]-P[a*3+1],uz=P[c*3+2]-P[a*3+2],vx=P[d*3]-P[b*3],vy=P[d*3+1]-P[b*3+1],vz=P[d*3+2]-P[b*3+2];
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const k of [a,b,c,d]){N[k*3]+=nx;N[k*3+1]+=ny;N[k*3+2]+=nz;}}
    const Dsp=new Float32Array(nv);
    for(let i=0;i<nv;i++){const x=P[i*3],y=P[i*3+1],z=P[i*3+2],aw=B.armw[i],lw=B.legw[i],fw=B.footw[i];
      const trunk=Math.max(0,1-aw-lw),nl=Math.hypot(N[i*3],N[i*3+1],N[i*3+2])||1,nz=N[i*3+2]/nl;
      /* trunk: thick at the belly and lower back, thinner up to the chest and neck */
      let t=trunk*(0.022+0.022*smooth((1.45-y)/0.35))*(1-0.6*smooth((y-1.45)/0.12))*(1-smooth((y-1.6)/0.08));
      t+=trunk*Math.max(0,nz)*(fem?0.012:0.03)*gauss(y-1.08,0.11);
      if(fem)t+=trunk*0.008*gauss(y-1.27,0.06)*Math.max(0,nz);
      /* limbs: thighs and upper arms, less towards knees, elbows; nothing on hands and feet */
      const legT=lw*(fem?0.026:0.02)*smooth((y-0.45)/0.35)+lw*0.008*(1-smooth((y-0.45)/0.35));
      const armT=aw*0.016*smooth((y-1.12)/0.18)+aw*0.006*(1-smooth((y-1.12)/0.18));
      Dsp[i]=(t+legT*(1-fw)+armT*(1-smooth((Math.abs(x)-0.62)/0.05)))*f;}
    /* smooth the thickness so seams between regions do not show */
    const nb=Array.from({length:nv},()=>[]);for(let q=0;q<Q.length;q+=4)for(let k=0;k<4;k++){nb[Q[q+k]].push(Q[q+(k+1)%4]);nb[Q[q+(k+1)%4]].push(Q[q+k]);}
    for(let it=0;it<6;it++){const d0=Dsp.slice();for(let i=0;i<nv;i++){if(!nb[i].length)continue;let s2=d0[i];for(const j of nb[i])s2+=d0[j];Dsp[i]=s2/(nb[i].length+1);}}
    for(let i=0;i<nv;i++){const nl=Math.hypot(N[i*3],N[i*3+1],N[i*3+2])||1;P[i*3]+=N[i*3]/nl*Dsp[i];P[i*3+1]+=N[i*3+1]/nl*Dsp[i]*0.5;P[i*3+2]+=N[i*3+2]/nl*Dsp[i];}}
  for(const[k,v] of Object.entries(M.J)){const o=v.slice();for(const[kk,w] of ws){const dj=M.dj[kk]&&M.dj[kk][k];if(dj&&w)for(let c=0;c<3;c++)o[c]+=dj[c]*w;}J[k]=o;}
  limbFill(P,B,J,mus,fat,g==='f');
  const out={pos:P,J};B.morph.set(key,out);if(B.morph.size>8)B.morph.delete(B.morph.keys().next().value);return out;}
/* MakeHuman's big shapes add their mass to the thighs and the upper arms but not round the knee or along the forearm:
   a strongman's thigh narrowed into a pinched, hollow-fronted knee and his forearms stayed thin. Muscle and fat fill the
   lower thigh above the knee (the vastus medialis teardrop, front and inside, not the back of the knee) and the forearm
   (the flexor / brachioradialis bellies below the elbow, tapering to the wrist), smoothed over the mesh */
function limbFill(P,B,J,mus,fat,fem){const kM=clamp((mus-0.5)/0.8,0,1.2),kF=clamp(fat-0.3,0,1.6);if(kM<0.02&&kF<0.02)return;
  const nv=B.nv,Q=B.Q,N=new Float32Array(nv*3),D=new Float32Array(nv);
  for(let q=0;q<Q.length;q+=4){const a=Q[q],b=Q[q+1],c=Q[q+2],d=Q[q+3];const ux=P[c*3]-P[a*3],uy=P[c*3+1]-P[a*3+1],uz=P[c*3+2]-P[a*3+2],vx=P[d*3]-P[b*3],vy=P[d*3+1]-P[b*3+1],vz=P[d*3+2]-P[b*3+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const k of [a,b,c,d]){N[k*3]+=nx;N[k*3+1]+=ny;N[k*3+2]+=nz;}}
  const kY=J.kneeL[1],E=J.elL,Wr=J.wrL,ex=Wr[0]-E[0],ey=Wr[1]-E[1],ez=Wr[2]-E[2],el2=ex*ex+ey*ey+ez*ez,f=fem?0.7:1;
  for(let i=0;i<nv;i++){const x=P[i*3],y=P[i*3+1],z=P[i*3+2],nl=Math.hypot(N[i*3],N[i*3+1],N[i*3+2])||1,nx=N[i*3]/nl,nz=N[i*3+2]/nl,sd=x>=0?1:-1;
    if(B.legw[i]>0.6&&B.footw[i]<0.3){const u=y-kY;if(u<-0.12||u>0.22)continue;
      /* round the knee and just above it: front most, inside, a little outside (the medial side faces the other leg) */
      const face=clamp(0.7*Math.max(0,nz)+0.6*Math.max(0,-sd*nx)+0.35*Math.max(0,sd*nx),0,1)*(1-smooth((-nz-0.2)/0.4));
      D[i]=f*(0.018*kM+0.015*kF)*gauss(u-0.035,0.075)*face;}
    else if(B.armw[i]>0.6){const px=sd*x-E[0],py=y-E[1],pz=z-E[2],t=(px*ex+py*ey+pz*ez)/el2;if(t<-0.05||t>1)continue;
      D[i]=f*(0.016*kM*gauss(t-0.27,0.17)+0.006*kF*gauss(t-0.3,0.3))*smooth((t+0.05)/0.1)*smooth((0.95-t)/0.12);}}
  const nb=Array.from({length:nv},()=>[]);for(let q=0;q<Q.length;q+=4)for(let k=0;k<4;k++){nb[Q[q+k]].push(Q[q+(k+1)%4]);nb[Q[q+(k+1)%4]].push(Q[q+k]);}
  for(let it=0;it<3;it++){const d0=D.slice();for(let i=0;i<nv;i++){if(!nb[i].length||(B.legw[i]<0.3&&B.armw[i]<0.3))continue;let s2=d0[i];for(const j of nb[i])s2+=d0[j];D[i]=s2/(nb[i].length+1);}}
  for(let i=0;i<nv;i++){if(!D[i])continue;const nl=Math.hypot(N[i*3],N[i*3+1],N[i*3+2])||1;P[i*3]+=N[i*3]/nl*D[i];P[i*3+1]+=N[i*3+1]/nl*D[i]*0.3;P[i*3+2]+=N[i*3+2]/nl*D[i];}}
function mhShape(g,F,b){
  const B=mhBase(),MM=mhMorph(g,BC.mus||0,BC.fat||0),P0=MM.pos,nv=B.nv,J=MM.J,P=new Float32Array(nv*3),fem=g==='f';
  const sh0=J.shL,wr0=J.wrL,el0=J.elL,hip0=J.hipL;
  const shX=sh0[0]*Math.pow(b,0.55)*Math.pow(F.shoulders,1.1),dSh=shX-sh0[0];
  const legX0=(hip0[0]+J.kneeL[0])/2,legX=legX0*Math.pow(b,0.5)*(1+(F.hips-1)*0.45),dLeg=legX-legX0;
  const thick=Math.pow(b,0.75),legK=Math.pow(b,0.8)*(1+(F.hips-1)*0.25*0);
  const ad=V3(wr0[0]-sh0[0],wr0[1]-sh0[1],wr0[2]-sh0[2]).normalize();
  /* bigger lats, arms and hips push the arms away from the body */
  let abd=(3.2*Math.min(1,Math.max(0,BC.fat||0))+5*Math.max(0,(BC.fat||0)-1)+2.6*Math.max(0,(BC.mus||0)-0.4))*Math.PI/180,abC=Math.cos(abd),abS=Math.sin(abd);
  const hipY=hip0[1],chestY=fem?1.3:1.29,waistY=fem?1.1:1.08,armLen=Math.hypot(wr0[0]-sh0[0],wr0[1]-sh0[1],wr0[2]-sh0[2]);
  /* the hands never sink into the hips or thighs (wide hips, a full seat, big thighs): the arms are built, the gap between
     each hand and the body beside it measured, and the arms swung out just enough (a few passes) */
  for(let pass=0;pass<4;pass++){
  for(let i=0;i<nv;i++){
    const x=P0[i*3],y=P0[i*3+1],z=P0[i*3+2],aw=B.armw[i],lw=B.legw[i],tw=Math.max(0,1-aw-lw),sd=x>=0?1:-1;
    /* trunk */
    const wH=gauss(y-(hipY-0.06),0.09),wW=gauss(y-waistY,0.07),wC=gauss(y-chestY,0.075),wS=gauss(y-1.41,0.055),wN=smooth((y-1.47)/0.04),nk=1+(F.neckW-1)*wN,bt=lerp(Math.pow(b,1.1),1,wN*0.6);
    const fx=(1+(F.hips-1)*wH+(F.waist-1)*wW+(F.chest-1)*wC*0.45+(F.shoulders-1)*wS*0.9)*nk*bt;
    const fzF=(1+(F.hips-1)*wH*0.5+(F.waist-1)*wW+(F.chest-1)*wC*(fem?1.2:1))*nk*bt,fzB=(1+(F.hips-1)*wH*1.1+(F.waist-1)*wW*0.6+(F.chest-1)*wC*0.3)*nk*bt;
    let tx=x*fx,tz=z*(z>0?fzF:fzB);
    /* the bust sits higher and closer together than the base mesh has it (it hung low and pointed outwards) */
    /* (no lift any more: moving the bust up squeezed the fold under it into a hard shelf - the firmer MakeHuman bust in the
       recipe sits higher on its own) */
    let bl=0;if(fem&&z>0){bl=gauss(y-1.24,0.1)*gauss(Math.abs(x)-0.09,0.085)*smooth((z-0.02)/0.06);tx-=sd*0.006*bl;}
    /* mannequin neck: lift the throat so the neck rises straight into the egg head */
    const yN=y+(fem?0.06:0.07)*smooth((y-1.49)/0.08)*clamp((z+0.02)/0.12,0,1);
    /* legs: move with the hip joint, thicken around the leg axis */
    const lx=sd*(legX+(Math.abs(x)-legX0)*legK*(1+(F.hips-1)*0.35*smooth((y-0.6)/0.3))),lz=z*legK*(1+(F.hips-1)*0.3*smooth((y-0.6)/0.3)*(z<0?1:0.4));
    /* arms: follow the shoulder, scale along the bone */
    const qx=sd*x-sh0[0],qy=y-sh0[1],qz=z-sh0[2],ax=ad.x,ay=ad.y,az=ad.z,along=qx*ax+qy*ay+qz*az,px=qx-ax*along,py=qy-ay*along,pz=qz-az*along;
    const ak=F.arms,ath=thick*(fem?0.97:1);
    let ax0=ax*along*ak+px*ath,ay0=ay*along*ak+py*ath;{const xr=ax0*abC-ay0*abS,yr=ax0*abS+ay0*abC;ax0=xr;ay0=yr;}
    const arx=sd*(sh0[0]+dSh+ax0),ary=sh0[1]+ay0,arz=sh0[2]+az*along*ak+pz*ath;
    const s=tw+lw+aw||1;
    P[i*3]=(tx*tw+lx*lw+arx*aw)/s;P[i*3+1]=(yN*tw+y*lw+ary*aw)/s;P[i*3+2]=(tz*tw+lz*lw+arz*aw)/s;
  }
  {const BW=0.01,bins=new Map(),key=(sd,y,z)=>sd+'|'+Math.round(y/BW)+'|'+Math.round(z/BW);
    for(let i=0;i<nv;i++){if(B.armw[i]>0.2)continue;const x=P[i*3],sd=x>=0?1:-1,k=key(sd,P[i*3+1],P[i*3+2]),v=sd*x;if(!(bins.get(k)>=v))bins.set(k,v);}
    /* the hand is built separately (body.js) from the finger joints: test the wrist, palm and finger joints (left side; the
       body is symmetric) with the finger radius */
    let worst=0,yh=0;const hp=[J.wrL];for(let f=2;f<=5;f++)for(const k of ['f'+f+'1L','f'+f+'1tL','f'+f+'2tL'])if(J[k])hp.push(J[k]);
    for(const q of hp.slice()){if(q!==J.wrL&&J['f'+'3'+'1L'])hp.push([(q[0]+J.wrL[0])/2,(q[1]+J.wrL[1])/2,(q[2]+J.wrL[2])/2]);}
    for(const q of hp){const qx=q[0]-sh0[0],qy=q[1]-sh0[1],qz=q[2]-sh0[2],al=qx*ad.x+qy*ad.y+qz*ad.z;let x0=ad.x*al*F.arms+(qx-ad.x*al)*thick,y0=ad.y*al*F.arms+(qy-ad.y*al)*thick;
      const xr=x0*abC-y0*abS,yr=x0*abS+y0*abC,x=sh0[0]+dSh+xr,y=sh0[1]+yr,z=sh0[2]+ad.z*al*F.arms+(qz-ad.z*al)*thick;
      let bx=-9;for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){const v=bins.get('1|'+(Math.round(y/BW)+dy)+'|'+(Math.round(z/BW)+dz));if(v!=null&&v>bx)bx=v;}
      if(bx<-8)continue;const d=0.0085+0.004-(x-bx);if(d>worst){worst=d;yh=y;}}
    for(let i=0;i<nv;i++){if(B.armw[i]<0.9)continue;const x0=P0[i*3],sd=x0>=0?1:-1,al=(sd*x0-sh0[0])*ad.x+(P0[i*3+1]-sh0[1])*ad.y+(P0[i*3+2]-sh0[2])*ad.z;if(al<armLen*0.93)continue;
      const x=P[i*3],y=P[i*3+1],z=P[i*3+2];let bx=-9;for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){const v=bins.get(sd+'|'+(Math.round(y/BW)+dy)+'|'+(Math.round(z/BW)+dz));if(v!=null&&v>bx)bx=v;}
      if(bx<-8)continue;const d=0.008-(sd*x-bx);if(d>worst){worst=d;yh=y;}}
    if(worst<=0.0005)break;abd+=worst/Math.max(0.3,sh0[1]-yh)*1.05;abC=Math.cos(abd);abS=Math.sin(abd);}
  }
  /* mannequin feet a touch longer than the base mesh (it was made for a shorter figure) */
  {const A=J.ankL,fk=fem?1.05:1.09,fw=fem?1.02:1.04;for(let i=0;i<nv;i++){const w=B.footw[i];if(w<=0)continue;const sd=P[i*3]>=0?1:-1,ax=sd*A[0];
    P[i*3]=lerp(P[i*3],ax+(P[i*3]-ax)*fw,w);P[i*3+2]=lerp(P[i*3+2],A[2]+(P[i*3+2]-A[2])*fk,w);}}
  const armJ=p=>{const qx=p[0]-sh0[0],qy=p[1]-sh0[1],qz=p[2]-sh0[2],al=qx*ad.x+qy*ad.y+qz*ad.z;
    let x0=ad.x*al*F.arms+(qx-ad.x*al)*thick,y0=ad.y*al*F.arms+(qy-ad.y*al)*thick;const xr=x0*abC-y0*abS,yr=x0*abS+y0*abC;
    return V3(sh0[0]+dSh+xr,sh0[1]+yr,sh0[2]+ad.z*al*F.arms+(qz-ad.z*al)*thick);};
  return{P,legX,shX,armJ};
}
/* foot pitch for heels, applied on the control mesh */
function mhPitch(P,A,alpha){
  if(!alpha)return;const B=mhBase(),ay=A.y,az=A.z,c=Math.cos(alpha),s=Math.sin(alpha);
  for(let i=0;i<B.nv;i++){const w=B.footw[i];if(w<=0)continue;const y=P[i*3+1]-ay,z=P[i*3+2]-az,ny=y*c-z*s,nz=y*s+z*c;
    P[i*3+1]=lerp(P[i*3+1],ay+ny,w);P[i*3+2]=lerp(P[i*3+2],az+nz,w);
    /* toes bend flat on the footbed instead of pointing into the floor */
    if(BC.footFloor!=null&&P[i*3+1]<BC.footFloor){const d=BC.footFloor-P[i*3+1];P[i*3+1]=BC.footFloor-d*0.12;P[i*3+2]+=d*0.6*w;}}
}
/* second smoothing step for the high quality mode */
function mhPlan2(feet){const B=mhBase(),key=(feet?'f':'n')+'2';if(B.sub[key])return B.sub[key];const p=mhPlan(feet),ix=p.ix,Q=new Uint32Array(ix.length/6*4);
  for(let i=0,q=0;i<ix.length;i+=6){Q[q++]=ix[i];Q[q++]=ix[i+1];Q[q++]=ix[i+2];Q[q++]=ix[i+5];}return B.sub[key]=ccPlan(Q,p.n);}
let SPOTS_TMP=null;
/* adjacency of a smoothing plan's output mesh (cached on the plan) */
function planAdj(plan){if(plan.adj)return plan.adj;const n=plan.n,ix=plan.ix,nb=Array.from({length:n},()=>new Set());for(let t=0;t<ix.length;t+=3)for(let k=0;k<3;k++){const a=ix[t+k],b=ix[t+(k+1)%3];nb[a].add(b);nb[b].add(a);}
  const off=new Uint32Array(n+1);for(let i=0;i<n;i++)off[i+1]=off[i]+nb[i].size;const adj=new Uint32Array(off[n]);for(let i=0;i<n;i++){let k=off[i];for(const j of nb[i])adj[k++]=j;}return plan.adj={off,adj};}
/* display mannequin: no nipples or navel - relax those spots on the final dense surface */
/* volume-preserving (Taubin) smoothing of a dense surface: removes features under ~1-2 cm */
function taubin(R,plan,its){const{off,adj}=planAdj(plan),n=plan.n,out=R.slice(),tmp=new Float32Array(n*3);
  for(let it=0;it<its;it++)for(const lam of [0.6,-0.63]){for(let i=0;i<n;i++){const m=off[i+1]-off[i];if(!m){tmp[i*3]=out[i*3];tmp[i*3+1]=out[i*3+1];tmp[i*3+2]=out[i*3+2];continue;}let sx=0,sy=0,sz=0;for(let k=off[i];k<off[i+1];k++){const j=adj[k];sx+=out[j*3];sy+=out[j*3+1];sz+=out[j*3+2];}
    tmp[i*3]=out[i*3]+lam*(sx/m-out[i*3]);tmp[i*3+1]=out[i*3+1]+lam*(sy/m-out[i*3+1]);tmp[i*3+2]=out[i*3+2]+lam*(sz/m-out[i*3+2]);}out.set(tmp);}
  return out;}
/* Taubin smoothing of only the vertices near some points (everything else stays fixed) */
function taubinNear(R,plan,its,pts,rad){const{off,adj}=planAdj(plan),n=plan.n,ids=[],inn=new Uint8Array(n);
  for(let i=0;i<n;i++){for(const p of pts){const dx=R[i*3]-p[0],dy=R[i*3+1]-p[1],dz=R[i*3+2]-p[2];if(dx*dx+dy*dy+dz*dz<rad*rad){inn[i]=1;ids.push(i);break;}}}
  const out=R.slice(),tmp=new Float32Array(ids.length*3);
  for(let it=0;it<its;it++)for(const lam of [0.6,-0.63]){ids.forEach((i,q)=>{const m=off[i+1]-off[i];let sx=0,sy=0,sz=0;for(let k=off[i];k<off[i+1];k++){const j=adj[k];sx+=out[j*3];sy+=out[j*3+1];sz+=out[j*3+2];}
      tmp[q*3]=out[i*3]+lam*(sx/m-out[i*3]);tmp[q*3+1]=out[i*3+1]+lam*(sy/m-out[i*3+1]);tmp[q*3+2]=out[i*3+2]+lam*(sz/m-out[i*3+2]);});
    ids.forEach((i,q)=>{out[i*3]=tmp[q*3];out[i*3+1]=tmp[q*3+1];out[i*3+2]=tmp[q*3+2];});}
  return out;}
function smoothSpots(R,plan,spots){if(!spots||!spots.length)return;const n=plan.n,Sm=taubinNear(R,plan,n>60000?40:14,spots,Math.max(...spots.map(s=>s[3]))*2.2);
  for(const[cx,cy,cz,rad] of spots)for(let i=0;i<n;i++){const d=Math.hypot(R[i*3]-cx,R[i*3+1]-cy,R[i*3+2]-cz);if(d>=rad)continue;const w=1-smooth(d/rad);
    R[i*3]=lerp(R[i*3],Sm[i*3],w);R[i*3+1]=lerp(R[i*3+1],Sm[i*3+1],w);R[i*3+2]=lerp(R[i*3+2],Sm[i*3+2],w);}
  /* breast / pec tips: a mannequin has a rounded tip, not a point (tight fabric would show it) - local plain Laplacian over a wider area */
  const tips=spots.slice(0,2);if(tips.length){const{off,adj}=planAdj(plan),wt=new Float32Array(n),ids=[];
    for(let i=0;i<n;i++){let w=0;for(const[cx,cy,cz,rad] of tips){const d=Math.hypot(R[i*3]-cx,R[i*3+1]-cy,R[i*3+2]-cz),r1=rad*1.7;if(d<r1)w=Math.max(w,1-smooth(d/r1));}if(w>0){wt[i]=w;ids.push(i);}}
    const tmp=new Float32Array(n*3);for(let it=0,K=n>60000?50:16;it<K;it++){for(const i of ids){const m=off[i+1]-off[i];let sx=0,sy=0,sz=0;for(let k=off[i];k<off[i+1];k++){const j=adj[k];sx+=R[j*3];sy+=R[j*3+1];sz+=R[j*3+2];}const l=0.5*wt[i];
      tmp[i*3]=R[i*3]+l*(sx/m-R[i*3]);tmp[i*3+1]=R[i*3+1]+l*(sy/m-R[i*3+1]);tmp[i*3+2]=R[i*3+2]+l*(sz/m-R[i*3+2]);}for(const i of ids){R[i*3]=tmp[i*3];R[i*3+1]=tmp[i*3+1];R[i*3+2]=tmp[i*3+2];}}}}
/* the nipple / navel poles of the base mesh are rings of tiny faces that shade like a bump: give them the area's average normal */
function spotNormals(geo,spots){if(!spots)return;const p=geo.attributes.position,nr=geo.attributes.normal,n=p.count;
  for(const[cx,cy,cz,rad] of spots){const ids=[];let ax=0,ay=0,az=0;for(let i=0;i<n;i++){const d=Math.hypot(p.getX(i)-cx,p.getY(i)-cy,p.getZ(i)-cz);if(d<rad*1.3){ids.push([i,d]);if(d<rad){ax+=nr.getX(i);ay+=nr.getY(i);az+=nr.getZ(i);}}}
    const l=Math.hypot(ax,ay,az);if(!l)continue;ax/=l;ay/=l;az/=l;
    for(const[i,d] of ids){const w=1-smooth(d/(rad*1.3));let x=lerp(nr.getX(i),ax,w),y=lerp(nr.getY(i),ay,w),z=lerp(nr.getZ(i),az,w);const m=Math.hypot(x,y,z)||1;nr.setXYZ(i,x/m,y/m,z/m);}}}
/* the top of the neck widens smoothly into the underside of the egg head, like a carved mannequin (no crease) */
/* the neck ends in a clean ring a little under the head; a separate smooth strip (buildBody: neckLoftPt) runs from that
   ring up into the skull - low on the occiput at the back and the sides, under the chin at the front. The scan's own
   ragged neck top (lumps at the ear roots, a zigzag cut) is folded away inside it. Returns the ring for the strip. */
function neckFlare(R,n){if(!BC.headC||!BC.hd)return null;
  const c=BC.headC,ry=BC.hd.ry,yS=c.y-ry-0.03,yA=yS-0.03;
  const ctr=yy=>{let x=0,z=0,k=0;for(let i=0;i<n;i++){if(Math.abs(R[i*3+1]-yy)<0.005&&Math.abs(R[i*3])<0.11){x+=R[i*3];z+=R[i*3+2];k++;}}return k<8?null:[x/k,z/k];};
  const C0=ctr(yS),C1=ctr(yS-0.03);if(!C0)return null;const cx=C0[0],cz=C0[1];
  /* the neck leans forward: the strip leaves the ring along the neck's own axis (no kink at the throat or the nape) */
  const ax=C1?[(C0[0]-C1[0])/0.03,1,(C0[1]-C1[1])/0.03]:[0,1,0];
  /* mean radius per direction (a max picked single protruding vertices and left lumps) */
  const RG=new Float32Array(72),RC=new Float32Array(72);for(let i=0;i<n;i++){if(Math.abs(R[i*3+1]-yS)>0.007||Math.abs(R[i*3])>0.11)continue;const a=Math.atan2(R[i*3+2]-cz,R[i*3]-cx),b=((Math.round(a/TAU*72)%72)+72)%72,r=Math.hypot(R[i*3]-cx,R[i*3+2]-cz);RG[b]+=r;RC[b]++;}
  for(let b=0;b<72;b++)RG[b]=RC[b]?RG[b]/RC[b]:0;
  for(let it=0;it<6;it++){const o=RG.slice();for(let b=0;b<72;b++){const a=o[(b+71)%72],m=o[b],d=o[(b+1)%72];RG[b]=m?(a&&d?(a+2*m+d)/4:m):Math.max(a,d);}}
  const NL={cx,cz,y:yS,RG:Array.from(RG),ax},ring=a=>neckRingR(NL,a),cut=new Uint8Array(n),yC=yS-0.004;
  for(let i=0;i<n;i++){const y=R[i*3+1];if(y<yA||Math.abs(R[i*3])>0.13)continue;
    /* below the ring: eased onto a clean tube along the neck axis (the strip starts there, tangent to it); the rest is cut off */
    const ox=cx+ax[0]*(Math.min(y,yS)-yS),oz=cz+ax[2]*(Math.min(y,yS)-yS),x=R[i*3],z=R[i*3+2],dx=x-ox,dz=z-oz,r=Math.hypot(dx,dz)||1e-6,a=Math.atan2(dz,dx),rr=ring(a);
    if(y<yC){const r2=lerp(r,rr,smooth((y-yA)/(yC-yA)));R[i*3]=ox+dx/r*r2;R[i*3+2]=oz+dz/r*r2;}
    else{R[i*3]=cx+Math.cos(a)*rr;R[i*3+1]=yS;R[i*3+2]=cz+Math.sin(a)*rr;cut[i]=1;}}
  NL.cut=cut;return NL;}
function neckRingR(NL,a){const f=(((a/TAU*72)%72)+72)%72,i=Math.floor(f)%72;return lerp(NL.RG[i],NL.RG[(i+1)%72],f-Math.floor(f));}
/* the back of the knee and thigh: the MakeHuman legs (more so muscular ones) step out 2 cm at the back of the thigh a
   hand above the knee and cut a 2-2.5 cm hollow above the calf, so in profile the back of the thigh stood out like a
   wing (a goat's leg). The back outline of each leg from the calf to below the seat is drawn most of the way to its own smoothed version (bulge down, hollow filled),
   on the back half of the leg only (on the dense render mesh): a smooth taper from the thigh into the calf */
function poplitealFill(P,nv,W,kneeY){const DY=0.015,yA=kneeY-0.26,NB=Math.ceil(0.7/DY)+1,lo=kneeY-0.15,hi=kneeY+0.28,Dz=new Float32Array(nv);
  for(const sd of [-1,1]){const zmin=new Float32Array(NB).fill(9),zsum=new Float32Array(NB),cnt=new Float32Array(NB),idx=[];
    for(let i=0;i<nv;i++){if(W[i*3+1]<0.6||W[i*3+2]>0.3||sd*P[i*3]<0.02)continue;const b=Math.round((P[i*3+1]-yA)/DY);if(b<0||b>=NB)continue;
      idx.push(i);const z=P[i*3+2];if(z<zmin[b])zmin[b]=z;zsum[b]+=z;cnt[b]++;}
    /* the outline: the furthest-back point of each row and its neighbours (a thin row may miss the back), empty rows
       filled from the nearest measured one */
    const prof=new Float32Array(NB);for(let b=0;b<NB;b++){let m=9;for(let k=-1;k<=1;k++){const q=b+k;if(q>=0&&q<NB&&cnt[q]&&zmin[q]<m)m=zmin[q];}prof[b]=m;}
    for(let b=1;b<NB;b++)if(prof[b]===9)prof[b]=prof[b-1];for(let b=NB-2;b>=0;b--)if(prof[b]===9)prof[b]=prof[b+1];if(prof[0]===9)continue;
    const sm=new Float32Array(NB);for(let b=0;b<NB;b++){let a=0,w=0;for(let k=-12;k<=12;k++){const q=b+k;if(q<0||q>=NB)continue;const ww=Math.exp(-(k*k)/(2*5*5));a+=prof[q]*ww;w+=ww;}sm[b]=a/w;}
    for(const i of idx){const y=P[i*3+1],fb=(y-yA)/DY,b=clamp(Math.floor(fb),0,NB-2),t=fb-b;
      const d=clamp(lerp(sm[b]-prof[b],sm[b+1]-prof[b+1],t)*0.9,-0.018,0.018)*smooth((y-lo)/0.04)*smooth((hi-y)/0.05);if(!d)continue;
      const zc=lerp(zsum[b]/(cnt[b]||1),zsum[b+1]/(cnt[b+1]||1),t),zm=lerp(prof[b],prof[b+1],t),back=smooth(((zc-P[i*3+2])/Math.max(0.01,zc-zm)-0.15)/0.6);
      Dz[i]=d*back;}}
  for(let i=0;i<nv;i++)P[i*3+2]+=Dz[i];}
/* =============== muscle definition ===============
   MakeHuman's most muscular shape carries the mass, but its coarse mesh (and the smoothing) has no definition. On the
   dense render mesh the anatomy is carved in as shallow grooves between the muscles, along their real borders: carving
   only (never outwards), so nothing can poke through tight clothes. Strength: muscle mass minus body fat (fat hides
   definition first on the belly), lighter on women; the average figure is untouched. */
function muscleRelief(R,plan,W){const M=BC.core;if(!M||!M.spots||M.spots.length<3)return;
  const fem=BC.g==='f',mus=BC.mus||0,fat=BC.fat||0;
  const def=1.9*clamp((mus-0.3)/0.85,0,1.25)*(1-smooth((fat+0.05)/0.85))*(fem?0.55:1);if(def<0.04)return;
  const n=plan.n,ix=plan.ix,N=new Float32Array(n*3);
  for(let t=0;t<ix.length;t+=3){const a=ix[t]*3,b=ix[t+1]*3,c=ix[t+2]*3,ux=R[b]-R[a],uy=R[b+1]-R[a+1],uz=R[b+2]-R[a+2],vx=R[c]-R[a],vy=R[c+1]-R[a+1],vz=R[c+2]-R[a+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const k of [a,b,c]){N[k]+=nx;N[k+1]+=ny;N[k+2]+=nz;}}
  const nip=M.spots[1],nav=M.spots[2],yN=nip[1],yV=nav[1],S0=M.S,E0=M.E,W0=M.W,inv=BC.map.inv,yHip=inv(M.J.hipL[1]),yKnee=inv(M.J.kneeL[1]),LX=M.LX;
  /* distance from point (px,py) to segment (ax,ay)-(bx,by), with the position t along it */
  const seg=(px,py,ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy,t=clamp(((px-ax)*dx+(py-ay)*dy)/L2,0,1);return[Math.hypot(px-ax-dx*t,py-ay-dy*t),t];};
  /* soft, wide grooves (a shadow between two muscles, not a cut): at least twice the spacing of the dense mesh */
  const WS=1.8,groove=(d,w,dep,t=0.5)=>{const ww=w*WS;return dep*Math.exp(-(d*d)/(ww*ww))*Math.sin(Math.PI*clamp(t,0,1))**0.35;};
  const yPec=ax=>yN-0.048+0.05*Math.pow(clamp(ax/0.16,0,1.2),2);
  const du=V3(E0.x-S0.x,E0.y-S0.y,E0.z-S0.z),Lu=du.length();du.normalize();
  const df=V3(W0.x-E0.x,W0.y-E0.y,W0.z-E0.z),Lf=df.length();df.normalize();
  for(let i=0;i<n;i++){const x=R[i*3],y=R[i*3+1],z=R[i*3+2],sd=x>=0?1:-1,ax=Math.abs(x),aw=W[i*3],lw=W[i*3+1],fw=W[i*3+2];
    const nl=Math.hypot(N[i*3],N[i*3+1],N[i*3+2])||1,nz=N[i*3+2]/nl,nxs=N[i*3]/nl*sd;let dsp=0;
    const tw=Math.max(0,1-aw-lw);
    if(tw>0.05&&y>yHip-0.12&&y<1.5){const k=tw;
      const front=smooth((nz-0.15)/0.4),back=smooth((-nz-0.15)/0.4);
      if(front>0){let f=0;
        if(!fem){/* lower border of the pecs and the groove between them */
          const yp=yPec(ax);if(ax<0.17&&y<yp+0.03)f+=groove(y-yp,0.011,0.0036*(1-smooth((ax-0.085)/0.07)),1-ax/0.17);
          if(y>yPec(0)-0.005&&y<yN+0.08)f+=groove(ax,0.009,0.0022,(y-yPec(0))/(yN+0.08-yPec(0)));
          /* deltopectoral groove */
          {const[d,t]=seg(ax,y,0.115,S0.y-0.02,0.165,S0.y-0.105);f+=groove(d,0.007,0.0016,t);}}
        /* linea alba, the three tendinous intersections, the lateral borders of the rectus */
        const yTop=fem?yN-0.075:yPec(0)-0.005,yBot=yV-0.085;
        if(y>yBot&&y<yTop)f+=groove(ax,0.0062,0.0021,(y-yBot)/(yTop-yBot));
        for(const[yy,dep] of (fem?[[yV+0.02,0.001],[yV+0.075,0.0011]]:[[yV+0.02,0.0016],[yV+0.075,0.0018],[yV+0.127,0.0018]])){
          if(ax<0.068)f+=groove(y-(yy+0.008*Math.pow(ax/0.06,2)),0.0048,dep,ax/0.068*0.5+0.5);}
        {const xl=lerp(0.047,0.076,smooth((y-(yV-0.09))/0.21));if(y>yV-0.11&&y<yTop+0.01)f+=groove(ax-xl,0.0075,fem?0.0013:0.0023,(y-(yV-0.11))/(yTop+0.01-(yV-0.11)));}
        /* iliac furrow (the "V" above the hips) */
        {const[d,t]=seg(ax,y,0.125,yV-0.045,0.048,yV-0.16);f+=groove(d,0.0085,fem?0.0016:0.0028,t);}
        dsp+=f*front;}
      /* serratus on the ribs under the arm */
      if(!fem&&ax>0.11&&ax<0.18&&nxs>0.2){let f=0;for(let k2=0;k2<3;k2++){const y0=yN-0.045-k2*0.03;const[d,t]=seg(ax,y,0.118,y0+0.018,0.168,y0-0.008);f+=groove(d,0.0055,0.0013,t);}dsp+=f*smooth((nxs-0.2)/0.3);}
      if(back>0){let f=0;
        /* spine between the erectors, deeper at the lower back */
        if(y>yV-0.17&&y<1.46)f+=groove(ax,0.008,lerp(0.003,0.0018,smooth((y-1.15)/0.2)),(y-(yV-0.17))/(1.46-(yV-0.17)));
        /* outer border of the lats and the lower border of the trapezius */
        {const[d,t]=seg(ax,y,0.158,yN+0.03,0.106,yV-0.07);f+=groove(d,0.009,fem?0.0011:0.0021,t);}
        {const[d,t]=seg(ax,y,0.0,yN-0.09,0.095,yN+0.06);f+=groove(d,0.008,fem?0.0008:0.0015,t);}
        dsp+=f*back;}
      dsp*=k;}
    /* upper arm: the "V" of the deltoid insertion, biceps/triceps grooves on both sides */
    if(aw>0.4&&aw*(1-fw)>0.4){const qx=sd*x-S0.x,qy=y-S0.y,qz=z-S0.z,al=qx*du.x+qy*du.y+qz*du.z,t=al/Lu;
      if(t>0.03&&t<0.98){const px=qx-du.x*al,py=qy-du.y*al,pz=qz-du.z*al;
        /* angle around the arm: 0 lateral, +90 front, -90 back */
        const lx=V3(1,0,0).addScaledVector(du,-du.x).normalize(),fz=new THREE.Vector3().crossVectors(lx,du);if(fz.z<0)fz.negate();
        const phi=Math.atan2(px*fz.x+py*fz.y+pz*fz.z,px*lx.x+py*lx.y+pz*lx.z),r=Math.hypot(px,py,pz);let f=0;
        for(const sg of [1,-1]){const ph0=sg*lerp(1.2,0.2,smooth((t-0.04)/0.32));if(t<0.4)f+=groove((phi-ph0)*r,0.0068,0.0026,t/0.4);}
        if(t>0.36&&t<0.9)f+=groove(phi*r,0.006,0.0016,(t-0.36)/0.54);
        {let pm=Math.abs(phi)-Math.PI;if(t>0.15&&t<0.85)f+=groove(pm*r,0.0065,0.0015,(t-0.15)/0.7);}
        dsp+=f*smooth((aw-0.4)/0.3);}}
    /* thigh: vastus medialis teardrop, vastus lateralis and the sartorius line; calf: the two heads of the gastrocnemius */
    if(lw>0.5&&fw<0.3&&y<yHip){const lx=sd*x-LX,phi=Math.atan2(z,lx),r=Math.hypot(lx,z),ad=(a,b)=>{let d=a-b;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return d;};let f=0;
      if(y>yKnee+0.02&&y<yHip-0.04){const u=(y-yKnee)/(yHip-yKnee);
        f+=groove(ad(phi,lerp(2.0,1.45,smooth((u-0.08)/0.35)))*r,0.007,0.0021,u/0.45);
        f+=groove(ad(phi,lerp(0.75,1.05,u))*r,0.007,0.0017,u/0.75);
        f+=groove(ad(phi,lerp(2.55,0.55,u))*r,0.006,0.0013,(u-0.1)/0.85);}
      if(y<yKnee-0.08&&y>yKnee-0.3){const u=(yKnee-0.08-y)/0.22;f+=groove(ad(phi,-Math.PI/2+0.05)*r,0.006,0.0016,u);}
      dsp+=f*smooth((lw-0.5)/0.3);}
    if(dsp>0){const k=def*dsp/nl;R[i*3]-=N[i*3]*k;R[i*3+1]-=N[i*3+1]*k;R[i*3+2]-=N[i*3+2]*k;}}
}
function mhGeo(P,feet){
  const p1=mhPlan(feet),hi=GEO_Q>1,plan=hi?mhPlan2(feet):p1,R=hi?ccApply(plan,ccApply(p1,P)):ccApply(p1,P),n=plan.n;smoothSpots(R,plan,BC.core&&BC.core.spots);
  {const B=mhBase(),W0=new Float32Array(B.nv*3);for(let i=0;i<B.nv;i++){W0[i*3]=B.armw[i];W0[i*3+1]=B.legw[i];W0[i*3+2]=B.footw[i];}
    const Wd=hi?ccApply(plan,ccApply(p1,W0)):ccApply(p1,W0);muscleRelief(R,plan,Wd);if(BC.core&&BC.map)poplitealFill(R,n,Wd,BC.map.inv(BC.core.J.kneeL[1]));}
  const NL=neckFlare(R,n);
  const geo=new THREE.BufferGeometry(),uv=new Float32Array(n*2),col=new Float32Array(n*3);
  /* the lid of the cut neck (faces with all corners on the ring) goes: the open ring is where the neck strip starts */
  let IX=plan.ix;if(NL&&NL.cut){const c=NL.cut,o=[];for(let t=0;t<IX.length;t+=3)if(!(c[IX[t]]&&c[IX[t+1]]&&c[IX[t+2]]))o.push(IX[t],IX[t+1],IX[t+2]);IX=Uint32Array.from(o);delete NL.cut;}
  for(let i=0;i<n;i++){const x=R[i*3],y=R[i*3+1],z=R[i*3+2];uv[i*2]=(x*0.7+z*0.7)/TILE;uv[i*2+1]=y/TILE;const a=1-0.08*smooth(1-y/0.04);col[i*3]=col[i*3+1]=col[i*3+2]=a;}
  geo.setAttribute('position',new THREE.BufferAttribute(R,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  geo.setIndex(new THREE.BufferAttribute(IX,1));geo.computeVertexNormals();spotNormals(geo,BC.core&&BC.core.spots);
  seamAttrs(geo,R,feet);geo.userData.keep=true;geo.userData.bodyFeet=!!feet;geo.userData.bodyPlanN=n;geo.userData.neckLoft=NL;return geo;
}
/* seams of a tailor's mannequin (hips, upper arms, thighs, wrists): signed distances to the seam planes
   (planes interpolate exactly across triangles) + where each seam applies; drawn in the fabric shader */
function seamAttrs(geo,R,feet){
  const B=mhBase(),p1=mhPlan(feet),hi=GEO_Q>1,n=R.length/3,W0=new Float32Array(B.nv*3);
  for(let i=0;i<B.nv;i++){W0[i*3]=B.armw[i];W0[i*3+1]=B.legw[i];W0[i*3+2]=B.footw[i];}
  const W=hi?ccApply(mhPlan2(feet),ccApply(p1,W0)):ccApply(p1,W0),M=BC.core,fem=BC.g==='f';
  let cy=9;for(let i=0;i<n;i++){const y=R[i*3+1];if(W[i*3]<0.3&&Math.abs(R[i*3])<0.006&&y>0.6&&y<1&&y<cy)cy=y;}if(cy>1)cy=0.86;
  const nav=M.spots&&M.spots[2]?M.spots[2][1]:1.11,yHip=nav-(fem?0.07:0.075),yThigh=cy-0.11;
  const S0=M.S,E0=M.E,W1=M.W,du=E0.clone().sub(S0).normalize(),df=W1.clone().sub(E0).normalize(),A=S0.clone().addScaledVector(du,fem?0.07:0.085),Wr=W1.clone().addScaledVector(df,-0.012);
  const D=new Float32Array(n*4),Mk=new Float32Array(n*4);
  for(let i=0;i<n;i++){const x=R[i*3],y=R[i*3+1],z=R[i*3+2],sd=x>=0?1:-1,ax=sd*x,aw=W[i*3],lw=W[i*3+1];
    D[i*4]=y-yHip;Mk[i*4]=1-smooth((aw-0.2)/0.3);
    D[i*4+1]=y-yThigh;Mk[i*4+1]=smooth((lw-0.6)/0.3)*(1-smooth((W[i*3+2]-0.2)/0.3));
    D[i*4+2]=(ax-A.x)*du.x+(y-A.y)*du.y+(z-A.z)*du.z;Mk[i*4+2]=smooth((aw-0.6)/0.3);
    D[i*4+3]=(ax-Wr.x)*df.x+(y-Wr.y)*df.y+(z-Wr.z)*df.z;Mk[i*4+3]=smooth((aw-0.6)/0.3);}
  geo.setAttribute('seamD',new THREE.BufferAttribute(D,4));geo.setAttribute('seamM',new THREE.BufferAttribute(Mk,4));
  /* arm weight per vertex (underwear and straps keep off the arms and hands) */
  {const A=new Float32Array(n);for(let i=0;i<n;i++)A[i]=W[i*3];geo.userData.armw=A;}
}
/* =============== the model consumed by body.js =============== */
function coreModel(){
  const F=BC.F,key=[BC.g+(BC.bra?'b':''),r3(BC.b),r3(BC.mus||0),r3(BC.fat||0),...Object.keys(FIG).filter(k=>!['legs','torso','neckL','head'].includes(k)).map(k=>r3(F[k]))].join('|');
  return cacheGet('core',key,()=>{
    const B=mhBase(),R=mhShape(BC.g,F,BC.b),P=R.P,legX=R.legX,nv=B.nv,J=mhMorph(BC.g,BC.mus||0,BC.fat||0).J,MP=mhMap(BC.g);
    for(let i=0;i<nv;i++){P[i*3+1]=MP.inv(P[i*3+1]);P[i*3+2]+=MH_DZ;}
    /* display mannequins have no nipples or navel: relax the small features of the trunk */
    {const Q=B.Q,nb=Array.from({length:nv},()=>new Set());for(let q=0;q<Q.length;q+=4)for(let k=0;k<4;k++){nb[Q[q+k]].add(Q[q+(k+1)%4]);nb[Q[q+(k+1)%4]].add(Q[q+k]);}
      /* find the nipples (front-most point of each pec) and the navel (deepest point of the belly front) */
      /* small sharp bumps / pits on the chest and belly (local height over the neighbours) */
      const bump=i=>{let m=0;for(const j of nb[i])m+=P[j*3+2];return P[i*3+2]-m/nb[i].size;};
      /* nipples: the pole of the densest ring of faces on each pec */
      const edgeLen=i=>{let L=0;for(const j of nb[i])L+=Math.hypot(P[j*3]-P[i*3],P[j*3+1]-P[i*3+1],P[j*3+2]-P[i*3+2]);return L/nb[i].size;};
      const spots=[];const nr=BC.bra?0.06:0.035;for(const sd of [-1,1]){let best=-1,bl=9;for(let i=0;i<nv;i++){const x=P[i*3]*sd,y=P[i*3+1];if(B.armw[i]>0.3||x<0.05||x>0.15||y<1.18||y>1.4||P[i*3+2]<0||!nb[i].size)continue;const L=edgeLen(i);if(L<bl){bl=L;best=i;}}if(best>=0)spots.push([best,nr]);}
      /* navel: the deepest pit on the belly midline, measured against the belly around it (3 cm) */
      {const fr=[];for(let i=0;i<nv;i++){const x=P[i*3],y=P[i*3+1];if(Math.abs(x)<0.06&&y>0.9&&y<1.2&&P[i*3+2]>0&&B.armw[i]<0.3)fr.push(i);}
        let best=-1,bd=-9;for(const i of fr){if(Math.abs(P[i*3])>0.012||P[i*3+1]<0.95||P[i*3+1]>1.15)continue;let sz=0,c=0;for(const j of fr){const dx=P[j*3]-P[i*3],dy=P[j*3+1]-P[i*3+1];const d2=dx*dx+dy*dy;if(d2<0.03*0.03&&d2>0.015*0.015){sz+=P[j*3+2];c++;}}if(c<4)continue;const d=sz/c-P[i*3+2];if(d>bd){bd=d;best=i;}}
        if(best>=0)spots.push([best,0.04]);}
      SPOTS_TMP=spots.map(([c0,rad])=>[P[c0*3],P[c0*3+1],P[c0*3+2],rad]);}
    const armJ=p=>{const v=R.armJ(p);v.y=MP.inv(v.y);v.z+=MH_DZ;return v;},ank=V3(...J.ankL);ank.y=MP.inv(ank.y);ank.z+=MH_DZ;
    /* straighten each leg onto its axis (x=±LX, z=0) below the thigh so trouser legs can be simple tubes */
    {const C=[],st=0.02;for(let y=0.1;y<=0.8;y+=st){let lo=1,hi=-1,zl=1,zh=-1;for(let i=0;i<nv;i++){const yy=P[i*3+1];if(P[i*3]<0||B.legw[i]<0.6||Math.abs(yy-y)>0.012||B.footw[i]>0.3)continue;const x=P[i*3],z=P[i*3+2];if(yy>0.66&&z<-0.03-0.25*(yy-0.66)+MH_DZ)continue;lo=Math.min(lo,x);hi=Math.max(hi,x);zl=Math.min(zl,z);zh=Math.max(zh,z);}
        C.push(hi>lo?[(lo+hi)/2,(zl+zh)/2]:null);}
      for(let k=0;k<C.length;k++)if(!C[k])C[k]=C[k-1]||[0.11,0];smoothArr(C.map(c=>c[0]));
      let ax=0,n=0;C.forEach((c,k)=>{const y=0.1+k*st;if(y>0.3&&y<0.75){ax+=c[0];n++;}});ax/=n||1;
      const cx=C.map(c=>c[0]-ax),cz=C.map(c=>c[1]);smoothArr(cx,3,2);smoothArr(cz,3,2);
      const at=(arr,y)=>{const f=clamp((y-0.1)/st,0,arr.length-1-1e-6),i=Math.floor(f);return lerp(arr[i],arr[i+1],f-i);};
      for(let i=0;i<nv;i++){const lw=B.legw[i];if(lw<=0)continue;const y=P[i*3+1],w=lw*(1-smooth((y-0.68)/0.16)),yy=Math.max(y,0.1);if(w<=0)continue;
        P[i*3]-=Math.sign(P[i*3])*at(cx,yy)*w;P[i*3+2]-=at(cz,yy)*w;}}
    const bins=(y0,y1,st)=>Array.from({length:Math.round((y1-y0)/st)+1},()=>[]);
    /* torso (trunk only), hips (trunk + legs), legs */
    const T=bins(0.74,1.62,0.01),H=bins(0.8,1.1,0.01),L=bins(0.02,0.96,0.01),LC=bins(0.02,0.96,0.01);
    for(let i=0;i<nv;i++){const x=P[i*3],y=P[i*3+1],z=P[i*3+2],aw=B.armw[i],lw=B.legw[i];if(aw>0.3)continue;
      const put=(arr,y0,st,v,w=y>1.4?0.008:0.014)=>{const k0=Math.ceil((y-w-y0)/st),k1=Math.floor((y+w-y0)/st);for(let k=Math.max(0,k0);k<=Math.min(arr.length-1,k1);k++)arr[k].push(v);};
      if(lw<0.35)put(T,0.74,0.01,[x,z]);
      put(H,0.8,0.01,[x,z]);
      if(x>0&&lw>0.5&&!(y<0.14&&B.footw[i]>0.3)&&!(y>0.68&&z<-0.03-0.25*(y-0.68)+MH_DZ)){put(L,0.02,0.01,[x,z]);}}
    let lxs=0,lxn=0;
    L.forEach((b,k)=>{const y=0.02+k*0.01;if(y>0.3&&y<0.8&&b.length){let lo=1,hi=-1;for(const[x] of b){lo=Math.min(lo,x);hi=Math.max(hi,x);}lxs+=(lo+hi)/2;lxn++;}});
    const LX=lxn?lxs/lxn:legX;
    const fill=(arr,f)=>{const out=arr.map(f);for(let k=0;k<out.length;k++)if(out[k]==null)out[k]=k?out[k-1]:null;for(let k=out.length-1;k>=0;k--)if(out[k]==null)out[k]=out[k+1];return out;};
    const tor=fill(T,b=>b.length>3?fitPts(b):null),hips=fill(H,b=>b.length>3?fitPts(b):null);
    const leg=fill(L,b=>{if(b.length<3)return null;let r=0;for(const[x,z] of b)r=Math.max(r,Math.hypot(x-LX,z));return r;});
    /* make sure the torso table never pokes inside the real trunk below the crotch */
    /* polar outline of the pelvis/crotch: exact body radius per direction, so trousers can follow the crotch */
    const PA=64,PY0=0.7,PST=0.01,PN=Math.round((1.02-PY0)/PST)+1,PR=Array.from({length:PN},()=>new Float32Array(PA));
    for(let i=0;i<nv;i++){if(B.armw[i]>0.3)continue;const x=P[i*3],y=P[i*3+1],z=P[i*3+2];if(y<PY0-0.012||y>1.032)continue;
      const r=Math.hypot(x,z),k=((Math.round(Math.atan2(z,x)/TAU*PA)%PA)+PA)%PA;
      for(let j=Math.max(0,Math.ceil((y-0.012-PY0)/PST));j<=Math.min(PN-1,Math.floor((y+0.012-PY0)/PST));j++)if(r>PR[j][k])PR[j][k]=r;}
    for(const row of PR){for(let p=0;p<3;p++){const c=row.slice();for(let k=0;k<PA;k++)row[k]=Math.max(c[k],0.97*Math.max(c[(k+1)%PA],c[(k+PA-1)%PA]));}}
    const polar=(a,y)=>{const f=clamp((y-PY0)/PST,0,PN-1-1e-6),j=Math.floor(f),t=f-j,g=((a/TAU*PA)%PA+PA)%PA,k=Math.floor(g),u=g-k,k2=(k+1)%PA;
      return lerp(lerp(PR[j][k],PR[j][k2],u),lerp(PR[j+1][k],PR[j+1][k2],u),t);};
    const sh=armJ(J.shL),el=armJ(J.elL),wr=armJ(J.wrL);
    const m={P,LX,ank,polar,spots:SPOTS_TMP,shX:sh.x,shY:sh.y,S:sh,E:el,W:wr,armJ,J,
      torso:table(0.74,0.01,tor,3),hips:table(0.8,0.01,hips,4),leg:table(0.02,0.01,leg,4),arm:null,geo:{},
      dispose(){for(const k in this.geo)this.geo[k].dispose();}};
    return m;
  });
}
/* arm radius along the S-E-W path, measured once BC.S/E/W are known */
function armTable(m){
  const B=mhBase(),P=m.P,nv=B.nv,N=Math.round(1.04/0.02)+1,R=new Array(N).fill(0);
  const segs=[[BC.S,BC.E,0,0.5],[BC.E,BC.W,0.5,1]];
  for(let i=0;i<nv;i++){if(B.armw[i]<0.6||P[i*3]<0)continue;const p=V3(P[i*3],P[i*3+1],P[i*3+2]);let best=null;
    for(const[a,b,t0,t1] of segs){const ab=b.clone().sub(a),u=clamp(p.clone().sub(a).dot(ab)/ab.lengthSq(),-0.2,1.3);if((u<0&&t0>0)||(u>1&&t1<1))continue;const c=a.clone().addScaledVector(ab,u),d=p.distanceTo(c);if(!best||d<best.d)best={d,t:lerp(t0,t1,u)};}
    if(!best||best.t>1.0)continue;const k=Math.round((best.t+0.06)/0.02);if(k>=0&&k<N)R[k]=Math.max(R[k],best.d);}
  for(let k=0;k<N;k++)if(!R[k])R[k]=k?R[k-1]:0.05;
  /* fabric bridges the muscle bumps: radius never grows towards the wrist */
  for(let k=N-2;k>=0;k--){const t=-0.06+k*0.02;if(t>0.12)R[k]=Math.max(R[k],R[k+1]);}
  {const k15=Math.round((0.16+0.06)/0.02);for(let k=0;k<k15;k++)R[k]=Math.min(R[k],R[k15]*1.06);}
  return table(-0.06,0.02,R.map(r=>r+0.001),6);
}
function bodyGeo(feet){const m=BC.core,k=(feet?'f':'n')+r3(BC.footA);if(m.geo[k]){BC.neckLoft=m.geo[k].userData.neckLoft;return m.geo[k];}
  let P=m.P;if(feet&&BC.footA){P=P.slice();mhPitch(P,m.ank,BC.footA);}
  for(const kk of Object.keys(m.geo))if(kk[0]===k[0]&&kk!==k&&kk.length>1){m.geo[kk].dispose();delete m.geo[kk];}
  m.geo[k]=mhGeo(P,feet);BC.neckLoft=m.geo[k].userData.neckLoft;return m.geo[k];}
/* =============== nominal <-> mesh heights ===============
   garments are authored on a nominal 1.80 m figure; the mesh keeps its own (realistic) proportions,
   so the body is moved into nominal heights before dressing and everything is mapped back in finalize */
const NECK_LIFT={m:0.03,f:0.012},MH_DZ=-0.028;
/* egg head proportions taken from the reference mannequins (head ~14.5% of the figure) */
const EGG={m:{rx:0.09,ry:0.127,zf:0.101,zb:0.105},f:{rx:0.084,ry:0.122,zf:0.097,zb:0.101}};
function hermite(xs,ys){
  const n=xs.length,d=[],m=new Array(n);for(let i=0;i<n-1;i++)d.push((ys[i+1]-ys[i])/(xs[i+1]-xs[i]));
  m[0]=d[0];m[n-1]=d[n-2];for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:2/(1/d[i-1]+1/d[i]);
  const seg=x=>{let i=0;while(i<n-2&&x>xs[i+1])i++;return i;};
  const f=x=>{if(x<=xs[0])return ys[0]+(x-xs[0])*m[0];if(x>=xs[n-1])return ys[n-1]+(x-xs[n-1])*m[n-1];const i=seg(x),h=xs[i+1]-xs[i],t=(x-xs[i])/h,t2=t*t,t3=t2*t;
    return(2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h*m[i+1];};
  const df=x=>{if(x<=xs[0])return m[0];if(x>=xs[n-1])return m[n-1];const i=seg(x),h=xs[i+1]-xs[i],t=(x-xs[i])/h,t2=t*t;
    return((6*t2-6*t)*ys[i]+(3*t2-4*t+1)*h*m[i]+(-6*t2+6*t)*ys[i+1]+(3*t2-2*t)*h*m[i+1])/h;};
  return{f,df};
}
function mhMap(g){
  const B=mhBase();if(B['map'+g])return B['map'+g];
  const M=B[g],J=M.J,H=M.head,fem=g==='f',eb=H.c[1]-H.ry+NECK_LIFT[g],hb=1.552,E=EGG[g];
  const xs=[0,0.8,1.41,1.495,hb,hb+2*E.ry,2.6],ys=[0,fem?0.799:0.779,J.shL[1],Math.min(fem?1.548:1.567,eb-0.012),eb,eb+2*E.ry,2.6+eb-hb];
  const h=hermite(xs,ys),lo=-0.3,st=0.002,N=Math.round((3-lo)/st),T=new Float32Array(N+1);for(let i=0;i<=N;i++)T[i]=h.f(lo+i*st);
  const inv=y=>{let a=0,b=N;if(y<=T[0])return lo+(y-T[0]);if(y>=T[N])return lo+N*st+(y-T[N]);while(b-a>1){const c=(a+b)>>1;if(T[c]<=y)a=c;else b=c;}return lo+(a+(y-T[a])/(T[b]-T[a]))*st;};
  return B['map'+g]={G:h.f,k:h.df,inv,hb};
}
