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
  {tag:"[밸런스 투표]",text:"9억 예산 실거주: 마포·성동 구축 59㎡ vs 분당·수지 준신축 84㎡",meta:"(222명 투표 중) →",target:"#lounge-sec",match:"m1"},
  {tag:"[단지 팩트체크]",text:"전세가율 65% 돌파 단지들, 지금 갭보다 실거주 진입 타이밍일까요?",meta:"(실시간 톡 28) →",target:"#detail"},
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

function renderMonoCta(c){
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
        <b>🔔 제이드홈 PRO 실시간 시그널 멤버십 혜택 (첫달 무료 체험)</b><br>
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
function openReportModal(mode,cx){
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

init();
