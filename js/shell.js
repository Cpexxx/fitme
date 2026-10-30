'use strict';
/* =============== Fitme: ubrania z powłoki ciała ===============
   The way games dress characters: every garment surface is a copy of the mannequin's own skin,
   pushed out by the garment's ease and relaxed like fabric. Shoulders, armpits, the crotch and the
   sleeve-to-body join are therefore always continuous and follow this exact body.
   The older parametric builders still run: their main fabric tubes act as the *pattern*
   (how loose, how long, where the neckline, hems and openings are) and are then replaced by the
   shell; their details (pockets, collars, buttons, bands...) are re-seated onto the new surface. */
const SH_NA=256;
/* ---------- body surface the shells are made from (cached per mannequin + quality) ---------- */
/* level 1: the body smoothed once (cloth physics runs here), level 2: twice (the high quality meshes are cut from it) */
function shellBase(level){if(level==null)level=GEO_Q>1?2:1;const want2=level===2;
  const M=BC.core,ck='shell'+level;if(M[ck])return M[ck];
  const B0=mhBase(),p1=mhPlan(true),W0=new Float32Array(B0.nv*3);
  for(let i=0;i<B0.nv;i++){W0[i*3]=B0.armw[i];W0[i*3+1]=B0.legw[i];W0[i*3+2]=B0.footw[i];}
  let P=ccApply(p1,M.P),W=ccApply(p1,W0),ix=p1.ix,n=p1.n;
  let pl=p1;if(want2){const p2=mhPlan2(true);P=ccApply(p2,P);W=ccApply(p2,W);ix=p2.ix;n=p2.n;pl=p2;}
  smoothSpots(P,pl,M.spots);
  /* the same muscle and fat relief as the rendered body (mhGeo): fitted without it, its bumps (the top of the seat on a
     full figure) showed through tight clothes */
  if(typeof muscleRelief==='function')muscleRelief(P,pl,W);
  /* the same smoothed back of the knee as the rendered body (mhGeo): fitted to the raw hollow, trousers let the skin
     through behind the knees */
  const kneeY=BC.map?BC.map.inv(M.J.kneeL[1]):M.J.kneeL[1];poplitealFill(P,n,W,kneeY);
  /* vertex normals */
  const N=new Float32Array(n*3);
  for(let t=0;t<ix.length;t+=3){const a=ix[t]*3,b=ix[t+1]*3,c=ix[t+2]*3;const ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const k of [a,b,c]){N[k]+=nx;N[k+1]+=ny;N[k+2]+=nz;}}
  for(let i=0;i<n;i++){const l=Math.hypot(N[i*3],N[i*3+1],N[i*3+2])||1;N[i*3]/=l;N[i*3+1]/=l;N[i*3+2]/=l;}
  /* neighbours (CSR) */
  const deg=new Uint32Array(n),pairs=[];
  for(let t=0;t<ix.length;t+=3)for(let k=0;k<3;k++){const a=ix[t+k],b=ix[t+(k+1)%3];pairs.push(a,b);}
  const nb=Array.from({length:n},()=>new Set());for(let i=0;i<pairs.length;i+=2){nb[pairs[i]].add(pairs[i+1]);nb[pairs[i+1]].add(pairs[i]);}
  const off=new Uint32Array(n+1);for(let i=0;i<n;i++)off[i+1]=off[i]+nb[i].size;const adj=new Uint32Array(off[n]);for(let i=0;i<n;i++){let k=off[i];for(const j of nb[i])adj[k++]=j;}
  /* region + coordinates in the region's own frame */
  /* crotch height first: the legs of the garment frame start there (hips and seat belong to the trunk) */
  let cy0=9;for(let i=0;i<n;i++){const y=P[i*3+1];if(Math.abs(P[i*3])<0.006&&Math.abs(P[i*3+2])<0.07&&y>0.6&&y<1&&y<cy0)cy0=y;}if(cy0>1)cy0=0.86;
  const reg=new Uint8Array(n),C=new Float32Array(n*3);/* th, x (y or t), rho */
  for(let i=0;i<n;i++){const x=P[i*3],y=P[i*3+1],z=P[i*3+2],aw=W[i*3],lw=W[i*3+1],sd=x>=0?1:-1;
    let r=0;if(aw>0.5&&y>0.55)r=sd>0?1:2;else if(lw>0.5&&y<cy0-0.005)r=sd>0?3:4;reg[i]=r;shCoord(r,x,y,z,C,i*3);}
  /* fabric lies on a softened copy of the body (no muscle grooves, navel or pec cleavage); collisions use the real one */
  /* smoothed on the coarse level (cheap) and carried up through the second subdivision */
  const Ps=(()=>{if(want2){const P1=ccApply(p1,M.P);smoothSpots(P1,p1,M.spots);poplitealFill(P1,p1.n,ccApply(p1,W0),kneeY);return ccApply(mhPlan2(true),taubin(P1,p1,20));}return taubin(P,pl,18);})(),Ns=new Float32Array(n*3);
  for(let t=0;t<ix.length;t+=3){const a=ix[t]*3,b=ix[t+1]*3,c=ix[t+2]*3;const ux=Ps[b]-Ps[a],uy=Ps[b+1]-Ps[a+1],uz=Ps[b+2]-Ps[a+2],vx=Ps[c]-Ps[a],vy=Ps[c+1]-Ps[a+1],vz=Ps[c+2]-Ps[a+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const k of [a,b,c]){Ns[k]+=nx;Ns[k+1]+=ny;Ns[k+2]+=nz;}}
  for(let i=0;i<n;i++){const l=Math.hypot(Ns[i*3],Ns[i*3+1],Ns[i*3+2])||1;Ns[i*3]/=l;Ns[i*3+1]/=l;Ns[i*3+2]/=l;}
  /* mesh poles (nipples, navel) collapse into tiny faces: their normals are noise - use the area's average */
  const spotN=(A)=>{for(const q of (M.spots||[])){let ax=0,ay=0,az=0;const ids=[];for(let i=0;i<n;i++){const dx=P[i*3]-q[0],dy=P[i*3+1]-q[1],dz=P[i*3+2]-q[2],d=Math.sqrt(dx*dx+dy*dy+dz*dz);if(d<q[3]*1.6){ids.push([i,d]);if(d>q[3]*0.6){ax+=A[i*3];ay+=A[i*3+1];az+=A[i*3+2];}}}
    const l=Math.hypot(ax,ay,az);if(!l)continue;ax/=l;ay/=l;az/=l;for(const[i,d] of ids){const w=1-smooth((d-q[3]*0.8)/(q[3]*0.8));let x=lerp(A[i*3],ax,w),y=lerp(A[i*3+1],ay,w),z=lerp(A[i*3+2],az,w);const m=Math.hypot(x,y,z)||1;A[i*3]=x/m;A[i*3+1]=y/m;A[i*3+2]=z/m;}}};
  spotN(N);spotN(Ns);
  /* fabric spans the hollow of the lower back and the top of the seat's cleft (a tight tee was drawn into it as a slit):
     per height, on the back between the buttocks and up the spine, the softened copy is lifted to the outer convex hull
     of its own outline across the midline */
  {const yH=M.J.hipL[1],y0=yH-0.12,y1=yH+0.16,DY=0.01,NB=Math.ceil((y1-y0)/DY)+1,rows=Array.from({length:NB},()=>[]);
    for(let i=0;i<n;i++){if(reg[i]!==0)continue;const x=Ps[i*3],y=Ps[i*3+1],z=Ps[i*3+2];if(z>-0.02||Math.abs(x)>0.12||y<y0||y>y1)continue;rows[Math.round((y-y0)/DY)].push(i);}
    for(let b=0;b<NB;b++){const R=rows[b];if(R.length<6)continue;const pts=R.map(i=>[Ps[i*3],Ps[i*3+2]]).sort((a,c)=>a[0]-c[0]);
      /* lower hull in z (the back: most negative z is outermost) */
      const h=[];for(const q of pts){while(h.length>1){const [x1,z1]=h[h.length-2],[x2,z2]=h[h.length-1];if((x2-x1)*(q[1]-z1)-(z2-z1)*(q[0]-x1)<=0)h.pop();else break;}h.push(q);}
      const hz=x=>{for(let k=0;k+1<h.length;k++)if(x>=h[k][0]&&x<=h[k+1][0])return lerp(h[k][1],h[k+1][1],(x-h[k][0])/((h[k+1][0]-h[k][0])||1));return null;};
      const w=smooth((b*DY)/0.03)*smooth(((NB-1-b)*DY)/0.03);
      for(const i of R){const z=hz(Ps[i*3]);if(z!=null&&z<Ps[i*3+2])Ps[i*3+2]=lerp(Ps[i*3+2],z,w*smooth((0.1-Math.abs(Ps[i*3]))/0.04));}}}
  /* never let the softened copy dip under the real skin */
  for(let i=0;i<n;i++){const d=(Ps[i*3]-P[i*3])*N[i*3]+(Ps[i*3+1]-P[i*3+1])*N[i*3+1]+(Ps[i*3+2]-P[i*3+2])*N[i*3+2];if(d<0){Ps[i*3]-=N[i*3]*d;Ps[i*3+1]-=N[i*3+1]*d;Ps[i*3+2]-=N[i*3+2]*d;}}
  /* the support loose fabric rests on: the body with everything under ~5 cm smoothed away (muscle relief, navel, chest points), never under the skin */
  const Pss=(()=>{const P1=ccApply(p1,M.P);smoothSpots(P1,p1,M.spots);const T1=taubin(P1,p1,70);return want2?ccApply(mhPlan2(true),T1):T1;})();
  for(let i=0;i<n;i++){const d=(Pss[i*3]-P[i*3])*N[i*3]+(Pss[i*3+1]-P[i*3+1])*N[i*3+1]+(Pss[i*3+2]-P[i*3+2])*N[i*3+2];if(d<0){Pss[i*3]-=N[i*3]*d;Pss[i*3+1]-=N[i*3+1]*d;Pss[i*3+2]-=N[i*3+2]*d;}}
  /* crotch height: the lowest point of the trunk on the midline */
  let cy=9;for(let i=0;i<n;i++){const y=P[i*3+1];if(Math.abs(P[i*3])<0.006&&Math.abs(P[i*3+2])<0.07&&y>0.6&&y<1&&y<cy)cy=y;}if(cy>1)cy=0.86;
  /* (where full thighs meet, the midline's lowest point drops well below the real crotch: never below the hip joint's
     crotch line, or the fabric bridging there missed the seat and a tee was drawn into the top of its cleft) */
  cy=Math.max(cy,M.J.hipL[1]-0.085);
  /* unsmoothed trunk outline (max radius per height and direction): what fabric really rests on, e.g. the bust apex */
  const RA=128,RY0=0.7,RST=0.01,RN=Math.round((1.6-RY0)/RST)+1,RAW=new Float32Array(RN*RA);
  for(let i=0;i<n;i++){if(reg[i]!==0)continue;const y=P[i*3+1];if(y<RY0||y>1.6)continue;const j=Math.round((y-RY0)/RST),k=((Math.round((Math.atan2(P[i*3+2],P[i*3])+Math.PI)/TAU*RA)%RA)+RA)%RA,rr=Math.hypot(P[i*3],P[i*3+2]);if(rr>RAW[j*RA+k])RAW[j*RA+k]=rr;}
  for(let j=0;j<RN;j++)for(let p=0;p<2;p++){const o=j*RA,c=RAW.slice(o,o+RA);for(let k=0;k<RA;k++)RAW[o+k]=Math.max(c[k],0.5*(c[(k+1)%RA]+c[(k+RA-1)%RA]));}
  const rawAt=(th,y)=>{const j=Math.round((y-RY0)/RST);if(j<0||j>=RN)return 0;const k=((Math.round((th+Math.PI)/TAU*RA)%RA)+RA)%RA;return RAW[j*RA+k];};
  return M[ck]={rawAt,level,P,N,W,ix,n,off,adj,reg,C,Ps,Ns,Pss,cy};
}
/* (theta, x, rho) of a point around a region axis: 0 trunk (x=y), 1/2 arms (x=t along the arm), 3/4 legs (x=y) */
function shCoord(r,x,y,z,out,o){
  if(r===0){out[o]=Math.atan2(z,x);out[o+1]=y;out[o+2]=Math.hypot(x,z);return;}
  const sd=(r===1||r===3)?1:-1;
  if(r>=3){const dx=(x-sd*BC.legX)*sd;out[o]=Math.atan2(z,dx);out[o+1]=y;out[o+2]=Math.hypot(dx,z);return;}
  const q=armProj(x*sd,y,z);out[o]=Math.atan2(q.lv,q.lu);out[o+1]=q.t;out[o+2]=Math.hypot(q.lu,q.lv);
}
/* point back from (theta, x, rho) */
function shPoint(r,th,xx,rho,out){
  if(r===0){out[0]=Math.cos(th)*rho;out[1]=xx;out[2]=Math.sin(th)*rho;return;}
  const sd=(r===1||r===3)?1:-1;
  if(r>=3){out[0]=sd*(BC.legX+Math.cos(th)*rho);out[1]=xx;out[2]=Math.sin(th)*rho;return;}
  const c=armPt(xx,1),f=armFrame(xx,1),cu=Math.cos(th)*rho,sv=Math.sin(th)*rho;
  out[0]=sd*(c.x+f.u.x*cu+f.v.x*sv);out[1]=c.y+f.u.y*cu+f.v.y*sv;out[2]=c.z+f.u.z*cu+f.v.z*sv;
}
const SH_RANGE=[[0,1.72,0.0025,0.13],[-0.12,1.06,0.0025,0.045],[-0.12,1.06,0.0025,0.045],[0,1.0,0.0025,0.065],[0,1.0,0.0025,0.065]];
/* ---------- polar grid: rasterised outer radius of a set of triangles ---------- */
/* empty grids share one read-only buffer per region; a grid gets its own memory on the first raster */
const PG_EMPTY=[];
function PGrid(r){const[x0,x1,st,rt]=SH_RANGE[r];this.r=r;this.x0=x0;this.st=st;this.rt=rt;this.N=Math.round((x1-x0)/st)+1;
  if(!PG_EMPTY[r])PG_EMPTY[r]={R:new Float32Array(this.N*SH_NA).fill(-1),M:new Int16Array(this.N*SH_NA).fill(-1)};this.R=PG_EMPTY[r].R;this.M=PG_EMPTY[r].M;this.any=false;this.own=false;}
PGrid.prototype.mine=function(){if(!this.own){this.R=this.R.slice();this.M=this.M.slice();this.own=true;}};
PGrid.prototype.raster=function(T,mat){/* T: 9 numbers per triangle (th,x,rho)x3 */
  if(!T.length)return;this.mine();
  const NA=SH_NA,da=TAU/NA,N=this.N,R=this.R,Mi=this.M;
  for(let t=0;t<T.length;t+=9){let a0=T[t],a1=T[t+3],a2=T[t+6];const x0=T[t+1],x1=T[t+4],x2=T[t+7],r0=T[t+2],r1=T[t+5],r2=T[t+8];
    a1=a0+wrapA(a1-a0);a2=a0+wrapA(a2-a0);if(Math.max(a0,a1,a2)-Math.min(a0,a1,a2)>1.2)continue;
    const amin=Math.min(a0,a1,a2),amax=Math.max(a0,a1,a2),xmin=Math.min(x0,x1,x2),xmax=Math.max(x0,x1,x2);
    const i0=Math.ceil(amin/da-0.5),i1=Math.floor(amax/da-0.5),j0=Math.max(0,Math.ceil((xmin-this.x0)/this.st)),j1=Math.min(N-1,Math.floor((xmax-this.x0)/this.st));
    const det=(a1-a0)*(x2-x0)-(a2-a0)*(x1-x0);
    if(Math.abs(det)<1e-12){/* sliver: stamp the vertices */for(const[a,x,rr] of [[a0,x0,r0],[a1,x1,r1],[a2,x2,r2]]){const j=Math.round((x-this.x0)/this.st);if(j<0||j>=N)continue;const i=((Math.round(a/da-0.5)%NA)+NA)%NA,k=j*NA+i;if(rr>R[k]){R[k]=rr;Mi[k]=mat;}}continue;}
    for(let j=j0;j<=j1;j++){const x=this.x0+j*this.st;for(let i=i0;i<=i1;i++){const a=(i+0.5)*da;
      const u=((a-a0)*(x2-x0)-(a2-a0)*(x-x0))/det,v=((a1-a0)*(x-x0)-(a-a0)*(x1-x0))/det;if(u<-1e-4||v<-1e-4||u+v>1+1e-4)continue;
      const rr=r0+(r1-r0)*u+(r2-r0)*v,k=j*NA+((i%NA)+NA)%NA;if(rr>R[k]){R[k]=rr;Mi[k]=mat;}}}
    this.any=true;}
};
/* light hole filling: bins surrounded by covered bins (rasterisation gaps) */
PGrid.prototype.close=function(){if(!this.any)return;const NA=SH_NA,N=this.N,R=this.R,Mi=this.M;
  /* only rows that hold anything */let j0=N,j1=-1;for(let j=0;j<N;j++){const o=j*NA;for(let i=0;i<NA;i++)if(R[o+i]>=0){if(j<j0)j0=j;j1=j;break;}}
  for(let p=0;p<2;p++){const c=R.slice();
  for(let j=Math.max(1,j0-1);j<=Math.min(N-2,j1+1);j++){const o=j*NA;for(let i=0;i<NA;i++){const k=o+i;if(c[k]>=0)continue;let s=0,w=0,m=-1,kk;
    kk=o+(i+1)%NA;if(c[kk]>=0){s+=c[kk];w++;m=Mi[kk];}kk=o+(i+NA-1)%NA;if(c[kk]>=0){s+=c[kk];w++;m=Mi[kk];}kk=k+NA;if(c[kk]>=0){s+=c[kk];w++;m=Mi[kk];}kk=k-NA;if(c[kk]>=0){s+=c[kk];w++;m=Mi[kk];}
    if(w>=3){R[k]=s/w;Mi[k]=m;}}}}};
/* bilinear radius over covered bins */
PGrid.prototype.at=function(th,x){const NA=SH_NA,g=((th/TAU*NA-0.5)%NA+NA)%NA,i=Math.floor(g),u=g-i,f=(x-this.x0)/this.st;if(f<0||f>this.N-1)return -1;
  const j=Math.min(this.N-2,Math.floor(f)),v=f-j,i2=(i+1)%NA,R=this.R;let s=0,w=0;
  for(const[jj,ii,ww] of [[j,i,(1-u)*(1-v)],[j,i2,u*(1-v)],[j+1,i,(1-u)*v],[j+1,i2,u*v]]){const r=R[jj*NA+ii];if(r>=0&&ww>0){s+=r*ww;w+=ww;}}return w>1e-6?s/w:-1;};
/* radius of the nearest covered bin (searching outwards), for points just past the garment's edge */
PGrid.prototype.nearest=function(th,x){const NA=SH_NA,i0=((Math.round(th/TAU*NA-0.5)%NA)+NA)%NA,j0=clamp(Math.round((x-this.x0)/this.st),0,this.N-1),R=this.R;
  for(let d=0;d<80;d++)for(let dj=-d;dj<=d;dj++){const j=j0+dj;if(j<0||j>=this.N)continue;const span=d-Math.abs(dj);for(const di of span?[-span,span]:[0]){const r=R[j*NA+((i0+di)%NA+NA)%NA];if(r>=0)return r;}}return -1;};
PGrid.prototype.matAt=function(th,x){const NA=SH_NA,i=((Math.round(th/TAU*NA-0.5)%NA)+NA)%NA,j=clamp(Math.round((x-this.x0)/this.st),0,this.N-1);return this.M[j*NA+i];};
/* signed distance to the edge of the covered area (metres along the surface): >0 inside the garment */
PGrid.prototype.sdf=function(){
  const NA=SH_NA,N=this.N,R=this.R,dA=TAU/NA*this.rt,dX=this.st,dD=Math.hypot(dA,dX),INF=1e9;
  const pass=(inside)=>{const D=new Float32Array(N*NA);for(let k=0;k<N*NA;k++)D[k]=((R[k]>=0)===inside)?INF:0;
    for(let it=0;it<2;it++){
      for(let j=0;j<N;j++)for(let i=0;i<NA;i++){const k=j*NA+i;let d=D[k];const l=j*NA+(i+NA-1)%NA;d=Math.min(d,D[l]+dA);if(j>0){const u=(j-1)*NA;d=Math.min(d,D[u+i]+dX,D[u+(i+NA-1)%NA]+dD,D[u+(i+1)%NA]+dD);}D[k]=d;}
      for(let j=N-1;j>=0;j--)for(let i=NA-1;i>=0;i--){const k=j*NA+i;let d=D[k];const rr=j*NA+(i+1)%NA;d=Math.min(d,D[rr]+dA);if(j<N-1){const u=(j+1)*NA;d=Math.min(d,D[u+i]+dX,D[u+(i+NA-1)%NA]+dD,D[u+(i+1)%NA]+dD);}D[k]=d;}}
    return D;};
  const In=pass(true),Out=pass(false);this.S=new Float32Array(N*NA);for(let k=0;k<N*NA;k++)this.S[k]=R[k]>=0?In[k]-0.5*dA:-(Out[k]-0.5*dA);
};
PGrid.prototype.sdfAt=function(th,x){const NA=SH_NA,g=((th/TAU*NA-0.5)%NA+NA)%NA,i=Math.floor(g),u=g-i,f=(x-this.x0)/this.st;if(f<0||f>this.N-1)return -1;
  const j=Math.min(this.N-2,Math.floor(f)),v=f-j,i2=(i+1)%NA,S=this.S;return(S[j*NA+i]*(1-u)+S[j*NA+i2]*u)*(1-v)+(S[(j+1)*NA+i]*(1-u)+S[(j+1)*NA+i2]*u)*v;};
/* ---------- collect a mesh into region grids ---------- */
function shTrisOf(mesh,r){
  const ck=mesh.matrixWorld.elements.join(',')+'|'+r+'|'+mesh.geometry.uuid;mesh.userData.__tris=mesh.userData.__tris||{};if(mesh.userData.__tris.k===ck)return mesh.userData.__tris.T;
  const T0=shTrisOf0(mesh,r);mesh.userData.__tris={k:ck,T:T0};return T0;}
/* the trunk part of a shell only (no sleeve triangles): in trunk coordinates a hanging sleeve lies over the side of the
   body, and its radius stood for the garment's there */
function shTrunkTris(mesh){const T=shTrisOf(mesh,0),rg=mesh.geometry.userData.reg,ix=mesh.geometry.index?mesh.geometry.index.array:null;if(!rg||!ix)return T;
  const out=[];for(let t=0;t<ix.length/3;t++){const a=rg[ix[t*3]],b=rg[ix[t*3+1]],c=rg[ix[t*3+2]];if(a===1||a===2||b===1||b===2||c===1||c===2)continue;for(let k=0;k<9;k++)out.push(T[t*9+k]);}
  return Float32Array.from(out);}
function shTrisOf0(mesh,r){
  const g=mesh.geometry,p=g.attributes.position,ix=g.index?g.index.array:null,m=mesh.matrixWorld,v=new THREE.Vector3(),n=p.count,co=new Float32Array(n*3);
  for(let i=0;i<n;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);shCoord(r,v.x,v.y,v.z,co,i*3);}
  const nt=ix?ix.length/3:Math.floor(n/3),T=new Float32Array(nt*9);let w=0;
  for(let t=0;t<nt;t++){for(let k=0;k<3;k++){const a=ix?ix[t*3+k]:t*3+k;T[w++]=co[a*3];T[w++]=co[a*3+1];T[w++]=co[a*3+2];}}
  return T;
}
const shRegionOfAxis=a=>a==='armL'?1:a==='armR'?2:a==='legL'?3:a==='legR'?4:0;
/* ---------- build every garment shell, then re-seat the details ---------- */
/* what the garment itself asks for: its ease from the cut and the chosen size (no padding for what is worn under it -
   the layers are stacked explicitly: trousers, shirt (or the shirt under the trousers when tucked), sweater, jacket) */
function shLayerFit(L){
  const P=L.name==='mid'?S.mid:S[L.name];L.tuck='out';
  if(L.name==='bottom'){L.rank=1;L.fitE=null;return;}
  let e=0.02;
  if(L.name==='top'){e=(TOP_FITS[P.fit]||TOP_FITS.regular).e;L.tuck=TOPS[P.type]&&TOPS[P.type].tuck?(P.tuck||'out'):'out';L.rank=L.tuck==='in'?0:2;}
  else if(L.name==='mid'){e=MID_ITEMS[P.type]==='top'?(TOP_FITS[P.fit]||TOP_FITS.regular).e:((OUTERS[P.type]||{}).e||0.03)*((OUTER_FITS[P.fit]||{}).m||1);L.rank=3;}
  else{e=((OUTERS[P.type]||{}).e||0.035)*((OUTER_FITS[P.fit]||{}).m||1);L.rank=4;L.sleeveless=!!(OUTERS[P.type]||{}).sleeveless;}
  L.fitE=Math.max(0.004,easeCap(e+sizeEase(P).d));
  /* quilted (puffer) garments: channels are stitched into the fitted fabric (shFolds) */
  if(L.name!=='top'&&L.name!=='bottom'){const OT=OUTERS[P.type];L.quilt=!!(OT&&OT.quilt&&(L.name==='outer'||MID_ITEMS[P.type]==='outer'));}
  /* the outfit as a whole: over slim trousers a top or jacket is cut closer at the waist, over relaxed / wide ones it falls easier;
     a bulky layer underneath (hoodie, sweater, oversized tee) gives the next layer room */
  if(L.name!=='bottom'){const B=S.bottom,bf=B&&B.type!=='none'&&BOTTOMS[B.type]&&!BOTTOMS[B.type].skirt?B.fit:null;
    const k={skinny:0.75,slim:0.85,straight:1,regular:1,relaxed:1.15,baggy:1.3,wide:1.3,flared:1.05,bootcut:1,tapered:0.95,balloon:1.25,barrel:1.15}[bf]||1;L.waistK=k;
    let under=0;if(L.rank>=3){const T=S.top;if(T&&T.type!=='none')under=Math.max(under,(TOP_FITS[T.fit]||TOP_FITS.regular).e);if(L.rank===4&&S.mid&&S.mid.type!=='none')under=Math.max(under,0.03);}
    L.fitE=Math.max(L.fitE,under*0.8+0.006);}
}
/* pieces not fitted as shells (a skirt as cut, the curtain of a long top, shirt tails) clear of the body: the outlines they
   come from are smoother than the body's muscle and fat relief - the top of a full seat came through a skirt as two
   patches, full hips through a shirt's tail over a skirt. Each vertex at least 3 mm out from the nearest body point along
   that point's normal */
function shSkirtClear(G,sk,spread=true){const H=poseHash(),B=shellBase(1),BP=B.P,BN=B.N;
  for(const o of sk){if(!o||!o.geometry)continue;shBake(o,o.parent||G);const g=o.geometry,p=g.attributes.position,NV=p.count,D=new Float32Array(NV*3);let ch=false;
    for(let i=0;i<NV;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),[j]=H.near2(x,y,z);if(j<0)continue;
      const d=(x-BP[j*3])*BN[j*3]+(y-BP[j*3+1])*BN[j*3+1]+(z-BP[j*3+2])*BN[j*3+2];if(d<0.003){const q=0.003-d;D[i*3]=BN[j*3]*q;D[i*3+1]=BN[j*3+1]*q;D[i*3+2]=BN[j*3+2]*q;ch=true;}}
    if(!ch)continue;if(!spread){for(let i=0;i<NV;i++)p.setXYZ(i,p.getX(i)+D[i*3],p.getY(i)+D[i*3+1],p.getZ(i)+D[i*3+2]);p.needsUpdate=true;g.computeVertexNormals();continue;}
    /* spread the push to the neighbours with a falloff: pushing single vertices out of a pleat valley left sharp steps */
    const can=new Uint32Array(NV),same=new Map(),pa=p.array;for(let i=0;i<NV;i++){const k=posKey(pa[i*3],pa[i*3+1],pa[i*3+2]);let c=same.get(k);if(c===undefined){same.set(k,i);c=i;}can[i]=c;}
    const nb=new Map(),add=(a,b)=>{a=can[a];b=can[b];if(a===b)return;let s=nb.get(a);if(!s)nb.set(a,s=new Set());s.add(b);};
    const ix=g.index?g.index.array:null,NT=ix?ix.length:NV;for(let t=0;t<NT;t+=3)for(let k=0;k<3;k++){const a=ix?ix[t+k]:t+k,b=ix?ix[t+(k+1)%3]:t+(k+1)%3;add(a,b);add(b,a);}
    for(let i=0;i<NV;i++){const c=can[i];if(c!==i&&D[i*3]*D[i*3]+D[i*3+1]*D[i*3+1]+D[i*3+2]*D[i*3+2]>D[c*3]*D[c*3]+D[c*3+1]*D[c*3+1]+D[c*3+2]*D[c*3+2])for(let k=0;k<3;k++)D[c*3+k]=D[i*3+k];}
    for(let it=0;it<10;it++){const E=D.slice();for(const [c,s] of nb){let x=0,y=0,z=0;for(const b of s){x+=E[b*3];y+=E[b*3+1];z+=E[b*3+2];}const f=0.88/s.size;x*=f;y*=f;z*=f;
      if(x*x+y*y+z*z>E[c*3]*E[c*3]+E[c*3+1]*E[c*3+1]+E[c*3+2]*E[c*3+2]){D[c*3]=x;D[c*3+1]=y;D[c*3+2]=z;}}}
    for(let i=0;i<NV;i++){const c=can[i];p.setXYZ(i,p.getX(i)+D[c*3],p.getY(i)+D[c*3+1],p.getZ(i)+D[c*3+2]);}
    p.needsUpdate=true;g.computeVertexNormals();}}
function buildShells(G,GS){
  if(!BC.core)return;
  G.updateMatrixWorld(true);
  const order=['bottom','top','mid','outer'],layers=[];
  const mains=[],others=[];
  const linings=[];G.traverse(o=>{if(!o.isMesh||o.userData.ctx!=='cloth')return;(o.userData.lining?linings:o.userData.main?mains:others).push(o);});
  if(!mains.length){for(const o of others)o.userData.ctx='none';const sk=[];G.traverse(o=>{if(o.isMesh&&o.userData.skirtPiece)sk.push(o);});if(sk.length)shSkirtClear(G,sk);return;}
  const CY=shellBase(1).cy;
  for(const name of order){const ms=mains.filter(o=>o.userData.layer===name);if(!ms.length)continue;
    const lin=linings.find(o=>o.userData.layer===name);
    const L={name,grids:[null,null,null,null,null],mats:[],meshes:ms,lowerCut:null,lining:lin?lin.material:null};
    shLayerFit(L);
    for(const o of ms){const r=shRegionOfAxis(o.geometry.userData.axis);if(!L.grids[r])L.grids[r]=new PGrid(r);let mi=L.mats.indexOf(o.material);if(mi<0){mi=L.mats.length;L.mats.push(o.material);}L.grids[r].raster(shTrisOf(o,r),mi);
      /* bands of another colour across the trunk (heights y0..y1): cut exactly in shEmit */
      if(r===0&&o.geometry.userData.matBands)for(const b of o.geometry.userData.matBands){let bi=L.mats.indexOf(b.mat);if(bi<0){bi=L.mats.length;L.mats.push(b.mat);}(L.bands=L.bands||[]).push({y0:b.y0,y1:b.y1,mi:bi});}}
    for(const g of L.grids)if(g){g.close();g.sdf();}
    /* a torso garment that goes below the crotch with no trouser legs (long coats): the skirt part stays a tube */
    const lowOf=g=>{for(let j=0;j<g.N;j++)for(let i=0;i<SH_NA;i++)if(g.R[j*SH_NA+i]>=0)return g.x0+j*g.st;return 9;};
    const T=L.grids[0];if(T&&!L.grids[3]&&lowOf(T)<CY+0.09)L.lowerCut=CY+0.065;
    if(L.grids[3]&&lowOf(L.grids[3])<0.15)L.legCut=0.17;
    /* where each sleeve ends, and whether it is gathered into a cuff (rib / buttoned cuffs) */
    {const g1=L.grids[1];L.sleeveEnd=-1;if(g1&&g1.any)for(let j=g1.N-1;j>=0;j--){let hit=false;for(let i=0;i<SH_NA;i+=4)if(g1.R[j*SH_NA+i]>=0){hit=true;break;}if(hit){L.sleeveEnd=g1.x0+j*g1.st;break;}}
      const PP=L.name==='mid'?S.mid:S[L.name],T0=(L.name==='top'?TOPS:MID_ITEMS[PP.type]==='top'&&L.name==='mid'?TOPS:OUTERS)[PP.type]||{};L.cuffGather=!!(T0.cuff||(L.name!=='outer'&&L.name!=='bottom'));}
    layers.push(L);}
  const hiQ=false,B=shellBase(1),B2=B,n=B.n,P=B.P,Nn=B.N,C=B.C,reg=B.reg,W=B.W;
  /* per layer: coverage, pattern radius and relaxed fabric positions */
  for(const L of layers){
    const f=new Float32Array(n).fill(-1),fe=new Float32Array(n).fill(-1),R=new Float32Array(n).fill(-1),act=new Uint8Array(n),X=new Float32Array(n*3),E=new Float32Array(n);
    /* an open jacket / cardigan: the fronts fall away from the body a little */
    const openF=(L.name==='outer'||L.name==='mid')&&L.grids[0]&&L.grids[0].sdfAt(FRONT,1.1)<0;
    const tmp=new Float32Array(3),tmp2=[0,0,0];
    for(let v=0;v<n;v++){let r=reg[v];const y=P[v*3+1];
      let g=L.grids[r],th=C[v*3],xx=C[v*3+1],rho=C[v*3+2],fv=g?g.sdfAt(th,xx):-1;
      /* near the armpit / seat a vertex may belong to the trunk part of the pattern */
      const T0=L.grids[0];
      if(r!==0&&T0){shCoord(0,P[v*3],y,P[v*3+2],tmp,0);let cut=r<=2?Math.max((0.42-W[v*3])*0.08,(y-(BC.shY-0.03))*0.6,(0.12-C[v*3+1])*0.4):(y-0.78);
        /* sleeveless: the armhole ends at the shoulder point, the trunk does not spill onto the arm */
        if(r<=2&&L.sleeveless)cut=Math.min(cut,(0.0-C[v*3+1])*0.5,(0.6-W[v*3])*0.08);const ft=Math.min(T0.sdfAt(tmp[0],tmp[1]),cut);
        if(ft>fv){fv=ft;g=T0;r=0;th=tmp[0];xx=tmp[1];rho=tmp[2];}}
      /* groin: a trunk vertex can also belong to the trouser leg on its side */
      if(reg[v]===0&&r===0&&y<0.95){const lr=P[v*3]>=0?3:4,Lg=L.grids[lr];if(Lg){shCoord(lr,P[v*3],y,P[v*3+2],tmp,0);const fl=Lg.sdfAt(tmp[0],tmp[1]);if(fl>fv){fv=fl;g=Lg;r=lr;th=tmp[0];xx=tmp[1];rho=tmp[2];}}}
      if(!g)continue;fv=Math.min(fv,(0.3-W[v*3+2])*0.1);f[v]=fv;
      /* fe: distance to a real edge of the garment (the curtain cut is not one: the fabric continues below it) */
      /* (the shell of a coat ends 2 cm above the cut: lower down it is made from the body between the legs and turned in there;
         the sleeves are not cut - a hand hangs below the cut and the sleeve ended short of the cuff) */
      fe[v]=f[v];if(L.lowerCut!=null&&r!==1&&r!==2)f[v]=Math.min(f[v],y-L.lowerCut-(r===0?0.018:-0.012));if(L.legCut!=null)f[v]=Math.min(f[v],y-L.legCut);
      if(f[v]<-0.045)continue;
      let Rv=g.at(th,xx);if(Rv<0)Rv=g.nearest(th,xx);
      if(Rv<0)continue;
      act[v]=1;L.rv=L.rv||new Uint8Array(n);L.rv[v]=r;R[v]=Rv;let e=Math.max(0.0025,Rv-rho);
      const sup=smooth((Nn[v*3+1]-0.25)/0.4)*smooth((y-1.22)/0.08);if(sup>0){const ec=0.006+0.22*e;if(e>ec){const e2=lerp(e,ec,sup);Rv-=e-e2;R[v]=Rv;e=e2;}}
      /* oversized shoulders: the fabric still rests on the shoulder and slopes off it; the volume starts lower down the arm */
      {const xw0=Math.abs(P[v*3]),shz=(r===0?smooth((xw0-BC.shX*0.55)/(BC.shX*0.3)):r<=2?1-smooth((xx-0.1)/0.16):0)*smooth((y-(BC.shY-0.13))/0.08)*smooth((Nn[v*3+1]+0.35)/0.4);
        if(shz>0){const ec=0.007+0.3*e;if(e>ec){const e2=lerp(e,ec,shz);Rv-=e-e2;R[v]=Rv;e=e2;}}}
      if(openF&&r===0){const fr=smooth((Math.sin(th)-0.15)/0.45)*(1-smooth(fv/0.08))*smooth((1.27-y)/0.14),ex=0.011*fr;if(ex>0){Rv+=ex;R[v]=Rv;e+=ex;}}
      /* below the chest the body narrows: the garment keeps only its own ease there (not the chest width plus padding) */
      if(r===0&&L.fitE!=null){const wcap=(1-smooth((y-(BC.shY-0.2))/0.1))+smooth((y-(BC.shY-0.2))/0.1)*(1-smooth((y-(BC.shY-0.06))/0.05))*smooth(Math.abs(Math.sin(th))/0.6),ec=(L.fitE*1.25+0.003)*lerp(1,L.waistK||1,1-smooth((y-1.12)/0.12));if(wcap>0&&e>ec){const e2=lerp(e,ec,wcap);Rv-=e-e2;R[v]=Rv;e=e2;}}
      if(r===0&&L.sleeveless&&L.fitE!=null){const arm=smooth((Math.abs(P[v*3])-BC.shX*0.55)/(BC.shX*0.25))*smooth((y-(BC.shY-0.26))/0.08);if(arm>0){const ec=L.fitE*0.6+0.003;if(e>ec){const e2=lerp(e,ec,arm);Rv-=e-e2;R[v]=Rv;e=e2;}}}
      /* sleeves narrow into the cuff over the last few cm (no bell at the wrist) */
      if((r===1||r===2)&&L.sleeveEnd>0.6){const k=smooth((xx-(L.sleeveEnd-0.09))/0.07)*(L.cuffGather?1:0.6),ec=0.005+0.25*Math.min(e,0.02);if(k>0&&e>ec){const e2=lerp(e,ec,k);Rv-=e-e2;R[v]=Rv;e=e2;}}
      E[v]=e;
      /* small ease: offset along the skin normal (keeps the anatomy); big ease: sit on the pattern */
      const nearCut=L.legCut!=null?1-smooth((y-L.legCut)/0.07):0,w=Math.max(smooth((e-0.014)/0.04),nearCut);L.pin=L.pin||new Float32Array(n);L.pin[v]=nearCut;
      /* trousers: the top 3 cm hang from the waistband (relaxed freely they slid 1.5 cm down a belly, away from the band) */
      if(L.name==='bottom'&&r===0&&y>B.cy)L.pin[v]=Math.max(L.pin[v],0.85*(1-smooth((fv-0.004)/0.03)));shPoint(r,th,xx,Rv,tmp);
      const Ps=B.Ps,Ns=B.Ns,lift=(Ps[v*3]-P[v*3])*Nn[v*3]+(Ps[v*3+1]-P[v*3+1])*Nn[v*3+1]+(Ps[v*3+2]-P[v*3+2])*Nn[v*3+2],es=Math.max(0.0025,e-lift),nx=Ps[v*3]+Ns[v*3]*es,ny=Ps[v*3+1]+Ns[v*3+1]*es,nz=Ps[v*3+2]+Ns[v*3+2]*es;
      let tx=lerp(nx,tmp[0],w),ty=lerp(ny,tmp[1],w),tz=lerp(nz,tmp[2],w);
      /* stretched-fabric outline (convex in each slice, hanging below the chest): the pattern point mapped onto the body hull */
      const xw=Math.abs(P[v*3]),wc0=r===0?1-smooth((xw-BC.shX*0.62)/(BC.shX*0.25))*smooth((y-(BC.shY-0.1))/0.06):r<=2?0.6:0.3,wc=Math.max(wc0,nearCut);
      if(wc>0&&BC.core.fit){FIT_ST=0;const sd=(r===1||r===3)?1:-1;if(r===0)mapTorso(tmp[0],tmp[1],tmp[2],tmp2);else if(r<=2)mapArm(tmp[0],tmp[1],tmp[2],sd,tmp2);else mapLeg(tmp[0],tmp[1],tmp[2],sd,tmp2);
        tx=lerp(tx,tmp2[0],wc);ty=lerp(ty,tmp2[1],wc);tz=lerp(tz,tmp2[2],wc);}
      /* below the chest and shoulder blades fabric falls nearly straight down instead of tucking under the pecs */
      /* (and under a belly: within ~12 cm it hangs from the belly instead of tucking back in) */
      if(r===0&&BC.core.fit&&y<1.34&&y>0.75){const thx=Math.atan2(tz,tx),rx=Math.hypot(tx,tz);let Rh=0;for(let k=1;k<=8;k++){const yy=y+k*0.02;if(yy>1.37)break;Rh=Math.max(Rh,BC.core.fit.T.at(thx,yy)-0.0044*k);}
        let Rb=0;for(let k=1;k<=6;k++){const yy=y+k*0.02;if(yy>1.2)break;Rb=Math.max(Rb,BC.core.fit.T.at(thx,yy)-0.0055*k);}
        /* the bust: spans down from the apex (raw outline, the smoothed hull flattens it) */
        if(BC.g==='f')for(let k=1;k<=12;k++){const yy=y+k*0.01;if(yy>1.36)break;Rb=Math.max(Rb,B.rawAt(thx,yy)+0.002-0.0018*k);}
        /* fabric never follows the fold under the bust: even a fitted top spans down from it */
        const bust=BC.g==='f'?0.9*gauss(y-1.2,0.09)*smooth((Math.sin(thx)-0.2)/0.4):0;
        const hw=Math.max(smooth((e-0.0025)/0.012)*(L.name==='outer'?1:L.name==='mid'?0.95:0.8),bust),ws=smooth((y-1.06)/0.1),RR=Math.max(Rh*ws,Rb),want=lerp(rx,RR+Math.min(e,0.008),hw);if(want>rx){const k2=want/rx;tx*=k2;tz*=k2;}}
      /* loose sleeves hang: the cross-section drops, the top rests on the arm (skin collision), the underside sags */
      if(r===1||r===2)ty-=0.55*Math.max(0,e-0.004)*smooth((xx-0.08)/0.15);
      X[v*3]=tx;X[v*3+1]=ty;X[v*3+2]=tz;}
    L.f=f;L.fe=fe;L.R=R;L.act=act;L.X=X;L.E=E;
    if(window.__shDbg&&L.name===window.__shDbg){const o=[];for(let v=0;v<n;v++){const x=P[v*3],y=P[v*3+1];if(Math.abs(x)<0.035&&y>0.74&&y<0.86&&Math.abs(P[v*3+2])<0.05&&v%7===0)o.push([+x.toFixed(3),+y.toFixed(3),+P[v*3+2].toFixed(3),reg[v],+f[v].toFixed(3),act[v]]);}window.__shOut=o;}
    shRelax(B,L);shLoose(B,L);}
  /* layers never cross: order them at every point by how far out their pattern was */
  shOrder(B,layers);
  /* boot shafts: trousers worn over the boots clear them, trousers tucked in stay inside */
  const OB=shObstacleGrids(G,GS);if(OB)shObstacles(B,layers,OB);
  /* gravity: let the fabric settle on the body */
  if(window.__noDrape!==1)shDrape(B,layers);
  /* high quality: carry the settled fabric up to the twice smoothed surface (fine folds and the cut happen there) */
  if(hiQ)for(const L of layers)shUpsample(B,B2,L);
  /* folds, then cut along the hems / necklines / openings and emit the meshes */
  const shells=[];
  for(const L of layers){shHull(B2,L);shLoose(B2,L);}
  for(const L of layers){shFolds(B2,L);shMidline(B2,L);shBodyClear(B2,L);shUntangle(B2,L);}
  /* the drape, the hull and the folds only know the body: trousers over boots settled back into the shaft and its top
     showed round the shin - over the boots once more */
  if(OB)shObstacles(B2,layers,OB);
  /* the crotch / inseam corrections moved some fabric: stack the layers once more */
  shOrder(B2,layers);
  for(const L of layers){const ms=shEmit(B2,L);for(const m of ms){m.userData.layer=L.name;shells.push(m);}}
  /* old outer surface vs new, per region: details move with the fabric they sat on */
  const oldU=[0,1,2,3,4].map(r=>new PGrid(r)),newU=[0,1,2,3,4].map(r=>new PGrid(r));
  for(const L of layers)for(const o of L.meshes){const r=shRegionOfAxis(o.geometry.userData.axis);oldU[r].raster(shTrisOf(o,r),0);}
  /* per garment too: a detail follows its own garment, not whatever lies under it */
  for(const L of layers){L.newG=[0,1,2,3,4].map(r=>new PGrid(r));}
  for(const m of shells){const L=layers.find(l=>l.name===m.userData.layer);shRasterShell(m,newU);if(L)shRasterShell(m,L.newG);}
  /* parts of the pattern that stay (coat skirts, shirt tails over the hips, trouser hems) count as new fabric too */
  const kept=[];for(const L of layers)for(const o of L.meshes){const ra=shRegionOfAxis(o.geometry.userData.axis),cut=ra===0?L.lowerCut:ra>=3?L.legCut:null;
    if(cut!=null&&ra===0){if(!L.curtain){L.curtain=1;const tails=others.filter(t=>t.userData.tail&&t.userData.layer===L.name);const cm=shCurtain(L,cut,shells,B2,tails,layers);for(const t of tails){if(t.parent)t.parent.remove(t);others.splice(others.indexOf(t),1);}if(cm){G.add(cm);L.curtainMesh=cm;const T3=shTrisOf(cm,0);newU[0].raster(T3,0);L.newG[0].raster(T3,0);}}continue;}
    if(cut!=null){shKeepBelow(o,cut+0.03);shBake(o,G);FIT_ST=0;conformGeo(o.geometry,o.geometry.userData.axis,0);if(ra>=3){shBlendKept(o,L.newG[ra],ra,cut);shUvKept(o,ra);}if(OB&&ra>=3){shKeptOverShoes(o,OB);/* (pushed over the shoes after the blend: a ledge where the shell ends; blended again, then
      clear of the shoe once more - a boot's collar in the blend zone was pulled under; only for shafts reaching the cut:
      at low shoes the second push left sharp bumps) */if(OB.top>cut){shBlendKept(o,L.newG[ra],ra,cut);shKeptOverShoes(o,OB,false);}}/* (clear of the skin too: the instep came through tight leggings at the front of the ankle) */shSkirtClear(G,[o]);o.userData.conformed=true;const T3=shTrisOf(o,ra);newU[ra].raster(T3,0);L.newG[ra].raster(T3,0);kept.push(o);}}
  const shift=[0,1,2,3,4].map(r=>shShiftGrid(oldU[r],newU[r]));
  for(const L of layers){L.shift=[0,1,2,3,4].map(r=>shShiftGrid(L.grids[r]||new PGrid(r),L.newG[r]));}
  /* shirt tails not taken into a curtain (the shirt ends above the crotch): they continue the fitted shell's outline instead
     of the wide pattern hem (they stood out round the hips like a ribbon) */
  for(const o of others){if(!o.userData.tail||!o.parent)continue;const L=layers.find(l=>l.name===o.userData.layer),SG=L&&L.newG&&L.newG[0];if(!SG||!SG.any)continue;
    shBake(o,G);const p=o.geometry.attributes.position,c=new Float32Array(3),q=new Float32Array(3);
    const lowR=new Map(),RAt=th=>{const k=Math.round(th*64);if(lowR.has(k))return lowR.get(k);let R=-1;for(let y=1.05;y>0.6;y-=0.004){const r=SG.at(th,y);if(r<0){if(R>0)break;continue;}R=r;}lowR.set(k,R);return R;};
    /* the tail hangs straight down from the shell's lower edge at its angle (not pressed into the gap between the legs) */
    for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);const R=RAt(c[0]);if(R<0)continue;shPoint(0,c[0],c[1],R+0.0008,q);p.setXYZ(i,q[0],q[1],q[2]);}
    /* and over the trousers under it (they showed through the tail's lower edge) */
    for(const U of layers){if(U.rank>=L.rank||!U.newG)continue;for(const r of [0,3,4]){const UG=U.newG[r];if(!UG||!UG.any)continue;
      for(let i=0;i<p.count;i++){shCoord(r,p.getX(i),p.getY(i),p.getZ(i),c,0);const Ru=UG.at(c[0],c[1]);if(Ru>0&&c[2]<Ru+0.003){shPoint(r,c[0],c[1],Ru+0.003,q);p.setXYZ(i,q[0],q[1],q[2]);}}}}
    p.needsUpdate=true;o.geometry.computeVertexNormals();o.userData.reseated=true;o.userData.tailFitted=true;o.userData.ctx='none';}
  for(const o of others){if(o.userData.tailFitted)continue;const L=layers.find(l=>l.name===o.userData.layer);shReseat(o,L?L.shift:shift,G,L&&L.curtainMesh?L.lowerCut:null);o.userData.reseated=true;if(L&&o.userData.pocket)shPocketOnFabric(o,L);if(L&&!o.userData.hood&&!o.userData.band&&!o.userData.hemPiece)shDetailOnFabric(o,L);if(L&&(o.userData.band||o.userData.hemPiece)){if(L.curtainMesh)shHemOnCurtain(o,L);else if(o.userData.band)shBandOnFabric(o,L);}if(L&&!o.userData.hood)shHideCovered(o,L,layers);}
  /* (no spreading here: a curtain pushed out over a wider area came out under the hem of the layer above) */
  shSkirtClear(G,layers.map(l=>l.curtainMesh).filter(Boolean).concat(others.filter(o=>o.userData.tailFitted&&o.parent)),false);
  /* curtains of lower layers stay inside everything of the layers above (their shells and their reseated hems / bands) */
  for(const L of layers){const cm=L.curtainMesh;if(!cm)continue;const up=new PGrid(0);
    G.traverse(o=>{if(!o.isMesh||o===cm)return;const lr={bottom:1,top:2,mid:3,outer:4}[o.userData.layer];if(!(lr>L.rank))return;if(o.geometry.userData.axis&&shRegionOfAxis(o.geometry.userData.axis)!==0)return;up.raster(shTrunkTris(o),0);});
    if(!up.any)continue;const p=cm.geometry.attributes.position,c=new Float32Array(3),q=new Float32Array(3);
    for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);const Ru=up.at(c[0],c[1]);if(Ru>0&&c[2]>Ru-0.004){shPoint(0,c[0],c[1],Math.max(0.02,Ru-0.004),q);p.setXYZ(i,q[0],q[1],q[2]);}}
    p.needsUpdate=true;cm.geometry.computeVertexNormals();}
  /* a skirt (kept as cut) stays under the fitted shells of the layers above it where they cover it, never inside the body */
  {const sk=[];G.traverse(o=>{if(o.isMesh&&o.userData.skirtPiece)sk.push(o);});if(sk.length)shSkirtClear(G,sk);
    /* a top tucked into the skirt stays inside it (the skirt is not a shell, the layers' ordering never saw it: a full
       top came out over the waistband) */
    if(sk.length){const tin=layers.filter(L=>L.tuck==='in');if(tin.length){const g=new PGrid(0);for(const o of sk)g.raster(shTrunkTris(o),0);
      if(g.any){const c=new Float32Array(3),q=new Float32Array(3);for(const m of shells.concat(layers.map(l=>l.curtainMesh).filter(Boolean))){if(!tin.some(L=>L.name===m.userData.layer))continue;const p=m.geometry.attributes.position,rg=m.geometry.userData.reg;let ch=false;
        for(let i=0;i<p.count;i++){if(rg&&rg[i]!==0)continue;shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);const R=g.at(c[0],c[1]);if(R>0&&c[2]>R-0.004){shPoint(0,c[0],c[1],Math.max(0.02,R-0.004),q);p.setXYZ(i,q[0],q[1],q[2]);ch=true;}}
        if(ch){p.needsUpdate=true;m.geometry.computeVertexNormals();}}}}}
    /* (under the innermost layer that covers it: pressed under the jacket only, a high-waisted skirt lay over the untucked
       top and showed through the jacket's open front; a top tucked into the skirt is under it) */
    if(sk.length){const ups=[];for(const nm of ['top','mid','outer']){const L=layers.find(l=>l.name===nm);if(!L||L.tuck==='in')continue;const g=new PGrid(0);
        for(const m of shells.concat(layers.map(l=>l.curtainMesh).filter(Boolean)))if(m.userData.layer===nm)g.raster(shTrunkTris(m),0);if(g.any)ups.push(g);}
      if(ups.length){const c=new Float32Array(3),q=new Float32Array(3);for(const o of sk){shBake(o,o.parent||G);const p=o.geometry.attributes.position;let ch=false;
        for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);let Ru=9;for(const g of ups){const R=g.at(c[0],c[1]);if(R>0&&R<Ru)Ru=R;}if(Ru<9&&c[2]>Ru-0.004){shPoint(0,c[0],c[1],Math.max(0.02,Ru-0.004),q);p.setXYZ(i,q[0],q[1],q[2]);ch=true;}}
        if(ch){p.needsUpdate=true;o.geometry.computeVertexNormals();}}}}}
  /* fabric of a lower layer that ends up under an upper one is never seen: drop it, so nothing can poke through
     (only 2 cm inside the upper layer's edge: the coverage grid is coarse and hole-filled, at an open front it reached past the fabric and cut teeth into the trousers) */
  for(const m of shells.concat(layers.map(l=>l.curtainMesh).filter(Boolean))){const L=layers.find(l=>l.name===m.userData.layer);if(!L||window.__qaNoDrop)continue;
    const up=layers.filter(u=>u.rank>L.rank&&u.newG);if(!up.length)continue;const g=m.geometry,p=g.attributes.position,rg=g.userData.reg,n=p.count,c=new Float32Array(3),cov=new Uint8Array(n);
    for(let i=0;i<n;i++){const r0=rg?rg[i]:0;shCoord(r0,p.getX(i),p.getY(i),p.getZ(i),c,0);for(const U of up){const G2=U.newG[r0];if(!G2||!G2.any)continue;const R=G2.at(c[0],c[1]);if(R>0&&R>=c[2]-0.03){if(!G2.S)G2.sdf();if(G2.sdfAt(c[0],c[1])>0.02){cov[i]=1;break;}}}}
    const ix=g.index.array,keep=[];for(let t=0;t<ix.length;t+=3)if(!(cov[ix[t]]&&cov[ix[t+1]]&&cov[ix[t+2]]))keep.push(ix[t],ix[t+1],ix[t+2]);if(keep.length<ix.length)g.setIndex(keep);}
  /* the long coat skirt is kept from the pattern (cut just under the shell) */
  for(const L of layers){for(const o of L.meshes){if(kept.includes(o)){o.userData.main=false;o.userData.ctx='none';o.userData.kept=true;}else o.parent.remove(o);}}
  /* the pattern's lining tube is replaced by the inside face of the shell */
  for(const o of linings){if(layers.some(L=>L.name===o.userData.layer&&L.lining)){if(o.parent)o.parent.remove(o);}else shReseat(o,shift,G);}
  /* long hair lay on the old (bigger) clothes outline: let it fall onto the new one below the neck */
  const hair=[];G.traverse(o=>{if(o.isMesh&&o.userData.ctx==='hair')hair.push(o);});
  for(const o of hair)shReseatHair(o,shift[0],G);
  for(const m of shells)G.add(m);
  /* every remaining piece of a garment (buckles, buttons, rivets - also ones built outside the cloth pass) under a higher layer is hidden */
  {const shellSet=new Set(shells);for(const L of layers){const cm=L.curtainMesh;if(cm)shellSet.add(cm);}const late=[];G.traverse(o=>{if(o.isMesh&&!shellSet.has(o)&&o.userData.layer&&o.userData.layer!=='none'&&!o.userData.reseated&&!o.userData.kept)late.push(o);});
    for(const o of late){const L=layers.find(l=>l.name===o.userData.layer);if(!L)continue;shBake(o,o.parent||G);shHideCovered(o,L,layers);}}
  shUnderHide(G,layers);
  shHoodsOut(G,layers);
  shScarfOut(G);
  shHairOverNeckwear(G);
  shBagsOut(G,layers);
  shUnderSleeves(G);
}
/* a watch / bracelet under a cuff: the covered part is hidden (it peeks out from under the sleeve) */
function shUnderSleeves(G){const gs=[];G.traverse(o=>{if(o.userData&&o.userData.watchGroup)gs.push(o);});if(!gs.length)return;
  const grids=[null,new PGrid(1),new PGrid(2)];G.updateMatrixWorld(true);
  G.traverse(o=>{if(!o.isMesh||!o.userData.layer||o.userData.layer==='none')return;const rg=o.geometry.userData.reg;if(rg){const g=o.geometry,p=g.attributes.position,ix=g.index&&g.index.array;if(!ix)return;const per=[[],[],[]],c=new Float32Array(3);
      for(let t=0;t<ix.length;t+=3){const r=rg[ix[t]];if(r!==1&&r!==2||rg[ix[t+1]]!==r||rg[ix[t+2]]!==r)continue;for(let k=0;k<3;k++){const i=ix[t+k];v3.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);shCoord(r,v3.x,v3.y,v3.z,c,0);per[r].push(c[0],c[1],c[2]);}}
      for(const r of [1,2])if(per[r].length)grids[r].raster(per[r],0);}
    else{const ax=o.geometry.userData.axis;if(ax==='armL'||ax==='armR'){const r=ax==='armL'?1:2;grids[r].raster(shTrisOf(o,r),0);}}});
  const c=new Float32Array(3);
  for(const g of gs){g.updateMatrixWorld(true);g.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry,p=geo.attributes.position,n=p.count,cov=new Uint8Array(n);
    for(let i=0;i<n;i++){v3.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);const r=v3.x>=0?1:2;if(!grids[r].any)continue;shCoord(r,v3.x,v3.y,v3.z,c,0);const R=grids[r].at(c[0],c[1]);if(R>0&&R>=c[2]-0.0015)cov[i]=1;}
    if(!cov.some(x=>x))return;if(!geo.index){const ix=new Uint32Array(n);for(let i=0;i<n;i++)ix[i]=i;geo.setIndex(new THREE.BufferAttribute(ix,1));}
    const ix=geo.index.array,keep=[];for(let t=0;t<ix.length;t+=3)if(!(cov[ix[t]]||cov[ix[t+1]]||cov[ix[t+2]]))keep.push(ix[t],ix[t+1],ix[t+2]);
    if(o.userData.rigid||n<200){if(keep.length<ix.length*0.6)o.visible=false;}else geo.setIndex(keep);});}}
const v3=new THREE.Vector3();
/* bags (strap, body, front pocket) sit on top of the finished outfit: straps per point, the bag body as one piece */
/* a hood lying on the back comes out over whatever is worn above its garment (a hoodie under a vest or a jacket):
   it is lifted onto their surface instead of being cut where they cover it (that left ragged pieces at the shoulders) */
/* a patch pocket is placed from the pattern; on an open jacket the fitted front falls further away than the pattern says
   and the pocket hung past the front edge in mid air: turn it round the body towards the side until it sits on its fabric */
/* a small detail of the trunk (belt loop, rivet, button, tab) never stands more than its own thickness off its garment:
   the pattern a wide cut (baggy trousers) is drawn from is fuller at the hip than the fitted shell, and the side belt
   loops hung 2 cm out from the waistband and through the shirt over it */
function shDetailOnFabric(o,L){const SG=L.newG&&L.newG[0];if(!SG||!SG.any)return;const g=o.geometry,p=g.attributes.position;if(!p||p.count>3000)return;
  g.computeBoundingBox();if(g.boundingBox.max.distanceTo(g.boundingBox.min)>0.14)return;const ax=g.userData.axis;if(ax==='armL'||ax==='armR')return;
  const c=new Float32Array(3),q=new Float32Array(3);let inner=9;for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);let R=SG.at(c[0],c[1]);if(R<0)R=SG.nearest(c[0],c[1]);if(R<0)return;inner=Math.min(inner,c[2]-R);}
  const ex=inner-0.0015;if(!(ex>0.004))return;
  for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);shPoint(0,c[0],c[1],c[2]-ex,q);p.setXYZ(i,q[0],q[1],q[2]);}p.needsUpdate=true;}
function shPocketOnFabric(o,L){const SG=L.newG&&L.newG[0];if(!SG||!SG.any)return;if(!SG.S)SG.sdf();
  const p=o.geometry.attributes.position,c=new Float32Array(3);let cx=0;for(let i=0;i<p.count;i++)cx+=p.getX(i);const sd=cx>=0?1:-1;
  /* (laid onto the fitted fabric: a patch keeping the garment's first outline stood off it as a flat plate, shaded darker
     than the fabric round it) */
  {const q=new Float32Array(3);
    for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);const R=SG.at(c[0],c[1]);if(R>0){shPoint(0,c[0],c[1],R+0.002,q);p.setXYZ(i,q[0],q[1],q[2]);}}}
  for(let pass=0;pass<3;pass++){let worst=0,r=0;for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);const d=SG.sdfAt(c[0],c[1]);if(d<worst){worst=d;r=c[2];}}
    if(worst>-0.002||!r)break;const th=sd*(0.006-worst)/r,cs=Math.cos(th),sn=Math.sin(th);
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setX(i,x*cs+z*sn);p.setZ(i,-x*sn+z*cs);}}
  p.needsUpdate=true;o.geometry.computeVertexNormals();}
/* a hem band (rib, binding) is a ring round the garment's lower edge: where the fitted shell's folds stand out past it
   they cut it into teeth. Lift it per angle (whole cross-section together) so it clears its own garment */
function shBandOnFabric(o,L){const SG=L.newG&&L.newG[0];if(!SG||!SG.any)return;const p=o.geometry.attributes.position,NA=96,lift=new Float32Array(NA),c=new Float32Array(3),q=new Float32Array(3),bin=th=>((Math.floor((th/TAU+0.5)*NA)%NA)+NA)%NA;
  for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);const R=SG.at(c[0],c[1]);if(R>0){const k=bin(c[0]);lift[k]=Math.max(lift[k],R+0.0012-c[2]);}}
  for(let it=0;it<3;it++){const l0=lift.slice();for(let k=0;k<NA;k++)lift[k]=Math.max(l0[k],0.5*(l0[(k+1)%NA]+l0[(k+NA-1)%NA]));}
  let ch=false;for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);const d=Math.min(0.02,lift[bin(c[0])]);if(d<=0)continue;shPoint(0,c[0],c[1],c[2]+d,q);p.setXYZ(i,q[0],q[1],q[2]);ch=true;}
  if(ch){p.needsUpdate=true;o.geometry.computeVertexNormals();}}
/* the pattern's hem band / hem stitching of a garment that ends in a curtain: moved per angle down to the curtain's
   hem (with the shirt tails it is lower at the front and back) and onto its surface, keeping its own thickness */
function shHemOnCurtain(o,L){const cm=L.curtainMesh,H=cm&&cm.userData.hemAt,SG=L.newG&&L.newG[0];if(!H||!SG||!SG.any)return;
  const p=o.geometry.attributes.position,NB=64,c=new Float32Array(3),q=new Float32Array(3),y0=new Float32Array(NB).fill(9),r0=new Float32Array(NB).fill(9),bin=th=>((Math.floor((th/TAU+0.5)*NB)%NB)+NB)%NB;
  for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);const k=bin(c[0]);y0[k]=Math.min(y0[k],c[1]);r0[k]=Math.min(r0[k],c[2]);}
  for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);const k=bin(c[0]);if(y0[k]>8)continue;const y=c[1]-y0[k]+H(c[0]);let R=SG.at(c[0],y);if(R<0)R=SG.nearest(c[0],y);if(R<0)continue;
    shPoint(0,c[0],y,R+0.0012+(c[2]-r0[k]),q);p.setXYZ(i,q[0],q[1],q[2]);}
  p.needsUpdate=true;o.geometry.computeVertexNormals();}
/* underwear under the clothes is never seen: where any garment covers it (inside its edge by more than a few mm) it is
   dropped, so a tight top or leggings can never show a strap, a band or a cup through them */
/* underwear covered by a garment is hidden (also where the fitted garment dips a little into it: the seat seam of slim
   trousers let the waistband of boxers show through) */
function shUnderHide(G,layers){const ms=[];G.traverse(o=>{if(o.isMesh&&o.userData.under)ms.push(o);});if(!ms.length)return;
  const c=new Float32Array(3);for(const L of layers){if(!L.newG)continue;for(const r of [0,1,2,3,4]){const g=L.newG[r];if(g&&g.any&&!g.S)g.sdf();}}
  for(const o of ms){const g=o.geometry,p=g.attributes.position,n=p.count,cov=new Uint8Array(n);
    for(let i=0;i<n;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      for(const L of layers){if(!L.newG)continue;let hit=false;for(const r of (Math.abs(x)>BC.shX*0.7&&y>BC.shY-0.3?[0,x>=0?1:2]:y<1.0?[0,x>=0?3:4]:[0])){const G2=L.newG[r];if(!G2||!G2.any)continue;shCoord(r,x,y,z,c,0);const R=G2.at(c[0],c[1]);if(R>0&&R>=c[2]-0.02&&G2.sdfAt(c[0],c[1])>0.004){hit=true;break;}}if(hit){cov[i]=1;break;}}}
    const ix=g.index.array,keep=[];for(let t=0;t<ix.length;t+=3)if(!(cov[ix[t]]&&cov[ix[t+1]]&&cov[ix[t+2]]))keep.push(ix[t],ix[t+1],ix[t+2]);
    if(keep.length<ix.length){g.setIndex(keep);if(!keep.length)o.visible=false;}}}
function shHoodsOut(G,layers){const hoods=[];G.traverse(o=>{if(o.isMesh&&o.userData.hood)hoods.push(o);});if(!hoods.length)return;G.updateMatrixWorld(true);
  const c=new Float32Array(3),q=new Float32Array(3);
  for(const o of hoods){const L=layers.find(l=>l.name===o.userData.layer),rank=L?L.rank:{bottom:1,top:2,mid:3,outer:4}[o.userData.layer]||0;
    const U=new PGrid(0);G.traverse(m=>{if(!m.isMesh||m===o||m.userData.hood)return;const lr={bottom:1,top:2,mid:3,outer:4}[m.userData.layer];if(!(lr>rank))return;if(m.geometry.userData.axis&&shRegionOfAxis(m.geometry.userData.axis)!==0)return;U.raster(shTrunkTris(m),0);});
    if(!U.any)continue;shBake(o,G);const p=o.geometry.attributes.position;let ch=false;
    for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);const R=U.at(c[0],c[1]);if(R>0&&c[2]<R+0.005){shPoint(0,c[0],c[1],R+0.005,q);p.setXYZ(i,q[0],q[1],q[2]);ch=true;}}
    if(ch){p.needsUpdate=true;o.geometry.computeVertexNormals();}}}
/* a scarf is worn over everything: it was laid on the pattern outline, the fitted clothes and their collars can stand
   past it. The lift is found per (angle, height) cell from its deepest point and applied to the whole cross-section,
   so the knit keeps its thickness instead of being pressed flat onto the coat */
function shScarfOut(G){const sc=[];G.traverse(o=>{if(o.isMesh&&o.userData.scarf)sc.push(o);});if(!sc.length)return;G.updateMatrixWorld(true);
  const U=new PGrid(0);G.traverse(o=>{if(!o.isMesh||o.userData.scarf||!o.userData.layer||o.userData.layer==='none')return;if(o.geometry.userData.axis&&shRegionOfAxis(o.geometry.userData.axis)!==0)return;U.raster(shTrisOf(o,0),0);});
  if(!U.any)return;const Y0=0.9,ST=0.01,NR=90,c=new Float32Array(3),q=new Float32Array(3);
  for(const o of sc)shBake(o,G);
  /* a hanging end (with its fringe) as one piece per height: every point of a row lifted by the same amount (a lift per
     (angle, height) cell tore it into shards: its faces and columns were lifted differently); the wrap round the neck by
     angle and height, smoothed round (taking the per-row maximum there spread the coat collar's lift all round: a saucer) */
  const groups=new Map();for(const o of sc){const k=o.userData.scarfEnd?'e'+o.userData.scarfEnd:'w'+o.id;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(o);}
  for(const [k,os] of groups){const end=k[0]==='e',NA=end?1:72,lift=new Float32Array(NR*NA),row=y=>clamp(Math.round((y-Y0)/ST),0,NR-1),col=th=>end?0:((Math.floor((th/TAU+0.5)*NA)%NA)+NA)%NA;
    /* (an end's top lies inside the wrap, round the collar: only below it does it rest on the clothes) */
    const yCut=end?1.47:9;
    for(const o of os){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);if(c[1]>yCut)continue;const R=U.at(c[0],c[1]);if(R>0){const q2=row(c[1])*NA+col(c[0]);lift[q2]=Math.max(lift[q2],R+0.004-c[2]);}}}
    if(!lift.some(v=>v>0))continue;
    /* spread: up and down (a lifted row never sinks), round the neck a soft blur that keeps the peaks */
    let L2=new Float32Array(NR*NA);for(let j=0;j<NR;j++)for(let a=0;a<NA;a++){let m=0;for(let d=-4;d<=4;d++){const jj=j+d;if(jj<0||jj>=NR)continue;m=Math.max(m,lift[jj*NA+a]*Math.exp(-(d*d)/8));}L2[j*NA+a]=m;}
    if(!end)for(let it=0;it<4;it++){const L3=L2.slice();for(let j=0;j<NR;j++)for(let a=0;a<NA;a++){const v=(L3[j*NA+(a+NA-1)%NA]+2*L3[j*NA+a]+L3[j*NA+(a+1)%NA])/4;L2[j*NA+a]=Math.max(lift[j*NA+a],v);}}
    for(const o of os){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);const f=(c[1]-Y0)/ST,j=clamp(Math.floor(f),0,NR-2),t=clamp(f-j,0,1),a=col(c[0]),l=lerp(L2[j*NA+a],L2[(j+1)*NA+a],t);if(l<=0)continue;
        /* (an end hangs on the front: it is moved forward, not out from the body's axis, which splayed its top corners) */
        if(end){p.setZ(i,p.getZ(i)+l);continue;}shPoint(0,c[0],c[1],c[2]+l,q);p.setXYZ(i,q[0],q[1],q[2]);}
      p.needsUpdate=true;o.geometry.computeVertexNormals();}}}
/* long hair falls over a bandana worn round the neck (it went through the roll and the triangle): per (angle, height)
   cell the hair is lifted clear of it, the lift spread up and down so the hair bends over it instead of denting */
function shHairOverNeckwear(G){const nw=[],hair=[];G.updateMatrixWorld(true);
  /* obstacles: a bandana, and every garment piece round the neck and shoulders (collars, neckbands, hoods): the hair went
     between its strands through a neckband */
  G.traverse(o=>{if(!o.isMesh||!o.visible)return;if(o.userData.isHair){hair.push(o);return;}if(o.userData.neckwear||(o.userData.layer&&o.userData.layer!=='none'&&!o.userData.under)){
    const g=o.geometry;if(!g.boundingBox)g.computeBoundingBox();const bb=g.boundingBox.clone().applyMatrix4(o.matrixWorld);if(bb.max.y>BC.shY-0.1&&bb.min.y<1.65)nw.push(o);}});
  if(!nw.length||!hair.length)return;
  const U=new PGrid(0),UN=new PGrid(0);for(const o of nw)(o.userData.neckwear?UN:U).raster(shTrisOf(o,0),0);if(!U.any&&!UN.any)return;
  const NA=96,Y0=1.3,ST=0.005,NR=70,lift=new Float32Array(NA*NR),c=new Float32Array(3),q=new Float32Array(3),cell=(th,y)=>{const j=Math.round((y-Y0)/ST);if(j<0||j>=NR)return -1;return j*NA+((Math.floor((th/TAU+0.5)*NA)%NA)+NA)%NA;};
  for(const o of hair)shBake(o,G);
  for(const o of hair){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);if(c[1]<Y0||c[1]>Y0+NR*ST)continue;const k=cell(c[0],c[1]);if(k<0)continue;/* garments: only thin things (a neckband, a collar): hair deep inside something big belongs under it (a hood); a bandana with its knot is always under the hair */
      const R=U.any?U.at(c[0],c[1]):-1,RN=UN.any?UN.at(c[0],c[1]):-1,need=R+0.003-c[2],needN=RN+0.003-c[2];if(R>0&&need<0.016)lift[k]=Math.max(lift[k],need);if(RN>0&&needN<0.05)lift[k]=Math.max(lift[k],needN);}}
  for(let it=0;it<5;it++){const L0=lift.slice();for(let j=0;j<NR;j++)for(let i=0;i<NA;i++){let m=L0[j*NA+i];for(const[dj,di,f] of [[0,1,0.75],[0,-1,0.75],[1,0,0.85],[-1,0,0.85]]){const jj=j+dj;if(jj<0||jj>=NR)continue;m=Math.max(m,L0[jj*NA+(i+di+NA)%NA]*f);}lift[j*NA+i]=m;}}
  for(const o of hair){const p=o.geometry.attributes.position;let ch=false;for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);const k=cell(c[0],c[1]);if(k<0||lift[k]<=0)continue;shPoint(0,c[0],c[1],c[2]+lift[k],q);p.setXYZ(i,q[0],q[1],q[2]);ch=true;}
    if(ch){p.needsUpdate=true;if(!o.geometry.userData.keepNormals)o.geometry.computeVertexNormals();}}}
function shBagsOut(G,layers){const groups=[];G.traverse(o=>{if(o.userData&&o.userData.bagGroup)groups.push(o);});if(!groups.length)return;
  const U=new PGrid(0);G.updateMatrixWorld(true);G.traverse(o=>{if(!o.isMesh||!o.userData.layer||o.userData.layer==='none')return;let p=o.parent,inBag=false;while(p){if(p.userData&&p.userData.bagGroup){inBag=true;break;}p=p.parent;}if(inBag)return;
    if(o.geometry.userData.axis&&shRegionOfAxis(o.geometry.userData.axis)!==0)return;U.raster(shTrisOf(o,0),0);});
  if(!U.any)return;const c=new Float32Array(3),q=new Float32Array(3),v=new THREE.Vector3();
  for(const g of groups){g.updateMatrixWorld(true);const kids=[];g.traverse(o=>{if(o.isMesh)kids.push(o);});
    /* the bag body: smallest radial lift that clears the clothes everywhere it overlaps them */
    const body=kids.filter(o=>o.userData.bagBody);let lift=0;
    /* (every vertex - every 3rd missed the corners of a small bag, and a hem cut a notch in one) */
    for(const o of body){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);shCoord(0,v.x,v.y,v.z,c,0);const R=U.at(c[0],c[1]);if(R>0)lift=Math.max(lift,R+0.004-c[2]);}}
    if(lift>0)for(const o of body){const ctr=new THREE.Vector3();o.getWorldPosition(ctr);const d=V3(ctr.x,0,ctr.z).normalize();o.position.addScaledVector(d,lift);o.updateMatrixWorld(true);}
    /* straps: point by point */
    for(const o of kids){if(o.userData.bagBody)continue;let p0=o.parent,skip=false;while(p0&&p0!==g){if(p0.userData.bagBody)skip=true;p0=p0.parent;}if(skip)continue;
      shBake(o,g);const p=o.geometry.attributes.position;let ch=false;for(let i=0;i<p.count;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);const R=U.at(c[0],c[1]);if(R>0&&c[2]<R+0.004){shPoint(0,c[0],c[1],R+0.004,q);p.setXYZ(i,q[0],q[1],q[2]);ch=true;}}
      if(ch){p.needsUpdate=true;o.geometry.computeVertexNormals();}}}}
function shReseatHair(o,S,G){
  const y0=BC.shY-0.03;o.updateMatrixWorld(true);const g=o.geometry;if(!g.boundingBox)g.computeBoundingBox();
  const bb=g.boundingBox.clone().applyMatrix4(o.matrixWorld);if(bb.min.y>y0+0.06)return;
  const gg=g.clone();gg.applyMatrix4(o.matrixWorld);gg.userData=Object.assign({},g.userData);
  if(o.parent)o.parent.remove(o);o.geometry=gg;o.position.set(0,0,0);o.quaternion.identity();o.scale.set(1,1,1);o.updateMatrix();G.add(o);
  const p=gg.attributes.position,c=new Float32Array(3),q=new Float32Array(3);
  for(let i=0;i<p.count;i++){const y=p.getY(i),w=1-smooth((y-y0)/0.06);if(w<=0)continue;shCoord(0,p.getX(i),y,p.getZ(i),c,0);const d=Math.min(0,S.at(c[0],c[1]))*w;if(!d)continue;
    shPoint(0,c[0],c[1],Math.max(0.001,c[2]+d),q);p.setXYZ(i,q[0],q[1],q[2]);}
  p.needsUpdate=true;if(!gg.userData.keepNormals)gg.computeVertexNormals();o.userData.ctx='none';
}
function shRasterShell(m,grids){{const g=m.geometry,rg=g.userData.reg,p=g.attributes.position,ix=g.index.array;
    if(g.userData.__per){for(let r=0;r<5;r++)if(g.userData.__per[r].length)grids[r].raster(g.userData.__per[r],0);return;}
    const per=[[],[],[],[],[]],co=new Float32Array(3*p.count),ct=new Float32Array(3*p.count);for(let i=0;i<p.count;i++){shCoord(rg[i],p.getX(i),p.getY(i),p.getZ(i),co,i*3);if(rg[i]===1||rg[i]===2)shCoord(0,p.getX(i),p.getY(i),p.getZ(i),ct,i*3);}
    for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2];if(rg[a]===rg[b]&&rg[a]===rg[c])per[rg[a]].push(co[a*3],co[a*3+1],co[a*3+2],co[b*3],co[b*3+1],co[b*3+2],co[c*3],co[c*3+1],co[c*3+2]);
      /* the top of the sleeves is also part of the trunk outline (collars, linings, yokes sit there) */
      if((rg[a]===1||rg[a]===2)&&(rg[b]===1||rg[b]===2)&&(rg[c]===1||rg[c]===2)&&p.getY(a)>BC.shY-0.09)per[0].push(ct[a*3],ct[a*3+1],ct[a*3+2],ct[b*3],ct[b*3+1],ct[b*3+2],ct[c*3],ct[c*3+1],ct[c*3+2]);}
    g.userData.__per=per;for(let r=0;r<5;r++)if(per[r].length)grids[r].raster(per[r],0);}}
/* ---------- fabric relaxation: smooth like cloth, keep the cut, never sink into the body ---------- */
function shRelax(B,L){
  const n=B.n,off=B.off,adj=B.adj,X=L.X,act=L.act,E=L.E,P=B.P,Nn=B.N,Ps=B.Ps,Ns=B.Ns,T=X.slice(),Y=new Float32Array(n*3),pin=L.pin||new Float32Array(n);
  const its=B.level>1?60:34;
  for(let it=0;it<its;it++){
    for(let v=0;v<n;v++){if(!act[v])continue;let sx=0,sy=0,sz=0,c=0;for(let k=off[v];k<off[v+1];k++){const j=adj[k];if(!act[j])continue;sx+=X[j*3];sy+=X[j*3+1];sz+=X[j*3+2];c++;}
      if(!c){Y[v*3]=X[v*3];Y[v*3+1]=X[v*3+1];Y[v*3+2]=X[v*3+2];continue;}
      const s=0.6*(1-pin[v]);Y[v*3]=X[v*3]+s*(sx/c-X[v*3]);Y[v*3+1]=X[v*3+1]+s*(sy/c-X[v*3+1]);Y[v*3+2]=X[v*3+2]+s*(sz/c-X[v*3+2]);}
    for(let v=0;v<n;v++){if(!act[v])continue;X[v*3]=Y[v*3];X[v*3+1]=Y[v*3+1];X[v*3+2]=Y[v*3+2];
      /* the pattern keeps the overall size; pinned edges sit exactly on it */
      const k=Math.max(pin[v],0.015+0.025*(1-smooth((E[v]-0.004)/0.03)));X[v*3]+=k*(T[v*3]-X[v*3]);X[v*3+1]+=k*(T[v*3+1]-X[v*3+1]);X[v*3+2]+=k*(T[v*3+2]-X[v*3+2]);
      /* never closer to the (softened, tented) skin than the fabric thickness (or the designed ease if it is smaller) */
      const d=(X[v*3]-Ps[v*3])*Ns[v*3]+(X[v*3+1]-Ps[v*3+1])*Ns[v*3+1]+(X[v*3+2]-Ps[v*3+2])*Ns[v*3+2],dm=Math.min(0.004,Math.max(0.0025,E[v]*0.6));
      if(d<dm){const a=dm-d;X[v*3]+=Ns[v*3]*a;X[v*3+1]+=Ns[v*3+1]*a;X[v*3+2]+=Ns[v*3+2]*a;}}}
  /* fabric spans the hollows in front of and behind the armpit like a membrane: valleys only ever move out */
  const zone=new Float32Array(n),ids=[];
  for(let v=0;v<n;v++){if(!act[v])continue;const x=Math.abs(P[v*3]),y=P[v*3+1],z=P[v*3+2];
    const w=smooth((y-(BC.shY-0.27))/0.06)*(1-smooth((y-(BC.shY-0.03))/0.05))*smooth((x-BC.shX*0.5)/(BC.shX*0.15))*(1-smooth((x-BC.shX*1.02)/(BC.shX*0.12)))*smooth((Math.abs(z)-0.015)/0.03);
    if(w>0.01){zone[v]=w;ids.push(v);}}
  for(let it=0,K=B.level>1?70:40;it<K;it++)for(const v of ids){let sx=0,sy=0,sz=0,c=0;for(let k=off[v];k<off[v+1];k++){const j=adj[k];if(!act[j])continue;sx+=X[j*3];sy+=X[j*3+1];sz+=X[j*3+2];c++;}if(!c)continue;
    const dn=((sx/c-X[v*3])*Nn[v*3]+(sy/c-X[v*3+1])*Nn[v*3+1]+(sz/c-X[v*3+2])*Nn[v*3+2])*0.7*zone[v];if(dn>0){X[v*3]+=Nn[v*3]*dn;X[v*3+1]+=Nn[v*3+1]*dn;X[v*3+2]+=Nn[v*3+2]*dn;}}
}
/* loose fabric does not show the anatomy under it: where the cut leaves room, the trunk and the sleeves are a smooth
   surface spanning the body's high points (chest, shoulder blades, biceps) instead of a copy of its relief.
   Per region the fabric radius is low-pass filtered in its own polar frame, never closer to the raw body than a few mm. */
function shLoose(B,L){const w0=smooth(((L.fitE||0)-0.012)/0.025);
  /* in a bra the bust is one smooth moulded form: any top over it (even a slim one) spans it without the apex showing */
  const sp=BC.bra&&L.name!=='bottom'&&BC.core.spots&&BC.core.spots[1],bax=sp?Math.abs(sp[0]):0,bay=sp?sp[1]:0;
  if(w0<=0&&!sp)return;
  const n=B.n,X=L.X,P=B.P,reg=B.reg,rv=L.rv,f=L.fe||L.f,c=new Float32Array(3),q=new Float32Array(3);
  for(const r of [0,1,2]){const arm=r>0,NA=96,st=arm?0.02:0.01,x0=arm?-0.1:0.6,NX=arm?60:110,K=NA*NX;
    const bin=(th,x)=>{const j=Math.round((x-x0)/st);if(j<0||j>=NX)return -1;return j*NA+((Math.floor((th/TAU+0.5)*NA)%NA)+NA)%NA;};
    const S=new Float32Array(K),W=new Float32Array(K),FL=new Float32Array(K),co=new Float32Array(n*3),use=new Uint8Array(n);
    for(let v=0;v<n;v++){if(!L.act[v]||(rv?rv[v]:reg[v])!==r)continue;shCoord(r,X[v*3],X[v*3+1],X[v*3+2],co,v*3);use[v]=1;if(f[v]<-0.01)continue;const k=bin(co[v*3],co[v*3+1]);if(k>=0){S[k]+=co[v*3+2];W[k]++;}}
    let any=false;for(let v=0;v<n;v++){if(reg[v]!==r)continue;shCoord(r,P[v*3],P[v*3+1],P[v*3+2],c,0);const k=bin(c[0],c[1]);if(k>=0&&c[2]>FL[k]){FL[k]=c[2];any=true;}}
    if(!any)continue;
    /* body floor: 1 bin dilation (the raw outline between samples) */
    {const F0=FL.slice();for(let j=0;j<NX;j++)for(let i=0;i<NA;i++){let m=F0[j*NA+i];for(let dj=-1;dj<=1;dj++){const jj=j+dj;if(jj<0||jj>=NX)continue;for(let di=-1;di<=1;di++)m=Math.max(m,F0[jj*NA+(i+di+NA)%NA]);}FL[j*NA+i]=m;}}
    /* normalised separable gaussian over the covered bins: ~4 cm on the trunk, ~3 cm along a sleeve */
    let rm=0,rc=0;for(let k=0;k<K;k++)if(W[k]){S[k]/=W[k];rm+=S[k];rc++;W[k]=1;}if(!rc)continue;rm/=rc;
    const sg=arm?0.03:0.042,sa=Math.max(1,sg/rm/(TAU/NA)),sx=Math.max(1,sg/st);
    const blur=(A,M,q)=>{const a=sa*q,b=sx*q,ka=[],kx=[];for(let d=-Math.ceil(a*2);d<=Math.ceil(a*2);d++)ka.push([d,Math.exp(-d*d/(2*a*a))]);for(let d=-Math.ceil(b*2);d<=Math.ceil(b*2);d++)kx.push([d,Math.exp(-d*d/(2*b*b))]);
      const T1=new Float32Array(K),M1=new Float32Array(K),T2=new Float32Array(K);
      for(let j=0;j<NX;j++)for(let i=0;i<NA;i++){let s=0,w=0;for(const[d,g] of ka){const k=j*NA+(i+d+NA)%NA;if(M[k]){s+=A[k]*g;w+=g;}}const k=j*NA+i;if(w>0){T1[k]=s/w;M1[k]=1;}}
      for(let j=0;j<NX;j++)for(let i=0;i<NA;i++){let s=0,w=0;for(const[d,g] of kx){const jj=j+d;if(jj<0||jj>=NX)continue;const k=jj*NA+i;if(M1[k]){s+=T1[k]*g;w+=g;}}const k=j*NA+i;T2[k]=w>0?s/w:0;}
      return T2;};
    /* trunk: below the bust / chest / shoulder blades the fabric hangs from them, it does not tuck back under */
    const jt=Math.min(NX-1,Math.round((BC.shY-0.04-x0)/st)),hang=T=>{if(arm)return;for(let i=0;i<NA;i++){const sn=Math.abs(Math.sin((i+0.5)/NA*TAU-Math.PI)),sl=lerp(0.55,0.16,smooth((sn-0.3)/0.5))*st;
      for(let j=jt-1;j>=0;j--){const k=j*NA+i;if(W[k]&&W[k+NA])T[k]=Math.max(T[k],T[k+NA]-sl);}}};
    /* resting on the high points: lifted clear of the body and blurred again a few times, so the contact area blends
       into the free fabric (a single clamp left a disc with a crease round each breast / pec) */
    /* the support itself is rounded: max over ~1.5 cm, then blurred (the body's flattened nipple / navel discs are not copied into the fabric) */
    const FM=new Float32Array(K),ra=Math.max(1,Math.round(0.015/rm/(TAU/NA))),rx=Math.max(1,Math.round(0.015/st));
    for(let j=0;j<NX;j++)for(let i=0;i<NA;i++){let m=0;for(let dj=-rx;dj<=rx;dj++){const jj=j+dj;if(jj<0||jj>=NX)continue;for(let di=-ra;di<=ra;di++)m=Math.max(m,FL[jj*NA+(i+di+NA)%NA]);}FM[j*NA+i]=m;}
    const FS=blur(FM,FM.map(x=>x>0?1:0),0.5);for(let k=0;k<K;k++)FS[k]=Math.max(FS[k],FL[k]);
    const clr=0.006;let T=blur(S,W,1);
    for(let it=0;it<4;it++){for(let k=0;k<K;k++)if(W[k]&&FL[k]>0)T[k]=Math.max(T[k],FS[k]+clr);hang(T);T=blur(T,W,0.55);}
    for(let k=0;k<K;k++)if(W[k]&&FL[k]>0)T[k]=Math.max(T[k],FL[k]+0.003);
    const at=(th,x)=>{const g=((th/TAU+0.5)*NA-0.5+NA)%NA,i=Math.floor(g),u=g-i,fx=(x-x0)/st;if(fx<0||fx>NX-1)return -1;const j=Math.min(NX-2,Math.floor(fx)),t=fx-j,i2=(i+1)%NA;
      let s=0,w=0;for(const[k,ww] of [[j*NA+i,(1-u)*(1-t)],[j*NA+i2,u*(1-t)],[(j+1)*NA+i,(1-u)*t],[(j+1)*NA+i2,u*t]])if(W[k]&&ww>0){s+=T[k]*ww;w+=ww;}return w>1e-6?s/w:-1;};
    for(let v=0;v<n;v++){if(!use[v])continue;const th=co[v*3],x=co[v*3+1],rho=co[v*3+2];
      /* trunk: from the hips to under the collarbones (the shoulder slope is not a polar surface); sleeves: past the shoulder cap, before the cuff */
      const wr=arm?smooth((x-0.12)/0.1)*(1-smooth((x-(L.sleeveEnd-0.08))/0.05)):smooth((x-(B.cy-0.01))/0.04)*(1-smooth((x-(BC.shY-0.1))/0.06));
      /* body points deep in a crevice (the crotch, between the legs) all map onto the same outer surface and fold the mesh: leave them */
      shCoord(r,P[v*3],P[v*3+1],P[v*3+2],c,0);const kb=bin(c[0],c[1]),deep=kb>=0&&FL[kb]>0?FL[kb]-c[2]:0;
      const wb=sp&&!arm?gauss(P[v*3+1]-bay,0.075)*gauss(Math.abs(P[v*3])-bax,0.075)*smooth(P[v*3+2]/0.04):0;
      const w=Math.max(w0*wr,wb)*smooth((f[v]+0.005)/0.035)*(1-smooth((deep-0.07)/0.03));if(w<=0)continue;const R=at(th,x);if(R<0)continue;
      shPoint(r,th,x,lerp(rho,R,w),q);X[v*3]=q[0];X[v*3+1]=q[1];X[v*3+2]=q[2];}}}
/* the fabric mesh is the body's own topology: where the body turns away under the fabric (under the bust and the pecs,
   the navel, the shoulder blades) many body vertices land on a narrow strip of fabric and its triangles fold over each
   other - a dark crescent in the shading although the surface is smooth. Spread them evenly over the surface
   (tangential smoothing only: the shape and the folds stay) */
function shUntangle(B,L){if(L.name==='bottom')return;const n=B.n,X=L.X,act=L.act,f=L.fe||L.f,ix=B.ix,off=B.off,adj=B.adj,reg=B.reg,NX=new Float32Array(n*3),D=new Float32Array(n*3);
  const w0=0.35+0.65*smooth(((L.fitE||0)-0.008)/0.03);
  for(let it=0;it<14;it++){NX.fill(0);
    for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2];if(!act[a]||!act[b]||!act[c])continue;const ux=X[b*3]-X[a*3],uy=X[b*3+1]-X[a*3+1],uz=X[b*3+2]-X[a*3+2],vx=X[c*3]-X[a*3],vy=X[c*3+1]-X[a*3+1],vz=X[c*3+2]-X[a*3+2];
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const k of [a,b,c]){NX[k*3]+=nx;NX[k*3+1]+=ny;NX[k*3+2]+=nz;}}
    for(let v=0;v<n;v++){D[v*3]=D[v*3+1]=D[v*3+2]=0;if(!act[v])continue;const w=w0*smooth((f[v]-0.004)/0.03)*(reg[v]===0?1:0.6);if(w<=0)continue;
      let sx=0,sy=0,sz=0,c=0;for(let k=off[v];k<off[v+1];k++){const j=adj[k];if(!act[j])continue;sx+=X[j*3];sy+=X[j*3+1];sz+=X[j*3+2];c++;}if(c<3)continue;
      let dx=sx/c-X[v*3],dy=sy/c-X[v*3+1],dz=sz/c-X[v*3+2];const l=Math.hypot(NX[v*3],NX[v*3+1],NX[v*3+2]);if(l<1e-12)continue;const nx=NX[v*3]/l,ny=NX[v*3+1]/l,nz=NX[v*3+2]/l,dn=dx*nx+dy*ny+dz*nz;
      dx-=dn*nx;dy-=dn*ny;dz-=dn*nz;D[v*3]=dx*0.5*w;D[v*3+1]=dy*0.5*w;D[v*3+2]=dz*0.5*w;}
    for(let k=0;k<n*3;k++)X[k]+=D[k];}}
/* ---------- drape: the fabric is let go under gravity (position based cloth, quasi static) ----------
   every garment layer is simulated at once on the shared body grid: edges resist stretching but may
   bunch up (that is where folds appear), each point may drift only so far from where the pattern put it
   (looser cut = more drift), the body and the layers under it hold the fabric up. */
function shDrape(B,layers){
  const n=B.n,off=B.off,adj=B.adj,Ps=B.Ps,Ns=B.Ns,P=B.P,reg=B.reg;if(!layers.length)return;
  /* edges once (shared topology), per layer only the active ones are used */
  if(!B.edges){const ea=[],eb=[];for(let v=0;v<n;v++)for(let k=off[v];k<off[v+1];k++){const j=adj[k];if(j>v){ea.push(v);eb.push(j);}}B.edges={a:Uint32Array.from(ea),b:Uint32Array.from(eb)};}
  const EA=B.edges.a,EB=B.edges.b,ne=EA.length,its=B.level>1?46:34;
  /* mesh poles (nipples, navel) are rings of tiny faces: the fabric over them just follows its surroundings */
  const spotIds=[];if(BC.core.spots)for(let v=0;v<n;v++)for(const sp of BC.core.spots){const dx=P[v*3]-sp[0],dy=P[v*3+1]-sp[1],dz=P[v*3+2]-sp[2],rr=sp[3]*1.2;if(dx*dx+dy*dy+dz*dz<rr*rr){spotIds.push(v);break;}}
    const inSpot=new Uint8Array(n);for(const v of spotIds)inSpot[v]=1;
  const S=layers.map(L=>{
    const X=L.X,act=L.act,E=L.E,pin=L.pin||new Float32Array(n),X0=X.slice(),rest=new Float32Array(ne),on=new Uint8Array(ne);
    for(let e=0;e<ne;e++){const a=EA[e],b=EB[e];if(!act[a]||!act[b]||inSpot[a]||inSpot[b])continue;on[e]=1;rest[e]=Math.hypot(X[a*3]-X[b*3],X[a*3+1]-X[b*3+1],X[a*3+2]-X[b*3+2])*(1+0.035*smooth((E[a]+E[b]-0.006)/0.04));}
    /* how far a point may wander: tight knit ~2 mm, loose shirt 1-2 cm, oversized coat 3-4 cm */
    const T=new Float32Array(n);
    /* bottoms hang from the waistband: the top 3 cm of the trunk part is held */
    let top=-9;if(L.name==='bottom')for(let v=0;v<n;v++)if(act[v]&&reg[v]===0&&L.f[v]>0)top=Math.max(top,P[v*3+1]);
    const hold=new Float32Array(n);
    for(let v=0;v<n;v++){if(!act[v])continue;let h=pin[v];if(top>-9)h=Math.max(h,smooth((P[v*3+1]-(B.cy-0.03))/0.07));
      /* tops hang from the shoulders and the neck: fabric resting there does not slide */
      if(L.name!=='bottom'){const y=P[v*3+1];if(reg[v]===0)h=Math.max(h,0.9*smooth((y-(BC.shY-0.2))/0.17));else if(reg[v]<=2)h=Math.max(h,0.9*(1-smooth((B.C[v*3+1]-0.02)/0.1)));}
      /* the bust holds the fabric up (it rests on it and spans down from it) */
      if(BC.g==='f'&&reg[v]===0&&L.name!=='bottom'){const y=P[v*3+1];h=Math.max(h,0.95*gauss(y-1.25,0.1)*smooth((P[v*3+2]-0.0)/0.06));}
      /* the last 2-3 cm at a cut edge (hem, front, cuff) move together with the pattern: points along the edge falling
         independently made it ragged, with teeth hanging below a hem band */
      h=Math.max(h,0.8*(1-smooth((L.f[v]-0.004)/0.028)));
      hold[v]=h;
      T[v]=(1-h)*Math.min(0.04,0.0015+0.5*Math.max(0,E[v]-0.003));}
    return{L,X,act,X0,rest,on,T,hold,acc:new Float32Array(n*3),cnt:new Float32Array(n)};});
  /* a shirt tucked into trousers is held by the waistband and only blouses a little above it */
  {const bt=S.find(s=>s.L.name==='bottom');if(bt){let top=-9;for(let v=0;v<n;v++)if(bt.act[v]&&reg[v]===0&&bt.L.f[v]>0)top=Math.max(top,P[v*3+1]);
    for(const a of S){if(a===bt)continue;let ins=0,out=0;for(let v=0;v<n;v++){const y=P[v*3+1];if(y<top-0.03||y>top||!a.act[v]||!bt.act[v])continue;if(a.L.rank<bt.L.rank)ins++;else out++;}
      if(ins>out)for(let v=0;v<n;v++){if(!a.act[v])continue;const h=1-smooth((P[v*3+1]-top)/0.07);if(h>a.hold[v]){a.T[v]*=1-h;a.hold[v]=h;}}}}}
  for(const a of S)for(const b of S){if(a===b)continue;for(let v=0;v<n;v++)if(a.act[v]&&b.act[v]&&b.hold[v]>0.3&&a.L.rank<b.L.rank&&a.hold[v]<b.hold[v]){a.hold[v]=b.hold[v];a.T[v]*=1-b.hold[v];}}
  const g=0.0009;
const spotFix=s=>{const{X,X0,act}=s;for(let p=0;p<5;p++)for(const v of spotIds){if(!act[v])continue;let sx=0,sy=0,sz=0,c=0;for(let k=off[v];k<off[v+1];k++){const j=adj[k];if(!act[j])continue;sx+=X[j*3]-X0[j*3];sy+=X[j*3+1]-X0[j*3+1];sz+=X[j*3+2]-X0[j*3+2];c++;}if(c){X[v*3]=X0[v*3]+sx/c;X[v*3+1]=X0[v*3+1]+sy/c;X[v*3+2]=X0[v*3+2]+sz/c;}}};
  /* work lists: active points and edges per layer, and at every covered point the layers in order with their support offsets */
  for(const s of S){const ids=[],es=[];for(let v=0;v<n;v++)if(s.act[v])ids.push(v);for(let e=0;e<ne;e++)if(s.on[e])es.push(e);s.ids=Uint32Array.from(ids);s.es=Uint32Array.from(es);}
  const Q=B.Pss,cV=[],cOff=[0],cL=[],cQ=[],cDm=[];
  for(let v=0;v<n;v++){let here=[];for(let li=0;li<S.length;li++)if(S[li].act[v])here.push(li);if(!here.length)continue;
    if(here.length>1)here.sort((x,y)=>S[x].L.rank-S[y].L.rank);cV.push(v);
    for(const li of here){const E=S[li].L.E,ls=smooth((E[v]-0.004)/0.012),nx=Ns[v*3],ny=Ns[v*3+1],nz=Ns[v*3+2];
      /* support height along the normal of this point: soft body for tight fabric, very smooth body for loose */
      const q=((Ps[v*3]+(Q[v*3]-Ps[v*3])*ls)*nx+(Ps[v*3+1]+(Q[v*3+1]-Ps[v*3+1])*ls)*ny+(Ps[v*3+2]+(Q[v*3+2]-Ps[v*3+2])*ls)*nz);
      cL.push(li);cQ.push(q);cDm.push(Math.min(0.004,Math.max(0.0025,E[v]*0.6)));}
    cOff.push(cL.length);}
  const CV=Uint32Array.from(cV),CO=Uint32Array.from(cOff),CL=Uint8Array.from(cL),CQ=Float32Array.from(cQ),CD=Float32Array.from(cDm);
  for(let it=0;it<its;it++){
    for(const s of S){const{X,X0,rest,T,hold,acc,cnt,ids,es}=s;
      /* gravity along the surface only (into the body is the collision's job, out of it does not happen) */
      for(const v of ids){const ny=Ns[v*3+1],k=g*(1-hold[v]);X[v*3]+=k*ny*Ns[v*3];X[v*3+1]-=k*(1-ny*ny);X[v*3+2]+=k*ny*Ns[v*3+2];acc[v*3]=acc[v*3+1]=acc[v*3+2]=0;cnt[v]=0;}
      /* stretch only (compression is allowed: the excess becomes folds) - Jacobi so the result does not depend on the order */
      for(const e of es){const a=EA[e],b=EB[e],dx=X[b*3]-X[a*3],dy=X[b*3+1]-X[a*3+1],dz=X[b*3+2]-X[a*3+2],l=Math.sqrt(dx*dx+dy*dy+dz*dz),r=rest[e];
        if(l<=r*1.002||l<1e-9)continue;const k=0.5*(l-r)/l;acc[a*3]+=dx*k;acc[a*3+1]+=dy*k;acc[a*3+2]+=dz*k;acc[b*3]-=dx*k;acc[b*3+1]-=dy*k;acc[b*3+2]-=dz*k;cnt[a]++;cnt[b]++;}
      for(const v of ids){if(cnt[v]){const w=(1-hold[v])*1.6/cnt[v];X[v*3]+=acc[v*3]*w;X[v*3+1]+=acc[v*3+1]*w;X[v*3+2]+=acc[v*3+2]*w;}
        /* tether to the pattern position */
        const dx=X[v*3]-X0[v*3],dy=X[v*3+1]-X0[v*3+1],dz=X[v*3+2]-X0[v*3+2],d=Math.sqrt(dx*dx+dy*dy+dz*dz),t=T[v];if(d>t){const k=t/d;X[v*3]=X0[v*3]+dx*k;X[v*3+1]=X0[v*3+1]+dy*k;X[v*3+2]=X0[v*3+2]+dz*k;}
        /* fabric spans hollows (armpits, under the chest, the small of the back): it hangs, it is not vacuum packed */
        const nx=Ns[v*3],ny=Ns[v*3+1],nz=Ns[v*3+2],dn=(X[v*3]-X0[v*3])*nx+(X[v*3+1]-X0[v*3+1])*ny+(X[v*3+2]-X0[v*3+2])*nz,lim=-Math.min(0.0025,t*0.15);if(dn<lim){const q=lim-dn;X[v*3]+=nx*q;X[v*3+1]+=ny*q;X[v*3+2]+=nz*q;}}}
    /* body and layers underneath hold the fabric up */
    for(let ci=0;ci<CV.length;ci++){const v=CV[ci],nx=Ns[v*3],ny=Ns[v*3+1],nz=Ns[v*3+2];let floor=-1;
      for(let k=CO[ci];k<CO[ci+1];k++){const s=S[CL[k]],X=s.X,d=X[v*3]*nx+X[v*3+1]*ny+X[v*3+2]*nz-CQ[k],dm=Math.max(CD[k],floor>=0?floor+0.003:0);
        if(d<dm){const a=dm-d;X[v*3]+=nx*a;X[v*3+1]+=ny*a;X[v*3+2]+=nz*a;}
        if(s.L.f[v]>0)floor=Math.max(floor,d<dm?dm:d);}}
    for(const s of S)spotFix(s);
    /* a little bending stiffness: fabric bunches into broad folds, not into grit */
    if(it%2===1)for(const s of S){const{X,X0,act,hold,ids}=s,Y=s.acc,f=s.L.fe||s.L.f;for(const v of ids){let sx=0,sy=0,sz=0,c=0;for(let k=off[v];k<off[v+1];k++){const j=adj[k];if(!act[j])continue;sx+=X[j*3]-X0[j*3];sy+=X[j*3+1]-X0[j*3+1];sz+=X[j*3+2]-X0[j*3+2];c++;}
        const w=c?(0.45+0.45*(1-smooth((f[v]+0.005)/0.04)))*(1-hold[v]):0;Y[v*3]=w?X[v*3]+w*(sx/c-(X[v*3]-X0[v*3])):X[v*3];Y[v*3+1]=w?X[v*3+1]+w*(sy/c-(X[v*3+1]-X0[v*3+1])):X[v*3+1];Y[v*3+2]=w?X[v*3+2]+w*(sz/c-(X[v*3+2]-X0[v*3+2])):X[v*3+2];}
      for(const v of ids){X[v*3]=Y[v*3];X[v*3+1]=Y[v*3+1];X[v*3+2]=Y[v*3+2];}}
  }
  /* how much the fabric bunched at every point (0 = flat, 1 = a lot), and along which direction: folds form across it */
  for(const s of S){const{L,X,act,rest,on}=s,C=new Float32Array(n),D=new Float32Array(n*3),c=new Float32Array(n);
    for(let e=0;e<ne;e++){if(!on[e])continue;const a=EA[e],b=EB[e],dx=X[b*3]-X[a*3],dy=X[b*3+1]-X[a*3+1],dz=X[b*3+2]-X[a*3+2],l=Math.hypot(dx,dy,dz)||1e-9,q=Math.max(0,1-l/rest[e]);
      C[a]+=q;C[b]+=q;c[a]++;c[b]++;const w=q/l;D[a*3]+=Math.abs(dx)*w;D[a*3+1]+=Math.abs(dy)*w;D[a*3+2]+=Math.abs(dz)*w;D[b*3]+=Math.abs(dx)*w;D[b*3+1]+=Math.abs(dy)*w;D[b*3+2]+=Math.abs(dz)*w;}
    for(let v=0;v<n;v++)if(c[v])C[v]/=c[v];
    /* spread a little: fold fields are smooth */
    for(let p=0;p<6;p++){const C0=C.slice();for(let v=0;v<n;v++){if(!act[v])continue;let sm=C0[v],k=1;for(let q=off[v];q<off[v+1];q++){const j=adj[q];if(act[j]){sm+=C0[j];k++;}}C[v]=sm/k;}}
    L.comp=C;L.compDir=D;}
}
function shUpsample(B,B2,L){
  const p2=mhPlan2(true),n=B.n,n2=B2.n,X=L.X.slice(),act=L.act,P=B.P,N=B.N;
  for(let v=0;v<n;v++)if(!act[v]){X[v*3]=P[v*3]+N[v*3]*0.004;X[v*3+1]=P[v*3+1]+N[v*3+1]*0.004;X[v*3+2]=P[v*3+2]+N[v*3+2]*0.004;}
  const A=new Float32Array(n*3),Bq=new Float32Array(n*3),pin=L.pin||new Float32Array(n),comp=L.comp||new Float32Array(n);
  for(let v=0;v<n;v++){A[v*3]=L.f[v];A[v*3+1]=L.E[v];A[v*3+2]=comp[v];Bq[v*3]=act[v];Bq[v*3+1]=pin[v];Bq[v*3+2]=L.R[v];}
  const Cq=new Float32Array(n*3),rv=L.rv||new Uint8Array(n);for(let v=0;v<n;v++){Cq[v*3]=rv[v]===0?1:0;Cq[v*3+1]=rv[v]===1||rv[v]===2?1:0;}
  const C2q=ccApply(p2,Cq),rv2=new Uint8Array(n2),reg2=B2.reg;for(let v=0;v<n2;v++){const b=reg2[v];rv2[v]=C2q[v*3]>0.5&&b>=3?0:C2q[v*3]>0.5&&b>=1&&b<=2&&C2q[v*3+1]<0.5?0:b;}L.rv=rv2;
  const X2=ccApply(p2,X),A2=ccApply(p2,A),B2q=ccApply(p2,Bq),f=new Float32Array(n2),E=new Float32Array(n2),C=new Float32Array(n2),act2=new Uint8Array(n2),pin2=new Float32Array(n2),R=new Float32Array(n2);
  for(let v=0;v<n2;v++){f[v]=A2[v*3];E[v]=A2[v*3+1];C[v]=A2[v*3+2];act2[v]=B2q[v*3]>0.999?1:0;pin2[v]=B2q[v*3+1];R[v]=B2q[v*3+2];}
  L.X=X2;L.f=f;L.E=E;L.comp=C;L.act=act2;L.pin=pin2;L.R=R;
}
/* jackets, coats, knitwear and anything loose bridge the hollows of the chest (between the pecs, under the collarbones):
   in each slice the fabric lies at least on the body's convex outline */
function shHull(B,L){const F=BC.core.fit;if(!F)return;const stiff=L.rank>=3?1:clamp(((L.fitE||0.02)-0.012)/0.02,0,1);if(stiff<=0)return;
  const n=B.n,X=L.X,reg=B.reg,off=B.off,adj=B.adj,push=new Float32Array(n),ids=[];
  for(let v=0;v<n;v++){if(!L.act[v]||L.rv&&L.rv[v]!==0&&reg[v]!==0)continue;const x=X[v*3],y=X[v*3+1],z=X[v*3+2];if(y<1.0||y>BC.shY-0.04)continue;
    const th=Math.atan2(z,x),rr=Math.hypot(x,z),need=F.T.at(th,y)+0.003+0.002*(L.rank-2);const w=stiff*smooth((y-1.0)/0.08);if(need>rr){push[v]=(need-rr)*w;ids.push(v);}}
  for(let it=0;it<6;it++){const p0=push.slice();for(let v=0;v<n;v++){if(!L.act[v])continue;let s2=0,c=0;for(let k=off[v];k<off[v+1];k++){const j=adj[k];if(L.act[j]){s2+=p0[j];c++;}}if(c)push[v]=Math.max(p0[v],s2/c*0.9);}}
  for(let v=0;v<n;v++){const p=push[v];if(!(p>0))continue;const x=X[v*3],z=X[v*3+2],rr=Math.hypot(x,z)||1;X[v*3]+=x/rr*p;X[v*3+2]+=z/rr*p;}}
function shDist(B,L,v){const P=B.P,Nn=B.N,X=L.X;return(X[v*3]-P[v*3])*Nn[v*3]+(X[v*3+1]-P[v*3+1])*Nn[v*3+1]+(X[v*3+2]-P[v*3+2])*Nn[v*3+2];}
function shOrder(B,layers){
  const n=B.n,Nn=B.N,off=B.off,adj=B.adj;
  /* how far each layer must move out to clear the fabric under it, then spread smoothly so edges stay straight */
  const push=new Map();for(const L of layers)push.set(L,new Float32Array(n));
  const dist=new Map();for(const L of layers){const d=new Float32Array(n);for(let v=0;v<n;v++)if(L.act[v])d[v]=shDist(B,L,v);dist.set(L,d);}
  for(let v=0;v<n;v++){const here=[];for(const L of layers)if(L.act[v])here.push(L);if(here.length<2)continue;
    here.sort((a,b)=>a.rank-b.rank);let prev=-1;
    for(const L of here){const d=dist.get(L)[v]+push.get(L)[v];if(prev>=0&&d<prev+0.0032)push.get(L)[v]=prev+0.0032-dist.get(L)[v];
      if(L.f[v]>0)prev=Math.max(prev,dist.get(L)[v]+push.get(L)[v]);}}
  for(const L of layers){let p=push.get(L);const act=L.act;
    for(let it=0;it<8;it++){const c=p.slice();for(let v=0;v<n;v++){if(!act[v])continue;let s=0,m=0;for(let k=off[v];k<off[v+1];k++){const j=adj[k];if(act[j]){s+=c[j];m++;}}if(m)p[v]=Math.max(c[v],s/m);}}
    for(let v=0;v<n;v++)if(act[v]&&p[v]>0){L.X[v*3]+=Nn[v*3]*p[v];L.X[v*3+1]+=Nn[v*3+1]*p[v];L.X[v*3+2]+=Nn[v*3+2]*p[v];}}
}
/* shoes and boot shafts as leg-region outlines (the shoes live in their own unwarped, lifted group: map them back to body heights) */
function shObstacleGrids(G,GS){
  const grids=[null,null,null,new PGrid(3),new PGrid(4)];let top=0,any=false;
  const winv=yw=>{let lo=-0.2,hi=1.2;for(let i=0;i<32;i++){const m=(lo+hi)/2;if((WARP?WARP.Y(m):m)<yw)lo=m;else hi=m;}return(lo+hi)/2;};
  const add=(o,shoe)=>{const g=o.geometry,p=g.attributes.position,ix=g.index?g.index.array:null,m=o.matrixWorld,v=new THREE.Vector3(),n=p.count;
    for(const r of [3,4]){const co=new Float32Array(n*3);for(let i=0;i<n;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);let y=v.y;if(shoe)y=winv(y-LIFT);shCoord(r,v.x,y,v.z,co,i*3);if(r===3)top=Math.max(top,y);}
      const T=[],tri=(a,b,c)=>{if(co[a*3+1]<0.015&&co[b*3+1]<0.015&&co[c*3+1]<0.015)return;T.push(co[a*3],co[a*3+1],co[a*3+2],co[b*3],co[b*3+1],co[b*3+2],co[c*3],co[c*3+1],co[c*3+2]);};
      if(ix)for(let t=0;t<ix.length;t+=3)tri(ix[t],ix[t+1],ix[t+2]);else for(let t=0;t<n;t+=3)tri(t,t+1,t+2);
      /* each side only takes its own shoe */
      if(T.length){const sd=r===3?1:-1;let cx=0;for(let i=0;i<n;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);cx+=v.x;}if(cx*sd>0){grids[r].raster(T,0);any=true;}}}};
  G.updateMatrixWorld(true);G.traverse(o=>{if(o.isMesh&&o.userData.obst)add(o,false);});
  if(GS){GS.updateMatrixWorld(true);GS.traverse(o=>{if(o.isMesh)add(o,true);});}
  if(!any)return null;for(const r of [3,4])grids[r].close();return{grids,top};
}
/* trouser pattern parts kept as tubes (hems): rest on the shoe instead of passing through it */
function shKeptOverShoes(o,OB,spread=true){
  const g=o.geometry,p=g.attributes.position,c=new Float32Array(3),q=new Float32Array(3),rr=o.geometry.userData.axis==='legR'?4:3,G2=OB.grids[rr];
  const N=G2.N,NA=SH_NA,push=new Float32Array(N*NA),cur=new PGrid(rr);cur.raster(shTrisOf(o,rr),0);
  for(let k=0;k<N*NA;k++)if(G2.R[k]>=0&&cur.R[k]>=0){const d=G2.R[k]+0.004-cur.R[k];push[k]=d>0&&d<0.03?d:0;}
  /* spread upwards (the fabric drapes off the shoe) and around; it eases off within a few cm (spread further the hem
     stood out round the ankle in a bell) */
  for(let it=0;it<(spread?14:2);it++){const c0=push.slice();for(let j=0;j<N;j++)for(let i=0;i<NA;i++){const k=j*NA+i;let m=c0[k];if(j>0)m=Math.max(m,c0[k-NA]*0.82);m=Math.max(m,c0[j*NA+(i+1)%NA]*0.9,c0[j*NA+(i+NA-1)%NA]*0.9);push[k]=m;}}
  const at=(th,x)=>{const gi=((th/TAU*NA-0.5)%NA+NA)%NA,i=Math.floor(gi),u=gi-i,f=(x-G2.x0)/G2.st;if(f<0||f>N-1)return 0;const j=Math.min(N-2,Math.floor(f)),v=f-j,i2=(i+1)%NA;
    return(push[j*NA+i]*(1-u)+push[j*NA+i2]*u)*(1-v)+(push[(j+1)*NA+i]*(1-u)+push[(j+1)*NA+i2]*u)*v;};
  for(let i=0;i<p.count;i++){shCoord(rr,p.getX(i),p.getY(i),p.getZ(i),c,0);const d=at(c[0],c[1]);if(d<=0)continue;shPoint(rr,c[0],c[1],c[2]+d,q);p.setXYZ(i,q[0],q[1],q[2]);}
  p.needsUpdate=true;g.computeVertexNormals();
}
function shObstacles(B,layers,OB){
  const grids=OB.grids,top=OB.top;
  const n=B.n,reg=B.reg,P=B.P,off=B.off,adj=B.adj,c=new Float32Array(3),q=new Float32Array(3);
  for(const L of layers){let hem=9;for(let v=0;v<n;v++)if(L.act[v]&&reg[v]>=3&&L.f[v]>0)hem=Math.min(hem,P[v*3+1]);if(hem>top-0.005)continue;
    const over=hem<top-0.03,push=new Float32Array(n);let any=false;
    /* over the boots the obstacle is taken over +-8 mm of height: a fabric vertex just above the shaft's top was not pushed
       and the triangle down to the next one cut through the collar (a dark slot round the shin) */
    const Rat=(r,th,y)=>{let R=grids[r].at(th,y);if(over)for(const dy of [-0.008,-0.004,0.004,0.008])R=Math.max(R,grids[r].at(th,y+dy));return R;};
    for(let v=0;v<n;v++){if(!L.act[v]||reg[v]<3)continue;const r=reg[v],X=L.X;shCoord(r,X[v*3],X[v*3+1],X[v*3+2],c,0);const R=Rat(r,c[0],c[1]);if(R<0)continue;
      if(over){const need=R+0.0045-c[2];if(need>0){push[v]=need;any=true;}}else{const need=c[2]-(R-0.004);if(need>0){push[v]=-need;any=true;}}}
    if(!any)continue;
    /* spread so the fabric eases over the boot top instead of stepping */
    for(let it=0;it<10;it++){const p0=push.slice();for(let v=0;v<n;v++){if(!L.act[v]||reg[v]<3)continue;let s=0,m=0;for(let k=off[v];k<off[v+1];k++){const j=adj[k];if(L.act[j]){s+=p0[j];m++;}}if(!m)continue;const avg=s/m*0.93;push[v]=over?Math.max(p0[v],avg):Math.min(p0[v],avg);}}
    for(let v=0;v<n;v++){if(!push[v])continue;const r=reg[v],X=L.X;shCoord(r,X[v*3],X[v*3+1],X[v*3+2],c,0);shPoint(r,c[0],c[1],Math.max(0.002,c[2]+push[v]),q);X[v*3]=q[0];X[v*3+1]=q[1];X[v*3+2]=q[2];}}
}
/* where body parts crowd each other (crotch, armpits) a fabric point can sit inside a different part of the body than
   the one it was made from: test against the nearest body point of any kind and step outside */
function shBodyClear(B,L){const n=B.n,P=B.P,Nn=B.N,X=L.X,H=poseHash(),cy=B.cy,off=B.off,adj=B.adj,bot=L.name==='bottom';
  /* fabric bridges the crotch: trousers have a flat fly at the front and a smooth seat seam at the back,
     anything worn over the hips hangs straight across - valleys there only fill in */
  {const ids=[],w=[];
    for(let v=0;v<n;v++){if(!L.act[v])continue;const x=P[v*3],y=P[v*3+1],z=P[v*3+2];
      const k=bot?(1-smooth((Math.abs(x)-0.035)/0.05))*smooth((y-(cy-0.07))/0.04)*(1-smooth((y-(cy+0.08))/0.05))*smooth((Math.abs(z)-0.01)/0.03)
               :(1-smooth((Math.abs(x)-0.06)/0.06))*smooth((y-(cy-0.04))/0.04)*(1-smooth((y-(cy+0.12))/0.06))*smooth((Math.abs(z)-0.005)/0.03);
      if(k>0.02){ids.push(v);w.push(k);}}
    for(let it=0,K=GEO_Q>1?90:50;it<K;it++)for(let q=0;q<ids.length;q++){const v=ids[q];let sx=0,sy=0,sz=0,c=0;for(let k=off[v];k<off[v+1];k++){const j=adj[k];if(!L.act[j])continue;sx+=X[j*3];sy+=X[j*3+1];sz+=X[j*3+2];c++;}if(!c)continue;
      const dx=sx/c-X[v*3],dy=sy/c-X[v*3+1],dz=sz/c-X[v*3+2],dn=dx*Nn[v*3]+dy*Nn[v*3+1]+dz*Nn[v*3+2];if(dn>0){const a=0.8*w[q];X[v*3]+=dx*a;X[v*3+1]+=dy*a;X[v*3+2]+=dz*a;}}}
  /* trousers: the front and back of the crotch span flat between the legs (fly, seat seam), down to the crotch seam */
  if(bot){const Y0=cy-0.035,Y1=cy+0.16,ST=0.005,NR=Math.ceil((Y1-Y0)/ST)+1,fr=new Float32Array(NR).fill(-9),bk=new Float32Array(NR).fill(9),xs=0.085;
    for(let v=0;v<n;v++){if(!L.act[v])continue;const x=Math.abs(X[v*3]),y=X[v*3+1],z=X[v*3+2];if(y<Y0||y>Y1||x<xs-0.012||x>xs+0.012)continue;const j=Math.round((y-Y0)/ST);if(z>0)fr[j]=Math.max(fr[j],z);else bk[j]=Math.min(bk[j],z);}
    /* (not in the fold under an overhanging belly - the skin there faces down or up: moved and smoothed, the fabric folded
       over itself in teeth below the waistband) */
    const spn=BC.core.spots||[];let yCr=9;for(let v=0;v<n;v++){if(!L.act[v]||P[v*3+2]<=0.02||Math.abs(P[v*3])>0.1)continue;const y=P[v*3+1];if(y<=cy+0.01||y>=yCr||Nn[v*3+1]<0.5)continue;
      if(spn.some(q=>Math.hypot(P[v*3]-q[0],y-q[1],P[v*3+2]-q[2])<q[3]*1.6))continue;yCr=y;}
    const ovh=v=>P[v*3+2]>0?1-smooth((P[v*3+1]-(yCr-0.03))/0.02):1;
    for(let v=0;v<n;v++){if(!L.act[v])continue;const x=Math.abs(X[v*3]),y=X[v*3+1];if(y<Y0||y>Y1||x>xs)continue;const j=Math.round((y-Y0)/ST),w=smooth((y-Y0)/0.03);if(w<=0)continue;
      const k=1-0.25*(x/xs)*(x/xs);if(X[v*3+2]>0&&fr[j]>-9){const t=fr[j]*lerp(1,1.0,k)+0.002;if(X[v*3+2]<t)X[v*3+2]=lerp(X[v*3+2],t,w*ovh(v));}
      else if(X[v*3+2]<=0&&bk[j]<9){const t=bk[j]-0.002;if(X[v*3+2]>t)X[v*3+2]=lerp(X[v*3+2],t,w*0.85);}}
    /* then smooth that whole panel (fly, seat): no creases left from the body under it (not at the waistband: smoothed, the
       edge slid a centimetre down under a belly) */
    const zid=[];for(let v=0;v<n;v++){if(!L.act[v])continue;const x=Math.abs(P[v*3]),y=P[v*3+1];if(y>Y0&&y<Y1&&x<xs+0.02)zid.push(v);}
    for(let it=0;it<25;it++)for(const v of zid){let sx=0,sy=0,sz=0,c=0;for(let k=off[v];k<off[v+1];k++){const j=adj[k];if(!L.act[j])continue;sx+=X[j*3];sy+=X[j*3+1];sz+=X[j*3+2];c++;}if(!c)continue;const ww=0.5*smooth((P[v*3+1]-Y0)/0.03)*smooth(L.f[v]/0.025)*ovh(v);X[v*3]+=(sx/c-X[v*3])*ww;X[v*3+1]+=(sy/c-X[v*3+1])*ww;X[v*3+2]+=(sz/c-X[v*3+2])*ww;}
    /* under an overhanging belly the front hangs from the waistband: per column, going down, it recedes no faster than
       0.35 per unit of height (it went into the fold between the belly and the groin: a dark V below the band) */
    if(yCr<9){const bins=new Map();for(let v=0;v<n;v++){if(!L.act[v]||B.reg[v]!==0||X[v*3+2]<=0.02||X[v*3+1]<cy)continue;const b=Math.round(X[v*3]/0.01);let a=bins.get(b);if(!a)bins.set(b,a=[]);a.push(v);}
      const lift=new Float32Array(n);for(const a of bins.values()){a.sort((p,q)=>X[q*3+1]-X[p*3+1]);let m=-9,yp=0;for(const v of a){const y=X[v*3+1];if(m>-9)m-=0.35*(yp-y);yp=y;if(X[v*3+2]<m)lift[v]=m-X[v*3+2];else m=X[v*3+2];}}
      /* (each column on its own left the front faceted: the lift is spread over the neighbours - it only grows, so nothing
         sinks back into the fold) */
      for(let it=0;it<8;it++){const l0=lift.slice();for(let v=0;v<n;v++){if(!L.act[v]||X[v*3+2]<=0.02)continue;let s2=0,c=0;for(let q=off[v];q<off[v+1];q++){const j=adj[q];if(!L.act[j])continue;s2+=l0[j];c++;}if(c)lift[v]=Math.max(l0[v],0.9*s2/c);}}
      for(let v=0;v<n;v++)if(lift[v]>0)X[v*3+2]+=lift[v];}}
  /* never inside the skin: against its own body point and against the nearest body point */
  const sp=BC.core.spots||[],inSp=v=>{for(const q of sp){const dx=P[v*3]-q[0],dy=P[v*3+1]-q[1],dz=P[v*3+2]-q[2];if(dx*dx+dy*dy+dz*dz<q[3]*q[3]*2.2)return true;}return false;};
  for(let v=0;v<n;v++){if(!L.act[v])continue;
    if(inSp(v))continue;
    const d0=(X[v*3]-P[v*3])*Nn[v*3]+(X[v*3+1]-P[v*3+1])*Nn[v*3+1]+(X[v*3+2]-P[v*3+2])*Nn[v*3+2];if(d0<0.0025){const q=0.0025-d0;X[v*3]+=Nn[v*3]*q;X[v*3+1]+=Nn[v*3+1]*q;X[v*3+2]+=Nn[v*3+2]*q;}
    const x=X[v*3],y=X[v*3+1],z=X[v*3+2];
    /* (everywhere, not only where body parts crowd: fabric that slid in the drape lies over another, fuller part of the body
       than its own point - the top of a full seat came through tight trousers and skirts) */
    const[j]=H.near2(x,y,z);if(j<0)continue;const d=(x-P[j*3])*Nn[j*3]+(y-P[j*3+1])*Nn[j*3+1]+(z-P[j*3+2])*Nn[j*3+2];
    if(d<0.0025){const q=0.0025-d;X[v*3]+=Nn[j*3]*q;X[v*3+1]+=Nn[j*3+1]*q;X[v*3+2]+=Nn[j*3+2]*q;}}
  /* trousers: the front hangs from the fly down to the crotch seam - per column, going down, it recedes no faster than 0.45
     per unit of height (pushed out of the body along the normals under the bulge it tucked in there: a dark hollow, with
     the thighs either side the front of the trousers read as a seat) */
  /* (men only: with nothing to hang from it only lifted the fabric into a ledge at the crotch) */
  if(bot&&BC.g==='m'){const bins=new Map(),yl=cy-0.1;for(let v=0;v<n;v++){if(!L.act[v]||X[v*3+2]<=0.01)continue;const x=X[v*3],y=X[v*3+1];if(Math.abs(x)>0.07||y<yl||y>cy+0.12)continue;const b=Math.round(x/0.01);let a=bins.get(b);if(!a)bins.set(b,a=[]);a.push(v);}
    const lift=new Float32Array(n);let any=false;
    for(const a of bins.values()){a.sort((p,q)=>X[q*3+1]-X[p*3+1]);let m=-9,yp=0;for(const v of a){const y=X[v*3+1];if(m>-9)m-=0.45*(yp-y);yp=y;if(X[v*3+2]<m){lift[v]=(m-X[v*3+2])*smooth((y-yl)/0.04)*(1-smooth((Math.abs(X[v*3])-0.04)/0.03));any=true;}else m=X[v*3+2];}}
    if(any){for(let it=0;it<10;it++){const l0=lift.slice();for(let v=0;v<n;v++){if(!L.act[v]||X[v*3+2]<=0.01)continue;let s2=0,c=0;for(let q=off[v];q<off[v+1];q++){const j=adj[q];if(!L.act[j])continue;s2+=l0[j];c++;}if(c)lift[v]=Math.max(l0[v],0.85*s2/c);}}
      for(let v=0;v<n;v++)if(lift[v]>0)X[v*3+2]+=Math.min(lift[v],0.03);}}
}
/* trouser legs meet at the inseam instead of passing through each other */
function shMidline(B,L){const n=B.n,reg=B.reg,X=L.X,P=B.P,Nn=B.N,E=L.E;
  /* across the seat's cleft and the hollow of the back the fabric spans the support (lifted to the hull there): where the
     pattern / hull mapping set it, trousers went 6 cm deep between the buttocks (a black slit down the centre back) */
  {const Ps=B.Ps;for(let v=0;v<n;v++){if(!L.act[v]||reg[v]!==0||P[v*3+2]>-0.02)continue;const zs=Ps[v*3+2];if(P[v*3+2]-zs<0.004)continue;
    const zt=zs-0.003;if(X[v*3+2]>zt)X[v*3+2]=zt;}}
  for(let v=0;v<n;v++){if(!L.act[v]||reg[v]<3)continue;const sd=reg[v]===3?1:-1,m=0.0035;
    /* loose trousers: the inner leg hangs straight from the crotch instead of following the thigh gap */
    /* any trousers that are not skin tight: right under the crotch the inner legs meet at the inseam (a crotch seam, not a V between the thighs) */
    const a0=smooth((-Nn[v*3]*sd-0.1)/0.5)*(1-smooth((B.cy-P[v*3+1]-0.04)/0.12))*(1-smooth((P[v*3+1]-B.cy+0.015)/0.05)),a=a0*Math.max(smooth((E[v]-0.004)/0.02),0.85*(1-smooth((B.cy-P[v*3+1]-0.01)/0.05))*smooth((E[v]-0.0026)/0.004));
    if(a>0&&X[v*3]*sd>m)X[v*3]=sd*lerp(X[v*3]*sd,m,a*0.92);
    if(X[v*3]*sd<m)X[v*3]=sd*m;
    /* never inside the body (the bulge at the front of the crotch) */
    const d=(X[v*3]-P[v*3])*Nn[v*3]+(X[v*3+1]-P[v*3+1])*Nn[v*3+1]+(X[v*3+2]-P[v*3+2])*Nn[v*3+2];if(d<0.003){const q=0.003-d;X[v*3]+=Nn[v*3]*q;X[v*3+1]+=Nn[v*3+1]*q;X[v*3+2]+=Nn[v*3+2]*q;}}}
/* ---------- folds: soft drape under the chest, elbows, knees and hems ---------- */
/* cloth folds: rounded ridges and narrow valleys, amplitude from the ease (tight fabric barely folds) */
const foldP=ph=>2*Math.pow(0.5+0.5*Math.sin(ph),1.7)-1;
function shFolds(B,L){
  const n=B.n,reg=B.reg,X=L.X,E=L.E,act=L.act,P=B.P,heavy=L.name==='outer'?1.25:L.name==='mid'?1.1:1;
  /* the fold pattern lives on the fabric, not on the body under it: phases from the fabric's own coordinates and the
     relief along its own normal (where many body vertices crowd into a little fabric - under the bust - the body's
     coordinates and normals turned the folds into noise) */
  const C=new Float32Array(n*3),Nn=new Float32Array(n*3),ix=B.ix;
  for(let v=0;v<n;v++)if(act[v])shCoord(reg[v],X[v*3],X[v*3+1],X[v*3+2],C,v*3);
  for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2];if(!act[a]||!act[b]||!act[c])continue;const ux=X[b*3]-X[a*3],uy=X[b*3+1]-X[a*3+1],uz=X[b*3+2]-X[a*3+2],vx=X[c*3]-X[a*3],vy=X[c*3+1]-X[a*3+1],vz=X[c*3+2]-X[a*3+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const k of [a,b,c]){Nn[k*3]+=nx;Nn[k*3+1]+=ny;Nn[k*3+2]+=nz;}}
  for(let v=0;v<n;v++){if(!act[v])continue;let l=Math.hypot(Nn[v*3],Nn[v*3+1],Nn[v*3+2]);if(l<1e-12){Nn[v*3]=B.N[v*3];Nn[v*3+1]=B.N[v*3+1];Nn[v*3+2]=B.N[v*3+2];continue;}
    /* outward (the triangle winding of the body) */
    if(Nn[v*3]*B.N[v*3]+Nn[v*3+1]*B.N[v*3+1]+Nn[v*3+2]*B.N[v*3+2]<0)l=-l;Nn[v*3]/=l;Nn[v*3+1]/=l;Nn[v*3+2]/=l;}
  for(let v=0;v<n;v++){if(!act[v])continue;const r=reg[v],th=C[v*3],xx=C[v*3+1],e=E[v],loose=smooth((e-0.005)/0.035),soft=0.35+0.65*loose;let d=0;
    /* ring folds parallel to a cut edge (cuff, trouser break) fade out over the last cm: otherwise the cut runs across ridges and frays */
    const edgeK=smooth((L.fe||L.f)[v]/0.03);
    if(r===0){const y=xx,sn=Math.sin(th),cs=Math.cos(th);
      /* vertical hanging folds below the chest (more for loose garments, they spread towards the hem) */
      const ph=th*9+1.9*Math.sin(th*2.3+y*4.1)+0.9*Math.sin(y*7.3+th*5.1);
      /* (not down the centre of the back over the seat: a single fold there read as the body's cleft) */
      d+=loose*0.0048*smooth((1.2-y)/0.28)*foldP(ph)*(1-0.85*gauss(cs,0.28)*smooth(-sn/0.5)*(1-smooth((y-1.0)/0.08)));
      /* drape from the armpit: diagonal folds on the side of the chest */
      const side=gauss(Math.abs(cs)-1,0.22),pa=(1.3-y)*55+Math.abs(sn)*14+Math.sin(th*4)*1.5;
      d+=soft*0.0032*side*smooth((1.33-y)/0.05)*smooth((y-1.08)/0.08)*foldP(pa);
      /* soft horizontal wrinkles at the small of the back and the waist */
      d+=soft*0.0018*gauss(y-1.05,0.05)*foldP(y*85+Math.sin(th*3)*2)*(0.6+0.4*Math.max(0,-sn));
      d+=0.0012*fbm(cs*1.7,y*5,sn*1.7)*(0.4+loose);
      /* an oversized body hangs from the chest in a few broad, soft folds (a smooth wide cylinder read as a stiff box and
         made the figure look heavier); deepest at the sides and the back, fading into the hem band */
      {const big=smooth((e-0.012)/0.02)*(L.fitE!=null?smooth((L.fitE-0.022)/0.012):1);if(big>0){const pb=th*5+1.6*Math.sin(th*1.7+y*3.3)+0.8*Math.sin(y*5.2+th*3.1);
        d+=big*0.011*smooth((1.22-y)/0.18)*edgeK*foldP(pb)*(0.55+0.45*Math.abs(cs));}}}
    else if(r<=2){const t=xx;
      /* elbow: crossing diagonal folds where the sleeve bunches */
      const pe=t*68+2.6*Math.sin(th*1.4+t*9),pe2=t*55-2.2*Math.sin(th*1.7-t*7);
      d+=(0.0016+0.0055*loose)*gauss(t-0.52,0.11)*(0.6*foldP(pe)+0.4*foldP(pe2))*(0.65+0.35*Math.sin(th*2+1));
      /* sleeve bunching at the wrist and under the upper arm */
      d+=(0.001+0.0035*loose)*smooth((t-0.78)/0.12)*edgeK*foldP(t*52+Math.sin(th*2.2)*2.4);
      d+=loose*0.0035*gauss(t-0.16,0.08)*Math.max(0,-Math.cos(th))*foldP(t*48+th*3);
      d+=0.0012*fbm(Math.cos(th)*1.5,t*6,Math.sin(th)*1.5)*(0.4+loose);
      {const big=smooth((e-0.018)/0.016);if(big>0)d+=big*0.005*smooth((t-0.12)/0.15)*foldP(th*3+1.2*Math.sin(t*6+th*2));}}
    else{const y=xx,sn=Math.sin(th);
      /* trouser legs hang: long vertical folds from the seat and the knee to the hem, wider and deeper the looser the cut
         (horizontal ring folds round the knee and the hem - the old model - read as bands round the legs, an accordion) */
      d+=(0.0012+0.0032*loose)*smooth((0.82-y)/0.3)*foldP(th*4+1.3*Math.sin(y*3.1+th*2.2)+0.6*Math.sin(y*7+th));
      /* a fitted leg creases a little behind the knee (soft diagonal wrinkles, not rings) */
      d+=0.0018*(1-loose)*gauss(y-0.47,0.045)*Math.max(0,-sn)*foldP(y*70+th*4);
      /* whiskers at the front of the crotch */
      /* (fanning out from the crotch, shallow: level ones read as the fold under a seat) */
      d+=(0.0004+0.0009*loose)*gauss(y-0.8,0.04)*Math.max(0,sn)*foldP((y-0.8)*70+Math.cos(th)*14);
      /* the break: where the leg meets the shoe the fabric folds once, at the front, slanting */
      d+=(0.0008+0.0014*loose)*gauss(y-0.1,0.05)*edgeK*Math.max(0,sn)*foldP(y*60+th*5);
      d+=0.0008*fbm(Math.cos(th)*1.5,y*5,sn*1.5)*(0.4+loose);}
    /* where the drape bunched the fabric the folds are deeper; where it hangs taut they almost vanish */
    if(L.comp)d*=0.6+0.8*smooth(L.comp[v]/0.05)*smooth((L.fe||L.f)[v]/0.04);
    /* all folds a little softer (they read as crumpled fabric) */
    /* (hollows a little shallower than ridges: scaled alike the fabric came closer to the skin, which showed through) */
    d*=heavy*(d<0?0.75:0.9);
    /* puffer: full baffles between stitch lines (8.5 cm apart on the body, 12 on the sleeves), the stitches pulled in */
    if(L.quilt){d*=0.35;const ph=r===0?xx*Math.PI/0.085:r<=2?xx*Math.PI/0.12:0;if(ph)d+=0.0085*(Math.pow(Math.abs(Math.sin(ph)),0.3)-0.72)*edgeK;}
    /* near a sleeve end the fold depth is capped so the cuff stays a clean ring */
    if(r>=1&&r<=2)d=clamp(d,-0.008-0.008*edgeK,0.008+0.008*edgeK);
    if(d){X[v*3]+=Nn[v*3]*d;X[v*3+1]+=Nn[v*3+1]*d;X[v*3+2]+=Nn[v*3+2]*d;}}
}
/* tops: the centre back, last step before the cut (the stacking / clearing passes moved it again) */
function shMidTrunk(B,L){const n=B.n,reg=B.reg,X=L.X,P=B.P,act=L.act;if(L.name==='bottom')return;
  /* the fabric never crosses the body's midline (at the cleft of the seat the support's normals point across it:
     the left half's points landed right of the centre and the folded triangles stood out of the back as a spike) */
  for(let v=0;v<n;v++){if(!act[v]||reg[v]!==0||P[v*3+2]>0)continue;const px=P[v*3],ax=Math.abs(px);if(ax>0.04)continue;
    const s=px<0?-1:1,w=1-smooth((ax-0.02)/0.02),mn=w*ax;if(X[v*3]*s<mn)X[v*3]=s*mn;}
  /* right along the midline the fabric made a fin with a groove either side (4-9 mm; the normal at the bottom of the
     cleft is useless): front-back it is evened out across a 1.8 cm strip (the mesh is dense there, so several passes) */
  const off=B.off,adj=B.adj,mid=[],wt=[];for(let v=0;v<n;v++){const ax=Math.abs(P[v*3]);if(act[v]&&reg[v]===0&&ax<0.009&&P[v*3+2]<-0.02){mid.push(v);wt.push(0.5*(1-smooth((ax-0.005)/0.004)));}}
  const Z=new Float32Array(mid.length);for(let it=0;it<10;it++){for(let i=0;i<mid.length;i++){const v=mid[i];let sz=0,c=0;for(let k=off[v];k<off[v+1];k++){const j=adj[k];if(!act[j])continue;sz+=X[j*3+2];c++;}
      Z[i]=c<3?X[v*3+2]:X[v*3+2]+wt[i]*(sz/c-X[v*3+2]);}
    for(let i=0;i<mid.length;i++)X[mid[i]*3+2]=Z[i];}
  /* down the spine the fabric dropped ~5 mm less than either side of it: stripes and checks bent up into a point there.
     Its vertical shift from the pattern is evened out across a 10 cm strip */
  const sp=[],sw=[];for(let v=0;v<n;v++){const ax=Math.abs(P[v*3]);if(act[v]&&reg[v]===0&&ax<0.05&&P[v*3+2]<-0.02){sp.push(v);sw.push(0.5*(1-smooth((ax-0.03)/0.02)));}}
  const D=new Float32Array(n);for(const v of sp)D[v]=X[v*3+1]-P[v*3+1];const D2=new Float32Array(sp.length);
  for(let it=0;it<16;it++){for(let i=0;i<sp.length;i++){const v=sp[i];let s=0,c=0;for(let k=off[v];k<off[v+1];k++){const j=adj[k];if(!act[j])continue;s+=(Math.abs(P[j*3])<0.05&&P[j*3+2]<-0.02&&reg[j]===0)?D[j]:X[j*3+1]-P[j*3+1];c++;}
      D2[i]=c<3?D[v]:D[v]+sw[i]*(s/c-D[v]);}
    for(let i=0;i<sp.length;i++)D[sp[i]]=D2[i];}
  for(const v of sp)X[v*3+1]=P[v*3+1]+D[v];
}
/* ---------- cut along f=0 and build the meshes (one per material), with a turned edge ---------- */
function shEmit(B,L){
  shMidTrunk(B,L);
  const ix=B.ix,f=L.f,X=L.X,act=L.act,P=B.P;let C=B.C,reg=B.reg;
  if(L.rv){const rv=L.rv,n=B.n;let diff=false;for(let v=0;v<n;v++)if(act[v]&&rv[v]!==reg[v]){diff=true;break;}
    if(diff){const C2=C.slice(),r2=reg.slice();for(let v=0;v<n;v++)if(act[v]&&rv[v]!==reg[v]){r2[v]=rv[v];shCoord(rv[v],P[v*3],P[v*3+1],P[v*3+2],C2,v*3);}C=C2;reg=r2;}}
  const verts=new Map(),pos=[],uv=[],rg=[],src=[],xs=[];
  const uvOf=(r,th,xx)=>r===0?[th*0.15/TILE,xx/TILE]:r<=2?[th*0.05/TILE,xx*0.55/TILE]:[th*0.07/TILE,xx/TILE];
  const NB=B.n,key=(a,b)=>a<b?a*NB+b:b*NB+a;
  const vert=(a,b,t,thRef)=>{/* point on vertex a (t=0) or on edge a-b */const k=b<0?a*4:(NB+key(a,b))*4;
    let r=reg[a];if(b>=0&&reg[b]!==r&&t>0.5)r=reg[b];
    let th=b<0?C[a*3]:lerp(C[a*3],C[a*3]+wrapA(C[b*3]-C[a*3]),t),xx=b<0?C[a*3+1]:lerp(C[a*3+1],C[b*3+1],t);
    if(reg[a]!==r)th=C[b*3];if(thRef!=null)th=thRef+wrapA(th-thRef);
    const seamK=k+(th>Math.PI?1:th<-Math.PI?2:0);let id=verts.get(seamK);if(id!=null)return id;
    id=pos.length/3;verts.set(seamK,id);
    if(b<0)pos.push(X[a*3],X[a*3+1],X[a*3+2]);else pos.push(lerp(X[a*3],X[b*3],t),lerp(X[a*3+1],X[b*3+1],t),lerp(X[a*3+2],X[b*3+2],t));
    const[u,w]=uvOf(r,th,xx);uv.push(u,w);rg.push(r);src.push(a);xs.push(xx);return id;};
  /* a triangle across two parts of the pattern (seat / leg, chest / sleeve): all its corners in one part's coordinates.
     With each corner in its own part the texture was squeezed across it (the wales of corduroy zigzagged over the seat);
     now the boundary is a clean seam (same positions, so the shading stays continuous) */
  const cA=[0,0,0],cB=[0,0,0],vertsR=new Map();
  const vertR=(a,b,t,rt,thRef)=>{const k=(b<0?a*4:(NB+key(a,b))*4)*8+rt;
    shCoord(rt,P[a*3],P[a*3+1],P[a*3+2],cA,0);let th=cA[0],xx=cA[1];
    if(b>=0){shCoord(rt,P[b*3],P[b*3+1],P[b*3+2],cB,0);th=lerp(th,th+wrapA(cB[0]-th),t);xx=lerp(xx,cB[1],t);}
    th=thRef+wrapA(th-thRef);const seamK=k*3+(th>Math.PI?1:th<-Math.PI?2:0);let id=vertsR.get(seamK);if(id!=null)return id;
    id=pos.length/3;vertsR.set(seamK,id);
    if(b<0)pos.push(X[a*3],X[a*3+1],X[a*3+2]);else pos.push(lerp(X[a*3],X[b*3],t),lerp(X[a*3+1],X[b*3+1],t),lerp(X[a*3+2],X[b*3+2],t));
    const[u,w]=uvOf(rt,th,xx);uv.push(u,w);rg.push(rt);src.push(a);xs.push(xx);return id;};
  /* colour bands: a polygon cut along xx = yt (a new vertex on each crossing edge, shared by both sides) */
  const bandV=new Map(),bandEdge=new Set();
  const cutV=(p,q,yt)=>{const k=(p<q?p*1e7+q:q*1e7+p)+'_'+yt;let id=bandV.get(k);if(id!=null)return id;const t=(yt-xs[p])/(xs[q]-xs[p]);id=pos.length/3;bandV.set(k,id);
    for(let c=0;c<3;c++)pos.push(lerp(pos[p*3+c],pos[q*3+c],t));uv.push(lerp(uv[p*2],uv[q*2],t),lerp(uv[p*2+1],uv[q*2+1],t));rg.push(rg[p]);src.push(t<0.5?src[p]:src[q]);xs.push(yt);bandEdge.add(id);return id;};
  const slab=(poly,lo,hi)=>{let cur=poly;for(const[yt,keepAbove] of [[lo,true],[hi,false]]){if(yt==null||cur.length<3)continue;const nx=[];
      for(let k=0;k<cur.length;k++){const a=cur[k],b=cur[(k+1)%cur.length],ia=keepAbove?xs[a]>=yt:xs[a]<=yt,ib=keepAbove?xs[b]>=yt:xs[b]<=yt;if(ia)nx.push(a);if(ia!==ib)nx.push(cutV(a,b,yt));}cur=nx;}
    return cur;};
  const tris=[[],[],[],[],[],[],[],[]];
  const matOf=(a)=>{const r=reg[a],g=L.grids[r]||L.grids[0];if(!g)return 0;const m=g.matAt(C[a*3],C[a*3+1]);return m<0?0:m;};
  for(let t=0;t<ix.length;t+=3){const I=[ix[t],ix[t+1],ix[t+2]];if(!act[I[0]]||!act[I[1]]||!act[I[2]])continue;
    const F=I.map(i=>f[i]);if(F[0]<=0&&F[1]<=0&&F[2]<=0)continue;
    const same=reg[I[0]]===reg[I[1]]&&reg[I[0]]===reg[I[2]],thRef=same?C[I[0]*3]:null;
    let rt=-1,thR=0;if(!same){rt=reg[I[1]]===reg[I[2]]?reg[I[1]]:reg[I[0]];shCoord(rt,P[I[0]*3],P[I[0]*3+1],P[I[0]*3+2],cA,0);thR=cA[0];}
    const V=(a,b,t)=>same?vert(a,b,t,thRef):vertR(a,b,t,rt,thR);
    const poly=[];for(let k=0;k<3;k++){const a=I[k],b=I[(k+1)%3],fa=F[k],fb=F[(k+1)%3];if(fa>0)poly.push(V(a,-1,0));if((fa>0)!==(fb>0)){const s=fa/(fa-fb);poly.push(V(a,b,s));}}
    const mi=Math.min(7,matOf(I[0]));
    if(L.bands&&(same?reg[I[0]]===0:rt===0)&&poly.length>=3){let lo=-9,mn=9,mx=-9;for(const id of poly){mn=Math.min(mn,xs[id]);mx=Math.max(mx,xs[id]);}
      const cuts=[];for(const b of L.bands){if(b.y1>mn&&b.y0<mx)cuts.push(b);}
      if(cuts.length){const ed=[];for(const b of cuts)ed.push([b.y0,null],[b.y1,b]);ed.sort((a,b)=>a[0]-b[0]);
        /* slabs between consecutive band edges: inside a band its material, else the garment's */
        const ys=[null,...ed.map(e=>e[0]),null];
        for(let q=0;q+1<ys.length;q++){const sp=slab(poly,ys[q],ys[q+1]);if(sp.length<3)continue;const ym=(q===0?mn:ys[q])+0.5*(((q+1===ys.length-1)?mx:ys[q+1])-(q===0?mn:ys[q]));
          const bb=L.bands.find(b=>ym>b.y0&&ym<b.y1),m2=bb?Math.min(7,bb.mi):mi;for(let k=1;k+1<sp.length;k++)tris[m2].push(sp[0],sp[k],sp[k+1]);}
        continue;}}
    for(let k=1;k+1<poly.length;k++)tris[mi].push(poly[0],poly[k],poly[k+1]);}
  const out=[];
  for(let mi=0;mi<L.mats.length&&mi<8;mi++){const T=tris[mi];if(!T.length)continue;
    /* compact the vertex set used by this material */
    const remap=new Map(),P2=[],U2=[],R2=[],S2=[],I2=[],BE=[];for(const id of T){let j=remap.get(id);if(j==null){j=P2.length/3;remap.set(id,j);P2.push(pos[id*3],pos[id*3+1],pos[id*3+2]);U2.push(uv[id*2],uv[id*2+1]);R2.push(rg[id]);S2.push(src[id]);BE.push(bandEdge.has(id)?1:0);}I2.push(j);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P2,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U2,2));g.setIndex(I2);g.computeVertexNormals();
    shWeldNormals(g,S2,P2);g.userData.reg=R2;g.userData.src=S2;
    /* the fabric copies the body's collapsed pole faces at the nipples / navel: shade it with the surrounding normal */
    if(!window.__noSpotN){const BP=B.P,nr=g.attributes.normal;for(const q of (BC.core.spots||[])){let ax=0,ay=0,az=0;const ids=[];for(let i=0;i<S2.length;i++){const v=S2[i],dx=BP[v*3]-q[0],dy=BP[v*3+1]-q[1],dz=BP[v*3+2]-q[2],d=Math.sqrt(dx*dx+dy*dy+dz*dz);if(d<q[3]*0.8){ids.push([i,d]);if(d>q[3]*0.5){ax+=nr.getX(i);ay+=nr.getY(i);az+=nr.getZ(i);}}}
      const l=Math.hypot(ax,ay,az);if(!l)continue;ax/=l;ay/=l;az/=l;for(const[i,d] of ids){const w=1-smooth(d/(q[3]*0.8));const x=lerp(nr.getX(i),ax,w),y=lerp(nr.getY(i),ay,w),z=lerp(nr.getZ(i),az,w),m=Math.hypot(x,y,z)||1;nr.setXYZ(i,x/m,y/m,z/m);}}}
    /* turned edge: the fabric folds back at hems, cuffs and necklines so it reads as cloth with thickness */
    /* (no turned edge along the lower cut where the curtain or kept skirt continues the fabric: it drew a hem line across the hips;
       nor along the trouser legs' cut above the kept hems: a line round the shin) */
    shTurnEdge(g,L.lowerCut!=null?L.lowerCut+0.06:L.legCut!=null?L.legCut+0.04:null,bandEdge.size?(a,b)=>BE[a]&&BE[b]:null);
    const nv=g.attributes.position.count,col=new Float32Array(nv*3);for(let i=0;i<nv;i++){const y=g.attributes.position.getY(i);col[i*3]=col[i*3+1]=col[i*3+2]=1;}
    g.setAttribute('color',new THREE.BufferAttribute(col,3));
    const m=mk(g,L.mats[mi]);m.userData.ctx='none';out.push(m);
    if(L.lining){const li=g.clone(),lp=li.attributes.position,ln=li.attributes.normal;for(let i=0;i<lp.count;i++){lp.setXYZ(i,lp.getX(i)-ln.getX(i)*0.0016,lp.getY(i)-ln.getY(i)*0.0016,lp.getZ(i)-ln.getZ(i)*0.0016);ln.setXYZ(i,-ln.getX(i),-ln.getY(i),-ln.getZ(i));}
      const ix=li.index.array;for(let t=0;t<ix.length;t+=3){const tmp=ix[t+1];ix[t+1]=ix[t+2];ix[t+2]=tmp;}const lm=mk(li,L.lining);lm.userData.ctx='none';lm.userData.layer=L.name;out.push(lm);}}
  return out;
}
/* vertices duplicated on the UV seam get one shared normal */
/* numeric key of a position (0.05 mm grid): identical points get the same key, no strings, no garbage */
const posKey=(x,y,z)=>(Math.round(x*20000)+65536)*17179869184+(Math.round(y*20000)+65536)*131072+(Math.round(z*20000)+65536);
function shWeldNormals(g,S,P2){const n=g.attributes.normal,by=new Map();for(let i=0;i<S.length;i++){const k=posKey(P2[i*3],P2[i*3+1],P2[i*3+2]);let a=by.get(k);if(a===undefined)by.set(k,i);else if(typeof a==='number')by.set(k,[a,i]);else a.push(i);}
  for(const a of by.values()){if(typeof a==='number')continue;let x=0,y=0,z=0;for(const i of a){x+=n.getX(i);y+=n.getY(i);z+=n.getZ(i);}const l=Math.hypot(x,y,z)||1;for(const i of a)n.setXYZ(i,x/l,y/l,z/l);}}
function shTurnEdge(g,skipBelow,skip){
  const ix=Array.from(g.index.array),p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,rg=g.userData.reg,cnt=new Map();
  const pa=p.array,NV=p.count,same=new Map(),can=new Uint32Array(NV);
  for(let i=0;i<NV;i++){const k=posKey(pa[i*3],pa[i*3+1],pa[i*3+2]);let c=same.get(k);if(c===undefined){same.set(k,i);c=i;}can[i]=c;}
  for(let t=0;t<ix.length;t+=3)for(let k=0;k<3;k++){const a=ix[t+k],b=ix[t+(k+1)%3],ca=can[a],cb=can[b],key=ca<cb?ca*NV+cb:cb*NV+ca;const e=cnt.get(key);if(e)e.c++;else cnt.set(key,{c:1,a,b});}
  const P=Array.from(p.array),N=Array.from(n.array),U=Array.from(u.array),inner=new Map(),th=0.0026;
  const dup=i=>{let j=inner.get(i);if(j!=null)return j;j=P.length/3;inner.set(i,j);
    P.push(p.getX(i)-n.getX(i)*th,p.getY(i)-n.getY(i)*th,p.getZ(i)-n.getZ(i)*th);N.push(-n.getX(i),-n.getY(i),-n.getZ(i));U.push(u.getX(i),u.getY(i)+0.05);if(rg)rg.push(rg[i]);if(g.userData.src)g.userData.src.push(g.userData.src[i]);return j;};
  for(const e of cnt.values()){if(e.c!==1)continue;const a=e.a,b=e.b;if(skip&&skip(a,b))continue;if(skipBelow!=null&&rg&&rg[a]!==1&&rg[a]!==2&&rg[b]!==1&&rg[b]!==2&&p.getY(a)<skipBelow&&p.getY(b)<skipBelow)continue;const a2=dup(a),b2=dup(b);ix.push(b,a,a2,b,a2,b2);}
  if(!inner.size)return;
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setIndex(ix);
}
/* ---------- re-seating details ---------- */
function shShiftGrid(o,nw){
  if(!o.any&&!nw.any)return{o,S:null,at(){return 0;}};
  const NA=SH_NA,N=o.N,S=new Float32Array(N*NA),has=new Uint8Array(N*NA);
  /* where the old fabric stays (kept pattern parts) nothing moves; where both exist, details follow the change */
  let front=[];const nb=(k,f)=>{const j=(k/NA)|0,i=k-j*NA;f(j*NA+(i+1)%NA);f(j*NA+(i+NA-1)%NA);if(j>0)f(k-NA);if(j<N-1)f(k+NA);};
  for(let k=0;k<N*NA;k++)if(o.R[k]>=0&&nw.R[k]>=0){S[k]=nw.R[k]-o.R[k];has[k]=1;}
  if(!o.any&&!nw.any)return{o,S,at(){return 0;}};
  /* spread a little beyond the fabric so edges of details do not tear off (ring by ring from the edge) */
  const mark=new Uint8Array(N*NA);for(let k=0;k<N*NA;k++)if(has[k])nb(k,kk=>{if(!has[kk]&&!mark[kk]){mark[kk]=1;front.push(kk);}});
  for(let it=0;it<24&&front.length;it++){const vals=front.map(k=>{let s=0,w=0;nb(k,kk=>{if(has[kk]){s+=S[kk];w++;}});return w?s/w*0.985:0;});
    front.forEach((k,q)=>{S[k]=vals[q];has[k]=1;});const nxt=[];for(const k of front)nb(k,kk=>{if(!has[kk]&&!mark[kk]){mark[kk]=1;nxt.push(kk);}});front=nxt;}
  return{o,S,at(th,x){const g=((th/TAU*NA-0.5)%NA+NA)%NA,i=Math.floor(g),u=g-i,f=(x-o.x0)/o.st;if(f<0||f>N-1)return 0;const j=Math.min(N-2,Math.floor(f)),v=f-j,i2=(i+1)%NA;
    return(S[j*NA+i]*(1-u)+S[j*NA+i2]*u)*(1-v)+(S[(j+1)*NA+i]*(1-u)+S[(j+1)*NA+i2]*u)*v;}};
}
function shBake(o,G){o.updateMatrixWorld(true);const gg=o.geometry.clone();gg.applyMatrix4(o.matrixWorld);gg.userData=Object.assign({},o.geometry.userData);
  if(o.parent)o.parent.remove(o);o.geometry=gg;o.position.set(0,0,0);o.quaternion.identity();o.scale.set(1,1,1);o.updateMatrix();G.add(o);G.updateMatrixWorld(true);}
function shReseat(o,shift,G,trunkOnly){
  let axis=o.geometry.userData.axis;
  /* bake the transform so every vertex can be moved in body space, and hang the mesh straight off G */
  o.updateMatrixWorld(true);const gg=o.geometry.clone();gg.applyMatrix4(o.matrixWorld);gg.userData=Object.assign({},o.geometry.userData);
  /* pieces of a bag stay in the bag's group (it is moved as a whole later) */
  let home=G;{let p=o.parent;while(p){if(p.userData&&p.userData.bagBody)o.userData.bagBody=true;if(p.userData&&p.userData.bagGroup){home=p;break;}p=p.parent;}}
  if(o.parent)o.parent.remove(o);o.geometry=gg;o.position.set(0,0,0);o.quaternion.identity();o.scale.set(1,1,1);o.updateMatrix();home.add(o);
  if(!axis||axis==='auto')axis=fitAxisOf(gg);
  /* on a long coat the skirt below the crotch is a trunk tube (the curtain): a detail well below the cut (pocket, belt end) follows it, not the leg under it (cuffs at the wrists, next to the cut, stay as they are) */
  if(trunkOnly!=null&&(axis==='legL'||axis==='legR')){gg.computeBoundingBox();const bb=gg.boundingBox;if((bb.min.y+bb.max.y)/2<trunkOnly-0.08)axis='torso';}
  const r=shRegionOfAxis(axis),S=shift[r],p=gg.attributes.position,c=new Float32Array(3),q=new Float32Array(3);
  const bias=o.userData.layer==='none'?0.0008:0.0012;
  for(let i=0;i<p.count;i++){shCoord(r,p.getX(i),p.getY(i),p.getZ(i),c,0);const d=S.at(c[0],c[1]);shPoint(r,c[0],c[1],Math.max(0.001,c[2]+d+bias),q);p.setXYZ(i,q[0],q[1],q[2]);}
  p.needsUpdate=true;o.userData.ctx='none';
}
/* details (belt loops, a belt, pockets, plackets) of a garment that a higher layer covers are hidden under it -
   the fabric over them stays smooth instead of being pushed out into lumps */
function shHideCovered(o,L,layers){const up=layers.filter(l=>l.rank>L.rank&&l.newG);if(!up.length)return;
  const g=o.geometry,p=g.attributes.position,n=p.count;if(!n)return;if(!g.index){const ix=new Uint32Array(n);for(let i=0;i<n;i++)ix[i]=i;g.setIndex(new THREE.BufferAttribute(ix,1));g.clearGroups&&g.clearGroups();}const r=shRegionOfAxis(g.userData.axis||fitAxisOf(g)),c=new Float32Array(3),cov=new Uint8Array(n);
  /* a piece on the legs (a wallet chain, a trouser detail) is also covered by a coat's skirt, which lives in the trunk region */
  /* (a piece by the side of the trunk can be taken for an arm's: the side belt loops were tested against the sleeves only) */
  const regs=r>0?[r,0]:[0];
  /* (the upper layers' curtains too: below its fitted shell a top hangs as a curtain, the side belt loops of the
     trousers stood out through it) */
  const cur=up.filter(U=>U.curtainMesh);let CG=null;if(cur.length){CG=new PGrid(0);for(const U of cur)CG.raster(shTrisOf(U.curtainMesh,0),0);if(!CG.any)CG=null;}
  for(let i=0;i<n;i++)for(const rr of regs){if(cov[i])break;shCoord(rr,p.getX(i),p.getY(i),p.getZ(i),c,0);for(const U of up){const G2=U.newG[rr];if(!G2||!G2.any)continue;const R=G2.at(c[0],c[1]);if(R>=0&&R>=c[2]-0.035){cov[i]=1;break;}}
    if(!cov[i]&&CG&&rr===0){const R=CG.at(c[0],c[1]);if(R>0&&R>=c[2]-0.035)cov[i]=1;}}
  const ix=g.index.array,keep=[];for(let t=0;t<ix.length;t+=3)if(!(cov[ix[t]]&&cov[ix[t+1]]&&cov[ix[t+2]]))keep.push(ix[t],ix[t+1],ix[t+2]);
  if(keep.length<ix.length)g.setIndex(keep);}
/* the lower edge of a layer's fitted shell along the curtain cut, sampled per angle: position and shading normal.
   The curtain starts exactly there (it used to sit 2 mm outside the shell's last 2 cm, which drew a band round the hips) */
function shLowerRim(ms,cut,NA,thOf,minR){
  const pos=new Float32Array(NA*3),nor=new Float32Array(NA*3),uvs=new Float32Array(NA*2),best=new Float32Array(NA).fill(9),has=new Uint8Array(NA),rej=new Uint8Array(NA);
  for(const m of ms){const g=m.geometry,p=g.attributes.position,nr=g.attributes.normal,rg=g.userData.reg,ua=g.attributes.uv;if(!g.index||!nr)continue;const ix=g.index.array,pa=p.array,NV=p.count;
    const can=new Uint32Array(NV),seen=new Map();for(let i=0;i<NV;i++){const k=posKey(pa[i*3],pa[i*3+1],pa[i*3+2]);let c=seen.get(k);if(c===undefined){seen.set(k,i);c=i;}can[i]=c;}
    const cnt=new Map();for(let t=0;t<ix.length;t+=3)for(let k=0;k<3;k++){const a=ix[t+k],b=ix[t+(k+1)%3],ca=can[a],cb=can[b],key=ca<cb?ca*NV+cb:cb*NV+ca;const e=cnt.get(key);if(e)e.c++;else cnt.set(key,{c:1,a,b});}
    for(const e of cnt.values()){if(e.c!==1)continue;const a=e.a,b=e.b;if(rg&&(rg[a]!==0||rg[b]!==0))continue;
      const ax=pa[a*3],ay=pa[a*3+1],az=pa[a*3+2],bx=pa[b*3],by=pa[b*3+1],bz=pa[b*3+2];if(Math.max(ay,by)>cut+0.03)continue;
      /* the outside face only (the turned edge's inner copies face in), and edges that run round the body (not a front edge) */
      if(nr.getX(a)*ax+nr.getZ(a)*az<0||nr.getX(b)*bx+nr.getZ(b)*bz<0)continue;if(Math.abs(by-ay)>0.7*Math.hypot(bx-ax,bz-az))continue;
      let ta=Math.atan2(az,ax),tb=Math.atan2(bz,bx);tb=ta+wrapA(tb-ta);const lo=Math.min(ta,tb),hi=Math.max(ta,tb);if(hi-lo>0.5)continue;
      const i0=Math.ceil(((lo+Math.PI)/TAU*NA)-0.5),i1=Math.floor(((hi+Math.PI)/TAU*NA)-0.5);
      for(let ii=i0;ii<=i1;ii++){const i=((ii%NA)+NA)%NA,th=(ii+0.5)/NA*TAU-Math.PI,u=hi>lo?(th-ta)/(tb-ta):0;if(u<-1e-4||u>1+1e-4)continue;const y=lerp(ay,by,u);if(y>=best[i])continue;
        /* not the fabric drawn into the crotch near the body axis (its angle is meaningless there) */
        if(minR&&Math.hypot(lerp(ax,bx,u),lerp(az,bz,u))<minR[i]){rej[i]=1;continue;}best[i]=y;has[i]=1;
        pos[i*3]=lerp(ax,bx,u);pos[i*3+1]=y;pos[i*3+2]=lerp(az,bz,u);if(ua){uvs[i*2]=lerp(ua.getX(a),ua.getX(b),u);uvs[i*2+1]=lerp(ua.getY(a),ua.getY(b),u);}let nx=lerp(nr.getX(a),nr.getX(b),u),ny=lerp(nr.getY(a),nr.getY(b),u),nz=lerp(nr.getZ(a),nr.getZ(b),u);const l=Math.hypot(nx,ny,nz)||1;nor[i*3]=nx/l;nor[i*3+1]=ny/l;nor[i*3+2]=nz/l;}}}
  return{pos,nor,uvs,has,rej};}
/* the part of a shirt / jacket / coat below the crotch: a curtain that starts exactly on the fitted shell's lower edge
   and hangs straight down to the pattern's hem, flaring only as much as the cut does, clear of the legs and of
   whatever is worn under it */
function shCurtain(L,cut,shells,B2,tails,layers){
  const T=L.grids[0],ref=L.newG[0];if(!T||!ref||!ref.any)return null;
  const NA=128,c=new Float32Array(3),q=new Float32Array(3),thOf=i=>(i+0.5)/NA*TAU-Math.PI;
  /* hem per angle (lowest covered row of the pattern) and the pattern radius at the cut */
  const hem=new Float32Array(NA),Rc=new Float32Array(NA),Rs=new Float32Array(NA);
  const ok=new Uint8Array(NA);
  for(let i=0;i<NA;i++){const th=thOf(i);let h=9;for(let y=cut;y>0.05;y-=0.005){if(T.at(th,y)<0){break;}h=y;}ok[i]=h<cut-0.005?1:0;hem[i]=ok[i]?h:cut;let r0=T.at(th,cut);if(r0<0)r0=T.nearest(th,cut);Rc[i]=r0;
    let rs=ref.at(th,cut+0.016);if(rs<0)rs=ref.nearest(th,cut+0.016);Rs[i]=rs>0?rs:r0;}
  /* shirt tails: the back and front reach lower than the sides */
  for(const t of tails||[]){t.updateMatrixWorld(true);const p=t.geometry.attributes.position,v=new THREE.Vector3();for(let k=0;k<p.count;k++){v.fromBufferAttribute(p,k).applyMatrix4(t.matrixWorld);const i=((Math.floor((Math.atan2(v.z,v.x)+Math.PI)/TAU*NA)%NA)+NA)%NA;if(v.y<hem[i])hem[i]=v.y;}}
  {let h0=hem.slice();for(let k=0;k<10;k++){for(let i=0;i<NA;i++){if(!ok[i])continue;const a=ok[(i+NA-1)%NA]?h0[(i+NA-1)%NA]:h0[i],b=ok[(i+1)%NA]?h0[(i+1)%NA]:h0[i];hem[i]=(a+2*h0[i]+b)/4;}h0=hem.slice();}}
  if(!ok.some(x=>x))return null;
  /* a column or two where the pattern has a seam gap at the cut (no hem found) takes its neighbours' hem: left out it
     opened a slit down the curtain whose turned edge showed as a dark bar */
  for(let i=0;i<NA;i++){if(ok[i])continue;let l=1,r=1;while(l<4&&!ok[(i-l+NA)%NA])l++;while(r<4&&!ok[(i+r)%NA])r++;if(l>=4||r>=4)continue;const A=(i-l+NA)%NA,Bq=(i+r)%NA;
    if(Math.abs(hem[A]-hem[Bq])>0.025)continue;hem[i]=lerp(hem[A],hem[Bq],l/(l+r));ok[i]=2;}
  let hemMin=9;for(let i=0;i<NA;i++)if(ok[i])hemMin=Math.min(hemMin,hem[i]);if(hemMin>=cut-0.01)return null;
  /* what is under it: body (incl. legs) and lower layers, as a radial outline per row */
  const rows=Math.ceil((cut+0.05-hemMin)/0.01)+3,floor=new Float32Array(rows*NA);
  const put=(x,y,z)=>{if(y>cut+0.005||y<hemMin-0.02)return;const j=Math.round((cut-y)/0.01);if(j<0||j>=rows)return;const th=Math.atan2(z,x),i=((Math.floor((th+Math.PI)/TAU*NA)%NA)+NA)%NA,rr=Math.hypot(x,z);for(const k of [i,(i+1)%NA,(i+NA-1)%NA])if(rr>floor[j*NA+k])floor[j*NA+k]=rr;};
  const P=B2.P,rg=B2.reg;for(let v=0;v<B2.n;v++)if(rg[v]===0||rg[v]>=3)put(P[v*3],P[v*3+1],P[v*3+2]);
  /* lower layers: vertices and points along their edges (their rows are ~1.5 cm apart, the outline rows 1 cm: a row without a sample let the curtain sink into the trousers) */
  /* (and the curtains of the lower layers: a long coat over a long shirt sank under the shirt's curtain at the front edges) */
  for(const m of shells.concat((layers||[]).filter(l=>l.rank<L.rank&&l.curtainMesh).map(l=>l.curtainMesh))){const Lm=m.userData.layer;const lo={bottom:1,top:2,mid:3,outer:4}[Lm];if(!(lo<L.rank))continue;const p=m.geometry.attributes.position,mr=m.geometry.userData.reg,ok=i=>!mr||mr[i]===0||mr[i]>=3;
    for(let i=0;i<p.count;i++)if(ok(i))put(p.getX(i),p.getY(i),p.getZ(i));
    const ix=m.geometry.index?m.geometry.index.array:null;if(!ix)continue;
    for(let t=0;t<ix.length;t+=3)for(let k=0;k<3;k++){const a=ix[t+k],b=ix[t+(k+1)%3];if(a>b||!ok(a)||!ok(b))continue;const ay=p.getY(a),by=p.getY(b);if(Math.max(ay,by)<hemMin-0.02||Math.min(ay,by)>cut+0.005)continue;
      const ax=p.getX(a),az=p.getZ(a),bx=p.getX(b),bz=p.getZ(b),ns=Math.ceil(Math.hypot(bx-ax,by-ay,bz-az)/0.005);for(let s=1;s<ns;s++){const u=s/ns;put(ax+(bx-ax)*u,ay+(by-ay)*u,az+(bz-az)*u);}}}
  /* smooth the outline around and downwards a little: fabric spans the gap between the legs */
  for(let j=0;j<rows;j++){for(let k=0;k<3;k++){const o=j*NA,r0=floor.slice(o,o+NA);for(let i=0;i<NA;i++)floor[o+i]=Math.max(r0[i],(r0[(i+NA-1)%NA]+r0[i]+r0[(i+1)%NA])/3);}}
  let Rsm=Rs.slice();for(let k=0;k<3;k++){const r0=Rsm.slice();for(let i=0;i<NA;i++)Rsm[i]=(r0[(i+NA-1)%NA]+2*r0[i]+r0[(i+1)%NA])/4;}
  const N=rows,pos=[],uv=[],idx=[],reg=[];
  /* where the shell's lower edge is found the curtain starts on it (same point, same normal) and carries its radius and
     folds down over 6 cm into its own hang; elsewhere (no edge at that angle) it starts just under the shell as before */
  const rim=shLowerRim(shells.filter(m=>m.userData.layer===L.name),cut,NA,thOf,Rsm.map(r=>r*0.92)),useRim=new Uint8Array(NA);
  for(let i=0;i<NA;i++)useRim[i]=rim.has[i]&&ok[i]&&rim.pos[i*3+1]>hem[i]+0.03&&rim.pos[i*3+1]<cut+0.03?1:0;
  /* short gaps (an angle where the edge was not found or was rejected) take the edge interpolated from both sides:
     a column starting elsewhere made a slanted step in the first row */
  {const valid=useRim.slice();for(let i=0;i<NA;i++){if(valid[i]||!ok[i])continue;/* (a wide gap is the crotch at the centre front / back, where the shell's edge runs in between the legs) */const lim=26;let l=1,r=1;while(l<lim&&!valid[(i-l+NA)%NA])l++;while(r<lim&&!valid[(i+r)%NA])r++;if(l>=lim||r>=lim)continue;
    const A=(i-l+NA)%NA,Bq=(i+r)%NA,u=l/(l+r),th=thOf(i),RA=Math.hypot(rim.pos[A*3],rim.pos[A*3+2]),RB=Math.hypot(rim.pos[Bq*3],rim.pos[Bq*3+2]),y=lerp(rim.pos[A*3+1],rim.pos[Bq*3+1],u),R=lerp(RA,RB,u);
    if(!(y>hem[i]+0.03)||Math.abs(rim.pos[A*3+1]-rim.pos[Bq*3+1])>0.012)continue;
    /* across a wide gap (the crotch) the top reaches up under the shell, whose edge runs in between the legs there:
       the deeper into the gap, the higher (up to 3.5 cm), just inside the shell's surface */
    const gk=smooth((Math.min(l,r)-1)/4),y2=y+0.035*gk;let R2=R;if(gk>0){const Rs=ref.at(th,y2);if(Rs>0)R2=lerp(R,Math.min(R,Rs-0.003),gk);}shPoint(0,th,y2,R2,q);rim.pos[i*3]=q[0];rim.pos[i*3+1]=q[1];rim.pos[i*3+2]=q[2];
    let nx=lerp(rim.nor[A*3],rim.nor[Bq*3],u),ny=lerp(rim.nor[A*3+1],rim.nor[Bq*3+1],u),nz=lerp(rim.nor[A*3+2],rim.nor[Bq*3+2],u);const nl=Math.hypot(nx,ny,nz)||1;rim.nor[i*3]=nx/nl;rim.nor[i*3+1]=ny/nl;rim.nor[i*3+2]=nz/nl;useRim[i]=1;}}
  /* the curtain's texture continues the shell's: per column the offset between the shell's uv at its edge and the
     curtain's own (th, y) mapping (the fabric dropped a few cm in the drape: stripes and checks jumped at the seam) */
  const uOff=new Float32Array(NA),vOff=new Float32Array(NA),uvOk=new Uint8Array(NA),UP=TAU*0.15/TILE;
  for(let i=0;i<NA;i++){if(!useRim[i])continue;const th=Math.atan2(rim.pos[i*3+2],rim.pos[i*3]);let du=rim.uvs[i*2]-th*0.15/TILE;du-=Math.round(du/UP)*UP;uOff[i]=du;vOff[i]=rim.uvs[i*2+1]-rim.pos[i*3+1]/TILE;uvOk[i]=1;}
  if(uvOk.some(x=>x)){for(let i=0;i<NA;i++){if(uvOk[i])continue;let l=1,r=1;while(l<NA&&!uvOk[(i-l+NA)%NA])l++;while(r<NA&&!uvOk[(i+r)%NA])r++;const A=(i-l+NA)%NA,Bq=(i+r)%NA,w=l/(l+r);uOff[i]=lerp(uOff[A],uOff[Bq],w);vOff[i]=lerp(vOff[A],vOff[Bq],w);}
    for(let k=0;k<4;k++){const u0=uOff.slice(),v0=vOff.slice();for(let i=0;i<NA;i++){if(uvOk[i])continue;uOff[i]=(u0[(i+NA-1)%NA]+2*u0[i]+u0[(i+1)%NA])/4;vOff[i]=(v0[(i+NA-1)%NA]+2*v0[i]+v0[(i+1)%NA])/4;}}}
  const base=(ii,th,y,t)=>{let pr=T.at(th,y);if(pr<0)pr=T.nearest(th,y);const flare=0.55*Math.max(0,pr-Rc[ii]);return[Rsm[ii]+flare+0.0022+0.0015*t,flare];};
  for(let j=0;j<=N;j++)for(let i=0;i<=NA;i++){const ii=i%NA,th=thOf(ii),t=j/N,R0=useRim[ii]?Math.hypot(rim.pos[ii*3],rim.pos[ii*3+2]):0,y0=useRim[ii]?rim.pos[ii*3+1]:cut+0.012,y=lerp(y0,hem[ii],t);
    /* soft vertical folds that open towards the hem */
    const[Rb,flare]=base(ii,th,y,t),fo=(0.0012+0.0045*t+0.25*flare)*foldP(th*9+1.7*Math.sin(th*2.3)+0.6*Math.sin(y*9+th*4));
    let R=Rb+fo*smooth(t/0.25);const fj=Math.min(rows-1,Math.max(0,Math.round((cut-y)/0.01))),Rfl=floor[fj*NA+ii]+0.0045;
    if(useRim[ii]){const dist=y0-y,bl=1-smooth(dist/0.06),R00=base(ii,th,y0,0)[0];R=Rb+(R0-R00)*bl+fo*smooth(t/0.25)*(1-bl);
      /* clear of what is under it, except near the edge where the shell decides: over a wide waistband (baggy trousers)
         the curtain flares out over 9 cm (in 3 cm it made a step - a band across the hips); what it covers there is dropped */
      R=Math.max(R,Rfl-(1-smooth(dist/0.09))*Math.max(0,Rfl-R0));}
    else R=Math.max(R,Rfl);
    /* worn under a jacket / sweater: it stays inside it (tucked under its hem) */
    let cl=false;for(const U of layers||[]){if(U.rank<=L.rank||!U.newG||!U.newG[0].any)continue;let Ru=U.newG[0].at(th,y);if(Ru<0&&U.grids[0]&&U.grids[0].at(th,y)>0)Ru=U.newG[0].nearest(th,y);if(Ru>0){const R2=Math.min(R,Math.max(Ru-0.004,floor[fj*NA+ii]+0.002));if(R2<R){R=R2;cl=true;}}}
    if(j===0&&useRim[ii]&&!cl){/* tucked 3 mm up and 0.8 mm in under the shell's edge: the straight curtain row cannot crack open against the edge's polyline */
      pos.push(rim.pos[ii*3]-rim.nor[ii*3]*0.0008,rim.pos[ii*3+1]+0.001,rim.pos[ii*3+2]-rim.nor[ii*3+2]*0.0008);}else{shPoint(0,th,y,R,q);pos.push(q[0],q[1],q[2]);}uv.push(th*0.15/TILE+uOff[ii],y/TILE+vOff[ii]);reg.push(0);}
  /* columns whose hems differ by a cliff (the front opening of an open jacket) are not joined: each row would become a long slanted sliver */
  for(let j=0;j<N;j++)for(let i=0;i<NA;i++){const i2=(i+1)%NA;if(!ok[i]||!ok[i2]||Math.abs(hem[i]-hem[i2])>0.025)continue;const a=j*(NA+1)+i,b=a+NA+1;idx.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  /* outward facing */
  let flipped=false;{const p=g.attributes.position,nr=g.attributes.normal;let flip=0;for(let i=0;i<p.count;i+=37){if(p.getX(i)*nr.getX(i)+p.getZ(i)*nr.getZ(i)<0)flip++;else flip--;}if(flip>0){flipped=true;const ix=g.index.array;for(let t=0;t<ix.length;t+=3){const tmp=ix[t+1];ix[t+1]=ix[t+2];ix[t+2]=tmp;}g.computeVertexNormals();}}
  /* the seam at the back (u wraps) shares normals */
  const nr=g.attributes.normal;for(let j=0;j<=N;j++){const a=j*(NA+1),b=a+NA;const x=nr.getX(a)+nr.getX(b),y=nr.getY(a)+nr.getY(b),z=nr.getZ(a)+nr.getZ(b),l=Math.hypot(x,y,z)||1;nr.setXYZ(a,x/l,y/l,z/l);nr.setXYZ(b,x/l,y/l,z/l);}
  /* along the shell's edge the shading continues the shell's (no line where the two meet) */
  for(let i=0;i<=NA;i++){const ii=i%NA;if(!useRim[ii])continue;for(const[j,w] of [[0,1],[1,0.5]]){if(j>N)continue;const k=j*(NA+1)+i;let x=lerp(nr.getX(k),rim.nor[ii*3],w),y=lerp(nr.getY(k),rim.nor[ii*3+1],w),z=lerp(nr.getZ(k),rim.nor[ii*3+2],w);const l=Math.hypot(x,y,z)||1;nr.setXYZ(k,x/l,y/l,z/l);}}
  /* a hidden flap from the shell's edge 1.6 cm up under the shell: when the figure walks the shell and the curtain are
     skinned differently and the seam opened into a dark crack */
  let flap0=g.attributes.position.count;
  if(!window.__noFlap){const P=Array.from(g.attributes.position.array),Nn=Array.from(nr.array),U=Array.from(g.attributes.uv.array),ix=Array.from(g.index.array),top=new Int32Array(NA+1).fill(-1),bot=new Int32Array(NA+1).fill(-1);
    for(let i=0;i<=NA;i++){const ii=i%NA;if(!useRim[ii])continue;const k=i,x=P[k*3],y=P[k*3+1],z=P[k*3+2],th=Math.atan2(z,x);let Rs=ref.at(th,y+0.016);if(Rs<0)Rs=Math.hypot(x,z);shPoint(0,th,y+0.012,Math.max(0.02,Math.min(Rs,Math.hypot(x,z))-0.009),q);
      bot[i]=P.length/3;P.push(x,y,z);Nn.push(rim.nor[ii*3],rim.nor[ii*3+1],rim.nor[ii*3+2]);U.push(U[k*2],U[k*2+1]);reg.push(0);
      top[i]=P.length/3;P.push(q[0],q[1],q[2]);Nn.push(rim.nor[ii*3],rim.nor[ii*3+1],rim.nor[ii*3+2]);U.push(U[k*2],U[k*2+1]+0.012/TILE);reg.push(0);}
    for(let i=0;i<NA;i++){const a=top[i],b=bot[i],a1=top[i+1],b1=bot[i+1];if(a<0||a1<0)continue;if(!flipped)ix.push(a,b,a1,b,b1,a1);else ix.push(a,a1,b,b,a1,b1);}
    g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(Nn,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setIndex(ix);}
  g.userData.reg=reg;g.userData.axis='torso';shTurnEdge(g,null,(a,b)=>(a<=NA&&b<=NA&&useRim[a%NA]&&useRim[b%NA])||(a>=flap0&&b>=flap0));
  const col=new Float32Array(g.attributes.position.count*3).fill(1);g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const m=mk(g,L.mats[0]);m.userData.ctx='none';m.userData.layer=L.name;m.userData.kept=true;
  m.userData.hemAt=th=>{const f=((th+Math.PI)/TAU*NA-0.5+NA)%NA,i=Math.floor(f),u=f-i;return lerp(hem[i%NA],hem[(i+1)%NA],u);};return m;}
/* (unused) the part of a shirt / jacket / coat below the crotch is kept as a tube: it continues the fitted shell exactly
   (same outline at the cut) and hangs straight from there, flaring only as much as the cut asks for */
function shMatchKept(o,L,cut){const g=o.geometry,p=g.attributes.position,n=p.count,NB=128,c=new Float32Array(3),q=new Float32Array(3);
  const ref=L.newG&&L.newG[0];if(!ref||!ref.any)return;
  const tubeTop=new Float32Array(NB).fill(-1),tubeTopY=new Float32Array(NB).fill(-9);
  const used=new Uint8Array(n);if(g.index){const ix=g.index.array;for(let t=0;t<ix.length;t++)used[ix[t]]=1;}else used.fill(1);
  for(let i=0;i<n;i++){if(!used[i])continue;shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);const b=((Math.floor((c[0]/TAU+0.5)*NB)%NB)+NB)%NB;if(c[1]>tubeTopY[b]-0.004){if(c[1]>tubeTopY[b]+0.004)tubeTop[b]=c[2];else tubeTop[b]=Math.max(tubeTop[b],c[2]);tubeTopY[b]=Math.max(tubeTopY[b],c[1]);}}
  const shellR=new Float32Array(NB);for(let b=0;b<NB;b++){const th=(b+0.5)/NB*TAU-Math.PI;let R=ref.at(th,cut+0.01);if(R<0)R=ref.nearest(th,cut+0.01);shellR[b]=R;}
  /* smooth the ratio around the body */
  let ratio=new Float32Array(NB);for(let b=0;b<NB;b++)ratio[b]=tubeTop[b]>0&&shellR[b]>0?clamp((shellR[b]+0.0015)/tubeTop[b],0.5,1.4):1;
  for(let k=0;k<4;k++){const r0=ratio.slice();for(let b=0;b<NB;b++)ratio[b]=(r0[(b+NB-1)%NB]+2*r0[b]+r0[(b+1)%NB])/4;}
  for(let i=0;i<n;i++){shCoord(0,p.getX(i),p.getY(i),p.getZ(i),c,0);const f=(c[0]/TAU+0.5)*NB-0.5,b0=((Math.floor(f)%NB)+NB)%NB,b1=(b0+1)%NB,u=f-Math.floor(f),k=ratio[b0]*(1-u)+ratio[b1]*u;
    shPoint(0,c[0],c[1],c[2]*k,q);p.setXYZ(i,q[0],q[1],q[2]);}
  p.needsUpdate=true;g.computeVertexNormals();}
/* a kept trouser hem (stacked / flared) is wider than the fitted shell above it: at the cut it takes the shell's radius and
   widens to its own over 5 cm, so the join is a smooth flare instead of a step with the shell's edge hanging over it */
function shBlendKept(o,SG,ra,cut){if(!SG||!SG.any)return;const p=o.geometry.attributes.position,c=new Float32Array(3),q=new Float32Array(3);let moved=false;
  for(let i=0;i<p.count;i++){shCoord(ra,p.getX(i),p.getY(i),p.getZ(i),c,0);const y=c[1];if(y<cut-0.05)continue;
    /* (above the cut it follows the shell at its own height: held to the radius 1.2 cm above the cut its top edge stood
       out of a baggy leg's shell as a ledge) */
    const ys=Math.max(y,cut+0.012);let Rs=SG.at(c[0],ys);if(Rs<0)Rs=SG.nearest(c[0],ys);if(Rs<0)continue;
    const w=y>=cut?1:1-smooth((cut-y)/0.05),R=Math.max(0.02,lerp(c[2],Rs-(y>=cut?0.003:0.0015),w));if(R>=c[2]&&y<cut)continue;
    shPoint(ra,c[0],y,R,q);p.setXYZ(i,q[0],q[1],q[2]);moved=true;}
  if(moved){p.needsUpdate=true;o.geometry.computeVertexNormals();}}
/* a kept trouser hem: the texture mapped the way the shell's legs are (around the leg axis and by height), so the weave
   runs on across the cut instead of changing scale there (it drew a line round the shin) */
function shUvKept(o,ra){const g=o.geometry,p=g.attributes.position;if(!g.attributes.uv||!g.index)return;
  const n=p.count,c=new Float32Array(3),TH=new Float32Array(n),Y=new Float32Array(n);
  for(let i=0;i<n;i++){shCoord(ra,p.getX(i),p.getY(i),p.getZ(i),c,0);TH[i]=c[0];Y[i]=c[1];}
  /* triangles across the angle's wrap get their own copies of the vertices on the negative side */
  const ix=Array.from(g.index.array),names=Object.keys(g.attributes),dup=new Map(),extra=[];
  for(let t=0;t<ix.length;t+=3){const a=TH[ix[t]],b=TH[ix[t+1]],d=TH[ix[t+2]];if(Math.max(a,b,d)-Math.min(a,b,d)<Math.PI)continue;
    for(let k=0;k<3;k++){const i=ix[t+k];if(TH[i]>=0)continue;let j=dup.get(i);if(j==null){j=n+extra.length;dup.set(i,j);extra.push(i);}ix[t+k]=j;}}
  const N=n+extra.length,th=new Float32Array(N),yy=new Float32Array(N);th.set(TH);yy.set(Y);extra.forEach((i,k)=>{th[n+k]=TH[i]+Math.PI*2;yy[n+k]=Y[i];});
  if(extra.length)for(const nm of names){const A=g.attributes[nm],sz=A.itemSize,arr=new Float32Array(N*sz);arr.set(A.array.subarray(0,n*sz));
    extra.forEach((i,k)=>{for(let q=0;q<sz;q++)arr[(n+k)*sz+q]=A.array[i*sz+q];});g.setAttribute(nm,new THREE.BufferAttribute(arr,sz,A.normalized));}
  const uv=g.attributes.uv;for(let i=0;i<N;i++)uv.setXY(i,th[i]*0.07/TILE,yy[i]/TILE);uv.needsUpdate=true;
  if(extra.length)g.setIndex(ix);}
/* drop the triangles of a kept pattern tube that sit above a height */
function shKeepBelow(o,y){const g=o.geometry,p=g.attributes.position,m=o.matrixWorld,v=new THREE.Vector3(),ix=g.index.array,keep=[];
  for(let t=0;t<ix.length;t+=3){let hi=-9;for(let k=0;k<3;k++){v.fromBufferAttribute(p,ix[t+k]).applyMatrix4(m);hi=Math.max(hi,v.y);}if(hi<=y)keep.push(ix[t],ix[t+1],ix[t+2]);}
  g.setIndex(keep);}
