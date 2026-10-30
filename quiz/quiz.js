const QS=[
{c:"“123층 꼭대기 아래로 백화점·쇼핑몰·호수공원이 다 붙어 있다. 송파 대장 학군·재건축 호재 썰의 출발점.” — 이 랜드마크 역세권을 찍어보세요.",a:[37.5126,127.1025],n:"잠실역 · 롯데월드타워",f:"롯데월드타워는 높이 555m·123층(관측). ‘잠실은 무조건 오른다’는 의견입니다.",t:"obs"},
{c:"“IT 대기업 사옥이 몰려 직주근접 끝판왕. 신분당선 한 정거장이면 강남.” — 테크밸리 한복판의 역을 찍어보세요.",a:[37.3948,127.1112],n:"판교역 · 판교 테크원 일대",f:"신분당선 판교역에서 강남역까지 약 15분대(관측). ‘판교 집값은 IT 연봉이 받쳐준다’는 의견.",t:"obs"},
{c:"“SRT·GTX-A가 서는 신도시 중심역. 입주 물량 부담 vs 교통 호재 갑론을박 1순위.” — 경기 남부 2기 신도시 중심역을 찍어보세요.",a:[37.2002,127.0956],n:"동탄역 · 동탄2신도시 중심",f:"동탄역은 SRT 정차역이며 GTX-A 수서–동탄 구간이 2024년 개통(관측). ‘GTX로 강남 생활권 편입’은 의견.",t:"obs"},
{c:"“한강 섬 위 금융가. 국제금융센터 옆 공원, 재건축 아파트 썰이 끝없이 도는 곳.” — 그 IFC 일대를 찍어보세요.",a:[37.5252,126.9257],n:"여의도 IFC · 여의도공원 일대",f:"여의도에는 시범·광장 등 재건축 추진 단지가 다수(관측). ‘여의도가 제2의 맨해튼 된다’는 의견.",t:"op"},
{c:"“한강 조망 신축 대단지, 5호선 연장으로 서울 동쪽 끝과 바로 연결.” — 하남의 강변 신도시 중심을 찍어보세요.",a:[37.5631,127.1930],n:"하남 미사강변도시 중심",f:"5호선 하남 연장 구간(미사역 등) 2020~21년 개통(관측). ‘미사는 강동 시세 따라간다’는 의견.",t:"obs"}];
const map=L.map('map',{zoomControl:false,minZoom:7,maxZoom:18,maxBounds:[[32.5,124],[39,132]]}).setView([37.45,127.0],10);
L.control.zoom({position:'topright'}).addTo(map);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Esri World Imagery'}).addTo(map);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,opacity:.8}).addTo(map);
map.createPane('metro').style.zIndex=410;map.createPane('places').style.zIndex=420;map.getPane('metro').style.pointerEvents='none';map.getPane('places').style.pointerEvents='none';
(window.JS_METRO||[]).forEach(l=>{L.polyline(l.p,{pane:'metro',interactive:false,color:'#fff',weight:6,opacity:.35}).addTo(map);L.polyline(l.p,{pane:'metro',interactive:false,color:l.c,weight:3.5,opacity:.85,dashArray:l.d||null}).addTo(map);const m=l.p[Math.floor(l.p.length/2)];L.marker(m,{pane:'places',interactive:false,keyboard:false,icon:L.divIcon({className:'jl-line',html:'<span style="background:'+l.c+'">'+l.n+'</span>',iconSize:null})}).addTo(map)});
const plm=(window.JS_PLACES||[]).map(([n,a,b,z])=>({z,m:L.marker([a,b],{pane:'places',interactive:false,keyboard:false,icon:L.divIcon({className:'jl-place'+(z>=12?' jl-sm':''),html:'<span>'+n+'</span>',iconSize:null})})}));
function upl(){const z=map.getZoom();plm.forEach(o=>{if(z>=o.z)o.m.addTo(map);else o.m.remove()})}map.on('zoomend',upl);upl();
const ic=(e)=>L.divIcon({className:'pin',html:e,iconSize:[30,30],iconAnchor:[15,30]});
let qi=0,guess=null,gm=null,layers=[],res=[],locked=false;
const $=id=>document.getElementById(id);
function hav(a,b){const R=6371,r=x=>x*Math.PI/180,dl=r(b[0]-a[0]),dn=r(b[1]-a[1]);const h=Math.sin(dl/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function score(d){if(d<=.5)return 100;if(d<=1)return 100-(d-.5)*4;const pts=[[1,98],[5,80],[15,50],[40,20],[100,0]];for(let i=1;i<pts.length;i++){const[a,sa]=pts[i-1],[b,sb]=pts[i];if(d<=b)return Math.round(sa+(sb-sa)*(d-a)/(b-a))}return 0}
function load(){locked=false;guess=null;layers.forEach(l=>map.removeLayer(l));layers=[];gm=null;
 $('qbox').hidden=false;$('rbox').hidden=true;$('cbox').hidden=true;$('hint').hidden=false;$('qno').textContent=`Q${qi+1} / 5`;$('clue').textContent=QS[qi].c;$('prog').textContent=`${qi+1}/5`;
 map.setView([37.45,127.0],10)}
map.on('click',e=>{if(locked)return;guess=[e.latlng.lat,e.latlng.lng];if(gm)gm.setLatLng(e.latlng);else{gm=L.marker(e.latlng,{icon:ic('📍'),draggable:true}).addTo(map);gm.on('dragend',()=>{const p=gm.getLatLng();guess=[p.lat,p.lng]});layers.push(gm)}
 $('hint').hidden=true;$('cbox').hidden=false});
$('retry').onclick=()=>{if(locked)return;if(gm){map.removeLayer(gm);layers=layers.filter(l=>l!==gm);gm=null}guess=null;$('cbox').hidden=true;$('hint').hidden=false};
function lockIn(){if(!guess||locked)return;locked=true;gm.dragging&&gm.dragging.disable();const q=QS[qi],d=hav(guess,q.a),s=score(d);res.push({d,s});
 const am=L.marker(q.a,{icon:ic('🏠')}).addTo(map);const ln=L.polyline([guess,q.a],{color:'#ffcc33',dashArray:'6 6',weight:3}).addTo(map);layers.push(am,ln);
 map.fitBounds(L.latLngBounds([guess,q.a]).pad(.4),{maxZoom:15});
 $('qbox').hidden=true;$('rbox').hidden=false;$('rhead').textContent=`${d<1?(d*1000).toFixed(0)+' m':d.toFixed(1)+' km'} 차이 · ${s}점`;
 $('rfact').innerHTML=`정답: <b>${q.n}</b><br><span class="tag obs">관측</span><span class="tag op">의견</span> ${q.f}`;
 $('tot').textContent=res.reduce((a,r)=>a+r.s,0)+'점';$('next').textContent=qi<4?'다음 문제':'결과 보기'}
$('lock').onclick=lockIn;
$('next').onclick=()=>{if(qi<4){qi++;load()}else end()};
const emo=s=>s>=90?'🟩':s>=60?'🟨':s>=30?'🟧':'🟥';
function end(){const t=res.reduce((a,r)=>a+r.s,0);$('big').textContent=`${t} / 500`;
 $('rows').innerHTML=res.map((r,i)=>`${emo(r.s)} Q${i+1} · ${r.d.toFixed(1)}km · ${r.s}점`).join('<br>');$('end').hidden=false;
 window._share=`집썰 오늘의 퀴즈 ${t}/500\n`+res.map((r,i)=>`${emo(r.s)} Q${i+1} ${r.d.toFixed(1)}km`).join('\n')+`\n${location.href.split('?')[0]}`}
$('copy').onclick=()=>{navigator.clipboard?.writeText(window._share).then(()=>$('copy').textContent='복사됨!',()=>prompt('복사하세요',window._share))};
$('again').onclick=()=>{qi=0;res=[];$('tot').textContent='';$('end').hidden=true;load()};
load();
