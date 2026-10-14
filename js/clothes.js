'use strict';
/* =============== Fitme: ubrania — pomocnicze, doły, góry =============== */
const SHAFT_E=0.014,NECK_Y=1.505;
const roundE=(y,y0,y1,add)=>add*(0.45+0.55*Math.sin(Math.PI*clamp((y-y0)/(y1-y0),0,1)));
const sideAng=(x,env)=>x>=0?angAtX(env,x):Math.PI-angAtX(env,-x);
function ringPt(r,a,y,m=1,x0=0,off=0){const[c,s]=seXY(a,r.n);return V3(x0+c*(r.rx*m+off),y,s*((s>=0?r.rz:zbk(r))*m+off));}
function onFront(envF,x,y,off=0.0016,back=false){const e=envF(y),xx=clamp(x,-e.rx*0.985,e.rx*0.985);return V3(xx,y,(back?-1:1)*(frontZ(e,xx,back)+off));}
function stitchPts(G,pts,hex,closed){if(pts.length>1)G.add(mk(stitchGeo(pts,closed),stitchMat(hex)));}
function stitchRing(G,y,rf,hex,x=0,mod){
  const s=vSamples(y-0.002,y+0.002,1,yy=>addE(rf(yy),0.0013),x);const avg=(s[0].rx+s[0].rz)/2;
  G.add(mk(tube(s,{seg:110,uRep:Math.round(Math.PI*2*avg/0.0095),vRep:1/0.004,mod}),stitchMat(hex,'h')));
}
function stitchV(G,samples,ac,hex,mod){
  let avg=0;samples.forEach(s=>avg+=s.rx);avg/=samples.length;const w=0.0026/avg;
  G.add(mk(tube(samples,{a0:ac-w,a1:ac+w,seg:1,uRep:1,vRep:1/0.0095,mod,noAO:true}),stitchMat(hex,'v')));
}
function patch(envF,a0,a1,y0,y1,off,o={}){return tube(vSamples(y0,y1,o.nv||6,y=>addE(envF(y),off),o.x||0),{a0,a1,seg:o.seg||10,mod:o.mod,uv01:o.uv01,uFlip:o.uFlip,noAO:o.noAO});}
function buttonAt(G,P,nrm,r,mat,thick=0.0028){const b=mk(new THREE.CylinderGeometry(r,r*0.92,thick,18),mat);b.position.copy(P);b.quaternion.copy(qFromTo(VY,nrm));G.add(b);
  const rim=mk(new THREE.TorusGeometry(r*0.8,r*0.12,6,18),mat);rim.position.copy(P).addScaledVector(nrm.clone().normalize(),thick*0.5);rim.quaternion.copy(qFromTo(VZ,nrm));G.add(rim);}
const radialN=P=>V3(P.x,0,P.z).normalize();
function cordsAlong(G,mat,pts,r){if(pts.length>1)G.add(mk(cordGeo(pts,r,false,8,pts.length*3),mat));}
/* drawstrings hanging from a waistband / hood */
function drawstrings(G,yTop,len,xs,envF,col){
  const cm=plain(col||'#f2efe8',.8,0,'cord'),tip=plain('#cfcac0',.35,.6,'aglet');
  for(const sx of xs){const P=onFront(envF,sx,yTop,0.004),pts=[P];for(let k=1;k<=5;k++){const y=yTop-len*k/5;pts.push(onFront(envF,sx+(sx>0?0.004:-0.004)*k/5,y,0.006));}
    cordsAlong(G,cm,pts,0.0026);const e=pts[pts.length-1];G.add(mk(rodGeo(e.clone().add(V3(0,0.012,0)),e.clone().add(V3(0,-0.004,0)),0.0034),tip));}
}
/* =============== trousers & skirts =============== */
function pantsLegR(y,fit,T){
  const t=clamp((0.82-y)/0.74,0,1),body=legAt(y);
  if(T&&T.tight)return body+0.0035;
  if(!fit.k)return body+fit.e;
  const k=fit.k,s=t<0.43?lerp(k[0],k[1],smooth(t/0.43)):lerp(k[1],k[2],smooth((t-0.43)/0.57));
  return Math.max(s*Math.pow(BC.b,0.8)*(1+(BC.F.hips-1)*0.4*(1-t)),body+0.008);
}
function legWrinkles(hem,amp=1){return(a,tt,s)=>{const y=s.y,r=s.rx,e=Math.max(0,r-legAt(y));let d=0;
  d+=gauss(y-0.5,0.05)*0.12*e*Math.sin(y*120+Math.sin(a*2)*2.2+a*1.5)*(0.5+0.5*Math.max(0,-Math.sin(a)));
  if(y<hem+0.14)d+=(1-(y-hem)/0.14)*0.35*Math.min(e,0.022)*Math.sin(y*115+a*3);
  d+=gauss(y-0.77,0.05)*0.18*(e+0.01)*Math.sin(a*6+y*25)*Math.max(0,Math.sin(a));
  d+=0.14*Math.min(e,0.04)*fbm(Math.cos(a)*2.2,y*6,Math.sin(a)*2.2);
  return 1+amp*d/r;};}
function pantsSize(P,waistY){
  const m=BC.meas,o={d:0,leg:0,hem:null,stack:0};if(!m)return o;
  if(P.w&&P.w!=='auto'&&WAISTS.includes(+P.w)){const circ=m.at(waistY);o.d=clamp((+P.w*2.54-circ)/TAU/100/BC.sxz,-0.006,0.08);o.leg=Math.max(-0.004,o.d*0.45);}
  if(P.l&&P.l!=='auto'&&INSEAMS.includes(+P.l)){const yw=WARP.Y(0.8)*BC.sy-(+P.l)*0.0254;const h=warpInv(yw);o.hem=Math.max(0.02,h);if(h<0.035)o.stack=clamp((0.035-h)/0.05,0,1);}
  return o;
}
function pantsSeat(y){return y<1.1?maxE(torsoAt(y),BC.core.hips(Math.max(y,0.8))):torsoAt(y);}
function beltLoops(G,waistY,hipE,mat,wb,belted){
  const angs=[FRONT-0.5,FRONT+0.5,FRONT-1.35,FRONT+1.35,BACKA-0.55,BACKA+0.55,BACKA];
  /* with a belt a loop just wraps it (4 mm beyond each edge, see belt()); without one it lies flat on the waistband */
  const ya=belted?waistY-0.037:waistY-wb-0.004,yb=belted?waistY:waistY+0.004,off=belted?0.008:0.004;
  for(const a of angs){const y=(ya+yb)/2,e=addE(pantsSeat(y),hipE+off),P=envPt(e,a,y,0);
    const l=mk(new THREE.BoxGeometry(0.009,yb-ya,0.004),mat);l.position.copy(P);l.quaternion.copy(qFromTo(VZ,radialN(P)));G.add(l);}
  return angs;
}
function belt(G,waistY,hipE,P,front=true){
  const col=P.beltColor||'#3a281c',kind=P.buckle||'classic',y0=waistY-0.033,y1=waistY-0.004,mid=(y0+y1)/2;
  const bm=kind==='web'?fabric('canvas',col):plain(col,.5,0,'belt',{clearcoat:.3,bumpMap:weaveTex('leather'),bumpScale:.004});
  const rf=y=>addE(pantsSeat(y),hipE+0.006+roundE(y,y0,y1,0.002));
  G.add(mk(tube(vSamples(y0,y1,4,rf),{seg:80}),bm));
  stitchRing(G,y0+0.003,y=>addE(rf(y),0.0005),shade(col,0.35));stitchRing(G,y1-0.003,y=>addE(rf(y),0.0005),shade(col,0.35));
  if(!front)return;
  const e=rf(mid),z=e.rz+0.004,bk=new THREE.Group();bk.position.set(0.0,mid,z);
  const met=metalMat(P.beltMetal||'silver');
  if(kind==='western'){const s=new THREE.Shape();s.absellipse(0,0,0.04,0.026,0,TAU);bk.add(mk(new THREE.ExtrudeGeometry(s,{depth:0.004,bevelEnabled:true,bevelThickness:0.0015,bevelSize:0.0015,bevelSegments:2,curveSegments:32}),met));
    const s2=new THREE.Shape();s2.absellipse(0,0,0.028,0.016,0,TAU);const inn=mk(new THREE.ExtrudeGeometry(s2,{depth:0.002,bevelEnabled:false,curveSegments:24}),plain(shade(col,-0.2),.5));inn.position.z=0.005;bk.add(inn);}
  else{const w=kind==='web'?0.024:0.022,h=kind==='web'?0.02:0.017,fr=new THREE.Shape();fr.moveTo(-w,-h);fr.lineTo(w,-h);fr.lineTo(w,h);fr.lineTo(-w,h);fr.lineTo(-w,-h);
    const ho=new THREE.Path();ho.moveTo(-w+0.006,-h+0.005);ho.lineTo(w-0.006,-h+0.005);ho.lineTo(w-0.006,h-0.005);ho.lineTo(-w+0.006,h-0.005);ho.lineTo(-w+0.006,-h+0.005);fr.holes.push(ho);
    bk.add(mk(new THREE.ExtrudeGeometry(fr,{depth:0.004,bevelEnabled:true,bevelThickness:0.001,bevelSize:0.001,bevelSegments:2}),met));
    const prong=mk(new THREE.BoxGeometry(0.02,0.003,0.004),met);prong.position.set(0.004,0,0.003);bk.add(prong);
    const tail=mk(new THREE.BoxGeometry(0.05,0.026,0.003),bm);tail.position.set(-0.05,0,0.0025);bk.add(tail);}
  G.add(bk);
}
function buildBottom(G){
  const P=S.bottom,T=BOTTOMS[P.type];PANTS=null;if(!T||P.type==='none')return;
  if(T.skirt)buildSkirt(G,P,T);else buildPants(G,P,T);
}
function buildPants(G,P,T){
  const fit=PANTS_FITS[P.fit]||PANTS_FITS.straight,len=PANTS_LEN[P.length]||PANTS_LEN.full,sagD={low:0.045,heavy:0.065}[P.sag]||0;
  /* sagging: the waistband slides down the hips (never past the top of the crotch), what is under it shows */
  const waistY=sagD?Math.max(shellBase(1).cy+0.016,(RISES[P.rise]||RISES.mid).y-sagD):(RISES[P.rise]||RISES.mid).y;
  /* illustrative sizes: waist W widens / narrows the seat and legs, inseam L moves the hem */
  const PW=pantsSize(P,waistY);
  const mat=P.mat||T.mat,pat=P.pattern||'solid',c2=P.color2||'#f4f1ea';
  MK_STIFF=(STIFF[mat]||0.3)*(T.tight||fit.e<0.008?0.15:0.8);
  const m=fabric(mat,P.color,pat,c2),mb=fabric(mat,shade(P.color,-0.08),pat,shade(c2,-0.08));
  const thread=mat==='denim'?'#c98a3a':shade(P.color,lumHex(P.color)<0.25?0.12:-0.28);
  let hem=PW.hem!=null&&['full','stacked','cuffed','jogger'].includes(P.length)?PW.hem:len.hem;
  /* the legs slide down with the waist: long trousers bunch over the shoes */
  if(sagD&&hem<0.2)hem=Math.max(0.02,hem-sagD*0.5);const SH=SHOES[S.shoes.type]||{};
  const hipE0=(T.tight?0.004:0.012)+(fit.hip||0);
  /* the top of each leg widens to meet the side of the seat so there is no ledge at the hip */
  let legR=y=>{const r=pantsLegR(y,fit,T)+PW.leg;if(y<0.68)return r;const h=BC.core.hips(Math.max(y,0.8)).rx+hipE0-BC.legX;return Math.max(r,lerp(r,h,smooth((y-0.68)/0.17)));};
  /* shorts: the leg is a straight tube that falls from the widest part of the thigh with real ease (no thigh-hugging) */
  if(len.hem>0.3&&!T.tight){const base=legR,ease=0.012+(fit.k?0.006:0);legR=y=>{let r=base(y);for(let yy=y;yy<=0.78;yy+=0.01)r=Math.max(r,base(yy)-0.06*(yy-y));return Math.max(r,legAt(y)+ease);};}
  if(len.jogger){const base=legR;legR=y=>{const r=base(y);return y<hem+0.08?lerp(legAt(y)+0.012,r,smooth((y-hem)/0.08)):r;};}
  if(SH.shaft&&hem<SH.shaft){let gap=1;for(let y=0.04;y<=SH.shaft;y+=0.01)gap=Math.min(gap,legR(y)-(legAt(y)+SHAFT_E+0.004));if(gap<0.006)hem=SH.shaft-0.012;}
  const hipE=Math.max(0.003,(T.tight?0.004:0.012)+(fit.hip||0)+PW.d),seat=y=>y<1.1?maxE(torsoAt(y),BC.core.hips(Math.max(y,0.8))):torsoAt(y),tRf=y=>addE(seat(y),hipE);
  const hipMod=(a,t,s)=>1+(T.tight?0:0.0025*Math.sin(a*5+s.y*20)*smooth((0.94-s.y)/0.12)/s.rx);
  const cm=crotchMod(y=>legR(Math.min(y,0.9))+0.0025,BC.legX,0.95,0.87,(a,y)=>BC.core.polar(a,y)+0.008+(T.tight?0:0.006)+(fit.hip||0)*0.5),hipM=(a,t,s)=>hipMod(a,t,s)*cm(a,t,s);
  G.add(mkMain(tube(vSamples(0.765,waistY,36,tRf),{seg:84,mod:hipM}),m));
  const wbH=T.elastic?0.045:0.038;
  const wbF=y=>addE(seat(y),hipE+roundE(y,waistY-wbH,waistY+0.004,0.006));
  G.add(mk(tube(vSamples(waistY-wbH,waistY+0.004,6,wbF),{seg:84,mod:T.elastic?(a)=>1+0.0035*Math.abs(Math.sin(a*70)):null}),T.elastic?fabric(mat==='mesh'?'mesh':'rib',shade(P.color,-0.05)):mb));
  if(!T.elastic){stitchRing(G,waistY-wbH+0.005,y=>addE(seat(y),hipE+0.0035),thread);stitchRing(G,waistY-0.005,y=>addE(seat(y),hipE+0.0035),thread);}
  const wr=legWrinkles(hem,T.tight?0.15:1);
  const stackMod=len.stack?(a,t,s)=>s.y<hem+0.15?1+0.075*Math.pow(Math.max(0,Math.sin((s.y-hem)*Math.PI/0.035+a*0.6)),2)*(1-(s.y-hem)/0.15):1:null;
  const mod=stackMod?(a,t,s)=>wr(a,t,s)*stackMod(a,t,s):wr;
  const stripes=T.stripes||(T.stripesOpt&&P.stripes);
  for(const side of [-1,1]){
    const x=side*BC.legX,out=side>0?0:Math.PI,inn=side>0?Math.PI:0,lr=y=>{const r=legR(y)-0.004*smooth((y-0.765)/0.025);return{rx:r,rz:r,n:2};};
    G.add(mkMain(tube(vSamples(0.87,hem,len.stack?130:100,lr,x),{seg:56,mod}),m));
    if(len.cuff){const r=legR(hem+0.02)+0.006;G.add(mk(tube(vSamples(hem-0.002,hem+0.05,6,y=>{const e=roundE(y,hem-0.002,hem+0.05,0.004);return{rx:r+e,rz:r+e};},x),{seg:56}),mb));stitchRing(G,hem+0.044,()=>({rx:r+0.004,rz:r+0.004}),thread,x);}
    else if(len.jogger)G.add(mk(tube(vSamples(hem,hem+0.042,5,y=>addE(lr(y),roundE(y,hem,hem+0.042,0.003)),x),{seg:56,mod:(a)=>1+0.003*Math.abs(Math.sin(a*40))}),fabric('rib',shade(P.color,-0.05))));
    else{G.add(mk(tube(vSamples(hem,hem+0.016,4,y=>addE(lr(y),roundE(y,hem,hem+0.016,0.003)),x),{seg:56,mod}),m));if(!T.tight)stitchRing(G,hem+0.022,lr,thread,x,mod);}
    if(!T.tight){stitchV(G,vSamples(0.88,hem+0.03,70,y=>addE(lr(y),0.0012),x),out,thread,mod);stitchV(G,vSamples(0.8,hem+0.03,60,y=>addE(lr(y),0.0012),x),inn,thread,mod);}
    if(stripes)for(const o of [-0.1,0.07]){const a0=out+o*(side>0?1:-1);G.add(mk(patch(lr,Math.min(a0,a0+0.035*(side>0?1:-1)),Math.max(a0,a0+0.035*(side>0?1:-1)),hem+0.02,0.9,0.0016,{x,nv:60,seg:2,mod}),fabric(mat,c2)));}
    if(T.cargo&&hem<0.5){
      const pf=y=>addE(lr(y),0.008),a0=out-0.6,a1=out+0.6;
      G.add(mk(patch(lr,a0,a1,0.5,0.655,0.008,{x,nv:8,seg:14}),mb));
      G.add(mk(patch(lr,a0-0.04,a1+0.04,0.632,0.67,0.013,{x,nv:3,seg:14}),mb));
      const sp=[];for(let k=0;k<=14;k++){const a=lerp(a0,a1,k/14);sp.push(ringPt(addE(lr(0.505),0.0095),a,0.505,1,x));}stitchPts(G,sp,thread);
      const btn=ringPt(addE(lr(0.645),0.015),out,0.645,1,x);buttonAt(G,btn,V3(btn.x-x,0,btn.z),0.0055,plain(shade(P.color,-0.35),.4));
    }
    if(T.carpenter){
      if(hem<0.36){G.add(mk(patch(lr,FRONT-0.85,FRONT+0.85,0.36,0.63,0.0035,{x,nv:16,seg:18,mod}),m));
        const s1=[],s2=[];for(let k=0;k<=18;k++){const a=lerp(FRONT-0.85,FRONT+0.85,k/18);s1.push(ringPt(addE(lr(0.365),0.0045),a,0.365,1,x));s2.push(ringPt(addE(lr(0.625),0.0045),a,0.625,1,x));}stitchPts(G,s1,thread);stitchPts(G,s2,thread);}
      if(side>0){const loop=patch(lr,out-0.16,out+0.16,0.6,0.67,0.012,{x,nv:4,seg:6});G.add(mk(loop,mb));}
      else{G.add(mk(patch(lr,out-0.5,out+0.1,0.6,0.76,0.005,{x,nv:8,seg:10}),mb));}
    }
    if(T.parachute){stitchV(G,vSamples(0.86,hem+0.03,60,y=>addE(lr(y),0.0012),x),FRONT,thread,mod);stitchRing(G,0.5,lr,thread,x,mod);
      const tp=ringPt(addE(lr(hem+0.03),0.004),out,hem+0.03,1,x);G.add(mk(cordGeo([tp,tp.clone().add(V3(0,-0.03,0.004)),tp.clone().add(V3(0,-0.06,0.002))],0.0022),plain('#1b1a19',.6)));
      G.add(mk(rodGeo(tp.clone().add(V3(0,-0.055,0.002)),tp.clone().add(V3(0,-0.075,0.002)),0.006,10),plain('#1b1a19',.5)));}
    if(T.crease)G.add(mk(patch(lr,FRONT-0.02,FRONT+0.02,hem+0.02,0.8,0.0016,{x,nv:40,seg:2}),fabric(mat,shade(P.color,0.1),pat,c2)));
    if(T.rips&&P.rips&&hem<0.46){G.add(mk(patch(lr,FRONT-0.62,FRONT+0.62,0.46,0.57,0.0016,{x,nv:10,seg:16,uv01:true,mod}),decalMat('rip','#ffffff',(SKINS[S.skin]||SKINS[3])[0])));}
  }
  /* front & back details */
  const sides=[-1,1];
  if(T.jeans||T.jeansFront){
    for(const sx of sides){const pts=[];for(let k=0;k<=12;k++){const t=k/12,x=sx*lerp(0.072,0.95*tRf(waistY-0.1).rx,Math.pow(t,0.8)),y=waistY-0.006-0.1*Math.pow(t,1.7);pts.push(onFront(tRf,x,y));}stitchPts(G,pts,thread);
      const r1=onFront(tRf,sx*0.074,waistY-0.012,0.002),r2=pts[pts.length-1];for(const r of [r1,r2]){const rv=mk(new THREE.SphereGeometry(0.0042,10,8),metalMat('gold'));rv.position.copy(r);G.add(rv);}}
    const fb=Math.max(0.915,waistY-0.15),fly=[[0.034,waistY-0.04],[0.034,fb+0.02],[0.026,fb+0.006],[0.006,fb]].map(([x,y])=>onFront(tRf,x,y));stitchPts(G,fly,thread);
    const ce=tRf(waistY-0.05),a0=Math.PI-angAtX(ce,0.096),a1=Math.PI-angAtX(ce,0.138);G.add(mk(patch(tRf,a0,a1,waistY-0.085,waistY-0.042,0.003,{nv:3,seg:6}),m));
    const yk=[];for(let k=0;k<=20;k++){const a=lerp(BACKA-1.3,BACKA+1.3,k/20),y=waistY-0.05-0.05*(1-Math.abs(a-BACKA)/1.3);yk.push(envPt(tRf(y),a,y,0.0016));}stitchPts(G,yk,thread);
    const bpA=(a,y)=>{const e=tRf(y);return addE(mulE(e,hipM(a,0,Object.assign({y},e))),0.0035);};
    for(const c of [BACKA-0.56,BACKA+0.56]){const yT=waistY-0.1,yB=Math.max(0.87,waistY-0.22);
      G.add(mk(surf(10,10,(u,v)=>{const a=c+(u-0.5)*0.62,y=lerp(yT,yB-0.016*(1-Math.abs(2*u-1)),v);return envPt(bpA(a,y),a,y,0);},{}),m));
      const ol=[];for(let k=0;k<=10;k++){const a=c-0.29+0.58*k/10;ol.push(envPt(bpA(a,yT),a,yT,0.001));}stitchPts(G,ol,thread);
      const arc=[];for(let k=0;k<=10;k++){const a=c-0.25+0.5*k/10,y=yT-0.05-0.02*Math.sin(Math.PI*k/10);arc.push(envPt(bpA(a,y),a,y,0.001));}stitchPts(G,arc,thread);}
    const btn=onFront(wbF,0.0,waistY-0.017,0.004);buttonAt(G,btn,V3(0,0,1),0.0085,metalMat(mat==='denim'?'gold':'silver'),0.004);
  }else if(T.slant||T.welt){
    if(T.slant)for(const sx of sides){const pts=[];for(let k=0;k<=8;k++){const t=k/8;pts.push(onFront(tRf,sx*lerp(0.09,0.97*tRf(waistY-0.13).rx,t),waistY-0.006-0.125*t));}stitchPts(G,pts,thread);}
    if(T.welt)for(const c of [BACKA-0.55,BACKA+0.55]){G.add(mk(patch(tRf,c-0.24,c+0.24,waistY-0.085,waistY-0.074,0.002,{nv:2,seg:6}),plain(shade(P.color,-0.45),.9)));
      const b=envPt(tRf(waistY-0.068),c,waistY-0.068,0.003);buttonAt(G,b,radialN(b),0.0045,plain(shade(P.color,-0.3),.5));}
    if(!T.elastic){const fb=Math.max(0.915,waistY-0.15),fly=[[0.03,waistY-0.04],[0.03,fb+0.016],[0.006,fb]].map(([x,y])=>onFront(tRf,x,y));stitchPts(G,fly,thread);
      const btn=onFront(wbF,0.012,waistY-0.017,0.004);buttonAt(G,btn,V3(0,0,1),0.0062,plain(shade(P.color,-0.3),.4));}
  }
  if(T.pleats&&P.pleats!==false&&!T.jeans)for(const sx of sides)for(const px of [0.056,0.088]){const pts=[];for(let k=0;k<=4;k++)pts.push(onFront(tRf,sx*px,waistY-wbH-0.002-0.045*k/4,0.0012));stitchPts(G,pts,thread);}
  let loops=[];
  if(T.belt){loops=beltLoops(G,waistY,hipE,mb,wbH,!!P.belt);if(P.belt)belt(G,waistY,hipE,P);}
  if(T.strings)drawstrings(G,waistY-0.008,0.13,[-0.024,0.024],y=>addE(pantsSeat(Math.max(y,waistY-0.2)),hipE+0.006));
  if(stripes){for(const a of [0,Math.PI])for(const o of [-0.06,0.06])G.add(mk(patch(tRf,a+o-0.018,a+o+0.018,0.88,waistY-wbH,0.0016,{nv:14,seg:2}),fabric(mat,c2)));}
  PANTS={waistY,hipE,rf:tRf,loops};
  /* the layer must enclose belt loops, buttons, rivets and patch pockets, or tops laid over it show them through */
  const lay=P.belt?0.016:T.belt||T.jeans||T.jeansFront||T.cargo?0.012:0.007;
  LAYERS.push({torso:y=>(y>=0.74&&y<=waistY+0.004)?addE(tRf(y),lay):(y>waistY&&y<=waistY+0.05)?addE(tRf(y),lay-(hipE+lay)*smooth((y-waistY-0.004)/0.046)):null,
    leg:y=>(y>=hem&&y<=0.9)?legR(y):null});
}
function buildSkirt(G,P,T){
  const fit=SKIRT_FITS[P.fit]||SKIRT_FITS.aline,len=SKIRT_LEN[P.length]||SKIRT_LEN.knee,waistY=(RISES[P.rise]||RISES.high).y,hem=len.hem;
  const mat=P.mat||T.mat,pat=P.pattern||'solid';MK_STIFF=(STIFF[mat]||0.3)*0.9;const m=fabric(mat,P.color,pat,P.color2),mb=fabric(mat,shade(P.color,-0.08),pat,P.color2);
  const rf=y=>{const b=bodyEnv(y,null),p=clamp((0.92-y)/(0.92-hem),0,1);return addE(b,0.012+fit.flare*p*p);};
  const pleat=fit.pleat?(a,t,s)=>1+0.03*Math.abs(Math.sin(a*16))*clamp((0.96-s.y)/0.22,0,1):null;
  const drape=(a,t,s)=>1+(fit.pleat?0:clamp((0.86-s.y)/0.4,0,1)*(fit.drape?0.028:0.02*fit.flare/0.085)*Math.sin(a*(fit.drape?5:7)+s.y*(fit.drape?6:0)));
  const mod=pleat?(a,t,s)=>pleat(a,t,s)*drape(a,t,s):drape;
  const seg=fit.pleat?160:96;
  G.add(mk(tube(vSamples(hem,waistY,64,rf),{seg,mod}),m));
  G.add(mk(tube(vSamples(hem,hem+0.016,4,y=>addE(rf(y),roundE(y,hem,hem+0.016,0.003))),{seg,mod}),m));
  G.add(mk(tube(vSamples(waistY-0.036,waistY+0.004,5,y=>addE(pantsSeat(y),0.016+roundE(y,waistY-0.036,waistY+0.004,0.005))),{seg:72}),mb));
  const thread=mat==='denim'?'#c98a3a':shade(P.color,-0.28);
  if(mat==='denim'){stitchRing(G,hem+0.024,rf,thread,0,mod);for(const sx of [-1,1]){const pts=[];for(let k=0;k<=10;k++){const t=k/10;pts.push(onFront(rf,sx*lerp(0.07,0.9*rf(waistY-0.09).rx,t),waistY-0.04-0.09*Math.pow(t,1.6)));}stitchPts(G,pts,thread);}
    const fly=[[0.03,waistY-0.04],[0.03,waistY-0.13],[0.006,waistY-0.15]].map(([x,y])=>onFront(rf,x,y));stitchPts(G,fly,thread);}
  if(T.belt){beltLoops(G,waistY,0.014,mb,0.036,!!P.belt);if(P.belt)belt(G,waistY,0.014,P);}
  PANTS={waistY,hipE:0.014,rf:y=>addE(pantsSeat(y),0.016),loops:[FRONT-0.5,FRONT+0.5,FRONT-1.35,FRONT+1.35,BACKA-0.55,BACKA+0.55,BACKA]};
  const k=fit.pleat?1.035:1.02;
  LAYERS.push({torso:y=>(y>=hem&&y<=waistY)?mulE(rf(y),k):(y>waistY&&y<=waistY+0.04)?addE(pantsSeat(y),0.014*(1-(y-waistY)/0.04)):null});
}
/* =============== shared upper-body pieces =============== */
/* garment shoulder: covers the top of the arm so the sleeve can start inside it */
function topCap(y,e,prev,drop=0){
  if(y<1.3)return null;
  /* the measured trunk already carries the real shoulder slope; add a rounded deltoid so the sleeve can start inside it */
  const base=bodyEnv(Math.min(y,1.56),prev),sy=BC.shY,dy=y-sy;
  const R=Math.max(armAt(0.05)*0.95,sleeveEnv(0.05,prev)*0.95)+e*0.3+0.004,cx=BC.shX+drop*0.7;
  const u=dy<0?dy/R:dy/(0.6*R),bump=(u*u<1?cx+R*Math.sqrt(1-u*u):cx-2*(Math.abs(u)-1)*R)+0.002,flat=base.rx+e*0.55,k=0.018;
  const rx=(bump+flat+Math.sqrt((bump-flat)*(bump-flat)+k*k))/2-k*0.12;
  const w=smooth((y-1.3)/0.06),ez=e*0.55+0.003;
  return{rx:Math.max(rx,flat),rz:base.rz+ez,rzb:zbk(base)+ez,n:lerp(base.n||2.3,2.35,w)};
}
/* stand + fall collar (shirt, polo, camp, blazer back collar) */
function fallCollar(G,mat,o){
  const y0=o.y,gx=o.gapX||0.004,e0=o.env(y0),g=FRONT-angAtX(e0,gx),A0=FRONT+g,A1=FRONT-g+TAU,stand=o.stand||0.025;
  const ringR=a=>envR(o.env(y0),a);
  if(stand>0.004)G.add(mk(surf(64,4,(u,v)=>{const a=lerp(A0,A1,u),y=y0+stand*v,e=addE(o.env(y0),0.002-0.004*v*v);return envPt(e,a,y,0);},{noAO:true}),mat));
  const dEnd=a=>Math.min(Math.abs(a-A0),Math.abs(A1-a));
  G.add(mk(surf(64,8,(u,v)=>{
    const a=lerp(A0,A1,u),de=dEnd(a),pt=gauss(de,0.28);
    const drop=(o.drop||0.045)+(o.point||0.015)*pt,yF=y0+stand+0.002,yE=yF-drop;
    const ae=a+(u<0.5?-1:1)*(o.tip!=null?o.tip:g*0.85)*pt*v;
    const y=lerp(yF,yE,v),env=o.env(Math.min(y,y0));
    const off=lerp(0.004,(o.spread||0.012)+0.006,v)+0.006*Math.sin(Math.PI*v);
    const R=Math.max(ringR(ae)+off,envR(env,ae)+0.004+0.004*v);
    return envPt(env,ae,y,R-envR(env,ae));
  },{noAO:true}),mat));
}
function standCollar(G,mat,o){
  const y0=o.y,h=o.h,gx=o.gapX||0.0005,e0=o.env(y0),g=FRONT-angAtX(e0,gx);
  G.add(mk(surf(72,6,(u,v)=>{const a=lerp(FRONT+g,FRONT-g+TAU,u),y=y0-0.004+(h+0.004)*v,e=addE(o.env(y0),0.003+roundE(v,0,1,0.003)-(o.lean||0.002)*v);return envPt(e,a,y,0);},{noAO:true,mod:o.mod}),mat));
}
/* hood lying down on the back */
function hoodDown(G,mat,o){
  const y0=o.y,gx=Math.max(o.gapX||0,0.04),e0=o.env(y0),g=FRONT-angAtX(e0,gx);
  const h=mk(surf(56,22,(u,v)=>{
    const a=lerp(FRONT+g,FRONT-g+TAU,u),db=Math.abs(wrapA(a-BACKA)),drop=lerp(0.03,0.2,smooth(1-db/2.3));
    let rise,off;
    if(v<0.32){const t=v/0.32;rise=0.045*Math.sin(t*Math.PI/2);off=0.004+0.018*t;}
    else{const t=(v-0.32)/0.68;rise=0.045*Math.cos(t*Math.PI/2)-drop*smooth(t);off=0.022+0.008*Math.sin(Math.PI*t)-0.012*smooth(t);}
    const y=y0+rise,env=o.env(Math.min(y,y0-0.002));
    return envPt(env,a,y,Math.max(off,0.006)+0.004*Math.sin(u*Math.PI*9)*v);
  },{noAO:true}),mat);h.userData.hood=true;G.add(h);
}
/* band over the shoulder (tank straps, vests, backpack) */
function shoulderBand(G,mat,envF,xin,xout,yF,yB,side,off=0.002){
  const yTop=x=>{let lo=1.3,hi=1.53;for(let i=0;i<22;i++){const mid=(lo+hi)/2;if(envF(mid).rx>=x)lo=mid;else hi=mid;}return lo;};
  G.add(mk(surf(6,44,(u,v)=>{const x=lerp(xin,xout,u),yt=yTop(x);let y,z;
    if(v<0.5){const t=v/0.5;y=lerp(yF,yt,Math.sin(t*Math.PI/2));z=frontZ(envF(y),x)+off;}
    else{const t=(v-0.5)/0.5;y=lerp(yt,yB,1-Math.cos(t*Math.PI/2));z=-frontZ(envF(y),x,true)-off;}
    return V3(side*Math.min(x,envF(y).rx+off),y+(Math.abs(v-0.5)<0.12?off:0),z);},{noAO:true}),mat));
}
function decal(G,envF,a0,a1,y0,y1,kind,hex,extra,mod){if(!kind||kind==='none')return;G.add(mk(patch(envF,a0,a1,y0,y1,0.0014,{nv:12,seg:20,uv01:true,uFlip:true,mod}),decalMat(kind,hex,extra)));}
/* =============== tops =============== */
function waistLine(){return PANTS?PANTS.waistY:(RISES.mid.y);}
function buildTop(G,P=S.top){
  const T=TOPS[P.type];if(!T||P.type==='none')return;
  const SZ=sizeEase(P);
  const F=TOP_FITS[P.fit]||TOP_FITS.regular,prev=LAYERS.slice(),waistY=waistLine();
  const mat=P.mat||T.mat,pat=P.pattern||'solid',c2=P.color2||'#1e1e1f';
  MK_STIFF=(STIFF[mat]||0.2)*0.7;
  const neck=T.necks?(T.necks.includes(P.neck)?P.neck:T.necks[0]):null,sleeve=T.sleeves.includes(P.sleeve)?P.sleeve:T.sleeves[0];
  const tuckM=T.tuck?(P.tuck||'out'):'out',tuck=tuckM!=='out';
  const m=fabric(mat,P.color,pat,c2),ribK=['fleece','jersey','tricot','mesh'].includes(mat)?'rib':mat;
  const md=fabric(ribK,shade(P.color,-0.06),ribK===mat?pat:'solid',c2);
  const trim=T.trim?fabric('rib',c2):md;
  const sleeveless=sleeve==='none';
  const hemOut=(BC.g==='f'?0.875:0.855)+(F.hem||0)+(T.tail?-0.02:0)-SZ.len;
  const hem=tuck?waistY-0.05:hemOut,e0=Math.max(0.002,easeCap(F.e+(T.boning?-0.004:0)+SZ.d)),top=sleeveless?(neck==='scoop'?1.345:1.3):NECK_Y;
  const easeAt=y=>{let e=e0;if(y>1.3)e=lerp(e0,Math.min(e0,0.008+e0*0.4),smooth((y-1.3)/0.12));if(y>1.45)e=lerp(e,0.01,smooth((y-1.45)/0.055));if(tuck&&y<waistY+0.06)e=lerp(0.003,e,smooth((y-(waistY-0.015))/0.075));if(T.rib&&!tuck&&y<hem+0.05)e=lerp(e*0.45,e,smooth((y-hem)/0.05));return e;};
  const baseAt=y=>(tuck&&y<waistY)?bodyEnv(y,null):drapeEnv(y,prev);
  const rf0=y=>{const b=baseAt(y);let r=addE(b,easeAt(y));if(!sleeveless){const c=topCap(y,e0,prev,F.drop||0);if(c)r=maxE(r,c);}else if(y>0.98)r.rx=Math.min(r.rx,b.rx+0.01+0.01*smooth((1.1-y)/0.12));return r;};
  const vX=y=>{if(neck==='v'){const yv=1.375;return y<yv?0:lerp(0.002,0.064,smooth((y-yv)/(top-yv))*0.6+(y-yv)/(top-yv)*0.4);}
    if(neck==='sweetheart')return y<1.275?0:0.035*smooth((y-1.275)/0.025);
    if(T.collar==='camp')return y<1.34?0:lerp(0.002,0.07,smooth((y-1.34)/(top-1.34)));return 0;};
  const rf=y=>{const r=rf0(y),g=vX(y);const aR=angAtX(r,Math.max(g,0.0002));r.a0=Math.PI-aR;r.a1=aR+TAU;return r;};
  const gapAny=neck==='v'||neck==='sweetheart'||T.collar==='camp';
  const folds=(a,t,s)=>{const y=s.y,e=easeAt(Math.min(y,top));let d=0;
    if(y<1.24)d+=0.18*e*Math.sin(a*6+y*9)*smooth((1.24-y)/0.2);
    d+=0.12*e*fbm(Math.cos(a)*2.6,y*2.2,Math.sin(a)*2.6);
    if(tuck&&y<waistY+0.07&&y>waistY+0.004)d+=0.12*e0*Math.sin(a*11)*Math.sin(Math.PI*(y-waistY+0.01)/0.08);
    return 1+d/Math.max(s.rx,0.05);};
  const tubeO={seg:84,mod:folds};
  G.add(mkMain(tube(vSamples(hem,top,90,gapAny?rf:rf0),tubeO),m));
  const thread=shade(P.color,lumHex(P.color)<0.3?0.25:-0.2);
  /* hem */
  if(!tuck){
    if(T.rib){const bd=mk(tube(vSamples(hem,hem+0.05,5,y=>addE(rf0(y),0.0015+roundE(y,hem,hem+0.05,0.002))),{seg:84}),md);bd.userData.band=1;G.add(bd);}
    else{G.add(mk(tube(vSamples(hem,hem+0.016,4,y=>addE(rf0(y),roundE(y,hem,hem+0.016,0.003))),tubeO),m));stitchRing(G,hem+0.022,rf0,thread,0,folds);G.children.slice(-2).forEach(o=>o.userData.hemPiece=1);}
    if(T.tail){const dropF=a=>0.05*Math.pow(Math.abs(Math.sin(a)),1.5);
      const tl=mk(surf(84,6,(u,v)=>{const a=u*TAU,y=hem-dropF(a)*v;return envPt(rf0(hem),a,y,0.0005);},{noAO:true}),m);tl.userData.tail=true;G.add(tl);}
  }else if(tuckM==='front'){
    const panelHem=hemOut-0.02;G.add(mk(surf(60,10,(u,v)=>{const a=BACKA+(u*2-1)*1.5,w=smooth(1-Math.abs(u*2-1)),y=lerp(waistY-0.01,lerp(waistY-0.01,panelHem,w),v);return envPt(addE(bodyEnv(y,prev),e0*0.8+0.002),a,y,0);},{noAO:true}),m));
  }
  /* neckline */
  if(neck==='crew'||neck==='henley'||(neck==='hood'&&false))G.add(mk(tube(vSamples(top-0.018,top+0.003,4,y=>addE(rf0(Math.min(y,top)),roundE(y,top-0.018,top+0.003,0.004))),{seg:64}),trim));
  if(neck==='v'||neck==='sweetheart'){for(const sd of [-1,1]){const pts=[];for(let k=0;k<=16;k++){const y=lerp(neck==='v'?1.376:1.276,top,k/16),r=rf0(y),g=vX(y),a=sd>0?angAtX(r,Math.max(g,0.001)):Math.PI-angAtX(r,Math.max(g,0.001));pts.push(ringPt(r,a,y,1,0,0.0025));}cordsAlong(G,trim,pts,neck==='v'?0.0055:0.004);}
    if(neck==='v'){const bk=[];for(let k=0;k<=24;k++){const r=rf0(top),gR=angAtX(r,vX(top)),a=lerp(Math.PI-gR,gR+TAU,k/24);bk.push(ringPt(r,a,top,1,0,0.002));}cordsAlong(G,trim,bk,0.0055);}}
  if(neck==='henley'||T.placket==='short'){const yb=T.placket==='short'?1.37:1.35;G.add(mk(patch(rf0,FRONT-0.08,FRONT+0.08,yb,top-0.01,0.0018,{nv:6,seg:3}),md));
    const n=T.buttons||3;for(let i=0;i<n;i++){const y=lerp(top-0.03,yb+0.02,n>1?i/(n-1):0),Pb=onFront(rf0,0,y,0.0034);buttonAt(G,Pb,V3(0,0,1),0.0048,plain(shade(P.color,-0.25),.35));}}
  if(neck==='turtle'){const h=0.062,nr=y=>{const b=bodyEnv(NECK_Y,null);return{rx:BC.neckR*1.02+0.012,rz:BC.neckR*0.98+0.012,rzb:BC.neckR*1.04+0.012};};
    G.add(mk(tube(vSamples(top-0.012,top+h,10,y=>{const r=nr(y),t=(y-top)/h;return addE(r,0.002*Math.sin(Math.PI*t)+0.006*smooth((t-0.5)/0.5));},0,0.004),{seg:56,mod:(a,t,s)=>1+0.012*Math.sin(s.y*120+a)}),md));
    G.add(mk(tube(vSamples(top+h*0.42,top+h+0.004,6,y=>addE(nr(y),0.009+roundE(y,top+h*0.42,top+h+0.004,0.003)),0,0.004),{seg:56}),md));}
  if(neck==='hood'){hoodDown(G,m,{y:top-0.004,env:rf0,gapX:0.045});drawstrings(G,top-0.012,0.15,[-0.032,0.032],y=>addE(rf0(Math.min(y,top-0.01)),0.004));}
  if(T.collar==='shirt')fallCollar(G,md,{y:top-0.004,env:rf0,gapX:0.006,stand:0.026,drop:0.045,point:0.016,spread:0.012});
  if(T.collar==='polo')fallCollar(G,T.collar2?fabric('twill','#f4f1ea'):md,{y:top-0.004,env:rf0,gapX:0.006,stand:0.018,drop:0.036,point:0.01,spread:0.01});
  if(T.collar==='camp')fallCollar(G,m,{y:top-0.006,env:rf0,gapX:0.07,stand:0.008,drop:0.05,point:0.012,spread:0.03,tip:0});
  if(T.placket==='full'){const yb=tuck?waistY-0.03:hem+0.004,yt=T.collar==='camp'?1.34:top-0.01;G.add(mk(patch(rf0,FRONT-0.085,FRONT+0.085,yb,yt,0.0018,{nv:24,seg:3,mod:folds}),md));
    stitchV(G,vSamples(yb,yt,24,y=>addE(rf0(y),0.0032)),FRONT-0.08,thread);stitchV(G,vSamples(yb,yt,24,y=>addE(rf0(y),0.0032)),FRONT+0.08,thread);
    const n=T.buttons||6,ytop=T.collar==='camp'?1.32:top-0.025,ybot=Math.max(yb+0.06,tuck?waistY+0.02:hem+0.08);
    for(let i=0;i<n;i++){const y=lerp(ytop,ybot,i/(n-1)),Pb=onFront(rf0,0,y,0.0036);buttonAt(G,Pb,V3(0,0,1),0.0052,plain(shade(P.color,-0.22),.35));}}
  if(T.chestPocket){const e=rf0(1.26),a0=angAtX(e,0.115),a1=angAtX(e,0.05);G.add(mk(patch(rf0,a0,a1,1.2,1.3,0.0028,{nv:6,seg:8}),m));
    const sp=[];for(let k=0;k<=8;k++)sp.push(envPt(addE(rf0(1.2+0.1*0),0.004),lerp(a0,a1,k/8),1.2,0));stitchPts(G,sp,thread);}
  if(T.flapPockets)for(const sx of [-1,1]){const e=rf0(1.27),a0=sideAng(sx*0.12,e),a1=sideAng(sx*0.045,e),lo=Math.min(a0,a1),hi=Math.max(a0,a1);
    G.add(mk(patch(rf0,lo,hi,1.19,1.3,0.0028,{nv:6,seg:8}),m));G.add(mk(patch(rf0,lo-0.02,hi+0.02,1.28,1.31,0.0055,{nv:2,seg:8}),md));
    const b=onFront(rf0,sx*0.0825,1.288,0.0075);buttonAt(G,b,V3(0,0,1),0.0042,plain(shade(P.color,-0.3),.4));}
  if(T.yoke){const yk=[];for(let k=0;k<=24;k++){const a=lerp(BACKA-1.5,BACKA+1.5,k/24);yk.push(envPt(rf0(1.4),a,1.4,0.0016));}stitchPts(G,yk,thread);}
  if(T.kangaroo&&!tuck){const y0=hem+0.055,y1=hem+0.18;G.add(mk(patch(rf0,FRONT-0.78,FRONT+0.78,y0,y1,0.004,{nv:8,seg:22,mod:folds}),m));
    for(const sd of [-1,1]){const pts=[];for(let k=0;k<=8;k++){const y=lerp(y0+0.012,y1-0.01,k/8),a=FRONT+sd*(0.78-0.25*(k/8));pts.push(envPt(addE(rf0(y),0.0055),a,y,0));}cordsAlong(G,md,pts,0.003);}}
  if(T.boning){for(const a of [FRONT-0.95,FRONT-0.5,FRONT,FRONT+0.5,FRONT+0.95,BACKA-0.6,BACKA+0.6])G.add(mk(patch(rf0,a-0.015,a+0.015,hem+0.01,top-0.006,0.0018,{nv:20,seg:2}),md));
    G.add(mk(tube(vSamples(top-0.012,top+0.002,3,y=>addE(rf0(Math.min(y,top)),0.002)),{seg:64}),md));
    for(let i=0;i<7;i++){const y=lerp(top-0.03,hem+0.03,i/6);const a=envPt(addE(rf0(y),0.003),BACKA-0.06,y,0),b=envPt(addE(rf0(y-0.026),0.003),BACKA+0.06,y-0.026,0);cordsAlong(G,plain('#1b1a19',.6),[a,b],0.0016);
      const a2=envPt(addE(rf0(y),0.003),BACKA+0.06,y,0),b2=envPt(addE(rf0(y-0.026),0.003),BACKA-0.06,y-0.026,0);cordsAlong(G,plain('#1b1a19',.6),[a2,b2],0.0016);}}
  /* straps for sleeveless tops */
  if(sleeveless&&!T.boning){const bodyE=y=>addE(bodyEnv(Math.min(y,1.52),prev),0.004);const w=T.strap||0.006;
    for(const sd of [-1,1])shoulderBand(G,T.strap>0.01?m:md,bodyE,0.1-w*0.5,0.1+w*0.5,top-0.01,top+0.02,sd,0.003);
    G.add(mk(tube(vSamples(top-0.012,top+0.002,3,y=>addE(rf0(Math.min(y,top)),0.002)),{seg:72}),md));}
  /* print */
  const pr=P.print&&P.print!=='none'?P.print:null;
  if(T.print&&pr){
    if(pr==='logo')decal(G,rf0,FRONT-0.64,FRONT-0.36,1.255,1.31,'logo',c2,null,folds);
    else if(pr==='number'){decal(G,rf0,FRONT-0.45,FRONT+0.45,1.1,1.31,'number',c2,null,folds);decal(G,rf0,BACKA-0.45,BACKA+0.45,1.1,1.33,'number',c2,null,folds);}
    else decal(G,rf0,FRONT-0.62,FRONT+0.62,1.12,1.34,pr,c2,null,folds);
  }
  /* sleeves */
  let sleeveF=null;
  if(!sleeveless){
    const len=sleeve==='long'?Math.min(1.0,0.945+Math.max(0,SZ.sl)):sleeve==='rolled'?0.7:0.34+(F.sleeveAdd||0)+SZ.sl*0.5,se=Math.max(0.002,easeCap(F.se+SZ.d*0.7,0.03));
    sleeveF=t=>{if(t>len+1e-9)return null;let r=Math.max(armAt(t),sleeveEnv(t,prev))+se;if(F.drop&&t<0.25)r+=0.024*(1-t/0.25);
      if((T.rib||T.cuffs)&&sleeve==='long'&&t>len-0.07)r=Math.max(armAt(t),sleeveEnv(t,prev))+(T.cuffs?0.007:0.009);return r;};
    const elbow=(a,tt,s)=>{const e=Math.max(0,s.rx-armAt(s.t));return 1+(gauss(s.t-0.5,0.08)*0.3*e*Math.sin(s.t*55+a*1.5)*(0.6+0.4*Math.sin(a*2+1))+0.12*e*fbm(Math.cos(a)*2,s.t*6,Math.sin(a)*2))/s.rx;};
    for(const side of [-1,1]){
      G.add(mkMain(tube(aSamples(-0.06,len,64,side,sleeveF),{seg:40,mod:elbow}),m));
      if(sleeve==='rolled'){G.add(mk(tube(aSamples(len-0.05,len,5,side,t=>sleeveF(Math.min(t,len))+0.006+0.003*Math.sin(Math.PI*(t-len+0.05)/0.05)),{seg:40}),m));}
      else if(T.cuffs&&sleeve==='long'){G.add(mk(tube(aSamples(len-0.07,len,5,side,t=>sleeveF(len-0.01)+0.003+0.0015*Math.sin(Math.PI*clamp((t-len+0.07)/0.07,0,1))),{seg:40}),md));
        const P0=armPt(len-0.035,side),fr=armFrame(len-0.035,side),Pb=P0.clone().addScaledVector(fr.v.clone().multiplyScalar(-1).add(fr.u).normalize(),sleeveF(len-0.01)+0.0045);buttonAt(G,Pb,Pb.clone().sub(P0),0.0042,plain(shade(P.color,-0.22),.35));}
      else G.add(mk(tube(aSamples(len-0.025,len,4,side,t=>sleeveF(Math.min(t,len))+0.003*Math.sin(Math.PI*clamp((t-len+0.025)/0.025,0,1))+0.0015),{seg:40}),T.rib||T.trim?trim:m));
      if(!T.rib&&!T.cuffs&&sleeve!=='rolled'){const sm=aSamples(len-0.03,len-0.026,1,side,t=>sleeveF(len-0.03)+0.0012);G.add(mk(tube(sm,{seg:80,uRep:Math.round(TAU*sleeveF(len-0.03)/0.0095),vRep:1/0.004}),stitchMat(thread)));}
    }
  }
  LAYERS.push({torso:y=>(y>=hem-(T.tail&&!tuck?0.05:0)&&y<=top+0.005)?mulE(rf0(Math.min(y,top)),1.015):null,sleeve:sleeveF,gap:gapAny?vX:null});
}
