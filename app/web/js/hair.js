'use strict';
/* =============== Fitme: fryzury i zarost =============== */
/* hairline height (cos of polar angle) by angular distance from the front */
const HAIRLINE=[[0,.5],[.4,.47],[.68,.4],[.9,.31],[1.08,.24],[1.25,.19],[1.45,.19],[1.7,.16],[1.95,.02],[2.3,-.25],[2.7,-.45],[Math.PI,-.52]];
const HTEX={straight:{amp:.0012,f:12,vol:1,wave:0},wavy:{amp:.0025,f:11,vol:1.12,wave:1},curly:{amp:.004,f:13,vol:1.25,wave:2},coily:{amp:.005,f:15,vol:1.35,wave:3}};
const HAT_LINES={baseball:[[0,.3],[1,.2],[1.57,.12],[2.4,-.04],[Math.PI,-.1]],beanie:[[0,.33],[1.57,.1],[2.4,-.08],[Math.PI,-.14]],fisherman:[[0,.5],[1.57,.36],[Math.PI,.2]],
  bucket:[[0,.24],[1.57,.12],[Math.PI,0]],flat:[[0,.26],[1.57,.12],[Math.PI,-.06]],beret:[[0,.42],[1.57,.3],[Math.PI,.18]],fedora:[[0,.3],[1.57,.18],[Math.PI,.04]]};
HAT_LINES.trucker=HAT_LINES.baseball;HAT_LINES.kerchief=[[0,.37],[1.57,.1],[2.5,-.12],[Math.PI,-.17]];
/* a kerchief tied over the head flattens the hair like a cap */
function capType(){const c=S.acc.cap.type;if(c&&c!=='none')return c;return S.acc.headband&&S.acc.headband.type==='full'?'kerchief':'none';}
const angFront=ph=>Math.abs(wrapA(ph-FRONT));
function hairlineNy(ph){return interp1(HAIRLINE,angFront(ph));}
function hatLineNy(ph){const t=capType(),tab=HAT_LINES[t];if(!tab)return null;let d=angFront(ph);if(S.acc.cap.back&&(t==='baseball'||t==='trucker'))d=Math.PI-d;return interp1(tab,d);}
/* a headband across the forehead lies over the hair: the hair under it is pressed below its surface (it went through it at
   the sides and the back). Returns how far the band covers a point (0..1) and the band's height over the scalp */
const HB_H=0.011;
function hairBandK(ny,ph){const A=S.acc.headband;if(!A||A.type!=='forehead')return 0;const f=0.5+0.5*Math.sin(ph),c=lerp(-0.12,0.42,f),hw=0.12*(0.75+0.25*Math.sin(ph));return 1-smooth((Math.abs(ny-c)-hw)/0.045);}
function hairTexP(){return HTEX[S.hair.texture]||HTEX.straight;}
const hairLen=(a,b)=>lerp(a,b,clamp(S.hair.len!=null?S.hair.len:0.5,0,1));
/* ---------- shell over the scalp ---------- */
function hairShell(G,mat,hf,o={}){
  const T=hairTexP(),hc=BC.headC,SH=[];
  const g=surf(128,40,(u,v)=>{let shd=1;
    const ph=u*TAU,thMax=Math.acos(clamp(hairlineNy(ph)+(o.line||0),-0.98,0.98)),th=v*thMax,ny=Math.cos(th),d=angFront(ph);
    const dir=headPt(th,ph,0,false).sub(hc).normalize();
    let h=hf(ny,d,ph,dir);
    h*=lerp(1,T.vol,smooth(h/0.02));
    if(o.noise!==0) h+=(o.noise||1)*T.amp*fbm(dir.x*T.f,dir.y*T.f,dir.z*T.f)*smooth(h/0.006);
    /* combed clumps running from the crown */
    if(h>0.006&&o.noise!==0){const cf=foldP(Math.atan2(dir.z,dir.x)*26+3*fbm(dir.x*2,dir.y*2,dir.z*2)),k=smooth((h-0.006)/0.01);h+=0.0028*(o.clump!=null?o.clump:1)*cf*k;shd=lerp(1,lerp(0.9,1.02,cf*0.5+0.5),k);}
    if(o.messy) h+=o.messy*Math.abs(nz3(dir.x*9+1,dir.y*9,dir.z*9))*smooth((ny-0.38)/0.3);
    const band=o.band||(h>0.03?0.32:h>0.015?0.22:0.17);h*=lerp(o.edge!=null?o.edge:0.35,1,Math.sqrt(smooth((1-v)/band)));
    const hl=hatLineNy(ph);if(hl!=null&&ny>hl-0.05)h=Math.min(h,0.0045);
    {const bk=hairBandK(ny,ph);if(bk>0)h=lerp(h,Math.min(h,HB_H-0.003),bk);}
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
function hairSheet(G,mat,o){
  const T=hairTexP(),hc=BC.headC,nu=o.nu||96,nv=o.nv||48,cols=[],shs=[];
  for(let i=0;i<=nu;i++){
    const u=i/nu,ph0=lerp(o.ph0,o.ph1,u),y0=o.y0(ph0),col=[],shc=[];let Rp=null,tb=0,y1=o.y1(ph0);
    /* the ends are not cut with a ruler: a soft, uneven line (longer and shorter sections) */
    {const ct=0.5+0.5*Math.sin(ph0*7+1.6*fbm(ph0*2,1.3,2.1));y1-=0.016*ct*smooth((y0-y1-0.06)/0.12);}
    /* hair that ends just past the point where it meets the shoulder does not ride out over it in a flat plate: it ends
       resting there (longer hair keeps falling, in front of or behind the shoulder) */
    if(!o.noBody){let yc=null,Rh=0;for(let y=y0;y>y1-0.08;y-=0.004){const hr=headHorizR(y,ph0);Rh=hr!=null?Math.max(Rh*0.0,hr+o.thick):Math.max(Rh,BC.neckR+0.016);if(hr!=null)Rh=hr+o.thick;
        if(envR(bodyEnv(y,LAYERS),ph0)+0.013>Rh+0.022){yc=y;break;}}
      if(yc!=null&&y1<yc&&yc-y1<0.09)y1=yc-0.006-0.01*(0.5+0.5*Math.sin(ph0*5));}
    /* hair does not lie flat out to the shoulder tip: over the shoulders it falls in front of or behind them */
    const sx=Math.cos(ph0)>=0?1:-1,af=angFront(ph0),toFront=af<1.42,tgt=toFront?FRONT-sx*(0.42+0.3*smooth((af-0.9)/0.5)):BACKA+sx*(0.25+0.5*smooth((Math.PI-af)/1.9)),dph=Math.atan2(Math.sin(tgt-ph0),Math.cos(tgt-ph0));
    /* pass 1: the radius each row needs (head + thickness, clear of the body and clothes) */
    const PH=[],RQ=[],st=Math.abs(y1-y0)/nv;
    for(let j=0;j<=nv;j++){
      const v=j/nv,y=lerp(y0,y1,v);if(!o.noBody){const e=envR(bodyEnv(y,LAYERS),ph0);tb=Math.max(tb,smooth((e-(BC.neckR+0.035))/0.06),smooth((BC.shY+0.1-y)/0.07));}const ph=ph0+tb*dph,hr=headHorizR(y,ph),th=lerp(o.thin||0.006,o.thick,smooth(v/0.2));
      let R=hr!=null?hr+th:0;
      if(hr!=null){const bk=hairBandK((y-hc.y)/BC.hd.ry,ph);if(bk>0)R=lerp(R,Math.min(R,hr+HB_H-0.003),bk);}
      if(hr!=null)R+=0.017*gauss(angFront(ph)-Math.PI/2,0.33)*gauss(y-(hc.y-0.012),0.045);
      if(!o.noBody)R=Math.max(R,envR(bodyEnv(y,LAYERS),ph)+0.013);
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
  const SH=[],g=surf(nu,nv,(u,v)=>{const i=Math.round(u*nu),j=Math.round(v*nv);SH.push(shs[i][j]);return cols[i][j];},{uRep:o.uRep||10,vRep:2,noAO:true});
  hairShade(g,SH);hairOutward(g,true);G.add(mk(g,mat));
  if(o.cards)hairCards(G,g,nu,nv,Object.assign({out:'axis'},o.cards));
  return g;
}
/* ---------- hair cards ----------
   strips with a strand texture laid over the hair volume (shell or sheet) along its comb direction (the surface's v),
   a little above it and fanning out towards the tips: they break up the solid surface and its silhouette into strands */
function hairCards(G,g,nu,nv,o){
  const p=g.attributes.position.array,n=g.attributes.normal.array,W=nu+1,hc=BC.headC,R=rng(o.seed||(nu*7+nv)),ry=BC.hd.ry;
  /* outward normals (the surface winding is not consistent between shells and sheets) */
  let RC=null;if(o.out==='ring'){RC=new Float32Array((nv+1)*3);for(let j=0;j<=nv;j++){for(let i=0;i<nu;i++){const k=(j*W+i)*3;RC[j*3]+=p[k]/nu;RC[j*3+1]+=p[k+1]/nu;RC[j*3+2]+=p[k+2]/nu;}}}
  const N=new Float32Array(n.length);for(let k=0;k<n.length/3;k++){let x=n[k*3],y=n[k*3+1],z=n[k*3+2];const j=Math.floor(k/W),cx=RC?RC[j*3]:hc.x,cy=RC?RC[j*3+1]:hc.y,cz=RC?RC[j*3+2]:hc.z,ox=p[k*3]-cx,oy=o.out==='axis'?0:p[k*3+1]-cy,oz=p[k*3+2]-cz;if(x*ox+y*oy+z*oz<0){x=-x;y=-y;z=-z;}N[k*3]=x;N[k*3+1]=y;N[k*3+2]=z;}
  const smp=(u,v,P,Q)=>{u=o.wrapU?((u%1)+1)%1:clamp(u,0,1);v=clamp(v,0,1);const fu=u*nu,fv=v*nv,i=Math.min(nu-1,Math.floor(fu)),j=Math.min(nv-1,Math.floor(fv)),a=fu-i,b=fv-j;
    const w=[(1-a)*(1-b),a*(1-b),(1-a)*b,a*b],ks=[j*W+i,j*W+i+1,(j+1)*W+i,(j+1)*W+i+1];
    P.set(0,0,0);Q.set(0,0,0);for(let q=0;q<4;q++){const k=ks[q]*3;P.x+=p[k]*w[q];P.y+=p[k+1]*w[q];P.z+=p[k+2]*w[q];Q.x+=N[k]*w[q];Q.y+=N[k+1]*w[q];Q.z+=N[k+2]*w[q];}Q.normalize();};
  const pos=[],nor=[],uv=[],col=[],idx=[],P=V3(),Q=V3(),P2=V3(),Q2=V3(),dir=o.dir||1,v0=o.v0!=null?o.v0:0.06,v1=o.v1!=null?o.v1:0.97;
  /* under a hat / kerchief the hair is pressed flat: no strands where it covers the head (they stood through it) */
  const hatOn=capType()!=='none';
  const okP=Pt=>{const ny=(Pt.y-hc.y)/ry;if(o.minNy!=null&&ny<=o.minNy)return false;if(hairBandK(ny,Math.atan2(Pt.z-hc.z,Pt.x-hc.x))>0.05)return false;if(hatOn){const hl=hatLineNy(Math.atan2(Pt.z-hc.z,Pt.x-hc.x));if(hl!=null&&ny>hl-0.1)return false;}return true;};
  const path=[],nrm=[];
  for(let c=0;c<o.count;c++){
    /* roots spread over the surface; a strand runs from its root along the comb direction to its length or to the edge of
       the hair (so the tips gather at the hairline / the ends, not in the middle of the surface) */
    let u=R(),v=dir>0?lerp(v0,v1-0.1,Math.pow(R(),0.9)):lerp(v1,v0+0.1,Math.pow(R(),0.9));smp(u,v,P,Q);if(!okP(P))continue;
    const L=o.len*(0.6+0.7*R()),Wd=o.w*(0.7+0.6*R()),lift=(o.lift||0.0015)*(0.3+1.2*R()),fan=(o.fan!=null?o.fan:0.004)*(0.4+R()),drift=(R()-0.5)*(o.drift!=null?o.drift:0.06),ds=0.008;
    /* over a hanging sheet the top layer ends at different heights (one line of tips read as the edge of a helmet) */
    const vEnd=o.endRand?lerp(v1*o.endRand,v1,R()):v1;
    path.length=0;nrm.length=0;let acc=0;
    while(acc<=L){smp(u,v,P,Q);if(!okP(P)){if(path.length>1)break;else{path.length=0;nrm.length=0;break;}}path.push(P.clone());nrm.push(Q.clone());
      smp(u+drift*0.02,v+dir*0.01,P2,Q2);const d=P2.distanceTo(P);if(d<1e-7)break;const dv=0.01/d*ds;v+=dir*dv;u+=drift*dv;acc+=ds;if(v>vEnd||v<0)break;}
    const K=path.length-1;if(K<2)continue;
    const colA=Math.floor(R()*4),ua=colA/4+0.008,ub=(colA+1)/4-0.008,tone=0.94+0.1*R(),base=pos.length/3;
    for(let k=0;k<=K;k++){const t=k/K,C0=path[k],N0=nrm[k],T=(k<K?path[k+1].clone().sub(C0):C0.clone().sub(path[k-1])).normalize(),sd=N0.clone().cross(T).normalize();
      const h=lift+fan*t*t,wid=Wd*(1-0.4*t)*0.5,C=C0.clone().addScaledVector(N0,h);
      for(const sgn of [-1,1]){const V=C.clone().addScaledVector(sd,sgn*wid);pos.push(V.x,V.y,V.z);nor.push(N0.x,N0.y,N0.z);uv.push(sgn<0?ua:ub,1-t);const sh=tone*lerp(0.9,1,smooth(t/0.4));col.push(sh,sh,sh);}
      if(k>0){const a=base+(k-1)*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}}
  if(!idx.length)return;
  const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));cg.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));cg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));cg.setAttribute('color',new THREE.Float32BufferAttribute(col,3));cg.setIndex(idx);
  cg.userData.keepNormals=true;G.add(mk(cg,hairCardMat(S.hair.color,o.kind||'strand')));}
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
  const hc=BC.headC,n=o.n,ga=Math.PI*(3-Math.sqrt(5)),R=rng(17);
  for(let i=0;i<n*3&&G.children.length<2000;i++){
    const yy=1-(i/(n*3-1))*1.6;if(yy<-0.6)break;
    const rr=Math.sqrt(Math.max(0,1-yy*yy)),ph0=i*ga;let ph=Math.atan2(Math.sin(ph0)*rr,Math.cos(ph0)*rr);
    const ny=yy;if(ny<hairlineNy(ph)+0.06)continue;
    const th=Math.acos(ny),P0=headPt(th,ph,o.base||0.008,false),pts=[P0];
    const out=P0.clone().sub(hc).normalize();
    let p=P0.clone().addScaledVector(out,o.stand||0.02);p.y-=0.006;
    if(angFront(ph)<1.05&&!o.short){const v=P0.clone().sub(hc);for(let k=1;k<=4;k++){const a=-k*0.36,c=Math.cos(a),sn=Math.sin(a);const w=V3(v.x,v.y*c-v.z*sn,v.y*sn+v.z*c);w.multiplyScalar((w.length()+(o.base||0.008)+o.r*1.6+0.004)/w.length());p=hc.clone().add(w);pts.push(p.clone());}ph=Math.atan2(p.z-hc.z,p.x);}
    else pts.push(p.clone());
    const len=o.len*(0.85+R()*0.3),steps=Math.max(3,Math.round(len/0.045)),dy=len/steps;
    let Rp=Math.hypot(p.x,p.z-hc.z);
    for(let k=0;k<steps;k++){
      const y=p.y-dy*(o.short?0.5:1);
      const d=wrapA(ph-FRONT);if(Math.abs(d)<1.15&&y<hc.y+0.06)ph+=Math.sign(d||1)*0.16;
      const need=hairClear(y,ph,0.014+o.r);const Rn=Math.max(need,Rp-0.012+(o.short?0.01:0));Rp=Rn;
      p=V3(Math.cos(ph)*Rn,y,hc.z+Math.sin(ph)*Rn);pts.push(p.clone());
    }
    const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
    G.add(mk(tubeAlong(curve,Math.max(8,steps*3),t=>o.r*(1-0.3*t*t)*(t<0.04?0.8:1),{seg:7}),mat));
  }
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
  const tg=tubeAlong(curve,40,t=>r*(0.62+0.5*Math.sin(Math.min(1,t*1.6+0.15)*Math.PI*0.8))*(1-0.75*smooth((t-0.6)/0.4)),{seg:14,uRep:5});G.add(mk(tg,mat));
  /* strands along the tail, from the tie to the tip */
  {const nr=41,sg=tg.attributes.position.count/nr-1;hairCards(G,tg,sg,nr-1,{wrapU:true,out:'ring',len:len*1.2,count:220,w:0.02,lift:0.0012,fan:0.004,v0:0.03,v1:1,drift:0.04,kind:hairTexP().wave>=2?'coil':'strand'});}
  const tie=mk(new THREE.TorusGeometry(r*0.62,0.004,8,24),plain('#1b1a19',.6));tie.position.copy(pts[1]);tie.quaternion.copy(qFromTo(VZ,pts[2].clone().sub(pts[1])));G.add(tie);
}
function hairFringe(G,mat,kind,thick){
  const hc=BC.headC,ry=BC.hd.ry,w=0.85;
  const y1={straight:ph=>hc.y+ry*0.2,curtain:ph=>{const d=Math.abs(ph-FRONT)/w;return hc.y+ry*(0.38-0.32*smooth(d));},side:ph=>hc.y+ry*(0.44-0.34*smooth((ph-FRONT+w)/(2*w)))}[kind];
  if(!y1)return;
  hairSheet(G,mat,{ph0:FRONT-w,ph1:FRONT+w,y0:()=>hc.y+ry*0.66,y1,thick:thick||0.011,thin:0.008,nu:60,nv:26,noBody:true,uRep:16,cards:{len:0.06,count:260,w:0.02,lift:0.0014,fan:0.0015,v0:0.02,v1:1,drift:0.03}});
}
/* ---------- style catalogue ---------- */
function afroH(R,lift){const hc=BC.headC,C2=hc.clone().add(V3(0,lift,-0.012));return(ny,d,ph,dir)=>{const o=hc.clone().sub(C2),b=o.dot(dir),t=-b+Math.sqrt(Math.max(0,b*b-(o.lengthSq()-R*R)));const base=headPt(Math.acos(ny),ph,0,false).distanceTo(hc);return Math.max(0.006,t-base);};}
function buildHair(G){
  const H=S.hair,st=H.style;
  buildBeard(G);
  if(!HAIR[st]||st==='none')return;
  const hc=BC.headC,ry=BC.hd.ry,T=hairTexP();
  const mat=hairMat(H.color,'v',T.wave>=2&&['afro','curlytop'].includes(st)?'coil':'strand'),bmat=hairMat(H.color,'v','braid');
  const front=d=>smooth((0.9-d)/0.9);
  const hat=capType()!=='none';
  const sheetTo={bob:hairLen(hc.y-0.06,hc.y-0.13),lob:hairLen(1.5,1.38),long:hairLen(1.32,1.02),mullet:hairLen(1.52,1.38),wolf:hairLen(1.53,1.4),curtains:hairLen(hc.y-0.04,hc.y-0.11)};
  const sheet=(gap,to,thick,o={})=>hairSheet(G,mat,Object.assign({ph0:FRONT+gap,ph1:FRONT-gap+TAU,y0:()=>hc.y+ry*(hat?0.1:0.5),y1:ph=>to+(o.choppy?0.025*nz3(ph*6,1,2):0)+(o.longBack?-0.03*smooth((angFront(ph)-1.6)/1.2):0),thick,
    /* the sheet leaves the scalp shell tangentially (as thick as the shell where it starts): a thin start grew out of the shell as a ledge */
    thin:thick*0.85},o));
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
    case 'curtains':hairShell(G,mat,ny=>0.008+0.01*smooth((ny-0.2)/0.6),{edge:.5,clump:.4,cards:C(0.06,260,{endRand:0.55})});sheet(1.05,sheetTo.curtains,0.011,{flare:-0.006,cards:C(0.1,160,{w:0.018,v0:0.02,v1:1})});fr=fr||'curtain';break;
    case 'curlytop':hairShell(G,mat,(ny,d)=>0.002+0.038*smooth((ny-0.42)/0.3)*(1+0.15*front(d)),{edge:.5,noise:1.2,clump:.4,cards:C(0.035,420,{kind:'coil',minNy:0.45,fan:0.007,drift:0.3})});break;
    case 'afro':{const base=afroH(hat?0.13:hairLen(0.14,0.19),hat?0:0.03);hairShell(G,mat,(ny,d,ph,dir)=>base(ny,d,ph,dir)*(1+0.07*fbm(dir.x*4,dir.y*4,dir.z*4)),{edge:.04,noise:1.2,band:.38,cards:C(0.03,520,{kind:'coil',w:0.016,fan:0.006,drift:0.5,lift:0.002})});break;}
    case 'twists':hairShell(G,mat,()=>0.01,{edge:.5,noise:.5});if(!hat)hairLocks(G,bmat,{n:70,len:hairLen(0.06,0.14),r:0.0072,stand:0.02,short:true});break;
    case 'cornrows':hairShell(G,bmat,(ny,d,ph,dir)=>0.0035+0.0045*Math.abs(Math.sin(dir.x*34)),{edge:.6,noise:0});break;
    case 'dreads':hairShell(G,bmat,()=>0.011,{edge:.5,noise:.3});hairLocks(G,bmat,{n:hat?40:80,len:hairLen(0.22,0.55),r:0.0078,stand:0.014});break;
    case 'braids':hairShell(G,bmat,(ny,d,ph,dir)=>0.006+0.003*Math.abs(Math.sin(dir.x*30)),{edge:.5,noise:0});hairLocks(G,bmat,{n:hat?60:115,len:hairLen(0.3,0.66),r:0.0055,stand:0.01});break;
    case 'mullet':hairShell(G,mat,ny=>0.008+0.016*smooth((ny-0.3)/0.5),{edge:.5,noise:1,clump:.4,messy:.004,cards:C(0.05,300,{endRand:0.55,kind:ck,fan:0.006})});sheet(1.75,sheetTo.mullet,0.016,{choppy:1,flare:0.008,cards:C(0.09,160,{kind:ck,w:0.018,v0:0.02,v1:1,fan:0.006})});break;
    case 'wolf':hairShell(G,mat,ny=>0.012+0.022*smooth((ny-0.2)/0.6),{edge:.5,noise:1.2,clump:.4,messy:.008,cards:C(0.06,340,{endRand:0.55,kind:ck,fan:0.008,drift:0.12})});sheet(0.98,sheetTo.wolf,0.022,{choppy:1,flare:0.012,cards:C(0.1,240,{kind:ck,w:0.02,v0:0.02,v1:1,fan:0.008,drift:0.1})});fr=fr||'curtain';break;
    case 'pixie':hairShell(G,mat,(ny,d)=>0.008+0.018*smooth((ny-0.1)/0.6)*(1+0.3*front(d)),{edge:.45,noise:.8,clump:.4,messy:.004,cards:C(0.045,340,{kind:ck,fan:0.005,drift:0.1})});fr=fr||'side';break;
    case 'bob':hairShell(G,mat,ny=>0.01+0.012*smooth((ny-0.2)/0.6),{edge:.5,clump:.4,cards:C(0.06,280,{endRand:0.55,kind:ck})});sheet(0.86,sheetTo.bob,0.017,{flare:-0.004,cards:C(0.1,260,{kind:ck,w:0.02,v0:0.02,v1:1})});break;
    case 'lob':hairShell(G,mat,ny=>0.01+0.012*smooth((ny-0.2)/0.6),{edge:.5,clump:.4,cards:C(0.06,280,{endRand:0.55,kind:ck})});sheet(0.92,sheetTo.lob,0.017,{flare:0.01,longBack:1,cards:C(0.13,320,{kind:ck,w:0.022,v0:0.02,v1:1})});break;
    case 'long':hairShell(G,mat,ny=>0.009+0.012*smooth((ny-0.2)/0.6),{edge:.5,clump:.4,cards:C(0.06,280,{endRand:0.55,kind:ck})});sheet(0.92,sheetTo.long,0.017,{flare:0.016,longBack:1,nv:64,cards:C(0.18,380,{kind:ck,w:0.024,v0:0.02,v1:1})});break;
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
