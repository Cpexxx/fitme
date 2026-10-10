'use strict';
/* =============== Fitme: akcesoria =============== */
const handSide=h=>h==='L'?1:-1;
function hatShell(G,mat,h,o={}){
  G.add(mk(surf(96,22,(u,v)=>{const ph=(o.ph0||0)+u*(o.span||TAU),ny0=hatLineNy(ph)+(o.lineAdd||0),th=v*Math.acos(clamp(ny0,-0.98,0.98));
    return headPt(th,ph,h+(o.dome?o.dome*Math.pow(1-v,1.5):0)+(o.front?o.front*smooth(Math.sin(ph))*(1-v)*v*4:0),false);},{wrapU:!o.span,uRep:o.uRep||16,vRep:3,noAO:true}),mat));
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
function buildGlasses(G){
  const A=S.acc.glasses,t=A.type;if(!t||t==='none')return;
  const hc=BC.headC,y=hc.y+0.004,zf=headPt(Math.acos(0.02),FRONT,0,false).z+0.009;
  const metalF=t==='aviator'||t==='round';
  const fm=metalF?plain(A.frame||'#c9a34a',.25,1,'gframe',{clearcoat:.4}):plain(A.frame||'#1b1a19',.25,0,'gacet',{clearcoat:.8});
  const lc=A.lens||'#151515',clear=lumHex(lc)>0.8;
  let lm=matCache.get('lens|'+lc);
  if(!lm){lm=new THREE.MeshPhysicalMaterial({color:lin(lc),transparent:true,opacity:clear?0.18:0.78,roughness:0.05,metalness:0.1,clearcoat:1,side:THREE.DoubleSide,depthWrite:false});lm.userData.noShadow=true;matCache.set('lens|'+lc,lm);}
  const shape=()=>{const s=new THREE.Shape();
    switch(t){
      case 'aviator':s.moveTo(-0.026,0.012);s.bezierCurveTo(-0.01,0.019,0.016,0.018,0.027,0.01);s.bezierCurveTo(0.03,-0.008,0.012,-0.024,-0.004,-0.024);s.bezierCurveTo(-0.02,-0.024,-0.029,-0.008,-0.026,0.012);break;
      case 'round':s.absellipse(0,0,0.021,0.021,0,TAU);break;
      case 'oval':s.absellipse(0,0,0.022,0.011,0,TAU);break;
      case 'cat':s.moveTo(-0.025,0.004);s.bezierCurveTo(-0.022,0.016,0.018,0.014,0.03,0.02);s.bezierCurveTo(0.03,0.002,0.02,-0.018,0.0,-0.017);s.bezierCurveTo(-0.018,-0.016,-0.027,-0.008,-0.025,0.004);break;
      case 'shield':s.moveTo(-0.034,0.014);s.lineTo(0.034,0.016);s.bezierCurveTo(0.037,-0.004,0.026,-0.02,0.006,-0.02);s.lineTo(-0.034,-0.016);s.closePath();break;
      default:{const w=0.026,h=0.017,r=0.006;s.moveTo(-w+r,-h);s.lineTo(w-r,-h);s.quadraticCurveTo(w,-h,w,-h+r);s.lineTo(w,h-r);s.quadraticCurveTo(w,h,w-r,h);s.lineTo(-w+r,h);s.quadraticCurveTo(-w,h,-w,h-r);s.lineTo(-w,-h+r);s.quadraticCurveTo(-w,-h,-w+r,-h);}
    }return s;};
  const thick=metalF?0.0018:0.0042;
  for(const sd of [-1,1]){
    const g=new THREE.Group();g.position.set(sd*0.034,y,zf-0.006);g.rotation.y=sd*0.2;if(sd<0)g.scale.x=-1;
    const s=shape(),pts=s.getSpacedPoints(64).map(p=>V3(p.x,p.y,0));
    g.add(mk(cordGeo(pts,thick,true,8,80),fm));
    const ls=mk(new THREE.ShapeGeometry(s,24),lm);ls.position.z=-0.001;g.add(ls);
    G.add(g);
  }
  const br=[V3(-0.012,y+0.006,zf+0.001),V3(0,y+0.009,zf+0.004),V3(0.012,y+0.006,zf+0.001)];G.add(mk(cordGeo(br,thick*0.8,false,6,12),fm));
  if(metalF)G.add(mk(cordGeo([V3(-0.016,y+0.017,zf),V3(0,y+0.019,zf+0.003),V3(0.016,y+0.017,zf)],0.0012,false,6,12),fm));
  /* temples run along the side of the head (just clear of it) to behind the ear and bend down there;
     the hair lies over them, so it is lifted a little where they pass (they used to stand off the head and pierce it) */
  const tr=metalF?0.0014:0.0024,paths=[],thAt=yy=>Math.acos(clamp((yy-hc.y)/BC.hd.ry,-0.99,0.99));
  for(const sd of [-1,1]){const h0=V3(sd*0.06,y+0.008,zf-0.006),side=sd>0?0:Math.PI,back=sd>0?-0.32:Math.PI+0.32,a0=Math.atan2(h0.z-hc.z,h0.x-hc.x),pts=[h0];
    for(let k=1;k<=7;k++){const t=k/7,ph=t<0.8?lerp(a0,side,t/0.8):lerp(side,back,(t-0.8)/0.2),yy=y+0.007-0.006*t;pts.push(headPt(thAt(yy),ph,tr+0.0012));}
    pts.push(headPt(thAt(y-0.012),lerp(side,back,1.25),tr+0.0012),headPt(thAt(y-0.024),lerp(side,back,1.4),tr+0.001));
    G.add(mk(cordGeo(pts,tr,false,6,40),fm));paths.push(pts);}
  hairOverTemples(G,paths,tr);
}
function hairOverTemples(G,paths,tr){const hair=[];G.traverse(o=>{if(o.isMesh&&o.userData.ctx==='hair')hair.push(o);});if(!hair.length)return;
  const hc=BC.headC,Q=[];for(const pts of paths){const c=new THREE.CatmullRomCurve3(pts);for(const p of c.getSpacedPoints(80))Q.push(p);}
  let y0=9,y1=-9;for(const q of Q){y0=Math.min(y0,q.y);y1=Math.max(y1,q.y);}
  const R=0.014,v=new THREE.Vector3(),inv=new THREE.Matrix4();G.updateMatrixWorld(true);
  for(const o of hair){const g=o.geometry,p=g.attributes.position;if(!p)continue;inv.copy(o.matrixWorld).invert();let ch=false;
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(v.y<y0-R||v.y>y1+R)continue;
      let bd=R,bq=null;for(const q of Q){const d=v.distanceTo(q);if(d<bd){bd=d;bq=q;}}if(!bq)continue;
      const rw=v.distanceTo(hc),rq=bq.distanceTo(hc)+tr+0.0025,w=1-smooth(bd/R);if(rw>=rq||w<=0)continue;
      const k=(rw+(rq-rw)*w)/rw;v.set(hc.x+(v.x-hc.x)*k,hc.y+(v.y-hc.y)*k,hc.z+(v.z-hc.z)*k).applyMatrix4(inv);p.setXYZ(i,v.x,v.y,v.z);ch=true;}
    if(ch){p.needsUpdate=true;g.computeVertexNormals();}}}
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
function buildWalletChain(G){
  const A=S.acc.wallet,t0=A.type;if(!t0||t0==='none'||!PANTS)return;
  const sd=A.side==='L'?1:-1,metal=metalMat(A.metal),wy=PANTS.waistY;
  const aF=sd>0?FRONT-0.5:FRONT+0.5,aB=sd>0?BACKA+0.56:BACKA-0.56;
  const span=sd>0?aF-aB:aB-aF;
  const chain=sag=>{const pts=[];for(let i=0;i<=26;i++){const t=i/26,a=sd>0?aF-span*t:aF+span*t,y=wy-0.025-sag*Math.sin(Math.PI*t)-0.04*t;pts.push(envPt(bodyEnv(y,LAYERS),a,y,0.008+0.01*Math.sin(Math.PI*t)));}
    const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal'),L=curve.getLength(),n=Math.round(L/0.0105);
    for(let i=0;i<n;i++){const p=curve.getPointAt(i/n),tn=curve.getTangentAt(i/n),l=mk(new THREE.TorusGeometry(0.0062,0.0017,8,14),metal);l.position.copy(p);/* a link lies along the chain (ring plane holds the tangent), every other one turned a quarter about it */l.quaternion.setFromUnitVectors(VX,tn);if(i%2)l.rotateX(Math.PI/2);l.scale.set(1,0.66,1);G.add(l);}
    return pts;};
  const p=chain(0.16);if(t0==='double')chain(0.25);
  const clip=mk(new THREE.BoxGeometry(0.008,0.03,0.006),metal);clip.position.copy(p[0]).add(V3(0,0.006,0));clip.quaternion.copy(qFromTo(VZ,radialN(p[0])));G.add(clip);
  const w=mk(new THREE.BoxGeometry(0.1,0.03,0.012),plain('#2a1d16',.5,0,'wallet',{clearcoat:.3}));const e=p[p.length-1];w.position.copy(e).add(V3(0,-0.01,0));w.quaternion.copy(qFromTo(VZ,radialN(e)));G.add(w);
}
function roundBox(w,h,d,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new THREE.ExtrudeGeometry(s,{depth:d-0.01,bevelEnabled:true,bevelThickness:0.005,bevelSize:0.005,bevelSegments:3,curveSegments:8});g.translate(0,0,-(d-0.01)/2);return g;}
function strapRing(G,mat,yc,A,aTop,w,off=0.008){
  const pts=[],sides=[];for(let i=0;i<=64;i++){const a=aTop+i/64*TAU,y=yc+A*Math.cos(a-aTop);const e=addE(bodyEnv(y,LAYERS),off),P=envPt(e,a,y,0);pts.push(P);}
  for(let i=0;i<=64;i++){const t=pts[Math.min(64,i+1)].clone().sub(pts[Math.max(0,i-1)]).normalize(),n=radialN(pts[i]);sides.push(new THREE.Vector3().crossVectors(t,n).normalize());}
  G.add(mk(ribbon(pts,sides,w,{uRep:1}),mat));return pts;
}
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
    /* on the right shoulder, the bag against the side of the hip just behind the hanging arm, its front edge showing */
    const e=bodyEnv(1.0,LAYERS),x=-(e.rx+0.05),b=mk(roundBox(0.34,0.32,0.06,0.012),fabric('canvas',col));b.position.set(x,0.98,-0.07);b.rotation.y=Math.PI/2+0.12;b.rotation.z=0.06;b.userData.bagBody=true;G.add(b);
    for(const dz of [-0.06,0.06]){const top=envPt(addE(bodyEnv(1.47,LAYERS),0.006),Math.PI,1.47,0);G.add(mk(cordGeo([b.position.clone().add(V3(0,0.15,dz)),top.clone().add(V3(-0.01,0.0,dz*0.4)),b.position.clone().add(V3(0,0.15,dz*0.2))],0.006,false,6,20),lm));}
  }
}
function buildScarf(G){
  const A=S.acc.scarf,t0=A.type;if(!t0||t0==='none')return;
  /* every piece of the scarf is tagged: once the clothes are fitted it is moved out over them (shScarfOut) */
  const G0=G;G={add:o=>{o.userData.scarf=true;G0.add(o);}};
  const m=fabric('wool',A.color,A.pattern||'solid',A.color2||'#26304a');
  const loose=t0==='long',y0=1.485,y1=1.575;
  const ring=y=>{const t=(y-y0)/(y1-y0),nb=bodyEnv(Math.min(y,1.53),LAYERS),base=Math.max(BC.neckR+0.012,Math.min(nb.rx,BC.neckR+0.035)),r=base+(loose?0.026:0.02)+0.016*Math.sin(Math.PI*t);return{rx:r*1.04,rz:r,rzb:r*1.02};};
  G.add(mk(tube(vSamples(y0,y1,10,ring,0,0.004),{seg:56,mod:(a,t,s)=>1+0.05*Math.sin(a*3+s.y*40)}),m));
  const ends=loose?[[-0.072,1.03],[0.062,1.12]]:[[-0.04,1.24]];
  /* the hanging ends: thick knitted panels that follow the chest, soft lengthwise folds, a slight twist, fringe */
  const W=loose?0.105:0.13,TH=0.0075;
  ends.forEach(([x0,yEnd],ei)=>{const smp=[],N=28;
    for(let k=0;k<=N;k++){const t=k/N,y=lerp(y0+0.03,yEnd,t),xc=x0+0.008*Math.sin(t*3+ei)*t,e=frontEnv(y,LAYERS,xc);
      /* the panel rests on the body: its centre sits on the front, a bit further out as it hangs */
      const z=Math.max(frontZ(e,xc-W*0.4),frontZ(e,xc),frontZ(e,xc+W*0.4))+TH+0.004+0.006*t;
      const tw=(ei?-1:1)*0.18*Math.sin(t*Math.PI*0.9),u=V3(Math.cos(tw),0,Math.sin(tw)),v=V3(-Math.sin(tw),0,Math.cos(tw));
      smp.push({c:V3(xc,y,z),rx:W*0.5*(1-0.06*Math.sin(t*9+ei))*lerp(0.55,1,smooth(t/0.18)),rz:TH,n:2.8,u,v,y});}
    G.add(mk(tube(smp,{seg:40,mod:(a,t,s)=>1+0.35*Math.max(0,Math.sin(a))*Math.sin(Math.cos(a)*14+t*3)*0.25}),m));
    const last=smp[N];for(let i=0;i<11;i++){const p=last.c.clone().addScaledVector(last.u,(i/10-0.5)*W*0.92);G.add(mk(cordGeo([p,p.clone().add(V3(0.002*Math.sin(i*2),-0.032-0.006*Math.sin(i*3.1),0.002))],0.0022),m));}});
}
function buildTie(G){
  const A=S.acc.tie,t0=A.type;if(!t0||t0==='none')return;
  const m=fabric('satin',A.color,A.pattern||'solid',A.color2||'#7a3b2e'),y0=NECK_Y-0.025,yEnd=t0==='bow'?y0:(PANTS?PANTS.waistY+0.03:1.04);
  if(t0==='bow'){const e=frontEnv(y0,LAYERS,0),z=frontZ(e,0)+0.012;for(const sd of [-1,1]){const l=mk(new THREE.SphereGeometry(1,16,12),m);l.scale.set(0.028,0.016,0.008);l.position.set(sd*0.026,y0,z);G.add(l);}const k=mk(new THREE.SphereGeometry(1,12,10),m);k.scale.set(0.009,0.012,0.008);k.position.set(0,y0,z+0.003);G.add(k);return;}
  const wMax=t0==='skinny'?0.052:0.084,pts=[],sides=[];
  for(let k=0;k<=24;k++){const y=lerp(y0-0.03,yEnd,k/24),e=frontEnv(y,LAYERS,0);pts.push(V3(0,y,frontZ(e,0)+0.006));sides.push(V3(1,0,0));}
  const wf=v=>lerp(0.032,wMax,smooth(v*1.05))*(v>0.93?Math.max(0.05,1-(v-0.93)/0.07):1);
  G.add(mk(ribbon(pts,sides,wf,{cols:4,uRep:2}),m));
  const e=frontEnv(y0,LAYERS,0),z=frontZ(e,0)+0.012,kn=mk(new THREE.CylinderGeometry(0.019,0.012,0.038,12),m);kn.position.set(0,y0-0.012,z);kn.scale.z=0.45;G.add(kn);
}
function buildAcc(G){buildHat(G);buildGlasses(G);buildWatch(G);buildBracelets(G);buildRings(G);buildEarrings(G);buildHeadband(G);buildGloves(G);
  /* pieces that lie on the clothes follow the same fit deformation as the fabric */
  MK_CTX='cloth';try{buildBandana(G);buildNecklace(G);buildWalletChain(G);buildScarf(G);buildTie(G);buildBag(G);}finally{MK_CTX='none';}}

/* =============== bandanas =============== */
function bandanaMat(A){return fabric('poplin',A.color||'#a3262a',A.pattern||'paisley',A.color2||'#f4f1ea');}
/* ring around the neck, sitting on whatever collar is worn */
function neckRing(y,add){const nb=bodyEnv(Math.min(y,1.56),LAYERS),n=torsoAt(Math.min(y,1.58));const base={rx:Math.min(nb.rx,n.rx+0.03),rz:Math.min(nb.rz,n.rz+0.03),rzb:Math.min(zbk(nb),zbk(n)+0.03),n:2.1};return addE(base,add);}
function buildBandana(G){
  const A=S.acc.bandana,t0=A.type;if(!t0||t0==='none')return;
  const m=bandanaMat(A),y0=1.51,y1=1.555;
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
