/* HUMAN FISHING — 600 additional collectible fish types.
 * Data source shared with scripts/build_fish_expansion.py via the
 * SPECIES_NAMES_BEGIN/END markers. Keep original F001-F304 stable.
 * Each region receives 25 newly named fish types + 25 explicitly marked
 * color morphs. All have dedicated generated RGBA PNG files; base art
 * silhouettes are conserved rather than fabricated as anatomical studies.
 */
(function(){
'use strict';
// SPECIES_NAMES_BEGIN
var NAME_GROUPS=[
 '블랙몰리,달마시안몰리,세일핀몰리,라이어테일몰리,레드왁플래티,선셋플래티,블루왁플래티,블랙소드테일,파인애플소드테일,리본구피,레오파드구피,모자이크구피,엠페러테트라,다이아몬드테트라,프리스텔라테트라,블리딩하트테트라,실버팁라스보라,셀레스티얼펄다니오,헨겔리라스보라,스파클링구라미,초콜릿구라미,줄리코리도라스,피그미코리도라스,스터바이코리도라스,황금브리슬노즈',
 '알텀엔젤피시,마나카푸루엔젤,헤켈디스커스,블루디스커스,레드투르키스디스커스,키홀시클리드,지오파구스알티프론스,지오파구스스벤리,아카라헤이켈리,우아루시클리드,페스티붐시클리드,레오폴디엔젤,파라과이테트라,엑스레이테트라,블러드핀테트라,펭귄테트라,헤드앤테일라이트테트라,레드핀펜슬피시,베크포르디펜슬피시,아마존니들피시,스노우볼플레코,골든너겟플레코,레드테일헤미오두스,브라질리언지오파구스,브리틀노즈파쿠',
 '빅토리아시클리드,루비그린시클리드,오렌지피콕,레드루빈피콕,블루돌핀시클리드,아이스버그블루합,레몬제브라시클리드,화이트탑하라,루비바이올렛피콕,골든마이크로시클리드,브리샤르디시클리드,렐루피시클리드,쉘드웰러시클리드,컴프레시셉스,페트로크로미스,디스토코두스,마를리에리줄리도크로미스,오르나투스줄리도크로미스,부룬디프론토사,블랙바펜시클리드,레드쥬얼시클리드,블루쥬얼시클리드,케냐시클리드,아프리카타이거피시,아프리카유리메기',
 '드워프레인보우피시,보세마니레인보우,터콰이즈레인보우,레드레인보우,쓰레드핀레인보우,포크테일블루아이,포크테일라스보라,에메랄드라스보라,블루액셀라스보라,스위프턴라스보라,오렌지핀다니오,글로라이트다니오,레오파드다니오,진주다니오,자이언트다니오,드워프고비,비파로치,체커보드바브,틴포일바브,스네이크스킨구라미,문라이트구라미,파라다이스피시,드워프퍼퍼,그린스팟복어,타이거복어',
 '레이크트라우트,컷스로트송어,골든트라우트,스틸헤드송어,불송어,타이멘,레녹,유럽송어,댄쇼어송어,곱사연어,시베리아철갑상어,러시안철갑상어,쇼트노즈철갑상어,대서양철갑상어,패들피시,빙호화이트피시,시스코,툴리비,호수청어,화이트배스,스트라이프배스,머스켈런지,브라운불헤드,아메리칸장어,레드핀퍼치',
 '동자개,눈동자개,꼬치동자개,퉁가리,대륙송사리,버들매치,참중고기,중고기,줄납자루,떡납줄갱이,묵납자루,한강납자루,각시송사리,대농갱이,참갈겨니,긴몰개,모래무지,꾸구리,동방종개,얼룩새코미꾸리,퉁사리,산천어,열목어,황어,누치',
 '퀸엔젤피시,블루페이스엔젤피시,나소탱,세일핀탱,퍼플탱,소할탱,아킬레스탱,파우더브라운탱,톰니탱,오렌지숄더탱,클라운트리거,피카소트리거,블루스루트리거,오렌지라인트리거,파이어클라운피시,스컹크클라운피시,토마토클라운피시,클라키클라운피시,블랙오셀라리스,포터엔젤피시,코랄뷰티엔젤피시,레몬필엔젤피시,블루점턱그루퍼,바이컬러블레니,플래시래스',
 '드워프해마,롱스나우트해마,바겐만해마,호주빅벨리해마,티그테일해마,노랑꼬리해마,쇼트노즈해마,흰점복어,그린스팟퍼퍼,블루스팟퍼퍼,도그페이스퍼퍼,지도복어,황금가시복,브리들드버터플라이피시,리자드피시,플랫헤드고비,버터플라이레이,황매가오리,블랙스팟스팅레이,롱테일스팅레이,골든샌드퍼치,골드가든일,카디널가든일,레드화이트파이프피시,샌드타이거고비',
 '전어,밴댕이,도루묵,도치,임연수어,줄삼치,삼치,망상어,벤자리,황줄깜정이,벵에돔,돌돔,긴꼬리벵에돔,자리돔,망둑어,풀망둑,문치가자미,강도다리,노랑가자미,고무꺽정이,양볼락,불볼락,쏨뱅이,붉바리,자바리',
 '대서양참다랑어,남방참다랑어,청새리상어,마코상어,청상아리,흉상어,장완흉상어,범상어,톱상어,톱가오리,큰눈환도상어,긴꼬리환도상어,대왕쥐가오리,산호상어,삼치상어,블루마린,블랙마린,스트라이프마린,골든트레발리,자이언트트레발리,무지개러너,파랑새치,큰꼬리부시리,플라잉트레발리,로얄월새치',
 '검은입심해아귀,빅마우스아귀,심해바다두꺼비,꼬리등불아귀,브라운랜턴피시,거대랜턴피시,마우스바이퍼피시,슬로안바이퍼피시,블랙스왈로어,바티사우루스,드래곤스네이크피시,고스트스네일피시,마리아나스네일피시,심해하트피시,유령상어,남방키메라,깃털상어,은빛그레나디어,심해줄장어,블랙펠리컨장어,도그투스피시,잎사귀아귀,심해고스트피시,검은유리물고기,은빛방패심해어',
 '남극드래곤피시,남극실버피시,남극록코드,남극빙점어,극지백색빙어,남극스코티아메기,남극라이게노라,시베리아북극돔,얼음등가시고기,극지창꼬치,태평양할리벗,대서양할리벗,빙해폴락,퍼시픽코드,그린란드코드,노르웨이홍어,극지스케이트,알래스카폴락,베링청어,북태평양꽁치,흰점늑대고기,북극사각가오리,북극스컬핀,베링아이스피시,흰점극지퍼치'
];
// SPECIES_NAMES_END
var MORPH_COLOR=['루비','사파이어','에메랄드','호박','오팔','자수정','백금','금빛','밤안개','구름빛',
 '코발트','석양','달빛','오로라','화염','설화','터키석','진홍','바이올렛','진주',
 '청록','흑요석','노을','유리빛','남보라'];
var NAMES=NAME_GROUPS.map(function(s){return s.split(',')});
function tier(i,morph){
 var index=morph?(i+4)%25:i;
 return index<11?'COMMON':index<17?'UNCOMMON':index<21?'RARE':
  index<23?'EPIC':index===23?'LEGEND':'MYTHIC';
}
function extend(list,profile){
 if(!Array.isArray(list))return list;
 var ids=Object.create(null),names=Object.create(null);
 list.forEach(function(sp){ids[sp.id]=true;names[sp.name]=true});
 for(var h=0;h<12;h++){
  for(var i=0;i<25;i++){
   var base=list[h*20+i%20],
    baseId='F'+String(h*20+i%20+1).padStart(3,'0');
   var size=typeof profile==='function'?profile(base).category:(base.artSizeClass||'MEDIUM');
   for(var m=0;m<2;m++){
    var id='F'+String(305+h*50+i*2+m).padStart(3,'0'),
     name=m?MORPH_COLOR[i]+' '+NAMES[h][i]+' 변이':NAMES[h][i];
    if(ids[id])continue;
    if(names[name])throw Error('Duplicate fish catalogue name '+name);
    var rank=tier(i,m);
    list.push({id:id,name:name,habitat:h,
     index:20+i*2+m,rarity:rank,
     level:rank==='COMMON'?1+(i%6)*2:
      rank==='UNCOMMON'?12+(i%7)*3:
      rank==='RARE'?24+(i%6)*4:
      rank==='EPIC'?40+(i%5)*5:
      rank==='LEGEND'?59:77,
     artSizeClass:size,artVariant:!!m,artExpansion:true,
     sourceFishId:baseId,
     colorMorph:m?MORPH_COLOR[i]:null});
    ids[id]=true;names[name]=true;
   }
  }
 }
 return list;
}
window.HumanFishingSpeciesExpansion={
 extend:extend,groups:NAMES,newNamedTypes:300,newColorMorphs:300,
 totalAdditional:600,firstId:'F305',lastId:'F904'
};
})();