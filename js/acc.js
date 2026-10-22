'use strict';
/* =============== Fitme: akcesoria =============== */
const handSide=h=>h==='L'?1:-1;
function hatShell(G,mat,h,o={}){
  G.add(mk(surf(96,22,(u,v)=>{const ph=(o.ph0||0)+u*(o.span||TAU),ny0=hatLineNy(ph)+(o.lineAdd||0),th=v*Math.acos(clamp(ny0,-0.98,0.98));
    return headPt(th,ph,h*(o.tuck?1-o.tuck*smooth((v-0.8)/0.2):1)+(o.dome?o.dome*Math.pow(1-v,1.5):0)+(o.front?o.front*smooth(Math.sin(ph))*(1-v)*v*4:0),false);},{wrapU:!o.span,uRep:o.uRep||16,vRep:3,noAO:true}),mat));
}
function hatEdge(ph,h){return headPt(Math.acos(clamp(hatLineNy(ph),-0.98,0.98)),ph,h,false);}
function buildHat(G){
  const A=S.acc.cap,t=A.type;if(!t||t==='none')return;
  const c=A.color||'#1e1e1f',c2=A.color2||'#f4f1ea',hc=BC.headC,ry=BC.hd.ry,back=A.back&&(t==='baseball'||t==='trucker'),fwd=back?BACKA:FRONT;
  const H0=0.0085;
  switch(t){
    case 'baseball':case 'trucker':{
      const m=fabric('twill',c),mesh=fabric('mesh',t==='trucker'?c2:c);
      if(t==='trucker'){hatShell(G,m,H0,{dome:0.012,ph0:fwd-1.2,span:2.4});hatShell(G,mesh,H0-0.0005,{dome:0.012,ph0:fwd+1.2,span:TAU-2.4});}
      else hatShell(G,m,H0,{dome:0.01});
      for(let k=0;k<6;k++){const ph=fwd+k*Math.PI/3+Math.PI/6,pts=[];for(let i=0;i<=12;i++){const ny0=hatLineNy(ph),th=i/12*Math.acos(ny0);pts.push(headPt(th,ph,H0+0.01*Math.pow(1-i/12,1.5)+0.0012,false));}G.add(mk(stitchGeo(pts),stitchMat(shade(c,0.25))));}
      const top=headPt(0,0,H0+0.012,false),bt=mk(new THREE.SphereGeometry(0.008,14,10),m);bt.scale.y=0.45;bt.position.copy(top);G.add(bt);
      const brim=(off,mat)=>G.add(mk(surf(30,8,(u,v)=>{const ph=fwd+(u*2-1)*0.95,E=hatEdge(ph,H0+0.001),d=Math.abs(ph-fwd)/0.95,w=0.078*Math.pow(Math.max(0,Math.cos(Math.min(d,1)*Math.PI/2)),0.55)+0.004;
        const dir=V3(Math.cos(ph),0,Math.sin(ph)).lerp(V3(Math.cos(fwd),0,Math.sin(fwd)),0.55).normalize();return E.clone().addScaledVector(dir,w*v).add(V3(0,-0.012*v-0.016*d*d*v+off,0));},{noAO:true}),mat));
      brim(0.0015,m);brim(-0.0015,fabric('twill',shade(c,-0.15)));
      const ep=[];for(let i=0;i<=30;i++){const ph=fwd+(i/15-1)*0.95,E=hatEdge(ph,H0+0.001),d=Math.abs(ph-fwd)/0.95,w=0.078*Math.pow(Math.max(0,Math.cos(Math.min(d,1)*Math.PI/2)),0.55)+0.004,dir=V3(Math.cos(ph),0,Math.sin(ph)).lerp(V3(Math.cos(fwd),0,Math.sin(fwd)),0.55).normalize();ep.push(E.clone().addScaledVector(dir,w).add(V3(0,-0.012-0.016*d*d,0)));}
      G.add(mk(cordGeo(ep,0.0018,false,6,60),m));break;}
    case 'beanie':case 'fisherman':{
      const m=fabric(t==='beanie'?'knit':'rib',c);hatShell(G,m,H0+0.002,{dome:t==='beanie'?0.014:0.004,uRep:22});
      G.add(mk(surf(96,6,(u,v)=>{const ph=u*TAU,ny0=hatLineNy(ph),th0=Math.acos(ny0),th=th0-v*(t==='beanie'?0.36:0.3);return headPt(th,ph,0.016+0.003*Math.sin(Math.PI*v),false);},{wrapU:true,uRep:22,vRep:1,noAO:true}),fabric('rib',shade(c,-0.04))));break;}
    case 'kufi':{/* a brimless round cap, its edge drawn in close to the head (no bowl-like lip), with embroidered bands */
      const m=fabric('knit',c,'dots',shade(c,lumHex(c)<0.3?0.35:-0.25));hatShell(G,m,0.0062,{dome:0.003,uRep:26,tuck:0.25});
      for(const k of [0.25,0.6]){const pts=[];for(let i=0;i<=72;i++){const ph=i/72*TAU,ny0=hatLineNy(ph),th=Math.acos(ny0)*(1-k*0.45);pts.push(headPt(th,ph,0.0062+0.003*Math.pow(k*0.45,1.5)+0.0012,false));}G.add(mk(cordGeo(pts,0.0016,true,6,144),plain(c2,.5)));}
      {const pts=[];for(let i=0;i<=96;i++){const ph=i/96*TAU;pts.push(headPt(Math.acos(hatLineNy(ph))-0.004,ph,0.0062*0.75+0.0016,false));}G.add(mk(cordGeo(pts,0.002,true,8,192),fabric('rib',shade(c,-0.06))));}break;}
    case 'bucket':{const m=fabric('canvas',c);hatShell(G,m,H0+0.004,{dome:0.016});
      G.add(mk(surf(96,6,(u,v)=>{const ph=u*TAU,E=hatEdge(ph,H0+0.004);const r=V3(Math.cos(ph),0,Math.sin(ph));return E.clone().addScaledVector(r,0.058*v).add(V3(0,-0.032*v-0.004*Math.sin(ph*3)*v,0));},{wrapU:true,uRep:30,noAO:true}),m));
      for(const k of [0.35,0.7]){const pts=[];for(let i=0;i<=60;i++){const ph=i/60*TAU,E=hatEdge(ph,H0+0.004),r=V3(Math.cos(ph),0,Math.sin(ph));pts.push(E.clone().addScaledVector(r,0.058*k).add(V3(0,-0.032*k+0.0015,0)));}G.add(mk(stitchGeo(pts,true),stitchMat(shade(c,0.3))));}break;}
    case 'flat':{const m=fabric('wool',c,'houndstooth',shade(c,-0.3));hatShell(G,m,H0+0.002,{dome:0.004,front:0.02});
      G.add(mk(surf(24,5,(u,v)=>{const ph=FRONT+(u*2-1)*0.85,E=hatEdge(ph,H0+0.002),d=Math.abs(ph-FRONT)/0.85;return E.clone().add(V3(0,-0.006*v,(0.04*Math.cos(d*Math.PI/2)+0.003)*v));},{noAO:true}),m));break;}
    case 'beret':{const m=fabric('wool',c);hatShell(G,m,H0,{dome:0.004});const b=mk(new THREE.SphereGeometry(1,40,20),m);b.scale.set(0.125,0.038,0.118);b.position.copy(hc).add(V3(0.018,ry*0.8,-0.008));b.rotation.z=-0.22;G.add(b);
      const st=mk(new THREE.CylinderGeometry(0.003,0.004,0.012,8),m);st.position.copy(b.position).add(V3(-0.006,0.04,0));G.add(st);break;}
    case 'fedora':{const m=fabric('wool',c),band=fabric('satin',c2);const yE=ph=>hatEdge(ph,H0).y;
      const crownTop=hc.y+ry+0.045;
      G.add(mk(surf(96,10,(u,v)=>{const ph=u*TAU,E=hatEdge(ph,H0+0.006),y=lerp(E.y,crownTop-0.012*gauss(Math.cos(ph),0.4),v);const k=lerp(1,0.9,v);return V3(E.x*k,y,hc.z+(E.z-hc.z)*k);},{wrapU:true,uRep:18,noAO:true}),m));
      G.add(mk(surf(96,8,(u,v)=>{const ph=u*TAU,E=hatEdge(ph,H0+0.006),k=lerp(0.9,0,v);const y=crownTop-0.012*gauss(Math.cos(ph),0.4)-0.016*(1-Math.abs(v-0.5)*2)*gauss(Math.cos(ph),0.25)*v;return V3(E.x*k*(1-0.05*v),y-0.004*v,hc.z+(E.z-hc.z)*k);},{wrapU:true,noAO:true}),m));
      G.add(mk(surf(96,4,(u,v)=>{const ph=u*TAU,E=hatEdge(ph,H0+0.0065);return V3(E.x,lerp(E.y,E.y+0.025,v),E.z);},{wrapU:true,noAO:true}),band));
      G.add(mk(surf(96,6,(u,v)=>{const ph=u*TAU,E=hatEdge(ph,H0+0.006),r=V3(Math.cos(ph),0,Math.sin(ph)),side=Math.abs(Math.cos(ph));return E.clone().addScaledVector(r,0.06*v).add(V3(0,0.012*v*v*side-0.006*v*Math.max(0,Math.sin(ph)),0));},{wrapU:true,uRep:30,noAO:true}),m));break;}
  }
}
/* glasses: a frame front sized to the head (its end pieces sit at the temples), lenses with each style's own outline,
   rims as real parts (acetate: a moulded band round the lens with some depth; metal: a thin wire), a bridge, nose pads on
   metal frames, hinges and temples running back over the ear.
   o: lens outline, h: height / width, rim: acetate | metal | brow (acetate brow + wire below) | none | shield,
   rw: acetate band width, top: band wider at the top, lw: lens width against the head, wrap / tilt: radians */
const GL_SPEC={
  aviator:{o:'tear',h:0.86,rim:'metal',bridge:'double',pads:1,lw:1.06,wrap:0.1,dy:-0.003},
  round:{o:'round',h:1,rim:'metal',bridge:'keyhole',pads:1,lw:0.9,wrap:0.05},
  rect:{o:'rect',h:0.64,rim:'acetate',rw:0.0036,top:1.25,bridge:'saddle',lw:1,wrap:0.1},
  wayfarer:{o:'trap',h:0.78,rim:'acetate',rw:0.0048,top:1.7,bridge:'saddle',lw:1,wrap:0.08,tilt:0.06},
  clubmaster:{o:'club',h:0.78,rim:'brow',rw:0.0055,bridge:'club',pads:1,lw:1,wrap:0.08},
  cat:{o:'cat',h:0.7,rim:'acetate',rw:0.004,top:1.5,bridge:'saddle',lw:1.04,wrap:0.1},
  oval:{o:'oval',h:0.48,rim:'acetate',rw:0.0026,bridge:'bar',lw:0.86,wrap:0.12},
  oversize:{o:'square',h:0.9,rim:'acetate',rw:0.005,top:1.2,bridge:'saddle',lw:1.12,wrap:0.1,dy:-0.004},
  rimless:{o:'rect',h:0.62,rim:'none',bridge:'bar',pads:1,lw:0.95,wrap:0.08},
  shield:{rim:'shield',h:0.7,lw:1.1,wrap:0.3}
};
/* the top of the glasses' frame over the eyes (the same sizes as buildGlasses): a cap's brim has to clear it */
/* (cat-eye: its rim widens by half again at the upswept outer corners - a cap's brim cut into them) */
function glassesTopY(){const A=S.acc&&S.acc.glasses,t=A&&A.type,SP=GL_SPEC[t];if(!SP)return null;
  const hc=BC.headC,yc=hc.y+0.004+(SP.dy||0);if(SP.rim==='shield')return yc+0.038/2+0.004;
  const thE=Math.acos(clamp((yc-hc.y)/BC.hd.ry,-0.99,0.99)),hw=headPt(thE,0).x-hc.x,bh=t==='round'?0.0095:0.0085,rw=SP.rim==='acetate'||SP.rim==='brow'?SP.rw:0,ep=SP.rim==='metal'||SP.rim==='none'?0.004:0.0045;
  const Lw=(hw*0.88-bh-ep-rw*2)*SP.lw,Lh=Lw*SP.h;return yc+Lh/2+rw*(SP.top||1)*(t==='cat'?1.5:1)+(SP.rim==='brow'?0.004:0.0015);}
/* lens outlines: points round the lens, x from the nose (-1) to the temple (+1), y from -1 to 1 */
function glOutline(o,N=96){const pts=[],se=(a,n)=>{const c=Math.cos(a),s=Math.sin(a);return[Math.sign(c)*Math.pow(Math.abs(c),2/n),Math.sign(s)*Math.pow(Math.abs(s),2/n)];};
  for(let i=0;i<N;i++){const a=i/N*TAU;let x,y;
    switch(o){
      case 'round':case 'oval':[x,y]=[Math.cos(a),Math.sin(a)];break;
      case 'tear':{[x,y]=se(a,2.3);if(y>0)y*=0.82;else y*=1+0.32*(0.5-0.5*x);x+=0.06*Math.max(0,-y)*(0.5-0.5*x);break;}
      case 'trap':{[x,y]=se(a,3.4);x*=1+0.1*y;if(y<0&&x>0)y*=1-0.12*x;break;}
      case 'club':{[x,y]=se(a,3);x*=1+0.07*y;break;}
      case 'cat':{[x,y]=se(a,2.8);x*=1+0.1*y;y+=0.3*Math.max(0,x)*Math.pow(Math.max(0,y),0.6);if(y<0)y*=1-0.15*Math.max(0,x);break;}
      case 'square':[x,y]=se(a,4.2);break;
      default:[x,y]=se(a,5);}
    pts.push([x,y]);}
  let mx=0,my=0;for(const[x,y] of pts){mx=Math.max(mx,Math.abs(x));my=Math.max(my,Math.abs(y));}return pts.map(([x,y])=>[x/mx,y/my]);}
function glOffset(P,d){const n=P.length,out=[];for(let i=0;i<n;i++){const a=P[(i+n-1)%n],b=P[(i+1)%n];let tx=b[0]-a[0],ty=b[1]-a[1];const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;
  /* outward normal of a counter-clockwise loop */const w=typeof d==='function'?d(P[i]):d;out.push([P[i][0]+ty*w,P[i][1]-tx*w]);}return out;}
function glPlace(geo,M){geo.applyMatrix4(M);if(M.determinant()<0&&geo.index){const ix=geo.index.array;for(let t=0;t<ix.length;t+=3){const k=ix[t+1];ix[t+1]=ix[t+2];ix[t+2]=k;}}geo.computeVertexNormals();return geo;}
function buildGlasses(G){
  const A=S.acc.glasses,t=A.type,SP=GL_SPEC[t];if(!t||t==='none'||!SP)return;
  const hc=BC.headC,thAt=yy=>Math.acos(clamp((yy-hc.y)/BC.hd.ry,-0.99,0.99)),yc=hc.y+0.004+(SP.dy||0),thE=thAt(yc);
  const metalF=SP.rim==='metal'||SP.rim==='none',fm=metalF?plain(A.frame||'#c9a34a',.22,1,'gframe'):plain(A.frame||'#1b1a19',.3,0,'acet',{clearcoat:.7,clearcoatRoughness:.15});
  const wire=SP.rim==='brow'?plain(t==='clubmaster'?'#c9a34a':A.frame,.22,1,'gframe'):fm;
  const lc=A.lens||'#151515',clear=lumHex(lc)>0.8;
  let lm=matCache.get('lens|'+lc);
  if(!lm){lm=new THREE.MeshPhysicalMaterial({color:lin(lc),transparent:true,opacity:clear?0.16:0.8,roughness:0.04,metalness:0.15,clearcoat:1,clearcoatRoughness:0.03,envMapIntensity:1.6,side:THREE.DoubleSide,depthWrite:false});lm.userData.noShadow=true;matCache.set('lens|'+lc,lm);}
  /* the face at eye level: the point of the head surface at a given x (binary search round the side of the head) */
  const face=x=>{let lo=0,hi=FRONT;const xs=headPt(thE,0).x-hc.x;if(x>=xs)return headPt(thE,0);for(let i=0;i<24;i++){const m=(lo+hi)/2;if(headPt(thE,m).x-hc.x>x)lo=m;else hi=m;}return headPt(thE,(lo+hi)/2);};
  const hw=headPt(thE,0).x-hc.x,bh=t==='round'?0.0095:0.0085,rw=SP.rim==='acetate'||SP.rim==='brow'?SP.rw:0,ep=metalF?0.004:0.0045;
  const Lw=(hw*0.88-bh-ep-rw*2)*SP.lw,Lh=Lw*SP.h,cx=bh+rw+Lw/2;
  const paths=[],tr=metalF?0.0012:0.0021,hinge=[];
  if(SP.rim==='shield')return buildShield(G,SP,yc,hw,face,fm,lm,tr,paths,hinge,thAt);
  const O=glOutline(SP.o);
  const local=O.map(([x,y])=>[x*Lw/2,y*Lh/2]);
  for(const sd of [-1,1]){
    /* lens frame: centre in front of the face, turned with it (wrap) and tilted (pantoscopic) */
    const fc=face(cx),M=new THREE.Matrix4(),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(SP.tilt!=null?SP.tilt:0.1,sd*(SP.wrap+0.06),0,'YXZ'));
    let zc=fc.z+0.008;
    const mkM=()=>M.compose(V3(hc.x+sd*cx,yc,zc),q,V3(sd,1,1));mkM();
    /* clear of the face everywhere (the brows and cheeks of the egg are round) */
    for(let it=0;it<4;it++){let worst=0;const v=new THREE.Vector3();for(const[x,y] of glOffset(local,rw+0.001)){v.set(x,y,-0.003).applyMatrix4(M);
        const r=headRAt(v.y,Math.atan2(v.z-hc.z,v.x-hc.x));if(r==null)continue;const d=Math.hypot(v.x-hc.x,v.z-hc.z)-r;if(d<0.0035)worst=Math.max(worst,0.0035-d);}
      if(worst<=0)break;zc+=worst;mkM();}
    const W=(x,y,z)=>V3(x,y,z).applyMatrix4(M);
    /* lens */
    const shp=new THREE.Shape(local.map(([x,y])=>new THREE.Vector2(x,y)));
    if(SP.rim==='none'){const lg=new THREE.ExtrudeGeometry(shp,{depth:0.0016,bevelEnabled:true,bevelThickness:0.0003,bevelSize:0.0003,bevelSegments:1,curveSegments:4});lg.translate(0,0,-0.0008);G.add(mk(glPlace(lg,M),lm));}
    else G.add(mk(glPlace(new THREE.ShapeGeometry(shp,4),M),lm));
    /* rim */
    if(SP.rim==='metal'){const ring=glOffset(local,0.0006).map(([x,y])=>W(x,y,0));G.add(mk(cordGeo(ring,0.00115,true,8,140),fm));}
    else if(SP.rim==='acetate'||SP.rim==='brow'){
      const top=SP.top||1,wOf=SP.rim==='brow'?(p=>0.0006+rw*smooth((p[1]/(Lh/2)+0.15)/0.45)):(p=>rw*(1+(top-1)*smooth(p[1]/(Lh/2)))*(t==='cat'?1+0.5*smooth(p[0]/(Lw/2))*smooth(p[1]/(Lh/2)):1));
      const outer=glOffset(local,wOf),sh2=new THREE.Shape(outer.map(([x,y])=>new THREE.Vector2(x,y)));sh2.holes.push(new THREE.Path(local.slice().reverse().map(([x,y])=>new THREE.Vector2(x,y))));
      const D=0.0042,rg=new THREE.ExtrudeGeometry(sh2,{depth:D,bevelEnabled:true,bevelThickness:0.0007,bevelSize:0.0006,bevelSegments:2,curveSegments:4});rg.translate(0,0,-D*0.6);G.add(mk(glPlace(rg,M),fm));
      if(SP.rim==='brow'){
        const off=glOffset(local,0.0005),arc=[];for(const[x,y] of off)if(y<Lh*0.2)arc.push([x,y,(Math.atan2(y,x)-Math.PI/2+2*TAU)%TAU]);arc.sort((a,b)=>a[2]-b[2]);
        G.add(mk(cordGeo(arc.map(([x,y])=>W(x,y,0)),0.0009,false,6,80),wire));}}
    /* reference points on the rim: inner top (bridge), inner lower (pads), outer top (end piece) */
    const pick=(fx,fy)=>{let best=null,bs=-9;for(const[x,y] of glOffset(local,rw*0.6+0.0005)){const s2=fx*x/(Lw/2)+fy*y/(Lh/2);if(s2>bs){bs=s2;best=[x,y];}}return best;};
    const inTop=pick(-1,0.75),inLow=pick(-1,-0.35),outTop=pick(1,0.55),topMid=pick(-0.35,1);
    hinge.push({sd,inTop:W(inTop[0],inTop[1],0),inLow:W(inLow[0],inLow[1],0),outTop:W(outTop[0],outTop[1],0),topMid:W(topMid[0],topMid[1],0)});}
  const [L,R]=hinge;
  /* bridge */
  const arch=(a,b,up,fw,r,m)=>{const mid=a.clone().lerp(b,0.5).add(V3(0,up,fw));G.add(mk(cordGeo([a,a.clone().lerp(mid,0.55).add(V3(0,up*0.25,0)),mid,b.clone().lerp(mid,0.55).add(V3(0,up*0.25,0)),b],r,false,8,30),m));};
  if(SP.bridge==='saddle')arch(L.inTop,R.inTop,0.0015,0.001,rw*0.7,fm);
  else if(SP.bridge==='bar')arch(L.inTop,R.inTop,0.0005,0.0008,0.0011,fm);
  else if(SP.bridge==='keyhole')arch(L.inTop,R.inTop,0.0045,0.001,0.0011,fm);
  else if(SP.bridge==='double'){arch(L.inTop,R.inTop,0.002,0.001,0.0011,fm);arch(L.topMid,R.topMid,0.0006,0.001,0.001,fm);}
  else if(SP.bridge==='club'){arch(L.topMid,R.topMid,0.0012,0.001,rw*0.45,fm);arch(L.inTop,R.inTop,0.003,0.001,0.0009,wire);}
  /* nose pads on metal frames: small clear pads on wire arms against the sides of the nose */
  if(SP.pads){const pm=plain('#e9eef2',0.2,0,'lens',{transparent:true,opacity:0.55});
    for(const H of hinge){const fp=face(bh+0.002),pad=V3(hc.x+H.sd*(bh+0.0025),yc-0.004,fp.z+0.0045);
      G.add(mk(cordGeo([H.inLow,H.inLow.clone().lerp(pad,0.5).add(V3(0,0.0015,0)),pad],0.0005,false,4,10),SP.rim==='brow'?wire:fm));
      const pd=mk(new THREE.SphereGeometry(0.004,10,8),pm);pd.scale.set(0.45,1,0.3);pd.position.copy(pad);pd.rotation.y=H.sd*0.5;G.add(pd);}}
  /* end pieces and hinges: from the rim's outer top to the side of the head, the temples start there */
  for(const H of hinge){const sd=H.sd,o=H.outTop,hp=V3(hc.x+sd*(hw+tr+0.003),o.y,o.z-0.009);
    /* end piece: from the rim's outer top a little back and out to the hinge, which sits just clear of the widest part of
       the head (a hinge further in sent the temple through the side of the head) */
    const e1=o.clone().add(V3(sd*0.0015,0,-0.003));
    G.add(mk(cordGeo([o,e1,e1.clone().lerp(hp,0.5).add(V3(sd*0.0008,0,0.0008)),hp],metalF?0.0011:Math.max(0.0016,rw*0.5),false,8,16),fm));
    const hg=mk(new THREE.BoxGeometry(0.0035,0.0045,0.006),metalF?fm:plain('#c0c3c7',.25,1,'gframe'));hg.position.copy(hp).add(V3(0,0,-0.002));hg.rotation.y=sd*0.15;G.add(hg);
    paths.push(glTemple(G,hp,sd,yc,tr,thAt,fm));}
  hairOverTemples(G,paths,tr);
}
/* temple: straight back along the side of the head, just clear of it, then over and behind the ear */
/* head radius (horizontal, from the head axis) in a real direction at a height: headPt's angle parameter is not the
   point's angle (the outline is a superellipse with a longer back), so search for it */
function headRAt(y,ang){const hc=BC.headC,ny=(y-hc.y)/BC.hd.ry;if(ny<-0.97||ny>0.999)return null;const th=Math.acos(ny),angOf=ph=>{const P=headPt(th,ph,0);return Math.atan2(P.z-hc.z,P.x-hc.x);};
  let lo=ang-0.7,hi=ang+0.7;for(let i=0;i<26;i++){const m=(lo+hi)/2;if(wrapA(angOf(m)-ang)<0)lo=m;else hi=m;}const P=headPt(th,(lo+hi)/2,0);return Math.hypot(P.x-hc.x,P.z-hc.z);}
function glTemple(G,h0,sd,yc,tr,thAt,m){const hc=BC.headC,side=sd>0?0:Math.PI,bk=-sd*1,a0=Math.atan2(h0.z-hc.z,h0.x-hc.x),pts=[h0];
  /* straight along the side of the head to just above the ear (a little behind the side point), height easing to eye level */
  const aE=side+bk*0.14;for(let k=1;k<=8;k++){const t=k/8,ph=lerp(a0,aE,t),yy=lerp(h0.y,yc+0.002,smooth(t));pts.push(headPt(thAt(yy),ph,tr+0.0012));}
  /* the bend behind the ear: a quarter turn down over ~3 cm */
  for(let k=1;k<=5;k++){const t=k/5,ph=aE+bk*(0.14+0.2*Math.sin(t*Math.PI/2)),yy=yc+0.002-0.028*(1-Math.cos(t*Math.PI/2));pts.push(headPt(thAt(yy),ph,tr+0.0012-0.0004*t));}
  /* never inside the head: the side of the skull bulges out past the hinges (the temple sank into it there) */
  const c=new THREE.CatmullRomCurve3(pts,false,'centripetal'),P2=c.getSpacedPoints(40);
  for(const p of P2){const r=headRAt(p.y,Math.atan2(p.z-hc.z,p.x-hc.x));if(r==null)continue;const d=Math.hypot(p.x-hc.x,p.z-hc.z),need=r+tr+0.0012;if(d<need){const k=need/d;p.x=hc.x+(p.x-hc.x)*k;p.z=hc.z+(p.z-hc.z)*k;}}
  pts.length=0;pts.push(...P2);
  G.add(mk(cordGeo(pts,tr,false,8,64),m));
  /* temple tip (a slightly thicker cover behind the ear) */
  G.add(mk(cordGeo(pts.slice(-4),tr*1.3,false,8,14),m));return pts;}
/* sport shield: one wrap-around lens across both eyes, a top bar and a nose piece */
function buildShield(G,SP,yc,hw,face,fm,lm,tr,paths,hinge,thAt){const hc=BC.headC,W2=hw*0.92,Hh=0.038,Rw=0.085,fc=face(0),zc=fc.z+0.014;
  const top=u=>0.5*Hh*(0.92+0.08*Math.cos(u*Math.PI))+0.002,bot=u=>{const a=Math.abs(u);return -0.5*Hh*(0.5+0.5*Math.pow(Math.sin(Math.min(1,a*1.6)*Math.PI/2),0.8))*(1-0.55*smooth((a-0.72)/0.28))+0.005*gauss(a,0.11);};
  /* (the wrap-round ends kept 5 mm off the temples: the arc of the shield cut into the sides of the head) */
  const at=(u,y)=>{const x=u*W2,ang=x/Rw,P=V3(hc.x+Rw*Math.sin(ang),yc+y,zc-Rw*(1-Math.cos(ang))-0.004*y/Hh);
    const dx=P.x-hc.x,dz=P.z-hc.z,r=Math.hypot(dx,dz),hr=headHorizR(P.y,Math.atan2(dz,dx));if(hr!=null&&r<hr+0.005){const k=(hr+0.005)/r;P.x=hc.x+dx*k;P.z=hc.z+dz*k;}return P;};
  G.add(mk(surf(48,10,(u,v)=>{const uu=u*2-1;return at(uu,lerp(bot(uu),top(uu),v));},{noAO:true}),lm));
  const bar=[];for(let i=0;i<=40;i++){const u=i/20-1;bar.push(at(u,top(u)+0.0012));}G.add(mk(cordGeo(bar,0.0022,false,8,80),fm));
  const nb=[at(-0.09,bot(-0.09)+0.004),at(0,bot(0)+0.006).add(V3(0,0,0.002)),at(0.09,bot(0.09)+0.004)];G.add(mk(cordGeo(nb,0.0018,false,6,16),fm));
  for(const sd of [-1,1]){const e=at(sd,top(sd)-0.004);paths.push(glTemple(G,e,sd,yc,tr*1.3,thAt,fm));}
  hairOverTemples(G,paths,tr*1.3);}
function hairOverTemples(G,paths,tr){const hair=[];G.traverse(o=>{if(o.isMesh&&o.userData.ctx==='hair')hair.push(o);});if(!hair.length)return;
  const hc=BC.headC,Q=[];for(const pts of paths){const c=new THREE.CatmullRomCurve3(pts);for(const p of c.getSpacedPoints(80))Q.push(p);}
  let y0=9,y1=-9;for(const q of Q){y0=Math.min(y0,q.y);y1=Math.max(y1,q.y);}
  const R=0.014,v=new THREE.Vector3(),inv=new THREE.Matrix4();G.updateMatrixWorld(true);
  for(const o of hair){const g=o.geometry,p=g.attributes.position;if(!p)continue;inv.copy(o.matrixWorld).invert();let ch=false;
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(v.y<y0-R||v.y>y1+R)continue;
      let bd=R,bq=null;for(const q of Q){const d=v.distanceTo(q);if(d<bd){bd=d;bq=q;}}if(!bq)continue;
      const rw=v.distanceTo(hc),rq=bq.distanceTo(hc)+tr+0.0025,w=1-smooth(bd/R);if(rw>=rq||w<=0)continue;
      const k=(rw+(rq-rw)*w)/rw;v.set(hc.x+(v.x-hc.x)*k,hc.y+(v.y-hc.y)*k,hc.z+(v.z-hc.z)*k).applyMatrix4(inv);p.setXYZ(i,v.x,v.y,v.z);ch=true;}
    if(ch){p.needsUpdate=true;if(!g.userData.keepNormals)g.computeVertexNormals();}}}
function wristR(t,side){return armAt(t)+0.0028;}
function buildWatch(G){
  const A=S.acc.watch,t0=A.type;if(!t0||t0==='none')return;
  const side=handSide(A.hand),t=0.972,R=wristR(t,side),g=localGroup(armMatrix(t,side)),metal=metalMat(A.metal);
  g.userData.watchGroup=true;
  const strapM=A.strap==='metal'?metal:A.strap==='nato'?fabric('twill','#55583a','breton','#26304a'):A.strap==='rubber'?plain('#1b1a19',.7,0,'rubber'):plain(A.strap==='black'?'#151413':'#5a3a24',0.55,0,'strap',{clearcoat:.25,bumpMap:weaveTex('leather'),bumpScale:.004});
  const wide=t0==='digital'||t0==='smart'?2.5:2.1;
  if(A.strap==='metal'){for(let i=0;i<28;i++){const a=i/28*TAU,l=mk(new THREE.BoxGeometry(0.008,0.02,0.004),metal);l.position.set(Math.cos(a)*(R+0.001),0,Math.sin(a)*(R+0.001));l.rotation.y=-a+Math.PI/2;g.add(l);}}
  else{const sg=new THREE.TorusGeometry(R,0.0045,10,48);sg.rotateX(Math.PI/2);const s=mk(sg,strapM);s.scale.set(1,wide,1);g.add(s);}
  const dialM=plain(A.dial||'#f1ece2',0.25,0,'dial',{clearcoat:1});
  let face;
  if(t0==='square'||t0==='digital'||t0==='smart'){const dims=t0==='square'?[0.0075,0.034,0.026]:t0==='smart'?[0.011,0.04,0.034]:[0.009,0.036,0.03];
    face=mk(new THREE.BoxGeometry(...dims),t0==='square'?metal:plain('#1b1b1c',0.45,0.2,'dig'));
    const scr=mk(new THREE.BoxGeometry(0.001,dims[1]*0.8,dims[2]*0.8),t0==='square'?dialM:plain(t0==='smart'?'#0d0f12':'#9aa58a',0.15,0,'scr',{clearcoat:1}));scr.position.x=dims[0]/2;face.add(scr);}
  else{const r=t0==='diver'?0.02:0.017,fg=new THREE.CylinderGeometry(r,r,t0==='diver'?0.011:0.008,40);fg.rotateZ(Math.PI/2);face=mk(fg,metal);
    const dial=new THREE.CylinderGeometry(r*0.8,r*0.8,0.002,40);dial.rotateZ(Math.PI/2);const dm=mk(dial,dialM);dm.position.x=0.0055;face.add(dm);
    for(let h=0;h<12;h++){const a=h/12*TAU,ix=mk(new THREE.BoxGeometry(0.0008,0.002,0.0008),metal);ix.position.set(0.0066,Math.cos(a)*r*0.68,Math.sin(a)*r*0.68);face.add(ix);}
    for(let h=0;h<2;h++){const hand=mk(new THREE.BoxGeometry(0.001,h?0.012:0.009,0.0012),metal);hand.position.set(0.0068,h?0.004:0,h?0:0.003);hand.rotation.x=h?0:1.1;face.add(hand);}
    if(t0==='diver'){const bz=new THREE.TorusGeometry(r*0.9,0.0022,8,40);bz.rotateY(Math.PI/2);const bm=mk(bz,plain('#14161a',0.4,0.3,'bezel'));bm.position.x=0.006;face.add(bm);}
    const crown=mk(new THREE.CylinderGeometry(0.0022,0.0022,0.004,10),metal);crown.rotation.x=Math.PI/2;crown.position.z=r+0.002;face.add(crown);}
  face.position.x=R+0.0055;g.add(face);G.add(g);
}
function buildBracelets(G){
  const A=S.acc.bracelet,t0=A.type;if(!t0||t0==='none')return;
  const side=handSide(A.hand),metal=metalMat(A.metal),n=clamp(Math.round(A.count||1),1,3);
  const W=S.acc.watch;let tb=lerp(0.978,0.72,clamp(A.pos||0,0,1));
  if(W.type!=='none'&&handSide(W.hand)===side&&Math.abs(tb-0.972)<0.035)tb=0.93;
  for(let k=0;k<n;k++){
    const t=tb-k*0.022,R=wristR(t,side)+0.002,g=localGroup(armMatrix(t,side));
    switch(t0){
      case 'chain':for(let i=0;i<30;i++){const a=i/30*TAU,l=mk(new THREE.TorusGeometry(0.0034,0.0011,6,10),metal);l.position.set(Math.cos(a)*R,0,Math.sin(a)*R);l.rotation.y=-a-Math.PI/2;if(i%2)l.rotateX(Math.PI/2);g.add(l);}break;
      case 'beads':{const bm=plain(['#2a2522','#c9b48a','#7a3b2e'][k%3],0.3,0,'bead',{clearcoat:.8});for(let i=0;i<17;i++){const a=i/17*TAU,s=mk(new THREE.SphereGeometry(0.0062,14,10),i===0?metal:bm);s.position.set(Math.cos(a)*(R+0.002),0,Math.sin(a)*(R+0.002));g.add(s);}break;}
      case 'cuff':g.add(mk(new THREE.CylinderGeometry(R+0.002,R+0.002,0.012,48,1,true,0.4,TAU-0.8),metal));break;
      case 'cord':{const tg=new THREE.TorusGeometry(R,0.0022,8,48);tg.rotateX(Math.PI/2);g.add(mk(tg,plain('#4a2f1e',0.7,0,'cord')));const kn=mk(new THREE.SphereGeometry(0.004,10,8),plain('#4a2f1e',0.7,0,'cord'));kn.position.set(0,0,-R);g.add(kn);break;}
      case 'tennis':{const gm=plain('#ffffff',0.05,0,'gem',{clearcoat:1,sheen:1,sheenColor:lin('#dfe9ff')});for(let i=0;i<34;i++){const a=i/34*TAU,s=mk(new THREE.SphereGeometry(0.0026,10,8),gm);s.position.set(Math.cos(a)*R,0,Math.sin(a)*R);g.add(s);}const tg=new THREE.TorusGeometry(R,0.0012,6,48);tg.rotateX(Math.PI/2);g.add(mk(tg,metal));break;}
      case 'leather':{g.add(mk(new THREE.CylinderGeometry(R+0.001,R+0.001,0.016,48,1,true),plain('#1b1a19',0.5,0,'lband',{clearcoat:.2,bumpMap:weaveTex('leather'),bumpScale:.004})));const sn=mk(new THREE.CylinderGeometry(0.004,0.004,0.002,14),metal);sn.rotation.z=Math.PI/2;sn.position.x=R+0.002;g.add(sn);break;}
    }
    G.add(g);
  }
}
function buildRings(G){
  const A=S.acc.ring,t0=A.type;if(!t0||t0==='none')return;
  /* under full gloves the rings are not seen (they stood out of the glove's fingers) */
  const gl=S.acc.gloves&&S.acc.gloves.type;if(gl&&gl!=='none'&&gl!=='fingerless')return;
  const side=handSide(A.hand),metal=metalMat(A.metal),H=localGroup(armMatrix(1,side));
  const fingers={signet:[3],band:[2],stack:[0,1,2],chunky:[1]}[t0]||[2];
  for(const i of fingers){const f=fingerSeg(i),P=f.A.clone().addScaledVector(f.d1,f.L1*0.55),r=f.r+0.0014;
    const ring=mk(new THREE.TorusGeometry(r,t0==='chunky'?0.0026:0.0013,8,24),metal);ring.position.copy(P);ring.quaternion.copy(qFromTo(VZ,f.d1));H.add(ring);
    if(t0==='signet'||t0==='chunky'){const top=mk(new THREE.CylinderGeometry(0.0045,0.0045,0.003,16),metal);top.position.copy(P).add(V3(0.0+r+0.001,0,0));top.rotation.z=Math.PI/2;H.add(top);}}
  G.add(H);
}
function buildNecklace(G){
  const A=S.acc.chain,t0=A.type;if(!t0||t0==='none')return;
  const metal=metalMat(A.metal),k=lerp(0.6,1.6,clamp(A.len!=null?A.len:0.5,0,1));
  if(t0==='choker'){const y=1.55,r=BC.neckR+0.004;const band=tube(vSamples(y-0.007,y+0.007,2,()=>({rx:r,rz:r*0.96,rzb:r*1.02}),0,0.004),{seg:48});G.add(mk(band,fabric('velvet','#141312')));
    const p=mk(new THREE.SphereGeometry(0.004,12,10),metal);p.position.set(0,y-0.012,r+0.006);G.add(p);return;}
  const make=(drop,pend)=>{
    const yb=NECK_Y-0.008,envN=bodyEnv(yb,LAYERS),rxN=Math.min(envN.rx,BC.neckR+0.03)+0.004,pts=[];
    for(let i=0;i<36;i++){const a=i/36*TAU,ca=Math.cos(a),sa=Math.sin(a),x=rxN*sa;
      if(ca>0){const y=yb-drop*ca*ca,e=frontEnv(y,LAYERS,x);pts.push(V3(x,y,frontZ(e,x)+0.004*ca+0.002));}
      else pts.push(V3(x,yb+0.012*(-ca),ca*(Math.min(zbk(envN),BC.neckR+0.03)*0.85+0.004)));}
    const curve=new THREE.CatmullRomCurve3(pts,true,'centripetal');
    if(t0==='pearls'){const pm=plain('#f6f1e7',0.22,0,'pearl',{clearcoat:1,sheen:.6,sheenColor:lin('#ffe9f0')});for(const p of curve.getSpacedPoints(48)){const s=mk(new THREE.SphereGeometry(0.0068,14,10),pm);s.position.copy(p);G.add(s);}}
    else if(t0==='cuban'){const n=130,ctr=new THREE.Vector3();for(let i=0;i<n;i++)ctr.add(curve.getPointAt(i/n));ctr.divideScalar(n);const out=new THREE.Vector3(),up=new THREE.Vector3(),M4=new THREE.Matrix4();
      /* cuban links lie flat on the chest: ring plane = chain tangent x outward direction */
      for(let i=0;i<n;i++){const p=curve.getPointAt(i/n),tn=curve.getTangentAt(i/n),l=mk(new THREE.TorusGeometry(0.0052,0.002,6,12),metal);l.position.copy(p);out.set(p.x-ctr.x,0,p.z-ctr.z).normalize();up.crossVectors(out,tn).normalize();out.crossVectors(tn,up);M4.makeBasis(tn,up,out);l.quaternion.setFromRotationMatrix(M4);l.rotateX(i%2?0.35:-0.35);l.scale.set(1,0.7,1);G.add(l);}}
    else G.add(mk(new THREE.TubeGeometry(curve,220,0.0016,6,true),metal));
    if(pend){const p=pts[0].clone(),c=new THREE.Group();c.position.set(p.x,p.y-0.004,p.z+0.003);
      if(pend==='cross'){const m1=mk(new THREE.BoxGeometry(0.011,0.05,0.004),metal);m1.position.y=-0.024;c.add(m1);const m2=mk(new THREE.BoxGeometry(0.032,0.01,0.004),metal);m2.position.y=-0.014;c.add(m2);}
      else{const d=mk(new THREE.CylinderGeometry(0.013,0.013,0.003,28),metal);d.rotation.x=Math.PI/2;d.position.y=-0.015;c.add(d);const ring=mk(new THREE.TorusGeometry(0.0105,0.0012,6,24),metal);ring.position.set(0,-0.015,0.002);c.add(ring);}
      G.add(c);}
  };
  if(t0==='layered'){make(0.06*k);make(0.12*k,'pendant');}
  else make({thin:0.1,cuban:0.07,cross:0.12,pendant:0.12,pearls:0.08}[t0]*k,t0==='cross'?'cross':t0==='pendant'?'pendant':null);
}
function buildEarrings(G){
  const A=S.acc.earrings,t0=A.type;if(!t0||t0==='none'||!S.hair)return;
  const metal=metalMat(A.metal),sides=A.side==='both'?[-1,1]:[A.side==='L'?1:-1];
  for(const sd of sides){const lobe=earPos(sd).add(V3(sd*0.004,-0.026,0.002));
    switch(t0){
      case 'stud':{const s=mk(new THREE.SphereGeometry(0.0032,12,10),metal);s.position.copy(lobe).add(V3(sd*0.004,0,0));G.add(s);break;}
      case 'hoopS':case 'hoopL':{const r=t0==='hoopS'?0.008:0.019,h=mk(new THREE.TorusGeometry(r,t0==='hoopS'?0.0013:0.0016,8,32),metal);h.position.copy(lobe).add(V3(sd*0.004,-r+0.002,0));h.rotation.y=Math.PI/2;G.add(h);break;}
      case 'drop':{const a=lobe.clone().add(V3(sd*0.004,0,0)),b=a.clone().add(V3(0,-0.02,0));G.add(mk(cordGeo([a,b],0.0007),metal));const s=mk(new THREE.SphereGeometry(0.0045,12,10),plain('#f6f1e7',0.22,0,'pearl',{clearcoat:1}));s.position.copy(b);G.add(s);break;}
      case 'cross':{const a=lobe.clone().add(V3(sd*0.004,-0.004,0)),c=new THREE.Group();c.position.copy(a);const m1=mk(new THREE.BoxGeometry(0.0022,0.016,0.0022),metal);m1.position.y=-0.009;c.add(m1);const m2=mk(new THREE.BoxGeometry(0.0022,0.0022,0.01),metal);m2.position.y=-0.005;c.add(m2);G.add(c);break;}
    }}
}
/* wallet chain: from the front belt loop on its side in a loose U along the hip to the back pocket, where the wallet
   sits with only its top edge showing above the pocket opening */
function buildWalletChain(G){
  const A=S.acc.wallet,t0=A.type;if(!t0||t0==='none'||!PANTS)return;
  const sd=A.side==='L'?1:-1,metal=metalMat(A.metal),wy=PANTS.waistY,env=y=>bodyEnv(y,LAYERS.slice(0,1));
  const aF=sd>0?FRONT-0.5:FRONT+0.5,aB=sd>0?BACKA+0.56:BACKA-0.56,yF=wy-0.014,yB=wy-0.1+0.012;
  const chain=sag=>{const pts=[];for(let i=0;i<=30;i++){const t=i/30,aa=sd>0?aF-(aF-aB)*t:aF+(aB-aF)*t,y=lerp(yF,yB,t)-sag*Math.pow(Math.sin(Math.PI*t),1.2);
      pts.push(envPt(env(y),aa,y,0.006+0.008*Math.sin(Math.PI*t)));}
    const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal'),L=curve.getLength(),n=Math.round(L/0.0105);
    for(let i=0;i<=n;i++){const p=curve.getPointAt(i/n),tn=curve.getTangentAt(i/n),l=mk(new THREE.TorusGeometry(0.0062,0.0017,8,14),metal);l.position.copy(p);/* a link lies along the chain (ring plane holds the tangent), every other one turned a quarter about it */l.quaternion.setFromUnitVectors(VX,tn);if(i%2)l.rotateX(Math.PI/2);l.scale.set(1,0.66,1);G.add(l);}
    return pts;};
  const p=chain(0.1);if(t0==='double')chain(0.17);
  /* clip on the belt loop, swivel at the wallet end */
  const clip=mk(new THREE.BoxGeometry(0.008,0.026,0.005),metal);clip.position.copy(envPt(env(wy-0.006),aF,wy-0.006,0.006));clip.quaternion.copy(qFromTo(VZ,radialN(clip.position)));G.add(clip);
  const wc=envPt(env(yB-0.004),aB,yB-0.004,0.005),w=mk(new THREE.BoxGeometry(0.088,0.018,0.007),plain('#2a1d16',.55,0,'wallet',{clearcoat:.2}));w.position.copy(wc);
  w.quaternion.copy(qFromTo(VZ,radialN(wc)));G.add(w);
}
function roundBox(w,h,d,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new THREE.ExtrudeGeometry(s,{depth:d-0.01,bevelEnabled:true,bevelThickness:0.005,bevelSize:0.005,bevelSegments:3,curveSegments:8});g.translate(0,0,-(d-0.01)/2);return g;}
function strapRing(G,mat,yc,A,aTop,w,off=0.008){
  /* (across the sides the strap runs under the arm, close to the trunk: the envelope of loose clothes reaches out over the
     arms there and the strap wrapped round the outside of the sleeve; it is pushed out over the fitted clothes later, the
     part under the arm hidden) */
  const pts=[],sides=[];for(let i=0;i<=64;i++){const a=aTop+i/64*TAU,y=yc+A*Math.cos(a-aTop);const e=addE(bodyEnv(y,LAYERS),off),eb=bodyEnv(y,null);e.rx=Math.min(e.rx,eb.rx+0.02+off);const P=envPt(e,a,y,0);pts.push(P);}
  for(let i=0;i<=64;i++){const t=pts[Math.min(64,i+1)].clone().sub(pts[Math.max(0,i-1)]).normalize(),n=radialN(pts[i]);sides.push(new THREE.Vector3().crossVectors(t,n).normalize());}
  const rb=mk(ribbon(pts,sides,w,{uRep:1}),mat);hideInArms(rb.geometry);G.add(rb);return pts;
}
/* the part of a strap that runs under the arm (below the armpit, not over the shoulder) is hidden inside the arm / sleeve (from the side the arm covers it; left in
   place it poked out through the sleeve in pieces) */
function hideInArms(g){const p=g.attributes.position,n=p.count,inA=new Uint8Array(n),ax=[];
  for(const sd of [-1,1])for(let k=0;k<=40;k++){const t=k/40*0.55;ax.push([armPt(t,sd),Math.max(armAt(t),sleeveEnv(t,LAYERS))+0.004]);}
  const yA=BC.shY-0.09;for(let i=0;i<n;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y>yA)continue;for(const [A,r] of ax){const dx=x-A.x,dy=y-A.y,dz=z-A.z;if(dx*dx+dy*dy+dz*dz<r*r){inA[i]=1;break;}}}
  if(!g.index)return;const ix=g.index.array,keep=[];for(let t=0;t<ix.length;t+=3)if(!(inA[ix[t]]||inA[ix[t+1]]||inA[ix[t+2]]))keep.push(ix[t],ix[t+1],ix[t+2]);if(keep.length<ix.length)g.setIndex(keep);}
function buildBag(G0){
  /* everything of the bag goes into one group: it is pushed outside the finished clothes afterwards */
  const G=new THREE.Group();G.userData.bagGroup=true;G0.add(G);
  const A=S.acc.bag,t0=A.type;if(!t0||t0==='none')return;
  const col=A.color||'#1e1e1f',lm=plain(col,.5,0,'bag',{clearcoat:.25,bumpMap:weaveTex('leather'),bumpScale:.004}),nm=fabric('nylon',col),web=fabric('canvas',shade(col,-0.15)),metal=metalMat('steel');
  const placeBox=(geo,mat,a,y,out)=>{const e=bodyEnv(y,LAYERS),P=envPt(e,a,y,out),b=mk(geo,mat);b.position.copy(P);b.quaternion.copy(qFromTo(VZ,radialN(P)));G.add(b);return b;};
  if(t0==='crossbody'||t0==='sling'){
    const sling=t0==='sling';strapRing(G,web,sling?1.31:1.22,sling?0.18:0.27,Math.PI,sling?0.034:0.028);
    const a=sling?FRONT-0.28:0.35,y=sling?1.16:0.97,geo=sling?roundBox(0.22,0.085,0.06,0.03):roundBox(0.2,0.15,0.055,0.018);
    const b=placeBox(geo,sling?nm:lm,a,y,sling?0.036:0.034);b.userData.bagBody=true;
    const z=mk(cordGeo([V3(-0.09,sling?0.03:0.06,0.03),V3(0.09,sling?0.03:0.06,0.03)],0.0016),metal);b.add(z);
    if(!sling){const fl=mk(roundBox(0.2,0.08,0.008,0.01),lm);fl.position.set(0,0.035,0.03);b.add(fl);}
  }else if(t0==='backpack'){
    const bodyE=y=>addE(bodyEnv(Math.min(y,1.52),LAYERS),0.006);
    for(const sd of [-1,1])shoulderBand(G,web,bodyE,0.085,0.125,1.14,1.24,sd,0.004);
    const yC=1.2,zb=zbk(bodyEnv(1.25,LAYERS))+0.075,bp=mk(roundBox(0.3,0.42,0.14,0.05),nm);bp.position.set(0,yC,-zb);bp.userData.bagBody=true;G.add(bp);
    const fp=mk(roundBox(0.24,0.18,0.05,0.03),nm);fp.position.set(0,yC-0.1,-zb-0.08);G.add(fp);
    G.add(mk(cordGeo([V3(-0.13,yC+0.15,-zb-0.072),V3(0,yC+0.2,-zb-0.075),V3(0.13,yC+0.15,-zb-0.072)],0.0016),metal));
    G.add(mk(cordGeo([V3(-0.05,yC+0.21,-zb+0.02),V3(0,yC+0.24,-zb+0.02),V3(0.05,yC+0.21,-zb+0.02)],0.005),web));
  }else if(t0==='tote'){
    /* a soft canvas tote on the right shoulder: it hangs against the back of the right hip, just behind the arm; wider at
       the bottom with a boxed base, thin at the open top (lining showing), two handles rising over the shoulder */
    const can=fabric('canvas',col),lin=plain(shade(col,-0.45),.85),yB=0.8,H=0.33,a=-2.3,yC=yB+H*0.45;
    const eC=addE(bodyEnv(yC,LAYERS),0.006),Pc=envPt(eC,a,yC,0),nC=radialN(Pc);nC.y=0;nC.normalize();
    const bag=new THREE.Group();bag.position.set(Pc.x,0,Pc.z);bag.rotation.y=Math.atan2(nC.x,nC.z);G.add(bag);
    /* cross-sections bottom to top: width (local x), depth (local z, the bag's back resting on the body), rounded box */
    const W=t=>lerp(0.3,0.27,t),D=t=>lerp(0.055,0.012,smooth(t))+0.008*Math.sin(Math.PI*Math.min(1,t*1.2)),sm=[];
    for(let k=0;k<=24;k++){const t=k/24,y=yB+H*t,cl=smooth(k/1.5);sm.push({c:V3(0,y,D(t)),rx:W(t)/2*lerp(0.6,1,cl),rz:D(t)*lerp(0.3,1,cl),rzb:D(t)*lerp(0.3,1,cl),n:lerp(3.4,2.6,t),u:VX,v:VZ,y});}
    sm.unshift({c:V3(0,yB-0.002,D(0)),rx:0.002,rz:0.002,rzb:0.002,n:2,u:VX,v:VZ,y:yB-0.002});
    const body=mk(tube(sm,{seg:56,mod:(ang,t,s)=>1+0.012*Math.sin(ang*5+s.y*30)*smooth(t*3)}),can);body.userData.bagBody=true;bag.add(body);
    /* the lining just inside the opening (faces turned inwards) and a hemmed rim */
    const ins=sm.slice(-6).map(q=>Object.assign({},q,{rx:q.rx-0.0025,rz:Math.max(0.002,q.rz-0.0025),rzb:Math.max(0.002,q.rzb-0.0025)}));
    const lg=tube(ins,{seg:56});{const ix=lg.index.array;for(let t=0;t<ix.length;t+=3){const q=ix[t+1];ix[t+1]=ix[t+2];ix[t+2]=q;}const nr=lg.attributes.normal;for(let i=0;i<nr.count;i++)nr.setXYZ(i,-nr.getX(i),-nr.getY(i),-nr.getZ(i));}
    const li=mk(lg,lin);li.userData.bagBody=true;bag.add(li);
    const top=sm[sm.length-1],rim=mk(tube([0,1].map(k=>({c:V3(0,top.y-0.012+0.012*k,top.c.z),rx:top.rx+0.0012,rz:top.rz+0.0012,rzb:top.rzb+0.0012,n:top.n,u:VX,v:VZ})),{seg:56}),fabric('canvas',shade(col,-0.08)));rim.userData.bagBody=true;bag.add(rim);
    /* the bag itself is rigid (as a piece of cloth it was re-seated vertex by vertex onto the clothes and came out pinched);
       it is moved out over the clothes as a whole (shBagsOut) */
    bag.traverse(q=>{if(q.isMesh)q.userData.ctx='none';});
    /* handles: on the outer wall a V from two points of the rim up over the top of the shoulder, on the inner wall the
       same (between the bag and the body); kept clear of the body and clothes */
    bag.updateMatrixWorld(true);
    /* over the top of the shoulder halfway between the neck and the shoulder point (out at the shoulder envelope they
       looped up off the deltoid) */
    let shTop=BC.shY+0.03;{const geo=bodyGeo(false),P=geo.attributes.position,AW=geo.userData.armw,xs=-BC.shX*0.62;for(let i=0;i<P.count;i++){if(AW&&AW[i]>0.3)continue;if(Math.abs(P.getX(i)-xs)<0.01&&Math.abs(P.getZ(i)+0.01)<0.03&&P.getY(i)<BC.shY+0.12&&P.getY(i)>shTop)shTop=P.getY(i);}}
    const sh=V3(-BC.shX*0.62,shTop+0.012+(LAYERS.length?0.006:0),-0.01);
    const clear=p=>{const e=addE(bodyEnv(Math.min(p.y,1.5),LAYERS),0.009),ang=Math.atan2(p.z,p.x),R=envR(e,ang),r=Math.hypot(p.x,p.z);if(r<R){p.x*=R/r;p.z*=R/r;}return p;};
    for(const wall of [1,-1]){const zw=top.c.z+wall*top.rz,A=V3(-0.075,top.y-0.004,zw).applyMatrix4(bag.matrixWorld),B=V3(0.075,top.y-0.004,zw).applyMatrix4(bag.matrixWorld);
      const mid=s0=>A.clone().lerp(sh,0.5).add(V3(0,0,0)).lerp(B.clone().lerp(sh,0.5),s0);
      const apex=sh.clone().add(V3(0,0.006,0.016*wall)),pts=[A,A.clone().lerp(apex,0.3),A.clone().lerp(apex,0.62),apex,B.clone().lerp(apex,0.62),B.clone().lerp(apex,0.3),B].map(clear);
      let pp=new THREE.CatmullRomCurve3(pts,false,'centripetal').getSpacedPoints(48).map(clear);
      for(let it=0;it<6;it++){pp=pp.map((p,k)=>k===0||k===pp.length-1?p:clear(p.clone().lerp(pp[k-1].clone().add(pp[k+1]).multiplyScalar(0.5),0.5)));}
      const hd=mk(cordGeo(pp,0.0058,false,8,60),fabric('canvas',shade(col,-0.08)));hd.userData.ctx='none';G.add(hd);}
  }
}
function buildScarf(G){
  const A=S.acc.scarf,t0=A.type;if(!t0||t0==='none')return;
  /* every piece of the scarf is tagged: once the clothes are fitted it is moved out over them (shScarfOut) */
  /* (not re-seated point by point with the cloth: that tore the hanging ends into shards; the ends are draped over the
     clothes already and shScarfOut lifts each piece clear of the fitted clothes as a whole) */
  const G0=G;G={add:o=>{o.userData.scarf=true;o.userData.ctx='none';G0.add(o);}};
  const m=fabric('wool',A.color,A.pattern||'solid',A.color2||'#26304a');
  const loose=t0==='long',y0=1.485,TH=0.0075;
  /* the wrap round the neck: two soft passes of the knitted band (the second a little higher and fuller, sagging to the
     other side), each a full rounded section swept round the neck - not a stiff ringed collar */
  const neckR=y=>{const nb=bodyEnv(Math.min(y,1.53),LAYERS);return Math.max(BC.neckR+0.012,Math.min(nb.rx,BC.neckR+0.035));};
  const pass=(yc,sag,aLow,rAdd,h,d)=>G.add(mk(surf(72,14,(u,v)=>{const a=u*TAU,y=yc+sag*Math.cos(a-aLow),r=neckR(y)+rAdd,b=v*TAU,cb=Math.cos(b),sb=Math.sin(b);
      /* a soft cross-section: fuller at the front (the knot of the two ends), a slight lumpiness of knit */
      const fr=Math.max(0,Math.sin(a)),k=1+0.25*fr+0.06*Math.sin(a*3+1),R=r+d*k*(1+cb)*0.5+0.002;
      return V3(Math.cos(a)*(R*1.04),y+h*k*sb*0.5,Math.sin(a)*(Math.sin(a)>=0?R:R*1.02));},{wrapU:true,uRep:14,vRep:2,noAO:true}),m));
  pass(y0+0.028,0.01,FRONT+0.5,0.002,0.05,0.022);
  pass(y0+0.05,0.014,FRONT-0.7,0.014,0.042,0.02);
  /* the hanging ends: cloth simulated like hair (each end a few columns kept side by side, falling over the chest and
     the coat, resting on them), then given the knit's thickness and a fringe */
  const ends=loose?[[-0.06,0.5],[0.055,0.4]]:[[-0.035,0.29]],W=loose?0.11:0.13,NC=9,nv=20,yTop=y0+0.032;
  const field=hairField(1.58,0.6);
  ends.forEach(([x0,len],ei)=>{const roots=[];
    /* (the top of each end starts inside the wrap, under its front, and comes out from under it) */
    for(let c=0;c<NC;c++){const x=x0+(c/(NC-1)-0.5)*W*0.8,r=neckR(yTop)+0.006,z=Math.sqrt(Math.max(0.0004,r*r-x*x))+0.004,p0=V3(x,yTop,z),p1=V3(x*1.04,yTop-len/nv,z+0.012);
      roots.push({p0,p1,ph:Math.atan2(z,x),len,bias:0,xt:x});}
    const cols=hairDrape(roots,nv,{field,thin:TH+0.004,thick:TH+0.004,bodyClr:TH+0.005,latK:1.03,pushZ:true,band:false,stiff:0.04});
    /* the sheet's two faces, its long edges rounded */
    const P=(c,j)=>cols[c][j],Nf=(c,j)=>{const a=P(Math.min(NC-1,c+1),j).clone().sub(P(Math.max(0,c-1),j)),b=P(c,Math.min(nv,j+1)).clone().sub(P(c,Math.max(0,j-1)));const n=b.cross(a).normalize();if(n.z<0)n.negate();return n;};
    /* soft lengthwise folds of the knit, growing as it hangs (the same on both faces) */
    const fold=(cf,j)=>0.0045*Math.sin(cf/(NC-1)*Math.PI*2.6+ei*1.7+j*0.08)*smooth(j/nv/0.35);
    const at=(s,j)=>{/* s round the section: 0..1 front left->right, 1..2 right edge, 2..3 back right->left, 3..4 left edge */
      const k=Math.floor(s)%4,f=s-Math.floor(s);
      if(k===0||k===2){const cf=(k===0?f:1-f)*(NC-1),c=Math.min(NC-2,Math.floor(cf)),t=cf-c,p=P(c,j).clone().lerp(P(c+1,j),t),n=Nf(c,j).lerp(Nf(c+1,j),t).normalize();return p.addScaledVector(n,(k===0?1:-1)*TH*0.5+fold(cf,j));}
      const c=k===1?NC-1:0,p=P(c,j).clone(),n=Nf(c,j),side=P(k===1?NC-1:0,j).clone().sub(P(k===1?NC-2:1,j)).normalize(),an=(k===1?f:1-f)*Math.PI;
      return p.addScaledVector(n,Math.cos(an)*TH*0.5+fold(c,j)).addScaledVector(side,Math.sin(an)*TH*0.45);};
    {const em=mk(surf(4*12,nv,(u,v)=>at(u*4,Math.round(v*nv)),{wrapU:true,uRep:3,vRep:Math.max(2,len/0.05),noAO:true}),m);em.userData.scarfEnd=ei+1;G.add(em);}
    /* the end: closed by a narrow band, a fringe of knotted tassels */
    const last=nv;for(let i=0;i<11;i++){const cf=i/10*(NC-1),c=Math.min(NC-2,Math.floor(cf)),t=cf-c,p=P(c,last).clone().lerp(P(c+1,last),t);
      const fr=mk(cordGeo([p,p.clone().add(V3(0.002*Math.sin(i*2+ei),-0.032-0.006*Math.sin(i*3.1),0.002))],0.0022),m);fr.userData.scarfEnd=ei+1;G.add(fr);}});
}
function buildTie(G){
  const A=S.acc.tie,t0=A.type;if(!t0||t0==='none')return;const TL=LAYERS_TOP||LAYERS;
  const m=fabric('satin',A.color,A.pattern||'solid',A.color2||'#7a3b2e'),y0=NECK_Y-0.025,yEnd=t0==='bow'?y0:(PANTS?PANTS.waistY+0.03:1.04);
  if(t0==='bow'){const e=frontEnv(y0,TL,0),z=frontZ(e,0)+0.012;for(const sd of [-1,1]){const l=mk(new THREE.SphereGeometry(1,16,12),m);l.scale.set(0.028,0.016,0.008);l.position.set(sd*0.026,y0,z);G.add(l);}const k=mk(new THREE.SphereGeometry(1,12,10),m);k.scale.set(0.009,0.012,0.008);k.position.set(0,y0,z+0.003);G.add(k);return;}
  const wMax=t0==='skinny'?0.052:0.084,pts=[],sides=[];
  for(let k=0;k<=24;k++){const y=lerp(y0-0.03,yEnd,k/24),e=frontEnv(y,TL,0);pts.push(V3(0,y,frontZ(e,0)+0.006));sides.push(V3(1,0,0));}
  const wf=v=>lerp(0.032,wMax,smooth(v*1.05))*(v>0.93?Math.max(0.05,1-(v-0.93)/0.07):1);
  G.add(mk(ribbon(pts,sides,wf,{cols:4,uRep:2}),m));
  const e=frontEnv(y0,TL,0),z=frontZ(e,0)+0.012,kn=mk(new THREE.CylinderGeometry(0.019,0.012,0.038,12),m);kn.position.set(0,y0-0.012,z);kn.scale.z=0.45;G.add(kn);
}
function buildAcc(G){buildHat(G);buildGlasses(G);buildWatch(G);buildBracelets(G);buildRings(G);buildEarrings(G);buildHeadband(G);buildGloves(G);
  /* pieces that lie on the clothes follow the same fit deformation as the fabric */
  MK_CTX='cloth';try{buildBandana(G);buildNecklace(G);
    /* a tie is worn on the shirt and a wallet chain on the trousers: they belong to that layer, so a sweater or a coat over
       them hides them (the tie lay on top of a crew-neck sweater, the chain on the front of a long coat) */
    MK_LAYER='bottom';buildWalletChain(G);MK_LAYER='top';buildTie(G);MK_LAYER='none';
    buildScarf(G);buildBag(G);}finally{MK_CTX='none';MK_LAYER='none';}}

/* =============== bandanas =============== */
function bandanaMat(A){return fabric('poplin',A.color||'#a3262a',A.pattern||'paisley',A.color2||'#f4f1ea');}
/* ring around the neck, sitting on whatever collar is worn */
function neckRing(y,add){const nb=bodyEnv(Math.min(y,1.56),LAYERS),n=torsoAt(Math.min(y,1.58));const base={rx:Math.min(nb.rx,n.rx+0.03),rz:Math.min(nb.rz,n.rz+0.03),rzb:Math.min(zbk(nb),zbk(n)+0.03),n:2.1};return addE(base,add);}
function buildBandana(G){
  const A=S.acc.bandana,t0=A.type;if(!t0||t0==='none')return;
  const m=bandanaMat(A),y0=1.51,y1=1.555,n0=G.children.length;
  if(t0==='tri'){
    /* folded band round the neck */
    G.add(mk(tube(vSamples(y0,y1,6,y=>neckRing(y,0.007+roundE(y,y0,y1,0.004))),{seg:64,mod:(a,t,s)=>1+0.025*Math.sin(a*7+s.y*30)}),m));
    /* triangle hanging over the chest, following the clothes */
    const top=y0+0.004,len=0.15,w0=0.105;
    G.add(mk(surf(18,16,(u,v)=>{const y=top-len*v,hw=w0*(1-v)*(1-0.15*v),x=(u*2-1)*hw,e=frontEnv(y,LAYERS,x),zz=frontZ(e,Math.min(Math.abs(x),e.rx*0.97));
      const fold=0.004*Math.sin(u*Math.PI*3+v*2)*v;return V3(x,y-0.012*Math.pow(Math.abs(u*2-1),2)*(1-v),zz+0.006+0.004*(1-v)+fold);},{noAO:true,uRep:1.5,vRep:1.5}),m));
    /* knot at the back */
    const kb=envPt(neckRing(y0+0.02,0.012),BACKA,y0+0.02,0);for(const sd of [-1,1]){const k=mk(new THREE.SphereGeometry(1,12,10),m);k.scale.set(0.014,0.011,0.009);k.position.copy(kb).add(V3(sd*0.01,0,-0.004));G.add(k);}
    for(const sd of [-1,1]){const p0=kb.clone().add(V3(sd*0.012,-0.006,-0.006));G.add(mk(ribbon([p0,p0.clone().add(V3(sd*0.012,-0.03,-0.004)),p0.clone().add(V3(sd*0.02,-0.055,-0.002))],[V3(1,0,0),V3(1,0,0),V3(1,0,0)],0.022,{cols:2}),m));}
  }else{
    /* rolled into a cord and knotted at the side */
    const yc=1.535;G.add(mk(tube(vSamples(yc-0.014,yc+0.014,8,y=>neckRing(y,0.008+0.009*Math.sin(Math.PI*(y-yc+0.014)/0.028))),{seg:64,mod:(a,t,s)=>1+0.05*Math.sin(a*9+s.y*60)}),m));
    const kp=envPt(neckRing(yc,0.022),-0.35,yc,0);const k=mk(new THREE.SphereGeometry(1,14,10),m);k.scale.set(0.018,0.015,0.014);k.position.copy(kp);G.add(k);
    for(const off of [-0.01,0.012]){const p0=kp.clone().add(V3(0.006,-0.008,off));G.add(mk(ribbon([p0,p0.clone().add(V3(0.014,-0.03,0.006)),p0.clone().add(V3(0.02,-0.06,0.01))],[V3(0,0,1),V3(0,0,1),V3(0,0,1)],0.024,{cols:2}),m));}
  }
  for(const o of G.children.slice(n0))o.userData.neckwear=1;
}
function buildHeadband(G){
  const A=S.acc.headband,t0=A.type;if(!t0||t0==='none')return;
  const m=bandanaMat(A),h=(S.hair.style==='none'||S.hair.style==='buzz')?0.004:0.011;
  if(t0==='forehead'){
    /* folded band: across the forehead, dipping under the back of the skull */
    const nyAt=(ph,w)=>{const f=0.5+0.5*Math.sin(ph);return lerp(-0.12,0.42,f)+w;};
    G.add(mk(surf(96,4,(u,v)=>{const ph=u*TAU,ny=nyAt(ph,(v-0.5)*0.24*(0.75+0.25*Math.sin(ph)));return headPt(Math.acos(clamp(ny,-0.98,0.98)),ph,h+0.002+0.002*Math.sin(Math.PI*v),false);},{wrapU:true,uRep:10,vRep:1,noAO:true}),m));
  }else{
    /* kerchief over the whole top of the head, hemmed along the hat line */
    hatShell(G,m,0.0075,{dome:0.004,uRep:6});
    const hem=[];for(let k=0;k<=96;k++){const ph=k/96*TAU;hem.push(hatEdge(ph,0.0085));}
    G.add(mk(cordGeo(hem,0.0026,true,6,160),m));
  }
  /* knot and tails at the back */
  const kp=headPt(Math.acos(-0.1),BACKA,h+0.01,false);
  for(const sd of [-1,1]){const k=mk(new THREE.SphereGeometry(1,12,10),m);k.scale.set(0.013,0.011,0.01);k.position.copy(kp).add(V3(sd*0.009,0,-0.003));G.add(k);}
  for(const sd of [-1,1]){const p0=kp.clone().add(V3(sd*0.01,-0.008,-0.006)),L=t0==='full'?0.09:0.07;
    G.add(mk(ribbon([p0,p0.clone().add(V3(sd*0.01,-L*0.5,-0.012)),p0.clone().add(V3(sd*0.016,-L,-0.016))],[V3(1,0,0),V3(1,0,0),V3(1,0,0)],t0==='full'?0.035:0.026,{cols:2}),m));}
}
/* =============== gloves: shaped on the mannequin's own hands =============== */
function buildGloves(G){
  const A=S.acc.gloves,t0=A.type;if(!t0||t0==='none')return;
  const SH=SHOES[S.shoes.type]||{},geo=bodyGeo(!!(S.shoes.type==='none'||SH.open||SH.low||SH.clog));
  const P=geo.attributes.position,N=geo.attributes.normal,I=geo.index.array,n=P.count;
  const leatherish=t0==='leather'||t0==='driving',th=leatherish?0.0016:t0==='work'?0.0032:0.0026;
  const mat=leatherish?plain(A.color,0.42,0,'glove',{clearcoat:0.25,clearcoatRoughness:0.5,bumpMap:weaveTex('leather'),bumpScale:0.003}):fabric(t0==='work'?'canvas':'knit',A.color);
  const dir=BC.W.clone().sub(BC.E).normalize(),cuffT=t0==='work'||t0==='knit'?0.9:0.955;
  const keep=new Uint8Array(n);
  for(let i=0;i<n;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i);if(Math.abs(x)<BC.shX*0.8||y>1.1)continue;const sd=x>=0?1:-1,q=armProj(x*sd,y,z);if(q.t<cuffT)continue;
    if(t0==='fingerless'){const s=(x*sd-BC.W.x)*dir.x+(y-BC.W.y)*dir.y+(z-BC.W.z)*dir.z;if(s>0.098)continue;}
    keep[i]=1;}
  const map=new Int32Array(n).fill(-1),pos=[],nor=[],idx=[],src=[];
  for(let t=0;t<I.length;t+=3){const a=I[t],b=I[t+1],c=I[t+2];if(!keep[a]||!keep[b]||!keep[c])continue;
    for(const v of [a,b,c])if(map[v]<0){map[v]=pos.length/3;src.push(v);const nx=N.getX(v),ny=N.getY(v),nz=N.getZ(v);pos.push(P.getX(v)+nx*th,P.getY(v)+ny*th,P.getZ(v)+nz*th);nor.push(nx,ny,nz);}
    idx.push(map[a],map[b],map[c]);}
  if(!idx.length)return;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  const uv=[];for(let i=0;i<pos.length/3;i++)uv.push(pos[i*3]/TILE*2,pos[i*3+1]/TILE*2);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);
  /* the glove keeps its body vertex ids: posed with the hand's own skin weights (a nearest-point lookup grabs the thigh the hand hangs next to) */
  g.userData.bodySrc=src;g.userData.bodySrcFeet=!!geo.userData.bodyFeet;g.userData.bodySrcN=n;
  G.add(mk(g,mat));
  /* cuff at the wrist opening */
  const cm=t0==='work'?fabric('rib',shade(A.color,0.15)):t0==='knit'?fabric('rib',shade(A.color,-0.08)):mat;
  for(const side of [-1,1]){const t1=cuffT+0.012,cuffR=t=>armAt(Math.min(t,1))+th+(t0==='work'?0.006:0.003)+0.0015*Math.sin(Math.PI*(t-cuffT)/(t1-cuffT+0.001));
    G.add(mk(tube(aSamples(cuffT-0.004,t1+(t0==='knit'?0.03:0),4,side,cuffR),{seg:36}),cm));
    if(t0==='driving'){const H=armMatrix(1,side);for(const[px,py] of [[0.012,-0.05],[-0.008,-0.05],[0.002,-0.075]]){const d=mk(new THREE.CircleGeometry(0.0045,14),plain('#15110e',0.6));d.position.set(px,py,0.024);d.applyMatrix4(H);G.add(d);}}}
}
