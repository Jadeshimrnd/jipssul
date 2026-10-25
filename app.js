let SGG={"11440":"서울 마포구","11170":"서울 용산구","11110":"서울 종로구","11620":"서울 관악구","11140":"서울 중구","11305":"서울 강북구","41590":"경기 화성시","41310":"경기 구리시","41117":"경기 수원시 영통구","41465":"경기 용인시 수지구","28185":"인천 연수구","28237":"인천 부평구"};
const $=s=>document.querySelector(s);let ALL=[],S={region:"all",q:"",sgg:"",rep:false,sort:"pc",dir:-1,pd:90,page:0,sel:null,per:12};
const isDark=()=>document.documentElement.dataset.theme==="dark";
const band=b=>b==="~50"?"~50㎡":b==="110+"?"110㎡+":b+"㎡";
const pct=v=>v==null?"-":(v>0?"+":"")+v.toFixed(1)+"%";const cls=v=>v>0?"up":v<0?"down":"";
const pill=v=>v==null?'<span class="pct-pill flat">-</span>':`<span class="pct-pill ${v>0?"up":v<0?"down":"flat"}">${pct(v)}</span>`;
const eok=v=>v==null?"-":(+v).toFixed(v>=10?1:2).replace(/\.?0+$/,"")+"억";
const gu=s=>(SGG[s]||s).split(" ").slice(1).join(" ");const sido=s=>(SGG[s]||"").split(" ")[0];
const esc=s=>String(s||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));

function syncThemeBtn(){
  const btn=$("#theme-toggle"),dk=isDark(),meta=$("#meta-theme");
  if(btn)btn.textContent=dk?"☀️ 라이트":"🌙 다크";
  if(meta)meta.content=dk?"#0B0F19":"#3182F6";
}
function toggleTheme(){
  const next=isDark()?"light":"dark";
  if(next==="dark")document.documentElement.dataset.theme="dark";
  else document.documentElement.removeAttribute("data-theme");
  try{localStorage.setItem("jade_theme",next)}catch(e){}
  syncThemeBtn();renderSenti();renderRent();renderDetail();
}

function lastMonths(n){const d=new Date(window.UPDATED||Date.now()),o=[];for(let i=0;i<n;i++){const x=new Date(d.getFullYear(),d.getMonth()-i,1);o.push(x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0"))}return o}
function isRep(c){if(c.count<20||c.change==null)return false;const m=new Set((c.series||[]).filter(s=>s.count>0).map(s=>s.month));return lastMonths(6).filter(x=>m.has(x)).length>=4}
const J=u=>fetch(u,{cache:"no-store"}).then(r=>{if(!r.ok)throw 0;return r.json()});
async function get(dir){const a=await J(`${dir}/summary.json?t=${Date.now()}`);const v=a.updated_at||a.updated||"";const b=await fetch(`${dir}/complexes.json?v=${encodeURIComponent(v)}`).then(r=>{if(!r.ok)throw 0;return r.json()});window.DIR=dir;window.VER=v;return[a,b]}
async function init(){
  syncThemeBtn();
  const tb=$("#theme-toggle");if(tb)tb.onclick=toggleTheme;
  initTicker();
  initLounge();
  initCommunityBoard();
  initReportModal();
  initBottomNav();
  let sum,cx;try{[sum,cx]=await get("web_data")}catch(e){[sum,cx]=await get("sample_data");$("#badge").classList.remove("hide")}
  window.UPDATED=sum.updated;window.SENTI=sum.sentiment||null;window.RENT=sum.rent||null;if(sum.regions)SGG={...SGG,...sum.regions};const arr=Array.isArray(cx)?cx:cx.rows.map(r=>Object.fromEntries(cx.cols.map((k,i)=>[k,r[i]])));ALL=arr.map(c=>({...c,id:c.id||c.f,rep:c.rep!=null?c.rep:isRep(c)}));window.PMETA=sum.periods||null;applyPd();renderPd();FAV=FAV.filter(k=>SGG[k]);saveFav();$("#updated").textContent="업데이트 "+sum.updated;
  fillSgg();renderFavBar();$("#favbtn").onclick=()=>openFav();$("#favclose").onclick=closeFav;$("#favdim").onclick=closeFav;$("#favq").oninput=renderFavPick;
  document.querySelectorAll("#tabs a").forEach(a=>a.onclick=()=>{document.querySelectorAll("#tabs a").forEach(x=>x.classList.remove("on"));a.classList.add("on");S.region=a.dataset.r;S.page=0;S.sel=null;render();if(S.region==="fav"&&!FAV.length)openFav()});
  $("#q").oninput=e=>{S.q=e.target.value.trim();S.page=0;renderList()};$("#sgg").onchange=e=>{S.sgg=e.target.value;S.page=0;renderList()};
  $("#rep").onchange=e=>{S.rep=e.target.checked;S.page=0;renderList()};
  document.querySelectorAll("th[data-s]").forEach(th=>th.onclick=()=>{const k=th.dataset.s;S.dir=S.sort===k?-S.dir:(k==="name"?1:-1);S.sort=k;renderList()});
  $("#prev").onclick=()=>{if(S.page>0){S.page--;renderList()}};$("#next").onclick=()=>{S.page++;renderList()};render()
}
const inRegion=c=>S.region==="all"||(S.region==="fav"?FAV.includes(c.sgg):false)||S.region!=="fav"&&(S.region==="11"?c.sgg.startsWith("11"):/^(41|28)/.test(c.sgg));
// ---------- 마켓 탐색 기간 (7~365일) ----------
const PDS=[7,30,60,90,180,365];
function applyPd(){const ds=(window.PMETA&&window.PMETA.days)||PDS,i=ds.indexOf(S.pd);ALL.forEach(c=>{const x=c.p&&i>=0?c.p[i]:null;if(x){c.pp=x[0];c.pc=x[1];c.pn=x[2]}else{c.pp=null;c.pc=c.change;c.pn=null}})}
function renderPd(){const m=window.PMETA,r=m&&m.ranges&&m.ranges[S.pd],fd=s=>s.replace(/-/g,".");
$("#pdb").innerHTML=PDS.map(n=>`<button data-n="${n}" class="${S.pd===n?"on":""}">${n}일</button>`).join("");
$("#pdcap").innerHTML=(r?`${fd(r.from)} ~ ${fd(r.to)} vs 직전 ${S.pd}일 (${fd(r.prev_from)} ~ ${fd(r.prev_to)}) · 중위가 비교, 양쪽 각 ${m.min_trades[S.pd]}건 이상일 때만 등락률 표시`:"최근 3개월 vs 직전 3개월 중위가")+`<br>※ 최근 30일은 신고 지연(계약 후 30일 내 신고)으로 거래가 덜 잡힐 수 있어요.`;
$("#mvtag").textContent=`최근 ${S.pd}일 상승률 상위 · 거래 활발 단지`;
document.querySelectorAll("#pdb button").forEach(b=>b.onclick=()=>{S.pd=+b.dataset.n;S.page=0;applyPd();renderPd();render();b.scrollIntoView({block:"nearest",inline:"nearest"})})}
function render(){renderSenti();renderRent();const r=ALL.filter(inRegion);$("#k-total").textContent=r.length.toLocaleString();
$("#k-up").textContent=r.filter(c=>c.change>0).length.toLocaleString();$("#k-down").textContent=r.filter(c=>c.change<0).length.toLocaleString();
const reps=r.filter(c=>c.rep);$("#k-rep").textContent=reps.length.toLocaleString();
const top=reps.filter(c=>c.pc!=null).sort((a,b)=>b.pc-a.pc).slice(0,3);
$("#movers").innerHTML=top.map((c,idx)=>`<div class="mv" data-id="${c.id}"><div class="mv-top"><div class="g">${SGG[c.sgg]} · ${c.dong}</div><span class="mv-rank">TOP ${idx+1}</span></div><div class="n">${c.name}</div><div class="s"><span>${band(c.band)} · <b>${eok(c.pp??c.price)}</b></span>${pill(c.pc)}</div></div>`).join("")||'<p class="muted">조건을 만족하는 단지가 없어요.</p>';
document.querySelectorAll(".mv").forEach(d=>d.onclick=()=>select(d.dataset.id));
if(!S.sel||!r.find(c=>c.id===S.sel))S.sel=(top[0]||r[0]||{}).id;renderList();renderDetail()}
function filtered(){const q=S.q.toLowerCase();let r=ALL.filter(c=>inRegion(c)&&(!S.sgg||c.sgg===S.sgg)&&(!S.rep||c.rep)&&(!q||(c.name+c.dong+SGG[c.sgg]).toLowerCase().includes(q)));
const k=S.sort,d=S.dir;return r.sort((a,b)=>{if(k==="pc"){if((a.pc==null)!==(b.pc==null))return a.pc==null?1:-1;if(a.rep!==b.rep)return a.rep?-1:1;return((a.pc||0)-(b.pc||0))*d}if(k==="pp"){const x=a.pp??a.price,y=b.pp??b.price;return(x-y)*d}if(k==="name")return(gu(a.sgg)+a.name).localeCompare(gu(b.sgg)+b.name,"ko")*d;if(a[k]==null||b[k]==null)return(a[k]==null)-(b[k]==null);return(a[k]-b[k])*d})}
function renderList(){const r=filtered(),pages=Math.max(1,Math.ceil(r.length/20));S.page=Math.min(S.page,pages-1);const p=r.slice(S.page*20,S.page*20+20);
$("#cnt").textContent=r.length.toLocaleString();
$("#rows").innerHTML=p.map(c=>`<tr data-id="${c.id}" class="${c.id===S.sel?"sel":""}"><td><div class="t1">${c.rep?'<span class="rep-star">★</span> ':""}${gu(c.sgg)}<i>${sido(c.sgg)}</i></div><div class="t2">${c.name} · ${band(c.band)}</div></td><td class="r"><b>${c.pp!=null?(+c.pp).toFixed(1):`<span class="muted" title="기간 내 거래 없음 · 마지막 거래가">${(+c.price).toFixed(1)}</span>`}</b></td><td class="r">${pill(c.pc)}${c.pn!=null?`<div class="t3">${c.pn}건</div>`:""}</td><td class="r">${c.jeonse_ratio==null?"-":c.jeonse_ratio.toFixed(0)+"%"}</td></tr>`).join("");
document.querySelectorAll("#rows tr").forEach(t=>t.onclick=()=>select(t.dataset.id));
$("#pinfo").textContent=r.length?`${S.page*20+1}–${S.page*20+p.length} / ${r.length.toLocaleString()}개`:"결과 없음";
document.querySelectorAll("th[data-s]").forEach(th=>{th.textContent=th.textContent.replace(/ [↑↓]$/,"")+(th.dataset.s===S.sort?(S.dir>0?" ↑":" ↓"):"")})}
function select(id){S.sel=id;renderList();renderDetail();if(innerWidth<=720)$("#detail").scrollIntoView({behavior:"smooth",block:"start"})}
let RZ,RW=innerWidth;addEventListener("resize",()=>{if(innerWidth===RW)return;RW=innerWidth;clearTimeout(RZ);RZ=setTimeout(()=>renderDetail(),200)});
const PERS=[[3,"3개월"],[6,"6개월"],[12,"1년"],[24,"2년"],[36,"3년"],[60,"5년"],[120,"10년"]];let DC={},DREQ=0;
async function loadDetail(c){if(!c.f)return c;if(DC[c.f])return DC[c.f];const r=await fetch(`${window.DIR}/c/${c.f}.json?v=${encodeURIComponent(window.VER)}`);if(!r.ok)throw new Error("detail "+r.status);return DC[c.f]={...c,...await r.json()}}
async function renderDetail(){const c0=ALL.find(x=>x.id===S.sel),el=$("#detail");if(!c0){el.innerHTML='<p class="muted">단지를 선택하세요.</p>';return}
const q=++DREQ;let c=c0.f&&DC[c0.f];if(!c){if(c0.f)el.innerHTML=`<div class="loc">${SGG[c0.sgg]} / ${c0.dong}</div><h2>${c0.name}</h2><p class="muted loading">불러오는 중…</p>`;
try{c=await loadDetail(c0)}catch(e){if(q===DREQ)el.innerHTML=`<h2>${c0.name}</h2><p class="muted">상세 데이터를 불러오지 못했어요.</p>`;return}if(q!==DREQ)return}
window.CUR_CX=c;
const rec=c.recent||[],first=((c.series||[])[0]||{}).month||"9999-99";
const avail=PERS.map(([n],k)=>k<3||first<lastMonths(PERS[k-1][0]).pop());
el.innerHTML=`<div class="loc">${SGG[c.sgg]} · ${c.dong}</div><h2>${c.name}</h2><div class="muted">전용 ${band(c.band)} · 누적 ${(c.count||0).toLocaleString()}건${c.rep?'<span class="chip">★ 대표 단지 후보</span>':""}</div>
<div class="big">${eok(c.price)}${pill(c.change)}<span class="muted">최근 3개월 vs 직전 3개월 중위가</span></div>
${c.jeonse!=null||c.jeonse_ratio!=null?`<div class="jst"><div><small>전세 중위가</small><b>${eok(c.jeonse)}</b></div><div><small>전세가율</small><b>${c.jeonse_ratio==null?"-":c.jeonse_ratio.toFixed(1)+"%"}</b></div><span class="muted">최근 6개 완결 월 기준</span></div>`:""}
<div class="per"><span class="pb">${PERS.map(([n,l],k)=>`<button data-n="${n}" class="${S.per===n?"on":""}" ${avail[k]?"":"disabled title='이 기간까지의 거래 기록이 없어요'"}>${l}</button>`).join("")}</span><span class="lg"><span class="jl2">— 매매 중위가</span>${S.per<=6?' &nbsp;<span class="tdot">●</span> 개별 거래':""}${(c.jeonse_series||[]).length?'&nbsp; <span class="jl">- - 전세 중위가</span>':""} &nbsp; ▮ 거래량</span></div>
<div id="chart"></div>
<div id="cx-talk" class="cx-talk"></div>
<div id="mono-cta" class="mono-cta"></div>
<h3>최근 거래 내역 <span class="muted" style="font-weight:500;font-size:12px">${rec.length}건</span></h3>
<table class="tbl"><thead><tr><th>계약일</th><th>전용면적</th><th>층</th><th class="r">거래금액</th></tr></thead><tbody>${rec.map(t=>`<tr><td>${t.date.replace(/-/g,".")}</td><td>${(+t.area).toFixed(2)}㎡</td><td>${t.floor}층</td><td class="r"><b>${eok(t.price)}</b></td></tr>`).join("")||'<tr><td colspan=4 class="muted">거래 없음</td></tr>'}</tbody></table>`;
el.querySelectorAll(".per button").forEach(b=>b.onclick=()=>{if(b.disabled)return;S.per=+b.dataset.n;renderDetail()});
chart(c);
renderCxTalk(c);
renderMonoCta(c);
}
const mi=s=>{const[y,m]=s.split("-");return +y*12+(+m-1)};
function chart(c){const P=S.per||12,ms=lastMonths(P),t0=mi(ms[ms.length-1]),t1=mi(ms[0])+1,box=$("#chart");
const s=(c.series||[]).filter(x=>{const t=mi(x.month);return t>=t0&&t<t1});
const td=P<=6?(c.trades6m||[]).filter(x=>{const t=mi(x.date.slice(0,7));return t>=t0&&t<t1}):[];
const js=(c.jeonse_series||[]).filter(x=>{const t=mi(x.month);return t>=t0&&t<t1});
if(!s.length&&!td.length){box.innerHTML='<p class="muted">기간 내 거래가 없어요.</p>';return}
const dk=isDark();
const cLine=dk?"#60A5FA":"#3182F6",cGrid=dk?"rgba(255,255,255,0.08)":"#E5E8EB",cJeonse=dk?"#34D399":"#10B981";
const cBar=dk?"#334155":"#CBD5E1",cDot="#F59E0B",cDotStroke=dk?"#FBBF24":"#D97706",cSurf=dk?"#151C2C":"#FFFFFF";
const W=box.clientWidth||700,H=285,L=20,R=56,T=18,PH=172,BT=204,BH=50;
const av=s.map(x=>x.median).concat(td.map(x=>x.price),js.map(x=>x.median));let mn=Math.min(...av),mx=Math.max(...av);const pad=(mx-mn)*.15||mx*.05||1;mn-=pad;mx+=pad;
const X=t=>L+(t-t0)/(t1-t0)*(W-L-R),Y=p=>T+(mx-p)/(mx-mn)*PH,XM=m=>X(mi(m)+.5),XD=d=>X(mi(d.slice(0,7))+(+d.slice(8,10)-.5)/31);
const cm=Math.max(1,...s.map(x=>x.count)),bw=Math.max(2.5,Math.min(14,(W-L-R)/P*.55));
let g="";for(let i=0;i<=4;i++){const p=mn+(mx-mn)*i/4;g+=`<line x1="${L}" x2="${W-R}" y1="${Y(p)}" y2="${Y(p)}" stroke="${cGrid}" stroke-dasharray="3 3"/><text x="${W-R+8}" y="${Y(p)+3.5}">${p.toFixed(1)}</text>`}
let lab="";if(P>=36){for(let t=Math.ceil(t0/12)*12;t<t1;t+=12)lab+=`<line x1="${X(t)}" x2="${X(t)}" y1="${T}" y2="${BT+BH}" stroke="${cGrid}"/><text x="${X(t)+4}" y="${H-6}">${t/12}</text>`}
else{const st=P<=12?(P<=6?1:2):3;for(let t=t0;t<t1;t++)if((t1-1-t)%st===0)lab+=`<text x="${X(t+.5)}" y="${H-6}" text-anchor="middle">${String(Math.floor(t/12)).slice(2)}.${String(t%12+1).padStart(2,"0")}</text>`}
const pts=s.map(x=>`${XM(x.month)},${Y(x.median)}`).join(" ");
const bars=s.map((x,i)=>`<rect x="${XM(x.month)-bw/2}" y="${BT+BH-x.count/cm*BH}" width="${bw}" height="${Math.max(2,x.count/cm*BH)}" rx="2" fill="${i===s.length-1?cLine:cBar}"><title>${x.month} ${x.count}건</title></rect>`).join("");
const dots=s.length>60?"":s.map(x=>`<circle cx="${XM(x.month)}" cy="${Y(x.median)}" r="3" fill="${cSurf}" stroke="${cLine}" stroke-width="2"><title>${x.month} ${x.median}억 (${x.count}건)</title></circle>`).join("");
const tdots=td.map(x=>`<circle cx="${XD(x.date)}" cy="${Y(x.price)}" r="3.2" fill="${cDot}" fill-opacity=".68" stroke="${cDotStroke}" stroke-width=".8"><title>${x.date} ${x.price}억 · ${x.floor}층 · ${(+x.area).toFixed(1)}㎡</title></circle>`).join("");
const jl=js.length?`<polyline points="${js.map(x=>`${XM(x.month)},${Y(x.median)}`).join(" ")}" fill="none" stroke="${cJeonse}" stroke-width="2" stroke-dasharray="5 4"/>${js.length>60?"":js.map(x=>`<circle cx="${XM(x.month)}" cy="${Y(x.median)}" r="2.2" fill="${cJeonse}"><title>${x.month} 전세 ${x.median}억</title></circle>`).join("")}`:"";
const lastv=s.length?s[s.length-1].median:td[td.length-1].price,ly=Y(lastv);
const area=s.length>1?`<polygon points="${XM(s[0].month)},${T+PH} ${pts} ${XM(s[s.length-1].month)},${T+PH}" fill="url(#cg)"/>`:"";
const defs=`<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${cLine}" stop-opacity="${dk?0.36:0.24}"/><stop offset="100%" stop-color="${cLine}" stop-opacity="0"/></linearGradient></defs>`;
box.innerHTML=`<div id="ctip" class="chart-tip hide"></div><svg id="csvg" width="${W}" height="${H}">${defs}${g}${area}<polyline points="${pts}" fill="none" stroke="${cLine}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${tdots}${dots}${jl}
<line id="cguide" x1="0" x2="0" y1="${T}" y2="${BT+BH}" stroke="${cLine}" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>
<circle id="cdot" cx="0" cy="0" r="5.5" fill="${cLine}" stroke="${cSurf}" stroke-width="2.5" opacity="0"/>
<rect x="${W-R+4}" y="${ly-10}" width="${R-6}" height="20" rx="5" fill="${cLine}"/><text x="${W-R+10}" y="${ly+3.5}" style="fill:#fff;font-weight:700">${lastv.toFixed(1)}</text>${bars}${lab}</svg>`;
if(s.length){
  const svg=$("#csvg"),tip=$("#ctip"),gd=$("#cguide"),dt=$("#cdot"),jMap=Object.fromEntries(js.map(x=>[x.month,x.median]));
  const show=clientX=>{
    const rect=svg.getBoundingClientRect(),px=clientX-rect.left;
    let best=s[0],bd=Infinity;
    for(const pt of s){const d=Math.abs(XM(pt.month)-px);if(d<bd){bd=d;best=pt}}
    const cx=XM(best.month),cy=Y(best.median);
    gd.setAttribute("x1",cx);gd.setAttribute("x2",cx);gd.setAttribute("opacity","0.75");
    dt.setAttribute("cx",cx);dt.setAttribute("cy",cy);dt.setAttribute("opacity","1");
    const jv=jMap[best.month];
    tip.innerHTML=`<span class="ct-m">${best.month.replace("-",".")}</span><span class="ct-p">매매 ${eok(best.median)}</span>${jv!=null?`<span class="ct-j">전세 ${eok(jv)}</span>`:""}<span class="ct-c">거래 ${best.count}건</span>`;
    tip.classList.remove("hide");
  };
  const hide=()=>{tip.classList.add("hide");gd.setAttribute("opacity","0");dt.setAttribute("opacity","0")};
  svg.onmousemove=e=>show(e.clientX);
  svg.onmouseleave=hide;
  svg.ontouchstart=e=>{if(e.touches[0])show(e.touches[0].clientX)};
  svg.ontouchmove=e=>{if(e.touches[0])show(e.touches[0].clientX)};
  svg.ontouchend=hide;
}}

// ---------- 지금, 시장의 마음 + 1초 체감 투표 위젯 ----------
const FEEL_SEEDS={
  all:{buy:142,hold:114,sell:56},
  seoul:{buy:158,hold:96,sell:44},
  gyeonggi_incheon:{buy:134,hold:108,sell:52}
};
function renderSenti(){const all=window.SENTI;const scope={all:"all","11":"seoul",ext:"gyeonggi_incheon"}[S.region]||"all";const v=all&&all[scope];const el=$("#senti");if(!v)return;
const k=v.label==="매수 우위"?"buy":v.label==="매도 우위"?"sell":"hold",g=v.signals||{},w=v.windows||{},m=v.monthly||[];
const sg=x=>x==null?"-":(x>0?"+":"")+x.toFixed(1)+"%",fm=s=>s?s.replace("-",".").slice(2):"";
const cLine=isDark()?"#60A5FA":"#3182F6";
let sp="";if(m.length>1){const W=200,H=42,mx=Math.max(...m.map(x=>x.count),1),X=i=>5+i*(W-10)/(m.length-1),Y=c=>H-5-c/mx*(H-12);
const pts=m.map((x,i)=>`${X(i)},${Y(x.count)}`).join(" ");
const area=`${X(0)},${H-2} ${pts} ${X(m.length-1)},${H-2}`;
sp=`<svg class="spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="sgSenti" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${cLine}" stop-opacity="0.28"/><stop offset="100%" stop-color="${cLine}" stop-opacity="0"/></linearGradient></defs><polygon points="${area}" fill="url(#sgSenti)"/><polyline points="${pts}" fill="none" stroke="${cLine}" stroke-width="2" stroke-linecap="round"/>${m.map((x,i)=>`<circle cx="${X(i)}" cy="${Y(x.count)}" r="${i===m.length-1?3:1.5}" fill="${cLine}"><title>${x.month} ${x.count.toLocaleString()}건</title></circle>`).join("")}</svg>`}

const seed=FEEL_SEEDS[scope]||FEEL_SEEDS.all;
let myVote=null;try{myVote=localStorage.getItem("jade_feel_vote_"+scope)}catch(e){}
const cBuy=seed.buy+(myVote==="buy"?1:0),cHold=seed.hold+(myVote==="hold"?1:0),cSell=seed.sell+(myVote==="sell"?1:0);
const tot=cBuy+cHold+cSell;
const pBuy=Math.round(cBuy/tot*100),pHold=Math.round(cHold/tot*100),pSell=Math.max(0,100-pBuy-pHold);

el.innerHTML=`<div class="ch"><h3>지금, 시장의 마음</h3><div class="ch-tags"><span class="src-tag">📊 국토교통부 실거래 관측 데이터</span><span class="sb ${k}">${v.label}</span></div></div>
<div class="gauge"><div class="gt"><i style="left:${Math.max(0,Math.min(100,v.score))}%"></i></div><b>${v.score}<small>/100</small></b></div>
<div class="gl"><span>매도 우위</span><span>관망</span><span>매수 우위</span></div><p class="ss">${v.summary}</p>
<div class="sigs"><div><small>거래량 (전년 동기)</small><b class="${cls(g.volume_change_pct)}">${sg(g.volume_change_pct)}</b></div><div><small>상승 단지 비중</small><b>${g.rising_share_pct==null?"-":g.rising_share_pct.toFixed(0)+"%"}</b></div><div><small>신고가 비중</small><b>${g.new_high_share_pct==null?"-":g.new_high_share_pct.toFixed(0)+"%"}</b></div></div>
<div class="spw">${sp}<span class="muted sm2">월별 거래량 (최근 12개월)<br>비교: ${fm(w.recent&&w.recent[0])}~${fm(w.recent&&w.recent[1])} vs ${fm(w.prev&&w.prev[0])}~${fm(w.prev&&w.prev[1])} (작년 같은 기간)</span></div>
<div class="feel-poll">
  <div class="fp-head">
    <div class="fp-title">⚡ 1초 체감 투표 · 실거래 데이터는 <em>${v.score}점(${v.label})</em>입니다. 지금 내가 현장에서 느끼는 체감은?</div>
    <span class="fp-cnt">총 ${tot.toLocaleString()}명 참여</span>
  </div>
  <div class="fp-btns">
    <button type="button" class="fp-btn buy ${myVote==="buy"?"on":""}" data-v="buy">
      <span class="fp-lbl">🔥 매수 타이밍${myVote==="buy"?'<span class="fp-my">내 선택</span>':""}</span>
      <span class="fp-sub">${pBuy}% (${cBuy}명)</span>
    </button>
    <button type="button" class="fp-btn hold ${myVote==="hold"?"on":""}" data-v="hold">
      <span class="fp-lbl">🤔 아직 관망${myVote==="hold"?'<span class="fp-my">내 선택</span>':""}</span>
      <span class="fp-sub">${pHold}% (${cHold}명)</span>
    </button>
    <button type="button" class="fp-btn sell ${myVote==="sell"?"on":""}" data-v="sell">
      <span class="fp-lbl">❄️ 매도·갈아타기${myVote==="sell"?'<span class="fp-my">내 선택</span>':""}</span>
      <span class="fp-sub">${pSell}% (${cSell}명)</span>
    </button>
  </div>
  <div class="fp-bar">
    <div class="fp-seg buy" style="width:${pBuy}%"></div>
    <div class="fp-seg hold" style="width:${pHold}%"></div>
    <div class="fp-seg sell" style="width:${pSell}%"></div>
  </div>
  <div class="fp-stat">
    <span class="up">🔥 매수 ${pBuy}%</span>
    <span>🤔 관망 ${pHold}%</span>
    <span class="down">❄️ 매도·갈아타기 ${pSell}%</span>
  </div>
  <div class="fp-cmp">💡 관측 데이터 지수(<b>${v.score}점·${v.label}</b>)와 유저 체감 매수세(<b>${pBuy}%</b>)가 함께 ${pBuy>=pHold?"우세한 구간입니다. 급매 소진 속도를 함께 체크해보세요.":"나타나며 신중한 관망세(" + pHold + "%)가 공존하고 있어요."}</div>
</div>
<p class="muted fn">※ 실거래는 계약 후 30일 안에 신고돼 이번 달은 제외했고, 지난달은 아직 일부 덜 집계됐을 수 있어요.</p>`;

el.querySelectorAll(".fp-btn").forEach(btn=>{
  btn.onclick=()=>{
    const val=btn.dataset.v;
    try{localStorage.setItem("jade_feel_vote_"+scope,val)}catch(e){}
    renderSenti();
    toast("⚡ 1초 체감 투표가 실시간 집계에 반영되었어요!");
  };
});
}

function renderRent(){const all=window.RENT;const v=all&&all[{all:"all","11":"seoul",ext:"gyeonggi_incheon"}[S.region]||"all"];const el=$("#rentc");if(!v)return;
const sg=x=>x==null?"-":(x>0?"+":"")+x.toFixed(1)+"%",pp=x=>x==null?"-":(x>0?"+":"")+x.toFixed(1)+"%p",m=v.monthly||[],w=v.windows||{},fm=s=>s?s.replace("-",".").slice(2):"";
const cJ=isDark()?"#60A5FA":"#3182F6",cW=isDark()?"#34D399":"#10B981";
let sp="";if(m.length>1){const W=200,H=42,mx=Math.max(...m.map(x=>Math.max(x.jeonse,x.wolse)),1),X=i=>5+i*(W-10)/(m.length-1),Y=c=>H-5-c/mx*(H-12);
const ln=(k,c,da)=>`<polyline points="${m.map((x,i)=>`${X(i)},${Y(x[k])}`).join(" ")}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" ${da?'stroke-dasharray="4 3"':""}/>`;
sp=`<svg class="spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${ln("jeonse",cJ)}${ln("wolse",cW,1)}${m.map((x,i)=>`<rect x="${X(i)-3}" y="0" width="6" height="${H}" fill="transparent"><title>${x.month} 전세 ${x.jeonse.toLocaleString()} · 월세 ${x.wolse.toLocaleString()}</title></rect>`).join("")}</svg>`}
el.innerHTML=`<div class="ch"><h3>전·월세 거래 흐름</h3><span class="tag">최근 3개월 · 작년 같은 기간 대비</span></div>
<div class="sigs r4"><div><small>전세</small><b>${(v.jeonse||0).toLocaleString()}</b><em class="${cls(v.jeonse_yoy_pct)}">${sg(v.jeonse_yoy_pct)}</em></div><div><small>월세</small><b>${(v.wolse||0).toLocaleString()}</b><em class="${cls(v.wolse_yoy_pct)}">${sg(v.wolse_yoy_pct)}</em></div>
<div><small>월세 비중</small><b>${v.wolse_share_pct==null?"-":v.wolse_share_pct.toFixed(0)+"%"}</b><em class="${cls(v.wolse_share_change_pp)}">${pp(v.wolse_share_change_pp)}</em></div><div><small>갱신 비중</small><b>${v.renewal_share_pct==null?"-":v.renewal_share_pct.toFixed(0)+"%"}</b><em>신규·갱신 신고분</em></div></div>
<p class="ss">${v.summary}</p><div class="spw">${sp}<span class="muted sm2"><span class="jl2">— 전세</span> <span class="jl">- - 월세</span> 월별 건수 (최근 12개월)<br>비교: ${fm(w.recent&&w.recent[0])}~${fm(w.recent&&w.recent[1])} vs ${fm(w.prev&&w.prev[0])}~${fm(w.prev&&w.prev[1])} (작년 같은 기간)</span></div>
<p class="muted fn">※ 실거래는 계약 후 30일 안에 신고돼 이번 달은 제외했고, 지난달은 아직 일부 덜 집계됐을 수 있어요.</p>`}

// ---------- PHASE 2: 1. 상단 실시간 한줄 수다 티커 바 ----------
const TICKER_ITEMS=[
  {tag:"[핫토픽 🔥]",text:"자금 부족할수록 징검다리 지금 등기 vs 전세 연장 후 관망, 실거주자 선택은?",meta:"(댓글 38개) →",target:"#community-board",post:"p1"},
  {tag:"[밸런스 투표]",text:"9억 예산 실거주: 마포·성동 구축 59㎡ vs 분당·수지 준신축 84㎡",meta:"(222명 투표 중) →",target:"#lounge-sec",match:"m1"},
  {tag:"[입지 빅매치]",text:"광명 철산역 대장 vs 광명뉴타운 신축 vs 강동·미사 84㎡ 실거주 가성비 비교",meta:"(댓글 34개) →",target:"#community-board",post:"p2"},
  {tag:"[현장 팩트체크]",text:"신분당선 수지(성복·풍덕천) & 수원 화서역 스타필드 브릿지 도보 임장 체감기",meta:"(댓글 29개) →",target:"#community-board",post:"p4"},
  {tag:"[정책·규제]",text:"토허제 해제 이후 잠실·대치·삼성 호가 흐름과 인접 비규제 키맞추기 시차 분석",meta:"(댓글 31개) →",target:"#community-board",post:"p6"},
  {tag:"[서울→경기 시그널]",text:"서울 상급지 숨고르기 속 안양 평촌·수원 영통·수지 84㎡ 거래량 반등",meta:"(키맞추기 비교) →",target:"#lounge-sec",match:"m2"}
];
let T_IDX=0,T_TMR=null;
function renderTicker(){
  const it=TICKER_ITEMS[T_IDX],btn=$("#lt-item"),idx=$("#lt-idx");
  if(!btn)return;
  btn.innerHTML=`<span class="lt-tag">${it.tag}</span><span>${esc(it.text)}</span><span class="lt-meta">${it.meta}</span>`;
  if(idx)idx.textContent=`${T_IDX+1}/${TICKER_ITEMS.length}`;
}
function initTicker(){
  renderTicker();
  const step=d=>{T_IDX=(T_IDX+d+TICKER_ITEMS.length)%TICKER_ITEMS.length;renderTicker()};
  const prev=$("#lt-prev"),next=$("#lt-next"),item=$("#lt-item"),go=$("#lt-go");
  if(prev)prev.onclick=()=>step(-1);
  if(next)next.onclick=()=>step(1);
  if(item)item.onclick=()=>{
    const it=TICKER_ITEMS[T_IDX];
    if(it.match){L_STATE.m=it.match;renderLounge()}
    if(it.post && typeof openBoardPost==="function"){openBoardPost(it.post)}
    const el=$(it.target);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});
  };
  if(go)go.onclick=()=>{const el=$("#lounge-sec");if(el)el.scrollIntoView({behavior:"smooth",block:"start"})};
  T_TMR=setInterval(()=>step(1),5000);
}

// ---------- PHASE 2: 3. 서울 vs 경기 밸런스 라운지 ----------
const LOUNGE_MATCHES={
  m1:{
    tab:"매치 1: 9억대 실거주",
    q:"Q. 9억대 실거주 매수, 당신의 선택은?",
    a:{badge:"🅰️ 서울 직주근접",name:"서울 마포·성동 구축 59㎡",desc:"직주근접·서울 핵심지 입지 방어력과 대장 생활권 공유",seed:118},
    b:{badge:"🅱️ 경기 신축·평수",name:"경기 분당·수지 준신축 84㎡",desc:"30평대 여유·신분당선 강남 출퇴근·학군 실거주 만족도",seed:104},
    cmts:[
      {id:"m1c1",nick:"마포갈아타기#482",side:"a",time:"방금 전",txt:"맞벌이 출퇴근이면 마포·성동 20평대 추천해요. 회복장 때 서울 핵심지 탄력이 확실히 빨라요.",likes:24},
      {id:"m1c2",nick:"수지실거주#109",side:"b",time:"6분 전",txt:"아이 키우는 실거주 삶의 질은 84㎡ 준신축이 압도적입니다. 신분당선 타면 강남 30분이라 대만족이에요.",likes:19},
      {id:"m1c3",nick:"광화문출퇴근#731",side:"a",time:"18분 전",txt:"전세가율 60%대 올라온 서울 역세권 59㎡는 하방 경직성이 진짜 탄탄합니다.",likes:15},
      {id:"m1c4",nick:"분당키맞추기#215",side:"b",time:"32분 전",txt:"서울 59㎡가 먼저 치고 나가면 3~6개월 시차 두고 분당·수지 84㎡가 늘 키맞추기로 따라붙었어요.",likes:12}
    ]
  },
  m2:{
    tab:"매치 2: 6억대 첫 내집마련",
    q:"Q. 6억대 첫 내집마련, 어디가 더 끌리시나요?",
    a:{badge:"🅰️ 인서울 역세권",name:"서울 노원·관악 역세권 59㎡",desc:"서울 진입·2/4/7호선 지하철 출퇴근과 중장기 재건축 기대감",seed:91},
    b:{badge:"🅱️ 경기 학군·대단지",name:"경기 안양 평촌·수원 영통·광명 84㎡",desc:"평촌 학원가·대단지 인프라·서울 대비 저평가 키맞추기 탄력",seed:109},
    cmts:[
      {id:"m2c1",nick:"평촌학원가#390",side:"b",time:"4분 전",txt:"초등 자녀 계획 있으면 평촌·영통 84㎡가 학군·전세 수요 면에서 훨씬 안정적이에요.",likes:21},
      {id:"m2c2",nick:"인서울첫집#114",side:"a",time:"12분 전",txt:"2호선 출퇴근이면 관악·노원 역세권 소형이 환금성 면에서 마음 편합니다.",likes:14},
      {id:"m2c3",nick:"영통실수요#608",side:"b",time:"27분 전",txt:"최근 안양 동안구·수원 영통구 거래량이 먼저 살아나는 게 실거래 데이터에서도 확 보이네요.",likes:16},
      {id:"m2c4",nick:"노원재건축#522",side:"a",time:"43분 전",txt:"6억대에서 인서울 역세권 등기 칠 수 있을 때 잡는 게 장기적으로 유리하다고 봅니다.",likes:11}
    ]
  },
  m3:{
    tab:"매치 3: 13억대 갈아타기",
    q:"Q. 13억대 상급지 갈아타기, 어디를 선택할까요?",
    a:{badge:"🅰️ 서울 상급지 소형",name:"서울 강남3구·용산 소형/재건축",desc:"최상급지 희소성·장기 대장주 프리미엄과 입지 우위",seed:84},
    b:{badge:"🅱️ 경기 과천·판교 84㎡",name:"경기 과천·판교·위례 신축급 84㎡",desc:"쾌적한 신축 커뮤니티·일자리·강남 접근성 모두 잡은 30평대",seed:76},
    cmts:[
      {id:"m3c1",nick:"과천판교러버#881",side:"b",time:"5분 전",txt:"판교·과천 신축급 84㎡는 사실상 강남권이면서 주차·커뮤니티 스트레스가 전혀 없어요.",likes:27},
      {id:"m3c2",nick:"용산마스터#204",side:"a",time:"14분 전",txt:"결국 상급지 소형이나 재건축이 사이클 꼭대기에서 상승폭이 제일 컸습니다.",likes:18},
      {id:"m3c3",nick:"위례신축파#449",side:"b",time:"29분 전",txt:"아이 둘 키우면서 20평대 구축 살기엔 84㎡ 신축 유혹을 이기기 어렵네요.",likes:13},
      {id:"m3c4",nick:"잠실엘스바라기#917",side:"a",time:"47분 전",txt:"대장주 소형 먼저 깃발 꽂아두고 나중에 평수 넓히는 전략에 한 표 던집니다!",likes:10}
    ]
  },
  m4:{
    tab:"매치 4: 10~11억대 신축·준신축",
    q:"Q. 10~11억대 수도권 핵심 신축·준신축 84㎡, 어디가 더 끌리나요?",
    a:{badge:"🅰️ 서남권 핵심",name:"광명 철산역·뉴타운 신축 84㎡",desc:"7호선 가산·강남·여의도 직결 + 철산 학원가·신축 대단지 탈바꿈",seed:112},
    b:{badge:"🅱️ 동남권 핵심",name:"강동 고덕·하남 미사 준신축 84㎡",desc:"5·9호선 강남·잠실 생활권 공유 + 대단지 공원·쾌적한 균질성",seed:119},
    cmts:[
      {id:"m4c1",nick:"철산역출퇴근#512",side:"a",time:"3분 전",txt:"여의도·가산·강남 동시 출퇴근이면 7호선 철산역 라인에 학원가 도보권이 실거주로 진짜 편합니다.",likes:23},
      {id:"m4c2",nick:"고덕그라시움#804",side:"b",time:"11분 전",txt:"올림픽파크포레온 입주장 끝나고 강동·미사 생활권 전체 인프라가 한 단계 올라선 게 체감돼요.",likes:26},
      {id:"m4c3",nick:"광명뉴타운#219",side:"a",time:"24분 전",txt:"광명뉴타운 입주 마무리되면 서남권에서 이만한 규모의 신축 브랜드 타운 찾기가 쉽지 않아요.",likes:17},
      {id:"m4c4",nick:"미사호수공원#633",side:"b",time:"38분 전",txt:"아이 키우기엔 도로 넓고 공원 잘 되어 있는 고덕·미사 택지지구 균질성이 최고예요.",likes:19}
    ]
  }
};
let L_STATE={m:"m1",f:"all",nick:""};
function getMyNick(){
  if(L_STATE.nick)return L_STATE.nick;
  try{
    let n=localStorage.getItem("jade_nick");
    if(!n){
      const pfx=["마포갈아타기","수지실거주","분당키맞추기","평촌내집러","영통실수요","용산트래커","성동직주근접"];
      n=pfx[Math.floor(Math.random()*pfx.length)]+"#"+(100+Math.floor(Math.random()*899));
      localStorage.setItem("jade_nick",n);
    }
    L_STATE.nick=n;
  }catch(e){L_STATE.nick="수도권내집러#482"}
  return L_STATE.nick;
}
function renderLounge(){
  const tabs=$("#lounge-tabs"),arena=$("#vs-arena"),chat=$("#lounge-chat");
  if(!tabs||!arena||!chat)return;
  const mid=L_STATE.m,m=LOUNGE_MATCHES[mid];
  tabs.innerHTML=Object.entries(LOUNGE_MATCHES).map(([k,v])=>`<button type="button" role="tab" class="${k===mid?"on":""}" data-m="${k}">${v.tab}</button>`).join("");
  tabs.querySelectorAll("button").forEach(b=>b.onclick=()=>{L_STATE.m=b.dataset.m;renderLounge()});

  let myV=null;try{myV=localStorage.getItem("jade_vs_vote_"+mid)}catch(e){}
  const va=m.a.seed+(myV==="a"?1:0),vb=m.b.seed+(myV==="b"?1:0),vt=va+vb;
  const pa=Math.round(va/vt*100),pb=100-pa;

  arena.innerHTML=`
    <div>
      <div class="vs-topic">
        <span class="vs-q">${m.q}</span>
        <span class="vs-total">🔥 ${vt.toLocaleString()}명 투표 중</span>
      </div>
      <div class="vs-cards">
        <button type="button" class="vs-card side-a ${myV==="a"?"on":""}" data-s="a">
          <div>
            <div class="vs-badge-row">
              <span class="vs-badge">${m.a.badge}</span>
              ${myV==="a"?'<span class="vs-picked">내 선택 ✓</span>':""}
            </div>
            <div class="vs-name">${m.a.name}</div>
            <div class="vs-desc">${m.a.desc}</div>
          </div>
          <div class="vs-foot">
            <span class="vs-pct">${pa}%</span>
            <span class="vs-votes">${va.toLocaleString()}표</span>
          </div>
        </button>
        <div class="vs-mid">VS</div>
        <button type="button" class="vs-card side-b ${myV==="b"?"on":""}" data-s="b">
          <div>
            <div class="vs-badge-row">
              <span class="vs-badge">${m.b.badge}</span>
              ${myV==="b"?'<span class="vs-picked">내 선택 ✓</span>':""}
            </div>
            <div class="vs-name">${m.b.name}</div>
            <div class="vs-desc">${m.b.desc}</div>
          </div>
          <div class="vs-foot">
            <span class="vs-pct">${pb}%</span>
            <span class="vs-votes">${vb.toLocaleString()}표</span>
          </div>
        </button>
      </div>
    </div>
    <div>
      <div class="vs-tug">
        <div class="vs-tug-a" style="width:${pa}%"></div>
        <div class="vs-tug-b" style="width:${pb}%"></div>
      </div>
      <div class="vs-hint">
        <span>🅰️ 서울파 <b>${pa}%</b> vs 🅱️ 경기파 <b>${pb}%</b></span>
        <span>${myV?`내 투표 완료 (${myV==="a"?"🅰️ 서울파":"🅱️ 경기파"}) · 다시 누르면 변경돼요`:"원하는 카드를 누르면 1초 만에 투표돼요!"}</span>
      </div>
    </div>
  `;
  arena.querySelectorAll(".vs-card").forEach(card=>{
    card.onclick=()=>{
      const s=card.dataset.s;
      try{localStorage.setItem("jade_vs_vote_"+mid,s)}catch(e){}
      renderLounge();
      toast(s==="a"?"🅰️ 서울 핵심지 선택이 밸런스 투표에 반영되었어요!":"🅱️ 경기 핵심지 선택이 밸런스 투표에 반영되었어요!");
    };
  });

  let userCmts=[],likes={};
  try{userCmts=JSON.parse(localStorage.getItem("jade_vs_cmts_"+mid)||"[]")}catch(e){userCmts=[]}
  try{likes=JSON.parse(localStorage.getItem("jade_vs_likes")||"{}")}catch(e){likes={}}
  const allCmts=[...userCmts,...m.cmts].filter(c=>L_STATE.f==="all"||c.side===L_STATE.f);
  const nick=getMyNick();

  chat.innerHTML=`
    <div>
      <div class="lc-top">
        <div class="lc-nick">💬 실시간 한줄 수다 · 내 닉네임 <span>${esc(nick)}</span></div>
        <div class="lc-filters">
          <button type="button" data-f="all" class="${L_STATE.f==="all"?"on":""}">전체</button>
          <button type="button" data-f="a" class="${L_STATE.f==="a"?"on":""}">🅰️ 서울파</button>
          <button type="button" data-f="b" class="${L_STATE.f==="b"?"on":""}">🅱️ 경기파</button>
        </div>
      </div>
      <div class="lc-feed" id="lc-feed">
        ${allCmts.map(c=>{
          const lk=(c.likes||0)+(likes[c.id]?1:0);
          return `<div class="lc-item">
            <div class="lc-meta">
              <span class="lc-user">${esc(c.nick)} <span class="lc-side ${c.side}">${c.side==="a"?"🅰️ 서울파":"🅱️ 경기파"}</span></span>
              <span class="lc-time">${esc(c.time)}</span>
            </div>
            <div class="lc-body-row">
              <div class="lc-txt">${esc(c.txt)}</div>
              <button type="button" class="lc-like ${likes[c.id]?"on":""}" data-id="${c.id}">👍 ${lk}</button>
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>
    <form class="lc-form" id="lc-form">
      <input id="lc-in" maxlength="80" placeholder="${myV==="b"?"[🅱️ 경기파]":"[🅰️ 서울파]"} 한줄 의견 남기기 (최대 80자)" aria-label="라운지 한줄 의견">
      <button type="submit">등록</button>
    </form>
  `;
  chat.querySelectorAll(".lc-filters button").forEach(b=>b.onclick=()=>{L_STATE.f=b.dataset.f;renderLounge()});
  chat.querySelectorAll(".lc-like").forEach(b=>b.onclick=()=>{
    const cid=b.dataset.id;
    likes[cid]=!likes[cid];
    try{localStorage.setItem("jade_vs_likes",JSON.stringify(likes))}catch(e){}
    renderLounge();
  });
  const form=$("#lc-form"),inp=$("#lc-in");
  if(form)form.onsubmit=e=>{
    e.preventDefault();
    const txt=(inp.value||"").trim();
    if(!txt){toast("한줄 의견을 입력해주세요.");return}
    const side=myV||"a";
    const nc={id:"u"+Date.now(),nick:getMyNick(),side,time:"방금 전",txt,likes:1};
    userCmts.unshift(nc);
    try{localStorage.setItem("jade_vs_cmts_"+mid,JSON.stringify(userCmts.slice(0,20)))}catch(e){}
    inp.value="";
    renderLounge();
    toast("💬 라운지에 내 한줄 의견이 등록되었어요!");
  };
}
function initLounge(){renderLounge()}

// ---------- PHASE 2: 4. 단지 상세 팩트체크 톡 & 네이티브 수익화 CTA ----------
function strHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return Math.abs(h)}
function renderCxTalk(c){
  const box=$("#cx-talk");if(!box||!c)return;
  const h=strHash(String(c.id||c.name));
  const baseTags=[
    {k:"t1",lbl:"📈 키맞추기·실수요 유입",cnt:9+(h%18)},
    {k:"t2",lbl:"🏫 학군·역세권 실거주 탄탄",cnt:12+((h>>3)%21)},
    {k:"t3",lbl:"⚠️ 층·향 편차 / 직거래 확인필수",cnt:4+((h>>6)%9)}
  ];
  let myTags={};try{myTags=JSON.parse(localStorage.getItem("jade_cxt_tags_"+c.id)||"{}")}catch(e){}
  let userCmts=[];try{userCmts=JSON.parse(localStorage.getItem("jade_cxt_cmts_"+c.id)||"[]")}catch(e){}
  let cLikes={};try{cLikes=JSON.parse(localStorage.getItem("jade_cxt_likes_"+c.id)||"{}")}catch(e){}

  const jr=c.jeonse_ratio!=null?`전세가율 ${c.jeonse_ratio.toFixed(0)}%`:`누적 ${c.count||0}건 거래`;
  const chgTxt=c.change!=null?(c.change>0?`최근 3개월 중위가가 +${c.change.toFixed(1)}% 상승 흐름이라 로얄동·중고층 실거래 비중을 함께 체크해보세요.`:`최근 3개월 중위가(${c.change.toFixed(1)}%) 조정 구간이라 급매 소진 여부와 전세가 하방 지지력을 비교해보세요.`):`최근 거래 층수와 직거래 여부를 함께 확인해보세요.`;
  const seedCmts=[
    {id:"sc1",nick:"실거래팩트체커",txt:`${SGG[c.sgg]||""} ${c.dong} ${c.name} (${band(c.band)}) 현재 중위가 ${eok(c.price)} · ${jr} 수준입니다.`,likes:5+(h%9)},
    {id:"sc2",nick:"현장모니터링",txt:chgTxt,likes:3+((h>>2)%7)}
  ];
  const allCmts=[...userCmts,...seedCmts];

  box.innerHTML=`
    <div class="cxt-head">
      <h4>💬 ${esc(c.name)} 한줄 팩트체크 & 실거주 톡</h4>
      <span class="tag">단지별 실시간 코멘트</span>
    </div>
    <p class="cxt-sub">실거래 차트 숫자 뒤에 숨은 현장 분위기·특수거래 여부를 함께 체크해요</p>
    <div class="cxt-tags">
      ${baseTags.map(t=>{
        const on=!!myTags[t.k],cnt=t.cnt+(on?1:0);
        return `<button type="button" class="cxt-tag ${on?"on":""}" data-k="${t.k}"><span>${t.lbl}</span><b>${cnt}</b></button>`;
      }).join("")}
    </div>
    <div class="cxt-list">
      ${allCmts.map(cm=>{
        const lk=(cm.likes||0)+(cLikes[cm.id]?1:0);
        return `<div class="cxt-item">
          <div class="cxt-item-left"><strong>${esc(cm.nick)}</strong>${esc(cm.txt)}</div>
          <button type="button" class="lc-like ${cLikes[cm.id]?"on":""}" data-cid="${cm.id}">👍 ${lk}</button>
        </div>`;
      }).join("")}
    </div>
    <form class="cxt-form" id="cxt-form">
      <input id="cxt-in" maxlength="80" placeholder="${esc(c.name)} 단지에 대한 한줄 의견·현장 정보를 남겨주세요" aria-label="단지 한줄 의견">
      <button type="submit">남기기</button>
    </form>
  `;
  box.querySelectorAll(".cxt-tag").forEach(b=>b.onclick=()=>{
    const k=b.dataset.k;myTags[k]=!myTags[k];
    try{localStorage.setItem("jade_cxt_tags_"+c.id,JSON.stringify(myTags))}catch(e){}
    renderCxTalk(c);
  });
  box.querySelectorAll(".cxt-list .lc-like").forEach(b=>b.onclick=()=>{
    const cid=b.dataset.cid;cLikes[cid]=!cLikes[cid];
    try{localStorage.setItem("jade_cxt_likes_"+c.id,JSON.stringify(cLikes))}catch(e){}
    renderCxTalk(c);
  });
  const form=$("#cxt-form"),inp=$("#cxt-in");
  if(form)form.onsubmit=e=>{
    e.preventDefault();
    const txt=(inp.value||"").trim();
    if(!txt){toast("단지에 대한 한줄 의견을 입력해주세요.");return}
    userCmts.unshift({id:"uc"+Date.now(),nick:getMyNick(),txt,likes:1});
    try{localStorage.setItem("jade_cxt_cmts_"+c.id,JSON.stringify(userCmts.slice(0,15)))}catch(e){}
    renderCxTalk(c);
    toast("💬 단지 한줄 팩트체크 톡이 등록되었어요!");
  };
}

function renderMonoCta(c){return; // 유료 CTA 보류
  const box=$("#mono-cta");if(!box||!c)return;
  box.innerHTML=`
    <div class="mcard report">
      <div>
        <span class="mc-badge">👑 맞춤형 매수 의사결정</span>
        <h4 class="mc-title">📊 내 예산·관심단지 1:1 매수 비교 리포트 신청</h4>
        <p class="mc-desc"><b>${esc(c.name)}(${band(c.band)})</b> 단지와 고민 중인 다른 후보 단지의 실거래 추이·전세가율 방어력·서울→경기 시차 흐름을 비교 분석해 드립니다.</p>
      </div>
      <button type="button" class="mc-btn" id="btn-open-report">1:1 비교 리포트 신청하기 (얼리버드 19,000원)</button>
    </div>
    <div class="mcard pro">
      <div>
        <span class="mc-badge">⚡ 실시간 골든타임 포착</span>
        <h4 class="mc-title">🔔 실거래·서울→경기 선행 시그널 PRO 알림</h4>
        <p class="mc-desc"><b>${esc(c.name)}(${band(c.band)})</b> 신규 실거래·신고가 경신 및 내 관심지역 매수세 전환 시그널을 가장 먼저 앱 푸시/알림으로 받아보세요.</p>
      </div>
      <button type="button" class="mc-btn" id="btn-open-pro">🔔 이 단지 PRO 실시간 알림 받기</button>
    </div>
  `;
  const br=$("#btn-open-report"),bp=$("#btn-open-pro");
  if(br)br.onclick=()=>openReportModal("report",c);
  if(bp)bp.onclick=()=>openReportModal("pro",c);
}

// ---------- 리포트 / PRO 알림 신청 모달 (#report-modal) ----------
let R_MODE="report";
function renderReportModal(){
  const body=$("#rbody"),c=window.CUR_CX||(ALL[0]||{name:"마포래미안푸르지오",band:"84",sgg:"11440"});
  if(!body)return;
  document.querySelectorAll("#rtabs button").forEach(b=>b.classList.toggle("on",b.dataset.m===R_MODE));
  const cLabel=c&&c.name?`${SGG[c.sgg]||""} ${c.name} (${band(c.band)})`.trim():"마포래미안푸르지오 84㎡";
  if(R_MODE==="report"){
    body.innerHTML=`
      <div class="rperks">
        <b>📊 1:1 매수 비교 리포트 포함 내용 (PDF + 인터랙티브 링크)</b><br>
        1) 후보 단지 A vs B 최근 10년 실거래 사이클 & 회복 탄력성 비교<br>
        2) 전세가율·갱신비중 기반 실거주 하방 지지력 진단<br>
        3) 서울 선행 지수 대비 경기 키맞추기 시차(Lead-Lag) 포지션 분석
      </div>
      <form class="rform" id="rform" style="margin-top:12px">
        <label>비교 후보 단지 A (현재 보고 있는 단지)
          <input id="rf-a" value="${esc(cLabel)}" required>
        </label>
        <label>비교 후보 단지 B 또는 고민 중인 관심지역
          <input id="rf-b" placeholder="예: 분당 파크타운 84㎡ / 수지구청역 인근 84㎡" required>
        </label>
        <label>가용 예산 및 핵심 고민 한줄 (실거주/학군/출퇴근 등)
          <input id="rf-memo" placeholder="예: 9억 예산 맞벌이 실거주, 서울 59㎡ vs 경기 84㎡ 고민 중">
        </label>
        <label>리포트 받을 연락처 (이메일 또는 휴대폰 번호)
          <input id="rf-contact" placeholder="example@email.com 또는 010-0000-0000" required>
        </label>
        <button type="submit" class="rsubmit">📊 얼리버드 1:1 비교 리포트 신청하기 (19,000원)</button>
      </form>
    `;
  }else{
    body.innerHTML=`
      <div class="rperks">
        <b>🔔 집썰 PRO 실시간 시그널 멤버십 혜택 (첫달 무료 체험)</b><br>
        1) <b>${esc(cLabel)}</b> 등 관심단지 신규 실거래·신고가 즉시 알림<br>
        2) 서울→경기 키맞추기 거래량 급증 단지 주간 스크리닝 리포트<br>
        3) 전세가율 65% 돌파 실거주 진입 후보 단지 실시간 브리핑
      </div>
      <form class="rform" id="rform" style="margin-top:12px">
        <label>집중 모니터링 단지 / 관심지역
          <input id="rf-a" value="${esc(cLabel)}" required>
        </label>
        <label>희망 알림 조건
          <input id="rf-b" value="신규 실거래 등록 · 신고가 경신 · 전세가율 급등 시 즉시 알림">
        </label>
        <label>알림 받을 연락처 (카카오 알림톡 / 이메일)
          <input id="rf-contact" placeholder="010-0000-0000 또는 이메일 주소" required>
        </label>
        <button type="submit" class="rsubmit">🔔 PRO 실시간 알림 첫달 무료 신청하기</button>
      </form>
    `;
  }
  const f=$("#rform");
  if(f)f.onsubmit=e=>{
    e.preventDefault();
    let leads=[];try{leads=JSON.parse(localStorage.getItem("jade_leads")||"[]")}catch(err){}
    leads.unshift({
      mode:R_MODE,
      a:($("#rf-a")||{}).value,
      b:($("#rf-b")||{}).value,
      contact:($("#rf-contact")||{}).value,
      at:new Date().toISOString()
    });
    try{localStorage.setItem("jade_leads",JSON.stringify(leads))}catch(err){}
    closeReportModal();
    toast(R_MODE==="report"?"🎉 1:1 매수 비교 리포트 신청이 접수되었어요!":"🔔 PRO 실시간 시그널 알림 신청이 완료되었어요!");
  };
}
function openReportModal(mode,cx){return; // 유료 상품 보류
  if(mode)R_MODE=mode;
  if(cx)window.CUR_CX=cx;
  renderReportModal();
  const m=$("#report-modal");if(m){m.classList.add("on");m.setAttribute("aria-hidden","false")}
  document.body.classList.add("noscroll");
}
function closeReportModal(){
  const m=$("#report-modal");if(m){m.classList.remove("on");m.setAttribute("aria-hidden","true")}
  document.body.classList.remove("noscroll");
}
function initReportModal(){
  const cl=$("#rclose"),dm=$("#rdim");
  if(cl)cl.onclick=closeReportModal;
  if(dm)dm.onclick=closeReportModal;
  document.querySelectorAll("#rtabs button").forEach(b=>b.onclick=()=>{R_MODE=b.dataset.m;renderReportModal()});
}

// ---------- PHASE 2: 5. 모바일 하단 앱 네비게이션 탭바 (#bnav) ----------
function initBottomNav(){
  const nav=$("#bnav");if(!nav)return;
  nav.querySelectorAll(".bnav-btn").forEach(btn=>{
    btn.onclick=()=>{
      const k=btn.dataset.nav;
      nav.querySelectorAll(".bnav-btn").forEach(x=>x.classList.toggle("on",x===btn));
      if(k==="top")window.scrollTo({top:0,behavior:"smooth"});
      else if(k==="list"){const el=$("#list-sec");if(el)el.scrollIntoView({behavior:"smooth",block:"start"})}
      else if(k==="lounge"){const el=$("#lounge-sec");if(el)el.scrollIntoView({behavior:"smooth",block:"start"})}
      else if(k==="fav")openFav();
      else if(k==="pro")openReportModal("report");
    };
  });
}

// ---------- 관심지역 (최대 5곳, 이 기기에 저장) ----------
let FAV=[];try{FAV=JSON.parse(localStorage.getItem("jade_fav")||"[]")}catch(e){FAV=[]}
function saveFav(){try{localStorage.setItem("jade_fav",JSON.stringify(FAV))}catch(e){}}
const SIDO=[["서울","11"],["경기","41"],["인천","28"]];
const haveSgg=()=>{const h=new Set(ALL.map(c=>c.sgg));return Object.keys(SGG).filter(k=>h.has(k))};
function fillSgg(){const el=$("#sgg"),v=el.value,ks=haveSgg();el.innerHTML='<option value="">모든 시·구 ('+ks.length+')</option>'+
SIDO.map(([n,p])=>{const g=ks.filter(k=>k.startsWith(p)).sort((a,b)=>gu(a).localeCompare(gu(b),"ko"));return g.length?`<optgroup label="${n}">${g.map(k=>`<option value="${k}">${FAV.includes(k)?"★ ":""}${gu(k)}</option>`).join("")}</optgroup>`:""}).join("");el.value=v}
function toast(m){let t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("on"),2600)}
function toggleFav(k){const i=FAV.indexOf(k);if(i>=0)FAV.splice(i,1);else{if(FAV.length>=5){toast("관심지역은 5곳까지 담을 수 있어요. 하나를 빼고 다시 골라주세요.");return}FAV.push(k)}
saveFav();renderFavBar();renderFavPick();fillSgg();if(S.region==="fav"){S.page=0;render()}}
function renderFavBar(){$("#favn").textContent=FAV.length+"/5";const t=document.querySelector('#tabs a[data-r="fav"]');if(t)t.textContent="★ 관심지역"+(FAV.length?" "+FAV.length:"");
$("#favbar").innerHTML=FAV.length?FAV.map(k=>`<span class="fchip on" data-k="${k}">★ ${SGG[k]}<b>×</b></span>`).join(""):'<span class="muted sm">★ 관심지역을 담으면 위쪽 \'관심지역\' 탭에서 그 지역만 모아 볼 수 있어요.</span>';
document.querySelectorAll("#favbar .fchip").forEach(e=>e.onclick=()=>toggleFav(e.dataset.k))}
function renderFavPick(){const q=($("#favq").value||"").trim(),ks=haveSgg().filter(k=>!q||SGG[k].includes(q));
$("#favsel").textContent=`선택 ${FAV.length}/5`;
$("#favlist").innerHTML=SIDO.map(([n,p])=>{const g=ks.filter(k=>k.startsWith(p)).sort((a,b)=>gu(a).localeCompare(gu(b),"ko"));if(!g.length)return"";
return `<h5>${n} <span class="muted">${g.length}</span></h5><div class="chips">${g.map(k=>`<button class="fchip${FAV.includes(k)?" on":""}" data-k="${k}">${FAV.includes(k)?"★ ":""}${gu(k)}<i>${ALL.filter(c=>c.sgg===k).length}</i></button>`).join("")}</div>`}).join("")||'<p class="muted">검색 결과가 없어요.</p>';
document.querySelectorAll("#favlist .fchip").forEach(e=>e.onclick=()=>toggleFav(e.dataset.k))}
function openFav(){$("#favq").value="";renderFavPick();$("#favpanel").classList.add("on");document.body.classList.add("noscroll")}
function closeFav(){$("#favpanel").classList.remove("on");document.body.classList.remove("noscroll")}

// ---------- 상단 아파트 검색 (서울·경기·인천) ----------
const CHO="ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const cho=s=>[...s].map(ch=>{const c=ch.charCodeAt(0)-44032;return c>=0&&c<11172?CHO[Math.floor(c/588)]:ch}).join("");
const nz=s=>(s||"").toLowerCase().replace(/\s+/g,"");
let GI=null,GH=[],GA=-1,GT;
function gIndex(){if(GI&&GI.n===ALL.length)return GI;GI=ALL.filter(c=>/^(11|41|28)/.test(c.sgg)).map(c=>{const nm=nz(c.name),all=nz(c.name+c.dong+(SGG[c.sgg]||""));return{c,nm,all,ch:cho(all),nch:cho(nm)}});GI.n=ALL.length;return GI}
function gSearch(q){const k=nz(q);if(!k)return[];const isCho=/^[ㄱ-ㅎ]+$/.test(k),o=[];
for(const e of gIndex()){let sc=-1;if(isCho){if(e.nch.startsWith(k))sc=3;else if(e.ch.includes(k))sc=1}else{if(e.nm.startsWith(k))sc=4;else if(e.nm.includes(k))sc=3;else if(e.all.includes(k))sc=2}
if(sc>=0)o.push([sc,e.c])}
return o.sort((a,b)=>b[0]-a[0]||(b[1].count||0)-(a[1].count||0)||a[1].name.localeCompare(b[1].name,"ko")).slice(0,20).map(x=>x[1])}
function gRender(){const q=$("#gq").value,r=$("#gres");$("#gx").classList.toggle("hide",!q);
if(!q.trim()){r.innerHTML="";r.classList.remove("on");$("#gq").setAttribute("aria-expanded","false");return}
GH=gSearch(q);GA=GH.length?0:-1;
r.innerHTML=GH.length?GH.map((c,i)=>`<button type="button" role="option" class="gi${i===GA?" act":""}" data-i="${i}"><span class="gn">${esc(c.name)} <em>${band(c.band)}</em></span><span class="gm">${esc(SGG[c.sgg]||c.sgg)} · ${esc(c.dong)}</span><b class="gp">${eok(c.price)}</b></button>`).join(""):'<div class="gnone">검색 결과가 없어요. (서울·경기·인천만 검색돼요)</div>';
r.classList.add("on");$("#gq").setAttribute("aria-expanded","true");
r.querySelectorAll(".gi").forEach(b=>{b.onmousedown=e=>e.preventDefault();b.onclick=()=>gPick(+b.dataset.i)})}
function gAct(i){GA=i;document.querySelectorAll("#gres .gi").forEach((b,j)=>{b.classList.toggle("act",j===i);if(j===i)b.scrollIntoView({block:"nearest"})})}
function gClose(){$("#gres").classList.remove("on");$("#gq").setAttribute("aria-expanded","false")}
function gPick(i){const c=GH[i];if(!c)return;gClose();$("#gq").blur();S.sel=c.id;renderList();renderDetail();setTimeout(()=>$("#detail").scrollIntoView({behavior:"smooth",block:"start"}),60)}
(function(){const q=$("#gq");q.oninput=()=>{clearTimeout(GT);GT=setTimeout(gRender,150)};q.onfocus=()=>{if(q.value.trim())gRender()};
q.onkeydown=e=>{if(e.key==="ArrowDown"){e.preventDefault();if(GH.length)gAct((GA+1)%GH.length)}else if(e.key==="ArrowUp"){e.preventDefault();if(GH.length)gAct((GA-1+GH.length)%GH.length)}
else if(e.key==="Enter"){e.preventDefault();clearTimeout(GT);if(!$("#gres").classList.contains("on"))gRender();gPick(GA<0?0:GA)}else if(e.key==="Escape"){gClose()}};
q.onblur=()=>setTimeout(gClose,150);$("#gx").onclick=()=>{q.value="";gRender();q.focus()};
document.addEventListener("keydown",e=>{if(e.key==="/"&&document.activeElement!==q&&!["INPUT","TEXTAREA","SELECT"].includes((document.activeElement||{}).tagName)){e.preventDefault();q.focus()}});
document.addEventListener("click",e=>{if(!e.target.closest("#gs"))gClose()})})();


// ---------- PHASE 2+: 커뮤니티 게시판 (#community-board) ----------
const CB_CATS=[
  {k:"all",lbl:"전체"},
  {k:"buy",lbl:"매수·갈아타기"},
  {k:"region",lbl:"서울·경기 입지비교"},
  {k:"finance",lbl:"대출·규제·정책"},
  {k:"fact",lbl:"단지·임장 팩트체크"}
];

const CB_HOT_TAGS=[
  "전체",
  "#생애최초·징검다리",
  "#광명·철산",
  "#강동·하남·위례",
  "#수지·분당",
  "#수원·화서·영통",
  "#마포·성동",
  "#토허제·강남잠실",
  "#DSR·주담대"
];

const CB_SEED_POSTS=[
  {
    id:"p1",
    cat:"buy",
    catLbl:"매수·갈아타기",
    hot:true,
    region:"수도권 전반 · 6~9억대",
    sgg:"11620",
    title:"자금 부족할수록 '징검다리 첫 등기' vs '전세 연장 후 관망', 다들 어떻게 결정하셨나요?",
    nick:"첫등기성공#308",
    time:"14분 전",
    views:1842,
    likes:94,
    tags:["#생애최초·징검다리","#DSR·주담대"],
    body:`신혼 때 현금 2억 남짓으로 시작해서 3년 전 서울 외곽 역세권 59㎡ 첫 등기를 쳤고, 올해 상급지 84㎡로 갈아타기 계약을 마쳤습니다. 주변 친구들과 이야기해보면 지금 가장 많이 하는 고민이 딱 하나더라고요.

"지금이라도 대출 끼고 감당 가능한 선에서 가장 좋은 입지에 첫 등기를 칠까, 아니면 집값 조정 올 때까지 전세로 한 번 더 연장할까?"

제가 직접 겪어보니 전세 매물이 줄어들고 반전세로 전환되는 시기에는, 전세 보증금 올려주느라 종잣돈이 묶이는 게 가장 무서웠습니다. 자금이 부족할수록 처음부터 완벽한 신축 30평대를 기다리기보다, 환금성 확실한 역세권 소형이나 경기 핵심지 대단지 84㎡로 '징검다리 1단계'를 밟아두는 게 상급지와의 격차를 줄이는 유일한 방법이었습니다.

물론 무리한 영끌은 절대 금물이지만, 부부합산 소득으로 원리금 감당이 되는 범위(월 소득의 30~35% 이내)라면 지금 눈여겨보시는 1순위 후보지를 직접 걸어보시는 걸 추천합니다. 회원님들은 지금 매수파신가요, 전세 연장 후 관망파신가요?`,
    cmts:[
      {id:"p1c1",nick:"관악역세권#412",badge:"실거주 3년차",time:"11분 전",txt:"100% 공감합니다. 저도 작년에 전세 만기 때 보증금 8천 올려달라길래 그 돈 보태서 2호선 역세권 59㎡ 생애최초로 등기 쳤는데 마음이 너무 편해요."},
      {id:"p1c2",nick:"신혼예산체크#889",badge:"내집마련 준비",time:"8분 전",txt:"맞아요. 돈이 부족할수록 나중에 팔기 쉬운 '입지 좋은 단지'를 사야 갈아탈 때 제값 받고 나오더라고요. 나홀로 신축보다 대단지 구축 역세권이 훨씬 나았습니다."},
      {id:"p1c3",nick:"분당갈아타기#104",badge:"갈아타기 완료",time:"4분 전",txt:"징검다리 전략의 핵심은 '내가 팔 때 사줄 실수요(전세가율 60% 이상·역세권·초품아)가 탄탄한가'입니다. 이거 하나만 지켜도 실패 안 합니다."}
    ]
  },
  {
    id:"p2",
    cat:"region",
    catLbl:"서울·경기 입지비교",
    hot:true,
    region:"경기 광명시 · 철산/광명",
    sgg:"41310",
    title:"광명 실거주 빅매치: 철산역 역세권·학군 대장 vs 광명뉴타운 신축 대단지, 어디가 나을까요?",
    nick:"7호선통근러#519",
    time:"28분 전",
    views:1615,
    likes:82,
    tags:["#광명·철산"],
    body:`여의도·가산디지털단지 맞벌이 부부라 9~11억대 예산으로 광명 임장을 3주째 돌고 있습니다. 직접 가보니 생각보다 '철산동 라인'과 '광명사거리역 뉴타운 라인'의 장단점이 뚜렷해서 고민이 깊어지네요.

1. 철산역 라인 (철산자이더헤리티지·철산래미안자이·도덕파크타운 등)
- 장점: 7호선 철산역 도보권 + 시청·세무서·상업지구 인프라가 이미 완성형이고, 무엇보다 철산 학원가와 광명중·철산중 학군 배정이 압도적입니다. 도로 폭도 넓고 쾌적해요.
- 고민: 신축 대장 84㎡는 이미 11~12억대라 예산이 빡빡하고, 7~9억대 준신축·구축으로 눈을 돌리면 연식 차이가 납니다.

2. 광명뉴타운 라인 (아크포레자이위브·광명센트럴아이파크·베르몬트로광명 등)
- 장점: 2만 5천 세대급 천지개벽 신축 브랜드 타운! 커뮤니티 시설, 지하주차장, 조경은 신축이라 비교 불가 수준으로 깔끔합니다.
- 고민: 구역별로 광명사거리역 도보 거리와 경사도 편차가 꽤 있고, 아직 주변 입주·정비가 진행 중인 구간이 있습니다.

초등 입학 앞둔 아이 1명 키우는 실거주 + 5년 뒤 가치 상승 기준으로 보실 때 어느 쪽에 한 표 주시나요?`,
    cmts:[
      {id:"p2c1",nick:"철산토박이#207",badge:"지역주민",time:"22분 전",txt:"아이 초등 고학년~중학교까지 바라보시면 무조건 철산역 학원가·광명중 배정권 추천합니다. 학령기 전세 수요 자체가 달라서 하락장 방어력이 진짜 강해요."},
      {id:"p2c2",nick:"뉴타운입주#771",badge:"실거주",time:"16분 전",txt:"광명뉴타운도 1·2·4·11구역 등 역세권 평지 구역들은 입주 마무리되면 분위기 완전히 바뀝니다. 영유아 키우실 땐 신축 커뮤니티랑 지상에 차 없는 공원형 단지가 삶의 질 최고예요."},
      {id:"p2c3",nick:"가산출퇴근#640",badge:"임장러",time:"9분 전",txt:"지도상 직선거리만 보지 마시고 퇴근 시간대에 역에서 단지 문 앞까지 신호등·언덕 포함해서 꼭 걸어보세요! 철산역 평지 동선 체감이 확실히 좋긴 했습니다."}
    ]
  },
  {
    id:"p3",
    cat:"region",
    catLbl:"서울·경기 입지비교",
    hot:true,
    region:"서울 강동 · 경기 하남/위례",
    sgg:"11440",
    title:"동남권 10~13억대 실거주: 강동(고덕·둔촌) 대단지 효과 vs 하남 미사·위례 84㎡ 비교",
    nick:"동남권임장왕#831",
    time:"42분 전",
    views:1530,
    likes:76,
    tags:["#강동·하남·위례"],
    body:`잠실·강남 출퇴근 부부인데 예산 10~13억대에서 동남권(강동 고덕·명일·암사 vs 하남 미사강변도시·위례신도시)을 집중 비교하고 있습니다.

최근 둔촌(올림픽파크포레온) 1만 2천 세대 입주장이 마무리되면서 처음엔 주변 전세·매매가 눌릴 줄 알았는데, 막상 현장에 가보니 대단지 인프라가 들어서면서 강동구 전체 생활권 위상이 확 올라간 느낌이더라고요. 특히 고덕 그라시움·아르테온 라인은 5호선·9호선 연장 기대감에 서울세종고속도로 호재까지 겹쳐서 호가가 꽤 단단합니다.

반면 같은 예산이면 강동에서는 59㎡나 구축·나홀로 준신축을 봐야 할 때도 있는데, 바로 옆 하남 미사(호수공원·5호선 역세권)나 위례로 넘어가면 훨씬 여유로운 84㎡ 택지지구 준신축을 매수할 수 있어서 고민입니다.
- 서울 강동구 등기(고덕·암사·천호 59㎡~가성비 84㎡)
- 하남 미사 / 위례 대장급 84㎡

실거주 만족도와 향후 잠실 키맞추기 탄력 면에서 어떻게 보시나요?`,
    cmts:[
      {id:"p3c1",nick:"고덕실거주#319",badge:"지역주민",time:"35분 전",txt:"고덕은 한 번 살아보면 타 지역으로 못 나갑니다. 녹지 비율 높고 학원가·명덕초~배재고 학군 라인에 길 건너 상권까지 너무 깔끔해요. 서울세종고속도로 개통 체감도 엄청 큽니다."},
      {id:"p3c2",nick:"미사역세권#552",badge:"실거주",time:"27분 전",txt:"가성비와 평수를 챙기려면 미사역 도보권 84㎡가 진짜 알짜입니다. 5호선 타면 고덕이랑 2~3정거장 차이인데 가격 메리트가 확실하고 호수공원 산책로가 예술이에요."},
      {id:"p3c3",nick:"잠실출퇴근#901",badge:"갈아타기",time:"15분 전",txt:"상승장 초입에는 항상 잠실 → 강동(고덕·둔촌) → 미사·위례 순서로 시차를 두고 파도가 넘어왔어요. 지금 두 지역 가격 갭이 벌어졌는지 좁혀졌는지 실거래 차트로 꼭 비교해보세요!"}
    ]
  },
  {
    id:"p4",
    cat:"fact",
    catLbl:"단지·임장 팩트체크",
    hot:true,
    region:"경기 용인시 수지구",
    sgg:"41465",
    title:"신분당선 라인 '교통·학군 갓성비' 용인 수지(성복·풍덕천·동천) 주말 현장 임장 팩트체크",
    nick:"신분당선러버#405",
    time:"1시간 전",
    views:1720,
    likes:89,
    tags:["#수지·분당"],
    body:`판교·강남 출퇴근하면서 7~10억대 실거주 찾으시는 분들이 왜 결국 '용인 수지'로 모이는지 이번 주말 성복역~수지구청역~동천역 풀코스로 걸어보고 단번에 이해했습니다.

1. 교통 체감 (신분당선의 위력)
- 성복역·수지구청역에서 판교역까지 10분대, 강남역까지 20분대 후반이면 끊깁니다. 버스 환승 없이 지하철 하나로 강남·판교 핵심 일자리를 꽂아주는 게 가장 큰 무기입니다.

2. 학군 & 거주 분위기 팩트체크
- 수지구청역 인근 풍덕천동 학원가 규모가 생각보다 훨씬 탄탄합니다. 다만 인기 중학교(정평중 등) 배정을 안정적으로 받으려면 초등학교 4학년 전학이 아니라 초1 입학 때부터 거주 연한을 채워야 안정권이라는 현장 소장님 팁을 들었습니다!
- 성복동(성복역 롯데캐슬 골드타운 등)은 롯데몰 슬세권에 광교산 자락이라 공기가 쾌적하고 거주민분들 분위기가 정말 차분하고 깔끔했습니다.

분당 84㎡가 13~16억대로 부담스러울 때, 바로 아랫동네인 수지 84㎡가 전세가율 탄탄하게 받쳐주며 키맞추기 하는 이유가 확실히 있네요.`,
    cmts:[
      {id:"p4c1",nick:"성복동주민#118",badge:"지역주민",time:"51분 전",txt:"성복동 5년 거주 중인데 주민분들 시민의식 높고 동네가 정말 쾌적해서 살기 참 좋습니다. 신분당선 한 번 타면 다른 노선 못 타요 ㅎㅎ"},
      {id:"p4c2",nick:"풍덕천학부모#624",badge:"학부모",time:"39분 전",txt:"정평중 배정 팁 정확하십니다! 요즘 학령기 유입이 많아서 초등학교 1학년 입학 기준으로 들어오셔야 마음 편하게 배정받아요."},
      {id:"p4c3",nick:"판교개발자#290",badge:"실거주",time:"21분 전",txt:"수지는 진짜 '살기 좋아서 들어왔다가 수지맞는 동네'라는 말이 딱 맞아요. 분당 움직이면 3개월 뒤에 바로 거래량부터 반응 옵니다."}
    ]
  },
  {
    id:"p5",
    cat:"fact",
    catLbl:"단지·임장 팩트체크",
    hot:true,
    region:"경기 수원시 · 화서/매교/영통",
    sgg:"41117",
    title:"스타필드 품은 수원 화서역(대유평) vs 매교역 신축 타운 vs 영통 학군지 도보 임장 비교기",
    nick:"수원임장노트#712",
    time:"1시간 전",
    views:1490,
    likes:73,
    tags:["#수원·화서·영통"],
    body:`경기도 1등 인구 자족도시 수원에서 지금 가장 뜨거운 3대 축(화서역 대유평지구 · 매교역 신축 재개발 · 영통/광교 라인)을 하루 날 잡고 다녀왔습니다. 지도 앱으로만 보던 것과 실제 도보 체감이 꽤 달랐어요!

1. 화서역 파크푸르지오 & 브리시엘 (대유평지구)
- 스타필드 수원이 단지랑 브릿지로 바로 연결되는 슬세권 위력이 어마어마합니다. 초·중·고와 숙지공원, 화서역(1호선 + 신분당선 연장 호재)까지 평지로 이어져서 실거주 만족도가 왜 높은지 체감됐습니다.

2. 수원역 푸르지오자이 & 매교역 신축 타운
- 매교역 일대 1만 2천 세대 신축 브랜드 타운은 길도 깨끗하고 단지 컨디션이 훌륭합니다. 다만 일부 단지에서 수원역까지 도보로 걸어보니 지도상 거리보다 은근히 호흡이 길어서, 성인 걸음 컨디션에 따라 역까지 직접 걸어보고 동을 고르시는 걸 추천해요.

3. 영통구 (망포·영통 학원가·광교 인접)
- 삼성전자 직주근접 + 영통 학원가 + 분당선·신분당선 라인이라 전세 수요가 사계절 내내 마르지 않는 탄탄한 실수요 지역이었습니다. 최근 영통구 84㎡ 거래량이 먼저 반등하는 이유를 알겠더라고요.`,
    cmts:[
      {id:"p5c1",nick:"화서브리시엘#334",badge:"지역주민",time:"55분 전",txt:"화서역 브리시엘·화서역파크푸르지오는 스타필드 브릿지 연결 + 초중고·공원·역세권까지 진짜 원스톱이라 실거주 만족도 최고입니다."},
      {id:"p5c2",nick:"매교실거주#508",badge:"실거주",time:"44분 전",txt:"수원역 도보 체감 팩트체크 공감해요! 지도만 보지 말고 직접 걸어봐야 합니다. 대신 매교역 초역세권 동들은 분당선 타기 정말 편하고 화서역 주변은 범계역처럼 깔끔해졌어요."},
      {id:"p5c3",nick:"영통삼성맨#815",badge:"지역주민",time:"30분 전",txt:"아이 학원 돌리기엔 영통 중심상가 학원가 따라올 곳이 없죠. 리모델링·재건축 추진 단지들이랑 망포 신축 대단지 둘 다 전세가율이 엄청 탄탄합니다."}
    ]
  },
  {
    id:"p6",
    cat:"finance",
    catLbl:"대출·규제·정책",
    hot:true,
    region:"서울 송파·강남 · 수도권 핵심",
    sgg:"11170",
    title:"토지거래허가구역 해제 파장 & 잠실(엘·리·트·레)·대치·삼성 이후 비규제 풍선효과 정리",
    nick:"시장시그널분석#102",
    time:"2시간 전",
    views:1680,
    likes:81,
    tags:["#토허제·강남잠실","#마포·성동"],
    body:`토지거래허가구역 해제 발표 전후로 잠실(엘스·리센츠·트리지움·레이크팰리스)과 대치(래미안대치팰리스)·삼성(래미안라클래시·센트럴아이파크) 현장 분위기를 체크해봤습니다.

1. 상급지 현장 변화
- 실거주 2년 의무가 풀리고 전세 끼고 매수(갭투자)가 가능해지자마자, 집주인들이 내놨던 매물을 거둬들이거나 호가를 한 번에 1~2억씩 올리는 현상이 나타났습니다. "부동산에 가도 계좌가 안 나온다"는 말이 나올 정도로 상급지 대기 수요가 강하게 확인됐어요.

2. 우리에게 중요한 '다음 풍선효과(키맞추기)' 경로
- 잠실·강남 84㎡가 한 단계 위로 점프하면, 그 예산으로 진입하려던 실수요자들이 즉각 눈을 돌리는 곳이 바로 **성동(옥수·금호·왕십리)·마포(아현·공덕)·광진·강동(고덕·둔촌)·분당·과천**입니다.
- 그리고 그다음 파도가 **수지·광명·평촌·영통** 등 경기 핵심지 대장 84㎡로 3~6개월 시차를 두고 번집니다.

지금 상급지를 추격매수하기보다, 상급지와의 가격 갭이 역사적 평균보다 크게 벌어진 '인접 2선 핵심지'의 거래량 반등 단지를 선점하는 게 훨씬 유리한 구간으로 보입니다.`,
    cmts:[
      {id:"p6c1",nick:"잠실모니터링#920",badge:"실거주",time:"1시간 전",txt:"현장 분위기 진짜 그대로입니다. 발표 당일 저녁부터 중개소에 전화 불나고 기존 급매물은 하루 만에 다 정리됐어요."},
      {id:"p6c2",nick:"성동갈아타기#441",badge:"갈아타기",time:"52분 전",txt:"잠실 84㎡ 호가 뛰는 거 보고 바로 성동·강동 신축급 84㎡로 선회하는 매수 대기자들이 눈에 띄게 늘었습니다. 시차 키맞추기 공식은 늘 반복되네요."},
      {id:"p6c3",nick:"데이터트래커#193",badge:"분석러",time:"37분 전",txt:"집썰 상단 '서울 vs 경기 밸런스 라운지'랑 단지별 최근 30일·90일 실거래 등락률 같이 보면서 아직 덜 오른 대표단지 찾는 게 핵심이겠네요."}
    ]
  },
  {
    id:"p7",
    cat:"region",
    catLbl:"서울·경기 입지비교",
    hot:false,
    region:"서울 마포/성동 vs 경기 분당/수지",
    sgg:"11440",
    title:"9~11억 맞벌이 최대 난제: 서울 마포·성동 구축 59㎡ 버티기 vs 분당·수지 준신축 84㎡",
    nick:"맞벌이갈림길#611",
    time:"2시간 전",
    views:1340,
    likes:64,
    tags:["#마포·성동","#수지·분당"],
    body:`광화문(남편)·강남(아내) 출퇴근하는 5년 차 맞벌이 부부입니다. 현재 종잣돈 + 대출 합쳐서 9.5~10.5억 선으로 매수를 보는데, 이 예산대 부부들이 100% 겪는 밸런스 게임에 빠졌습니다.

A안. 서울 마포·성동 역세권 구축 59㎡ (20평대 방 3개·화장실 1~2개)
- 두 사람 모두 통근 왕복 1시간 이내로 삶의 여유 확보
- 서울 핵심지라 회복장 때 가장 먼저 오르고 전세가율·환금성이 압도적

B안. 경기 분당·용인 수지 신분당선 준신축 84㎡ (30평대 방 3개·화장실 2개·광폭 주차)
- 아이 키우면서 짐 늘어날 때 30평대 + 지하주차장 연결 + 학군·공원 인프라는 비교 불가
- 광화문 출퇴근은 광역버스/환승으로 편도 1시간 10~20분 감수해야 함

밸런스 라운지 투표도 거의 52:48로 박빙이던데, 실제로 결정하신 선배님들 후기가 궁금합니다!`,
    cmts:[
      {id:"p7c1",nick:"마포59거주#284",badge:"서울파",time:"1시간 전",txt:"아이 초등 저학년 전까지는 맞벌이 부부 출퇴근 체력 아끼는 게 최고입니다. 마포·성동 59㎡ 등기 쳐서 자산 불린 뒤 초등 고학년 때 84㎡로 넘어가세요!"},
      {id:"p7c2",nick:"분당84만족#739",badge:"경기파",time:"1시간 전",txt:"유모차 끌고 퇴근 후 밤 10시에 이중주차 밀어보시면 다음 날 바로 준신축 84㎡ 계약서 쓰게 됩니다. 신분당선 라인 84㎡도 서울 59㎡ 오른 뒤 꼭 따라붙어요."}
    ]
  },
  {
    id:"p8",
    cat:"finance",
    catLbl:"대출·규제·정책",
    hot:false,
    region:"수도권 공통 · 주담대/DSR",
    sgg:"11110",
    title:"스트레스 DSR 적용 후 부부합산 소득별 실전 주담대 한도·원리금 안전선 정리",
    nick:"내집마련재무#490",
    time:"3시간 전",
    views:1285,
    likes:71,
    tags:["#DSR·주담대","#생애최초·징검다리"],
    body:`집 보러 다니기 전에 '내 대출력이 정확히 얼마인지'부터 계산해야 헛걸음을 안 합니다. 최근 스트레스 DSR 가산금리가 적용되면서 예전 생각하고 가계약금부터 넣었다가 한도 부족으로 당황하는 분들이 꽤 계시더라고요.

[실전 체크 포인트 3가지]
1. 마이너스 통장(미사용 한도 포함)·신용대출 보유 시 DSR 한도가 크게 깎입니다. 매수 전 안 쓰는 마통은 반드시 한도 감액이나 해지부터 하세요.
2. 생애최초 LTV 80%(최대 6억 한도)가 나오더라도, 결국 최종 대출액은 LTV가 아니라 부부합산 연소득 기준 **DSR(40%)**에서 결정되는 경우가 대부분입니다.
3. 가장 안전한 실거주 기준선은 **월 실수령액 대비 원리금 상환액 30~35% 이하**입니다. 금리 인하기 기대감만 믿고 변동금리 영끌하기보다, 5년 주기형·혼합형 금리와 중도상환수수료 면제 시점(3년)을 함께 설계하세요.`,
    cmts:[
      {id:"p8c1",nick:"올해등기목표#156",badge:"내집마련 준비",time:"2시간 전",txt:"안 쓰는 마이너스 통장 5천만 원 열어둔 게 DSR 한도를 그렇게 많이 잡아먹는지 은행 상담받고 처음 알았어요. 계약 전에 미리 정리 필수입니다!"},
      {id:"p8c2",nick:"갈아타기성공#902",badge:"실거주",time:"1시간 전",txt:"부부합산 원리금 30% 이내가 진짜 심리적 마지노선 맞습니다. 그래야 조정장이 와도 흔들리지 않고 버틸 수 있어요."}
    ]
  },
  {
    id:"p9",
    cat:"fact",
    catLbl:"단지·임장 팩트체크",
    hot:false,
    region:"서울 동대문·성북 · 이문/장위",
    sgg:"11305",
    title:"서울 동북권 9~11억대 신축 대단지: 이문·휘경 뉴타운 vs 장위 뉴타운 현장 비교",
    nick:"동북권신축탐방#377",
    time:"4시간 전",
    views:1190,
    likes:53,
    tags:["#생애최초·징검다리"],
    body:`서울 안에서 9~11억대로 번듯한 브랜드 대단지 신축 59㎡~84㎡에 들어갈 수 있는 마지막 기회의 땅이 동대문구 이문·휘경 뉴타운(래미안 라그란데·이문 아이파크자이 등)과 성북구 장위 뉴타운(장위자이 레디언트 등)인 것 같아 두 곳 모두 임장 다녀왔습니다.

- 이문·휘경 뉴타운: 1호선 외대앞역·회기역·신이문역 평지 역세권에 1만 세대 이상 브랜드 대단지가 한꺼번에 들어서면서 동네 스카이라인이 완전히 바뀌었습니다. 청량리역(GTX-B·C, 분당선, KTX) 생활권을 가깝게 누릴 수 있는 게 큰 장점입니다.
- 장위 뉴타운: 6호선 돌곶이역·석계역(1·6호선 환승) 라인에 대단지 신축이 들어섰고 북서울꿈의숲 녹지 접근성이 좋습니다.

신축 대단지 입주장에는 전세 물량이 일시적으로 쏟아지면서 전세가가 합리적으로 형성되니, 신혼부부 첫 실거주나 전세 레버리지로 눈여겨보기에 가성비가 훌륭해 보입니다.`,
    cmts:[
      {id:"p9c1",nick:"청량리생활권#618",badge:"지역주민",time:"3시간 전",txt:"이문·휘경은 평지 비중이 높고 청량리역 백화점·마트 인프라 이용하기가 너무 편해서 입주 후 만족도가 확 올라가고 있어요."},
      {id:"p9c2",nick:"신축첫입주#245",badge:"실거주",time:"2시간 전",txt:"인서울 신축 대단지의 힘은 입주장 끝나고 2년 차 돌입할 때 진짜 무섭게 나타나죠. 전세 물량 소화되는 속도가 엄청 빠릅니다."}
    ]
  },
  {
    id:"p10",
    cat:"fact",
    catLbl:"단지·임장 팩트체크",
    hot:false,
    region:"경기 안양시 동안구 · 평촌/인덕원",
    sgg:"41117",
    title:"경기 남부 학군 1티어 평촌 학원가 & 인덕원 쿼드러플 역세권 주말 도보 임장기",
    nick:"동안구학부모#842",
    time:"5시간 전",
    views:1120,
    likes:58,
    tags:["#수원·화서·영통","#수지·분당"],
    body:`초등 자녀 학군 때문에 안양 동안구(평촌 학원가 인근 귀인동·범계역 라인과 인덕원역 인근 신축·준신축)를 꼼꼼히 둘러봤습니다.

1. 평촌 학원가 & 귀인동·범계 라인
- 경기도에서 대치동 다음으로 학원가 밀집도가 높다는 말을 실감했습니다. 반듯한 평지 격자형 도시에 중앙공원·롯데백화점·한림대병원까지 인프라가 완벽합니다. 선도지구 재건축 기대감 있는 단지들과 학원가 도보권 59·84㎡는 실거주+학군 수요가 워낙 두터워서 최근 거래량이 빠르게 살아나고 있네요.

2. 인덕원역 라인 (평촌센텀퍼스트·푸르지오엘센트로 등)
- 기존 4호선에 월판선(판교 직결)·인동선·GTX-C까지 예정된 쿼드러플 역세권 입지라 판교·강남·사당 출퇴근하는 젊은 맞벌이 수요가 강하게 유입되고 있었습니다.`,
    cmts:[
      {id:"p10c1",nick:"평촌학원가#390",badge:"지역주민",time:"4시간 전",txt:"평촌은 한 번 들어오면 아이 대학 갈 때까지 이사를 안 나갑니다. 학원 셔틀 안 태우고 도보로 보낼 수 있는 게 맞벌이 부부에게 엄청난 축복이에요."},
      {id:"p10c2",nick:"인덕원판교러#511",badge:"실거주",time:"3시간 전",txt:"인덕원~판교 접근성이 좋아서 판교 IT 맞벌이 부부들이 평촌·인덕원 신축으로 정말 많이 넘어오고 있습니다."}
    ]
  },
  {
    id:"p11",
    cat:"buy",
    catLbl:"매수·갈아타기",
    hot:false,
    region:"서울 동작·서초·송파 · 13~15억대",
    sgg:"11170",
    title:"13~15억 상급지 진입 전략: 노량진 뉴타운·방배 정비사업 vs 송파·강동 준신축 등기",
    nick:"상급지점프#904",
    time:"6시간 전",
    views:1260,
    likes:61,
    tags:["#토허제·강남잠실","#강동·하남·위례"],
    body:`기존 보유 1주택 매도 후 13~15억대 상급지로 갈아타기를 준비하면서 가장 많이 비교한 두 가지 루트입니다.

1. 입지 급상승 중인 동작(노량진 뉴타운·흑석) 및 방배 인근 진입
- 여의도·용산·강남 삼각축 한가운데 위치한 노량진 뉴타운은 하이엔드 브랜드들이 줄줄이 들어서면서 미래 한강변 준상급지로 완전히 탈바꿈하고 있습니다.

2. 지금 당장 쾌적하게 실거주 가능한 송파·강동(고덕·둔촌)·성동·분당 대단지 84㎡
- 공사비 상승이나 입주 대기 기간 리스크 없이, 당장 완성된 인프라와 학군을 누리면서 상급지 시세 흐름을 그대로 따라갈 수 있습니다.

아이 나이가 어리거나 전세를 끼고 시간을 살 수 있다면 입지 상향(1번)이 매력적이고, 당장 초중고 학령기 실거주라면 완성형 대단지(2번)가 후회 없는 선택이 될 것 같습니다.`,
    cmts:[
      {id:"p11c1",nick:"동작한강변#721",badge:"갈아타기",time:"5시간 전",txt:"노량진 뉴타운은 입지 자체가 여의도·용산·강남 코앞이라 전부 입주하고 나면 지금 흑석·아현 이상으로 위상이 바뀔 곳이라 봅니다."},
      {id:"p11c2",nick:"송파실거주#108",badge:"실거주",time:"4시간 전",txt:"돈이 묶이는 기간과 이주·공사비 변수가 부담스럽다면 이미 입주 마친 대단지 신축·준신축 등기가 마음 건강에 훨씬 좋습니다."}
    ]
  },
  {
    id:"p12",
    cat:"fact",
    catLbl:"단지·임장 팩트체크",
    hot:false,
    region:"임장 노하우 · 수도권 공통",
    sgg:"11620",
    title:"지도 앱만 보고 샀다가 후회합니다! 임장 현장에서 10분 만에 단지 급 알아보는 꿀팁 5가지",
    nick:"주말임장러#550",
    time:"7시간 전",
    views:1410,
    likes:88,
    tags:["#광명·철산","#수원·화서·영통"],
    body:`주말마다 수도권 단지를 걸어 다니면서 터득한 '현장에 가야만 보이는 팩트체크 리스트 5가지'를 공유합니다.

1. 외벽 '창호(샤시)'로 수리 상태 한눈에 파악하기
- 구축 아파트 임장 갈 때 1층에서 위를 올려다보세요. 로고 박힌 최신 이중창 샤시로 바뀐 세대 비율이 높을수록 실거주 집주인이 애정을 갖고 올수리하며 사는 단지입니다. 매수할 때도 샤시 교체 여부가 인테리어 비용 1,000~1,500만 원을 좌우합니다!

2. 대형몰·지하철역 '브릿지 직결 & 실제 도보 신호등' 체크
- 지도상 직선거리 400m라도 왕복 8차선 신호등 2개 건너고 오르막이면 체감 12분이고, 평지 보행자 전용도로나 브릿지로 연결되면 체감 4분입니다.

3. 대형 쇼핑몰 바로 앞 상가의 명암과 동별 소음
- 스타필드·백화점 슬세권이라도 정문 진·출입 차량 대기줄이 서는 동인지, 조용한 공원뷰 동인지에 따라 실거주 만족도와 로얄동 가격 차이가 꽤 납니다.

4. 초등학교 배정 학구도와 횡단보도 유무
5. 평일 저녁 9시 이후 주차장 여유도 (가능하면 저녁에 한 번 더 가보세요!)`,
    cmts:[
      {id:"p12c1",nick:"창호체크꿀팁#882",badge:"공감",time:"6시간 전",txt:"1번 창호(샤시)로 평형이랑 내부 수리 상태 가늠하는 팁 진짜 유용하네요! 구축 볼 때 샤시만 되어 있어도 인테리어 예산이 확 줄어들죠."},
      {id:"p12c2",nick:"초품아엄마#340",badge:"학부모",time:"5시간 전",txt:"지도상 도보 5분인데 막상 걸어보니 육교 건너고 언덕이었던 단지가 꽤 많았어요. 무조건 내 발로 걸어보고 계약해야 합니다."}
    ]
  }
];

let CB_STATE={cat:"all",tag:"전체",q:"",sort:"hot",openId:"p1",limit:6,composing:false};

function getCbPosts(){
  let userPosts=[];try{userPosts=JSON.parse(localStorage.getItem("jade_cb_posts")||"[]")}catch(e){}
  let likes={};try{likes=JSON.parse(localStorage.getItem("jade_cb_likes")||"{}")}catch(e){}
  let cmtMap={};try{cmtMap=JSON.parse(localStorage.getItem("jade_cb_cmts")||"{}")}catch(e){}
  const all=[...userPosts,...CB_SEED_POSTS].map(p=>{
    const extraCmts=cmtMap[p.id]||[];
    const mergedCmts=[...extraCmts,...(p.cmts||[])];
    const liked=!!likes[p.id];
    const lk=(p.likes||0)+(liked?1:0);
    return {...p,cmts:mergedCmts,liked,likesCount:lk,cmtCount:mergedCmts.length};
  });
  return all;
}

function openBoardPost(pid){
  CB_STATE.openId=pid;
  CB_STATE.cat="all";
  CB_STATE.tag="전체";
  CB_STATE.q="";
  CB_STATE.limit=Math.max(CB_STATE.limit,12);
  renderCommunityBoard();
  setTimeout(()=>{
    const el=document.querySelector(`.cb-item[data-id="${pid}"]`)||$("#community-board");
    if(el)el.scrollIntoView({behavior:"smooth",block:"center"});
  },60);
}

function renderCommunityBoard(){
  const wrap=$("#community-board");
  if(!wrap)return;
  const all=getCbPosts();
  const catCounts={all:all.length};
  CB_CATS.forEach(c=>{if(c.k!=="all")catCounts[c.k]=all.filter(p=>p.cat===c.k).length});

  const q=CB_STATE.q.trim().toLowerCase();
  let filtered=all.filter(p=>{
    if(CB_STATE.cat!=="all"&&p.cat!==CB_STATE.cat)return false;
    if(CB_STATE.tag!=="전체"&&!(p.tags||[]).includes(CB_STATE.tag))return false;
    if(q){
      const hay=(p.title+" "+p.body+" "+p.region+" "+(p.tags||[]).join(" ")).toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  });

  if(CB_STATE.sort==="hot"){
    filtered.sort((a,b)=>(b.hot?1:0)-(a.hot?1:0)||b.likesCount-a.likesCount||b.cmtCount-a.cmtCount);
  }else if(CB_STATE.sort==="cmt"){
    filtered.sort((a,b)=>b.cmtCount-a.cmtCount||b.likesCount-a.likesCount);
  }

  const visible=filtered.slice(0,CB_STATE.limit);

  wrap.innerHTML=`
    <div class="cb-head">
      <div class="cb-title-group">
        <span class="cb-eyebrow">📋 COMMUNITY BOARD · 실거주·갈아타기 최다 언급 토픽</span>
        <h4>💬 집썰 실거주·임장 커뮤니티 게시판</h4>
        <p class="cb-sub">지금 내집마련·갈아타기 실수요자들이 가장 많이 비교하고 물어보는 핵심 주제와 현장 팩트체크</p>
      </div>
      <div class="cb-head-actions">
        <button type="button" class="cb-write-toggle" id="cb-write-btn">✏️ 새 글 쓰기</button>
      </div>
    </div>

    <div class="cb-hot-bar" role="region" aria-label="최다 언급 키워드 태그">
      <span class="cb-hot-label">🔥 최다 언급 키워드</span>
      ${CB_HOT_TAGS.map(t=>`<button type="button" class="cb-tag-pill ${CB_STATE.tag===t?"on":""}" data-tag="${esc(t)}">${esc(t)}</button>`).join("")}
    </div>

    <div class="cb-controls">
      <div class="cb-cats" role="tablist" aria-label="게시판 카테고리">
        ${CB_CATS.map(c=>`<button type="button" role="tab" aria-selected="${CB_STATE.cat===c.k}" class="cb-cat-btn ${CB_STATE.cat===c.k?"on":""}" data-cat="${c.k}">${esc(c.lbl)}<span class="cb-cat-cnt">${catCounts[c.k]||0}</span></button>`).join("")}
      </div>
      <div class="cb-right-tools">
        <div class="cb-search-wrap">
          <input type="search" class="cb-search-inp" id="cb-q" value="${esc(CB_STATE.q)}" placeholder="⌕ 지역·단지·키워드 검색" aria-label="게시판 검색">
        </div>
        <div class="cb-sort-group" role="group" aria-label="정렬">
          <button type="button" class="cb-sort-btn ${CB_STATE.sort==="hot"?"on":""}" data-sort="hot">🔥 인기순</button>
          <button type="button" class="cb-sort-btn ${CB_STATE.sort==="new"?"on":""}" data-sort="new">🕒 최신순</button>
          <button type="button" class="cb-sort-btn ${CB_STATE.sort==="cmt"?"on":""}" data-sort="cmt">💬 댓글순</button>
        </div>
      </div>
    </div>

    <form class="cb-composer ${CB_STATE.composing?"":"hidden"}" id="cb-composer">
      <div class="cb-comp-top">
        <select class="cb-comp-sel" id="cb-in-cat" aria-label="카테고리 선택">
          <option value="buy">매수·갈아타기</option>
          <option value="region">서울·경기 입지비교</option>
          <option value="finance">대출·규제·정책</option>
          <option value="fact">단지·임장 팩트체크</option>
        </select>
        <input type="text" class="cb-comp-region" id="cb-in-region" placeholder="관심 지역/예산 (예: 광명·철산 9억대)" maxlength="30">
        <input type="text" class="cb-comp-title" id="cb-in-title" placeholder="제목을 입력하세요 (고민 중인 지역·단지·질문)" maxlength="80" required>
      </div>
      <textarea class="cb-comp-body" id="cb-in-body" placeholder="비교 중인 단지, 예산/대출 조건, 현장에서 느낀 점이나 질문을 자유롭게 남겨보세요." maxlength="1000" required></textarea>
      <div class="cb-comp-foot">
        <span class="muted sm">익명 닉네임(<b>${esc(getMyNick())}</b>)으로 등록되며 이 기기에 즉시 반영됩니다.</span>
        <div class="cb-comp-btns">
          <button type="button" class="cb-comp-cancel" id="cb-comp-cancel">취소</button>
          <button type="submit" class="cb-comp-submit">게시글 등록</button>
        </div>
      </div>
    </form>

    <div class="cb-list">
      ${visible.length?visible.map(p=>{
        const isOpen=CB_STATE.openId===p.id;
        return `
          <article class="cb-item ${isOpen?"open":""}" data-id="${esc(p.id)}">
            <div class="cb-row" data-toggle="${esc(p.id)}">
              <div class="cb-row-top">
                <div class="cb-badges">
                  ${p.hot?'<span class="cb-badge-hot">🔥 최다언급</span>':""}
                  <span class="cb-badge-cat cat-${esc(p.cat)}">${esc(p.catLbl)}</span>
                  <span class="cb-badge-region">📍 ${esc(p.region)}</span>
                </div>
                <span class="muted sm">${esc(p.time)}</span>
              </div>
              <div class="cb-row-title-wrap">
                <h5 class="cb-row-title">${esc(p.title)}</h5>
                <span class="cb-row-cmt-cnt">[${p.cmtCount}]</span>
              </div>
              <p class="cb-row-preview">${esc(p.body.replace(/\n+/g," "))}</p>
              <div class="cb-row-meta">
                <div class="cb-meta-left">
                  <span class="cb-nick">${esc(p.nick)}</span>
                  <span>조회 ${(p.views||0).toLocaleString()}</span>
                </div>
                <div class="cb-meta-right">
                  <span class="cb-stat-like">👍 공감 ${p.likesCount}</span>
                  <span class="cb-stat-cmt">💬 댓글 ${p.cmtCount}</span>
                  <span>${isOpen?"접기 ▲":"펼쳐보기 ▼"}</span>
                </div>
              </div>
            </div>
            ${isOpen?`
              <div class="cb-detail">
                <div class="cb-body">${esc(p.body)}</div>
                ${(p.tags&&p.tags.length)?`<div class="cb-detail-tags">${p.tags.map(t=>`<span class="cb-detail-tag">${esc(t)}</span>`).join("")}</div>`:""}
                <div class="cb-detail-actions">
                  <button type="button" class="cb-like-btn ${p.liked?"liked":""}" data-like="${esc(p.id)}">👍 공감 ${p.likesCount}명 ${p.liked?"(공감완료)":""}</button>
                  <button type="button" class="cb-jump-region-btn" data-jump-sgg="${esc(p.sgg||"")}">📊 관련 지역 실거래 단지 보러가기 →</button>
                </div>
                <div class="cb-replies-wrap">
                  <div class="cb-replies-title">💬 실수요자 댓글 · 현장 의견 (${p.cmtCount})</div>
                  <div class="cb-reply-list">
                    ${p.cmts.map(c=>`
                      <div class="cb-reply-item">
                        <div class="cb-reply-head">
                          <span><span class="cb-reply-nick">${esc(c.nick)}</span>${c.badge?`<span class="cb-reply-badge">${esc(c.badge)}</span>`:""}</span>
                          <span>${esc(c.time)}</span>
                        </div>
                        <div class="cb-reply-txt">${esc(c.txt)}</div>
                      </div>
                    `).join("")}
                  </div>
                  <form class="cb-reply-form" data-pid="${esc(p.id)}">
                    <input type="text" class="cb-reply-inp" maxlength="160" placeholder="이 주제에 대한 내 생각이나 현장 체감을 남겨주세요 (최대 160자)" aria-label="댓글 입력">
                    <button type="submit" class="cb-reply-submit">댓글 등록</button>
                  </form>
                </div>
              </div>
            `:""}
          </article>
        `;
      }).join(""):'<p class="muted" style="padding:18px 4px;text-align:center;">선택한 조건에 맞는 게시글이 없어요. 다른 키워드를 선택해보세요.</p>'}
    </div>

    ${filtered.length>CB_STATE.limit?`
      <div class="cb-more-wrap">
        <button type="button" class="cb-more-btn" id="cb-more-btn">게시글 더보기 (${visible.length}/${filtered.length}) ▼</button>
      </div>
    `:""}
  `;

  // Bind events
  const writeBtn=$("#cb-write-btn");
  if(writeBtn)writeBtn.onclick=()=>{CB_STATE.composing=!CB_STATE.composing;renderCommunityBoard()};
  const cancelBtn=$("#cb-comp-cancel");
  if(cancelBtn)cancelBtn.onclick=()=>{CB_STATE.composing=false;renderCommunityBoard()};

  wrap.querySelectorAll(".cb-tag-pill").forEach(b=>b.onclick=()=>{
    const t=b.dataset.tag;
    CB_STATE.tag=(CB_STATE.tag===t&&t!=="전체")?"전체":t;
    renderCommunityBoard();
  });

  wrap.querySelectorAll(".cb-cat-btn").forEach(b=>b.onclick=()=>{
    CB_STATE.cat=b.dataset.cat;
    renderCommunityBoard();
  });

  wrap.querySelectorAll(".cb-sort-btn").forEach(b=>b.onclick=()=>{
    CB_STATE.sort=b.dataset.sort;
    renderCommunityBoard();
  });

  const qInp=$("#cb-q");
  if(qInp){
    qInp.oninput=e=>{
      CB_STATE.q=e.target.value;
      const pos=qInp.selectionStart;
      renderCommunityBoard();
      const nq=$("#cb-q");
      if(nq){nq.focus();try{nq.setSelectionRange(pos,pos)}catch(err){}}
    };
  }

  const compForm=$("#cb-composer");
  if(compForm){
    compForm.onsubmit=e=>{
      e.preventDefault();
      const cat=($("#cb-in-cat")||{}).value||"buy";
      const catObj=CB_CATS.find(c=>c.k===cat)||CB_CATS[1];
      const reg=(($("#cb-in-region")||{}).value||"").trim()||"수도권 실거주";
      const title=(($("#cb-in-title")||{}).value||"").trim();
      const body=(($("#cb-in-body")||{}).value||"").trim();
      if(!title||!body){toast("제목과 내용을 입력해주세요.");return}
      let userPosts=[];try{userPosts=JSON.parse(localStorage.getItem("jade_cb_posts")||"[]")}catch(err){}
      const np={
        id:"up"+Date.now(),
        cat,
        catLbl:catObj.lbl,
        hot:false,
        region:reg,
        sgg:"11440",
        title,
        nick:getMyNick(),
        time:"방금 전",
        views:1,
        likes:1,
        tags:[CB_STATE.tag!=="전체"?CB_STATE.tag:"#생애최초·징검다리"],
        body,
        cmts:[]
      };
      userPosts.unshift(np);
      try{localStorage.setItem("jade_cb_posts",JSON.stringify(userPosts.slice(0,30)))}catch(err){}
      CB_STATE.composing=false;
      CB_STATE.cat="all";
      CB_STATE.tag="전체";
      CB_STATE.openId=np.id;
      renderCommunityBoard();
      toast("📋 새 게시글이 게시판에 등록되었어요!");
    };
  }

  wrap.querySelectorAll("[data-toggle]").forEach(row=>{
    row.onclick=()=>{
      const pid=row.dataset.toggle;
      CB_STATE.openId=(CB_STATE.openId===pid)?null:pid;
      renderCommunityBoard();
    };
  });

  wrap.querySelectorAll("[data-like]").forEach(btn=>{
    btn.onclick=e=>{
      e.stopPropagation();
      const pid=btn.dataset.like;
      let likes={};try{likes=JSON.parse(localStorage.getItem("jade_cb_likes")||"{}")}catch(err){}
      likes[pid]=!likes[pid];
      try{localStorage.setItem("jade_cb_likes",JSON.stringify(likes))}catch(err){}
      renderCommunityBoard();
      if(likes[pid])toast("👍 게시글에 공감했어요!");
    };
  });

  wrap.querySelectorAll("[data-jump-sgg]").forEach(btn=>{
    btn.onclick=e=>{
      e.stopPropagation();
      const sgg=btn.dataset.jumpSgg;
      if(sgg&&SGG[sgg]){
        S.region="all";S.sgg=sgg;S.page=0;
        const selEl=$("#sgg");if(selEl)selEl.value=sgg;
        render();
      }
      const listEl=$("#list-sec");
      if(listEl)listEl.scrollIntoView({behavior:"smooth",block:"start"});
    };
  });

  wrap.querySelectorAll(".cb-reply-form").forEach(f=>{
    f.onsubmit=e=>{
      e.preventDefault();
      const pid=f.dataset.pid;
      const inp=f.querySelector(".cb-reply-inp");
      const txt=(inp&&inp.value||"").trim();
      if(!txt){toast("댓글 내용을 입력해주세요.");return}
      let cmtMap={};try{cmtMap=JSON.parse(localStorage.getItem("jade_cb_cmts")||"{}")}catch(err){}
      if(!cmtMap[pid])cmtMap[pid]=[];
      cmtMap[pid].unshift({
        id:"rc"+Date.now(),
        nick:getMyNick(),
        badge:"실시간 댓글",
        time:"방금 전",
        txt
      });
      try{localStorage.setItem("jade_cb_cmts",JSON.stringify(cmtMap))}catch(err){}
      renderCommunityBoard();
      toast("💬 게시판 댓글이 등록되었어요!");
    };
  });

  const moreBtn=$("#cb-more-btn");
  if(moreBtn)moreBtn.onclick=()=>{CB_STATE.limit+=6;renderCommunityBoard()};
}

function initCommunityBoard(){
  renderCommunityBoard();
}

init();

document.addEventListener("click",e=>{const a=e.target.closest("[data-toast]");if(!a)return;e.preventDefault();toast(a.dataset.toast)});
