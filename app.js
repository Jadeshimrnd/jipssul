const SGG={"11440":"서울 마포구","11170":"서울 용산구","11110":"서울 종로구","11620":"서울 관악구","11140":"서울 중구","11305":"서울 강북구","41590":"경기 화성시","41310":"경기 구리시","41117":"경기 수원시 영통구","41465":"경기 용인시 수지구","28185":"인천 연수구","28237":"인천 부평구"};
const $=s=>document.querySelector(s);let ALL=[],S={region:"all",q:"",sgg:"",rep:false,sort:"change",dir:-1,page:0,sel:null,per:12};
const band=b=>b==="~50"?"~50㎡":b==="110+"?"110㎡+":b+"㎡";
const pct=v=>v==null?"-":(v>0?"+":"")+v.toFixed(1)+"%";const cls=v=>v>0?"up":v<0?"down":"";
const eok=v=>v==null?"-":(+v).toFixed(v>=10?1:2).replace(/\.?0+$/,"")+"억";
const gu=s=>(SGG[s]||s).split(" ").slice(1).join(" ");const sido=s=>(SGG[s]||"").split(" ")[0];
function lastMonths(n){const d=new Date(window.UPDATED||Date.now()),o=[];for(let i=0;i<n;i++){const x=new Date(d.getFullYear(),d.getMonth()-i,1);o.push(x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0"))}return o}
function isRep(c){if(c.count<20||c.change==null)return false;const m=new Set((c.series||[]).filter(s=>s.count>0).map(s=>s.month));return lastMonths(6).filter(x=>m.has(x)).length>=4}
const J=u=>fetch(u,{cache:"no-store"}).then(r=>{if(!r.ok)throw 0;return r.json()});
async function get(dir){const a=await J(`${dir}/summary.json?t=${Date.now()}`);const v=a.updated_at||a.updated||"";const b=await fetch(`${dir}/complexes.json?v=${encodeURIComponent(v)}`).then(r=>{if(!r.ok)throw 0;return r.json()});window.DIR=dir;window.VER=v;return[a,b]}
async function init(){let sum,cx;try{[sum,cx]=await get("web_data")}catch(e){[sum,cx]=await get("sample_data");$("#badge").classList.remove("hide")}
window.UPDATED=sum.updated;window.SENTI=sum.sentiment||null;window.RENT=sum.rent||null;ALL=cx.map(c=>({...c,rep:c.rep!=null?c.rep:isRep(c)}));$("#updated").textContent="업데이트 "+sum.updated;
Object.keys(SGG).filter(k=>ALL.some(c=>c.sgg===k)).forEach(k=>$("#sgg").insertAdjacentHTML("beforeend",`<option value="${k}">${SGG[k]}</option>`));
document.querySelectorAll("#tabs a").forEach(a=>a.onclick=()=>{document.querySelectorAll("#tabs a").forEach(x=>x.classList.remove("on"));a.classList.add("on");S.region=a.dataset.r;S.page=0;S.sel=null;render()});
$("#q").oninput=e=>{S.q=e.target.value.trim();S.page=0;renderList()};$("#sgg").onchange=e=>{S.sgg=e.target.value;S.page=0;renderList()};
$("#rep").onchange=e=>{S.rep=e.target.checked;S.page=0;renderList()};
document.querySelectorAll("th[data-s]").forEach(th=>th.onclick=()=>{const k=th.dataset.s;S.dir=S.sort===k?-S.dir:(k==="name"?1:-1);S.sort=k;renderList()});
$("#prev").onclick=()=>{if(S.page>0){S.page--;renderList()}};$("#next").onclick=()=>{S.page++;renderList()};render()}
const inRegion=c=>S.region==="all"||(S.region==="11"?c.sgg.startsWith("11"):/^(41|28)/.test(c.sgg));
function render(){renderSenti();renderRent();const r=ALL.filter(inRegion);$("#k-total").textContent=r.length.toLocaleString();
$("#k-up").textContent=r.filter(c=>c.change>0).length.toLocaleString();$("#k-down").textContent=r.filter(c=>c.change<0).length.toLocaleString();
const reps=r.filter(c=>c.rep);$("#k-rep").textContent=reps.length;
const top=[...reps].sort((a,b)=>b.change-a.change).slice(0,3);
$("#movers").innerHTML=top.map(c=>`<div class="mv" data-id="${c.id}"><div class="g">${SGG[c.sgg]} · ${c.dong}</div><div class="n">${c.name}</div><div class="s"><span>${band(c.band)} · ${eok(c.price)}</span><b class="${cls(c.change)}">${pct(c.change)}</b></div></div>`).join("")||'<p class="muted">조건을 만족하는 단지가 없어요.</p>';
document.querySelectorAll(".mv").forEach(d=>d.onclick=()=>select(d.dataset.id));
if(!S.sel||!r.find(c=>c.id===S.sel))S.sel=(top[0]||r[0]||{}).id;renderList();renderDetail()}
function filtered(){const q=S.q.toLowerCase();let r=ALL.filter(c=>inRegion(c)&&(!S.sgg||c.sgg===S.sgg)&&(!S.rep||c.rep)&&(!q||(c.name+c.dong+SGG[c.sgg]).toLowerCase().includes(q)));
const k=S.sort,d=S.dir;return r.sort((a,b)=>{if(k==="change"){if(a.rep!==b.rep)return a.rep?-1:1;const x=a.change??-1e9*d,y=b.change??-1e9*d;return(x-y)*d}if(k==="name")return(gu(a.sgg)+a.name).localeCompare(gu(b.sgg)+b.name,"ko")*d;if(a[k]==null||b[k]==null)return(a[k]==null)-(b[k]==null);return(a[k]-b[k])*d})}
function renderList(){const r=filtered(),pages=Math.max(1,Math.ceil(r.length/20));S.page=Math.min(S.page,pages-1);const p=r.slice(S.page*20,S.page*20+20);
$("#cnt").textContent=r.length.toLocaleString();
$("#rows").innerHTML=p.map(c=>`<tr data-id="${c.id}" class="${c.id===S.sel?"sel":""}"><td><div class="t1">${c.rep?"★ ":""}${gu(c.sgg)}<i>${sido(c.sgg)}</i></div><div class="t2">${c.name} · ${band(c.band)}</div></td><td class="r">${(+c.price).toFixed(1)}</td><td class="r ${cls(c.change)}">${pct(c.change)}</td><td class="r">${c.jeonse_ratio==null?"-":c.jeonse_ratio.toFixed(0)+"%"}</td></tr>`).join("");
document.querySelectorAll("#rows tr").forEach(t=>t.onclick=()=>select(t.dataset.id));
$("#pinfo").textContent=r.length?`${S.page*20+1}–${S.page*20+p.length} / ${r.length}개`:"결과 없음";
document.querySelectorAll("th[data-s]").forEach(th=>{th.textContent=th.textContent.replace(/ [↑↓]$/,"")+(th.dataset.s===S.sort?(S.dir>0?" ↑":" ↓"):"")})}
function select(id){S.sel=id;renderList();renderDetail();if(innerWidth<=720)$("#detail").scrollIntoView({behavior:"smooth",block:"start"})}
let RZ,RW=innerWidth;addEventListener("resize",()=>{if(innerWidth===RW)return;RW=innerWidth;clearTimeout(RZ);RZ=setTimeout(()=>renderDetail(),200)});
const PERS=[[3,"3개월"],[6,"6개월"],[12,"1년"],[24,"2년"],[36,"3년"],[60,"5년"],[120,"10년"]];let DC={},DREQ=0;
async function loadDetail(c){if(!c.f)return c;if(DC[c.f])return DC[c.f];const r=await fetch(`${window.DIR}/c/${c.f}.json?v=${encodeURIComponent(window.VER)}`);if(!r.ok)throw new Error("detail "+r.status);return DC[c.f]={...c,...await r.json()}}
async function renderDetail(){const c0=ALL.find(x=>x.id===S.sel),el=$("#detail");if(!c0){el.innerHTML='<p class="muted">단지를 선택하세요.</p>';return}
const q=++DREQ;let c=c0.f&&DC[c0.f];if(!c){if(c0.f)el.innerHTML=`<div class="loc">${SGG[c0.sgg]} / ${c0.dong}</div><h2>${c0.name}</h2><p class="muted loading">불러오는 중…</p>`;
try{c=await loadDetail(c0)}catch(e){if(q===DREQ)el.innerHTML=`<h2>${c0.name}</h2><p class="muted">상세 데이터를 불러오지 못했어요.</p>`;return}if(q!==DREQ)return}
const rec=c.recent||[],first=((c.series||[])[0]||{}).month||"9999-99";
const avail=PERS.map(([n],k)=>k<3||first<lastMonths(PERS[k-1][0]).pop());
el.innerHTML=`<div class="loc">${SGG[c.sgg]} / ${c.dong}</div><h2>${c.name}</h2><div class="muted">전용 ${band(c.band)} · 누적 ${c.count}건${c.rep?'<span class="chip">★ 대표 단지 후보</span>':""}</div>
<div class="big">${eok(c.price)}<span class="${cls(c.change)}">${pct(c.change)}</span><span class="muted">최근 3개월 vs 직전 3개월 중위가</span></div>
${c.jeonse!=null||c.jeonse_ratio!=null?`<div class="jst"><div><small>전세 중위가</small><b>${eok(c.jeonse)}</b></div><div><small>전세가율</small><b>${c.jeonse_ratio==null?"-":c.jeonse_ratio.toFixed(1)+"%"}</b></div><span class="muted">최근 6개 완결 월 기준</span></div>`:""}
<div class="per"><span class="pb">${PERS.map(([n,l],k)=>`<button data-n="${n}" class="${S.per===n?"on":""}" ${avail[k]?"":"disabled title='이 기간까지의 거래 기록이 없어요'"}>${l}</button>`).join("")}</span><span class="lg">— 매매 중위가${S.per<=6?' &nbsp;<span class="tdot">●</span> 개별 거래':""}${(c.jeonse_series||[]).length?'&nbsp; <span class="jl">- - 전세 중위가</span>':""} &nbsp; ▮ 거래량</span></div>
<div id="chart"></div><h3>최근 거래 내역 <span class="muted" style="font-weight:400;font-size:12px">${rec.length}건</span></h3>
<table class="tbl"><thead><tr><th>계약일</th><th>전용면적</th><th>층</th><th class="r">거래금액</th></tr></thead><tbody>${rec.map(t=>`<tr><td>${t.date.replace(/-/g,".")}</td><td>${(+t.area).toFixed(2)}㎡</td><td>${t.floor}층</td><td class="r"><b>${eok(t.price)}</b></td></tr>`).join("")||'<tr><td colspan=4 class="muted">거래 없음</td></tr>'}</tbody></table>`;
el.querySelectorAll(".per button").forEach(b=>b.onclick=()=>{if(b.disabled)return;S.per=+b.dataset.n;renderDetail()});chart(c)}
const mi=s=>{const[y,m]=s.split("-");return +y*12+(+m-1)};
function chart(c){const P=S.per||12,ms=lastMonths(P),t0=mi(ms[ms.length-1]),t1=mi(ms[0])+1,box=$("#chart");
const s=(c.series||[]).filter(x=>{const t=mi(x.month);return t>=t0&&t<t1});
const td=P<=6?(c.trades6m||[]).filter(x=>{const t=mi(x.date.slice(0,7));return t>=t0&&t<t1}):[];
const js=(c.jeonse_series||[]).filter(x=>{const t=mi(x.month);return t>=t0&&t<t1});
if(!s.length&&!td.length){box.innerHTML='<p class="muted">기간 내 거래가 없어요.</p>';return}
const W=box.clientWidth||700,H=280,L=26,R=54,T=14,PH=170,BT=200,BH=50;
const av=s.map(x=>x.median).concat(td.map(x=>x.price),js.map(x=>x.median));let mn=Math.min(...av),mx=Math.max(...av);const pad=(mx-mn)*.15||mx*.05||1;mn-=pad;mx+=pad;
const X=t=>L+(t-t0)/(t1-t0)*(W-L-R),Y=p=>T+(mx-p)/(mx-mn)*PH,XM=m=>X(mi(m)+.5),XD=d=>X(mi(d.slice(0,7))+(+d.slice(8,10)-.5)/31);
const cm=Math.max(1,...s.map(x=>x.count)),bw=Math.max(2,Math.min(14,(W-L-R)/P*.55));
let g="";for(let i=0;i<=4;i++){const p=mn+(mx-mn)*i/4;g+=`<line x1="${L}" x2="${W-R}" y1="${Y(p)}" y2="${Y(p)}" stroke="#e8dfcf" stroke-dasharray="3 3"/><text x="${W-R+6}" y="${Y(p)+3}">${p.toFixed(1)}</text>`}
let lab="";if(P>=36){for(let t=Math.ceil(t0/12)*12;t<t1;t+=12)lab+=`<line x1="${X(t)}" x2="${X(t)}" y1="${T}" y2="${BT+BH}" stroke="#efe7d9"/><text x="${X(t)+3}" y="${H-6}">${t/12}</text>`}
else{const st=P<=12?(P<=6?1:2):3;for(let t=t0;t<t1;t++)if((t1-1-t)%st===0)lab+=`<text x="${X(t+.5)}" y="${H-6}" text-anchor="middle">${String(Math.floor(t/12)).slice(2)}.${String(t%12+1).padStart(2,"0")}</text>`}
const pts=s.map(x=>`${XM(x.month)},${Y(x.median)}`).join(" ");
const bars=s.map((x,i)=>`<rect x="${XM(x.month)-bw/2}" y="${BT+BH-x.count/cm*BH}" width="${bw}" height="${x.count/cm*BH}" fill="${i===s.length-1?"#8a6a43":"#d9c9ab"}"><title>${x.month} ${x.count}건</title></rect>`).join("");
const dots=s.length>60?"":s.map(x=>`<circle cx="${XM(x.month)}" cy="${Y(x.median)}" r="2.5" fill="#fff" stroke="#7a5a35"><title>${x.month} ${x.median}억 (${x.count}건)</title></circle>`).join("");
const tdots=td.map(x=>`<circle cx="${XD(x.date)}" cy="${Y(x.price)}" r="3" fill="#c9973d" fill-opacity=".55" stroke="#8a6a43" stroke-width=".6"><title>${x.date} ${x.price}억 · ${x.floor}층 · ${(+x.area).toFixed(1)}㎡</title></circle>`).join("");
const jl=js.length?`<polyline points="${js.map(x=>`${XM(x.month)},${Y(x.median)}`).join(" ")}" fill="none" stroke="#3f6a9a" stroke-width="1.8" stroke-dasharray="5 4"/>${js.length>60?"":js.map(x=>`<circle cx="${XM(x.month)}" cy="${Y(x.median)}" r="2" fill="#3f6a9a"><title>${x.month} 전세 ${x.median}억</title></circle>`).join("")}`:"";
const lastv=s.length?s[s.length-1].median:td[td.length-1].price,ly=Y(lastv);
const area=s.length>1?`<polygon points="${XM(s[0].month)},${T+PH} ${pts} ${XM(s[s.length-1].month)},${T+PH}" fill="#efe4d0" opacity=".6"/>`:"";
box.innerHTML=`<svg width="${W}" height="${H}">${g}${area}<polyline points="${pts}" fill="none" stroke="#7a5a35" stroke-width="2"/>${tdots}${dots}${jl}
<rect x="${W-R+2}" y="${ly-9}" width="${R-4}" height="18" rx="3" fill="#7a5a35"/><text x="${W-R+8}" y="${ly+4}" style="fill:#fff;font-weight:700">${lastv.toFixed(1)}</text>${bars}${lab}</svg>`}
function renderSenti(){const all=window.SENTI;const v=all&&all[{all:"all","11":"seoul",ext:"gyeonggi_incheon"}[S.region]];const el=$("#senti");if(!v)return;
const k=v.label==="매수 우위"?"buy":v.label==="매도 우위"?"sell":"hold",g=v.signals||{},w=v.windows||{},m=v.monthly||[];
const sg=x=>x==null?"-":(x>0?"+":"")+x.toFixed(1)+"%",fm=s=>s?s.replace("-",".").slice(2):"";
let sp="";if(m.length>1){const W=200,H=40,mx=Math.max(...m.map(x=>x.count),1),X=i=>4+i*(W-8)/(m.length-1),Y=c=>H-4-c/mx*(H-10);
const pts=m.map((x,i)=>`${X(i)},${Y(x.count)}`).join(" ");sp=`<svg class="spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><polyline points="${pts}" fill="none" stroke="#8a6a43" stroke-width="1.6"/>${m.map((x,i)=>`<circle cx="${X(i)}" cy="${Y(x.count)}" r="${i===m.length-1?2.6:1.4}" fill="#8a6a43"><title>${x.month} ${x.count.toLocaleString()}건</title></circle>`).join("")}</svg>`}
el.innerHTML=`<div class="ch"><h3>지금, 시장의 마음</h3><span class="sb ${k}">${v.label}</span></div>
<div class="gauge"><div class="gt"><i style="left:${Math.max(0,Math.min(100,v.score))}%"></i></div><b>${v.score}<small>/100</small></b></div>
<div class="gl"><span>매도 우위</span><span>관망</span><span>매수 우위</span></div><p class="ss">${v.summary}</p>
<div class="sigs"><div><small>거래량 (전년 동기)</small><b class="${cls(g.volume_change_pct)}">${sg(g.volume_change_pct)}</b></div><div><small>상승 단지 비중</small><b>${g.rising_share_pct==null?"-":g.rising_share_pct.toFixed(0)+"%"}</b></div><div><small>신고가 비중</small><b>${g.new_high_share_pct==null?"-":g.new_high_share_pct.toFixed(0)+"%"}</b></div></div>
<div class="spw">${sp}<span class="muted sm2">월별 거래량 (최근 12개월)<br>비교: ${fm(w.recent&&w.recent[0])}~${fm(w.recent&&w.recent[1])} vs ${fm(w.prev&&w.prev[0])}~${fm(w.prev&&w.prev[1])} (작년 같은 기간)</span></div><p class="muted fn">※ 실거래는 계약 후 30일 안에 신고돼 이번 달은 제외했고, 지난달은 아직 일부 덜 집계됐을 수 있어요.</p>`}
function renderRent(){const all=window.RENT;const v=all&&all[{all:"all","11":"seoul",ext:"gyeonggi_incheon"}[S.region]];const el=$("#rentc");if(!v)return;
const sg=x=>x==null?"-":(x>0?"+":"")+x.toFixed(1)+"%",pp=x=>x==null?"-":(x>0?"+":"")+x.toFixed(1)+"%p",m=v.monthly||[],w=v.windows||{},fm=s=>s?s.replace("-",".").slice(2):"";
let sp="";if(m.length>1){const W=200,H=40,mx=Math.max(...m.map(x=>Math.max(x.jeonse,x.wolse)),1),X=i=>4+i*(W-8)/(m.length-1),Y=c=>H-4-c/mx*(H-10);
const ln=(k,c,da)=>`<polyline points="${m.map((x,i)=>`${X(i)},${Y(x[k])}`).join(" ")}" fill="none" stroke="${c}" stroke-width="1.6" ${da?'stroke-dasharray="4 3"':""}/>`;
sp=`<svg class="spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${ln("jeonse","#8a6a43")}${ln("wolse","#3f6a9a",1)}${m.map((x,i)=>`<rect x="${X(i)-3}" y="0" width="6" height="${H}" fill="transparent"><title>${x.month} 전세 ${x.jeonse} · 월세 ${x.wolse}</title></rect>`).join("")}</svg>`}
el.innerHTML=`<div class="ch"><h3>전·월세 거래 흐름</h3><span class="tag">최근 3개월 · 작년 같은 기간 대비</span></div>
<div class="sigs r4"><div><small>전세</small><b>${(v.jeonse||0).toLocaleString()}</b><em class="${cls(v.jeonse_yoy_pct)}">${sg(v.jeonse_yoy_pct)}</em></div><div><small>월세</small><b>${(v.wolse||0).toLocaleString()}</b><em class="${cls(v.wolse_yoy_pct)}">${sg(v.wolse_yoy_pct)}</em></div>
<div><small>월세 비중</small><b>${v.wolse_share_pct==null?"-":v.wolse_share_pct.toFixed(0)+"%"}</b><em class="${cls(v.wolse_share_change_pp)}">${pp(v.wolse_share_change_pp)}</em></div><div><small>갱신 비중</small><b>${v.renewal_share_pct==null?"-":v.renewal_share_pct.toFixed(0)+"%"}</b><em>&nbsp;</em></div></div>
<p class="ss">${v.summary}</p><div class="spw">${sp}<span class="muted sm2"><span class="jl2">— 전세</span> <span class="jl">- - 월세</span> 월별 건수 (최근 12개월)<br>비교: ${fm(w.recent&&w.recent[0])}~${fm(w.recent&&w.recent[1])} vs ${fm(w.prev&&w.prev[0])}~${fm(w.prev&&w.prev[1])} (작년 같은 기간)</span></div>
<p class="muted fn">※ 실거래는 계약 후 30일 안에 신고돼 이번 달은 제외했고, 지난달은 아직 일부 덜 집계됐을 수 있어요.</p>`}
init();
