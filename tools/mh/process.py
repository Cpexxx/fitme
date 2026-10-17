import json,math,base64,re
import numpy as np
V0=[];F=[];grp=None
for line in open('base.obj'):
    if line.startswith('v '):V0.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('g '):grp=line.split()[1]
    elif line.startswith('f ') and grp=='body':F.append([int(t.split('/')[0])-1 for t in line.split()[1:]])
V0=np.array(V0)
def target(name):
    d=np.zeros_like(V0)
    for line in open(name+'.target'):
        if line.startswith('#') or not line.strip():continue
        p=line.split();d[int(p[0])]=[float(p[1]),float(p[2]),float(p[3])]
    return d
skel=json.load(open('default.mhskel'));J=skel['joints'];B=skel['bones']
W=json.load(open('default_weights.mhw'))['weights']
NV=len(V0)
wl=[[] for _ in range(NV)]
for b,lst in W.items():
    for vid,w in lst:wl[vid].append((b,w))
HEADB=re.compile(r'^(head|jaw|eye|oculi|orbicularis|oris|risorius|temporalis|levator|special|tongue)')
ARMB=re.compile(r'^(upperarm|lowerarm|wrist|finger|metacarpal)')
LEGB=re.compile(r'^(upperleg|lowerleg|foot|toe)')
def side(b):return 1 if b.endswith('.L') else -1 if b.endswith('.R') else 0
def rot(a,b):
    a=a/np.linalg.norm(a);b=b/np.linalg.norm(b);v=np.cross(a,b);c=float(np.dot(a,b));s=np.linalg.norm(v)
    if s<1e-9:return np.eye(3)
    K=np.array([[0,-v[2],v[1]],[v[2],0,-v[0]],[-v[1],v[0],0]]);return np.eye(3)+K+K@K*((1-c)/(s*s))

# ---------- skinning data for runtime poses ----------
GROUPS=['hips','spine','chest','neck','head','clavL','uarmL','farmL','handL','clavR','uarmR','farmR','handR','thighL','shinL','footL','thighR','shinR','footR']
def grp(b):
    sd='L' if b.endswith('.L') else 'R' if b.endswith('.R') else ''
    if b in('root','spine05') or b.startswith('pelvis'):return 'hips'
    if b in('spine04','spine03'):return 'spine'
    if b in('spine02','spine01') or b.startswith('breast'):return 'chest'
    if b.startswith('neck'):return 'neck'
    if b.startswith('clavicle') or b.startswith('shoulder01'):return 'clav'+sd
    if b.startswith('upperarm'):return 'uarm'+sd
    if b.startswith('lowerarm'):return 'farm'+sd
    if re.match(r'^(wrist|finger|metacarpal)',b):return 'hand'+sd
    if b.startswith('upperleg'):return 'thigh'+sd
    if b.startswith('lowerleg'):return 'shin'+sd
    if re.match(r'^(foot|toe)',b):return 'foot'+sd
    return 'head'
PIV={'hips':'root','spine':'spine04','chest':'spine02','neck':'neck01','head':'head'}
for sd in 'LR':PIV.update({'clav'+sd:'clavicle.'+sd,'uarm'+sd:'upperarm01.'+sd,'farm'+sd:'lowerarm01.'+sd,'hand'+sd:'wrist.'+sd,'thigh'+sd:'upperleg01.'+sd,'shin'+sd:'lowerleg01.'+sd,'foot'+sd:'foot.'+sd})

import json as _j
RECIPE=_j.load(open('recipe.json'))
def make(gender,R=None):
    V=V0.copy()
    R=R or RECIPE[gender]
    for n,w in R.items():V+=w*target(n)
    jp=lambda n:V[J[n]].mean(0)
    bh=lambda b:jp(B[b]['head']);bt=lambda b:jp(B[b]['tail'])
    # per-bone affine transforms (R,t): v' = R v + t
    T={}
    for sd,S in (('L',1),('R',-1)):
        Sh=bh('upperarm01.'+sd);El=bh('lowerarm01.'+sd);Wr=bh('wrist.'+sd)
        R1=rot(El-Sh,np.array([S*math.sin(math.radians(8.5)),-math.cos(math.radians(8.5)),-0.02]))
        f1=lambda v,R1=R1,Sh=Sh:R1@(v-Sh)+Sh
        El1=f1(El);Wr1=f1(Wr)
        R2=rot(Wr1-El1,np.array([S*0.045,-1,0.24]))
        Rh=R2@R1;th=R2@(Sh-R1@Sh-El1)+El1  # combined forearm transform: v-> R2(R1(v-Sh)+Sh-El1)+El1
        Rs=rot(np.array([1,0,0]),np.array([1,0,0]))
        half=rot(El-Sh,(El-Sh)+(R1@(El-Sh)-(El-Sh))*0.45)
        for b in B:
            if not b.endswith('.'+sd):continue
            if b.startswith('upperarm'):T[b]=(R1,Sh-R1@Sh)
            elif re.match(r'^(lowerarm|wrist|finger|metacarpal)',b):T[b]=(Rh,th)
            elif b.startswith('shoulder01'):T[b]=(half,Sh-half@Sh)
        Hp=bh('upperleg01.'+sd);Ft=bh('foot.'+sd)
        R3=rot(Ft-Hp,np.array([S*0.012,-1,0.0]))
        for b in B:
            if b.endswith('.'+sd) and LEGB.match(b):T[b]=(R3,Hp-R3@Hp)
    P=np.zeros_like(V)
    for i in range(NV):
        if not wl[i]:P[i]=V[i];continue
        tw=sum(w for _,w in wl[i]);acc=np.zeros(3)
        for b,w in wl[i]:
            if b in T:R,t=T[b];acc+=w*(R@V[i]+t)
            else:acc+=w*V[i]
        P[i]=acc/tw
    def jpos(n,b):
        p=V[J[n]].mean(0)
        if b in T:R,t=T[b];p=R@p+t
        return p
    joints={}
    for sd in 'LR':
        joints['sh'+sd]=jpos(B['upperarm01.'+sd]['head'],'upperarm01.'+sd)
        joints['el'+sd]=jpos(B['lowerarm01.'+sd]['head'],'lowerarm01.'+sd)
        joints['wr'+sd]=jpos(B['wrist.'+sd]['head'],'wrist.'+sd)
        joints['hand'+sd]=jpos(B['wrist.'+sd]['tail'],'wrist.'+sd)
        joints['hip'+sd]=jpos(B['upperleg01.'+sd]['head'],'upperleg01.'+sd)
        joints['knee'+sd]=jpos(B['lowerleg01.'+sd]['head'],'lowerleg01.'+sd)
        joints['ank'+sd]=jpos(B['foot.'+sd]['head'],'foot.'+sd)
        for f in range(1,6):
            for k in (1,2):
                bn='finger%d-%d.%s'%(f,k,sd);joints['f%d%d%s'%(f,k,sd)]=jpos(B[bn]['head'],bn);joints['f%d%dt%s'%(f,k,sd)]=jpos(B[bn]['tail'],bn)
    joints['neck']=V[J[B['neck01']['head']]].mean(0);joints['headJ']=V[J[B['head']['head']]].mean(0)
    hw=np.array([sum(w for b,w in wl[i] if HEADB.match(b))/max(1e-9,sum(w for _,w in wl[i])) for i in range(NV)])
    piv={}
    for g2,b in PIV.items():
        p=V[J[B[b]['head']]].mean(0)
        if b in T:R_,t_=T[b];p=R_@p+t_
        piv[g2]=p
    return P,joints,hw,piv
out={}
G2={'m':'male','f':'female'}
def variant(g,mus,wt,extra):
    R=dict(RECIPE[g]);gg=G2[g]
    for k in list(R):
        if k.startswith('universal-') or k.endswith('idealproportions'):del R[k]
    R['universal-%s-young-%s-%s'%(gg,mus,wt)]=1.0
    R['%s-young-%s-%s-idealproportions'%(gg,mus,wt)]=1.0
    for k,v in extra.items():R[k]=R.get(k,0)+v
    return R
VARS={'m':{'mp':('maxmuscle','averageweight',{'torso-vshape-incr':0.3,'measure-shoulder-dist-incr':0.2,'torso-muscle-pectoral-incr':0.25,'torso-muscle-dorsi-incr':0.3,'measure-upperarm-circ-incr':0.28,'l-upperarm-shoulder-muscle-incr':0.3,'r-upperarm-shoulder-muscle-incr':0.3,'measure-thigh-circ-incr':0.25,'measure-calf-circ-incr':0.2,'measure-neck-circ-incr':0.35,'measure-waist-circ-decr':0.2}),
           # bodybuilder: the lean most muscular macro with the big muscle groups pushed further (blended in past muscle 1.0)
           'mx':('maxmuscle','averageweight',{'torso-vshape-incr':0.7,'measure-shoulder-dist-incr':0.4,'torso-muscle-pectoral-incr':1.0,'torso-muscle-dorsi-incr':1.0,'measure-upperarm-circ-incr':0.95,'l-upperarm-shoulder-muscle-incr':1.0,'r-upperarm-shoulder-muscle-incr':1.0,'l-upperleg-muscle-incr':0.8,'r-upperleg-muscle-incr':0.8,'l-lowerleg-muscle-incr':0.7,'r-lowerleg-muscle-incr':0.7,'measure-thigh-circ-incr':0.6,'measure-calf-circ-incr':0.5,'measure-neck-circ-incr':0.85,'measure-waist-circ-decr':0.25}),
           'mn':('minmuscle','averageweight',{}),'wp':('averagemuscle','maxweight',{'measure-waist-circ-incr':0.75,'stomach-pregnant-incr':0.3,'measure-hips-circ-incr':0.3,'measure-thigh-circ-incr':0.45,'l-upperarm-fat-incr':0.6,'r-upperarm-fat-incr':0.6,'measure-neck-circ-incr':0.6,'buttocks-volume-incr':0.3,'measure-bust-circ-incr':0.3}),
           'wn':('averagemuscle','minweight',{'measure-waist-circ-decr':0.35,'measure-thigh-circ-decr':0.25,'measure-upperarm-circ-decr':0.2})},
      'f':{'mp':('maxmuscle','averageweight',{'measure-upperarm-circ-incr':0.25,'measure-thigh-circ-incr':0.2,'measure-calf-circ-incr':0.25,'torso-muscle-dorsi-incr':0.2,'measure-shoulder-dist-incr':0.15}),
           'mx':('maxmuscle','averageweight',{'torso-muscle-dorsi-incr':0.4,'torso-muscle-pectoral-incr':0.3,'measure-upperarm-circ-incr':0.4,'l-upperarm-shoulder-muscle-incr':0.5,'r-upperarm-shoulder-muscle-incr':0.5,'l-upperleg-muscle-incr':0.4,'r-upperleg-muscle-incr':0.4,'measure-thigh-circ-incr':0.3,'measure-calf-circ-incr':0.3,'measure-shoulder-dist-incr':0.2}),
           'mn':('minmuscle','averageweight',{}),'wp':('averagemuscle','maxweight',{'measure-waist-circ-incr':0.7,'stomach-pregnant-incr':0.22,'measure-hips-circ-incr':0.45,'measure-thigh-circ-incr':0.5,'l-upperarm-fat-incr':0.6,'r-upperarm-fat-incr':0.6,'measure-neck-circ-incr':0.4,'buttocks-volume-incr':0.45,'measure-bust-circ-incr':0.35}),
           'wn':('averagemuscle','minweight',{'measure-waist-circ-decr':0.25,'measure-thigh-circ-decr':0.25,'measure-upperarm-circ-decr':0.2,'measure-hips-circ-decr':0.15})}}
for g in 'mf':
    P,joints,hw,piv=make(g)
    body=sorted(set(i for f in F for i in f))
    keepF=[f for f in F if np.mean(hw[f])<0.5]
    headV=[i for i in body if hw[i]>0.95]
    ys=P[body,1];feet=ys.min()
    hv=P[headV];top=hv[:,1].max()
    # head ellipsoid from cranium (ignore ears/nose): x extent at forehead level, depth front/back
    hc_y=(top+hv[:,1].min())/2
    band=hv[np.abs(hv[:,1]-(hc_y+0.25*(top-hc_y)))<0.25]
    rx=np.percentile(np.abs(band[:,0]),97);zf=np.percentile(band[:,2],98);zb=-np.percentile(band[:,2],2)
    zc=(zf-zb)/2
    sc=1.80/(top-feet)  # nominal: top of head 1.80
    zoff=-joints['hipL'][2]
    def T3(p):return [float(p[0]*sc),float((p[1]-feet)*sc),float((p[2]+zoff)*sc)]
    used=sorted(set(i for f in keepF for i in f));remap={v:k for k,v in enumerate(used)}
    pos=np.array([T3(P[i]) for i in used])
    q=np.round(pos*10000).astype(np.int16)
    out[g]={'pos':base64.b64encode(q.tobytes()).decode(),
        'joints':{k:T3(v) for k,v in joints.items()},
        'head':{'c':T3(np.array([0,hc_y,zc])),'rx':float(rx*sc),'ry':float((top-hc_y)*sc),'zf':float((zf-zc)*sc),'zb':float((zb+zc)*sc)}}
    if g=='m':
        idx=[]
        for f in keepF:a,b,c,d=[remap[i] for i in f];idx+= [a,b,c,a,c,d]
        lab=[];fw=[];aw=[];lw=[]
        for i in used:
            gw={0:0,1:0,2:0,3:0,4:0};ftw=0;tw=0
            for b,w in wl[i]:
                tw+=w;s=side(b)
                if ARMB.match(b):gw[1 if s>0 else 2]+=w
                elif LEGB.match(b):gw[3 if s>0 else 4]+=w
                else:gw[0]+=w
                if re.match(r'^(foot|toe)',b):ftw+=w
            lab.append(max(gw,key=gw.get));aw.append(int(round(255*(gw[1]+gw[2])/max(tw,1e-9))));lw.append(int(round(255*(gw[3]+gw[4])/max(tw,1e-9))));fw.append(int(round(255*ftw/max(tw,1e-9))))
        out['index']=base64.b64encode(np.array(idx,dtype=np.uint16).tobytes()).decode()
        out['label']=base64.b64encode(np.array(lab,dtype=np.uint8).tobytes()).decode()
        out['footw']=base64.b64encode(np.array(fw,dtype=np.uint8).tobytes()).decode()
        gi={n:k for k,n in enumerate(GROUPS)};SI=[];SW=[]
        for i in used:
            acc={}
            for b,w in wl[i]:acc[grp(b)]=acc.get(grp(b),0)+w
            tp=sorted(acc.items(),key=lambda x:-x[1])[:4];tw=sum(w for _,w in tp) or 1
            ws=[int(round(255*w/tw)) for _,w in tp];
            if ws:ws[0]+=255-sum(ws)
            ii=[gi[n] for n,_ in tp]
            while len(ii)<4:ii.append(0);ws.append(0)
            SI+=ii;SW+=ws
        out['skinI']=base64.b64encode(np.array(SI,dtype=np.uint8).tobytes()).decode()
        out['skinW']=base64.b64encode(np.array(SW,dtype=np.uint8).tobytes()).decode()
        out['groups']=GROUPS
        out['nv']=len(used);out['armw']=base64.b64encode(np.array(aw,dtype=np.uint8).tobytes()).decode();out['legw']=base64.b64encode(np.array(lw,dtype=np.uint8).tobytes()).decode()
    usedA=np.array(used);PU=P[usedA]
    anch={}
    for g2,p in piv.items():
        d=np.linalg.norm(PU-p,axis=1);r=0.05 if g2 not in('hips','spine','chest') else 0.07
        ids=np.where(d<r)[0]
        if len(ids)<6:ids=np.argsort(d)[:12]
        c=PU[ids].mean(0);off=(p-c)*sc
        anch[g2]={'ids':[int(i) for i in ids],'off':[float(x) for x in off]}
    out[g]['anch']=anch
    dl={};dj={}
    for key,(mus,wt,ex) in VARS[g].items():
        Pv,jv,_,_=make(g,variant(g,mus,wt,ex))
        d=(Pv[usedA]-PU)*sc
        dl[key]=base64.b64encode(np.round(np.clip(d,-3.2,3.2)*10000).astype(np.int16).tobytes()).decode()
        dj[key]={k:[float(x) for x in (np.array(jv[k])-np.array(joints[k]))*sc] for k in joints}
        print(g,key,'max delta',float(np.abs(d).max()))
    out[g]['delta']=dl;out[g]['djoints']=dj
    print(g,'verts',len(used),'faces',len(keepF),'scale',sc,'height dm',top-feet,'head',out[g]['head'])
js='/* MakeHuman base mesh (CC0, makehumancommunity.org), morphed, posed and with the face removed for Fitme */\nconst MH_DATA='+json.dumps(out,separators=(',',':'))+';\n'
open('mhdata.js','w').write(js);print(len(js))
