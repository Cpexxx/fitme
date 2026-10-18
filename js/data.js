'use strict';
/* =============== Fitme: dane — kolory, taksonomia, presety =============== */
const PAL={
  basic:[['#f4f1ea','biały'],['#e9e2d2','kremowy'],['#d9c7a7','beżowy'],['#b8996f','camel'],['#8a8170','taupe'],['#a3a3a5','szary melanż'],['#5b5d61','grafitowy'],['#1e1e1f','czarny'],
    ['#26304a','granatowy'],['#4b6a8f','niebieski'],['#a9bfd2','błękitny'],['#5c5f3a','oliwkowy'],['#8b9a78','szałwiowy'],['#2f4a3a','butelkowa zieleń'],['#7a3b2e','bordowy'],
    ['#b04a32','ceglasty'],['#c9a34a','musztardowy'],['#4a3527','czekoladowy'],['#e9d3d6','pudrowy róż'],['#c46a86','malinowy'],['#6b4f7a','śliwkowy'],['#c8382b','czerwony']],
  denim:[['#1a2340','raw indigo'],['#24345a','ciemny'],['#3e5a86','średni'],['#6f8fb8','jasny'],['#a7bfd9','bardzo jasny'],['#242426','czarny'],['#55575c','sprany czarny'],['#7a7d82','szary'],['#e8e0cc','ecru'],['#c8b591','piaskowy']],
  leather:[['#1b1a19','czarna'],['#3e2a20','ciemny brąz'],['#5a3a24','brązowa'],['#8f5a2e','koniakowa'],['#b58a5a','tan'],['#6d2a26','burgund'],['#e8e2d6','kremowa'],['#55583a','oliwkowa']],
  shoe:[['#f3f1ec','białe'],['#1b1a19','czarne'],['#e6dcc6','kremowe'],['#6a4528','brązowe'],['#8f5a2e','koniakowe'],['#b58a5a','tan'],['#8a8a8a','szare'],['#23293b','granatowe'],
    ['#55583a','oliwkowe'],['#8c2a24','czerwone'],['#6d2a26','burgund'],['#c9b9a0','piaskowe'],['#a9bfd2','błękitne'],['#e9d3d6','różowe']],
  sole:[['#f2efe8','biała'],['#e5d9bf','kremowa'],['#c49a62','gumowa'],['#1d1c1b','czarna'],['#3e2a20','brązowa'],['#8a8a8a','szara']],
  hair:[['#141110','czarne'],['#2a1d16','bardzo ciemny brąz'],['#3d2a1e','ciemny brąz'],['#5c3e28','brąz'],['#7a4a2a','kasztan'],['#9c5a2c','miedź'],['#b0632f','rude'],
    ['#a07a4f','ciemny blond'],['#c9a26b','blond'],['#e2c98f','złoty blond'],['#ece3cf','platyna'],['#9a9894','siwe'],['#d9d6d0','białe'],['#4a2a5c','fiolet'],['#2b4a6e','granat'],['#c86a8a','róż']],
  lens:[['#151515','czarne'],['#4a3220','brązowe'],['#2f4a3a','zielone'],['#7a2a2a','czerwone'],['#d6b44a','żółte'],['#9fb6cc','niebieskie'],['#e9eef2','przezroczyste']],
  frame:[['#1b1a19','czarne'],['#5a3a24','szylkret'],['#e8e2d6','kremowe'],['#c9a34a','złote'],['#c0c3c7','srebrne'],['#8c2a24','czerwone'],['#f4f1ea','białe']]
};
const SKINS=[['#f6dccb','Porcelanowa'],['#efcfb5','Jasna'],['#e3b896','Jasnobeżowa'],['#d6a47f','Beżowa'],['#c49a6c','Oliwkowa'],['#b57d55','Miodowa'],['#9c6641','Karmelowa'],
  ['#7d4f31','Brązowa'],['#5e3a24','Ciemna'],['#43291a','Głęboka'],['#ece3d4','Kremowy manekin'],['#cdb48c','Camelowy manekin'],['#8e877f','Szary manekin'],['#2c2824','Czarny manekin'],['#f5f4f0','Biały manekin']];
const FINISHES={fabric:'Tkanina (manekin krawiecki)',soft:'Matowa, gładka',gloss:'Satynowa'};
const METALS={silver:{label:'Srebro',c:'#dfe2e6',r:.1,m:1},gold:{label:'Złoto',c:'#e6bb5c',r:.12,m:1},rose:{label:'Różowe złoto',c:'#e2a892',r:.12,m:1},steel:{label:'Stal',c:'#b4b8bc',r:.26,m:1},black:{label:'Czarny',c:'#2b2a29',r:.28,m:.85}};
const PATTERNS={solid:'Gładki',paisley:'Paisley',breton:'Paski poziome',pinstripe:'Prążki',gingham:'Vichy',tartan:'Krata szkocka',buffalo:'Krata flanelowa',houndstooth:'Pepitka',camo:'Moro',dots:'Groszki',heather:'Melanż'};
const MATS={denim:'Denim',twill:'Diagonal',gabardine:'Gabardyna',canvas:'Płótno',linen:'Len',jersey:'Dzianina',pique:'Pika',rib:'Prążek',waffle:'Wafel',fleece:'Dresówka',pile:'Polar',
  oxford:'Oxford',poplin:'Popelina',flannel:'Flanela',knit:'Dzianina swetrowa',cable:'Warkocz',wool:'Wełna',cord:'Sztruks',nylon:'Nylon',satin:'Satyna',tricot:'Trykot',
  leather:'Skóra',suede:'Zamsz',velvet:'Aksamit',mesh:'Siatka'};
const PRINTS={none:'Brak',logo:'Logo na piersi',text:'Napis',star:'Gwiazda',cross:'Krzyż',flames:'Płomienie',number:'Numer'};

/* =============== fits =============== */
const TOP_FITS={
  slim:{label:'Slim',e:0.008,se:0.007},regular:{label:'Regular',e:0.02,se:0.014},
  oversized:{label:'Oversized',e:0.048,se:0.032,hem:-0.06,sleeveAdd:0.08,drop:0.03,tags:['streetwear']},
  boxy:{label:'Boxy crop',e:0.042,se:0.028,hem:0.13,tags:['y2k','streetwear']}
};
const OUTER_FITS={regular:{label:'Regular',m:1,hem:0},oversized:{label:'Oversized',m:1.5,hem:-0.05,drop:0.03,tags:['streetwear']},cropped:{label:'Cropped',m:1.1,hem:0.08,tags:['y2k']}};
const PANTS_FITS={
  skinny:{label:'Skinny',e:0.005,tags:['rock','indie']},slim:{label:'Slim',e:0.012,tags:['smart casual']},
  straight:{label:'Straight',k:[0.1,0.074,0.072]},tapered:{label:'Tapered',k:[0.104,0.068,0.056],tags:['smart casual']},
  relaxed:{label:'Relaxed',k:[0.11,0.086,0.083],hip:0.006,tags:['casual']},bootcut:{label:'Bootcut',k:[0.098,0.068,0.092],tags:['70s','americana']},
  flared:{label:'Flared',k:[0.095,0.066,0.122],tags:['y2k','70s']},wide:{label:'Wide leg',k:[0.12,0.112,0.122],hip:0.012,tags:['minimal','old money']},
  baggy:{label:'Baggy',k:[0.13,0.116,0.11],hip:0.022,tags:['streetwear','skate']},balloon:{label:'Balloon',k:[0.11,0.13,0.066],hip:0.014,tags:['avant-garde','streetwear']},
  barrel:{label:'Barrel',k:[0.108,0.124,0.078],hip:0.01,tags:['minimal','avant-garde']}
};
const PANTS_LEN={full:{label:'Pełna',hem:0.045},cropped:{label:'Za kostkę',hem:0.13},cuffed:{label:'Z mankietem',hem:0.07,cuff:true},stacked:{label:'Stacked',hem:0.03,stack:true},
  jogger:{label:'Ze ściągaczem',hem:0.065,jogger:true},bermuda:{label:'Bermudy',hem:0.47,summer:1.5},shorts:{label:'Szorty',hem:0.575,summer:2},mini:{label:'Krótkie szorty',hem:0.68,summer:2.4}};
const SKIRT_FITS={pencil:{label:'Ołówkowa',flare:0.012,tags:['minimal','office']},aline:{label:'Linia A',flare:0.085,tags:['retro','preppy']},
  pleated:{label:'Plisowana',flare:0.075,pleat:true,tags:['preppy','coquette']},slip:{label:'Skośna',flare:0.04,drape:true,tags:['minimal','90s']}};
const SKIRT_LEN={mini:{label:'Mini',hem:0.66,summer:1},knee:{label:'Do kolan',hem:0.49},midi:{label:'Midi',hem:0.31},maxi:{label:'Maxi',hem:0.07}};
const RISES={low:{label:'Niski',y:0.955,tags:['y2k']},mid:{label:'Średni',y:1.0},high:{label:'Wysoki',y:1.065,tags:['retro']}};
const TUCKS={out:'Na wierzch',in:'Wpuszczona',front:'Wpuszczona z przodu'};
const NECKS={crew:'Okrągły',v:'W serek',henley:'Henley',scoop:'Głęboki',straight:'Prosty',sweetheart:'Serduszko',turtle:'Golf',hood:'Kaptur'};
const SLEEVES={short:'Krótkie',long:'Długie',rolled:'Podwinięte',none:'Bez rękawów'};
const CLOSES={closed:'Zapięta',half:'Do połowy',open:'Rozpięta'};

/* =============== garments =============== */
const TOPS={
  none:{label:'Brak',fits:['regular'],sleeves:['short']},
  tee:{label:'T-shirt',mat:'jersey',mats:['jersey','pique','waffle','linen'],sleeves:['short'],necks:['crew','v'],fits:['slim','regular','oversized','boxy'],tuck:1,print:1,tags:['casual','minimal'],summer:.6},
  longsleeve:{label:'Longsleeve',mat:'jersey',mats:['jersey','waffle','rib'],sleeves:['long'],necks:['crew','v'],fits:['slim','regular','oversized'],tuck:1,print:1,tags:['casual'],winter:.3},
  henley:{label:'Henley',mat:'waffle',mats:['waffle','jersey','rib'],sleeves:['long','short'],necks:['henley'],buttons:3,fits:['slim','regular'],tuck:1,tags:['heritage','workwear'],winter:.3},
  polo:{label:'Polo',mat:'pique',mats:['pique','knit','jersey'],sleeves:['short','long'],collar:'polo',buttons:2,placket:'short',fits:['slim','regular','oversized'],tuck:1,tags:['preppy','old money'],summer:.5},
  rugby:{label:'Rugby',mat:'jersey',sleeves:['long'],collar:'polo',collar2:1,buttons:2,placket:'short',fits:['regular','oversized'],defPat:'breton',tuck:1,tags:['preppy','blokecore'],winter:.4},
  shirt:{label:'Koszula',mat:'oxford',mats:['oxford','poplin','linen','denim','flannel','cord','satin'],sleeves:['long','rolled'],collar:'shirt',buttons:7,placket:'full',chestPocket:1,cuffs:1,yoke:1,tail:1,fits:['slim','regular','oversized'],tuck:1,tags:['old money','smart casual']},
  camp:{label:'Koszula hawajska',mat:'poplin',mats:['poplin','linen','satin'],sleeves:['short'],collar:'camp',buttons:5,placket:'full',fits:['regular','oversized','boxy'],tuck:1,tags:['riviera','casual'],summer:1},
  flannel:{label:'Flanela',mat:'flannel',mats:['flannel','cord','wool'],sleeves:['long','rolled'],collar:'shirt',buttons:7,placket:'full',flapPockets:1,cuffs:1,yoke:1,tail:1,defPat:'buffalo',fits:['regular','oversized'],tuck:1,tags:['workwear','grunge'],winter:.5},
  tank:{label:'Tank top',mat:'rib',mats:['rib','jersey','satin','mesh'],sleeves:['none'],necks:['scoop'],strap:0.032,fits:['slim','regular','oversized'],tuck:1,tags:['casual','y2k'],summer:1.5},
  cami:{label:'Top na ramiączkach',mat:'satin',mats:['satin','rib','jersey','velvet'],sleeves:['none'],necks:['straight'],strap:0.006,fits:['slim','regular'],tuck:1,tags:['y2k','feminine'],summer:1.4},
  corset:{label:'Gorset',mat:'satin',mats:['satin','velvet','denim','leather'],sleeves:['none'],necks:['sweetheart'],strap:0,boning:1,fits:['slim'],tags:['coquette','gothic luxe']},
  turtle:{label:'Golf',mat:'knit',mats:['knit','rib','jersey','cable'],sleeves:['long'],necks:['turtle'],fits:['slim','regular','oversized'],tuck:1,tags:['minimal','old money'],winter:1},
  crewneck:{label:'Bluza',mat:'fleece',sleeves:['long'],necks:['crew'],rib:1,print:1,fits:['regular','oversized','boxy'],tags:['casual','minimal'],winter:.7},
  hoodie:{label:'Hoodie',mat:'fleece',sleeves:['long'],necks:['hood'],rib:1,kangaroo:1,print:1,fits:['regular','oversized','boxy'],tags:['streetwear','athleisure'],winter:.7},
  sweater:{label:'Sweter',mat:'cable',mats:['cable','knit','pile'],sleeves:['long'],necks:['crew','v','turtle'],rib:1,fits:['regular','oversized'],tags:['old money','heritage'],winter:1.2},
  jersey:{label:'Koszulka sportowa',mat:'mesh',mats:['mesh','jersey'],sleeves:['short','long'],necks:['v','crew'],trim:1,print:1,defPrint:'number',fits:['regular','oversized'],tags:['blokecore','sport'],summer:.5},
  blouse:{label:'Bluzka',mat:'satin',mats:['satin','poplin','linen'],sleeves:['long','short'],necks:['v','crew'],fits:['regular','oversized'],tuck:1,tags:['feminine','office']}
};
const OUTERS={
  none:{label:'Brak'},
  bomber:{label:'Bomber',mat:'nylon',mats:['nylon','satin','suede','leather','wool'],hem:.94,e:.045,se:.04,closure:'zip',collar:'rib',cuff:'rib',band:'rib',lining:'#d9772e',sleevePocket:1,pockets:'welt',fits:['regular','oversized','cropped'],tags:['streetwear','military'],winter:.8},
  varsity:{label:'Varsity',mat:'wool',mats:['wool','fleece','nylon'],hem:.94,e:.042,se:.038,closure:'snap',collar:'rib',cuff:'rib',band:'rib',ribStripe:1,sleeves2:1,patch:1,pockets:'welt',def2:'#e9e2d2',fits:['regular','oversized'],tags:['preppy','streetwear'],winter:.8},
  trucker:{label:'Kurtka jeansowa',mat:'denim',mats:['denim','cord','suede'],hem:.95,e:.036,se:.03,closure:'button',collar:'shirt',cuff:'button',band:'waist',chestFlaps:1,pockets:'slant',fits:['regular','oversized','cropped'],tags:['workwear','americana']},
  chore:{label:'Kurtka robocza',mat:'canvas',mats:['canvas','cord','denim'],hem:.85,e:.036,se:.03,closure:'button',collar:'shirt',cuff:'button',pockets:'patch3',fits:['regular','oversized'],tags:['workwear','heritage']},
  harrington:{label:'Harrington',mat:'twill',mats:['twill','nylon','suede'],hem:.93,e:.036,se:.032,closure:'zip',collar:'stand',cuff:'rib',band:'rib',lining:'tartan',pockets:'flap',fits:['regular','cropped'],tags:['mod','heritage']},
  coach:{label:'Coach jacket',mat:'nylon',hem:.89,e:.045,se:.04,closure:'snap',collar:'shirt',band:'cord',pockets:'slant',fits:['regular','oversized'],tags:['streetwear','skate']},
  track:{label:'Bluza dresowa',mat:'tricot',mats:['tricot','fleece','nylon'],hem:.92,e:.03,se:.026,closure:'zip',collar:'stand',cuff:'rib',band:'rib',stripes:1,pockets:'slant',def2:'#f4f1ea',fits:['regular','oversized'],tags:['athleisure','blokecore']},
  ziphood:{label:'Bluza rozpinana',mat:'fleece',mats:['fleece','pile','knit'],hem:.89,e:.034,se:.028,closure:'zip',collar:'hood',cuff:'rib',band:'rib',pockets:'kangaroo',fits:['regular','oversized','cropped'],tags:['streetwear','athleisure'],winter:.6},
  fleece:{label:'Polar',mat:'pile',mats:['pile','fleece'],hem:.88,e:.04,se:.034,closure:'zip',collar:'stand',band:'bind',chestPatch:1,pockets:'slant',def2:'#26304a',fits:['regular','oversized'],tags:['gorpcore','outdoor'],winter:1},
  windbreaker:{label:'Wiatrówka',mat:'nylon',hem:.89,e:.05,se:.044,closure:'zip',collar:'hood',band:'cord',colorblock:1,pockets:'slant',def2:'#26304a',fits:['regular','oversized'],tags:['gorpcore','90s']},
  puffer:{label:'Puffer',mat:'nylon',mats:['nylon','satin'],hem:.86,e:.05,se:.042,closure:'zip',collar:'standTall',quilt:1,band:'bind',pockets:'slant',fits:['regular','oversized','cropped'],tags:['gorpcore','streetwear'],winter:2.2},
  puffervest:{label:'Bezrękawnik',mat:'nylon',mats:['nylon','pile','satin'],hem:.88,e:.03,closure:'zip',collar:'stand',quilt:1,sleeveless:1,band:'bind',pockets:'slant',fits:['regular','oversized'],tags:['gorpcore','old money'],winter:.8},
  parka:{label:'Parka',mat:'twill',mats:['twill','nylon','canvas'],hem:.66,e:.05,se:.04,closure:'zip',storm:1,collar:'hood',band:'plain',drawWaist:1,pockets:'flap',fits:['regular','oversized'],tags:['military','gorpcore'],winter:2},
  blazer:{label:'Marynarka',mat:'wool',mats:['wool','linen','cord','velvet','gabardine'],hem:.77,e:.028,se:.024,closure:'button',buttons:2,collar:'notch',lapel:1,yb:1.11,structured:1,pockets:'flapHip',chestWelt:1,cuffButtons:1,lining:'#6b4f7a',fits:['regular','oversized'],tags:['smart casual','old money','office']},
  overcoat:{label:'Płaszcz',mat:'wool',mats:['wool','cord','velvet'],hem:.42,e:.04,se:.032,flare:.05,closure:'button',buttons:3,collar:'notch',lapel:1,yb:1.17,pockets:'flapHip',lining:'#4a3527',fits:['regular','oversized'],tags:['old money','minimal'],winter:2},
  trench:{label:'Trencz',mat:'gabardine',mats:['gabardine','leather','suede'],hem:.4,e:.042,se:.034,flare:.07,closure:'double',buttons:3,collar:'peak',lapel:1,yb:1.24,belt:1,epaulettes:1,pockets:'slant',lining:'tartan',fits:['regular','oversized'],tags:['old money','classic'],winter:1},
  biker:{label:'Ramoneska',mat:'leather',mats:['leather','suede','denim'],hem:.95,e:.032,se:.028,closure:'zipAsym',collar:'notch',lapel:1,yb:1.3,beltWaist:1,cuff:'zip',pockets:'zip',fits:['regular','oversized','cropped'],tags:['rock','gothic luxe'],winter:.6},
  racer:{label:'Kurtka skórzana',mat:'leather',mats:['leather','suede'],hem:.93,e:.03,se:.026,closure:'zip',collar:'standLow',cuff:'zip',pockets:'zip',fits:['regular','cropped'],tags:['rock','minimal'],winter:.6},
  cardigan:{label:'Kardigan',mat:'knit',mats:['knit','cable','pile'],hem:.88,e:.03,se:.026,closure:'button',buttons:5,collar:'vrib',vb:1.13,band:'rib',cuff:'rib',pockets:'patch2',fits:['regular','oversized','cropped'],tags:['preppy','grandpa'],winter:.8},
  overshirt:{label:'Koszula wierzchnia',mat:'flannel',mats:['flannel','cord','canvas','wool'],hem:.85,e:.03,se:.026,closure:'button',collar:'shirt',cuff:'button',chestFlaps:1,defPat:'tartan',fits:['regular','oversized'],tags:['workwear','grunge'],winter:.5},
  sweatervest:{label:'Kamizelka swetrowa',mat:'knit',mats:['knit','cable'],hem:.93,e:.012,closure:'none',collar:'vrib',vb:1.2,sleeveless:1,band:'rib',fits:['regular','oversized'],tags:['preppy','old money']}
};
const BOTTOMS={
  none:{label:'Brak',fits:['straight'],lens:['full']},
  jeans:{label:'Jeansy',mat:'denim',mats:['denim','cord'],pal:'denim',fits:Object.keys(PANTS_FITS),lens:['full','cropped','cuffed','stacked','bermuda','shorts','mini'],jeans:1,belt:1,rips:1,tags:['casual','americana']},
  chino:{label:'Chinosy',mat:'twill',mats:['twill','linen','cord'],fits:['slim','straight','tapered','relaxed','wide'],lens:['full','cropped','cuffed','bermuda','shorts'],slant:1,welt:1,pleats:1,belt:1,tags:['smart casual','preppy']},
  linen:{label:'Lniane',mat:'linen',fits:['straight','relaxed','wide','baggy'],lens:['full','cropped','bermuda','shorts'],slant:1,strings:1,pleats:1,belt:1,tags:['old money','riviera'],summer:1.5},
  cargo:{label:'Cargo',mat:'twill',mats:['twill','canvas','nylon','cord'],fits:['slim','straight','relaxed','baggy','wide','balloon'],lens:['full','stacked','jogger','bermuda','shorts'],slant:1,cargo:1,belt:1,tags:['gorpcore','streetwear','workwear']},
  carpenter:{label:'Spodnie robocze',mat:'canvas',mats:['canvas','denim','cord'],fits:['straight','relaxed','baggy','wide'],lens:['full','stacked','bermuda','shorts'],jeansFront:1,carpenter:1,belt:1,tags:['workwear','skate']},
  parachute:{label:'Spadochrony',mat:'nylon',fits:['relaxed','baggy','wide','balloon'],lens:['full','stacked','jogger'],parachute:1,strings:1,elastic:1,tags:['y2k','streetwear']},
  sweat:{label:'Dresy',mat:'fleece',fits:['slim','straight','relaxed','baggy','wide'],lens:['full','jogger','stacked','shorts'],strings:1,elastic:1,stripesOpt:1,tags:['athleisure','streetwear']},
  track:{label:'Spodnie z lampasami',mat:'tricot',mats:['tricot','nylon','fleece'],fits:['straight','relaxed','wide','baggy'],lens:['full','jogger','stacked'],strings:1,elastic:1,stripes:1,def2:'#f4f1ea',tags:['athleisure','blokecore']},
  suit:{label:'Garniturowe',mat:'wool',mats:['wool','linen','gabardine','cord'],fits:['slim','straight','tapered','wide','flared'],lens:['full','cropped'],crease:1,slant:1,welt:1,pleats:1,belt:1,tags:['old money','minimal','formal'],winter:.3},
  cord:{label:'Sztruksy',mat:'cord',fits:['straight','relaxed','bootcut','flared','wide'],lens:['full','cuffed','bermuda','shorts'],jeansFront:1,belt:1,tags:['70s','workwear','preppy'],winter:.6},
  leggings:{label:'Legginsy',mat:'jersey',mats:['jersey','leather','rib'],fits:['skinny'],lens:['full','cropped','shorts'],elastic:1,tight:1,tags:['athleisure']},
  sportshorts:{label:'Szorty sportowe',mat:'mesh',mats:['mesh','nylon','fleece'],fits:['relaxed','wide'],lens:['shorts','mini'],elastic:1,strings:1,stripes:1,def2:'#f4f1ea',tags:['sport','blokecore'],summer:2},
  skirt:{label:'Spódnica',skirt:1,mat:'twill',mats:['twill','wool','leather','cord','linen','suede'],fits:['pencil','aline'],lens:Object.keys(SKIRT_LEN),belt:1,tags:['feminine']},
  pleated:{label:'Spódnica plisowana',skirt:1,mat:'wool',mats:['wool','satin','twill'],fits:['pleated'],lens:Object.keys(SKIRT_LEN),tags:['preppy','coquette']},
  slip:{label:'Spódnica satynowa',skirt:1,mat:'satin',mats:['satin','velvet'],fits:['slip'],lens:['knee','midi','maxi'],tags:['minimal','90s']},
  denimskirt:{label:'Spódnica jeansowa',skirt:1,mat:'denim',pal:'denim',fits:['pencil','aline'],lens:Object.keys(SKIRT_LEN),belt:1,tags:['y2k','casual']}
};
/* shoes: W max width, L length, H=[heel collar, instep, toe box], sole thickness */
const SHOES={
  none:{label:'Boso'},
  court:{label:'Sneakersy',up:'leather',ups:['leather','suede','canvas'],W:.102,L:.275,H:[.074,.086,.046],sole:.03,cup:1,laces:6,mud:1,heelTab:1,pad:.007,panel:1,tags:['minimal','casual']},
  chunky:{label:'Chunky',up:'leather',ups:['leather','mesh','suede'],W:.118,L:.29,H:[.08,.094,.052],sole:.05,cup:1,layered:1,laces:6,mud:1,panel:1,pad:.009,heelTab:1,tags:['streetwear','y2k']},
  runner:{label:'Biegowe',up:'mesh',ups:['mesh','knit','suede'],W:.104,L:.28,H:[.072,.084,.044],sole:.036,sculpt:1,laces:6,cage:1,pad:.006,heelTab:1,tags:['gorpcore','sport']},
  skate:{label:'Skate',up:'suede',ups:['suede','canvas','leather'],W:.112,L:.28,H:[.078,.09,.05],sole:.03,cup:1,laces:6,puffy:1,pad:.012,panel:1,tags:['skate','streetwear']},
  canvas:{label:'Trampki',up:'canvas',ups:['canvas','leather','suede'],W:.098,L:.275,H:[.068,.08,.04],sole:.026,cup:1,foxing:1,toecap:1,laces:7,tags:['casual','indie']},
  hightop:{label:'High-top',up:'canvas',ups:['canvas','leather','suede'],W:.1,L:.275,H:[.07,.082,.04],sole:.028,cup:1,foxing:1,toecap:1,laces:10,shaft:.15,ankleDisc:1,tags:['streetwear','skate']},
  boot:{label:'Workery',up:'leather',ups:['leather','suede'],W:.112,L:.285,H:[.082,.094,.054],sole:.036,lug:1,laces:8,shaft:.19,hooks:1,pad:.008,welt:1,tags:['workwear','gorpcore'],winter:1},
  combat:{label:'Glany',up:'leather',W:.108,L:.285,H:[.08,.092,.052],sole:.042,lug:1,laces:10,shaft:.25,welt:1,yellow:1,tags:['grunge','rock'],winter:1},
  chelsea:{label:'Sztyblety',up:'leather',ups:['leather','suede'],W:.098,L:.285,H:[.074,.084,.044],sole:.016,heel:.026,shaft:.17,elastic:1,pull:1,toe:'almond',tags:['minimal','rock'],winter:.5},
  cowboy:{label:'Kowbojki',up:'leather',ups:['leather','suede'],W:.096,L:.29,H:[.074,.084,.04],sole:.014,heel:.045,shaft:.3,toe:'pointed',western:1,pull:1,tags:['americana','western']},
  kneeboot:{label:'Kozaki',up:'leather',ups:['leather','suede'],W:.094,L:.28,H:[.072,.08,.04],sole:.012,heel:.06,shaft:.44,zipBoot:1,toe:'almond',tags:['feminine','70s'],winter:1},
  loafer:{label:'Loafery',up:'leather',ups:['leather','suede','velvet'],W:.094,L:.28,H:[.058,.074,.04],low:1,sole:.016,heel:.02,penny:1,moc:1,welt:1,tags:['old money','preppy'],summer:.3},
  derby:{label:'Derby',up:'leather',ups:['leather','suede'],W:.096,L:.285,H:[.066,.08,.042],sole:.016,heel:.022,laces:5,welt:1,toe:'almond',tags:['old money','formal']},
  clog:{label:'Chodaki',up:'suede',ups:['suede','leather'],W:.112,L:.28,H:[.04,.084,.05],sole:.035,cork:1,clog:1,tags:['gorpcore','casual'],summer:.6},
  slide:{label:'Klapki',up:'leather',ups:['leather','rubber','suede'],W:.104,L:.27,sole:.03,open:'slide',tags:['casual'],summer:1.5},
  sandal:{label:'Sandały',up:'leather',ups:['leather','nylon'],W:.1,L:.27,sole:.026,open:'sandal',tags:['riviera','gorpcore'],summer:1.5},
  ballet:{label:'Baleriny',up:'leather',ups:['leather','satin','suede'],W:.09,L:.262,H:[.04,.05,.036],sole:.007,low:2,bow:1,toe:'round',tags:['coquette','feminine']},
  maryjane:{label:'Mary Jane',up:'leather',ups:['leather','suede'],W:.092,L:.265,H:[.044,.054,.038],sole:.02,heel:.022,low:2,mj:1,toe:'round',tags:['coquette','y2k']},
  pump:{label:'Szpilki',up:'leather',ups:['leather','satin','suede'],W:.088,L:.255,H:[.06,.05,.034],sole:.006,stiletto:.085,vamp:.55,low:2,toe:'pointed',tags:['office','feminine']}
};
const SOCKS={none:'Bez skarpet',ankle:'Stopki',crew:'Do łydki',knee:'Podkolanówki'};
/* =============== catalogue: shop-like categories, each item lands in its slot =============== */
/* slots: top (base layer), mid (sweater / sweatshirt over it), outer (jacket / coat), bottom, shoes */
const MID_ITEMS={sweater:'top',turtle:'top',crewneck:'top',hoodie:'top',cardigan:'outer',sweatervest:'outer',ziphood:'outer',track:'outer',fleece:'outer'};
const CATALOG=[
  {id:'tees',label:'Koszulki i topy',icon:'tee',slot:'top',items:['tee','longsleeve','henley','polo','rugby','jersey','tank','cami','corset','blouse']},
  {id:'shirts',label:'Koszule',icon:'shirt',slot:'top',items:['shirt','camp','flannel']},
  {id:'knit',label:'Swetry i dzianina',icon:'knit',slot:'mid',items:['sweater','turtle','cardigan','sweatervest']},
  {id:'sweats',label:'Bluzy',icon:'hoodie',slot:'mid',items:['crewneck','hoodie','ziphood','track','fleece']},
  {id:'jackets',label:'Kurtki',icon:'jacket',slot:'outer',items:['bomber','varsity','trucker','chore','harrington','coach','windbreaker','biker','racer','overshirt']},
  {id:'down',label:'Puchowe i bezrękawniki',icon:'puffer',slot:'outer',items:['puffer','puffervest']},
  {id:'coats',label:'Płaszcze i parki',icon:'coat',slot:'outer',items:['overcoat','trench','parka']},
  {id:'tailoring',label:'Marynarki',icon:'blazer',slot:'outer',items:['blazer']},
  {id:'jeans',label:'Jeansy',icon:'pants',slot:'bottom',items:[['jeans',{fit:'skinny'},'Skinny'],['jeans',{fit:'slim'},'Slim'],['jeans',{fit:'straight'},'Straight'],['jeans',{fit:'relaxed'},'Relaxed'],['jeans',{fit:'baggy'},'Baggy'],['jeans',{fit:'wide'},'Wide leg'],['jeans',{fit:'flared'},'Dzwony'],['jeans',{fit:'bootcut'},'Bootcut']]},
  {id:'trousers',label:'Spodnie',icon:'pants',slot:'bottom',items:['chino','suit','linen','cargo','carpenter','cord','parachute']},
  {id:'sport',label:'Dresy i legginsy',icon:'sweatpants',slot:'bottom',items:['sweat','track','leggings']},
  {id:'shorts',label:'Szorty',icon:'shorts',slot:'bottom',items:[['jeans',{length:'shorts',fit:'straight'},'Szorty jeansowe'],['chino',{length:'shorts',fit:'straight'},'Szorty chino'],['cargo',{length:'bermuda',fit:'relaxed'},'Bermudy cargo'],['linen',{length:'bermuda',fit:'relaxed'},'Lniane bermudy'],['sweat',{length:'shorts',fit:'relaxed'},'Szorty dresowe'],'sportshorts']},
  {id:'skirts',label:'Spódnice',icon:'skirt',slot:'bottom',items:['skirt','pleated','slip','denimskirt']},
  {id:'sneakers',label:'Sneakersy i trampki',icon:'shoe',slot:'shoes',items:['court','chunky','runner','skate','canvas','hightop']},
  {id:'boots',label:'Botki i kozaki',icon:'boot',slot:'shoes',items:['boot','combat','chelsea','cowboy','kneeboot']},
  {id:'formal',label:'Półbuty, baleriny, szpilki',icon:'loafer',slot:'shoes',items:['loafer','derby','ballet','maryjane','pump']},
  {id:'summer',label:'Sandały i klapki',icon:'sandal',slot:'shoes',items:['sandal','slide','clog']}
];
/* =============== illustrative sizes =============== */
const SIZES=['XS','S','M','L','XL','XXL','3XL'];
const SIZE_CHEST={m:[86,92,100,108,116,124,132],f:[80,86,92,98,106,114,122]};
const WAISTS=[26,28,30,32,34,36,38,40],INSEAMS=[28,30,32,34,36],EU_SIZES=[36,37,38,39,40,41,42,43,44,45,46,47];
/* new accessories */
const BANDANAS={none:'Brak',tri:'Trójkąt z przodu',knot:'Zwinięta, węzeł z boku'};
const HEADBANDS={none:'Brak',forehead:'Opaska na czoło',full:'Chusta na głowę'};
const GLOVES={none:'Brak',leather:'Skórzane',driving:'Do jazdy (z dziurkami)',knit:'Dzianinowe',fingerless:'Bez palców',work:'Robocze'};
/* accessories */
const HATS={none:'Brak',baseball:'Baseball',trucker:'Trucker',beanie:'Beanie',fisherman:'Krótka beanie',bucket:'Bucket',flat:'Kaszkiet',beret:'Beret',fedora:'Fedora'};
const HAT_TAGS={baseball:['streetwear','casual'],trucker:['y2k','americana'],beanie:['streetwear','workwear'],fisherman:['workwear','gorpcore'],bucket:['y2k','streetwear'],flat:['heritage','old money'],beret:['feminine','retro'],fedora:['classic','retro']};
const GLASSES={none:'Brak',aviator:'Aviatory',wayfarer:'Wayfarer',clubmaster:'Clubmaster',round:'Okrągłe (lenonki)',rect:'Prostokątne',oversize:'Duże kwadratowe',cat:'Kocie oko',oval:'Owalne y2k',rimless:'Bez oprawek',shield:'Sportowe'};
const WATCHES={none:'Brak',classic:'Klasyczny',diver:'Diver',square:'Prostokątny',digital:'Cyfrowy',smart:'Smartwatch'};
const STRAPS={leather:'Brązowa skóra',black:'Czarna skóra',metal:'Bransoleta',nato:'Nato',rubber:'Guma'};
const BRACELETS={none:'Brak',chain:'Łańcuch',beads:'Koraliki',cuff:'Bangle',cord:'Rzemyk',tennis:'Tennis',leather:'Skórzana'};
const RINGS={none:'Brak',signet:'Sygnet',band:'Obrączka',stack:'Kilka pierścionków',chunky:'Gruby'};
const NECKLACES={none:'Brak',thin:'Cienki łańcuszek',cuban:'Gruby splot',cross:'Z krzyżem',pendant:'Z medalionem',pearls:'Perły',layered:'Kilka warstw',choker:'Choker'};
const EARRINGS={none:'Brak',stud:'Sztyfty',hoopS:'Małe kółka',hoopL:'Duże kółka',drop:'Wiszące',cross:'Krzyżyki'};
const WALLETS={none:'Brak',single:'Pojedynczy',double:'Podwójny'};
const BAGS={none:'Brak',crossbody:'Listonoszka',sling:'Nerka na klatkę',backpack:'Plecak',tote:'Torba na ramię'};
/* underwear (worn by default: the mannequin is never bare under the clothes); bottoms per gender, bras for women */
const UNDER_M={none:'Brak',boxer:'Bokserki',trunk:'Krótkie bokserki',brief:'Slipy'};
const UNDER_F={none:'Brak',brief:'Figi',hipster:'Hipsterki',boyshort:'Szorty',high:'Wysokie figi'};
const BRAS={none:'Brak',tshirt:'Gładki (t-shirt)',balconette:'Balkonetka',sports:'Sportowy',bralette:'Bralette'};
const SAGS={none:'Nie',low:'Lekko zsunięte',heavy:'Mocno zsunięte (sagging)'};
const SCARVES={none:'Brak',wrap:'Owinięty',long:'Długi, luźny'};
const TIES={none:'Brak',tie:'Krawat',skinny:'Wąski krawat',bow:'Mucha'};
const ACC_TAGS={classic:['old money'],diver:['smart casual'],square:['old money','retro'],digital:['gorpcore','retro'],smart:['athleisure'],
  chain:['gothic luxe','streetwear'],beads:['casual','y2k'],cuff:['old money','minimal'],cord:['casual','surf'],tennis:['streetwear'],leather:['rock'],
  thin:['minimal'],cuban:['streetwear'],cross:['gothic luxe'],pendant:['casual'],pearls:['coquette','y2k'],layered:['streetwear'],choker:['y2k','gothic luxe'],
  aviator:['retro','classic'],round:['indie','retro'],rect:['minimal'],cat:['retro','feminine'],shield:['y2k','gorpcore'],oval:['y2k'],
  wayfarer:['classic','americana'],clubmaster:['retro','smart casual'],oversize:['minimal','old money'],rimless:['minimal','office'],
  crossbody:['streetwear'],sling:['streetwear','gorpcore'],backpack:['casual','gorpcore'],tote:['minimal','feminine'],wrap:['heritage'],long:['minimal'],tie:['formal','office'],skinny:['indie','rock'],bow:['formal','preppy']};

/* =============== hair =============== */
const HAIR={
  none:{label:'Łysy'},buzz:{label:'Buzz cut'},crew:{label:'Krótkie'},fade:{label:'Fade z teksturą'},quiff:{label:'Quiff'},slick:{label:'Zaczesane do tyłu'},
  sidepart:{label:'Z przedziałkiem'},curtains:{label:'Curtains'},curlytop:{label:'Loki na górze'},afro:{label:'Afro'},twists:{label:'Twisty'},cornrows:{label:'Warkoczyki przy skórze'},
  dreads:{label:'Dredy'},braids:{label:'Box braids'},mullet:{label:'Mullet'},wolf:{label:'Wolf cut'},pixie:{label:'Pixie'},bob:{label:'Bob'},lob:{label:'Do ramion'},
  long:{label:'Długie'},ponytail:{label:'Kucyk'},bun:{label:'Kok'},manbun:{label:'Man bun'},spacebuns:{label:'Dwa koki'}
};
const HAIR_TEX={straight:'Proste',wavy:'Falowane',curly:'Kręcone',coily:'Afro'};
/* how hair long enough to reach the shoulders falls over them (left/right: the mannequin's own) */
const DRAPE_STYLES=['long','lob','wolf','braids','dreads'];
const HAIR_DRAPE={auto:'Kosmyki z przodu',back:'Wszystko z tyłu',front:'Wszystko z przodu',left:'Na lewe ramię',right:'Na prawe ramię'};
const FRINGES={none:'Bez grzywki',straight:'Prosta grzywka',curtain:'Grzywka curtain',side:'Na bok'};
const BEARDS={none:'Brak',stubble:'Zarost',short:'Krótka broda',full:'Pełna broda',goatee:'Kozia bródka',mustache:'Wąsy'};
/* real body types (muscle mass, body fat) - from lean runners to bodybuilders and heavier builds */
const BODY_TYPES={slim:{label:'Szczupła',mus:-0.35,fat:-0.55},average:{label:'Przeciętna',mus:0.3,fat:0.15},athletic:{label:'Wysportowana',mus:0.8,fat:-0.3},muscular:{label:'Umięśniona',mus:1.15,fat:0.05},bodybuilder:{label:'Kulturysta',mus:1.5,fat:-0.15},strong:{label:'Mocna (strongman)',mus:1.2,fat:1.1},soft:{label:'Pełniejsza',mus:0.1,fat:0.9},heavy:{label:'Puszysta',mus:0.15,fat:1.9}};
const FIG={shoulders:['Szerokość ramion',.85,1.2],chest:['Klatka / biust',.85,1.25],waist:['Talia',.8,1.3],hips:['Biodra',.85,1.25],legs:['Długość nóg',.9,1.12],torso:['Długość tułowia',.9,1.1],arms:['Długość rąk',.92,1.08],neckL:['Długość szyi',.8,1.3],neckW:['Grubość szyi',.85,1.2],head:['Wielkość głowy',.92,1.08]};
const BACKDROPS={studio:['Studio','#e6e4e0','#b9b4ac'],stone:['Kamień','#d4d1cb','#9c978e'],graphite:['Grafit','#4b4845','#232120'],sand:['Piasek','#f3ebdd','#e2d3b8'],white:['Biel','#ffffff','#e7e5e2'],sky:['Błękit','#e1e7ee','#aeb9c6']};

/* =============== state =============== */
const DEFAULT={v:5,gender:'m',height:180,build:1,mus:0.3,fat:0.15,
  fig:{shoulders:1,chest:1,waist:1,hips:1,legs:1,torso:1,arms:1,neckL:1,neckW:1,head:1},
  skin:13,finish:'fabric',pose:'stand',
  under:{bottom:'boxer',bra:'tshirt',color:'auto',color2:'auto'},
  hair:{style:'fade',color:'#2a1d16',texture:'straight',fringe:'none',beard:'none',len:0.5,drape:'auto'},
  top:{type:'tee',fit:'regular',color:'#232325',color2:'#f4f1ea',pattern:'solid',mat:'',neck:'',sleeve:'',tuck:'out',print:'none',size:'auto'},
  mid:{src:'none',type:'none',fit:'regular',color:'#3c4a5c',color2:'#f4f1ea',pattern:'solid',mat:'',neck:'',sleeve:'',tuck:'out',print:'none',close:'closed',size:'auto'},
  outer:{type:'none',fit:'regular',color:'#1e1e1f',color2:'#e9e2d2',pattern:'solid',mat:'',close:'closed',size:'auto'},
  bottom:{type:'jeans',fit:'straight',length:'full',rise:'mid',sag:'none',color:'#24345a',color2:'#f4f1ea',pattern:'solid',mat:'',belt:false,beltColor:'#3a281c',buckle:'classic',rips:false,stripes:false,w:'auto',l:'auto'},
  shoes:{type:'court',color:'#f3f1ec',color2:'#f3f1ec',sole:'#f2efe8',mat:'',socks:'none',sockColor:'#f4f1ea',eu:'auto'},
  acc:{
    cap:{type:'none',color:'#1e1e1f',color2:'#f4f1ea',back:false},
    glasses:{type:'none',frame:'#1b1a19',lens:'#151515'},
    watch:{type:'none',hand:'L',strap:'leather',metal:'silver',dial:'#f1ece2'},
    bracelet:{type:'none',hand:'R',pos:0,count:1,metal:'silver'},
    ring:{type:'none',hand:'R',metal:'silver'},
    chain:{type:'none',len:.5,metal:'silver'},
    earrings:{type:'none',side:'both',metal:'silver'},
    wallet:{type:'none',side:'R',metal:'silver'},
    bag:{type:'none',color:'#1e1e1f'},
    scarf:{type:'none',color:'#7a3b2e',color2:'#26304a',pattern:'tartan'},
    bandana:{type:'none',color:'#a3262a',color2:'#f4f1ea',pattern:'paisley'},
    headband:{type:'none',color:'#1e2a4a',color2:'#f4f1ea',pattern:'paisley'},
    gloves:{type:'none',color:'#2b211b'},
    tie:{type:'none',color:'#26304a',color2:'#7a3b2e',pattern:'solid'}
  }
};
const INSPO=[
  {id:'oldmoney',name:'Old money',s:{gender:'m',pose:'relaxed',hair:{style:'sidepart',color:'#5c3e28'},top:{type:'shirt',color:'#bcd0e3',tuck:'in',sleeve:'rolled'},bottom:{type:'linen',fit:'straight',rise:'high',color:'#e9e2d2',belt:true},shoes:{type:'loafer',color:'#6a4528',sole:'#3e2a20'},acc:{watch:{type:'classic',metal:'gold'}}}},
  {id:'street',name:'Streetwear',s:{gender:'m',pose:'walk',hair:{style:'curlytop',color:'#141110',texture:'coily'},top:{type:'hoodie',fit:'oversized',color:'#1e1e1f',print:'flames',color2:'#e9e2d2'},bottom:{type:'jeans',fit:'baggy',length:'stacked',rise:'low',color:'#6f8fb8'},shoes:{type:'chunky',color:'#f3f1ec'},acc:{cap:{type:'baseball',color:'#1e1e1f'},chain:{type:'cuban'},wallet:{type:'single'}}}},
  {id:'riviera',name:'Riviera',s:{gender:'f',pose:'relaxed',height:168,hair:{style:'long',color:'#5c3e28',texture:'wavy'},top:{type:'tank',color:'#f4f1ea',tuck:'in'},bottom:{type:'linen',fit:'wide',rise:'high',color:'#e9e2d2',belt:true},shoes:{type:'sandal',color:'#8f5a2e'},acc:{glasses:{type:'cat'},chain:{type:'thin',metal:'gold'},bracelet:{type:'cuff',metal:'gold'},bag:{type:'tote',color:'#b58a5a'}}}},
  {id:'gorp',name:'Gorpcore',s:{gender:'m',hair:{style:'crew',color:'#3d2a1e',beard:'short'},top:{type:'longsleeve',color:'#a3a3a5'},outer:{type:'puffer',color:'#5c5f3a',close:'half'},bottom:{type:'cargo',fit:'relaxed',length:'jogger',color:'#1e1e1f'},shoes:{type:'boot',color:'#6a4528',sole:'#1d1c1b',socks:'crew',sockColor:'#c9a34a'},acc:{cap:{type:'beanie',color:'#c9a34a'},watch:{type:'digital',strap:'nato',metal:'black'},bag:{type:'sling',color:'#26304a'}}}},
  {id:'coquette',name:'Coquette midi',s:{gender:'f',pose:'relaxed',height:166,hair:{style:'bun',color:'#c9a26b',fringe:'curtain'},top:{type:'blouse',color:'#e9d3d6',tuck:'in'},bottom:{type:'pleated',fit:'pleated',length:'midi',rise:'high',color:'#e9e2d2'},shoes:{type:'maryjane',color:'#1b1a19',socks:'ankle',sockColor:'#f4f1ea'},acc:{chain:{type:'pearls',metal:'gold'},earrings:{type:'stud',metal:'gold'}}}},
  {id:'work',name:'Workwear',s:{gender:'m',hair:{style:'buzz',color:'#141110',beard:'full'},top:{type:'tee',color:'#f4f1ea',tuck:'in'},outer:{type:'chore',color:'#3e5a86',mat:'canvas',close:'open'},bottom:{type:'carpenter',fit:'straight',color:'#b8996f',belt:true},shoes:{type:'boot',color:'#8f5a2e',sole:'#1d1c1b'},acc:{cap:{type:'fisherman',color:'#c8382b'}}}},
  {id:'office',name:'Biuro minimal',s:{gender:'f',pose:'hip',height:170,hair:{style:'bob',color:'#141110'},top:{type:'shirt',fit:'slim',color:'#f4f1ea',tuck:'in'},outer:{type:'blazer',color:'#1e1e1f',close:'open'},bottom:{type:'suit',fit:'wide',rise:'high',color:'#1e1e1f',belt:true},shoes:{type:'pump',color:'#1b1a19'},acc:{watch:{type:'square',strap:'black',metal:'gold'},earrings:{type:'hoopS',metal:'gold'}}}},
  {id:'minimal',name:'Zimowy minimal',s:{gender:'m',hair:{style:'slick',color:'#2a1d16',beard:'stubble'},top:{type:'turtle',color:'#e9e2d2'},outer:{type:'overcoat',color:'#b8996f',close:'open'},bottom:{type:'suit',fit:'straight',color:'#5b5d61'},shoes:{type:'chelsea',color:'#1b1a19'},acc:{watch:{type:'diver',strap:'metal'},scarf:{type:'long',color:'#5b5d61',pattern:'solid'}}}},
  {id:'y2k',name:'Y2K',s:{gender:'f',height:165,hair:{style:'spacebuns',color:'#2a1d16'},top:{type:'tee',fit:'boxy',color:'#e9d3d6',print:'star',color2:'#c46a86'},bottom:{type:'jeans',fit:'flared',rise:'low',color:'#6f8fb8'},shoes:{type:'chunky',color:'#f3f1ec'},acc:{glasses:{type:'oval',lens:'#c46a86',frame:'#f4f1ea'},chain:{type:'pearls'},bracelet:{type:'beads',count:3},bag:{type:'sling',color:'#a9bfd2'}}}},
  {id:'goth',name:'Gothic luxe',s:{gender:'m',pose:'relaxed',hair:{style:'long',color:'#141110'},top:{type:'longsleeve',fit:'slim',color:'#1e1e1f',print:'cross',color2:'#d3d6da'},outer:{type:'biker',color:'#1b1a19',close:'open'},bottom:{type:'jeans',fit:'flared',length:'stacked',color:'#242426'},shoes:{type:'combat',color:'#1b1a19',sole:'#1d1c1b'},acc:{chain:{type:'cross'},bracelet:{type:'chain'},ring:{type:'stack'},wallet:{type:'double'},earrings:{type:'cross'}}}},
  {id:'skate',name:'Skate',s:{gender:'m',pose:'open',hair:{style:'mullet',color:'#a07a4f'},top:{type:'tee',fit:'oversized',color:'#f4f1ea',print:'logo'},outer:{type:'overshirt',color:'#8a2f2a',pattern:'buffalo',color2:'#1e1e1f',close:'open'},bottom:{type:'carpenter',fit:'baggy',length:'full',color:'#e8e0cc',mat:'canvas'},shoes:{type:'skate',color:'#1b1a19',sole:'#f2efe8',socks:'crew'},acc:{cap:{type:'beanie',color:'#1e1e1f'},chain:{type:'thin'},bracelet:{type:'cord'}}}},
  {id:'ath',name:'Athleisure',s:{gender:'f',pose:'walk',height:167,hair:{style:'ponytail',color:'#141110',texture:'curly'},top:{type:'crewneck',fit:'boxy',color:'#a3a3a5'},bottom:{type:'leggings',color:'#1e1e1f'},shoes:{type:'runner',color:'#f3f1ec',color2:'#a9bfd2'},acc:{cap:{type:'baseball',color:'#e9e2d2'},watch:{type:'smart',strap:'rubber',metal:'black'}}}},
  {id:'seventies',name:'Lata 70.',s:{gender:'m',pose:'relaxed',hair:{style:'afro',color:'#2a1d16',texture:'coily',beard:'mustache'},top:{type:'polo',fit:'slim',color:'#4a3527',tuck:'in'},outer:{type:'overcoat',color:'#b8996f',mat:'cord',close:'open'},bottom:{type:'cord',fit:'flared',rise:'high',color:'#c9a34a',belt:true},shoes:{type:'chelsea',color:'#6a4528',sole:'#3e2a20'},acc:{glasses:{type:'aviator',lens:'#4a3220',frame:'#c9a34a'},chain:{type:'thin',metal:'gold'}}}},
  {id:'rock',name:'Rock',s:{gender:'f',height:169,hair:{style:'wolf',color:'#141110',fringe:'curtain'},top:{type:'tee',fit:'slim',color:'#1e1e1f',tuck:'in'},outer:{type:'biker',fit:'cropped',color:'#1b1a19',close:'open'},bottom:{type:'jeans',fit:'skinny',rise:'high',color:'#242426',belt:true,rips:true},shoes:{type:'combat',color:'#1b1a19'},acc:{chain:{type:'choker'},bracelet:{type:'leather'},ring:{type:'chunky'},earrings:{type:'hoopL'}}}},
  {id:'preppy',name:'Preppy lato',s:{gender:'m',hair:{style:'quiff',color:'#c9a26b'},top:{type:'polo',color:'#26304a',tuck:'in'},bottom:{type:'chino',fit:'straight',length:'shorts',color:'#d9c7a7',belt:true},shoes:{type:'loafer',color:'#6a4528',sole:'#3e2a20'},acc:{watch:{type:'classic',strap:'leather'},glasses:{type:'round',lens:'#4a3220'}}}},
  {id:'denimcity',name:'Denim w mieście',s:{gender:'f',pose:'walk',height:168,hair:{style:'braids',color:'#141110'},top:{type:'crewneck',fit:'oversized',color:'#e9e2d2'},bottom:{type:'denimskirt',fit:'aline',length:'mini',rise:'high',color:'#3e5a86'},shoes:{type:'kneeboot',color:'#1b1a19'},acc:{cap:{type:'flat',color:'#8a8170'},bag:{type:'crossbody',color:'#5a3a24'},earrings:{type:'hoopL',metal:'gold'}}}},
  {id:'varsity',name:'College',s:{gender:'m',hair:{style:'twists',color:'#141110'},top:{type:'tee',color:'#f4f1ea'},outer:{type:'varsity',color:'#26304a',color2:'#e9e2d2',close:'open'},bottom:{type:'chino',fit:'relaxed',color:'#e9e2d2'},shoes:{type:'canvas',color:'#f3f1ec',socks:'crew'},acc:{bag:{type:'backpack',color:'#7a3b2e'}}}},
  {id:'trenchday',name:'Trencz w deszcz',s:{gender:'f',pose:'walk',height:171,hair:{style:'lob',color:'#7a4a2a',texture:'wavy',fringe:'side'},top:{type:'sweater',color:'#e9e2d2',neck:'crew'},outer:{type:'trench',color:'#c8b591',close:'closed'},bottom:{type:'jeans',fit:'straight',color:'#24345a'},shoes:{type:'loafer',color:'#1b1a19'},acc:{glasses:{type:'rect'},scarf:{type:'wrap',pattern:'tartan',color:'#7a3b2e',color2:'#26304a'}}}}
];
/* new pieces shown off in a few looks */
{const add={rock:{acc:{gloves:{type:'fingerless',color:'#151413'}}},work:{acc:{bandana:{type:'tri',color:'#a3262a',pattern:'paisley'}}},
  minimal:{acc:{gloves:{type:'knit',color:'#3a3a3c'}}},skate:{acc:{headband:{type:'full',color:'#1e2a4a',pattern:'paisley'}}},
  office:{acc:{gloves:{type:'leather',color:'#1b1a19'}}},varsity:{mid:{type:'hoodie',src:'top',color:'#9aa0a6'}}};
  const merge=(a,b)=>{for(const k of Object.keys(b)){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])){a[k]=a[k]&&typeof a[k]==='object'?a[k]:{};merge(a[k],b[k]);}else a[k]=b[k];}};
  for(const f of INSPO)if(add[f.id])merge(f.s,add[f.id]);}
