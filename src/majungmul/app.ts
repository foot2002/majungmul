// @ts-nocheck
/* reference/majungmul-app.html 의 <script> 로직을 옮긴 모듈.
   원본 함수·상태(S, M, UI, IND …)·data-act 동작을 그대로 유지한다. */
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let started=false;
export function startMajungmul(){
if(started)return;started=true;

'use strict';

/* =========================================================
   고정 데이터
   ========================================================= */
/* 많이 쓸 업종 순서 (소상공인실태조사 2024: 숙박·음식점 79.6만 개, 도·소매 210만 개 중 동네 매장, 교육·개인서비스) */
const IND_ORDER=['restaurant','cafe','academy','beauty','retail','hospital'];
const IND = {
  restaurant:{label:'음식점',desc:'한식·분식·고깃집·치킨 등',item:'메뉴',itemPh:'예) 돼지국밥',sheet:'메뉴판',postHour:[11,0],
    req:[{k:'food',label:'음식 종류',type:'one',options:['한식','분식','고기·구이','중식','일식','양식','치킨·호프','기타']},
         {k:'service',label:'이용 방법',type:'multi',options:['매장 식사','포장','배달','예약','단체석','주차 가능']}],
    extra:[['origin','대표 재료 원산지','예) 국내산 한돈'],['parkingInfo','주차 안내','예) 매장 앞 3대'],['group','단체·회식','예) 최대 20명, 룸 1개']],
    strengthsEx:['직접 우린 육수','국내산 재료만 써요','혼밥하기 편한 자리','양이 넉넉해요','15년 같은 자리'],
    topics:[{title:'대표 메뉴 다시 알리기',why:'첫 방문 손님은 대표 메뉴부터 찾아요',tag:'메뉴',kind:'메뉴'},{title:'재료 손질 과정 보여주기',why:'정성은 과정에서 드러나요',tag:'과정',kind:'과정'},{title:'점심·저녁 이용 안내',why:'시간대 검색 손님을 잡아요',tag:'안내',kind:'공간'}],
    questions:['가장 손이 많이 가는 메뉴는 뭐예요? 어떤 과정이 있어요?','재료는 어디서, 어떻게 고르세요?','단골손님이 가장 많이 시키는 메뉴와 그 이유는요?','가게를 처음 열게 된 이야기를 들려주세요.'],
    aud:['동네 직장인 점심','가족 외식','회식·모임','혼밥','포장 손님'],why:['새 메뉴','이번 주만','할인·혜택','예약·단체','포장·배달','오늘의 추천'],
    banned:['최고','1등','무조건','인생 맛집']},
  cafe:{label:'카페',desc:'커피·디저트·베이커리·브런치',item:'메뉴',itemPh:'예) 유자 라떼',sheet:'메뉴판',postHour:[14,30],
    req:[{k:'cafeType',label:'카페 성격',type:'multi',options:['커피 전문','디저트·베이커리','브런치','공부·작업하기 좋은','테이크아웃 위주']},
         {k:'space',label:'공간 특징',type:'multi',options:['넓은 좌석','콘센트','창가 자리','반려동물 동반','주차 가능','단체석']}],
    extra:[['beans','원두·재료','예) 매주 직접 로스팅'],['seats','좌석 수','예) 1층 18석'],['parkingInfo','주차 안내','예) 주차 불가, 역 3번 출구 5분']],
    strengthsEx:['직접 굽는 디저트','매주 직접 로스팅','직접 담근 수제청','조용한 작업 공간','오후 햇살 드는 창가'],
    topics:[{title:'이번 주 시즌 음료 소개',why:'계절이 바뀔 때 새 메뉴를 알리기 좋아요',tag:'메뉴',kind:'메뉴'},{title:'재료를 고르는 기준',why:'정성은 과정에서 드러나요',tag:'과정',kind:'과정'},{title:'자리·분위기 소개',why:'처음 오는 손님이 가장 궁금해해요',tag:'공간',kind:'공간'}],
    questions:['손님이 모르는, 메뉴 하나에 들어가는 정성이나 과정이 있나요?','원두나 재료는 어떤 기준으로 고르세요?','단골손님이 가장 많이 시키는 메뉴와 그 이유는요?','가게 자리 중에 사장님이 제일 좋아하는 곳은 어디고 왜예요?'],
    aud:['혼자 오는 손님','친구·연인','동네 직장인','가족','공부·노트북'],why:['새 메뉴','이번 주만','할인·혜택','예약 받아요','포장 가능','오늘의 추천'],
    banned:['최고','1등','무조건','인생 카페']},
  academy:{label:'학원·교습소',desc:'보습·입시·영어·코딩·예체능',item:'수업',itemPh:'예) 중등 수학 주 2회',sheet:'수강료표',postHour:[20,30],itemOptional:true,
    req:[{k:'subject',label:'과목',type:'multi',options:['국어','영어','수학','과학','사회','논술','코딩','예체능','기타']},
         {k:'grade',label:'대상',type:'multi',options:['유아','초등 저학년','초등 고학년','중등','고등','성인']},
         {k:'style',label:'수업 방식',type:'multi',options:['소수정예','1:1','개별 진도','내신 대비','수능 대비','특강']},
         {k:'consult',label:'상담 방법',type:'multi',options:['전화','방문','카톡','레벨 테스트']}],
    extra:[['curriculum','커리큘럼','예) 개념 → 유형 → 서술형'],['schedule','시간표','예) 월수 17:00, 화목 19:00'],['teacher','선생님 소개','예) 원장 직강, 수학 교육 12년'],['phone','상담 전화','예) 02-000-0000']],
    strengthsEx:['원장 직강','한 반 6명 이하','매주 학부모 피드백','자체 교재','오답 클리닉'],
    topics:[{title:'이번 달 수업 모습 소개',why:'학부모는 수업이 실제로 어떻게 진행되는지 궁금해해요',tag:'수업',kind:'과정'},{title:'선생님 소개',why:'학원을 고를 때 선생님이 가장 큰 기준이에요',tag:'선생님',kind:'사람'},{title:'상담 때 자주 받는 질문',why:'미리 답해두면 상담 문의가 쉬워져요',tag:'FAQ',kind:'공간'}],
    questions:['우리 학원 수업이 다른 곳과 가장 다른 점은 뭐예요?','학생이 달라졌던 기억에 남는 순간이 있나요? (이름·점수는 빼고)','학부모님이 상담 때 가장 많이 묻는 질문은요?','수업 자료는 어떻게 준비하세요?'],
    aud:['학부모','초등','중등','고등','처음 상담하는 분'],why:['신규 모집','특강 개설','상담 예약','시험 대비','레벨 테스트','수업 공개'],
    banned:['성적 보장','합격 보장','100% 합격','무조건','최고','1등','전국 최고']},
  beauty:{label:'미용·뷰티',desc:'헤어·네일·피부·속눈썹',item:'시술',itemPh:'예) 남성 커트',sheet:'가격표',postHour:[21,0],
    req:[{k:'field',label:'분야',type:'multi',options:['헤어','네일','피부·에스테틱','속눈썹·눈썹','왁싱','메이크업']},
         {k:'booking',label:'예약 방법',type:'multi',options:['네이버 예약','전화','카톡','인스타 DM','당일 방문']}],
    extra:[['designer','디자이너·원장','예) 원장 1인샵, 경력 12년'],['product','쓰는 제품','예) 저자극 펌제'],['parkingInfo','주차 안내','예) 건물 지하 1시간 무료']],
    strengthsEx:['1:1 예약제','원장이 직접 시술','두피 상담 후 시술','조용한 1인샵','시술 후 관리법 안내'],
    topics:[{title:'이번 시즌 추천 스타일',why:'계절이 바뀌면 스타일을 바꾸려는 손님이 많아요',tag:'스타일',kind:'메뉴'},{title:'시술 과정 보여주기',why:'과정을 보면 믿고 예약해요',tag:'과정',kind:'과정'},{title:'예약 방법·빈 시간 안내',why:'이번 주 빈 시간을 알리면 예약이 쉬워져요',tag:'예약',kind:'공간'}],
    questions:['손님들이 가장 많이 요청하는 시술은 뭐고, 사장님만의 방식이 있나요?','시술할 때 꼭 지키는 원칙이 있나요?','기억에 남는 손님 반응이 있었나요? (얼굴·이름 빼고)','쓰는 제품은 어떤 기준으로 고르세요?'],
    aud:['직장인 퇴근 후','학생','첫 방문 손님','단골 손님','남성 손님'],why:['이번 주 빈 시간','신규 할인','시즌 스타일','이벤트','예약 받아요','새 디자이너'],
    banned:['최고','1등','무조건','치료','완치','부작용 없는','100% 효과']},
  retail:{label:'동네 가게',desc:'꽃집·옷가게·소품·반찬가게',item:'상품',itemPh:'예) 꽃다발 (중)',sheet:'가격표',postHour:[12,0],
    req:[{k:'goods',label:'파는 것',type:'multi',options:['꽃·식물','옷·잡화','소품·문구','반찬·식료품','빵·디저트','기타']},
         {k:'buy',label:'사는 방법',type:'multi',options:['매장 방문','전화 주문','배송','픽업 예약','선물 포장']}],
    extra:[['newArrival','새 상품 들어오는 날','예) 매주 화·금'],['delivery','배송 범위','예) 동네 3km 무료'],['parkingInfo','주차 안내','예) 가게 앞 잠깐 정차 가능']],
    strengthsEx:['매일 새로 들어오는 상품','선물 포장 무료','동네 무료 배송','사장님이 직접 고른 상품','단골 적립'],
    topics:[{title:'이번 주 새로 들어온 상품',why:'새 상품은 단골이 다시 들르는 이유예요',tag:'신상품',kind:'메뉴'},{title:'선물 추천',why:'선물 고민하는 손님이 검색을 많이 해요',tag:'선물',kind:'메뉴'},{title:'가게 둘러보기',why:'처음 오는 손님은 분위기를 먼저 봐요',tag:'공간',kind:'공간'}],
    questions:['이번 주 들어온 것 중 사장님이 가장 추천하는 건요?','상품은 어떤 기준으로 고르세요?','손님들이 선물로 가장 많이 사가는 건요?','가게를 열게 된 이야기를 들려주세요.'],
    aud:['선물 고르는 분','동네 단골','직장인','가족','처음 오는 손님'],why:['새 상품','이번 주만','할인·혜택','선물 시즌','예약·픽업','오늘의 추천'],
    banned:['최고','1등','무조건']},
  hospital:{label:'병원',desc:'의원·클리닉·한의원·치과 등',item:'진료',itemPh:'예) 피부 레이저 상담',sheet:'진료 안내',postHour:[18,0],itemOptional:true,
    req:[{k:'medField',label:'진료분야',type:'multi',options:['피부·탈모','감기·알레르기','근골격','소화기','정신·신경','암·종양','여성·비뇨 질환','만성·심혈관','눈 질환','귀·코·목 질환','치아·구강']},
         {k:'medDept',label:'진료과목',type:'multi',options:['내과','소아과','피부과','이비인후과','정형외과','외과','가정의학과','신경외과','마취통증과','성형외과','산부인과','안과','정신의학과','비뇨의학과','신경과','재활의학과','흉부외과','영상의학과','치과','한의원']},
         {k:'specialist',label:'전문의여부',type:'one',options:['예','아니오']},
         {k:'nightHoliday',label:'야간/휴일',type:'multi',options:['야간진료','24시간진료','토요일진료','일요일진료','공휴일진료']},
         {k:'booking',label:'예약가능',type:'one',options:['가능','불가']}],
    extra:[['doctor','원장·의료진','예) 피부과 전문의, 진료 15년'],['insurance','보험·급여','예) 건강보험 적용'],['parkingInfo','주차 안내','예) 건물 지하 1시간 무료'],['phone','예약·문의 전화','예) 02-000-0000']],
    strengthsEx:['해당 분야 전문의 진료','대기 시간 짧은 예약제','야간·휴일 진료','친절한 설명','동네에서 오래 본 병원'],
    topics:[{title:'진료 과목·분야 소개',why:'처음 찾는 환자는 어떤 병을 보는지부터 확인해요',tag:'진료',kind:'공간'},{title:'의료진·전문의 소개',why:'병원을 고를 때 전문 여부가 큰 기준이에요',tag:'의료진',kind:'사람'},{title:'예약·야간 진료 안내',why:'방문 전 가장 많이 묻는 정보예요',tag:'안내',kind:'공간'}],
    questions:['우리 병원이 환자분들께 가장 자신 있는 진료는 뭐예요?','초진 환자가 가장 많이 묻는 질문은요?','야간·휴일 진료를 시작한 이유가 있나요?','진료할 때 꼭 지키는 원칙이 있나요?'],
    aud:['초진 환자','재진·관리 환자','직장인','아이 동반 보호자','근처 거주 환자'],why:['예약 안내','야간·휴일 진료','전문의 소개','건강 정보','검진·상담','새 진료 시작'],
    banned:['최고','1등','무조건','완치','완치 보장','치료 보장','100% 효과','부작용 없는','기적','무조건 낫']}
};
function reqStatus(p){p=p||S.profile;const T=IND[p.industry];const f=p.fields||{};
  const list=[{label:'가게 이름',ok:!!p.name.trim()},{label:'동네',ok:!!p.area.trim()},{label:'영업시간',ok:!!p.hours.trim()}]
    .concat(T.req.map(r=>({label:r.label,ok:Array.isArray(f[r.k])?f[r.k].length>0:!!f[r.k]})))
    .concat(T.itemOptional?[]:[{label:T.item+'·가격',ok:p.menu.length>0}])
    .concat([{label:'차별점',ok:p.strengths.length>0}]);
  return {list,done:list.filter(x=>x.ok).length,total:list.length,missing:list.filter(x=>!x.ok)};}
const KINDS=['메뉴','공간','사람','과정','이벤트','후기','글'];
const CLICHES=['오감을 만족','인생 맛집','특별한 경험','놓치지 마세요','힐링 그 자체','강력 추천','남녀노소','입소문','정성 가득','완벽한','최상의','잊지 못할','행복한 시간','소중한 분들과','눈과 입이 즐거운','맛과 멋','퀄리티 높은','가성비 갑'];
const CTA_WORDS=['오세요','들러','방문','예약','주문','포장','상담','문의','전화','찾아','놀러','만나요','기다릴게요','기다리고'];
const CH=[
  {id:'blog',name:'네이버 블로그',mark:'N',color:'#2B8A00',method:'pc',how:'매장 PC 크롬 확장',title:true,photo:true,perDay:1,len:[500,1100]},
  {id:'insta',name:'인스타그램',mark:'IG',color:'#C13584',method:'api',how:'공식 API · 비즈니스 계정',title:false,photo:true,perDay:1,len:[60,320]},
  {id:'shorts',name:'유튜브 쇼츠',mark:'YT',color:'#C4302B',method:'api',how:'공식 API · 구글 감사 후 공개',title:true,photo:true,perDay:1,len:[10,80]},
  {id:'threads',name:'스레드',mark:'@',color:'#16181D',method:'api',how:'공식 API',title:false,photo:false,perDay:2,len:[40,220]},
  {id:'facebook',name:'페이스북 페이지',mark:'f',color:'#1877F2',method:'api',how:'공식 API',title:false,photo:false,perDay:1,len:[60,350]},
  {id:'daangn',name:'당근 비즈프로필',mark:'당',color:'#E8680C',method:'copy',how:'공식 연결 없음 · 복사해서 붙여넣기',title:true,photo:false,perDay:1,len:[60,350]},
  {id:'place',name:'플레이스 소식',mark:'P',color:'#1E7A4C',method:'linked',how:'블로그 새소식 연결로 자동 노출',title:false,photo:false,perDay:1}
];
const CHMAP=Object.fromEntries(CH.map(c=>[c.id,c]));
const DRAFT_CH=['blog','insta','shorts','threads','facebook','daangn'];
const SNS_FIELDS=[
  {k:'insta',label:'인스타그램',ph:'예) https://instagram.com/store 또는 @store'},
  {k:'youtube',label:'유튜브',ph:'예) https://youtube.com/@store'},
  {k:'threads',label:'스레드',ph:'예) https://www.threads.net/@store'},
  {k:'facebook',label:'페이스북',ph:'예) https://facebook.com/store'},
  {k:'daangn',label:'당근',ph:'예) 비즈프로필 주소 또는 가게명'},
  {k:'blog',label:'네이버 블로그',ph:'예) https://blog.naver.com/store'}
];
const emptySns=()=>Object.fromEntries(SNS_FIELDS.map(x=>[x.k,'']));
const DAY=864e5, ARCHIVE_DAYS=90;

/* =========================================================
   상태
   ========================================================= */
function baseState(){
  return {v:2,example:false,
    profile:{industry:'restaurant',name:'',area:'',hours:'',menu:[],strengths:[],tone:'warm',banned:IND.restaurant.banned.slice(),extra:{},fields:{},sns:emptySns()},setupDone:false,
    stories:[],posts:[],inbox:[],conn:{blog:true,insta:true,shorts:true,threads:true,facebook:false,place:false},
    pcOn:true,shortsAudited:false,placeStats:[],topics:null,qIndex:0};
}
function exampleState(){
  const s=baseState(); s.example=true;
  s.profile={industry:'cafe',name:'온기카페',area:'성수동',hours:'매일 10:00–21:00 · 브런치 토·일 10:00–14:00',
    menu:[{name:'유자 라떼',price:5800},{name:'아메리카노',price:4500},{name:'브런치 세트',price:13000}],
    strengths:['직접 담근 수제청 (유자·자몽·레몬)','오후 햇살 드는 창가 자리 6석','노트북 하기 좋은 조용한 분위기'],
    tone:'warm',banned:['최고','1등','무조건','인생 카페'],extra:{seats:'1층 18석',parkingInfo:'주차 불가, 성수역 3번 출구 도보 5분'},fields:{cafeType:['디저트·베이커리','커피 전문'],space:['창가 자리','콘센트']},sns:emptySns()};
  s.setupDone=true;
  s.stories=[{q:'창가 자리는 왜 따로 두셨어요?',a:'오후 3시쯤 햇살이 제일 예뻐서, 혼자 오시는 손님 자리로 비워둬요.',at:Date.now()-5*DAY}];
  return s;
}
let S=exampleState();
let M={};                 // 자료: id -> material
let UI={view:'home',flow:null,filter:'전체',modal:null,qDraft:'',qAsk:null,storeEdit:null,inboxOpen:false,authErr:''};
let AUTH={user:null}; // {email,name} | null — 로컬 시연용 (추후 Supabase Auth로 교체)
let cap={db:null,uid:null,sample:null,dict:null};
let dictTarget=null;
let queueRunning=false;

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const won=n=>Number(n).toLocaleString('ko-KR')+'원';
const pad=n=>String(n).padStart(2,'0');
const dayKey=t=>{const d=new Date(t);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
const today=()=>dayKey(Date.now());
const fmtTime=t=>{const d=new Date(t);return (d.getMonth()+1)+'/'+d.getDate()+' '+pad(d.getHours())+':'+pad(d.getMinutes());};
const fmtDay=t=>{const d=new Date(t);return (d.getMonth()+1)+'월 '+d.getDate()+'일';};
const WD=['일','월','화','수','목','금','토'];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function toast(msg){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(UI.toastT);UI.toastT=setTimeout(()=>t.hidden=true,2800);}

/* =========================================================
   저장 (상태 1개 문서 + 자료 1개당 1문서)
   ========================================================= */
let saveT=null,saving=false,pendingSave=false,USE_RDS=false;
const matWriting=new Set(), matPending=new Set();
const AUTH_KEY='gk2-accounts', SESSION_KEY='gk2-session';
async function apiFetch(path,opts){
  const res=await fetch(path,Object.assign({credentials:'include',headers:{'content-type':'application/json'}},opts||{}));
  let data=null;try{data=await res.json();}catch(_){data=null;}
  return {res,data};
}
function persist(){clearTimeout(saveT);saveT=setTimeout(saveState,600);try{localStorage.setItem('gk2-state',JSON.stringify(S));}catch(_){}}
async function saveState(){
  try{localStorage.setItem('gk2-state',JSON.stringify(S));}catch(_){}
  if(!USE_RDS||!AUTH.user){if(cap.db&&cap.uid){/* reserved */}return;}
  if(saving){pendingSave=true;return;}
  saving=true;
  try{await apiFetch('/api/shop/state',{method:'PUT',body:JSON.stringify({state:S})});}catch(_){}
  saving=false;if(pendingSave){pendingSave=false;saveState();}
}
async function saveMat(m){
  try{const all=JSON.parse(localStorage.getItem('gk2-mats')||'{}');all[m.id]=m;localStorage.setItem('gk2-mats',JSON.stringify(all));}catch(_){}
  if(!USE_RDS||!AUTH.user)return;
  if(matWriting.has(m.id)){matPending.add(m.id);return;}
  matWriting.add(m.id);
  try{await apiFetch('/api/shop/materials',{method:'PUT',body:JSON.stringify({id:m.id,data:m})});}catch(_){}
  matWriting.delete(m.id);
  if(matPending.has(m.id)){matPending.delete(m.id);if(M[m.id])saveMat(M[m.id]);}
}
async function deleteMat(id){
  delete M[id];
  try{const all=JSON.parse(localStorage.getItem('gk2-mats')||'{}');delete all[id];localStorage.setItem('gk2-mats',JSON.stringify(all));}catch(_){}
  if(USE_RDS&&AUTH.user){try{await apiFetch('/api/shop/materials?id='+encodeURIComponent(id),{method:'DELETE'});}catch(_){}}
}
async function loadCloudData(){
  if(!USE_RDS||!AUTH.user)return;
  try{
    const st=await apiFetch('/api/shop/state');
    if(st.data&&st.data.ok&&st.data.state&&st.data.state.profile){S=Object.assign(baseState(),st.data.state);fixState();}
  }catch(_){}
  try{
    const mats=await apiFetch('/api/shop/materials');
    if(mats.data&&mats.data.ok&&mats.data.materials){M=mats.data.materials;}
  }catch(_){}
}
async function probeRdsAuth(){
  try{
    const {res,data}=await apiFetch('/api/auth/me');
    USE_RDS=!!(data&&data.db);
    if(data&&data.ok&&data.user){AUTH.user={email:data.user.email,name:data.user.name||''};try{localStorage.setItem(SESSION_KEY,JSON.stringify(AUTH.user));}catch(_){}}
    return USE_RDS;
  }catch(_){USE_RDS=false;return false;}
}

/* =========================================================
   이미지 처리 (코드만, AI 비용 없음)
   ========================================================= */
function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});}
function drawTo(img,max){const r=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*r));c.height=Math.max(1,Math.round(img.height*r));c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c;}
function grayData(img,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(img,0,0,w,h);const d=x.getImageData(0,0,w,h).data;const g=new Float32Array(w*h);for(let i=0;i<w*h;i++)g[i]=0.299*d[i*4]+0.587*d[i*4+1]+0.114*d[i*4+2];return g;}
// 사진 지문(dHash): 9×8 흑백에서 옆 칸 밝기 비교 → 64비트
function dHash(img){const g=grayData(img,9,8);let bits='';for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits+=g[y*9+x]>g[y*9+x+1]?'1':'0';let hex='';for(let i=0;i<64;i+=4)hex+=parseInt(bits.slice(i,i+4),2).toString(16);return hex;}
function hamming(a,b){if(!a||!b)return 64;let n=0;for(let i=0;i<16;i++){let v=parseInt(a[i],16)^parseInt(b[i],16);while(v){n+=v&1;v>>=1;}}return n;}
// 품질: 선명도(라플라시안 분산) × 밝기
function quality(img){const w=64,h=64,g=grayData(img,w,h);let sum=0;for(const v of g)sum+=v;const mean=sum/g.length;let lv=[];for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;lv.push(4*g[i]-g[i-1]-g[i+1]-g[i-w]-g[i+w]);}const lm=lv.reduce((a,b)=>a+b,0)/lv.length;const varL=lv.reduce((a,b)=>a+(b-lm)*(b-lm),0)/lv.length;const sharp=varL/(varL+300);const bright=mean<45||mean>225?0.5:mean<70||mean>200?0.8:1;return Math.round(sharp*bright*100)/100;}
function dataUrlToBlob(u){const [h,b]=u.split(',');const mime=(h.match(/:(.*?);/)||[])[1]||'image/jpeg';const bin=atob(b);const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:mime});}
// 예시 매장용 그림 사진(실제 사진 아님)
function demoPhoto(label,bg,fg){const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,640,480);x.fillStyle=fg;x.globalAlpha=.35;x.beginPath();x.arc(140,420,220,0,7);x.fill();x.beginPath();x.arc(560,60,150,0,7);x.fill();x.globalAlpha=1;x.fillStyle='rgba(255,255,255,.92)';x.fillRect(220,170,200,170);x.fillStyle=fg;x.fillRect(232,184,176,46);x.fillStyle='#16181D';x.font='bold 30px sans-serif';x.textAlign='center';x.fillText(label,320,400);x.font='16px sans-serif';x.fillText('예시 이미지',320,440);return c.toDataURL('image/jpeg',0.7);}
function exampleMats(){
  const now=Date.now();const mk=(o)=>Object.assign({id:uid(),src:'photo',status:'ready',quality:0.8,hash:null,group:null,rep:true,pinned:false,excluded:false,used:0,lastUsed:0,at:now-3*DAY,archived:false,ends:null,faces:false,facts:[],tags:[],example:true},o);
  const list=[
    mk({kind:'메뉴',menu:['유자 라떼'],summary:'유자 라떼 한 잔, 위에 유자 슬라이스',tags:['유자','라떼','겨울'],thumb:demoPhoto('유자 라떼','#EFD9B8','#F2A93B'),pinned:true}),
    mk({kind:'과정',menu:['유자 라떼'],summary:'유자를 직접 썰어 설탕과 병에 담는 모습',tags:['유자청','수제청','과정'],thumb:demoPhoto('유자청 담그기','#F4E8C1','#E0B030')}),
    mk({kind:'공간',menu:[],summary:'오후 햇살이 드는 창가 2인석',tags:['창가','햇살','자리'],thumb:demoPhoto('창가 자리','#DCE6EF','#9DB7D0'),used:2,lastUsed:now-9*DAY}),
    mk({kind:'메뉴',menu:['브런치 세트'],summary:'브런치 세트: 토스트, 샐러드, 스크램블',tags:['브런치','주말'],thumb:demoPhoto('브런치 세트','#E9E2D3','#B9A27A')}),
    mk({kind:'후기',src:'text',menu:['유자 라떼'],summary:'후기: 창가 자리가 아늑하고 유자 라떼가 많이 달지 않아 좋았다',tags:['후기','창가','유자 라떼'],thumb:null})
  ];
  return Object.fromEntries(list.map(m=>[m.id,m]));
}

function examplePosts(){
  const ms=Object.values(M);const find=k=>(ms.find(m=>m.summary.includes(k))||{}).id;
  const now=new Date();const at=(dAgo,h,mi)=>{const d=new Date(now);d.setDate(d.getDate()-dAgo);d.setHours(h,mi||0,0,0);return d.getTime();};
  const dr=(t,b)=>({title:t,body:b});
  const mk=(o)=>Object.assign({edited:false,approveSec:48,caught:0,appeal:4,example:true,whenMode:'rec'},o);
  return [
    mk({id:'ex1',topic:'창가 자리 소개',when:at(6,14,30),at:at(6,14,29),photoMat:find('창가'),mats:[find('창가'),find('후기')].filter(Boolean),channels:['blog','insta','threads','place'],appeal:5,
      status:{blog:{state:'done',text:'매장 PC가 올렸어요'},insta:{state:'done',text:'올라갔어요'},threads:{state:'done',text:'올라갔어요'},place:{state:'done',text:'소식 탭에 떴어요'}},
      drafts:{blog:dr('성수동 조용한 카페, 오후 3시 창가 자리 | 온기카페','오후 3시쯤 창가 자리에 햇살이 가장 예쁘게 들어와요.\n\n혼자 오시는 손님을 위해 창가 6석은 늘 비워둬요. 콘센트도 있어서 노트북 하시기 좋아요.\n\n영업시간은 매일 10:00–21:00예요. 편하게 들러주세요.'),insta:dr('','오후 3시, 창가 자리에 햇살이 들어와요.\n혼자 오셔도 편한 자리로 비워뒀어요.\n\n#성수동카페 #온기카페 #창가자리 #카공'),threads:dr('','오후 3시 창가 자리, 오늘도 햇살 좋아요. 혼자 오셔도 편하게 앉으세요.'),shorts:dr('',''),facebook:dr('',''),daangn:dr('','')}}),
    mk({id:'ex2',topic:'유자청 담그는 날',when:at(3,14,30),at:at(3,13,50),photoMat:find('유자를'),mats:[find('유자를'),find('유자 라떼 한')].filter(Boolean),channels:['blog','insta','shorts','daangn'],edited:true,approveSec:95,caught:1,appeal:5,
      status:{blog:{state:'done',text:'매장 PC가 올렸어요'},insta:{state:'done',text:'올라갔어요'},shorts:{state:'sched',text:'비공개 업로드 (심사 전)'},daangn:{state:'manual',text:'복사해서 붙여넣기'}},
      drafts:{blog:dr('직접 담그는 유자청, 유자 라떼가 되기까지 | 온기카페','오늘은 유자청을 담그는 날이에요.\n\n유자를 하나씩 직접 썰어 설탕과 함께 병에 담아요. 이 유자청으로 유자 라떼를 만들어요.\n\n유자 라떼는 5,800원이에요. 따뜻하게 한 잔 하러 오세요.'),insta:dr('','유자를 하나씩 직접 썰어요.\n이 유자청이 유자 라떼가 돼요. 5,800원\n\n#유자청 #수제청 #온기카페 #성수동카페'),shorts:dr('유자청 담그는 날 | 온기카페','유자를 하나씩 직접\n설탕과 함께 병에\n유자 라떼 5,800원'),threads:dr('',''),facebook:dr('',''),daangn:dr('[온기카페] 유자청 담갔어요','이웃분들, 오늘 유자청을 새로 담갔어요. 유자 라떼 5,800원, 포장도 돼요.')}}),
    mk({id:'ex3',topic:'주말 브런치 세트',when:at(-3,11,0),at:at(0,9,10),whenMode:'tom',photoMat:find('브런치'),mats:[find('브런치')].filter(Boolean),channels:['blog','insta','threads'],
      status:{blog:{state:'wait',text:'매장 PC 꺼짐 · 켜지면 올라가요'},insta:{state:'sched',text:'예약됨'},threads:{state:'sched',text:'예약됨'}},
      drafts:{blog:dr('성수동 주말 브런치, 토·일 오전 10시부터 | 온기카페','주말 아침, 브런치 세트를 준비했어요.\n\n토스트와 샐러드, 스크램블이 함께 나와요. 브런치 세트는 13,000원이고, 토·일 10:00–14:00에만 주문하실 수 있어요.\n\n느긋한 주말 아침에 들러주세요.'),insta:dr('','토·일 오전만 나오는 브런치 세트예요.\n토스트, 샐러드, 스크램블. 13,000원\n\n#주말브런치 #성수동브런치 #온기카페 #브런치카페'),threads:dr('','주말 브런치 세트 토·일 10:00–14:00만 해요. 늦잠 자고 오셔도 돼요.'),shorts:dr('',''),facebook:dr('',''),daangn:dr('','')}})
  ];
}
/* =========================================================
   자료 올리기 → 즉시 처리 → 정리 대기열
   ========================================================= */
async function ingestFiles(files){
  const arr=[...files].slice(0,30);
  if(!arr.length)return;
  toast(`${arr.length}장을 받았어요. 정리할게요`);
  let dup=0;
  for(const f of arr){
    try{
      const url=URL.createObjectURL(f);const img=await loadImg(url);URL.revokeObjectURL(url);
      const thumb=drawTo(img,640).toDataURL('image/jpeg',0.72);
      const hash=dHash(img), q=quality(img);
      const m={id:uid(),src:'photo',kind:null,menu:[],summary:'',tags:[],facts:[],hash,quality:q,group:null,rep:true,pinned:false,excluded:false,used:0,lastUsed:0,at:Date.now(),archived:false,ends:null,faces:false,status:'pending',thumb};
      // 비슷한 사진 묶기
      const sib=Object.values(M).find(x=>x.src==='photo'&&x.hash&&hamming(x.hash,hash)<=8);
      if(sib){
        m.group=sib.group||sib.id; if(!sib.group){sib.group=sib.id;}
        dup++;
        const better=q>(sib.quality||0)+0.05;
        if(better){ // 새 사진이 더 잘 나왔으면 대표 교체
          Object.values(M).filter(x=>x.group===m.group).forEach(x=>{x.rep=false;saveMat(x);});
          m.rep=true; Object.assign(m,{kind:sib.kind,menu:sib.menu,summary:sib.summary,tags:sib.tags,faces:sib.faces,status:sib.status==='ready'?'ready':'pending'});
        } else { m.rep=false; Object.assign(m,{kind:sib.kind,menu:sib.menu,summary:sib.summary,tags:sib.tags,faces:sib.faces,status:'ready'}); }
        saveMat(sib);
      }
      M[m.id]=m; saveMat(m);
    }catch(_){toast('열 수 없는 사진이 있어 건너뛰었어요');}
  }
  if(dup)toast(`비슷한 사진 ${dup}장은 묶어서 잘 나온 한 장만 쓸게요`);
  render(); runQueue();
}
const LIBS={pdf:[pdfWorkerUrl]};
const loaded={};
/* CDN 대신 npm 패키지(pdfjs-dist, mammoth, xlsx)를 필요할 때 불러옴 */
const LIBMOD={};
async function loadLib(k){if(LIBMOD[k])return LIBMOD[k];LIBMOD[k]=k==='pdf'?await import('pdfjs-dist'):k==='docx'?await import('mammoth'):await import('xlsx');return LIBMOD[k];}
function extOf(f){return (f.name.split('.').pop()||'').toLowerCase();}
async function ingestAny(files){
  const imgs=[],others=[];
  [...files].forEach(f=>{if(f.size>15*1024*1024){toast(`${f.name}은 15MB가 넘어서 건너뛰었어요`);return;}if(f.type.startsWith('image/'))imgs.push(f);else others.push(f);});
  if(imgs.length)await ingestFiles(imgs);
  for(const f of others){
    const ext=extOf(f);
    try{
      if(ext==='pdf'){toast(`${f.name} 읽는 중…`);const lib=await loadLib('pdf');lib.GlobalWorkerOptions.workerSrc=LIBS.pdf[1];
        const doc=await lib.getDocument({data:await f.arrayBuffer()}).promise;const n=Math.min(doc.numPages,5);
        for(let i=1;i<=n;i++){const pg=await doc.getPage(i);const vp0=pg.getViewport({scale:1});const vp=pg.getViewport({scale:Math.min(2,1400/Math.max(vp0.width,vp0.height))});const c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
          addDocPage(c,f.name+(doc.numPages>1?` (${i}쪽)`:''));}
        if(doc.numPages>5)toast(`${f.name}은 앞 5쪽만 넣었어요`);
      } else if(ext==='docx'){const mm=await loadLib('docx');const r=await (mm.default||mm).extractRawText({arrayBuffer:await f.arrayBuffer()});await ingestText(r.value,f.name);}
      else if(ext==='xlsx'||ext==='xls'){const XL=await loadLib('xlsx');const wb=XL.read(await f.arrayBuffer(),{type:'array'});const txt=wb.SheetNames.slice(0,3).map(n=>'['+n+']\n'+XL.utils.sheet_to_csv(wb.Sheets[n])).join('\n');await ingestText(txt,f.name);}
      else if(['txt','md','csv'].includes(ext)){await ingestText(await f.text(),f.name);}
      else toast(`${f.name}은 아직 못 읽는 형식이에요. 사진으로 찍거나 PDF로 저장해서 올려주세요`);
    }catch(_){toast(`${f.name}을 열지 못했어요. 사진으로 찍어서 올려주세요`);}
  }
  render();runQueue();
}
function addDocPage(canvas,name){
  const thumb=(()=>{const c=document.createElement('canvas');const r=Math.min(1,900/Math.max(canvas.width,canvas.height));c.width=canvas.width*r;c.height=canvas.height*r;c.getContext('2d').drawImage(canvas,0,0,c.width,c.height);return c.toDataURL('image/jpeg',0.75);})();
  const m={id:uid(),src:'doc',fileName:name,kind:null,menu:[],summary:'',tags:[],facts:[],hash:null,quality:0.6,group:null,rep:true,pinned:false,excluded:false,used:0,lastUsed:0,at:Date.now(),archived:false,ends:null,faces:false,status:'pending',thumb};
  M[m.id]=m;saveMat(m);
}
async function ingestText(text,fileName){
  const t=text.trim(); if(!t)return;
  const m={id:uid(),src:'text',fileName:fileName||'',kind:'글',menu:[],summary:(fileName?fileName+' · ':'')+t.slice(0,50),text:t.slice(0,3000),tags:[],facts:[],hash:null,quality:0.7,group:null,rep:true,pinned:false,excluded:false,used:0,lastUsed:0,at:Date.now(),archived:false,ends:null,faces:false,status:'pending',thumb:null};
  M[m.id]=m; saveMat(m); render(); runQueue();
}
/* 정리 대기열: 대표 자료만 AI(가벼운 모델)로 한 번 정리 */
async function runQueue(){
  if(queueRunning)return; queueRunning=true;
  try{
    for(;;){
      const m=Object.values(M).find(x=>x.status==='pending'&&x.rep);
      if(!m)break;
      if(!cap.sample){ // AI 없이: 사장님이 직접 종류를 고르게
        if(!UI.sampleKnown)break;
        Object.values(M).filter(x=>x.status==='pending').forEach(x=>{x.status='manual';x.kind=x.kind||(x.src==='text'?'글':'메뉴');x.summary=x.summary||'정리 전 자료 · 종류를 골라주세요';saveMat(x);});
        break;
      }
      try{
        const r=await aiTag(m);
        Object.assign(m,{kind:KINDS.includes(r.kind)?r.kind:(m.src==='text'?'글':'메뉴'),menu:(r.menu||[]).filter(n=>S.profile.menu.some(x=>x.name===n)),summary:String(r.summary||'').slice(0,80),tags:(r.tags||[]).slice(0,6).map(String),faces:!!r.faces,storePhoto:m.src==='photo'?r.storePhoto!==false:false,topicIdea:String(r.topicIdea||'').slice(0,30),questions:(r.questions||[]).slice(0,2).map(String),status:'ready'});
        if(m.faces){m.excluded=true;}
        // 묶음 형제에게 같은 정리 결과 복사
        if(m.group)Object.values(M).filter(x=>x.group===m.group&&x.id!==m.id).forEach(x=>{Object.assign(x,{kind:m.kind,menu:m.menu,summary:m.summary,tags:m.tags,faces:m.faces,status:'ready'});saveMat(x);});
        handleFacts(m,r.facts||[]);
        saveMat(m);
        if(UI.flow&&UI.flow.stage==='input'&&UI.flow.photoMat===m.id&&!UI.flow.topic.trim()&&m.storePhoto!==false&&(m.topicIdea||m.menu[0])){UI.flow.topic=m.topicIdea||(m.menu[0]+' 소개');UI.flow.topicAuto=true;}
      }catch(e){
        m.status='error'; saveMat(m);
        if(e&&e.code==='rate_limited'){toast('정리 요청이 많아요. 잠시 후 이어서 할게요');break;}
      }
      render();
    }
  }finally{queueRunning=false;render();}
}
function handleFacts(m,facts){
  const menu=S.profile.menu;
  facts.forEach(f=>{
    if(f&&f.type==='price'&&f.item&&Number(f.value)>0){
      const v=Number(f.value), cur=menu.find(x=>x.name===f.item);
      if(cur&&cur.price!==v) addInbox({type:'priceChange',item:f.item,from:cur.price,to:v,mat:m.id});
      else if(!cur) addInbox({type:'menuNew',item:String(f.item),to:v,mat:m.id});
    }
    if(f&&f.type==='event'&&f.title){ addInbox({type:'event',title:String(f.title),ends:f.ends||'',mat:m.id}); m.kind='이벤트'; }
  });
  if(m.faces) addInbox({type:'face',mat:m.id});
}
function addInbox(it){ if(S.inbox.some(x=>x.type===it.type&&x.item===it.item&&x.to===it.to&&x.mat===it.mat))return; S.inbox.push(Object.assign({id:uid()},it)); persist(); }

/* 자동 보관·만료 (앱 열 때 한 번) */
function housekeeping(){
  const now=Date.now();let moved=0,expired=0;
  Object.values(M).forEach(m=>{
    if(m.ends&&!m.archived&&new Date(m.ends+'T23:59:59').getTime()<now){m.archived=true;expired++;saveMat(m);return;}
    const last=Math.max(m.lastUsed||0,m.at||0);
    if(!m.archived&&!m.pinned&&!m.example&&now-last>ARCHIVE_DAYS*DAY){m.archived=true;moved++;saveMat(m);}
  });
  if(expired)toast(`끝난 이벤트 자료 ${expired}개를 보관함으로 옮겼어요`);
  else if(moved)toast(`3개월 넘게 안 쓴 자료 ${moved}개를 보관함으로 옮겼어요`);
}

/* =========================================================
   자료 고르기: ① 걸러내기 ② 점수 ③ (많으면) 가벼운 AI 선택
   ========================================================= */
function usable(m){return m.status!=='pending'&&m.status!=='error'&&m.rep&&!m.excluded&&!m.archived;}
function words(t){return String(t||'').replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).map(w=>w.replace(/(은|는|이|가|을|를|의|에|로|으로|와|과|도|만|요)$/,'')).filter(w=>w.length>=2);}
function scoreMat(m,topic,wantKind){
  const tw=new Set(words(topic));
  const menuHit=m.menu.some(n=>topic.includes(n)||words(n).some(w=>tw.has(w)))?1:0;
  const kw=words(m.summary+' '+m.tags.join(' ')+' '+m.menu.join(' ')).filter(w=>tw.has(w)).length;
  const kindHit=wantKind&&m.kind===wantKind?1:0;
  const recent=(Date.now()-(m.lastUsed||0))<14*DAY?(m.used||0):0;
  return 3*menuHit+2*Math.min(kw,3)+1.5*kindHit+1*(m.quality||0.5)+(m.pinned?3:0)-0.8*recent;
}
function relevance(m,topic,wantKind){const tw=new Set(words(topic));const menuHit=m.menu.some(n=>topic.includes(n)||words(n).some(w=>tw.has(w)));const kw=words(m.summary+' '+m.tags.join(' ')+' '+m.menu.join(' ')).some(w=>tw.has(w));return (menuHit||kw?2:0)+(wantKind&&m.kind===wantKind?1:0);}
async function selectMaterials(topic,wantKind){
  const cands=Object.values(M).filter(usable).filter(m=>relevance(m,topic,wantKind)>0).map(m=>({m,s:scoreMat(m,topic,wantKind)})).sort((a,b)=>b.s-a.s).slice(0,15);
  let ids=cands.slice(0,5).map(x=>x.m.id);
  if(cands.length>8&&cap.sample){
    try{
      const list=cands.map(x=>`${x.m.id}: [${x.m.kind}] ${x.m.summary}`).join('\n');
      const r=await cap.sample.json(`주제 "${topic}"로 가게 홍보 글을 쓴다. 아래 자료 중 가장 잘 맞는 것을 3~5개 고르고, 사진이 있으면 1개 이상 포함하라.\n${list}\nJSON만: {"ids":["..."]}`,{modelTier:'quick'});
      const ok=(r.ids||[]).filter(id=>M[id]); if(ok.length)ids=ok.slice(0,5);
    }catch(_){}
  }
  return ids;
}
function mainPhoto(ids){const ps=ids.map(i=>M[i]).filter(m=>m&&m.thumb&&m.src==='photo'&&m.storePhoto!==false);ps.sort((a,b)=>(b.pinned-a.pinned)||(b.quality-a.quality));return ps[0]||null;}
function unusedGood(){return Object.values(M).filter(m=>usable(m)&&m.thumb&&m.src==='photo'&&!m.used&&m.quality>=0.4);}

/* =========================================================
   검사 (막는 것 / 경고) + 손님 반응 체크
   ========================================================= */
function priceSet(){return new Set(S.profile.menu.map(m=>Number(m.price)).filter(Boolean));}
function checkDraft(chId,d,ctx){
  const issues=[];const text=(d.title||'')+'\n'+(d.body||'');
  const ps=priceSet();const re=/(\d{1,3}(?:,\d{3})+|\d{3,7})\s*원/g;let m;const seen=new Set();
  while((m=re.exec(text))){const n=Number(m[1].replace(/,/g,''));if(!ps.has(n)&&!seen.has(n)){seen.add(n);issues.push({sev:'block',kind:'fact',msg:`‘${m[0]}’은 매장 정보에 없는 가격이에요`,fix:'매장 정보의 가격으로 고치거나 빼야 해요'});}}
  const hrs=(S.profile.hours||'').replace(/\s/g,'');const tr=/(\d{1,2}):(\d{2})/g;
  while((m=tr.exec(text))){const a=String(Number(m[1]))+':'+m[2],b=m[1].padStart(2,'0')+':'+m[2];if(!hrs.includes(a)&&!hrs.includes(b))issues.push({sev:'block',kind:'fact',msg:`‘${m[0]}’은 영업시간에 없는 시각이에요`,fix:'영업시간을 확인해 주세요'});}
  (S.profile.banned||[]).forEach(w=>{const k=String(w).replace(/[‘’'"]/g,'').trim();if(k&&text.includes(k))issues.push({sev:'block',kind:'banned',msg:`쓰지 않기로 한 ‘${k}’이 들어 있어요`,fix:'표현을 바꿔야 해요'});});
  const cl=CLICHES.filter(c=>text.includes(c));if(cl.length)issues.push({sev:'warn',kind:'cliche',msg:`AI 티 나는 표현: ${cl.map(c=>'‘'+c+'’').join(', ')}`,fix:'우리 가게만의 구체적인 말로 바꾸면 좋아요'});
  if(CHMAP[chId].photo&&!ctx.photo)issues.push({sev:'block',kind:'photo',msg:'사진이 없어요',fix:'직접 찍은 사진이 있어야 올릴 수 있어요'});
  const day=dayKey(ctx.when||Date.now());const cnt=S.posts.filter(p=>p.channels.includes(chId)&&dayKey(p.when)===day).length;
  if(cnt>=CHMAP[chId].perDay)issues.push({sev:'block',kind:'pace',msg:`${CHMAP[chId].name}은 하루 ${CHMAP[chId].perDay}개까지예요`,fix:'몰아서 올리면 노출이 떨어질 수 있어 날짜를 바꿔야 해요'});
  return issues;
}
function sentences(t){return String(t||'').split(/[.!?\n]+/).map(s=>s.replace(/\s+/g,' ').trim()).filter(s=>s.length>=18);}

/* ---- 내용 문제(가격·시간·금지어): 위치까지 찾아서 바로 고칠 수 있게 ---- */
function nearestMenu(text,idx){let best=null,bd=1e9;S.profile.menu.forEach(m=>{const p=text.lastIndexOf(m.name,idx);if(p>=0&&idx-p<40&&idx-p<bd){bd=idx-p;best=m;}});return best;}
function contentProblems(d){
  const out=[],ps=priceSet(),own=UI.flow?[(UI.flow.note||''),(UI.flow.whyDetail||'')].concat(Object.values(UI.flow.answers||{})).join(' '):'';(own.match(/(\d{1,3}(?:,\d{3})+|\d{3,7})\s*원/g)||[]).forEach(x=>ps.add(Number(x.replace(/[^\d]/g,''))));const hrs=((S.profile.hours||'')+own).replace(/\s/g,'');
  ['title','body'].forEach(field=>{const text=d[field]||'';let m;
    const re=/(\d{1,3}(?:,\d{3})+|\d{3,7})\s*원/g;
    while((m=re.exec(text))){const n=Number(m[1].replace(/,/g,''));if(!ps.has(n)){const nm=nearestMenu(text,m.index);out.push({kind:'price',field,token:m[0],suggest:nm?won(nm.price):null,menu:nm?nm.name:null});}}
    const tr=/(\d{1,2}):(\d{2})/g;
    while((m=tr.exec(text))){const a=String(Number(m[1]))+':'+m[2],b=m[1].padStart(2,'0')+':'+m[2];if(!hrs.includes(a)&&!hrs.includes(b))out.push({kind:'time',field,token:m[0]});}
    (S.profile.banned||[]).forEach(w=>{const k=String(w).replace(/[‘’'"]/g,'').trim();if(k&&text.includes(k))out.push({kind:'banned',field,token:k});});
  });
  return out;
}
function dropSentence(text,token){const parts=String(text).split(/(?<=[.!?。\n])/);return parts.filter(p=>!p.includes(token)).join('').replace(/\n{3,}/g,'\n\n').trim();}
function applyFix(d,pb,how){
  if(how==='replace'&&pb.suggest){d[pb.field]=d[pb.field].replace(pb.token,pb.suggest);return;}
  if(pb.kind==='banned'){d[pb.field]=d[pb.field].split(pb.token).join('').replace(/ {2,}/g,' ');return;}
  d[pb.field]=dropSentence(d[pb.field],pb.token);
}
function styleProblems(f,c){const d=f.drafts[c];const text=(d.title||'')+'\n'+(d.body||'');const out=CLICHES.filter(x=>text.includes(x)).map(x=>({kind:'cliche',token:x}));const others=f.selected.filter(x=>x!==c&&f.drafts[x]).map(x=>sentences(f.drafts[x].body)).flat();sentences(d.body).forEach(sn=>{if(others.includes(sn))out.push({kind:'dup',token:sn.slice(0,20)});});return out;}
function paceBlocked(c,when){if(!CHMAP[c]||c==='place')return false;const day=dayKey(when||Date.now());return S.posts.filter(p=>p.channels.includes(c)&&dayKey(p.when)===day).length>=CHMAP[c].perDay;}
/* 생성 직후 자동으로 고치기: 사장님이 숨은그림 찾기를 하지 않게 */
async function autoFixAll(f){
  let fixedFact=0,fixedBan=0,fixedStyle=0;
  for(const c of DRAFT_CH){
    if(!f.selected.includes(c)||!f.drafts[c])continue;
    const d=f.drafts[c];const probs=contentProblems(d),style=styleProblems(f,c);
    if(!probs.length&&!style.length)continue;
    f.genMsg=`${CHMAP[c].name} 글을 매장 정보와 맞추는 중`;render();
    if(cap.sample){
      try{const r=await aiRewrite(c,d,'아래 문제만 고치고 나머지 문장은 최대한 그대로 둔다.',probs.map(p=>({msg:p.kind==='price'?`‘${p.token}’은 매장 정보에 없는 가격 → 매장 정보 값으로 바꾸거나 빼기`:p.kind==='time'?`‘${p.token}’은 영업시간에 없는 시각 → 빼기`:`‘${p.token}’은 금지 표현 → 다른 말로`})).concat(style.map(x=>({msg:x.kind==='cliche'?`상투 표현 ‘${x.token}’ → 구체적인 말로`:`다른 채널과 같은 문장 “${x.token}…” → 다르게`}))),f.mats);
        if(r&&r.body){d.body=r.body;if(r.title!=null&&CHMAP[c].title)d.title=r.title;fixedStyle+=style.length;}}catch(_){}
    }
    const left=contentProblems(d);left.forEach(pb=>applyFix(d,pb,'replace'));
    probs.forEach(p=>{if(p.kind==='banned')fixedBan++;else fixedFact++;});
  }
  const dropped=[];f.selected.slice().forEach(c=>{if(paceBlocked(c,f.when)){f.selected=f.selected.filter(x=>x!==c);dropped.push(c);}});
  f.paceDropped=dropped;
  const parts=[];if(fixedFact)parts.push(`매장 정보와 다른 가격·시간 ${fixedFact}곳`);if(fixedBan)parts.push(`쓰지 않기로 한 표현 ${fixedBan}곳`);if(fixedStyle)parts.push(`AI 티 나는 표현·중복 문장 ${fixedStyle}곳`);
  f.autoNote=parts.length?parts.join(', ')+'을 자동으로 고쳤어요.':'';
  f.caught=fixedFact+fixedBan;
}
/* 사장님이 해야 할 일만: 무엇을, 어디서, 버튼 하나로 */
function todos(f){
  const list=[];
  const photoCh=f.selected.filter(c=>CHMAP[c].photo);
  if(!f.photo&&photoCh.length)list.push({id:'photo',text:`${photoCh.map(c=>CHMAP[c].name).join('·')}은 사진이 있어야 올라가요.`,acts:[['openPicker','자료함에서 사진 고르기','primary'],['uploadForPost','지금 찍어 올리기',''],['dropPhotoCh','사진 없이 되는 채널만 올리기','ghost']]});
  DRAFT_CH.forEach(c=>{if(!f.selected.includes(c)||!f.drafts[c])return;contentProblems(f.drafts[c]).forEach((pb,i)=>{
    const where=`${CHMAP[c].name} ${pb.field==='title'?'제목':'본문'}`;
    const what=pb.kind==='price'?`‘${pb.token}’은 매장 정보에 없는 가격이에요.`:pb.kind==='time'?`‘${pb.token}’은 영업시간과 달라요.`:`‘${pb.token}’은 쓰지 않기로 한 표현이에요.`;
    const acts=[];if(pb.kind==='price'&&pb.suggest)acts.push(['fixReplace',`${pb.suggest}로 바꾸기`,'primary']);acts.push(['fixDrop',pb.kind==='banned'?'그 말 빼기':'그 문장 빼기',pb.kind==='price'&&pb.suggest?'':'primary']);if(pb.kind!=='banned')acts.push(['nav:store','매장 정보가 틀렸어요','ghost']);
    list.push({id:c+'|'+i,ch:c,pb,text:`${where}: ${what}`,acts});});});
  return list;
}

function allIssues(f){
  const sel=f.selected.filter(c=>c!=='place'&&f.drafts[c]);const map={};
  sel.forEach(c=>sentences(f.drafts[c].body).forEach(s=>{(map[s]=map[s]||new Set()).add(c);}));
  const res={};sel.forEach(c=>{res[c]=checkDraft(c,f.drafts[c],{photo:!!f.photo,when:f.when});});
  Object.entries(map).forEach(([s,set])=>{if(set.size>1)set.forEach(c=>{if(!res[c].some(i=>i.kind==='dup'))res[c].push({sev:'warn',kind:'dup',msg:`다른 채널과 같은 문장이 있어요: “${s.slice(0,24)}…”`,fix:'채널마다 다르게 쓰면 중복 글로 보이지 않아요'});});});
  return res;
}
// 손님 반응 체크 (막지 않음, 글 품질 지표)
function appeal(chId,d,f){
  const text=(d.title||'')+' '+(d.body||'');const first=(d.body||'').split('\n').find(l=>l.trim())||'';
  const detailWords=new Set();f.mats.forEach(id=>{const m=M[id];if(m)words(m.summary+' '+m.tags.join(' ')).forEach(w=>detailWords.add(w));});S.stories.forEach(s=>words(s.a).forEach(w=>detailWords.add(w)));S.profile.strengths.forEach(s=>words(s).forEach(w=>detailWords.add(w)));
  const hits=words(text).filter(w=>detailWords.has(w)&&w.length>=2);const uniq=new Set(hits);
  const len=(d.body||'').replace(/\s/g,'').length;const L=CHMAP[chId].len||[0,9999];
  const items=[
    {ok:uniq.size>=3,label:'우리 가게만의 디테일',hint:uniq.size>=3?[...uniq].slice(0,3).join(', '):'가게 이야기·자료에서 구체적인 내용을 더 넣어보세요'},
    {ok:chId==='shorts'||CTA_WORDS.some(w=>text.includes(w)),label:'와야 할 이유·행동 유도',hint:'“들러주세요”, “예약”, “포장” 같은 다음 행동'},
    {ok:first.trim().length>0&&first.trim().length<=40,label:'첫 줄이 짧고 눈에 띔',hint:'첫 줄은 40자 이내가 좋아요'},
    {ok:len>=L[0]&&len<=L[1],label:'채널에 맞는 길이',hint:`${L[0]}~${L[1]}자 권장 · 지금 ${len}자`},
    {ok:!CHMAP[chId].photo||!!f.photo,label:'실제 사진',hint:'직접 찍은 사진'}
  ];
  return {items,score:items.filter(i=>i.ok).length};
}

/* =========================================================
   Claude 호출
   ========================================================= */
function profileText(){
  const p=S.profile,T=IND[p.industry],f=p.fields||{};
  const req=T.req.map(r=>{const v=f[r.k];const t=Array.isArray(v)?v.join(', '):v;return t?`${r.label}: ${t}`:'';}).filter(Boolean);
  const ex=(T.extra||[]).map(([k,l])=>p.extra&&p.extra[k]?`${l}: ${p.extra[k]}`:'').filter(Boolean);
  const sns=SNS_FIELDS.map(x=>{const v=p.sns&&p.sns[x.k];return v&&String(v).trim()?`${x.label}: ${String(v).trim()}`:'';}).filter(Boolean);
  return [`업종: ${T.label}`,`가게 이름: ${p.name||'(미입력)'}`,`동네: ${p.area||'(미입력)'}`,`영업시간: ${p.hours||'(미입력 — 시간 언급 금지)'}`].concat(req).concat([
    `${T.item}과 가격(이 값만 사용): ${p.menu.length?p.menu.map(m=>m.name+' '+won(m.price)).join(', '):'(없음 — 가격 언급 금지)'}`,
    `차별점: ${p.strengths.join(' / ')||'(없음)'}`]).concat(ex).concat(sns.length?[`SNS: ${sns.join(' · ')}`]:[]).concat([
    `말투: ${{warm:'다정한 존댓말',clean:'깔끔하고 단정한 존댓말',fun:'유쾌하고 가벼운 존댓말'}[p.tone]}`,`쓰지 말 것: ${p.banned.join(', ')}`]).join('\n');
}
function matsText(ids){return ids.map(id=>M[id]).filter(Boolean).map(m=>`- [${m.kind}] ${m.summary}${m.tags.length?' ('+m.tags.join(', ')+')':''}${m.text?' 원문: '+m.text.slice(0,300):''}`).join('\n')||'(없음)';}
function seasonHint(){const mo=new Date().getMonth()+1;if(S.profile.industry==='academy')return({1:'겨울방학 특강',2:'신학기 준비',3:'신학기 적응',4:'중간고사 대비',5:'중간고사 이후',6:'기말고사 대비',7:'여름방학 특강',8:'2학기 준비',9:'2학기 적응',10:'중간고사 대비',11:'수능·기말, 겨울방학 특강 모집',12:'겨울방학 특강'})[mo];if(S.profile.industry==='hospital')return({1:'환절기 호흡기·면역 관리',2:'환절기 알레르기·피부 관리',3:'봄철 알레르기·미세먼지',4:'봄철 관절·야외활동 부상',5:'가정의 달 건강검진',6:'초여름 냉방병·식중독 주의',7:'여름철 피부·탈수 관리',8:'휴가철 응급·여행 전 상담',9:'환절기 감기·독감 대비',10:'가을 환절기 호흡기 관리',11:'독감·폐렴 예방접종 시즌',12:'연말 건강검진·예방접종'})[mo];return({1:'새해',2:'졸업·발렌타인',3:'봄 시작',4:'봄나들이',5:'가정의 달',6:'초여름',7:'한여름',8:'휴가철',9:'초가을',10:'가을',11:'초겨울',12:'연말 모임'})[mo];}
async function askJson(prompt,opts){
  if(!cap.sample)throw{code:'no_sample'};
  try{return await cap.sample.json(prompt,Object.assign({modelTier:'default'},opts||{}));}
  catch(e){if(e&&e.code==='not_granted'){cap.sample=null;UI.sampleOff=true;render();}throw e;}
}
async function aiTag(m){
  const menuNames=S.profile.menu.map(x=>x.name).join(', ')||'(없음)';
  let base=`동네 ${IND[S.profile.industry].label}의 마케팅 자료를 정리한다. 등록된 메뉴: ${menuNames}.
JSON만 출력: {"storePhoto":가게·메뉴·공간·사람·만드는 과정을 직접 찍은 사진이면 true, 화면 캡처·표·문서·광고물·관련 없는 이미지면 false,"topicIdea":"이 자료로 손님에게 알릴 만한 홍보 주제 20자 이내(가게와 관련 없으면 빈 값)","questions":["이 자료로 글을 쓸 때 사장님만 아는 구체적 사실을 끌어낼 짧은 질문 2개(예: 언제부터 팔았나요? 재료는 어디서?)"],"kind":"메뉴|공간|사람|과정|이벤트|후기|글 중 하나","menu":["등록된 메뉴 이름 중 보이는 것"],"summary":"40자 이내 사실 묘사","tags":["2~6개"],"faces":사람 얼굴이 알아볼 수 있게 보이면 true,"facts":[{"type":"price","item":"메뉴 이름","value":숫자} 또는 {"type":"event","title":"","ends":"YYYY-MM-DD 또는 빈 값"}]}
보이지 않는 것은 쓰지 않는다. 가격·이벤트는 글자로 분명히 보일 때만 facts에 넣는다.`;
  if(m.src==='text') return await askJson(base+'\n자료(사장님이 올린 글·파일 내용):\n'+m.text,{modelTier:'quick'});
  if(m.src==='doc') base+='\n이 이미지는 사진이 아니라 문서(전단지·메뉴판·가격표·안내문 등) 페이지다. 적힌 글자에서 사실을 뽑는다.';
  const opts={modelTier:'quick'};try{const lim=await cap.sample.limits();if(lim&&lim.images)opts.images=[dataUrlToBlob(m.thumb)];else throw 0;}catch(_){return {kind:'메뉴',summary:'사진 자료',tags:[],facts:[]};}
  return await askJson(base,opts);
}
const RULES=`규칙:
- 가격·시간·메뉴 이름은 매장 정보에 있는 값만 그대로 쓴다. 없으면 언급하지 않는다. 숫자를 지어내지 않는다.
- 아래 '이번 글 자료'와 가게 이야기에서 구체적인 디테일을 2개 이상 넣는다. 자료에 없는 장면은 지어내지 않는다.
- 첫 줄은 40자 이내로, 손님이 멈춰서 볼 구체적인 문장으로 시작한다.
- 쇼츠를 뺀 모든 채널은 마지막에 와야 할 이유나 다음 행동(방문·예약·포장·상담 등)을 한 문장 넣는다.
- 상투 표현 금지: ${CLICHES.join(', ')}.
- 쓰지 말 것 목록의 표현은 절대 쓰지 않는다. 채널끼리 같은 문장을 쓰지 않는다.
- 학원이면 성적·합격 보장, 다른 학원 비교, 학생 실명·점수를 쓰지 않는다.
- 미용이면 치료·완치·부작용 없음 같은 의료·효과 보장 표현을 쓰지 않는다.
- 이모지 없이 한국어로 쓴다.`;
async function aiTopics(){
  const pool=Object.values(M).filter(usable).sort((a,b)=>(a.used-b.used)||(b.quality-a.quality)).slice(0,20);
  const recent=S.posts.slice(-6).map(p=>p.topic).join(', ')||'(없음)';const d=new Date();
  const prompt=`당신은 동네 가게 사장님의 마케팅 비서다. 오늘 올릴 주제 3개를 제안하라.
오늘: ${today()} (${WD[d.getDay()]}요일), 시즌: ${seasonHint()}
최근 올린 주제: ${recent}
매장 정보:
${profileText()}
가게 이야기: ${S.stories.map(s=>s.a).join(' / ')||'(없음)'}
쓸 수 있는 자료(아직 덜 쓴 순서):
${pool.map(m=>`${m.id}: [${m.kind}] ${m.summary} (사용 ${m.used}회)`).join('\n')||'(없음)'}
규칙: 서로 다른 종류로 고르고 최근 주제와 겹치지 않게. 가능하면 아직 안 쓴 자료를 살린다. 매장 정보·자료에 없는 사실은 근거로 쓰지 않는다.
JSON만: {"topics":[{"title":"20자 이내","why":"오늘인 이유 한 문장","tag":"2~4자","kind":"메뉴|공간|사람|과정|이벤트|후기","matIds":["위 자료 id 1~3개"],"basis":[{"k":"근거 종류","v":"짧은 근거"}]}]}`;
  const r=await askJson(prompt,{modelTier:'quick'});
  if(!r||!Array.isArray(r.topics))throw{code:'bad'};
  return r.topics.slice(0,3).map(t=>Object.assign(t,{matIds:(t.matIds||[]).filter(id=>M[id])}));
}
async function aiDrafts(f){
  const prompt=`당신은 동네 가게의 마케팅 글을 쓰는 작가다. 주제에 맞춰 채널별 글을 써라.
주제: ${f.topic}
사장님 한 줄: ${f.note||'(없음)'}
누구에게: ${(f.aud||[]).join(', ')||'(지정 없음)'} — 이 손님들이 궁금해할 것을 먼저 쓴다
왜 지금 와야 하나: ${(f.why||[]).join(', ')||'(지정 없음)'}${f.whyDetail?' — '+f.whyDetail:''} — 마지막 행동 유도 문장에 반영한다. 사장님이 적지 않은 할인·기간은 지어내지 않는다
이 사진에 대한 사장님 답변(가장 중요한 디테일, 반드시 반영): ${(f.qa||[]).map(x=>'Q '+x.q+' A '+x.a).join(' | ')||'(없음)'}
오늘: ${today()}, 시즌: ${seasonHint()}
매장 정보:
${profileText()}
가게 이야기(사장님 답변): ${S.stories.map(s=>'Q '+s.q+' A '+s.a).join(' | ')||'(없음)'}
이번 글 자료:
${matsText(f.mats)}
${f.photo?'첨부 사진은 이번 글의 대표 사진이다. 사진에 보이는 것만 묘사한다.':'대표 사진 없음.'}
${RULES}
채널 형식:
- blog: title 40자 이내(동네+업종 키워드), body 600~900자, 문단 4~6개, 마지막 문단에 위치·영업시간(매장 정보에 있을 때만)
- insta: body 250자 이내, 마지막 줄 해시태그 4~6개
- shorts: title 40자 이내, body는 장면 자막 3줄(각 18자 이내, 줄바꿈)
- threads: body 180자 이내, 말하듯
- facebook: body 300자 이내
- daangn: title 30자 이내, body 300자 이내, 이웃에게 말하듯
JSON만: {"blog":{"title":"","body":""},"insta":{"body":""},"shorts":{"title":"","body":""},"threads":{"body":""},"facebook":{"body":""},"daangn":{"title":"","body":""}}`;
  const opts={modelTier:'default'};
  if(f.photo){try{const lim=await cap.sample.limits();if(lim&&lim.images)opts.images=[dataUrlToBlob(f.photo)];}catch(_){}}
  return await askJson(prompt,opts);
}
async function aiRewrite(chId,d,instruction,issues,mats){
  const prompt=`다음 ${CHMAP[chId].name} 글을 고쳐라. 요청: ${instruction}
${issues&&issues.length?'반드시 해결: '+issues.map(i=>i.msg).join(' / '):''}
매장 정보:
${profileText()}
이번 글 자료:
${matsText(mats||[])}
가게 이야기: ${S.stories.map(s=>s.a).join(' / ')||'(없음)'}
${RULES}
원래 글:
${CHMAP[chId].title?'제목: '+(d.title||'')+'\n':''}본문: ${d.body}
JSON만: {${CHMAP[chId].title?'"title":"",':''}"body":""}`;
  return await askJson(prompt,{modelTier:'default'});
}
async function aiMenu(blob){
  const lim=await cap.sample.limits();if(!lim||!lim.images)throw{code:'no_images'};
  return await askJson(`이 ${IND[S.profile.industry].sheet} 사진에서 ${IND[S.profile.industry].item} 이름과 가격을 읽어라.`+' 읽기 어려운 가격은 null. 추측 금지. JSON만: {"items":[{"name":"","price":0}]}',{images:[blob],modelTier:'default'});
}
function fallbackDrafts(f){
  const p=S.profile,st=p.strengths[0]||'',story=(S.stories[0]&&S.stories[0].a)||'',mt=f.mats.map(id=>M[id]).filter(Boolean)[0],m=p.menu[0];
  const price=m?`${m.name} ${won(m.price)}`:'';const hrs=p.hours?`영업시간은 ${p.hours}예요.`:'';const det=mt?mt.summary:st;
  return {blog:{title:`${p.area} ${IND[p.industry].label} ${p.name} | ${f.topic}`.trim(),body:`${det}\n\n${p.name}에서 ${f.topic} 소식을 전해요. ${f.note||''}\n\n${story}\n\n${st?'저희는 '+st+'을(를) 자랑으로 해요. ':''}${price?'대표 메뉴는 '+price+'이에요.':''}\n\n${hrs} 편하게 들러주세요.`},
    insta:{body:`${det}\n${f.note||st}\n편하게 들러주세요.\n\n#${(p.area||'').replace(/\s/g,'')} #${(p.name||'').replace(/\s/g,'')} #${IND[p.industry].label}`},
    shorts:{title:`${f.topic} | ${p.name}`,body:`${det.slice(0,18)}\n${st.slice(0,18)}\n${(price||p.name).slice(0,18)}`},
    threads:{body:`${f.topic} 이야기예요. ${story.slice(0,90)} 들러주세요.`},
    facebook:{body:`${p.name} 소식: ${f.topic}. ${det}. ${hrs}`},
    daangn:{title:`[${p.name}] ${f.topic}`.slice(0,30),body:`이웃분들 안녕하세요. ${det}. ${f.note||st} ${hrs} 들러주세요.`}};
}

/* =========================================================
   아이콘 · 공용 조각
   ========================================================= */
const I={home:'<path d="M4 11l8-6 8 6v9H4z"/>',plus:'<path d="M12 5v14M5 12h14"/>',store:'<path d="M4 9l1.5-4h13L20 9M4 9v11h16V9M4 9h16M10 20v-5h4v5"/>',chart:'<path d="M5 20V10M12 20V4M19 20v-7"/>',box:'<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',cam:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',check:'<path d="M5 12l5 5 9-10"/>',back:'<path d="M15 6l-6 6 6 6"/>',copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',trash:'<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',pin:'<path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v7"/>',ban:'<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>',text:'<path d="M5 6h14M5 11h14M5 16h9"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5"/>'};
const ic=(n,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const chMark=(c,s=30)=>`<span style="width:${s}px;height:${s}px;border-radius:9px;background:${c.color};color:#fff;font-size:${Math.round(s*.42)}px;font-weight:800;display:inline-grid;place-items:center;flex:none">${c.mark}</span>`;
const matThumb=(m,cls='')=>m&&m.thumb?`<img src="${m.thumb}" alt="${esc(m.summary)}" class="${cls}">`:`<span class="ph">${ic(m&&m.src==='text'?'text':'cam',20)}</span>`;

/* =========================================================
   네비
   ========================================================= */
const NAV=[{id:'home',label:'오늘',icon:'home'},{id:'create',label:'새 글',icon:'plus'},{id:'status',label:'현황',icon:'chart'},{id:'store',label:'우리 가게',icon:'store'},{id:'library',label:'자료함',icon:'box'}];
const BNAV=['home','status','create','store','library']; // 모바일: 가운데 + 버튼
function renderNav(){
  const pend=Object.values(M).filter(m=>m.status==='pending').length, inbox=S.inbox.length;
  const waiting=S.posts.filter(p=>Object.values(p.status).some(v=>v.state==='wait'||v.state==='manual')).length;
  const badge=id=>id==='home'&&inbox?inbox:id==='library'&&pend?pend:id==='status'&&waiting?waiting:0;
  const inStore=!!(AUTH.user||(S.setupDone&&!S.example));
  const authBlock=inStore
    ?`<div class="stack" style="gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">${AUTH.user?`<div class="row" style="gap:8px;align-items:flex-start">${ic('user',18)}<div class="stack" style="gap:0;flex:1;min-width:0"><b class="small" style="overflow:hidden;text-overflow:ellipsis">${esc(AUTH.user.name||'사장님')}</b><span class="xs muted" style="overflow:hidden;text-overflow:ellipsis">${esc(AUTH.user.email)}</span></div></div>`:''}<button class="btn sm ghost block" data-act="logout">로그아웃</button></div>`
    :`<div class="stack" style="gap:6px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line)"><button class="btn sm dark block" data-act="nav" data-v="login">${ic('user',14)}로그인</button><button class="btn sm ghost block" data-act="nav" data-v="signup">회원가입</button></div>`;
  $('#sideNav').innerHTML=NAV.map(n=>n.id==='create'
    ?`<button class="nav-btn new" data-act="nav" data-v="create">${ic('plus')}새 글 만들기</button>`
    :`<button class="nav-btn" data-act="nav" data-v="${n.id}" ${UI.view===n.id?'aria-current="page"':''}>${ic(n.icon)}${n.label}${badge(n.id)?`<span class="badge">${badge(n.id)}</span>`:''}</button>`).join('')+authBlock;
  $('#bottomNav').innerHTML=BNAV.map(id=>NAV.find(n=>n.id===id)).map(n=>n.id==='create'
    ?`<button class="fab" data-act="nav" data-v="create" aria-label="새 글 만들기">${ic('plus',26)}</button>`
    :`<button data-act="nav" data-v="${n.id}" ${UI.view===n.id?'aria-current="page"':''}>${ic(n.icon,22)}${n.label}${badge(n.id)?`<span class="badge nb">${badge(n.id)}</span>`:''}</button>`).join('');
}

/* =========================================================
   회원가입 · 로그인 (RDS 우선, 없으면 로컬 폴백)
   ========================================================= */
function loadAccounts(){try{return JSON.parse(localStorage.getItem(AUTH_KEY)||'[]');}catch(_){return[];}}
function saveAccounts(list){try{localStorage.setItem(AUTH_KEY,JSON.stringify(list));}catch(_){}}
function loadSession(){try{const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');AUTH.user=s&&s.email?{email:s.email,name:s.name||''}:null;}catch(_){AUTH.user=null;}}
function saveSession(user){AUTH.user=user;try{if(user)localStorage.setItem(SESSION_KEY,JSON.stringify(user));else localStorage.removeItem(SESSION_KEY);}catch(_){}}
async function hashPass(pw){
  try{
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('majungmul:'+pw));
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch(_){return 'plain:'+pw;}
}
function validEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e||'').trim());}
async function afterAuth(){
  UI.authErr=''; S.seenLanding=true;
  if(USE_RDS) await loadCloudData();
  persist();
  if(S.setupDone&&!S.example) UI.view='home';
  else{ UI.indPicked=false; UI.setupStep=1; UI.view='setup'; }
  render(); window.scrollTo(0,0);
}
function viewAuthShell(title,sub,body,footer){
  const logoSvg=(document.querySelector('.brand .logo')||{innerHTML:''}).innerHTML;
  return `<div class="ld" style="min-height:100vh"><div class="ld-top"><div class="in"><button class="brand-link" data-act="goLanding" style="border:0;background:transparent;display:flex;align-items:center;gap:10px"><span class="logo" style="width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:#0B6E8A">${logoSvg}</span><b style="font-size:20px;font-weight:900;letter-spacing:-0.04em">마중물</b></button>
    <div class="row" style="margin-left:auto;justify-content:flex-end"><button class="btn ghost" data-act="nav" data-v="login">로그인</button><button class="btn dark" data-act="nav" data-v="signup">회원가입</button></div></div></div>
    <div class="stack" style="max-width:440px;width:100%;margin:40px auto;padding:0 20px 60px;gap:16px">
      <div class="stack" style="gap:6px"><h1>${title}</h1><p class="muted">${sub}</p></div>
      <div class="card stack">${body}</div>
      ${footer||''}
      <p class="xs muted" style="text-align:center">${USE_RDS?'계정이 RDS에 저장돼요.':'서버 DB 연결 전 · 이 브라우저에만 저장돼요.'}</p>
    </div></div>`;
}
function viewLogin(){
  const err=UI.authErr?`<div class="banner warn"><span>${esc(UI.authErr)}</span></div>`:'';
  return viewAuthShell('로그인','가입한 이메일로 들어와 주세요.',
    `${err}
    <div class="stack" style="gap:6px"><label class="lbl" for="authEmail">이메일</label><input id="authEmail" class="inp" type="email" autocomplete="username" placeholder="예) boss@store.com"></div>
    <div class="stack" style="gap:6px"><label class="lbl" for="authPass">비밀번호</label><input id="authPass" class="inp" type="password" autocomplete="current-password" placeholder="비밀번호"></div>
    <button class="btn primary lg block" data-act="doLogin">로그인</button>`,
    `<p class="small muted" style="text-align:center">아직 계정이 없나요? <button class="btn sm ghost" data-act="nav" data-v="signup">회원가입</button></p>`);
}
function viewSignup(){
  const err=UI.authErr?`<div class="banner warn"><span>${esc(UI.authErr)}</span></div>`:'';
  return viewAuthShell('회원가입','이메일과 비밀번호로 사장님 계정을 만들어요.',
    `${err}
    <div class="stack" style="gap:6px"><label class="lbl" for="authName">이름·호칭 <span class="muted xs">(선택)</span></label><input id="authName" class="inp" autocomplete="name" placeholder="예) 온기카페 사장님"></div>
    <div class="stack" style="gap:6px"><label class="lbl" for="authEmail">이메일</label><input id="authEmail" class="inp" type="email" autocomplete="username" placeholder="예) boss@store.com"></div>
    <div class="stack" style="gap:6px"><label class="lbl" for="authPass">비밀번호</label><input id="authPass" class="inp" type="password" autocomplete="new-password" placeholder="8자 이상"></div>
    <div class="stack" style="gap:6px"><label class="lbl" for="authPass2">비밀번호 확인</label><input id="authPass2" class="inp" type="password" autocomplete="new-password" placeholder="한 번 더"></div>
    <button class="btn primary lg block" data-act="doSignup">가입하고 시작하기</button>`,
    `<p class="small muted" style="text-align:center">이미 계정이 있나요? <button class="btn sm ghost" data-act="nav" data-v="login">로그인</button></p>`);
}

/* =========================================================
   화면: 오늘
   ========================================================= */
function curTopics(){
  if(S.topics&&S.topics.date===today())return{list:S.topics.list,ai:true};
  // 기본 제안: 업종 기본 + 아직 안 쓴 좋은 자료로 만든 주제
  const ug=unusedGood().sort((a,b)=>(b.pinned-a.pinned)||(b.quality-a.quality));
  const base=IND[S.profile.industry].topics.map(t=>{const ids=Object.values(M).filter(usable).filter(m=>m.kind===t.kind).sort((a,b)=>a.used-b.used).slice(0,2).map(m=>m.id);return Object.assign({},t,{matIds:ids,basis:[{k:'업종',v:'기본 제안'}].concat(ids.length?[{k:'자료',v:`${ids.length}개 연결`}]:[])});});
  if(ug[0]){base[2]={title:`${(ug[0].menu[0]||ug[0].summary.split(/[,·:]/)[0]).slice(0,16)} 보여주기`,why:'아직 한 번도 안 쓴 좋은 자료예요',tag:ug[0].kind,kind:ug[0].kind,matIds:[ug[0].id],basis:[{k:'자료',v:'아직 안 씀'},{k:'사진 품질',v:Math.round(ug[0].quality*100)+'점'}]};}
  return{list:base,ai:false};
}
function curQuestion(){const qs=IND[S.profile.industry].questions;return qs[(S.qIndex||0)%qs.length];}
function activeQuestion(){const q=(UI.qAsk!=null?UI.qAsk:curQuestion()).trim();return q;}
function weekPosts(){const now=new Date();const mon=new Date(now);mon.setHours(0,0,0,0);mon.setDate(now.getDate()-((now.getDay()+6)%7));return S.posts.filter(p=>p.when>=mon.getTime());}
function inboxCard(it){
  const m=M[it.mat];const th=m&&m.thumb?`<img src="${m.thumb}" alt="" style="width:48px;height:48px;border-radius:10px;object-fit:cover;flex:none">`:'';
  if(it.type==='priceChange')return `<div class="list-row">${th}<span style="flex:1"><b>${esc(it.item)}</b> 가격이 ${won(it.from)} → <b>${won(it.to)}</b>로 바뀌었나요? <span class="xs muted">(새 메뉴판 사진에서 읽음)</span></span><button class="btn sm dark" data-act="inYes" data-i="${it.id}">바뀌었어요</button><button class="btn sm ghost" data-act="inNo" data-i="${it.id}">아니에요</button></div>`;
  if(it.type==='menuNew')return `<div class="list-row">${th}<span style="flex:1">새 메뉴 <b>${esc(it.item)} ${won(it.to)}</b>를 매장 정보에 넣을까요?</span><button class="btn sm dark" data-act="inYes" data-i="${it.id}">넣기</button><button class="btn sm ghost" data-act="inNo" data-i="${it.id}">아니요</button></div>`;
  if(it.type==='event')return `<div class="list-row">${th}<span style="flex:1">이벤트 <b>${esc(it.title)}</b> · 끝나는 날 <label class="sr" for="ev${it.id}">끝나는 날</label><input type="date" id="ev${it.id}" class="inp" style="width:auto;min-height:36px;padding:4px 8px;display:inline-block" value="${esc(it.ends)}"></span><button class="btn sm dark" data-act="inYes" data-i="${it.id}">저장</button><button class="btn sm ghost" data-act="inNo" data-i="${it.id}">무시</button></div>`;
  if(it.type==='face')return `<div class="list-row">${th}<span style="flex:1">사람 얼굴이 보이는 사진이에요. <b>동의받은 사진</b>일 때만 글에 써요.</span><button class="btn sm dark" data-act="inYes" data-i="${it.id}">동의받았어요</button><button class="btn sm ghost" data-act="inNo" data-i="${it.id}">쓰지 않기</button></div>`;
  return '';
}
function viewHome(){
  const t=curTopics(),wk=weekPosts().length,goal=3,d=new Date();
  const mats=Object.values(M),photos=mats.filter(m=>m.thumb&&!m.archived&&m.rep).length,ug=unusedGood().length,pend=mats.filter(m=>m.status==='pending').length;
  const lastPost=S.posts[S.posts.length-1];const reward=lastPost&&lastPost.mats&&lastPost.mats.length?`지난 글 ‘${lastPost.topic}’에 자료 ${lastPost.mats.length}개를 썼어요.`:'';
  return `
  ${S.example?`<div class="banner info"><span>지금은 <b>예시 매장(온기카페)</b>이에요. 그대로 눌러보셔도 되고, 내 가게로 바꿔도 돼요.</span><button class="btn sm" data-act="reset">내 가게로 시작</button></div>`:''}
  ${UI.sampleOff?`<div class="banner warn"><span>Claude 연결이 허용되지 않아 기본 문구로 만들어요. 자료 자동 정리도 멈춰 있어요.</span></div>`:''}
  ${!S.example&&reqStatus().missing.length?`<div class="banner warn"><span>필수 정보 <b>${reqStatus().missing.length}개</b>가 비어 있어요. 채워야 우리 가게에 맞는 글이 나와요.</span><button class="btn sm" data-act="openSetup">2분 만에 채우기</button></div>`:''}
  ${S.inbox.length?`<section class="card stack" style="border-color:var(--accent)"><div class="row between"><h2>확인할 것 ${S.inbox.length}건</h2><span class="muted xs">올린 자료에서 찾았어요. 확인한 것만 글에 써요</span></div><div>${S.inbox.slice(0,UI.inboxOpen?50:3).map(inboxCard).join('')}</div>${S.inbox.length>3&&!UI.inboxOpen?`<button class="btn sm ghost" data-act="inboxAll">모두 보기</button>`:''}</section>`:''}
  ${S.guideHidden?'':`<section class="card stack" style="background:var(--info-soft);border-color:transparent">
    <div class="row between"><h2 style="color:var(--info)">이렇게 써요</h2><button class="btn sm ghost" data-act="hideGuide">알겠어요, 접기</button></div>
    <div class="grid3">
      <div class="stack" style="gap:4px"><b>① 시작하기</b><span class="small"><b>오늘 찍은 사진</b>을 올리거나, 아래 <b>추천 주제</b>를 고르세요.</span></div>
      <div class="stack" style="gap:4px"><b>② 글 확인</b><span class="small">사진·가게 정보로 6개 채널 글을 써요. 고칠 곳만 고치면 돼요.</span></div>
      <div class="stack" style="gap:4px"><b>③ 올리기</b><span class="small"><b>승인</b>을 누르면 채널에 올라가요. 결과와 남은 일은 <b>현황</b>에서 봐요.</span></div>
    </div><p class="xs" style="color:var(--info)">메뉴판·전단지·예전 사진은 시간 날 때 맨 뒤 <b>자료함</b>에 모아두세요. 모일수록 글이 좋아져요.</p></section>`}
  <section class="card stack" style="border:2px solid var(--accent)">
    <h2>오늘 찍은 사진이 있나요?</h2>
    <p class="small muted">사진 한 장만 올리면 무엇을 알릴지 주제를 제안하고, 바로 글을 써요.</p>
    <div class="row"><button class="btn primary lg" data-act="shoot" data-v="new">${ic('cam',20)}사진 찍기</button><button class="btn lg" data-act="uploadForPost">${ic('box',20)}앨범·파일에서 고르기</button></div>
  </section>
  <div class="row between" style="align-items:flex-end">
    <div class="stack" style="gap:4px"><span class="muted small">${d.getMonth()+1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일 · ${esc(seasonHint())}</span><h1>사진이 없다면, 추천 주제로 시작해요</h1></div>
    <button class="btn sm" data-act="aiTopics">${ic('spark',16)}${t.ai?'다시 추천받기':'우리 가게 맞춤 추천'}</button>
  </div>
  <p class="muted small" style="margin-top:-10px">${t.ai?'매장 정보·가게 이야기·자료함·최근 글을 보고 Claude가 골랐어요.':'기본 제안이에요. [우리 가게 맞춤 추천]을 누르면 자료함까지 보고 골라드려요.'} 카드 위 사진은 <b>자료함에 이미 있는 사진</b>이에요. 누르면 사진과 내용을 확인하는 화면으로 가요.</p>
  <div class="topics">${t.list.map((x,i)=>{const m=(x.matIds||[]).map(id=>M[id]).find(m=>m&&m.thumb);return `
    <button class="topic" data-act="pickTopic" data-i="${i}">
      <span class="th" style="position:relative">${m?`<img src="${m.thumb}" alt=""><span class="chip" style="position:absolute;left:8px;bottom:8px">자료함 사진</span>`:`<span class="stack" style="align-items:center;gap:4px">${ic('cam',28)}<span class="xs">맞는 사진이 없어요 · 다음 화면에서 찍을 수 있어요</span></span>`}</span>
      <span class="tb"><span class="chip accent" style="align-self:flex-start">${esc(x.tag||x.kind||'')}</span><span class="t">${esc(x.title)}</span><span class="muted small">${esc(x.why)}</span>
      <span class="basis">${(x.basis||[]).map(b=>`<span><b>${esc(b.k)}</b> ${esc(b.v)}</span>`).join('')}</span><span class="go">이 주제로 준비하기 →</span></span>
    </button>`;}).join('')}</div>
  <section class="card stack">
    <div class="row between"><h2>이번 주</h2><button class="btn sm" data-act="nav" data-v="status">현황 보기</button></div>
    <div class="row between"><span class="small"><b>${wk}</b> / ${goal}건 올림${pendingActions().length?` · <b style="color:var(--accent-text)">할 일 ${pendingActions().length}개</b>`:''}</span><span class="xs muted">${wk>=goal?'목표 달성! 무리해서 더 올리지 않아도 돼요':'하루 한 개면 충분해요'}</span></div>
    <div style="height:8px;border-radius:99px;background:var(--chip);overflow:hidden"><div style="height:100%;width:${Math.min(100,wk/goal*100)}%;background:var(--accent)"></div></div>
  </section>
  <div class="grid2">
    <section class="card stack">
      <div class="row"><span class="chip ink">오늘의 질문</span><span class="muted xs">30초 · 답이 ‘가게 이야기’에 쌓여 글에 들어가요</span></div>
      <label class="lbl" for="qAsk">질문 <span class="muted xs">제안 질문을 고치거나 직접 적어도 돼요</span></label>
      <textarea id="qAsk" class="inp" rows="2" placeholder="예) 단골손님이 가장 자주 시키는 메뉴는요?">${esc(UI.qAsk!=null?UI.qAsk:curQuestion())}</textarea>
      <label class="lbl" for="qAns">답변</label>
      <textarea id="qAns" class="inp" rows="3" placeholder="말하듯 짧게 적어주세요">${esc(UI.qDraft)}</textarea>
      <div class="row">${cap.dict?`<button class="btn sm mic ${dictTarget==='qAns'?'on':''}" data-act="dict" data-t="qAns">${ic('mic',16)}${dictTarget==='qAns'?'듣는 중… 누르면 멈춤':'말로 답하기'}</button>`:''}<button class="btn sm ghost" data-act="nextQ">다른 질문</button><button class="btn sm dark" data-act="saveQ" style="margin-left:auto">저장</button></div>
    </section>
    <section class="card stack">
      <div class="row between"><h2>자료함</h2><button class="btn sm" data-act="nav" data-v="library">열기</button></div>
      <div class="row" style="gap:18px"><span><b style="font-size:24px">${photos}</b> <span class="muted small">사진</span></span><span><b style="font-size:24px">${S.stories.length}</b> <span class="muted small">이야기</span></span><span><b style="font-size:24px;color:var(--accent-text)">${ug}</b> <span class="muted small">아직 안 쓴 좋은 사진</span></span></div>
      ${pend?`<div class="row small"><span class="spinner s"></span>${pend}개 정리 중 · 끝나면 추천에 들어가요</div>`:''}
      <p class="small muted">${reward||'메뉴판·전단지·예전 사진을 모아두면 글이 좋아져요. 정리는 앱이 해요.'}</p>
    </section>
  </div>`;
}

/* =========================================================
   화면: 자료함
   ========================================================= */
function viewLibrary(){
  const all=Object.values(M).sort((a,b)=>b.at-a.at);
  const f=UI.filter;
  const list=all.filter(m=>f==='보관함'?m.archived:!m.archived&&m.rep&&(f==='전체'||m.kind===f||(f==='쓰지 않음'&&m.excluded)));
  const groupCount=g=>g?all.filter(x=>x.group===g).length:1;
  const counts={};all.filter(m=>!m.archived&&m.rep).forEach(m=>counts[m.kind]=(counts[m.kind]||0)+1);
  return `
  <div class="row between"><div class="stack" style="gap:4px"><h1>자료함</h1><p class="muted">계속 올리셔도 돼요. 정리는 알아서 하고, 글마다 맞는 것만 골라 써요.</p></div>
    <div class="row"><button class="btn primary" data-act="upload">${ic('box',18)}사진·파일 올리기</button><button class="btn" data-act="textMat">${ic('text',18)}글 붙여넣기</button></div></div>
  <div class="card stack" style="padding:14px"><b>무엇을 올리면 좋나요?</b><div class="grid3"><span class="small"><b>사진</b> · 메뉴, 매장 안팎, 만드는 과정, 사람(동의받은 경우)<br><span class="muted xs">JPG·PNG 등 · 여러 장 한 번에</span></span><span class="small"><b>파일</b> · 메뉴판·전단지·가격표·안내문<br><span class="muted xs">PDF(앞 5쪽), Word(docx), Excel(xlsx), 텍스트</span></span><span class="small"><b>글</b> · 손님 후기, 예전에 쓴 블로그 글, 공지 문구<br><span class="muted xs">복사해서 붙여넣기</span></span></div><span class="xs muted">한글(hwp)·파워포인트는 아직 못 읽어요. PDF로 저장하거나 사진으로 찍어 올려주세요. 파일 속 가격·이벤트는 ‘확인할 것’으로 물어본 뒤에만 써요.</span></div>
  <div class="banner info"><span><b>이렇게 정리해요</b> · 비슷한 사진은 묶어 잘 나온 한 장만 써요 · 가격·이벤트가 보이면 ‘확인할 것’으로 물어봐요 · 얼굴이 보이면 동의 전까지 안 써요 · 3개월 안 쓴 자료와 끝난 이벤트는 보관함으로 옮겨요</span></div>
  <div class="tabs" role="tablist">${['전체'].concat(KINDS).concat(['쓰지 않음','보관함']).map(k=>`<button class="tab" role="tab" aria-selected="${f===k}" data-act="filter" data-v="${k}">${k}${counts[k]?` <span class="muted xs">${counts[k]}</span>`:''}</button>`).join('')}</div>
  ${list.length?`<div class="lib">${list.map(m=>`
    <article class="mat ${m.excluded?'excl':''}">
      <div class="mi">${m.thumb?`<img src="${m.thumb}" alt="${esc(m.summary)}" style="${m.src==='doc'?'object-fit:contain;background:#fff':''}">`:`<div class="stack" style="align-items:center;gap:6px;padding:12px;text-align:center">${ic('text',26)}<span class="xs">${esc((m.text||'').slice(0,60))}</span></div>`}
        <div class="ov">${m.src==='doc'?'<span class="chip info">문서</span>':''}${m.status==='pending'?'<span class="chip info">정리 중</span>':''}${m.status==='error'?'<span class="chip bad">정리 실패</span>':''}${m.pinned?'<span class="chip accent">자주 써요</span>':''}${m.faces?'<span class="chip warn">얼굴</span>':''}${groupCount(m.group)>1?`<span class="chip">비슷한 사진 ${groupCount(m.group)}장</span>`:''}${m.example?'<span class="chip">예시</span>':''}</div></div>
      <div class="mb">
        <div class="row" style="gap:6px"><span class="chip ${m.kind==='이벤트'?'warn':''}">${esc(m.kind||'분류 전')}</span>${m.menu.map(n=>`<span class="chip">${esc(n)}</span>`).join('')}</div>
        <span class="small">${esc(m.summary||'정리하는 중이에요')}</span>
        <span class="xs muted">${m.used?`글에 ${m.used}번 씀 · 마지막 ${fmtDay(m.lastUsed)}`:'아직 안 씀'}${m.ends?` · ${esc(m.ends)}까지`:''}${m.src==='photo'?` · 품질 ${Math.round((m.quality||0)*100)}`:''}</span>
        ${m.status==='manual'?`<label class="sr" for="k${m.id}">종류</label><select id="k${m.id}" class="inp" style="min-height:36px;padding:4px 8px" data-kind="${m.id}">${KINDS.map(k=>`<option ${m.kind===k?'selected':''}>${k}</option>`).join('')}</select>`:''}
        <div class="acts">
          ${m.archived?`<button class="btn" data-act="unarchive" data-v="${m.id}">꺼내기</button>`:`
          <button class="btn" data-act="pin" data-v="${m.id}" aria-pressed="${m.pinned}">${ic('pin',14)}${m.pinned?'고정 해제':'자주 써줘'}</button>
          <button class="btn" data-act="excl" data-v="${m.id}" aria-pressed="${m.excluded}">${ic('ban',14)}${m.excluded?'다시 쓰기':'쓰지 마'}</button>`}
          ${m.status!=='pending'?`<button class="btn" data-act="editMat" data-v="${m.id}">${ic('edit',14)}수정</button>`:''}
          <button class="btn ghost" data-act="delMat" data-v="${m.id}" aria-label="지우기" style="flex:none;width:36px">${ic('trash',14)}</button>
        </div>
      </div>
    </article>`).join('')}</div>`:`<div class="card muted">${f==='보관함'?'보관함이 비어 있어요.':'아직 자료가 없어요. 메뉴·공간·만드는 과정·손님 후기 캡처를 올려보세요.'}</div>`}`;
}

/* =========================================================
   화면: 우리 가게 (기본 정보 + 업종 항목 + 채널)
   ========================================================= */
function reqChipsHtml(){
  const p=S.profile,T=IND[p.industry],f=p.fields||{};
  return T.req.map(r=>{const v=f[r.k];const has=x=>Array.isArray(v)?v.includes(x):v===x;const ok=Array.isArray(v)?v.length>0:!!v;
    return `<div class="stack" style="gap:6px"><span class="lbl">${r.label} ${ok?'<span class="chip good">✓</span>':'<span class="chip warn">필수</span>'} <span class="muted xs">${r.type==='one'?'하나 고르기':'여러 개 가능'}</span></span>
      <div class="row" style="gap:6px">${r.options.map(o=>`<button class="tab" style="height:40px" aria-pressed="${has(o)}" aria-selected="${has(o)}" data-act="fieldChip" data-k="${r.k}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`;}).join('');
}
function itemsHtml(){
  const p=S.profile,T=IND[p.industry];
  return `<div class="row between"><span class="lbl">${T.item} · 가격 ${T.itemOptional?'<span class="muted xs">(선택 · 수강료를 공개하지 않으면 비워두세요)</span>':p.menu.length?'<span class="chip good">✓</span>':'<span class="chip warn">필수 · 1개 이상</span>'}</span><button class="btn sm" data-act="menuPhoto">${ic('cam',16)}${T.sheet} 사진으로 채우기</button></div>
    ${UI.menuBusy?`<div class="row small"><span class="spinner s"></span>${T.sheet}를 읽고 있어요…</div>`:''}
    ${UI.menuReview?`<div class="banner warn" style="flex-direction:column;align-items:stretch"><b>사진에서 읽은 내용이에요. 맞는 것만 체크해 주세요.</b>${UI.menuReview.map((m,i)=>`<label class="row small" style="gap:8px"><input type="checkbox" data-mr="${i}" ${m.ok?'checked':''}> ${esc(m.name)} · ${m.price?won(m.price):'가격 못 읽음'}</label>`).join('')}<div class="row"><button class="btn sm dark" data-act="menuApply">체크한 것 넣기</button><button class="btn sm ghost" data-act="menuCancel">취소</button></div></div>`:''}
    <div>${p.menu.map((m,i)=>`<div class="list-row"><span style="flex:1">${esc(m.name)}</span><b style="font-variant-numeric:tabular-nums">${won(m.price)}</b><button class="btn sm ghost" data-act="delMenu" data-i="${i}" aria-label="${esc(m.name)} 지우기">${ic('trash',16)}</button></div>`).join('')||`<p class="muted small">${T.sheet} 사진을 찍으면 AI가 읽어 채워요. 가격이 없으면 글에 가격을 쓰지 않아요.</p>`}</div>
    <div class="row" style="flex-wrap:nowrap"><label class="sr" for="mName">${T.item} 이름</label><input id="mName" class="inp" placeholder="${esc(T.itemPh)}"><label class="sr" for="mPrice">가격</label><input id="mPrice" class="inp" inputmode="numeric" placeholder="가격(원)" style="max-width:120px"><button class="btn" data-act="addMenu">추가</button></div>`;
}
function strengthsHtml(){
  const p=S.profile,T=IND[p.industry],e=UI.storeEdit;
  return `<div>${p.strengths.map((s,i)=>e&&e.i===i?`<div class="stack" style="padding:10px 0"><label class="sr" for="strEdit">장점 고치기</label><input id="strEdit" class="inp" value="${esc(s)}"><div class="row" style="justify-content:flex-end"><button class="btn sm ghost" data-act="cancelEdit">취소</button><button class="btn sm dark" data-act="saveStr" data-i="${i}">저장</button></div></div>`
      :`<div class="list-row"><span class="chip accent">${i+1}</span><span style="flex:1">${esc(s)}</span><button class="btn sm ghost" data-act="editStr" data-i="${i}" aria-label="고치기">${ic('edit',16)}</button><button class="btn sm ghost" data-act="delStr" data-i="${i}" aria-label="지우기">${ic('trash',16)}</button></div>`).join('')}</div>
    <div class="row" style="flex-wrap:nowrap"><label class="sr" for="strNew">새 장점</label><input id="strNew" class="inp" placeholder="손님이 여기를 고를 이유 한 가지"><button class="btn" data-act="addStr">추가</button></div>
    <div class="stack" style="gap:6px"><span class="xs muted">예시를 누르면 칸에 들어가요. 우리 가게에 맞게 고쳐서 추가하세요.</span><div class="row" style="gap:6px">${T.strengthsEx.map(x=>`<button class="tab" style="height:36px;font-size:13px" data-act="strEx" data-v="${esc(x)}">+ ${esc(x)}</button>`).join('')}</div></div>`;
}
function viewSetup(){
  const st=UI.setupStep||1,p=S.profile,T=IND[p.industry];
  const steps=['업종','기본 정보',`${T.label} 정보`,'우리 가게 자랑'];
  const can={1:!!UI.indPicked||S.setupDone,2:!!(p.name.trim()&&p.area.trim()&&p.hours.trim()),3:T.req.every(r=>{const v=(p.fields||{})[r.k];return Array.isArray(v)?v.length:!!v;})&&(T.itemOptional||p.menu.length>0),4:p.strengths.length>0}[st];
  const miss3=T.req.filter(r=>{const v=(p.fields||{})[r.k];return !(Array.isArray(v)?v.length:v);}).map(r=>r.label).concat(!T.itemOptional&&!p.menu.length?[T.item+' 1개']:[]);
  const need={1:'업종을 골라주세요',2:'이름·동네·영업시간을 적어주세요',3:`남은 것: ${miss3.join(', ')}`,4:'자랑을 1개 이상 넣어주세요'}[st];
  let body='';
  if(st===1)body=`<h1>어떤 가게인가요?</h1><p class="muted">업종에 맞는 질문만 드릴게요. 나중에 바꿀 수 있어요.</p>
    <div class="grid3">${IND_ORDER.map(k=>`<button class="card stack" style="text-align:left;gap:4px;${(UI.indPicked||S.setupDone)&&p.industry===k?'border:2px solid var(--accent);background:var(--accent-soft)':''}" data-act="setInd" data-v="${k}" aria-pressed="${p.industry===k}"><b style="font-size:17px">${IND[k].label}</b><span class="small muted">${IND[k].desc}</span></button>`).join('')}</div>`;
  if(st===2)body=`<h1>기본 정보</h1><p class="muted">손님이 찾아올 때 꼭 필요한 것만 받아요.</p>
    <div class="card stack"><div class="grid2" style="gap:12px">
      <div class="stack" style="gap:6px"><label class="lbl" for="pName">${p.industry==='academy'?'학원 이름':p.industry==='hospital'?'병원 이름':'가게 이름'}</label><input id="pName" class="inp" data-field="name" value="${esc(p.name)}"></div>
      <div class="stack" style="gap:6px"><label class="lbl" for="pArea">동네</label><input id="pArea" class="inp" data-field="area" value="${esc(p.area)}" placeholder="예) 성수동"></div>
      <div class="stack" style="gap:6px"><label class="lbl" for="pHours">${p.industry==='academy'?'운영 시간':p.industry==='hospital'?'진료 시간':'영업시간'}</label><input id="pHours" class="inp" data-field="hours" value="${esc(p.hours)}" placeholder="${p.industry==='hospital'?'예) 평일 09:00–18:00, 토 09:00–13:00, 일요일 휴진':'예) 매일 10:00–21:00, 월요일 휴무'}"></div>
      <div class="stack" style="gap:6px"><span class="lbl">글 말투</span><div class="row">${[['warm','다정하게'],['clean','깔끔하게'],['fun','유쾌하게']].map(([k,l])=>`<button class="tab" aria-pressed="${p.tone===k}" aria-selected="${p.tone===k}" data-act="tone" data-v="${k}">${l}</button>`).join('')}</div></div>
    </div></div>`;
  if(st===3)body=`<h1>${T.label}라면 꼭 필요한 정보</h1><p class="muted">눌러서 고르기만 하면 돼요. 손님이 가장 많이 묻는 것들이에요.</p>
    <div class="card stack">${reqChipsHtml()}</div><div class="card stack">${itemsHtml()}</div>`;
  if(st===4)body=`<h1>우리 가게 자랑</h1><p class="muted">손님이 다른 곳 대신 여기를 고를 이유예요. 1개면 시작할 수 있고, 3개면 좋아요.</p><div class="card stack">${strengthsHtml()}</div>`;
  return `<div class="stack" style="gap:8px;max-width:820px;width:100%;margin:0 auto">
    <div class="row between"><span class="small muted">처음 설정 · ${st}/4 · ${steps[st-1]}</span>${S.setupDone?`<button class="btn sm ghost" data-act="nav" data-v="store">닫기</button>`:''}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">${steps.map((_,i)=>`<i style="height:6px;border-radius:9px;background:${i<st?'var(--accent)':'var(--line)'}"></i>`).join('')}</div>
    ${body}
    <div class="row between" style="margin-top:8px">${st>1?`<button class="btn" data-act="setupStep" data-v="${st-1}">이전</button>`:'<span></span>'}
      ${can?`<button class="btn primary lg" data-act="${st<4?'setupStep':'setupDone'}" data-v="${st+1}">${st<4?'다음':'다 됐어요, 시작하기'}</button>`:`<button class="btn lg" disabled>${need}</button>`}</div>
  </div>`;
}
function viewStore(){
  const p=S.profile,T=IND[p.industry],r=reqStatus();
  const extra=T.extra||[];const filled=extra.filter(([k])=>p.extra&&p.extra[k]).length;
  return `
  <div class="row between"><div class="stack" style="gap:4px"><h1>우리 가게</h1><p class="muted">AI는 여기 정보와 자료함으로만 글을 써요. 가격·영업시간이 이 값과 다르면 앱이 고쳐요.</p></div><span class="chip ${r.missing.length?'warn':'good'}" style="font-size:13px;padding:6px 12px">필수 ${r.done}/${r.total}</span></div>
  ${r.missing.length?`<div class="banner warn"><span>비어 있는 필수 정보: <b>${r.missing.map(x=>x.label).join(', ')}</b></span><button class="btn sm" data-act="openSetup">하나씩 채우기</button></div>`:''}
  <div class="grid2">
    <section class="card stack"><h2>기본 정보</h2>
      <div class="stack" style="gap:6px"><label class="lbl" for="pIndustry">업종 <span class="muted xs">(바꾸면 아래 필수 항목이 바뀌어요)</span></label><select id="pIndustry" class="inp" data-field="industry">${IND_ORDER.map(k=>`<option value="${k}" ${p.industry===k?'selected':''}>${IND[k].label} · ${IND[k].desc}</option>`).join('')}</select></div>
      <div class="grid2" style="gap:12px">
        <div class="stack" style="gap:6px"><label class="lbl" for="pName">이름</label><input id="pName" class="inp" data-field="name" value="${esc(p.name)}"></div>
        <div class="stack" style="gap:6px"><label class="lbl" for="pArea">동네</label><input id="pArea" class="inp" data-field="area" value="${esc(p.area)}" placeholder="예) 성수동"></div>
      </div>
      <div class="stack" style="gap:6px"><label class="lbl" for="pHours">영업·운영 시간</label><input id="pHours" class="inp" data-field="hours" value="${esc(p.hours)}" placeholder="예) 매일 10:00–21:00, 월요일 휴무"></div>
      <div class="stack" style="gap:6px"><span class="lbl">글 말투</span><div class="row">${[['warm','다정하게'],['clean','깔끔하게'],['fun','유쾌하게']].map(([k,l])=>`<button class="tab" aria-pressed="${p.tone===k}" aria-selected="${p.tone===k}" data-act="tone" data-v="${k}">${l}</button>`).join('')}</div></div>
    </section>
    <section class="card stack"><h2>${T.label} 필수 정보</h2>${reqChipsHtml()}</section>
  </div>
  <div class="grid2">
    <section class="card stack">${itemsHtml()}</section>
    <section class="card stack"><div class="row between"><h2>우리 가게 자랑</h2>${p.strengths.length?'<span class="chip good">✓</span>':'<span class="chip warn">필수</span>'}</div>${strengthsHtml()}</section>
  </div>
  <div class="grid2">
    <section class="card stack"><div class="row between"><h2>있으면 좋은 정보 <span class="muted small">(선택)</span></h2><span class="chip">${filled}/${extra.length}</span></div>
      ${extra.map(([k,l,ph])=>`<div class="stack" style="gap:4px"><label class="lbl" for="x_${k}">${l}</label><input id="x_${k}" class="inp" data-extra="${k}" value="${esc((p.extra||{})[k]||'')}" placeholder="${esc(ph)}"></div>`).join('')}
    </section>
    <section class="card stack"><h2>쓰지 말 것</h2><p class="small muted">이 표현은 글에서 앱이 빼요.</p>
      <div class="row">${p.banned.map((b,i)=>`<span class="chip" style="height:36px;padding:0 2px 0 12px">${esc(b)}<button class="btn sm ghost" style="height:30px;padding:0 6px" data-act="delBan" data-i="${i}" aria-label="${esc(b)} 빼기">${ic('x',14)}</button></span>`).join('')}</div>
      <div class="row" style="flex-wrap:nowrap"><label class="sr" for="banNew">추가할 표현</label><input id="banNew" class="inp" placeholder="예) 가성비 끝판왕"><button class="btn" data-act="addBan">추가</button></div>
    </section>
  </div>
  <section class="card stack"><div class="row between"><h2>가게 이야기</h2><span class="muted small">오늘의 질문·사진 질문 답변</span></div>
    ${S.stories.length?S.stories.slice().reverse().map((s,ri)=>{const i=S.stories.length-1-ri;return `<div class="list-row" style="align-items:flex-start"><div class="stack" style="gap:2px;flex:1"><span class="muted small">Q. ${esc(s.q)}</span><span>${esc(s.a)}</span></div><button class="btn sm ghost" data-act="delStory" data-i="${i}" aria-label="지우기">${ic('trash',16)}</button></div>`;}).join(''):'<p class="muted small">오늘 화면의 질문에 답해 보세요.</p>'}
  </section>
  ${snsCard()}
  ${channelsCard()}`;
}
function snsCard(){
  const sns=S.profile.sns||(S.profile.sns=emptySns());
  const filled=SNS_FIELDS.filter(x=>(sns[x.k]||'').trim()).length;
  return `<section class="card stack"><div class="row between"><h2>SNS</h2><span class="chip">${filled}/${SNS_FIELDS.length}</span></div>
    <p class="small muted">손님에게 알려줄 계정·주소예요. 비워 두면 글에 넣지 않아요. 채널 연결과 별개입니다.</p>
    <div class="grid2" style="gap:12px">${SNS_FIELDS.map(x=>`<div class="stack" style="gap:4px"><label class="lbl" for="sns_${x.k}">${x.label}</label><input id="sns_${x.k}" class="inp" data-sns="${x.k}" value="${esc(sns[x.k]||'')}" placeholder="${esc(x.ph)}" inputmode="url" autocomplete="url"></div>`).join('')}</div>
  </section>`;
}
function channelsCard(){
  return `<section class="card stack"><div class="row between"><h2>채널 연결</h2><span class="chip warn">시연 모드</span></div>
    <div class="grid2" style="align-items:start">
      <div class="stack"><div class="row">${chMark(CHMAP.blog,40)}<div class="stack" style="gap:0;flex:1"><b>매장 PC · 네이버 블로그</b><span class="small muted">크롬 확장이 설치된 PC가 올려요</span></div><span class="chip ${S.pcOn?'good':'warn'}">${S.pcOn?'켜짐':'꺼짐'}</span></div>
        <p class="small muted">휴대폰 크롬은 확장을 지원하지 않아요. 승인은 어디서든, 블로그 올리기는 매장 PC가 해요. 꺼져 있으면 켜질 때 올리고, 급하면 복사해서 올려요.</p>
        <button class="btn" data-act="pc">${S.pcOn?'시연: PC 끄기':'시연: PC 켜기'}</button></div>
      <div>${CH.filter(c=>c.id!=='blog').map(c=>{const on=!!S.conn[c.id];let sub=c.how;if(c.id==='shorts')sub=S.shortsAudited?'공개 업로드 가능':'구글 감사 전 · 비공개 업로드만';if(c.id==='place')sub='스마트플레이스 › 내 업체 › 솔루션 › 블로그 새소식 연결 (1회)';
        return `<div class="list-row">${chMark(c)}<div class="stack" style="gap:0;flex:1"><b>${c.name}</b><span class="xs muted">${esc(sub)}</span></div>${c.id==='daangn'?'<span class="chip accent">복사 방식</span>':`<button class="btn sm ${on?'':'dark'}" data-act="conn" data-v="${c.id}">${on?'해제':c.id==='place'?'설정했어요':'연결'}</button>`}</div>`;}).join('')}
        <div class="list-row"><span class="small" style="flex:1">시연: 유튜브 구글 감사</span><button class="btn sm" data-act="audit">${S.shortsAudited?'감사 전으로':'통과로'}</button></div></div>
    </div></section>`;
}

/* =========================================================
   화면: 새 글
   ========================================================= */
function newFlow(topic,matIds,kind){
  const lastAud=(S.lastAud||[]).filter(a=>(AUD[S.profile.industry]||[]).includes(a));
  const h=IND[S.profile.industry].postHour;const rec=new Date();rec.setHours(h[0],h[1],0,0);if(rec.getTime()<Date.now()+10*60e3)rec.setDate(rec.getDate()+1);
  return {stage:'input',topic:topic||'',kind:kind||null,note:'',mats:matIds||[],photo:null,photoMat:null,drafts:null,orig:null,tab:'blog',
    selected:['blog','insta','shorts','threads','daangn'].filter(c=>S.conn[c]||c==='daangn').concat(S.conn.place?['place']:[]),whenMode:'rec',recAt:rec.getTime(),when:rec.getTime(),startedAt:null,busy:null,fellBack:false,aud:lastAud,why:[],whyDetail:''};
}
function viewCreate(){
  const f=UI.flow||(UI.flow=newFlow(''));
  if(f.stage==='input')return createInput(f);
  if(f.stage==='gen')return `<div class="card stack" style="align-items:center;padding:44px 18px;text-align:center"><div class="spinner"></div><h2>${esc(f.genMsg||'채널별로 글을 쓰고 있어요')}</h2><p class="muted small">자료 ${f.mats.length}개와 가게 이야기 ${S.stories.length}개를 넣어 6개 채널 글을 따로 써요. 보통 20~40초 걸려요.</p>${usedStrip(f,false)}</div>`;
  if(f.stage==='review')return createReview(f);
  if(f.stage==='done')return createDone(f);
  return '';
}
function usedStrip(f,editable){
  const ms=f.mats.map(id=>M[id]).filter(Boolean);
  if(!ms.length)return `<p class="small muted">${editable?'이번 글에 쓸 자료가 없어요. 자료함에서 골라주세요.':''}</p>`;
  return `<div class="used">${ms.map(m=>`<div class="uchip">${matThumb(m)}<span>${esc(m.summary)}</span>${editable?`<button class="btn ghost" style="height:28px;width:28px;padding:0" data-act="unuse" data-v="${m.id}" aria-label="이번 글에서 빼기">${ic('x',14)}</button>`:''}</div>`).join('')}</div>`;
}
function missingInfo(){const r=reqStatus();return r.missing.length?[[`필수 정보 ${r.missing.length}개가 비어 있어요: ${r.missing.map(x=>x.label).join(', ')}. 채우면 글이 정확해져요.`,'setup']]:[];}
const AUD=Object.fromEntries(Object.entries(IND).map(([k,v])=>[k,v.aud]));
const WHY=Object.fromEntries(Object.entries(IND).map(([k,v])=>[k,v.why]));
const WHY_DETAIL=['이번 주만','할인·혜택','신규 모집','특강 개설','레벨 테스트','신규 할인','이벤트','이번 주 빈 시간'];
const KIND_Q={메뉴:['이 메뉴는 언제부터, 왜 만들게 됐어요?','다른 곳과 다른 재료나 만드는 방법이 있나요?'],공간:['이 자리는 어떤 손님이 주로 앉나요?','이 공간에서 사장님이 가장 좋아하는 순간은요?'],과정:['이 과정은 얼마나 걸리고, 왜 직접 하세요?','손님이 모르는 이 과정의 비밀이 있나요?'],사람:['이 분은 어떤 일을 맡고 계세요?','손님들이 이 분을 좋아하는 이유는요?'],이벤트:['언제까지, 누구에게 어떤 혜택이에요?','이 이벤트를 하는 이유가 있나요?'],후기:['이 후기를 받았을 때 어떤 마음이었어요?','이 손님은 주로 무엇을 드세요?'],글:['이 내용 중 손님이 꼭 알았으면 하는 건요?','요즘 바뀐 점이 있나요?']};
function photoQuestions(pm){if(!pm)return [];if(pm.questions&&pm.questions.length)return pm.questions;if(pm.status==='pending')return [];return KIND_Q[pm.kind]||KIND_Q['메뉴'];}
function ingredients(f){
  const pm=M[f.photoMat];const realPhoto=!!(f.photo&&(f.photoAck||!pm||pm.storePhoto!==false));
  const answers=Object.values(f.answers||{}).filter(x=>x&&x.trim()).length;
  const extra=f.mats.filter(id=>id!==f.photoMat&&M[id]).length;
  return [
    {ok:realPhoto,label:'직접 찍은 가게 사진',hint:'1번에서 찍거나 골라요'},
    {ok:answers>0,label:'사장님만 아는 한 줄',hint:'사진 질문에 한 줄만'},
    {ok:(f.aud||[]).length>0&&((f.why||[]).length>0||(f.note||'').trim().length>0),label:'누구에게 · 왜 지금',hint:'버튼 두 번이면 돼요'},
    {ok:extra>0||S.stories.length>0,label:'함께 넣을 자료',hint:'후기·메뉴판이 있으면 더 좋아요'}
  ];
}
function createInput(f){
  const ph=f.photo,pm=M[f.photoMat],miss=missingInfo(),pending=pm&&pm.status==='pending';
  const notStore=pm&&pm.storePhoto===false&&!f.photoAck;
  const qs=photoQuestions(pm);f.answers=f.answers||{};
  const ing=ingredients(f),okN=ing.filter(i=>i.ok).length;
  const extra=f.mats.filter(id=>id!==f.photoMat).map(id=>M[id]).filter(Boolean);
  const kindLabel=m=>m.src==='text'?'글·후기':m.src==='doc'?'문서':'사진 설명';
  return `
  <div class="row"><button class="btn sm ghost" data-act="nav" data-v="home">${ic('back',16)}오늘로</button></div>
  <div class="stack" style="gap:4px"><h1>글 준비</h1><p class="muted">사진을 확인하고, 사진에 대한 질문에 한 줄만 답해주세요. 그게 다른 가게 글과의 차이를 만들어요.</p></div>
  ${miss.map(([t,v])=>`<div class="banner warn"><span>${t}</span><button class="btn sm" data-act="openSetup">채우러 가기</button></div>`).join('')}
  <div class="grid2">
    <section class="card stack">
      <div class="row"><span class="chip ink">1</span><h2>대표 사진</h2></div>
      ${ph?`<div class="photo"><img src="${ph}" alt="대표 사진"></div>
        ${pending?`<div class="row small"><span class="spinner s"></span>사진을 읽는 중이에요. 무엇이 찍혔는지 보고 주제와 질문을 준비할게요.</div>`:''}
        ${notStore?`<div class="banner warn" style="flex-direction:column;align-items:stretch"><span><b>가게 사진이 아니라 화면 캡처나 문서로 보여요.</b> 손님에게 보여줄 대표 사진으로는 맞지 않아요. 메뉴·매장·만드는 모습을 찍은 사진이 좋아요.</span><div class="row"><button class="btn sm primary" data-act="shoot">${ic('cam',14)}가게 사진 찍기</button><button class="btn sm" data-act="openPicker">자료함에서 고르기</button><button class="btn sm ghost" data-act="ackPhoto">그래도 이 사진 쓰기</button></div></div>`
          :`<p class="small muted">${UI.lastShotId===f.photoMat?'방금 올린 사진이에요. 자료함에도 저장됐어요.':'자료함에서 이 주제에 가장 잘 맞는 사진을 골랐어요.'}${pm&&pm.summary&&!pending?` <b>찍힌 것: ${esc(pm.summary)}</b>`:''}</p>
          <div class="row"><button class="btn sm" data-act="shoot">${ic('cam',14)}${UI.lastShotId===f.photoMat?'다시 찍기':'새로 찍기'}</button><button class="btn sm" data-act="openPicker">자료함에서 다른 사진</button></div>`}`
        :`<div class="banner warn" style="flex-direction:column;align-items:stretch"><span><b>아직 사진이 없어요.</b> 블로그·인스타·쇼츠는 사진이 있어야 올라가요.</span>
          <div class="row"><button class="btn primary" data-act="shoot">${ic('cam',16)}지금 찍기</button><button class="btn" data-act="openPicker">자료함에서 고르기</button><button class="btn ghost" data-act="uploadForPost">앨범에서</button></div></div>`}
    </section>
    <section class="card stack">
      <div class="row"><span class="chip ink">2</span><h2>무엇을 알릴까요?</h2></div>
      <label class="lbl" for="fTopic">주제</label><input id="fTopic" class="inp" value="${esc(f.topic)}" placeholder="${pending?'사진을 보고 주제를 제안하는 중이에요…':notStore?'가게 사진을 올리면 주제를 제안해요':'예) 겨울 신메뉴 유자 라떼'}">
      ${f.topicAuto?'<span class="xs muted">사진을 보고 제안한 주제예요. 바꿔도 돼요.</span>':''}
      ${qs.length&&!notStore?`<div class="stack" style="gap:10px;background:var(--accent-soft);border-radius:14px;padding:14px">
        <b style="color:var(--accent-text)">이 사진에 대해 30초만 알려주세요</b>
        <span class="xs" style="color:var(--accent-text)">AI는 사진만 보고는 모르는 사실이에요. 답은 ‘가게 이야기’에도 저장돼 다음 글에 또 쓰여요.</span>
        ${qs.map((q,i)=>`<div class="stack" style="gap:4px"><label class="lbl" for="pq${i}" style="color:var(--ink)">${esc(q)}</label><div class="row" style="flex-wrap:nowrap"><input id="pq${i}" class="inp" data-pq="${i}" value="${esc(f.answers[i]||'')}" placeholder="짧게, 말하듯">${cap.dict?`<button class="btn mic ${dictTarget==='pq'+i?'on':''}" data-act="dict" data-t="pq${i}" aria-label="말로 답하기">${ic('mic',18)}</button>`:''}</div></div>`).join('')}
      </div>`:''}
      <div class="stack" style="gap:6px"><span class="lbl">누구에게 알릴까요? <span class="muted">(눌러서 고르기 · 여러 개 가능)</span></span>
        <div class="row" style="gap:6px">${(AUD[S.profile.industry]||[]).map(a=>`<button class="tab" style="height:38px" aria-pressed="${(f.aud||[]).includes(a)}" aria-selected="${(f.aud||[]).includes(a)}" data-act="tglAud" data-v="${esc(a)}">${esc(a)}</button>`).join('')}</div></div>
      <div class="stack" style="gap:6px"><span class="lbl">왜 지금 와야 하나요? <span class="muted">(눌러서 고르기)</span></span>
        <div class="row" style="gap:6px">${(WHY[S.profile.industry]||[]).map(a=>`<button class="tab" style="height:38px" aria-pressed="${(f.why||[]).includes(a)}" aria-selected="${(f.why||[]).includes(a)}" data-act="tglWhy" data-v="${esc(a)}">${esc(a)}</button>`).join('')}</div>
        ${(f.why||[]).some(w=>WHY_DETAIL.includes(w))?`<label class="sr" for="fWhyD">기간·혜택 내용</label><input id="fWhyD" class="inp" value="${esc(f.whyDetail)}" placeholder="얼마나·언제까지? 예) 11/24까지 2잔 주문 시 1천원 할인">`:''}</div>
      <details ${f.note?'open':''}><summary class="small" style="cursor:pointer;color:var(--muted)">그 밖에 꼭 넣고 싶은 말 (선택)</summary>
        <div class="row" style="flex-wrap:nowrap;margin-top:8px"><label class="sr" for="fNote">꼭 넣고 싶은 말</label><input id="fNote" class="inp" value="${esc(f.note)}" placeholder="예) 주차는 건물 뒤에 하세요">${cap.dict?`<button class="btn mic ${dictTarget==='fNote'?'on':''}" data-act="dict" data-t="fNote" aria-label="말로 입력">${ic('mic',18)}</button>`:''}</div></details>
    </section>
  </div>
  <section class="card stack">
    <div class="row between"><div class="row"><span class="chip ink">3</span><h2>함께 넣을 자료</h2><span class="chip">자동으로 골라요</span></div><div class="row"><button class="btn sm" data-act="openPicker">자료함에서 더 고르기</button></div></div>
    <div class="grid3" style="background:var(--chip);border-radius:14px;padding:12px">
      <span class="small"><b>왜 넣나요?</b><br>AI는 우리 가게를 몰라요. 진짜 손님 후기, 메뉴판, 다른 사진 설명을 같이 줘야 <b>남의 가게 같은 글</b>이 안 나와요.</span>
      <span class="small"><b>무엇이 들어가나요?</b><br>자료함에 모아둔 <b>사진 설명 · 손님 후기 · 메뉴판/전단지 내용</b> 중 이 주제와 맞는 것을 앱이 골라요.</span>
      <span class="small"><b>제가 할 일은요?</b><br>없어요. 빼고 싶은 것만 ✕를 누르세요. 더 넣고 싶으면 [자료함에서 더 고르기].</span>
    </div>
    ${extra.length?`<div class="stack" style="gap:8px">${extra.map(m=>`<div class="row" style="flex-wrap:nowrap;align-items:flex-start;border:1px solid var(--line);border-radius:12px;padding:8px">${m.thumb?`<img src="${m.thumb}" alt="" style="width:52px;height:52px;border-radius:8px;object-fit:cover;flex:none">`:`<span style="width:52px;height:52px;border-radius:8px;background:var(--chip);display:grid;place-items:center;flex:none">${ic('text',20)}</span>`}<span class="stack" style="gap:2px;flex:1;min-width:0"><span class="chip ${m.src==='text'?'accent':m.src==='doc'?'info':''}" style="align-self:flex-start">${kindLabel(m)}</span><span class="small">${esc(m.summary)}</span><span class="xs muted">글에는 이렇게 쓰여요: ${m.src==='text'?'손님이 한 말·예전 글의 사실을 인용':m.src==='doc'?'적힌 가격·기간 같은 사실 (확인된 것만)':'사진에 담긴 장면을 문장으로 묘사'}</span></span><button class="btn ghost" style="height:32px;width:32px;padding:0;flex:none" data-act="unuse" data-v="${m.id}" aria-label="빼기">${ic('x',16)}</button></div>`).join('')}</div>`
      :`<div class="banner info"><span>이 주제에 맞는 자료가 아직 없어요. <b>없어도 글은 써요.</b> 다음부터는 손님 후기 캡처나 메뉴판 사진을 자료함에 넣어두면 여기에 자동으로 들어와요.</span><button class="btn sm" data-act="nav" data-v="library">자료함 가기</button></div>`}
    <details><summary class="small" style="cursor:pointer;color:var(--muted)">항상 함께 참고하는 것: 가게 이야기 ${S.stories.length}개 · 차별점 ${S.profile.strengths.length}개 · 메뉴 ${S.profile.menu.length}개</summary>
      <div class="stack" style="gap:6px;margin-top:8px">${S.stories.slice(-3).reverse().map(x=>`<span class="small" style="background:var(--chip);border-radius:10px;padding:8px 10px">${esc(x.a.slice(0,70))}${x.a.length>70?'…':''}</span>`).join('')}<span class="xs muted">가격·영업시간은 ‘우리 가게’에 적힌 값만 써요.</span></div></details>
  </section>
  <section class="card stack" style="background:${okN>=3?'var(--good-soft)':'var(--warn-soft)'};border-color:transparent">
    <div class="row between"><b>재료가 충분한가요? ${okN}/4</b><span class="small">${okN>=3?'좋아요, 우리 가게다운 글이 나올 거예요':'이대로도 쓸 수 있지만, 비어 있는 걸 채우면 훨씬 좋아져요'}</span></div>
    <div class="grid2" style="gap:6px">${ing.map(i=>`<span class="small"><span class="sev ${i.ok?'ok':'no'}" style="display:inline-grid;width:18px;height:18px;font-size:11px;margin-right:6px">${i.ok?'✓':'·'}</span><b>${i.label}</b>${i.ok?'':` <span class="muted xs">${i.hint}</span>`}</span>`).join('')}</div>
  </section>
  <button class="btn primary lg block" data-act="generate" ${f.topic.trim()?'':'disabled'}>${f.topic.trim()?'이대로 글 만들기 · 20~40초':'2번에 주제를 적어주세요'}</button>`;
}
function createReview(f){
  const td=todos(f);const c=f.tab,ch=CHMAP[c],d=f.drafts[c]||{body:''};
  return `
  <div class="row"><button class="btn sm ghost" data-act="backInput">${ic('back',16)}주제·자료</button></div>
  <h1>${esc(f.topic)}</h1>
  ${f.fellBack?`<div class="banner warn"><span>Claude를 쓸 수 없어 기본 문구로 만들었어요. 직접 다듬어 주세요.</span></div>`:''}
  ${f.autoNote?`<div class="banner good"><span>${ic('check',16)} ${esc(f.autoNote)} 그대로 올려도 돼요.</span></div>`:''}
  ${td.length?todoCard(td):''}
  ${(f.paceDropped||[]).length?`<div class="banner info"><span>${f.paceDropped.map(x=>CHMAP[x].name).join('·')}은 오늘 이미 올려서 이번 글에선 뺐어요. 몰아서 올리면 노출이 떨어질 수 있어요.</span><button class="btn sm" data-act="when" data-v="tom">하루 뒤로 미루고 넣기</button></div>`:''}
  <div class="card stack" style="padding:14px"><div class="row between"><span class="lbl">이번 글에 쓴 자료</span><button class="btn sm" data-act="openPicker">자료 바꾸고 다시 쓰기</button></div>${usedStrip(f,false)}</div>
  <div class="tabs" role="tablist">${DRAFT_CH.map(x=>`<button class="tab" role="tab" aria-selected="${f.tab===x}" data-act="tab" data-v="${x}">${CHMAP[x].name}${f.selected.includes(x)?'':' <span class="muted xs">(안 올림)</span>'}</button>`).join('')}</div>
  <div class="review">
    <section class="card stack">
      <div class="row">${chMark(ch)}<b style="flex:1">${ch.name}</b><label class="row small" style="gap:6px"><input type="checkbox" data-sel="${c}" ${f.selected.includes(c)?'checked':''} ${S.conn[c]||c==='daangn'?'':'disabled'}> 올리기</label></div>
      ${ch.title?`<label class="lbl" for="dTitle">제목</label><input id="dTitle" class="inp" data-draft="title" value="${esc(d.title||'')}">`:''}
      <label class="lbl" for="dBody">${c==='shorts'?'장면 자막 (줄마다 한 장면)':'본문 · 바로 고쳐도 돼요'}</label>
      <textarea id="dBody" class="inp" data-draft="body" rows="${c==='blog'?14:7}">${esc(d.body||'')}</textarea>
      <div class="row">
        <button class="btn sm" data-act="rw" data-v="short" ${f.busy?'disabled':''}>더 짧게</button>
        <button class="btn sm" data-act="rw" data-v="friendly" ${f.busy?'disabled':''}>더 친근하게</button>
        <button class="btn sm" data-act="rw" data-v="detail" ${f.busy?'disabled':''}>우리 가게 이야기 더 넣기</button>
        ${cap.dict?`<button class="btn sm mic ${dictTarget==='rwVoice'?'on':''}" data-act="dict" data-t="rwVoice">${ic('mic',16)}${dictTarget==='rwVoice'?'말씀하세요… 누르면 적용':'말로 고치기'}</button>`:''}
        <button class="btn sm ghost" data-act="restore">처음 글로</button>
      </div>
      ${f.busy?`<div class="row small"><span class="spinner s"></span>${esc(f.busy)}</div>`:''}
    </section>
    <aside class="sticky">${previewHtml(c,d,f)}</aside>
  </div>
  ${publishPanel(f,td)}`;
}
function todoCard(td){
  return `<section id="todo" class="card stack" style="border:2px solid var(--accent)">
    <h2>올리기 전에 할 일 ${td.length}개</h2>
    ${td.map(t=>`<div class="stack" style="gap:8px;padding:10px 0;border-top:1px solid var(--line)"><span>${esc(t.text)}</span>${t.pb&&t.pb.field?`<span class="xs muted">“…${esc(snippet(UI.flow.drafts[t.ch][t.pb.field],t.pb.token))}…”</span>`:''}<div class="row">${t.acts.map(([act,label,cls])=>`<button class="btn sm ${cls}" data-act="${act.startsWith('nav:')?'nav':act}" ${act.startsWith('nav:')?`data-v="${act.slice(4)}"`:`data-v="${esc(t.id)}"`}>${esc(label)}</button>`).join('')}</div></div>`).join('')}
  </section>`;
}
function snippet(text,token){const i=String(text).indexOf(token);if(i<0)return token;return String(text).slice(Math.max(0,i-18),i+token.length+18).replace(/\n/g,' ');}
function previewHtml(c,d,f){
  const ch=CHMAP[c];
  if(c==='shorts'){const lines=(d.body||'').split('\n').filter(Boolean);return `<div class="preview"><div class="pv-head">${chMark(ch,22)}이렇게 보여요</div><div class="row" style="padding:14px;align-items:flex-start;flex-wrap:nowrap"><div class="shorts-frame">${f.photo?`<img src="${f.photo}" alt="">`:''}<div class="shorts-cap"><span>${esc(lines[0]||'')}</span></div></div><div class="stack" style="gap:6px">${lines.slice(0,3).map((l,i)=>`<div class="small"><span class="muted xs">장면 ${i+1}</span><br><b>${esc(l)}</b></div>`).join('')}<span class="xs muted">사진+자막+음악으로 15초 영상을 만들어요</span></div></div></div>`;}
  return `<div class="preview"><div class="pv-head">${chMark(ch,22)}이렇게 보여요</div>${f.photo&&ch.photo?`<div style="aspect-ratio:${c==='insta'?'1/1':'16/9'};background:var(--chip)"><img src="${f.photo}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></div>`:''}<div class="pv-body">${d.title?`<b style="font-size:16px">${esc(d.title)}</b>\n\n`:''}${esc(d.body||'')}</div></div>`;
}
function publishPanel(f,td){
  const rows=CH.map(c=>{const on=f.selected.includes(c.id);const avail=c.id==='daangn'||c.id==='place'||S.conn[c.id];
    let sub=c.how;if(c.id==='blog'&&!S.pcOn)sub='매장 PC가 꺼져 있어요 · 켜지면 자동으로 올라가요';if(c.id==='place')sub=S.conn.place?'블로그 글이 소식 탭에 하루 안에 떠요':'스마트플레이스에서 ‘블로그 새소식 연결’을 한 번 해주세요';if(c.id==='shorts'&&!S.shortsAudited)sub='지금은 비공개로만 올라가요 (구글 심사 전)';if(c.id==='daangn')sub='글이 복사돼요 · 당근 앱에 붙여넣으면 끝';
    return `<button class="list-row" style="width:100%;background:none;border-left:0;border-right:0;border-top:0;text-align:left" role="switch" aria-checked="${on}" data-act="toggleSel" data-v="${c.id}" ${avail?'':'disabled'}>${chMark(c)}<span class="stack" style="gap:0;flex:1"><b>${c.name}</b><span class="xs muted">${avail?sub:'연결 안 됨 · 우리 가게 › 채널 연결에서 켜요'}</span></span><span class="switch"></span></button>`;}).join('');
  const times=[['now','지금'],['rec','추천 '+fmtTime(f.recAt)],['tom','하루 뒤']];const n=f.selected.length;
  return `<section class="card stack"><div class="row between"><h2>어디에, 언제 올릴까요?</h2><span class="chip warn">시연: 실제로는 안 올라가요</span></div>
    <div class="grid2"><div>${rows}</div><div class="stack">
      <div class="row">${times.map(([k,l])=>`<button class="tab" aria-selected="${f.whenMode===k}" data-act="when" data-v="${k}">${l}</button>`).join('')}</div>
      <p class="xs muted">추천 시간은 ${IND[S.profile.industry].label}에 맞춘 기본 시간이에요.</p>
      ${td.length?`<button class="btn primary lg block" data-act="goTodo">위의 할 일 ${td.length}개만 하면 올릴 수 있어요 ↑</button>`
        :`<button class="btn primary lg block" data-act="approve" ${n?'':'disabled'}>${n?`승인하고 ${n}개 채널에 올리기`:'올릴 채널을 하나 이상 켜주세요'}</button>`}
    </div></div></section>`;
}
function createDone(f){
  const p=S.posts.find(x=>x.id===f.postId);if(!p)return '';
  return `<div class="card stack" style="align-items:center;text-align:center;padding:30px 18px"><span class="sev ok" style="width:64px;height:64px;font-size:30px">✓</span><h1>${p.whenMode==='now'?'올렸어요':'예약했어요'} (시연)</h1><p class="muted">${esc(p.topic)} · ${fmtTime(p.when)}</p>${p.mats.length?`<p class="small">자료함에서 <b>${p.mats.length}개</b>를 썼어요. 다음 글에서는 다른 자료를 먼저 골라요.</p>`:''}</div>
  ${statusList(p)}<div class="row"><button class="btn primary" data-act="nav" data-v="status">현황 보기</button><button class="btn" data-act="newPost">새 글 만들기</button></div>`;
}

/* =========================================================
   자료 고르기 창
   ========================================================= */
function pickerModal(){
  const f=UI.flow;if(!UI.modal||!f)return '';
  const list=Object.values(M).filter(usable).sort((a,b)=>scoreMat(b,f.topic,f.kind)-scoreMat(a,f.topic,f.kind));
  return `<div class="modal-bg" data-act="closeModal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="pkh" data-stop="1">
    <div class="row between"><h2 id="pkh">이번 글에 쓸 자료</h2><button class="btn sm ghost" data-act="closeModal" aria-label="닫기">${ic('x',18)}</button></div>
    <p class="small muted">주제와 잘 맞는 순서예요. 사진을 누르면 넣고 빼요. 별(대표)은 첫 번째로 고른 사진이에요.</p>
    ${list.length?`<div class="lib" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${list.map(m=>`<button class="pick" aria-pressed="${f.mats.includes(m.id)}" data-act="togglePick" data-v="${m.id}">${m.thumb?`<img src="${m.thumb}" alt="">`:`<span style="aspect-ratio:4/3;display:grid;place-items:center">${ic('text',24)}</span>`}<span>${f.photoMat===m.id?'★ ':''}[${esc(m.kind)}] ${esc(m.summary)}</span></button>`).join('')}</div>`:'<p class="muted">쓸 수 있는 자료가 없어요. 사진을 올려주세요.</p>'}
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="upload">${ic('cam',16)}사진 올리기</button>${f.stage==='review'?`<button class="btn" data-act="pickPhotoOnly">사진만 바꾸기</button><button class="btn primary" data-act="pickDone">이 자료로 글 다시 쓰기</button>`:`<button class="btn primary" data-act="pickDone">완료</button>`}</div>
  </div></div>`;
}

/* =========================================================
   발행(시연) · 현황
   ========================================================= */
function simulateStatus(c,mode,when){
  const t=fmtTime(when);
  if(c==='blog')return S.pcOn?{state:mode==='now'?'done':'sched',text:mode==='now'?'매장 PC가 올렸어요':'네이버 예약발행 등록 · '+t}:{state:'wait',text:'매장 PC 꺼짐 · 켜지면 올라가요'};
  if(c==='place')return S.conn.place?{state:'sched',text:'블로그 발행 후 1일 내 노출'}:{state:'manual',text:'블로그 새소식 연결 필요'};
  if(c==='daangn')return{state:'manual',text:'복사해서 붙여넣기'};
  if(c==='shorts'&&!S.shortsAudited)return{state:'sched',text:'비공개 업로드 (감사 전)'};
  return mode==='now'?{state:'done',text:'올라갔어요'}:{state:'sched',text:'예약 · '+t};
}
function statusList(p){
  const cls=s=>({done:'good',sched:'info',wait:'warn',manual:'accent'})[s.state]||'';
  return `<section class="card">${p.channels.map(c=>{const st=p.status[c],ch=CHMAP[c];return `<div class="list-row">${chMark(ch)}<b style="flex:1">${ch.name}</b><span class="chip ${cls(st)}">${esc(st.text)}</span>${(c==='daangn'&&st.state==='manual')||st.state==='wait'?`<button class="btn sm" data-act="copy" data-p="${p.id}" data-c="${c}">${ic('copy',14)}복사</button>`:''}${st.state==='wait'&&S.pcOn?`<button class="btn sm dark" data-act="retry" data-p="${p.id}" data-c="${c}">다시 보내기</button>`:''}${c==='daangn'&&st.state==='manual'?`<button class="btn sm ghost" data-act="markDone" data-p="${p.id}" data-c="${c}">붙여넣었어요</button>`:''}</div>`;}).join('')}</section>`;
}
function pendingActions(){
  const out=[];
  S.posts.slice().reverse().forEach(p=>p.channels.forEach(c=>{const st=p.status[c];if(!st)return;
    if(st.state==='wait')out.push({p,c,text:`‘${p.topic}’ 블로그 글이 매장 PC를 기다리고 있어요`,acts:S.pcOn?[['retry','지금 보내기','dark'],['copy','복사해서 직접 올리기','']]:[['nav:store','PC 상태 보기','dark'],['copy','복사해서 직접 올리기','']]});
    else if(st.state==='manual'&&c==='daangn')out.push({p,c,text:`‘${p.topic}’ 당근 글을 붙여넣어 주세요`,acts:[['copy','글 복사','dark'],['markDone','붙여넣었어요','']]});
    else if(st.state==='manual'&&c==='place')out.push({p,c,text:`플레이스 소식에 뜨려면 블로그 새소식 연결을 한 번 해주세요`,acts:[['nav:store','방법 보기','dark'],['markDone','했어요','']]});
  }));
  return out;
}
function viewStatus(){
  const ps=S.posts.slice().sort((a,b)=>b.when-a.when),wk=weekPosts();
  const noEdit=ps.length?Math.round(ps.filter(p=>!p.edited).length/ps.length*100):null;
  const avgSec=ps.length?Math.round(ps.reduce((a,p)=>a+(p.approveSec||0),0)/ps.length):null;
  const caught=ps.reduce((a,p)=>a+(p.caught||0),0);
  const pa=pendingActions();
  // 이번 주 달력
  const now=new Date();const mon=new Date(now);mon.setHours(0,0,0,0);mon.setDate(now.getDate()-((now.getDay()+6)%7));
  const days=[...Array(7)].map((_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d;});
  const sel=UI.statusDay;
  const list=sel?ps.filter(p=>dayKey(p.when)===sel):ps;
  const mats=Object.values(M).filter(m=>m.rep&&!m.archived),usedN=mats.filter(m=>m.used).length;
  const ls=S.placeStats.slice(-4).reverse();
  const stCls=s=>({done:'var(--good)',sched:'var(--info)',wait:'#E0A100',manual:'var(--accent)'})[s.state]||'var(--line)';
  return `<div class="row between"><div class="stack" style="gap:4px"><h1>현황</h1><p class="muted">올린 글과 아직 남은 일을 한눈에 봐요.${S.example?' 지금은 예시 기록이에요.':''}</p></div><button class="btn primary" data-act="nav" data-v="create">${ic('plus',16)}새 글</button></div>
  ${pa.length?`<section class="card stack" style="border:2px solid var(--accent)"><h2>지금 할 일 ${pa.length}개</h2>${pa.map((x,i)=>`<div class="list-row" style="flex-wrap:wrap">${chMark(CHMAP[x.c])}<span style="flex:1;min-width:180px">${esc(x.text)}</span><div class="row">${x.acts.map(([act,label,cls])=>act.startsWith('nav:')?`<button class="btn sm ${cls}" data-act="nav" data-v="${act.slice(4)}">${label}</button>`:`<button class="btn sm ${cls}" data-act="${act}" data-p="${x.p.id}" data-c="${x.c}">${label}</button>`).join('')}</div></div>`).join('')}</section>`
    :`<div class="banner good"><span>${ic('check',16)} 지금 처리할 일은 없어요.</span></div>`}
  <section class="card stack">
    <div class="row between"><h2>이번 주</h2><span class="muted small">${wk.length}건 올림 · 날짜를 누르면 그날 글만 봐요</span></div>
    <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">${days.map(d=>{const k=dayKey(d.getTime());const dp=ps.filter(p=>dayKey(p.when)===k);const isT=k===today();return `<button data-act="statusDay" data-v="${k}" aria-pressed="${sel===k}" style="border:${sel===k?'2px solid var(--ink)':'1px solid var(--line)'};background:${isT?'var(--accent-soft)':'var(--surface)'};border-radius:12px;padding:8px 4px;min-height:72px;display:flex;flex-direction:column;align-items:center;gap:4px"><span class="xs muted">${WD[d.getDay()]}</span><b style="font-size:16px">${d.getDate()}</b><span style="display:flex;gap:3px">${dp.map(p=>`<span class="dot" style="background:${p.when>Date.now()?'var(--info)':'var(--good)'}"></span>`).join('')}</span></button>`;}).join('')}</div>
    ${sel?`<button class="btn sm ghost" data-act="statusDay" data-v="">전체 보기</button>`:''}
  </section>
  <div class="grid2" style="align-items:start">
    <section class="stack"><h2>${sel?fmtDay(new Date(sel).getTime())+' 글':'올린 글'} <span class="muted small">눌러서 자세히</span></h2>
      ${list.length?list.map(p=>{const m=M[p.photoMat]||M[(p.mats||[])[0]];return `<button class="card" data-act="openPost" data-v="${p.id}" style="text-align:left;display:flex;gap:12px;align-items:center;padding:12px;width:100%">
        <span style="width:64px;height:64px;border-radius:12px;overflow:hidden;background:var(--chip);flex:none;display:grid;place-items:center">${m&&m.thumb?`<img src="${m.thumb}" alt="" style="width:100%;height:100%;object-fit:cover">`:ic('text',22)}</span>
        <span class="stack" style="gap:6px;flex:1;min-width:0"><b>${esc(p.topic)}</b><span class="xs muted">${fmtTime(p.when)}${p.when>Date.now()?' 예정':''}${p.edited?' · 사장님이 고침':''}</span>
          <span class="row" style="gap:6px">${p.channels.map(c=>`<span style="position:relative">${chMark(CHMAP[c],24)}<span class="dot" style="position:absolute;right:-2px;bottom:-2px;border:2px solid var(--surface);width:10px;height:10px;background:${stCls(p.status[c]||{})}"></span></span>`).join('')}</span></span>
        <span class="muted">›</span></button>`;}).join('')
      :`<div class="card stack" style="align-items:flex-start"><span class="muted">${sel?'이날은 올린 글이 없어요.':'아직 올린 글이 없어요.'}</span><button class="btn primary" data-act="nav" data-v="home">오늘의 주제 보러 가기</button></div>`}
      <p class="xs muted">점 색: 초록 올라감 · 파랑 예약 · 노랑 PC 대기 · 주황 사장님 확인 필요</p>
    </section>
    <section class="stack">
      <div class="card stack"><h2>잘 되고 있나요?</h2>
        <div class="list-row"><span style="flex:1">손대지 않고 승인한 글</span><b>${noEdit===null?'–':noEdit+'%'}</b></div>
        <div class="list-row"><span style="flex:1">승인까지 걸린 시간 (평균)</span><b>${avgSec===null?'–':avgSec<60?avgSec+'초':Math.round(avgSec/60)+'분'}</b></div>
        <div class="list-row"><span style="flex:1">올리기 전에 앱이 잡아 고친 실수</span><b>${caught}건</b></div>
        <div class="list-row"><span style="flex:1">글에 쓴 자료</span><b>${usedN} / ${mats.length}개</b></div>
        <p class="xs muted">인스타·쇼츠·스레드의 저장·조회 수는 실제 채널을 연결하면 가져와요. 지어낸 숫자는 보여주지 않아요.</p>
      </div>
      <div class="card stack"><h2>네이버 플레이스 길찾기 · 전화</h2><p class="small muted">네이버가 외부에 주지 않는 숫자라, 스마트플레이스 통계를 보고 주 1회 적어주세요.</p>
        <div class="grid2" style="gap:8px"><div class="stack" style="gap:4px"><label class="lbl" for="psDir">이번 주 길찾기</label><input id="psDir" class="inp" inputmode="numeric"></div><div class="stack" style="gap:4px"><label class="lbl" for="psCall">이번 주 전화</label><input id="psCall" class="inp" inputmode="numeric"></div></div>
        <button class="btn dark" data-act="savePs">기록하기</button>
        ${ls.map(s=>`<div class="list-row small"><span style="flex:1">${esc(s.week)}</span><span>길찾기 <b>${s.dir}</b></span><span>전화 <b>${s.call}</b></span><span class="muted">글 ${s.posts}건</span></div>`).join('')}
      </div>
    </section>
  </div>`;
}
function postModal(){
  const p=S.posts.find(x=>x.id===UI.postId);if(!p)return '';
  const chs=p.channels.filter(c=>c!=='place'&&p.drafts[c]&&p.drafts[c].body);const t=chs.includes(UI.postTab)?UI.postTab:chs[0];const d=t?p.drafts[t]:null;const m=M[p.photoMat];
  return `<div class="modal-bg" data-act="closeModal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="pmh" data-stop="1">
    <div class="row between"><div class="stack" style="gap:2px"><h2 id="pmh">${esc(p.topic)}</h2><span class="small muted">${fmtTime(p.when)}${p.when>Date.now()?' 예정':''}${p.example?' · 예시':''}</span></div><button class="btn sm ghost" data-act="closeModal" aria-label="닫기">${ic('x',18)}</button></div>
    ${statusList(p)}
    ${chs.length?`<div class="tabs" role="tablist">${chs.map(c=>`<button class="tab" role="tab" aria-selected="${t===c}" data-act="postTab" data-v="${c}">${CHMAP[c].name}</button>`).join('')}</div>
    <div class="preview">${m&&m.thumb&&CHMAP[t].photo?`<img src="${m.thumb}" alt="" style="width:100%;max-height:260px;object-fit:cover;display:block">`:''}<div class="pv-body">${d.title?`<b>${esc(d.title)}</b>\n\n`:''}${esc(d.body)}</div></div>`:''}
    ${(p.mats||[]).length?`<span class="lbl">쓴 자료</span><div class="used">${p.mats.map(id=>M[id]).filter(Boolean).map(mm=>`<div class="uchip">${matThumb(mm)}<span>${esc(mm.summary)}</span></div>`).join('')}</div>`:''}
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="copyPost" data-v="${t||''}">${ic('copy',16)}이 글 복사</button><button class="btn" data-act="reusePost">같은 주제로 새 글</button><button class="btn ghost" data-act="delPost">기록 지우기</button></div>
  </div></div>`;
}
function viewLanding(){
  const inApp=S.setupDone&&!S.example;
  const logoSvg=document.querySelector('.brand .logo').innerHTML;
  const startTxt=inApp?'내 가게로 들어가기':'무료로 시작하기';
  const arr='<span class="arr" aria-hidden="true">→</span>';
  const CH=[['네이버 블로그','N','#03C75A','매장 PC의 크롬 확장이 대신 올려요'],['인스타그램','IG','linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)','비즈니스 계정 공식 연결'],['유튜브 쇼츠','▶','#FF0033','사진으로 15초 영상을 자동 편집'],['스레드','@','#111','공식 연결로 바로 게시'],['플레이스 소식','P','#03C75A','블로그 글이 소식에 자동으로 떠요'],['당근','당','#FF6F0F','복사해서 붙여넣기만 하면 끝']];
  const mk=(c)=>`<span class="mk" style="background:${c[2]}">${c[1]}</span>`;
  const INDS=[['음식점','오늘의 메뉴·재료·단골 이야기'],['카페','신메뉴·디저트·공간 분위기'],['학원·교습소','수업 방식·성적 변화·상담 안내'],['미용·뷰티','시술 전후·스타일 제안'],['동네 가게','입고 소식·추천 상품']];
  const icons={cam:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',chat:'<path d="M4 5h16v11H9l-5 4z"/>',ok:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',spark:'<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>',shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',book:'<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>',clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'};
  const I=(k,sz=30)=>`<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[k]}</svg>`;
  const MI={bowl:'<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3"/>',cup:'<path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2"/>',book:'<path d="M4 5c3-1 5-1 8 1v14c-3-2-5-2-8-1z"/><path d="M20 5c-3-1-5-1-8 1v14c3-2 5-2 8-1z"/>',cut:'<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8 16L19 4M16 16L5 4"/>',bag:'<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>'};
  const ichip=(t,k,bg,fg)=>`<span class="chip" style="background:${bg}"><span class="lg2" style="color:${fg}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${MI[k]}</svg></span>${t}</span>`;
  const cchip=(c,bg)=>`<span class="chip" style="background:${bg}"><span class="lg2"><span class="mk" style="background:${c[2]};width:26px;height:26px;border-radius:8px;font-size:11px">${c[1]}</span></span>${c[0]}</span>`;
  const row1=[ichip('음식점','bowl','#F2643A','#F2643A'),cchip(CH[0],'#03A94E'),ichip('카페','cup','#A0652C','#A0652C'),cchip(CH[1],'linear-gradient(90deg,#F58529,#DD2A7B,#8134AF)'),ichip('학원·교습소','book','#2F6BFF','#2F6BFF'),cchip(CH[2],'#E8002D'),ichip('미용·뷰티','cut','#DB2777','#DB2777'),cchip(CH[3],'#222'),ichip('동네 가게','bag','#0B8F86','#0B8F86'),cchip(CH[4],'#16A34A'),cchip(CH[5],'#FF6F0F')].join('');
  const row2=['오늘의 메뉴','신메뉴 소식','수강생 모집','시술 전후','입고 소식','단골 이야기','이벤트 안내','계절 한정','후기 모음','영업시간 안내'].map((t,i)=>`<span class="chip" style="background:${['#FFD84D','#7DD3FC','#C4B5FD','#FDA4AF','#86EFAC','#FDBA74'][i%6]};color:#0A2A33;padding-left:20px">#${t}</span>`).join('');
  return `<div class="ld">
  <div class="ld-strip">지금 보시는 건 시연 버전이에요 · 글은 실제 AI가 쓰고, 채널 발행은 흉내만 내요</div>
  <div class="ld-top"><div class="in"><button class="brand-link" data-act="goLanding" style="border:0;background:transparent;display:flex;align-items:center;gap:10px"><span class="logo" style="width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:#0B6E8A">${logoSvg}</span><b style="font-size:20px;font-weight:900;letter-spacing:-0.04em">마중물</b></button>
    <div class="row" style="margin-left:auto;justify-content:flex-end;flex-wrap:wrap">
      <button class="btn ghost hide-m" data-act="ldScroll" data-v="how">사용법</button><button class="btn ghost hide-m" data-act="ldScroll" data-v="why">차이점</button><button class="btn ghost hide-m" data-act="ldScroll" data-v="faq">자주 묻는 질문</button>
      <button class="bt pri" style="height:44px;padding:0 18px;font-size:14.5px" data-act="ldStart">${startTxt}</button>
      ${(AUTH.user||inApp)
        ?`${AUTH.user?`<span class="small muted hide-m">${esc(AUTH.user.name||AUTH.user.email)}</span>`:''}<button class="btn ghost" data-act="logout">로그아웃</button>`
        :`<button class="btn ghost" data-act="nav" data-v="login">로그인</button><button class="btn dark" data-act="nav" data-v="signup">회원가입</button>`}
    </div></div></div>

  <section class="ld-hero">
    <div class="blob b1"></div><div class="blob b2"></div><div class="rings" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="in">
      <div class="stack" style="gap:28px">
        <span class="pill"><i></i>소상공인 AI 마케팅 · 하루 1분</span>
        <h1 class="mega"><span class="line">사진 한 장</span><span class="line">하루 <span class="t">1분</span>이면</span><span class="line"><span class="hl">손님이 와요.<svg viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true"><path d="M4 22 C 90 6, 200 4, 396 16"/></svg></span></span></h1>
        <p class="lead">가게 사진 한 장 올리고 질문 한두 개에 답하면, 마중물이 블로그·인스타·쇼츠까지 채널마다 다른 글을 써요. 사장님은 읽어보고 <b style="color:var(--ink)">‘올리기’</b>만 누르면 끝이에요.</p>
        <div class="row" style="gap:12px;flex-wrap:wrap"><button class="bt pri" data-act="ldStart">${startTxt} ${arr}</button><button class="bt" data-act="ldDemo">예시 가게로 둘러보기</button></div>
      </div>
      <div>
        <div class="phone" aria-label="사용 흐름 미리보기" role="img">
          <div class="scene on"><div class="sc-top"><span>① 사진 올리기</span><span>오늘</span></div><div class="sc-ph"><div class="cup"></div><span class="steam"></span><span class="steam"></span><span class="steam"></span></div><div class="bubble"><b>찍은 사진 1장</b><br>마중물이 무슨 사진인지 알아서 읽어요</div><div class="okbtn">이 사진으로 글 만들기</div></div>
          <div class="scene"><div class="sc-top"><span>② 한 줄 답하기</span><span>질문 1/2</span></div><div class="bubble">이 라떼, 손님들이 제일 좋아하는 점은요?</div><div class="bubble" style="background:var(--surface);border:1px solid var(--line);margin-left:40px"><span class="typing">직접 만든 흑당 시럽이요</span></div><div class="bubble">좋아요! 이 말이 글의 핵심이 돼요.</div><div class="okbtn">글 만들기</div></div>
          <div class="scene"><div class="sc-top"><span>③ 채널별 글 완성</span><span>6곳</span></div><div class="chgrid">${CH.map(c=>`<div class="chc">${mk(c)}<span>${c[0]}</span></div>`).join('')}</div><div class="bubble">채널마다 길이·말투·해시태그를 다르게 썼어요</div><div class="okbtn">읽어보고 올리기</div></div>
          <div class="scene"><div class="sc-top"><span>④ 사장님 확인</span><span></span></div><div class="done-ring">${I('ok',40).replace('currentColor','#fff')}</div><p style="text-align:center;font-weight:900;font-size:18px;margin:0">올리기 완료!</p><p style="text-align:center;font-size:12.5px;color:var(--muted);margin:6px 18px 0">사장님이 확인한 글만 올라가요</p><div class="okbtn">현황에서 확인하기</div></div>
        </div>
        <div class="dots" aria-hidden="true"><b class="on"></b><b></b><b></b><b></b></div>
      </div>
    </div>
  </section>


  <section style="padding-top:20px;padding-bottom:70px"><div class="in">
    <div class="stack rv" style="gap:14px"><span class="eb">On the way</span><h2 class="sec">글 한 편이 올라가면,<br>손님이 줄지어 찾아와요</h2></div>
    <div class="street rv" id="ldStreet" role="img" aria-label="블로그·인스타·쇼츠 트램을 타고 온 손님들과 길을 걸어온 손님들이 우리 가게 문으로 들어가는 그림">
      <div class="cloud" style="top:30px;width:90px;animation-delay:-6s"></div><div class="cloud" style="top:64px;width:60px;animation-delay:-24s;animation-duration:55s"></div>
      <div class="wire"></div><div class="pole" style="left:18%"></div><div class="pole" style="left:52%"></div>
      <div class="counter" aria-hidden="true">이 그림 속 들어온 손님 <b id="ldCnt">0</b>명</div>
      <div class="rail"></div>
      <div class="tram" aria-hidden="true">${[['쇼츠',CH[2],'#F2643A'],['인스타',CH[1],'#8134AF'],['블로그',CH[0],'#0B6E8A']].map(c=>`<div class="car" style="--hc:${c[2]}"><div class="wins"><i></i><i style="--hc:#E0A33B"></i><i></i></div><div class="lab">${mk(c[1])}<span>${c[0]}</span></div><span class="wh a"></span><span class="wh b"></span></div>`).join('')}</div>
      <div class="walkway"></div>
      <div class="shop" aria-hidden="true"><div class="sign">우리 가게</div><div class="awn"></div><span class="open">OPEN</span><div class="door"></div><div class="win"></div></div>
      ${[['#F2643A','블로그 보고 왔어요',0,'#3B2A20'],['#0B6E8A','',1.5,'#111'],['#6D5BD0','플레이스 소식 봤어요',3,'#7A4B2A'],['#16A34A','',4.5,'#3B2A20'],['#E0A33B','당근에서 봤어요',6,'#111'],['#DB2777','',7.5,'#5B3A1E']].map((c,i)=>`<div class="pp walker" style="--c:${c[0]};--hair:${c[3]};--sx:${8+i*12}%;animation-delay:-${c[2]}s" aria-hidden="true"><div class="bd"><i class="ar b"></i><i class="lg b"></i><i class="lg f"></i><i class="bo"></i><i class="hd"></i><i class="ar f"></i></div>${c[1]?`<span class="say">${c[1]}</span>`:''}</div>`).join('')}
      ${[['#8134AF','인스타 보고!',0,40],['#FF0033','',0.35,110],['#0B6E8A','쇼츠 봤어요',0.7,180],['#F2643A','',1.05,250]].map(c=>`<div class="pp hop walker" style="--c:${c[0]};--hx:calc(var(--stop) + ${c[3]}px * var(--k,1) + 20px);animation-delay:${c[2]}s" aria-hidden="true"><div class="bd"><i class="ar b"></i><i class="lg b"></i><i class="lg f"></i><i class="bo"></i><i class="hd"></i><i class="ar f"></i></div>${c[1]?`<span class="say">${c[1]}</span>`:''}</div>`).join('')}
    </div>
  </div></section>
  <div class="marqwrap" aria-hidden="true"><div class="marq r1"><div>${row1}${row1}</div></div><div class="marq r2"><div>${row2}${row2}</div></div></div>

  <section style="padding-top:80px;padding-bottom:40px"><div class="in rv">
    <div class="stats">
      <div><b data-count="1">0<small>분</small></b><span class="small muted">사장님이 하루에 쓰는 시간</span></div>
      <div><b data-count="6">0<small>곳</small></b><span class="small muted">한 번에 준비되는 채널</span></div>
      <div><b data-count="5">0<small>개</small></b><span class="small muted">업종별 맞춤 질문·주의어</span></div>
      <div><b data-count="100">0<small>%</small></b><span class="small muted">사장님이 확인한 글만 올라가요</span></div>
    </div>
  </div></section>

  <section id="ld-how"><div class="in">
    <div class="stack rv" style="gap:14px"><span class="eb">How it works</span><h2 class="sec">세 번만 누르면<br>오늘 홍보는 끝나요</h2></div>
    <div class="cards">
      ${[['01','cam','사진을 찍어 올려요','오늘 만든 메뉴, 수업 장면, 새로 들어온 상품. 휴대폰으로 찍은 그대로 괜찮아요.','30초'],['02','chat','한두 개 질문에 답해요','“손님이 제일 좋아하는 점은?” 같은 질문에 말로 답해도 돼요. 이게 남들과 다른 글을 만들어요.','20초'],['03','ok','읽어보고 올리기','채널별로 다 써진 글을 확인하고 누르면 끝. 틀린 가격·시간은 마중물이 먼저 고쳐놔요.','10초']].map((c,i)=>`<div class="fc rv" style="transition-delay:${i*.08}s"><span class="corner">${I(c[1])}</span><span class="big">${c[0]}</span><span class="tag">${c[4]}</span><h3>${c[2]}</h3><p class="small muted" style="line-height:1.7">${c[3]}</p></div>`).join('')}
    </div>
  </div></section>

  <section class="dark" id="ld-why"><div class="in" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:56px;align-items:center">
    <div class="stack rv" style="gap:20px"><span class="eb">Why Majungmul</span><h2 class="sec" style="color:#fff">마중물 한 바가지가<br>물을 끌어올리듯</h2>
      <p class="lead">펌프에 붓는 첫 물 한 바가지처럼, 사장님의 한 줄이 손님을 끌어오는 글이 돼요. 마중물은 그 한 줄을 받아 매일 꾸준히 채널을 채웁니다.</p>
      <div class="stack" style="gap:12px;margin-top:6px">${['가게 정보와 자료는 한 번만 넣어두면 계속 써요','글을 쓸 때마다 관련 자료만 골라서 써요','올리기 전에 가격·영업시간을 자동으로 맞춰봐요'].map(t=>`<div class="row" style="gap:12px;align-items:flex-start"><span style="color:#FF9A73;flex:none;margin-top:2px">${I('ok',20)}</span><span style="color:#DDEFF3">${t}</span></div>`).join('')}</div>
    </div>
    <div class="pump rv" aria-hidden="true"><svg viewBox="0 0 400 400" style="position:absolute;inset:0;width:100%;height:100%"><rect x="70" y="70" width="260" height="300" rx="34" fill="none" stroke="#2D5964" stroke-width="3"/></svg><div style="position:absolute;left:73px;right:73px;top:73px;bottom:33px;overflow:hidden;border-radius:32px"><div class="water" style="border-radius:0"><div class="wave"></div></div></div><div style="position:absolute;left:0;right:0;top:28%;text-align:center;font-weight:900;font-size:clamp(26px,3vw,36px);color:#fff;letter-spacing:-0.04em;text-shadow:0 2px 12px rgba(0,0,0,.25)">한 줄 → 6곳</div></div>
  </div></section>

  <section><div class="in">
    <div class="stack rv" style="gap:14px"><span class="eb">Difference</span><h2 class="sec">흔한 AI 글 말고,<br>우리 가게 이야기</h2><p class="lead">사장님만 아는 한마디가 들어가면 글이 달라져요. 아래는 이해를 돕기 위한 예시예요.</p></div>
    <div class="vs rv">
      <div class="card bad"><span class="tag" style="background:#E5E7EB;color:#4B5563">일반 AI 글</span><p style="margin:16px 0 0;line-height:1.8">분위기 좋은 카페에서 맛있는 라떼를 즐겨보세요! 정성을 다해 만든 음료와 편안한 공간이 여러분을 기다립니다. 많은 방문 부탁드립니다.</p></div>
      <div class="card good"><span class="tag" style="background:var(--mint);color:var(--teal)">마중물 글</span><p style="margin:16px 0 0;line-height:1.8">시럽을 사지 않고 <span class="hlt">매일 아침 흑당을 직접 졸여요.</span> 그래서 단맛이 끝까지 진하지 않고 깔끔해요. <span class="hlt">오후 3시 전</span>에 오시면 갓 졸인 시럽으로 만들어 드려요.</p></div>
    </div>
    <div class="cards c4">
      ${[['spark','업종별 질문','음식점·카페·학원마다 손님이 궁금해할 질문을 달리 물어요'],['book','자료 자동 선택','쌓인 사진·메뉴판 중 오늘 글에 맞는 것만 골라 써요'],['shield','틀린 정보 자동 수정','가게 정보와 다른 가격·시간은 올리기 전에 고쳐놔요'],['heart','과장 표현 걸러내기','업종별로 쓰면 안 되는 표현을 미리 피해요']].map((c,i)=>`<div class="fc rv" style="transition-delay:${i*.06}s"><span class="corner">${I(c[0],26)}</span><h3 style="margin-top:44px;font-size:19px">${c[1]}</h3><p class="small muted" style="line-height:1.7">${c[2]}</p></div>`).join('')}
    </div>
  </div></section>

  <section style="background:var(--surface2,#F4F8F9)"><div class="in">
    <div class="stack rv" style="gap:14px"><span class="eb">For your shop</span><h2 class="sec">우리 업종에 맞게<br>처음부터 다르게 물어봐요</h2></div>
    <div class="cards c5">${INDS.map((c,i)=>`<div class="fc rv" style="transition-delay:${i*.05}s;padding:26px 22px"><h3 style="font-size:19px">${c[0]}</h3><p class="small muted" style="line-height:1.6">${c[1]}</p></div>`).join('')}</div>
    <div class="stack rv" style="gap:14px;margin-top:40px"><span class="eb">Channels</span><h2 class="sec">한 번 쓰면<br>여섯 곳에 맞춰 나가요</h2></div>
    <div class="cards">${CH.map((c,i)=>`<div class="fc rv" style="transition-delay:${i*.05}s;flex-direction:row;align-items:center;gap:16px;padding:22px"><span class="mk" style="background:${c[2]};width:46px;height:46px;border-radius:14px;font-size:15px">${c[1]}</span><div class="stack" style="gap:2px"><b style="font-size:16.5px">${c[0]}</b><span class="small muted">${c[3]}</span></div></div>`).join('')}</div>
  </div></section>

  <section id="ld-faq"><div class="in" style="max-width:860px">
    <div class="stack rv" style="gap:14px"><span class="eb">FAQ</span><h2 class="sec">자주 묻는 질문</h2></div>
    <div class="stack" style="gap:12px">
      ${[['글이 마음대로 올라가나요?','아니요. 사장님이 ‘올리기’를 누른 글만 올라가요. 그 전엔 언제든 고치거나 지울 수 있어요.'],['네이버 블로그는 어떻게 올라가나요?','네이버가 블로그 글쓰기 API를 열어두지 않아서, 매장 PC 크롬에 설치한 마중물 확장이 사장님 대신 글쓰기 화면에 입력해요. 휴대폰만 쓰시면 ‘복사해서 붙여넣기’로 안내해요.'],['비밀번호를 맡겨야 하나요?','아니요. 마중물은 비밀번호를 저장하지 않아요. 인스타·스레드·유튜브는 각 회사의 공식 연결 화면에서 직접 허락해 주시면 돼요.'],['자료를 많이 올리면 비용이 늘어나나요?','올릴 때 한 번만 짧게 정리해 두고, 글을 쓸 땐 관련 자료 몇 개만 골라 쓰기 때문에 매번 다 읽지 않아요.'],['플레이스 통계도 볼 수 있나요?','네이버가 외부에 통계를 열어주지 않아 자동으로는 못 가져와요. 일주일에 한 번 숫자만 적어두시면 변화를 보여드려요.']].map(q=>`<details class="rv"><summary>${q[0]}</summary><p class="small muted" style="line-height:1.8;margin:14px 0 0">${q[1]}</p></details>`).join('')}
    </div>
  </div></section>

  <section class="cta"><div class="rings" aria-hidden="true"><span></span><span></span><span></span></div><div class="in" style="align-items:center;gap:26px">
    <span class="eb" style="color:#BFEAF3">Start today</span>
    <h2 class="sec" style="color:#fff">오늘 찍은 사진 한 장이<br>첫 마중물이 돼요</h2>
    <p class="lead" style="color:#D4EEF4;text-align:center">가게 정보 입력 2분, 그 다음부턴 하루 1분이면 충분해요.</p>
    <div class="row" style="gap:12px;justify-content:center;flex-wrap:wrap"><button class="bt" data-act="ldStart">${startTxt} ${arr}</button><button class="bt" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.5)" data-act="ldDemo">예시 가게 보기</button></div>
    <span class="small" style="opacity:.8;margin-top:20px">마중물 · 시연 버전 · 글쓰기는 Claude가 하고, 채널 발행은 아직 흉내만 내요</span>
  </div></section>
  </div>`;
}

function measureStreet(){
  const st=document.getElementById('ldStreet'); if(!st) return;
  const r=st.getBoundingClientRect(), d=st.querySelector('.door').getBoundingClientRect(), tr=st.querySelector('.tram');
  const door=d.left-r.left+d.width/2-20, tw=tr.offsetWidth;
  st.style.setProperty('--door',door+'px'); st.style.setProperty('--tw',tw+'px');
  st.style.setProperty('--stop',Math.max(10,door-tw-60)+'px'); st.style.setProperty('--k',(tw/360).toFixed(2));
}
window.addEventListener('resize',()=>{if(UI.view==='landing')measureStreet();});
function initStreet(){
  const st=document.getElementById('ldStreet'); if(!st) return;
  measureStreet();
  let n=0; const cnt=st.querySelector('#ldCnt');
  st.querySelectorAll('.walker').forEach(w=>w.addEventListener('animationiteration',e=>{
    if(e.target!==w) return;
    n++; cnt.textContent=n; cnt.classList.remove('bump'); void cnt.offsetWidth; cnt.classList.add('bump');
    const p=document.createElement('span'); p.className='plus'; p.textContent='+1'; p.style.left=(parseFloat(getComputedStyle(st).getPropertyValue('--door'))+20)+'px'; st.appendChild(p); setTimeout(()=>p.remove(),1200);
  }));
}
let LD_TIMERS=[];let LD_OBS=null;
function stopLanding(){LD_TIMERS.forEach(t=>clearInterval(t));LD_TIMERS=[];if(LD_OBS){LD_OBS.disconnect();LD_OBS=null;}}
function initLanding(){
  stopLanding();
  const root=document.querySelector('.ld'); if(!root) return;
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes=[...root.querySelectorAll('.scene')], dots=[...root.querySelectorAll('.dots b')];
  let k=0;
  const show=i=>{scenes.forEach((s,j)=>s.classList.toggle('on',j===i));dots.forEach((d,j)=>d.classList.toggle('on',j===i));};
  if(!reduce) LD_TIMERS.push(setInterval(()=>{k=(k+1)%scenes.length;show(k);},2800));
  const count=el=>{const n=+el.dataset.count, unit=el.querySelector('small').outerHTML; if(reduce){el.innerHTML=n+unit;return;} const t0=performance.now(),d=1200; const step=t=>{const p=Math.min(1,(t-t0)/d),e=1-Math.pow(1-p,3);el.innerHTML=Math.round(n*e)+unit;if(p<1)requestAnimationFrame(step);};requestAnimationFrame(step);};
  initStreet();
  const rvs=root.querySelectorAll('.rv'), cnts=root.querySelectorAll('[data-count]');
  if(!('IntersectionObserver' in window)||reduce){rvs.forEach(e=>e.classList.add('in-view'));cnts.forEach(count);return;}
  LD_OBS=new IntersectionObserver(es=>es.forEach(en=>{if(!en.isIntersecting)return;const el=en.target;el.classList.add('in-view');el.querySelectorAll('[data-count]').forEach(c=>{if(!c.dataset.done){c.dataset.done=1;count(c);}});LD_OBS&&LD_OBS.unobserve(el);}),{threshold:.12,rootMargin:'0px 0px -40px 0px'});
  rvs.forEach(e=>LD_OBS.observe(e));
}
function render(){
  renderNav();
  const v=UI.view;
  const isMarketing=v==='landing'||v==='login'||v==='signup';
  document.body.classList.toggle('landing',isMarketing);
  $('#main').innerHTML=v==='landing'?viewLanding():v==='login'?viewLogin():v==='signup'?viewSignup():v==='setup'?viewSetup():v==='home'?viewHome():v==='library'?viewLibrary():v==='create'?viewCreate():v==='status'?viewStatus():viewStore();
  if(v==='landing') initLanding(); else stopLanding();
  if(v==='login'||v==='signup') setTimeout(()=>{const el=$('#authEmail');el&&el.focus();},0);
  $('#modal').innerHTML=UI.modal==='picker'?pickerModal():UI.modal==='text'?textModal():UI.modal==='post'?postModal():UI.modal==='editMat'?editMatModal():'';
}
function textModal(){return `<div class="modal-bg" data-act="closeModal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="tmh" data-stop="1"><div class="row between"><h2 id="tmh">글·후기 붙여넣기</h2><button class="btn sm ghost" data-act="closeModal" aria-label="닫기">${ic('x',18)}</button></div><p class="small muted">예전에 쓴 블로그 글, 손님 후기, 공지 문구를 붙여넣으면 사실과 말투를 정리해 자료로 써요. 손님 실명·연락처는 지워주세요.</p><label class="sr" for="tmText">붙여넣을 글</label><textarea id="tmText" class="inp" rows="8"></textarea><div class="row" style="justify-content:flex-end"><button class="btn primary" data-act="saveText">자료함에 넣기</button></div></div></div>`;}
function snapEditDraft(){
  const m=M[UI.editId], prev=(UI.editDraft||{}).text, from=$('#emText');
  return {
    summary:($('#emSummary')||{}).value||'',
    tags:($('#emTags')||{}).value||'',
    kind:($('#emKind')||{}).value||'',
    ends:($('#emEnds')||{}).value||'',
    text:from?from.value:(prev!=null?prev:(m&&m.text)||'')
  };
}
function editMatNeedsText(kind){return kind==='글'||kind==='후기';}
function editMatModal(){
  const m=M[UI.editId]; if(!m)return '';
  const d=UI.editDraft||{};
  const kind=d.kind!=null&&d.kind!==''?d.kind:(m.kind||KINDS[0]);
  const summary=d.summary!=null?d.summary:(m.summary||'');
  const tags=d.tags!=null?d.tags:(m.tags||[]).join(', ');
  const ends=d.ends!=null?d.ends:(m.ends||'');
  const text=d.text!=null?d.text:(m.text||'');
  const menus=UI.editMenus||(m.menu||[]).slice();
  const menuOpts=S.profile.menu||[];
  const needText=editMatNeedsText(kind);
  return `<div class="modal-bg" data-act="closeModal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="emh" data-stop="1">
    <div class="row between"><h2 id="emh">자료 수정</h2><button class="btn sm ghost" data-act="closeModal" aria-label="닫기">${ic('x',18)}</button></div>
    <p class="small muted">종류·설명·연결된 메뉴를 고치면 다음 글부터 반영돼요. 사진 자체는 바꾸지 않아요.</p>
    ${m.thumb?`<div class="row" style="justify-content:center"><img src="${m.thumb}" alt="" style="max-width:100%;max-height:160px;border-radius:12px;object-fit:contain;background:#fff"></div>`:''}
    <div class="stack" style="gap:12px">
      <div class="stack" style="gap:6px"><label class="lbl" for="emKind">종류</label><select id="emKind" class="inp">${KINDS.map(k=>`<option value="${k}" ${kind===k?'selected':''}>${k}</option>`).join('')}</select></div>
      <div class="stack" style="gap:6px"><label class="lbl" for="emSummary">설명</label><input id="emSummary" class="inp" maxlength="80" value="${esc(summary)}" placeholder="40자 안팎으로 무엇이 보이는지"></div>
      <div class="stack" style="gap:6px"><label class="lbl" for="emTags">태그 <span class="muted xs">쉼표로 구분 · 최대 6개</span></label><input id="emTags" class="inp" value="${esc(tags)}" placeholder="예: 시그니처, 점심, 테이크아웃"></div>
      <div class="stack" style="gap:6px"><span class="lbl">연결된 ${IND[S.profile.industry].item||'메뉴'}</span>
        ${menuOpts.length?`<div class="row" style="gap:6px">${menuOpts.map(x=>{const on=menus.includes(x.name);return `<button type="button" class="tab" style="height:40px" aria-pressed="${on}" data-act="editMatMenu" data-v="${esc(x.name)}">${esc(x.name)}</button>`;}).join('')}</div>`:`<p class="small muted">우리 가게에 등록된 메뉴가 없어요. [우리 가게]에서 먼저 추가해 주세요.</p>`}
      </div>
      <div class="stack" style="gap:6px"><label class="lbl" for="emEnds">이벤트 끝나는 날 <span class="muted xs">없으면 비워두세요</span></label><input id="emEnds" class="inp" type="date" value="${esc(ends)}"></div>
      ${needText?`<div class="stack" style="gap:6px"><label class="lbl" for="emText">내용 <span class="chip warn">필수</span></label><textarea id="emText" class="inp" rows="6" placeholder="${kind==='후기'?'손님 후기·리뷰 내용을 적어주세요':'글·공지·블로그 내용을 적어주세요'}" required>${esc(text)}</textarea><span class="xs muted">${kind} 종류는 내용을 꼭 넣어야 저장돼요.</span></div>`:''}
    </div>
    <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn ghost" data-act="closeModal">취소</button><button class="btn primary" data-act="saveEditMat">저장</button></div>
  </div></div>`;
}

/* =========================================================
   이벤트
   ========================================================= */
function syncInputs(){const f=UI.flow;if(!f)return;const t=$('#fTopic'),n=$('#fNote');if(t)f.topic=t.value;if(n)f.note=n.value;}
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.id==='qAsk'){UI.qAsk=el.value;return;}
  if(el.id==='qAns'){UI.qDraft=el.value;return;}
  if(el.dataset.field){const k=el.dataset.field;S.profile[k]=el.value;if(k==='industry'){S.profile.banned=Array.from(new Set(IND[el.value].banned.concat((S.profile.banned||[]).filter(b=>!Object.values(IND).some(t=>t.banned.includes(b))))));S.topics=null;render();}S.example=false;persist();return;}
  if(el.dataset.extra){S.profile.extra=S.profile.extra||{};S.profile.extra[el.dataset.extra]=el.value;persist();return;}
  if(el.dataset.sns){S.profile.sns=S.profile.sns||emptySns();S.profile.sns[el.dataset.sns]=el.value;S.example=false;persist();return;}
  if(el.dataset.draft&&UI.flow){const f=UI.flow;f.drafts[f.tab][el.dataset.draft]=el.value;clearTimeout(UI.rvT);UI.rvT=setTimeout(()=>{const pos=el.selectionStart,id=el.id;render();const n=document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(_){}}},700);return;}
  if(el.id==='fWhyD'&&UI.flow){UI.flow.whyDetail=el.value;return;}
  if(el.dataset.pq!=null&&UI.flow){UI.flow.answers=UI.flow.answers||{};UI.flow.answers[el.dataset.pq]=el.value;return;}
  if(el.id==='fTopic'||el.id==='fNote'){syncInputs();const b=document.querySelector('[data-act="generate"]');if(b&&el.id==='fTopic'){const ok=!!el.value.trim();b.disabled=!ok;b.textContent=ok?'채널별 초안 만들기':'주제를 먼저 적어주세요';}}
});
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.dataset.sel){toggleSel(el.dataset.sel);}
  if(el.dataset.mr&&UI.menuReview){UI.menuReview[Number(el.dataset.mr)].ok=el.checked;}
  if(el.dataset.kind&&M[el.dataset.kind]){const m=M[el.dataset.kind];m.kind=el.value;m.status='ready';m.summary=m.summary==='정리 전 자료 · 종류를 골라주세요'?el.value+' 자료':m.summary;saveMat(m);render();}
  if(el.id==='emKind'&&UI.modal==='editMat'){UI.editDraft=snapEditDraft();UI.editDraft.kind=el.value;render();setTimeout(()=>{const t=$('#emText');if(t)t.focus();},0);}
});
function toggleSel(c){const f=UI.flow;if(!f)return;const i=f.selected.indexOf(c);if(i>=0)f.selected.splice(i,1);else{if(paceBlocked(c,f.whenMode==='now'?Date.now():f.when)){toast(`${CHMAP[c].name}은 그날 이미 올렸어요. ‘하루 뒤’로 바꾸면 넣을 수 있어요`);render();return;}f.selected.push(c);}if(c==='place'&&f.selected.includes('place')&&!f.selected.includes('blog'))toast('플레이스 소식은 블로그 글이 있어야 떠요');render();}
function setPhotoFromMats(f){const p=mainPhoto(f.mats);f.photo=p?p.thumb:null;f.photoMat=p?p.id:null;}

document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b||b.disabled)return;
  if(b.dataset.act==='closeModal'&&e.target.closest('[data-stop]')&&!e.target.closest('button'))return;
  if(b.tagName==='INPUT')return;
  const a=b.dataset.act,v=b.dataset.v;syncInputs();
  switch(a){
    case 'nav': if(v==='create'&&(!UI.flow||UI.flow.stage==='done'))UI.flow=newFlow(''); UI.view=v; UI.modal=null; UI.authErr=''; render(); window.scrollTo(0,0); break;
    case 'doLogin': {
      const email=((($('#authEmail')||{}).value)||'').trim().toLowerCase();
      const pass=((($('#authPass')||{}).value)||'');
      if(!validEmail(email)){UI.authErr='이메일 형식을 확인해 주세요';render();break;}
      if(!pass){UI.authErr='비밀번호를 입력해 주세요';render();break;}
      b.disabled=true;
      if(USE_RDS){
        try{
          const {res,data}=await apiFetch('/api/auth/login',{method:'POST',body:JSON.stringify({email,password:pass})});
          if(!res.ok||!data||!data.ok){UI.authErr=(data&&data.error)||'로그인에 실패했어요';b.disabled=false;render();break;}
          saveSession({email:data.user.email,name:data.user.name||''}); toast(`${data.user.name||'사장님'}, 환영해요`); await afterAuth(); break;
        }catch(_){UI.authErr='서버에 연결하지 못했어요';b.disabled=false;render();break;}
      }
      const hash=await hashPass(pass);
      const acc=loadAccounts().find(a=>a.email===email&&a.pass===hash);
      if(!acc){UI.authErr='이메일 또는 비밀번호가 맞지 않아요';b.disabled=false;render();break;}
      saveSession({email:acc.email,name:acc.name||''}); toast(`${acc.name||'사장님'}, 환영해요`); await afterAuth(); break;
    }
    case 'doSignup': {
      const name=((($('#authName')||{}).value)||'').trim();
      const email=((($('#authEmail')||{}).value)||'').trim().toLowerCase();
      const pass=((($('#authPass')||{}).value)||'');
      const pass2=((($('#authPass2')||{}).value)||'');
      if(!validEmail(email)){UI.authErr='이메일 형식을 확인해 주세요';render();break;}
      if(pass.length<8){UI.authErr='비밀번호는 8자 이상으로 해주세요';render();break;}
      if(pass!==pass2){UI.authErr='비밀번호 확인이 같지 않아요';render();break;}
      b.disabled=true;
      if(USE_RDS){
        try{
          const {res,data}=await apiFetch('/api/auth/signup',{method:'POST',body:JSON.stringify({email,password:pass,name})});
          if(!res.ok||!data||!data.ok){UI.authErr=(data&&data.error)||'가입에 실패했어요';b.disabled=false;render();break;}
          saveSession({email:data.user.email,name:data.user.name||''}); toast('가입했어요. 가게 정보를 채워볼까요?'); await afterAuth(); break;
        }catch(_){UI.authErr='서버에 연결하지 못했어요';b.disabled=false;render();break;}
      }
      const list=loadAccounts();
      if(list.some(a=>a.email===email)){UI.authErr='이미 가입된 이메일이에요. 로그인해 주세요';b.disabled=false;render();break;}
      const hash=await hashPass(pass);
      list.push({email,pass:hash,name,at:Date.now()});
      saveAccounts(list);
      saveSession({email,name});
      toast('가입했어요. 가게 정보를 채워볼까요?');
      await afterAuth(); break;
    }
    case 'logout': {
      if(USE_RDS){try{await apiFetch('/api/auth/logout',{method:'POST',body:'{}'});}catch(_){}}
      saveSession(null); UI.view='landing'; UI.landingByUser=true; toast('로그아웃했어요'); render(); window.scrollTo(0,0); break;
    }
    case 'reset': if(!UI.resetAsk){UI.resetAsk=true;toast('한 번 더 누르면 예시를 지우고 빈 가게로 시작해요');setTimeout(()=>UI.resetAsk=false,4000);break;} { const ind=S.profile.industry; S=baseState(); UI.indPicked=false; S.profile.industry='restaurant'; S.profile.banned=IND[S.profile.industry].banned.slice(); Object.keys(M).filter(id=>M[id].example).forEach(id=>deleteMat(id)); UI.resetAsk=false; UI.setupStep=1; persist(); UI.view='setup'; render(); window.scrollTo(0,0); } break;
    case 'aiTopics': await doTopics(b); break;
    case 'pickTopic': { const t=curTopics().list[Number(b.dataset.i)]; await startFromTopic(t); break; }
    case 'inboxAll': UI.inboxOpen=true; render(); break;
    case 'inYes': case 'inNo': resolveInbox(b.dataset.i,a==='inYes'); break;
    case 'nextQ': S.qIndex=(S.qIndex||0)+1; UI.qAsk=null; UI.qDraft=''; persist(); render(); setTimeout(()=>{const el=$('#qAsk');el&&el.focus();},0); break;
    case 'saveQ': { const q=((($('#qAsk')||{}).value)||activeQuestion()).trim(); const t=((UI.qDraft||($('#qAns')||{}).value)||'').trim(); if(!q){toast('질문을 적어주세요'); const qe=$('#qAsk'); qe&&qe.focus(); break;} if(!t){toast('답을 먼저 적어주세요'); const ae=$('#qAns'); ae&&ae.focus(); break;} S.stories.push({q,a:t,at:Date.now()}); S.qIndex=(S.qIndex||0)+1; UI.qAsk=null; UI.qDraft=''; S.example=false; persist(); render(); toast('가게 이야기에 저장했어요. 다음 글부터 들어가요'); break; }
    case 'dict': toggleDict(b.dataset.t); break;
    case 'upload': UI.uploadForPost=false; $('#fileLib').click(); break;
    case 'uploadForPost': UI.uploadForPost=true; $('#fileLib').click(); break;
    case 'shoot': UI.uploadForPost=true; if(v==='new'){UI.flow=newFlow('');} $('#fileCam').click(); break;
    case 'goLanding': UI.landingByUser=true; UI.view='landing'; UI.modal=null; render(); window.scrollTo(0,0); break;
    case 'ldScroll': { const el=document.getElementById('ld-'+v); if(el) el.scrollIntoView({behavior:'smooth'}); break; }
    case 'ldStart': S.seenLanding=true; persist(); if(S.setupDone&&!S.example){UI.view='home';} else { if(S.example){const ind='restaurant'; S=baseState(); S.seenLanding=true; Object.keys(M).filter(id=>M[id].example).forEach(id=>deleteMat(id)); persist();} UI.indPicked=false; UI.setupStep=1; UI.view='setup'; } render(); window.scrollTo(0,0); break;
    case 'ldDemo': S.seenLanding=true; if(!S.example&&!S.setupDone){ S=exampleState(); S.seenLanding=true; if(!Object.keys(M).length)M=exampleMats(); if(!S.posts.length)S.posts=examplePosts(); } persist(); UI.view='home'; render(); window.scrollTo(0,0); break;
    case 'openSetup': { const r=reqStatus(); const p=S.profile; UI.setupStep=!p.name||!p.area||!p.hours?2:r.missing.some(x=>x.label==='차별점')&&r.missing.length===1?4:3; UI.view='setup'; render(); window.scrollTo(0,0); break; }
    case 'setInd': UI.indPicked=true; S.profile.industry=v; S.profile.banned=Array.from(new Set(IND[v].banned.concat((S.profile.banned||[]).filter(b=>!Object.values(IND).some(t=>t.banned.includes(b)))))); S.topics=null; S.example=false; persist(); render(); break;
    case 'setupStep': UI.setupStep=Number(v); render(); window.scrollTo(0,0); break;
    case 'setupDone': S.setupDone=true; S.example=false; persist(); UI.view='home'; render(); window.scrollTo(0,0); toast('준비 끝! 오늘 찍은 사진이나 추천 주제로 첫 글을 만들어 보세요'); break;
    case 'fieldChip': { const k=b.dataset.k; const r=IND[S.profile.industry].req.find(x=>x.k===k); S.profile.fields=S.profile.fields||{}; if(r.type==='one'){S.profile.fields[k]=S.profile.fields[k]===v?'':v;} else {const a=S.profile.fields[k]||[]; S.profile.fields[k]=a.includes(v)?a.filter(x=>x!==v):a.concat([v]);} S.example=false; persist(); render(); break; }
    case 'strEx': { const el=$('#strNew'); if(el){el.value=v; el.focus(); toast('우리 가게에 맞게 고친 뒤 [추가]를 누르세요');} break; }
    case 'tglAud': { const f=UI.flow; f.aud=f.aud||[]; f.aud=f.aud.includes(v)?f.aud.filter(x=>x!==v):f.aud.concat([v]); S.lastAud=f.aud.slice(); persist(); render(); break; }
    case 'tglWhy': { const f=UI.flow; f.why=f.why||[]; f.why=f.why.includes(v)?f.why.filter(x=>x!==v):f.why.concat([v]); render(); break; }
    case 'ackPhoto': UI.flow.photoAck=true; render(); break;
    case 'hideGuide': S.guideHidden=true; persist(); render(); break;
    case 'showGuide': S.guideHidden=false; persist(); render(); break;
    case 'textMat': UI.modal='text'; render(); setTimeout(()=>{const t=$('#tmText');t&&t.focus();},0); break;
    case 'saveText': { const t=$('#tmText').value; UI.modal=null; await ingestText(t); toast('자료함에 넣었어요. 정리할게요'); break; }
    case 'closeModal': UI.modal=null; UI.editId=null; UI.editMenus=null; UI.editDraft=null; if(UI.flow&&UI.flow.stage==='input')setPhotoFromMats(UI.flow); render(); break;
    case 'filter': UI.filter=v; render(); break;
    case 'editMat': { const m=M[v]; if(!m||m.status==='pending')break; UI.editId=v; UI.editMenus=(m.menu||[]).slice(); UI.editDraft=null; UI.modal='editMat'; render(); setTimeout(()=>{const el=$('#emSummary');el&&el.focus();},0); break; }
    case 'editMatMenu': { const a=UI.editMenus||[]; UI.editMenus=a.includes(v)?a.filter(x=>x!==v):a.concat([v]); UI.editDraft=snapEditDraft(); render(); break; }
    case 'saveEditMat': { const m=M[UI.editId]; if(!m)break; const kind=($('#emKind')||{}).value||m.kind; const summary=((($('#emSummary')||{}).value)||'').trim(); if(!summary){toast('설명을 적어주세요');break;} const body=((($('#emText')||{}).value)||'').trim(); if(editMatNeedsText(kind)&&!body){toast(`${kind} 내용을 적어주세요`); const t=$('#emText'); t&&t.focus(); break;} m.kind=KINDS.includes(kind)?kind:(m.kind||'메뉴'); m.summary=summary.slice(0,80); m.tags=(((($('#emTags')||{}).value)||'').split(/[,，、]/).map(s=>s.trim()).filter(Boolean).slice(0,6)); m.menu=(UI.editMenus||[]).filter(n=>S.profile.menu.some(x=>x.name===n)); const ends=(($('#emEnds')||{}).value)||''; m.ends=ends||null; if(editMatNeedsText(kind))m.text=body.slice(0,3000); else if($('#emText'))m.text=($('#emText').value||'').slice(0,3000); if(m.status==='manual'||m.status==='error')m.status='ready'; saveMat(m); UI.modal=null; UI.editId=null; UI.editMenus=null; UI.editDraft=null; render(); toast('자료를 수정했어요'); break; }
    case 'pin': { const m=M[v]; m.pinned=!m.pinned; if(m.pinned)m.excluded=false; saveMat(m); render(); toast(m.pinned?'이 자료를 먼저 골라요':'고정을 풀었어요'); break; }
    case 'excl': { const m=M[v]; m.excluded=!m.excluded; if(m.excluded)m.pinned=false; saveMat(m); render(); break; }
    case 'unarchive': { const m=M[v]; m.archived=false; m.lastUsed=Date.now(); if(m.ends&&new Date(m.ends).getTime()<Date.now())m.ends=null; saveMat(m); render(); break; }
    case 'delMat': if(UI.delAsk!==v){UI.delAsk=v;toast('한 번 더 누르면 지워요');setTimeout(()=>UI.delAsk=null,3000);break;} await deleteMat(v); UI.delAsk=null; render(); break;
    case 'tone': S.profile.tone=v; persist(); render(); break;
    case 'addMenu': { const n=$('#mName').value.trim(),pr=Number(($('#mPrice').value||'').replace(/[^\d]/g,'')); if(!n||!pr){toast('메뉴 이름과 가격을 모두 적어주세요');break;} S.profile.menu.push({name:n,price:pr}); S.example=false; persist(); render(); break; }
    case 'delMenu': S.profile.menu.splice(Number(b.dataset.i),1); persist(); render(); break;
    case 'menuPhoto': if(!cap.sample){toast('Claude 연결이 있어야 메뉴판을 읽어요. 직접 입력해 주세요');break;} $('#fileMenu').click(); break;
    case 'menuApply': UI.menuReview.filter(m=>m.ok&&m.price).forEach(m=>{const cur=S.profile.menu.find(x=>x.name===m.name);if(cur)cur.price=m.price;else S.profile.menu.push({name:m.name,price:m.price});}); UI.menuReview=null; persist(); render(); toast('체크한 메뉴를 넣었어요'); break;
    case 'menuCancel': UI.menuReview=null; render(); break;
    case 'editStr': UI.storeEdit={i:Number(b.dataset.i)}; render(); { const se=$('#strEdit'); if(se)se.focus(); } break;
    case 'cancelEdit': UI.storeEdit=null; render(); break;
    case 'saveStr': { const t=$('#strEdit').value.trim(); if(t){S.profile.strengths[Number(b.dataset.i)]=t;persist();} UI.storeEdit=null; render(); toast('저장했어요. 다음 글부터 반영돼요'); break; }
    case 'delStr': S.profile.strengths.splice(Number(b.dataset.i),1); persist(); render(); break;
    case 'addStr': { const t=$('#strNew').value.trim(); if(!t)break; S.profile.strengths.push(t); persist(); render(); break; }
    case 'delBan': S.profile.banned.splice(Number(b.dataset.i),1); persist(); render(); break;
    case 'addBan': { const t=$('#banNew').value.trim(); if(!t)break; S.profile.banned.push(t); persist(); render(); break; }
    case 'delStory': S.stories.splice(Number(b.dataset.i),1); persist(); render(); break;
    case 'autoPick': { const f=UI.flow; if(!f.topic.trim()){toast('주제를 먼저 적어주세요');break;} b.disabled=true; f.mats=await selectMaterials(f.topic,f.kind); setPhotoFromMats(f); render(); toast(f.mats.length?`자료 ${f.mats.length}개를 골랐어요`:'맞는 자료가 없어요. 사진을 올려주세요'); break; }
    case 'openPicker': UI.modal='picker'; render(); break;
    case 'togglePick': { const f=UI.flow; const i=f.mats.indexOf(v); if(i>=0)f.mats.splice(i,1); else f.mats.push(v); setPhotoFromMats(f); render(); break; }
    case 'pickDone': { const f=UI.flow; UI.modal=null; setPhotoFromMats(f); if(f.stage==='review'){await doGenerate();} else render(); break; }
    case 'pickPhotoOnly': { UI.modal=null; setPhotoFromMats(UI.flow); render(); break; }
    case 'unuse': { const f=UI.flow; f.mats=f.mats.filter(x=>x!==v); setPhotoFromMats(f); render(); break; }
    case 'generate': await doGenerate(); break;
    case 'backInput': UI.flow.stage='input'; render(); break;
    case 'tab': UI.flow.tab=v; render(); break;
    case 'toggleSel': toggleSel(v); break;
    case 'rw': await doRewrite({short:'핵심만 남겨 절반 길이로 줄여라',friendly:'더 친근하고 말하듯 바꿔라',detail:'이번 글 자료와 가게 이야기의 구체적인 디테일을 하나 더 넣어라'}[v]); break;
    case 'restore': { const f=UI.flow; f.drafts[f.tab]=JSON.parse(JSON.stringify(f.orig[f.tab])); render(); break; }
    case 'when': { const f=UI.flow; f.whenMode=v; f.when=v==='now'?Date.now():v==='rec'?f.recAt:f.recAt+DAY; const back=(f.paceDropped||[]).filter(c=>!paceBlocked(c,f.when)); back.forEach(c=>{if(!f.selected.includes(c))f.selected.push(c);}); f.paceDropped=(f.paceDropped||[]).filter(c=>!back.includes(c)); if(back.length)toast(`${back.map(c=>CHMAP[c].name).join('·')}도 다시 넣었어요`); render(); break; }
    case 'goTodo': goTodo(); break;
    case 'statusDay': UI.statusDay=v||null; render(); break;
    case 'openPost': UI.modal='post'; UI.postId=v; UI.postTab=null; render(); break;
    case 'postTab': UI.postTab=v; render(); break;
    case 'copyPost': { const p=S.posts.find(x=>x.id===UI.postId); const d=p&&v&&p.drafts[v]; if(!d)break; try{await navigator.clipboard.writeText((d.title?d.title+'\n\n':'')+d.body);toast('복사했어요');}catch(_){toast('복사가 막혀 있어요. 글을 길게 눌러 복사해 주세요');} break; }
    case 'reusePost': { const p=S.posts.find(x=>x.id===UI.postId); if(!p)break; UI.modal=null; UI.flow=newFlow(p.topic,(p.mats||[]).filter(id=>M[id])); setPhotoFromMats(UI.flow); UI.view='create'; render(); window.scrollTo(0,0); break; }
    case 'delPost': if(UI.delPostAsk!==UI.postId){UI.delPostAsk=UI.postId;toast('한 번 더 누르면 기록을 지워요 (채널에 올라간 글은 그대로예요)');setTimeout(()=>UI.delPostAsk=null,3000);break;} S.posts=S.posts.filter(x=>x.id!==UI.postId); UI.modal=null; persist(); render(); break;
    case 'fixReplace': case 'fixDrop': { const f=UI.flow; const t=todos(f).find(x=>x.id===v); if(t){applyFix(f.drafts[t.ch],t.pb,a==='fixReplace'?'replace':'drop'); toast('고쳤어요');} render(); break; }
    case 'dropPhotoCh': { const f=UI.flow; f.selected=f.selected.filter(c=>!CHMAP[c].photo); toast('사진 없이 되는 채널만 남겼어요'); render(); break; }
    case 'approve': doApprove(); break;
    case 'newPost': UI.flow=newFlow(''); render(); break;
    case 'copy': { const p=S.posts.find(x=>x.id===b.dataset.p); const d=p&&p.drafts[b.dataset.c==='place'?'blog':b.dataset.c]; if(!d)break; try{await navigator.clipboard.writeText((d.title?d.title+'\n\n':'')+d.body);toast('글을 복사했어요. 앱에 붙여넣고 사진을 넣어주세요');}catch(_){toast('복사가 막혀 있어요. 글을 길게 눌러 복사해 주세요');} break; }
    case 'retry': { const p=S.posts.find(x=>x.id===b.dataset.p); if(p){p.status[b.dataset.c]={state:'done',text:'매장 PC가 올렸어요'};persist();render();toast('매장 PC로 다시 보냈어요 (시연)');} break; }
    case 'markDone': { const p=S.posts.find(x=>x.id===b.dataset.p); if(p){p.status[b.dataset.c]={state:'done',text:'사장님이 올렸어요'};persist();render();} break; }
    case 'savePs': { const dir=Number(($('#psDir').value||'').replace(/[^\d]/g,'')),call=Number(($('#psCall').value||'').replace(/[^\d]/g,'')); if(!$('#psDir').value&&!$('#psCall').value){toast('숫자를 적어주세요');break;} const d=new Date(); S.placeStats.push({week:(d.getMonth()+1)+'월 '+Math.ceil(d.getDate()/7)+'주',dir,call,posts:weekPosts().length,at:Date.now()}); persist(); render(); toast('기록했어요'); break; }
    case 'pc': S.pcOn=!S.pcOn; if(S.pcOn){let n=0;S.posts.forEach(p=>{if(p.status.blog&&p.status.blog.state==='wait'){p.status.blog={state:'done',text:'PC가 켜져 올렸어요'};n++;}});if(n)toast(`기다리던 블로그 글 ${n}개를 올렸어요 (시연)`);} persist(); render(); break;
    case 'conn': S.conn[v]=!S.conn[v]; persist(); render(); break;
    case 'audit': S.shortsAudited=!S.shortsAudited; persist(); render(); break;
  }
});
function goTodo(){const el=document.getElementById('todo');if(el){el.scrollIntoView({behavior:'smooth',block:'start'});el.animate&&el.animate([{boxShadow:'0 0 0 0 rgba(11,110,138,.5)'},{boxShadow:'0 0 0 10px rgba(11,110,138,0)'}],{duration:900});}}
function resolveInbox(id,yes){
  const it=S.inbox.find(x=>x.id===id);if(!it)return;const m=M[it.mat];
  if(yes){
    if(it.type==='priceChange'){const cur=S.profile.menu.find(x=>x.name===it.item);if(cur)cur.price=it.to;toast(`${it.item} 가격을 ${won(it.to)}로 바꿨어요`);}
    if(it.type==='menuNew'){S.profile.menu.push({name:it.item,price:it.to});toast('메뉴를 넣었어요');}
    if(it.type==='event'&&m){const el=document.getElementById('ev'+id);m.ends=el&&el.value?el.value:null;m.kind='이벤트';if(!m.ends){toast('끝나는 날을 넣어야 끝난 이벤트를 홍보하지 않아요');return;}saveMat(m);toast('이벤트를 저장했어요. 끝나면 자동으로 안 써요');}
    if(it.type==='face'&&m){m.excluded=false;m.faces=true;saveMat(m);}
  } else {
    if(it.type==='face'&&m){m.excluded=true;saveMat(m);}
  }
  S.inbox=S.inbox.filter(x=>x.id!==id);persist();render();
}
async function startFromTopic(t){
  const f=newFlow(t.title,(t.matIds||[]).filter(id=>M[id]&&usable(M[id])),t.kind);
  UI.flow=f;UI.view='create';
  if(f.mats.length<3){const more=await selectMaterials(t.title,t.kind);more.forEach(id=>{if(!f.mats.includes(id)&&f.mats.length<5)f.mats.push(id);});}
  setPhotoFromMats(f);
  f.fromTopic=true;
  render();window.scrollTo(0,0);
}
async function doTopics(btn){
  if(!cap.sample){toast('Claude 연결이 허용되지 않아 기본 제안을 보여드려요');return;}
  btn.disabled=true;btn.textContent='고르는 중…';
  try{const list=await aiTopics();S.topics={date:today(),list};persist();}
  catch(e){toast(e&&e.code==='rate_limited'?'잠시 후 다시 눌러주세요':'추천을 못 받았어요. 기본 제안을 보여드려요');}
  render();
}
async function doGenerate(){
  const f=UI.flow;if(!f.topic.trim())return;
  const pm=M[f.photoMat];const qs=photoQuestions(pm);f.qa=[];Object.entries(f.answers||{}).forEach(([i,a])=>{if(a&&a.trim()&&qs[i]){f.qa.push({q:qs[i],a:a.trim()});if(!S.stories.some(x=>x.a===a.trim()))S.stories.push({q:qs[i],a:a.trim(),at:Date.now()});}});if(f.qa.length)persist();
  if(!f.mats.length){f.stage='gen';f.genMsg='주제에 맞는 자료를 고르는 중';render();f.mats=await selectMaterials(f.topic,f.kind);setPhotoFromMats(f);}
  f.stage='gen';f.genMsg='채널별로 글을 쓰고 있어요';render();window.scrollTo(0,0);
  let r=null;
  if(cap.sample){try{r=await aiDrafts(f);}catch(e){r=null;if(e&&e.code==='rate_limited')toast('요청이 많아요. 기본 문구로 만들었어요');}}
  if(!r||!r.blog){r=fallbackDrafts(f);f.fellBack=true;}else f.fellBack=false;
  const drafts={};DRAFT_CH.forEach(c=>{const x=r[c]||{};drafts[c]={title:x.title||'',body:String(x.body||'')};});
  f.drafts=drafts;f.genMsg='매장 정보와 맞는지 검사하는 중';render();
  await autoFixAll(f);
  f.orig=JSON.parse(JSON.stringify(f.drafts));f.stage='review';f.tab='blog';f.startedAt=Date.now();
  render();window.scrollTo(0,0);
}
async function doRewrite(instruction,issues){
  const f=UI.flow,c=f.tab;
  if(!cap.sample){toast('Claude 연결이 있어야 자동으로 고쳐요. 직접 고쳐주세요');return;}
  f.busy='고치는 중…';render();
  try{const r=await aiRewrite(c,f.drafts[c],instruction,issues,f.mats);if(r&&r.body){f.drafts[c]={title:r.title!=null?r.title:f.drafts[c].title,body:r.body};contentProblems(f.drafts[c]).forEach(pb=>applyFix(f.drafts[c],pb,'replace'));}}
  catch(_){toast('못 고쳤어요. 잠시 후 다시 눌러주세요');}
  f.busy=null;render();
}
function doApprove(){
  const f=UI.flow;if(todos(f).length){goTodo();return;}f.selected=f.selected.filter(c=>!paceBlocked(c,f.whenMode==='now'?Date.now():f.when));if(!f.selected.length){toast('올릴 채널이 없어요');render();return;}
  const id='p'+Date.now(),when=f.whenMode==='now'?Date.now():f.when;
  const status={};f.selected.forEach(c=>status[c]=simulateStatus(c,f.whenMode,when));
  const changed=DRAFT_CH.some(c=>f.drafts[c].body!==f.orig[c].body||f.drafts[c].title!==f.orig[c].title);
  const order=c=>CH.findIndex(x=>x.id===c);
  S.posts.push({id,topic:f.topic,when,whenMode:f.whenMode,channels:f.selected.slice().sort((a,b)=>order(a)-order(b)),status,drafts:f.drafts,mats:f.mats.slice(),edited:changed,approveSec:Math.round((Date.now()-f.startedAt)/1000),caught:f.caught||0,appeal:appeal('blog',f.drafts.blog,f).score,photoMat:f.photoMat||null,at:Date.now()});
  if(S.posts.length>40)S.posts=S.posts.slice(-40);
  f.mats.forEach(mid=>{const m=M[mid];if(m){m.used=(m.used||0)+1;m.lastUsed=Date.now();saveMat(m);}});
  S.example=false;persist();f.stage='done';f.postId=id;render();window.scrollTo(0,0);
}

/* 파일 입력 */
async function onUpload(files){
  const before=new Set(Object.keys(M));
  await ingestAny(files);
  if(UI.uploadForPost){const added=Object.keys(M).filter(id=>!before.has(id)).map(id=>M[id]).filter(m=>m.src==='photo');if(added[0]){UI.lastShotId=added[0].id;if(!UI.flow)UI.flow=newFlow('');const f=UI.flow;const rp=added[0];if(!f.mats.includes(rp.id))f.mats.unshift(rp.id);f.photo=rp.thumb;f.photoMat=rp.id;UI.view='create';if(f.stage!=='review')f.stage='input';render();window.scrollTo(0,0);}}
  UI.uploadForPost=false;
}
$('#fileLib').addEventListener('change',async e=>{const files=[...e.target.files];e.target.value='';if(files.length)await onUpload(files);});
$('#fileCam').addEventListener('change',async e=>{const files=[...e.target.files];e.target.value='';if(files.length)await onUpload(files);});
$('#fileMenu').addEventListener('change',async e=>{
  const file=e.target.files[0];e.target.value='';if(!file)return;
  UI.menuBusy=true;render();
  try{const url=URL.createObjectURL(file);const img=await loadImg(url);URL.revokeObjectURL(url);const blob=dataUrlToBlob(drawTo(img,1600).toDataURL('image/jpeg',0.85));const r=await aiMenu(blob);UI.menuReview=(r.items||[]).filter(x=>x&&x.name).map(x=>({name:String(x.name),price:Number(x.price)||0,ok:!!Number(x.price)}));if(!UI.menuReview.length)toast('메뉴를 못 읽었어요. 직접 입력해 주세요');}
  catch(err){toast(err&&err.code==='no_images'?'이 화면에서는 사진 읽기가 안 돼요. 직접 입력해 주세요':'메뉴판을 못 읽었어요. 직접 입력해 주세요');}
  UI.menuBusy=false;render();
});

/* 받아쓰기 */
async function toggleDict(target){
  const d=cap.dict;if(!d)return;
  if(dictTarget){const was=dictTarget;try{await d.stop();}catch(_){}if(was==='rwVoice'&&UI.voiceText){const t=UI.voiceText;UI.voiceText='';dictTarget=null;render();await doRewrite('사장님 요청: '+t);return;}dictTarget=null;render();return;}
  dictTarget=target;UI.voiceText='';
  d.start().catch(err=>{dictTarget=null;render();if(err&&err.code==='not_granted'){cap.dict=null;toast('마이크 사용이 허용되지 않았어요. 글로 적어주세요');}});
  render();
}
function onDictFinal(text){
  if(!dictTarget||!text)return;
  if(dictTarget==='rwVoice'){UI.voiceText=((UI.voiceText||'')+' '+text).trim();return;}
  if(dictTarget==='qAns'){UI.qDraft=((UI.qDraft||'')+' '+text).trim();const el=$('#qAns');if(el)el.value=UI.qDraft;return;}
  if(/^pq\d$/.test(dictTarget)&&UI.flow){const i=dictTarget.slice(2);UI.flow.answers=UI.flow.answers||{};UI.flow.answers[i]=((UI.flow.answers[i]||'')+' '+text).trim();const el=document.getElementById(dictTarget);if(el)el.value=UI.flow.answers[i];return;}
  if(dictTarget==='fNote'&&UI.flow){UI.flow.note=((UI.flow.note||'')+' '+text).trim();const el=$('#fNote');if(el)el.value=UI.flow.note;}
}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&UI.modal){UI.modal=null;UI.editId=null;UI.editMenus=null;UI.editDraft=null;render();return;}
  if(e.key==='Enter'&&(UI.view==='login'||UI.view==='signup')&&e.target&&['INPUT'].includes(e.target.tagName)){
    const act=UI.view==='login'?'doLogin':'doSignup';
    const btn=document.querySelector(`[data-act="${act}"]`);
    if(btn&&!btn.disabled){e.preventDefault();btn.click();}
  }
});

/* =========================================================
   시작
   ========================================================= */
try{const ls=localStorage.getItem('gk2-state');if(ls){const v=JSON.parse(ls);if(v&&v.profile)S=Object.assign(baseState(),v);}}catch(_){}
function fixState(){if(!IND[S.profile.industry])S.profile.industry='restaurant';S.profile.fields=S.profile.fields||{};S.profile.extra=S.profile.extra||{};S.profile.sns=Object.assign(emptySns(),S.profile.sns||{});if(S.example)S.setupDone=true;}
fixState();
loadSession();
try{const lm=localStorage.getItem('gk2-mats');if(lm)M=JSON.parse(lm)||{};}catch(_){M={};}
if(S.example&&!Object.keys(M).length)M=exampleMats();
if(S.example&&!S.posts.length)S.posts=examplePosts();
if(!S.seenLanding)UI.view='landing';
/* Claude 전용 기능(cap.sample, cap.db, claude.use) 없음: 원본에서 AI가 꺼졌을 때의 동작 그대로 */
UI.sampleOff=true;UI.sampleKnown=true;
(async()=>{
  await probeRdsAuth();
  if(USE_RDS&&AUTH.user) await loadCloudData();
  if(S.seenLanding&&UI.view==='landing'&&!UI.landingByUser)UI.view='home';
  housekeeping();render();runQueue();
})();
render();

}
