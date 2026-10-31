'use strict';
/* =============== Fitme: buty, stopy, skarpety =============== */
const TOES={
  round:[[0,0],[.02,.38],[.06,.56],[.12,.64],[.3,.68],[.5,.8],[.7,.98],[.8,.98],[.9,.86],[.96,.62],[.99,.3],[1,0]],
  almond:[[0,0],[.02,.38],[.06,.56],[.12,.64],[.3,.68],[.5,.8],[.68,.96],[.78,.94],[.88,.74],[.95,.45],[.99,.16],[1,0]],
  pointed:[[0,0],[.02,.38],[.06,.56],[.12,.64],[.3,.68],[.5,.8],[.66,.95],[.76,.88],[.86,.6],[.94,.3],[.99,.08],[1,0]],
  foot:[[0,0],[.02,.4],[.06,.58],[.12,.64],[.3,.64],[.5,.75],[.7,.98],[.8,1],[.9,.92],[.96,.68],[.99,.34],[1,0]]
};
/* parametric last: s along the foot (0 heel, 1 toe), th across (0 outer side, PI inner side) */
function makeLast(T,side,o={}){
  const fem=BC.g==='f',Fo=!o.flat&&BC.footP&&BC.foot?Object.assign({},BC.foot,{zmin:BC.footP.zmin,len:BC.footP.len}):BC.foot,W=Math.max((o.W||T.W)*Math.pow(BC.b,0.35)*(fem?0.94:1),Fo?Fo.w+(o.flat?0:0.006):0)*Math.sqrt(SHOE_K);
  /* the last always encloses the mannequin's own foot (plus a little room at the toe); the EU size scales from there */
  /* room in front of the toes depends on the toe shape: a point or an almond needs it to taper without squaring off */
  const room=o.flat?0.002:{pointed:0.04,almond:0.026}[o.toe||T.toe]||0.014;
  const L0=Math.max((o.L||T.L)*(fem?0.93:1),Fo?Fo.len+room:0),L=L0*SHOE_K;
  const toe=TOES[o.toe||T.toe||'round'],hh=o.flat?0:(T.stiletto||T.heel||0),soleT=o.sole!=null?o.sole:(T.sole||0.02);
  const H=o.H||T.H||[.07,.08,.04],zH=(Fo?Fo.zmin-(o.flat?0.001:0.008):-0.27*L0)-0.012*(SHOE_K-1),aw=o.ankleW||1,dx=Fo?Fo.cx-BC.legX:0;
  const soleY0=s=>hh?hh*(1-smooth((s-0.22)/0.48)):0;
  const OW0=s=>W*0.5*interp1(toe,s)*(s<0.5?lerp(aw,1,smooth((s-0.3)/0.2)):1)*(o.wk||1);
  const cx=s=>-0.006*smooth((s-0.55)/0.4);
  const Hs0=s=>interp1([[0,H[0]],[0.25,H[0]],[0.42,H[1]],[0.62,lerp(H[1],H[2],0.45)],[0.82,H[2]],[0.95,H[2]*0.8],[1,H[2]*0.42]],s)*(o.hk||1);
  /* the designed last is only a starting point: slice by slice it is opened up around the mannequin's real foot as worn
     (pitched in heels), so the foot never shows through the sole, the sides or the toe box */
  const NB=40,FS=o.flat||!BC.footPts?null:(()=>{const P=BC.footPts,lo=new Float32Array(NB+1).fill(9),hiW=new Float32Array(NB+1).fill(-9),loW=new Float32Array(NB+1).fill(9),top=new Float32Array(NB+1).fill(-9);
    const off=BC.legX+dx;for(let i=0;i<P.length;i+=3){const sv=(P[i+2]-zH)/L;if(sv<-0.02||sv>1.02)continue;const b=clamp(Math.round(sv*NB),0,NB),x=P[i]-off,y=P[i+1];
      /* the top only from the foot itself (in heels the shin leans over the vamp: it is not inside the toe box) */
      if(y<lo[b])lo[b]=y;if(y>top[b]&&y<soleY0(sv)+soleT+(o.lift||0)+Hs0(sv)*1.45)top[b]=y;
      /* width only where the upper covers the foot (below ~the designed height of the last) */
      if(y<soleY0(sv)+soleT+(o.lift||0)+Hs0(sv)*0.92){if(x>hiW[b])hiW[b]=x;if(x<loW[b])loW[b]=x;}}
    /* smooth envelopes: empty slices (behind the heel, past the toes) set no requirement; a small max filter then a blur
       keeps the result above the raw foot and free of slice-to-slice steps (a wavy collar line) */
    const env=(a,up)=>{const none=up?-9:9,r=new Float32Array(NB+1);for(let b=0;b<=NB;b++){let v=a[b];for(const d of [-1,1]){const c=b+d;if(c<0||c>NB||a[c]===none)continue;if(v===none||(up?a[c]>v:a[c]<v))v=a[c];}r[b]=v;}
      const o2=new Float32Array(NB+1);for(let b=0;b<=NB;b++){if(r[b]===none){o2[b]=none;continue;}let w=0,acc=0;for(let d=-2;d<=2;d++){const c=b+d;if(c<0||c>NB||r[c]===none)continue;const k=3-Math.abs(d);w+=k;acc+=r[c]*k;}o2[b]=up?Math.max(acc/w,a[b]===none?-9:a[b]):Math.min(acc/w,a[b]===none?9:a[b]);}
      return o2;};
    return{lo:env(lo,false),hiW:env(hiW,true),loW:env(loW,false),top:env(top,true)};})();
  const fsAt=(arr,s,none)=>{if(!FS)return none;const f=clamp(s,0,1)*NB,i=Math.min(NB-1,Math.floor(f)),t=f-i,a=arr[i],b=arr[i+1];if(Math.abs(a)>=9||Math.abs(b)>=9)return Math.abs(a)>=9&&Math.abs(b)>=9?none:(t<0.5?(Math.abs(a)>=9?none:a):(Math.abs(b)>=9?none:b));return a+(b-a)*t;};
  const clr=o.clear!=null?o.clear:0.003;
  const soleY=s=>{const d=soleY0(s);if(!FS||!hh)return d;const b=fsAt(FS.lo,s,null);return b==null?d:clamp(Math.min(d,b-soleT-(o.lift||0)-0.0008),0,d);};
  /* the heel stays closed (the back of the last is a line at s=0): the widening fades out over the last 5% */
  const OW=s=>{const d=OW0(s),c=cx(s),a=fsAt(FS?FS.hiW:null,s,null),b=fsAt(FS?FS.loW:null,s,null);if(a==null||b==null||a<-8||b>8)return d;return Math.max(d,(Math.max(a-c,c-b)+clr)*smooth(s/0.05));};
  const Hs=s=>{const d=Hs0(s);if(!FS||s<0.55)return d;const t=fsAt(FS.top,s,null);return t==null?d:Math.max(d,t+clr-(soleY(s)+soleT+(o.lift||0)));};
  const p=s=>lerp(0.42,0.6,smooth(s));
  const base=s=>soleY(s)+soleT+(o.lift||0);
  const W3=(xl,y,s)=>V3(side*(BC.legX+dx+xl),y,zH+s*L);
  const pt=(s,th,off=0)=>{const w=OW(s)+off,h=Hs(s)+off,c=Math.cos(th),sn=Math.sin(th);
    return W3(cx(s)+w*Math.sign(c)*Math.pow(Math.abs(c),0.85),base(s)+h*Math.pow(Math.max(0,sn),p(s)),s);};
  return{W,L,toe,hh,soleT,H,zH,soleY,OW,cx,Hs,p,base,W3,pt,side,dx,FS,soleY0,OW0,Hs0};
}
function outline(Lr,rim,N=40){const pts=[];for(let i=0;i<=N;i++){const s=i/N;pts.push([Lr.side*(BC.legX+Lr.dx+Lr.cx(s)+(Lr.OW(s)+rim)),Lr.zH+s*Lr.L,s]);}
  for(let i=N-1;i>=1;i--){const s=i/N;pts.push([Lr.side*(BC.legX+Lr.dx+Lr.cx(s)-(Lr.OW(s)+rim)),Lr.zH+s*Lr.L,s]);}return pts;}
function soleSlab(Lr,rim,yb,yt,mat,sMax=1){
  const ol=outline(Lr,rim).filter(p=>p[2]<=sMax+1e-6);
  return mk(slab(ol.map(p=>[p[0],p[1]]),(p,i)=>yb(ol[i][2]),(p,i)=>yt(ol[i][2])),mat);
}
function edgeLoop(Lr,rim,yf){const ol=outline(Lr,rim,48);return ol.map(p=>V3(p[0],yf(p[2]),p[1]));}
/* the foot (bare, or inside a shoe / sock) */
function buildFoot(GS,side,T,mat,bare){
  const Lr=makeLast(T||{W:0.098,L:0.262},side,{toe:'foot',H:[0.056,0.064,0.024],sole:T?T.sole+0.001:0,wk:T?0.95:1,flat:!T});
  GS.add(mk(surf(28,30,(u,v)=>Lr.pt(v,u*Math.PI),{noAO:true,uRep:3,vRep:4}),mat));
  if(bare){GS.add(soleSlab(Lr,0,()=>0.0005,s=>Lr.base(s)+0.004,mat));
    const toes=[[0.93,2.75,0.0125],[0.95,2.2,0.0095],[0.94,1.7,0.0088],[0.92,1.25,0.008],[0.89,0.75,0.0072]];
    for(const[s,th,r] of toes){const P=Lr.pt(s,th,-0.002);const t=mk(new THREE.SphereGeometry(1,16,12),mat);t.scale.set(r,r*0.8,r*1.35);t.position.copy(P);t.position.y=Math.max(r*0.8,P.y-0.004);GS.add(t);}}
}
/* a closed shoe without socks: the leg ends (the foot is cut away inside the shoe) a few mm over the low back of the collar
   and its open edge showed in a gap there; a band of skin carries it on down into the shoe (sinking 4.5 mm inside the
   leg from the cut down: the foot's own surface stands through the shoe) */
function buildInnerAnkle(G,P){const SH=SHOES[P.type]||{};if(!P.type||P.type==='none'||SH.open||SH.low||SH.clog||SH.shaft)return;
  const src=bodyGeo(true),p=src.attributes.position,nr=src.attributes.normal,ix=src.index.array,map=new Int32Array(p.count).fill(-1),pos=[],idx=[],yb=0.045,yt=0.098,th=0.0045;
  const vid=i=>{if(map[i]<0){map[i]=pos.length/3;const d=th*smooth((0.09-p.getY(i))/0.018);pos.push(p.getX(i)-nr.getX(i)*d,p.getY(i)-nr.getY(i)*d,p.getZ(i)-nr.getZ(i)*d);}return map[i];};
  for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2],ya=p.getY(a),y2=p.getY(b),yc=p.getY(c);if(Math.max(ya,y2,yc)>yt||Math.min(ya,y2,yc)<yb)continue;
    /* (the back half only: at the front the tongue rises over the cut, a band there stood through it) */
    if(Math.max(p.getZ(a),p.getZ(b),p.getZ(c))>-0.004)continue;idx.push(vid(a),vid(b),vid(c));}
  if(!idx.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
  const o=mk(g,skinMat());o.userData.ctx='none';o.userData.innerAnkle=true;G.add(o);}
function buildSocks(G,P){
  if(!P.socks||P.socks==='none')return;
  const ctx0=MK_CTX;MK_CTX='cloth';try{buildSocks0(G,P);}finally{MK_CTX=ctx0;}}
/* socks are the leg's own surface pushed out by the knit thickness, cut at the sock height, with a ribbed cuff */
function buildSocks0(G,P){
  const top={ankle:0.085,crew:0.22,knee:0.43}[P.socks]||0.2,col=P.sockColor||'#f4f1ea',m=fabric('rib',col),mt=fabric('rib',shade(col,-0.06));
  const src=bodyGeo(true),p=src.attributes.position,nr=src.attributes.normal,ix=src.index.array,n=p.count;
  const mkLayer=(th,yb,yt,mat)=>{const map=new Int32Array(n).fill(-1),pos=[],uv=[],idx=[];
    const vid=i=>{if(map[i]>=0)return map[i];const x=p.getX(i),z=p.getZ(i),y=clamp(p.getY(i),yb,yt);map[i]=pos.length/3;pos.push(x+nr.getX(i)*th,y+nr.getY(i)*th,z+nr.getZ(i)*th);uv.push((Math.atan2(z,x-Math.sign(x)*BC.legX)+Math.PI)*0.09/TILE*2,y/TILE);return map[i];};
    for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2];const ya=p.getY(a),yb2=p.getY(b),yc=p.getY(c);if(Math.min(ya,yb2,yc)>yt||Math.max(ya,yb2,yc)<yb)continue;idx.push(vid(a),vid(b),vid(c));}
    if(!idx.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    const o=mk(g,mat);o.userData.ctx='none';G.add(o);};
  /* inside a closed shoe the sock is the shoe's own foot: start just under the collar */
  const SH=SHOES[P.type]||{},bare=!P.type||P.type==='none'||SH.open||SH.low||SH.clog,yb=bare?-1:SH.shaft?Math.min(top-0.04,SH.shaft-0.02):((SH.H||[0.07])[0]*0.9);
  mkLayer(bare?0.0011:0.0018,yb,top-0.025,m);mkLayer(0.0028,top-0.03,top,mt);
}
function laceRow(GS,Lr,sides,mat,eyelet){
  for(let i=0;i<sides.length-1;i++){const[a0,b0]=sides[i],[a1,b1]=sides[i+1];
    const m1=a0.clone().lerp(b1,0.5).add(V3(0,0.003,0)),m2=b0.clone().lerp(a1,0.5).add(V3(0,0.004,0));
    GS.add(mk(cordGeo([a0,m1,b1],0.0022,false,6,10),mat));GS.add(mk(cordGeo([b0,m2,a1],0.0022,false,6,10),mat));}
  const[a,b]=sides[0];GS.add(mk(cordGeo([a,a.clone().lerp(b,0.5).add(V3(0,0.002,0)),b],0.0022,false,6,10),mat));
  for(const[a2,b2] of sides)for(const e of [a2,b2]){const t=mk(new THREE.TorusGeometry(0.0034,0.0012,6,12),eyelet);t.position.copy(e);t.rotation.x=Math.PI/2;GS.add(t);}
  const[ta,tb]=sides[sides.length-1],c=ta.clone().lerp(tb,0.5).add(V3(0,0.006,0));
  /* under a full-length trouser hem the bow's loops lie flat under the cloth (standing up they came through the front of
     the leg as a white fleck) */
  const flat=PANTS&&PANTS.hem!=null&&PANTS.hem<0.1;
  for(const sd of [-1,1]){if(!flat){const l=mk(new THREE.TorusGeometry(0.012,0.0022,6,16,Math.PI*1.4),mat);l.position.copy(c).add(V3(sd*0.008,0.002,0));l.rotation.set(-1.1,sd*0.6,sd>0?-0.4:Math.PI+0.4);GS.add(l);}
    GS.add(mk(cordGeo([c,c.clone().add(V3(sd*0.006,-0.012,0.01)),c.clone().add(V3(sd*0.01,-0.03,0.014))],0.002,false,6,8),mat));}
}
/* chosen EU size against the mannequin's own foot: bigger shoes reach further past the toes */
let SHOE_K=1;
function buildShoes(GS,G){
  const P=S.shoes,T=SHOES[P.type],sk=skinMat(),m=BC.meas,fl=e=>e/1.5-1.5;
  SHOE_K=m&&P.eu&&P.eu!=='auto'?clamp(fl(+P.eu)/fl(m.eu),0.85,1.2):1;
  buildSocks(G,P);if(!P.socks||P.socks==='none')buildInnerAnkle(G,P);
  const sockM=P.socks&&P.socks!=='none'?fabric('rib',P.sockColor||'#f4f1ea'):null;
  for(const side of [-1,1]){
    if(!T||P.type==='none')continue;
    buildShoe(GS,G,side,P,T,sockM||sk,!sockM);
  }
}
function buildShoe(GS,G,side,P,T,footM,bare){
  const um=P.mat&&(T.ups||[T.up]).includes(P.mat)?P.mat:T.up,c2=P.color2||P.color;
  const boot=!!T.shaft,laced=!!T.laces,open=T.open;
  const Lr=makeLast(T,side,{ankleW:boot?1.14:1});
  const up=fabric(um==='rubber'?'leather':um,P.color),acc=fabric(um==='canvas'?'canvas':um==='mesh'?'suede':um,c2),dark=fabric(um,shade(P.color,-0.25));
  const soleM=plain(P.sole,0.85,0,'sole',{bumpMap:weaveTex('rubber'),bumpScale:.003}),outM=plain(shade(P.sole,lumHex(P.sole)>0.5?-0.5:-0.2),0.9,0,'out');
  const eyelet=T.hooks||T.yellow?metalMat('steel'):fabric('leather',shade(P.color,-0.2));
  const laceM=plain(lumHex(P.color)>0.6?'#fbfaf6':T.yellow?'#c9a34a':shade(P.color,lumHex(P.color)<0.25?0.12:0.55),0.9,0,'lace');
  const st=Lr.soleT,hh=Lr.hh;
  /* ---- sole ---- */
  if(T.cork){GS.add(soleSlab(Lr,0.004,s=>0,s=>st,fabric('cork','#b98a58')));GS.add(soleSlab(Lr,0.001,s=>st,s=>st+0.004,fabric('suede',shade(P.sole,0.2))));}
  else if(T.stiletto){GS.add(soleSlab(Lr,0.002,s=>Lr.soleY(s),s=>Lr.soleY(s)+st,outM));
    const hp=Lr.W3(Lr.cx(0.06),0,0.07),hy=Lr.soleY(0.07)+0.001;GS.add(mk(new THREE.CylinderGeometry(0.0095,0.0042,hy,14),outM).translateX(hp.x).translateY(hy/2).translateZ(hp.z));
    GS.add(mk(new THREE.CylinderGeometry(0.0046,0.0046,0.004,10),plain('#141312',.7)).translateX(hp.x).translateY(0.002).translateZ(hp.z));}
  else if(T.lug){GS.add(soleSlab(Lr,0.006,s=>0.008,s=>st,soleM));GS.add(soleSlab(Lr,0.007,s=>0,s=>0.0085,outM));
    const ol=outline(Lr,0.007,30);for(let i=0;i<ol.length;i+=2){const p=ol[i],b=mk(new THREE.BoxGeometry(0.012,0.006,0.012),outM);b.position.set(p[0],0.003,p[1]);b.rotation.y=i*0.37;GS.add(b);}}
  else if(T.layered){GS.add(soleSlab(Lr,0.007,s=>0.012,s=>st+0.005*Math.sin(s*14),soleM));GS.add(soleSlab(Lr,0.008,s=>0,s=>0.013,plain(shade(P.sole,-0.18),.85,0,'sole2')));}
  else if(T.sculpt){GS.add(soleSlab(Lr,0.006,s=>0.006+0.01*smooth((s-0.85)/0.15),s=>st*lerp(1.1,0.65,smooth(s))+0.006,soleM));GS.add(soleSlab(Lr,0.0065,s=>0.01*smooth((s-0.85)/0.15),s=>0.0065+0.01*smooth((s-0.85)/0.15),outM));}
  else if(hh){GS.add(soleSlab(Lr,0.002,s=>Lr.soleY(s),s=>Lr.soleY(s)+st,outM));GS.add(soleSlab(Lr,0.0,s=>0,s=>hh,outM,0.22));}
  else{GS.add(soleSlab(Lr,T.cup?0.004:0.003,s=>0.005,s=>st,soleM));GS.add(soleSlab(Lr,T.cup?0.0045:0.0035,s=>0,s=>0.0055,outM));}
  if(T.welt||T.foxing){const loop=edgeLoop(Lr,T.foxing?0.0047:0.004,s=>Lr.base(s)-0.002);GS.add(mk(cordGeo(loop,T.foxing?0.0025:0.0028,true,6,120),T.foxing?fabric('canvas',c2==='#f3f1ec'?'#2b3a5a':c2):outM));
    if(T.welt)GS.add(mk(stitchGeo(edgeLoop(Lr,0.0062,s=>Lr.base(s)-0.0015),true),stitchMat(T.yellow?'#d6b44a':shade(P.sole,0.3))));}
  /* foot / sock inside */
  if(open){openShoe(GS,Lr,P,T,up,acc);return;}
  /* ---- upper ---- */
  const H0=Lr.H[0],sOpen=T.clog?0.42:boot?0:T.vamp?T.vamp:(T.low===2?0.62:T.low?0.52:0.6),W=Lr.W;
  const gxT=T.low===2?[[0,0],[.05,.3],[.25,.44],[sOpen,.42]]:T.low?[[0,0],[.06,.3],[.2,.4],[sOpen,.36]]:[[0,0],[.05,.2],[.15,.4],[.28,.36],[.36,.15],[sOpen,.12]];
  const TqT=T.low===2?[[0,H0],[.1,H0*0.94],[.3,.03],[sOpen,.026]]:T.low?[[0,H0],[.25,H0*0.78],[sOpen,Lr.Hs(sOpen)*0.96]]:[[0,H0],[.12,H0-.005],[.22,H0-.013],[.34,H0+.002],[sOpen,Lr.Hs(sOpen)]];
  /* the collar opening always stays inside the last: around the heel it was wider than the shoe, the side walls had no
     height there and a slot ran from the collar down to the sole (the "hole" at the heel); keep a wall of at least ~6 mm */
  const gx=s=>Math.min(interp1(gxT,Math.min(s,sOpen))*W,Math.max(0,Lr.OW(s)*0.82-0.002)),Tq=s=>interp1(TqT,Math.min(s,sOpen));
  const thW=s=>{const ow=Lr.OW(s),hs=Lr.Hs(s);let tg=Math.PI/2;if(ow>1e-4)tg=Math.acos(Math.pow(clamp(gx(s)/ow,0,1),1/0.85));return Math.min(tg,Math.asin(Math.pow(clamp(Tq(s)/hs,0,1),1/Lr.p(s))));};
  GS.add(mk(surf(40,30,(u,v)=>Lr.pt(lerp(sOpen,1,v),u*Math.PI),{noAO:true,uRep:3,vRep:4}),up));
  if(sOpen>0&&!T.clog)for(const inner of [0,1])GS.add(mk(surf(12,30,(u,v)=>{const s=v*sOpen,tw=thW(s);return Lr.pt(s,inner?Math.PI-u*tw:u*tw);},{noAO:true,uRep:3,vRep:4}),up));
  /* overlays */
  const ov=(s0,s1,t0,t1,mat,off=0.0013,nu=10,nv=10)=>GS.add(mk(surf(nu,nv,(u,v)=>{const s=lerp(s0,s1,v),tw=sOpen>0&&s<sOpen?thW(s):Math.PI/2,th0=Math.min(t0,tw),th1=Math.max(Math.PI-tw,t1);
    return Lr.pt(s,lerp(t0,t1,u)<Math.PI/2?Math.min(lerp(t0,t1,u),tw):Math.max(lerp(t0,t1,u),Math.PI-tw),off);},{noAO:true,uRep:3,vRep:4}),mat));
  if(T.mud){ov(0,1,0,0.5,acc,0.0014,6,30);ov(0,1,Math.PI-0.5,Math.PI,acc,0.0014,6,30);}
  if(T.toecap||T.mud)ov(0.83,1,0,Math.PI,T.toecap?soleM:acc,0.0016,20,8);
  if(T.panel||T.cage){for(const inner of [0,1])GS.add(mk(surf(14,4,(u,v)=>{const s=lerp(0.28,0.66,u),th=lerp(0.4,1.0,u)+(v-0.5)*0.22;return Lr.pt(s,inner?Math.PI-th:th,0.0018);},{noAO:true,uRep:3,vRep:4}),acc));
    if(T.cage)for(const inner of [0,1])for(const k of [0,1]){const pts=[];for(let i=0;i<=8;i++){const s=lerp(0.12+k*0.18,0.42+k*0.16,i/8),th=lerp(0.15,Math.min(1.1,thW(Math.min(s,sOpen-0.01))),i/8);pts.push(Lr.pt(s,inner?Math.PI-th:th,0.002));}GS.add(mk(cordGeo(pts,0.0022,false,5,16),acc));}}
  if(T.heelTab&&sOpen>0){const p=Lr.pt(0.004,Math.PI/2,0.004);const t=mk(new THREE.BoxGeometry(0.022,0.026,0.008),acc);t.position.copy(p).add(V3(0,-0.004,-0.002));t.userData.tab=true;GS.add(t);}
  if(T.moc){const pts=[];for(let i=0;i<=24;i++){const t=i/24,th=lerp(0.55,Math.PI-0.55,t),s=0.6+0.3*Math.sin(Math.PI*t);pts.push(Lr.pt(s,th,0.0015));}GS.add(mk(stitchGeo(pts),stitchMat(shade(P.color,0.3))));GS.add(mk(cordGeo(pts,0.0022,false,5,40),dark));}
  if(T.penny){GS.add(mk(surf(12,3,(u,v)=>Lr.pt(lerp(0.53,0.58,v),lerp(0.3,Math.PI-0.3,u),0.002),{noAO:true,uRep:3,vRep:4}),dark));const p=Lr.pt(0.555,Math.PI/2,0.004);const sl=mk(new THREE.BoxGeometry(0.02,0.003,0.006),plain('#141312',.6));sl.position.copy(p);GS.add(sl);}
  if(T.bow){const p=Lr.pt(sOpen+0.01,Math.PI/2,0.004);for(const sd of [-1,1]){const b=mk(new THREE.SphereGeometry(1,10,8),acc);b.scale.set(0.009,0.004,0.006);b.position.copy(p).add(V3(sd*0.008,0.002,0));GS.add(b);}}
  if(T.mj){GS.add(mk(surf(14,3,(u,v)=>{const s=lerp(0.4,0.44,v);return Lr.pt(s,u*Math.PI,0.012*Math.sin(u*Math.PI)+0.002);},{noAO:true,uRep:3,vRep:4}),dark));const b=Lr.pt(0.42,0.25,0.006);const bk=mk(new THREE.TorusGeometry(0.0055,0.0015,6,4),metalMat('silver'));bk.position.copy(b);bk.rotation.y=Math.PI/2;GS.add(bk);}
  if(T.clog){const p0=Lr.pt(0.44,0.2,0.003),p1=Lr.pt(0.44,Math.PI-0.2,0.003);GS.add(mk(cordGeo([p0,Lr.pt(0.44,Math.PI/2,0.006),p1],0.004,false,6,16),dark));const bk=mk(new THREE.TorusGeometry(0.006,0.0018,6,4),metalMat('silver'));bk.position.copy(p0);GS.add(bk);}
  /* tongue, laces, collar */
  if(laced&&!boot){
    GS.add(mk(surf(8,14,(u,v)=>{const s=lerp(sOpen+0.02,0.26,v),w=gx(s)+0.008,x=(u*2-1)*w,y=lerp(Lr.base(s)+Lr.Hs(sOpen)*0.97,Lr.base(0.26)+H0+(T.puffy?0.024:0.016),smooth(v))+(T.puffy?0.006:0.003)*(1-Math.pow(u*2-1,2));return Lr.W3(Lr.cx(s)+x,y,s);},{noAO:true,uRep:3,vRep:4}),T.puffy?acc:up));
    const n=Math.min(T.laces,7),rows=[];for(let i=0;i<n;i++){const s=lerp(sOpen-0.02,0.33,i/(n-1)),tw=thW(s)*0.9;rows.push([Lr.pt(s,tw,0.0015),Lr.pt(s,Math.PI-tw,0.0015)]);}
    laceRow(GS,Lr,rows,laceM,eyelet);
  }
  if(sOpen>0&&!T.clog&&(T.pad||T.low)){const pts=[];for(let k=12;k>=0;k--){const s=k/12*0.36;pts.push(Lr.pt(s,thW(s),0.0005));}for(let k=1;k<=12;k++){const s=k/12*0.36;pts.push(Lr.pt(s,Math.PI-thW(s),0.0005));}GS.add(mk(cordGeo(pts,T.pad||0.0028,false,8,60),T.puffy?acc:up));}
  /* ---- shaft (boots, in body space) ---- */
  if(boot){
    const y0=H0*0.55,y1=T.shaft,x=side*BC.legX,E=T.western?0.018:SHAFT_E;
    /* trousers worn over the boot hide the shaft above their hem: its laces, hooks, zip, tabs and stitching are not built
       there (thin, they slipped through the trousers' fit and showed on top of the leg) */
    const cov=PANTS&&PANTS.hem!=null&&PANTS.hem<y1-0.03?PANTS.hem:null,shown=y=>cov==null||y<cov-0.006;
    const rf=y=>{const r=legAt(y)+E+(T.western?0.02*smooth((y-0.18)/0.12):0);return{rx:r*1.02,rz:r*1.05,rzb:r*1.12,n:2.1};};
    {const s1=mk(tube(vSamples(y0,y1,24,rf,x,-0.004),{seg:44,mod:T.elastic?null:(a,t,s)=>1+0.012*Math.sin(s.y*60+a)*smooth((s.y-y0)/0.06)}),up);s1.userData.obst=true;G.add(s1);}
    {const s2=mk(tube(vSamples(y1-0.016,y1+0.002,4,y=>addE(rf(y),0.002+roundE(y,y1-0.016,y1+0.002,0.003)),x,-0.004),{seg:44}),T.ankleDisc?acc:dark);s2.userData.obst=true;G.add(s2);}
    if(T.elastic)for(const c of [0,Math.PI])G.add(mk(tube(vSamples(y0+0.03,y1-0.02,6,y=>addE(rf(y),0.0012),x,-0.004),{a0:c-0.45,a1:c+0.45,seg:8}),plain('#141312',0.9,0,'gore')));
    if(T.pull&&shown(y1))for(const c of [FRONT,BACKA]){const p=envPt(rf(y1),c,y1,0.002,x,-0.004),t=mk(new THREE.TorusGeometry(0.011,0.0028,6,14,Math.PI),dark);t.position.copy(p);t.rotation.y=c===FRONT?0:Math.PI;G.add(t);}
    if(T.western&&shown(y0+0.06))for(const sd of [-1,1]){const pts=[];for(let k=0;k<=16;k++){const t=k/16,y=lerp(y0+0.04,y1-0.03,t);if(!shown(y))break;pts.push(envPt(addE(rf(y),0.0016),(sd>0?0:Math.PI)+0.25*Math.sin(t*Math.PI*3),y,0,x,-0.004));}if(pts.length>1)G.add(mk(stitchGeo(pts),stitchMat('#e6dcc6')));}
    if(T.zipBoot){const pts=[];for(let k=0;k<=12;k++){const y=lerp(y0+0.01,y1-0.01,k/12);if(!shown(y))break;pts.push(envPt(addE(rf(y),0.002),side>0?Math.PI:0,y,0,x,-0.004));}if(pts.length>1)G.add(mk(cordGeo(pts,0.0022,false,5,40),metalMat('silver')));}
    if(laced){const n=T.laces,rowsV=[],rowsS=[];
      for(let i=0;i<3;i++){const s=lerp(0.6,0.34,i/2);rowsV.push([Lr.pt(s,Math.PI/2-0.42,0.0015),Lr.pt(s,Math.PI/2+0.42,0.0015)]);}
      laceRow(GS,Lr,rowsV,laceM,eyelet);
      for(let i=0;i<n-3;i++){const y=lerp(y0+0.01,y1-0.025,i/Math.max(1,n-4));if(!shown(y))continue;rowsS.push([envPt(addE(rf(y),0.002),FRONT-0.5,y,0,x,-0.004),envPt(addE(rf(y),0.002),FRONT+0.5,y,0,x,-0.004)]);}
      if(rowsS.length>1){const gS=new THREE.Group();laceRow(gS,Lr,rowsS,laceM,eyelet);G.add(gS);}
      if(T.ankleDisc&&shown(y0+0.06)){const p=envPt(addE(rf(y0+0.05),0.003),side>0?Math.PI:0,y0+0.05,0,x,-0.004),d=mk(new THREE.CylinderGeometry(0.018,0.018,0.003,24),acc);d.position.copy(p);d.quaternion.copy(qFromTo(VY,V3(p.x-x,0,p.z)));G.add(d);}}
  }
}
function openShoe(GS,Lr,P,T,up,acc){
  const bed=fabric('leather',shade(P.sole,0.15));
  GS.add(soleSlab(Lr,0.004,s=>0,s=>Lr.soleT-0.004,plain(P.sole,.85,0,'sole')));GS.add(soleSlab(Lr,0.003,s=>Lr.soleT-0.004,s=>Lr.soleT,bed));
  const FL=makeLast(T,Lr.side,{toe:'foot',H:[0.056,0.064,0.024],sole:Lr.soleT,wk:0.95});
  const band=(s0,s1,off,mat)=>GS.add(mk(surf(18,4,(u,v)=>FL.pt(lerp(s0,s1,v),u*Math.PI,off),{noAO:true,uRep:3,vRep:4}),mat));
  if(T.open==='slide')band(0.5,0.74,0.004,up);
  else{band(0.6,0.66,0.003,up);band(0.74,0.79,0.003,up);
    const y=Lr.soleT+0.06,x=Lr.side*BC.legX;GS.add(mk(tube(vSamples(y,y+0.014,2,()=>{const r=legAt(y-LIFT)+0.004;return{rx:r,rz:r*1.04};},x,0.0),{seg:36}),up));
    for(const inner of [0,1]){const a=FL.pt(0.27,inner?Math.PI:0,0.002),b=V3(a.x,y,a.z+0.004);GS.add(mk(cordGeo([a,a.clone().lerp(b,0.5).add(V3(Lr.side*(inner?-1:1)*0.004,0,0)),b],0.0035,false,6,8),up));}
    const bk=mk(new THREE.TorusGeometry(0.006,0.0016,6,4),metalMat('silver'));bk.position.set(x+Lr.side*(legAt(0.06)+0.006),y+0.007,0.0);bk.rotation.y=Math.PI/2;GS.add(bk);}
}
