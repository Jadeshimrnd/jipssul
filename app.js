const SGG={"11440":"서울 마포구","11170":"서울 용산구","11110":"서울 종로구","11620":"서울 관악구","11140":"서울 중구","11305":"서울 강북구","41590":"경기 화성시","41310":"경기 구리시","41117":"경기 수원시 영통구","41465":"경기 용인시 수지구","28185":"인천 연수구","28237":"인천 부평구"};
const $=s=>document.querySelector(s);let ALL=[],S={region:"all",q:"",sgg:"",rep:false,sort:"change",dir:-1,page:0,sel:null,per:12};
const band=b=>b==="~50"?"~50㎡":b==="110+"?"110㎡+":b+"㎡";
const pct=v=>v==null?"-":(v>0?"+":"")+v.toFixed(1)+"%";const cls=v=>v>0?"up":v<0?"down":"";
const eok=v=>v==null?"-":(+v).toFixed(v>=10?1:2).replace(/\.?0+$/,"")+"억";
const gu=s=>(SGG[s]||s).split(" ").slice(1).join(" ");const sido=s=>(SGG[s]||"").split(" ")[0];
function lastMonths(n){const d=new Date(window.UPDATED||Date.now()),o=[];for(let i=0;i<n;i++){const x=new Date(d.getFullYear(),d.getMonth()-i,1);o.push(x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0"))}return o}
function isRep(c){if(c.count<20||c.change==null)return false;const m=new Set((c.series||[]).filter(s=>s.count>0).map(s=>s.month));return lastMonths(6).filter(x=>m.has(x)).length>=4}
async function get(dir){const[a,b]=await Promise.all(["summary","complexes"].map(f=>fetch(`${dir}/${f}.json`,{cache:"no-store"}).then(r=>{if(!r.ok)throw 0;return r.json()})));return[a,b]}
async function init(){let sum,cx;try{[sum,cx]=await get("web_data")}catch(e){[sum,cx]=await get("sample_data");$("#badge").classList.remove("hide")}
window.UPDATED=sum.updated;ALL=cx.map(c=>({...c,rep:isRep(c)}));$("#updated").textContent="업데이트 "+sum.updated;
Object.keys(SGG).filter(k=>ALL.some(c=>c.sgg===k)).forEach(k=>$("#sgg").insertAdjacentHTML("beforeend",`<option value="${k}">${SGG[k]}</option>`));
document.querySelectorAll("#tabs a").forEach(a=>a.onclick=()=>{document.querySelectorAll("#tabs a").forEach(x=>x.classList.remove("on"));a.classList.add("on");S.region=a.dataset.r;S.page=0;S.sel=null;render()});
$("#q").oninput=e=>{S.q=e.target.value.trim();S.page=0;renderList()};$("#sgg").onchange=e=>{S.sgg=e.target.value;S.page=0;renderList()};
$("#rep").onchange=e=>{S.rep=e.target.checked;S.page=0;renderList()};
document.querySelectorAll("th[data-s]").forEach(th=>th.onclick=()=>{const k=th.dataset.s;S.dir=S.sort===k?-S.dir:(k==="name"?1:-1);S.sort=k;renderList()});
$("#prev").onclick=()=>{if(S.page>0){S.page--;renderList()}};$("#next").onclick=()=>{S.page++;renderList()};render()}
const inRegion=c=>S.region==="all"||(S.region==="11"?c.sgg.startsWith("11"):/^(41|28)/.test(c.sgg));
function render(){const r=ALL.filter(inRegion);$("#k-total").textContent=r.length.toLocaleString();
$("#k-up").textContent=r.filter(c=>c.change>0).length.toLocaleString();$("#k-down").textContent=r.filter(c=>c.change<0).length.toLocaleString();
const reps=r.filter(c=>c.rep);$("#k-rep").textContent=reps.length;
const top=[...reps].sort((a,b)=>b.change-a.change).slice(0,3);
$("#movers").innerHTML=top.map(c=>`<div class="mv" data-id="${c.id}"><div class="g">${SGG[c.sgg]} · ${c.dong}</div><div class="n">${c.name}</div><div class="s"><span>${band(c.band)} · ${eok(c.price)}</span><b class="${cls(c.change)}">${pct(c.change)}</b></div></div>`).join("")||'<p class="muted">조건을 만족하는 단지가 없어요.</p>';
document.querySelectorAll(".mv").forEach(d=>d.onclick=()=>select(d.dataset.id));
if(!S.sel||!r.find(c=>c.id===S.sel))S.sel=(top[0]||r[0]||{}).id;renderList();renderDetail()}
function filtered(){const q=S.q.toLowerCase();let r=ALL.filter(c=>inRegion(c)&&(!S.sgg||c.sgg===S.sgg)&&(!S.rep||c.rep)&&(!q||(c.name+c.dong+SGG[c.sgg]).toLowerCase().includes(q)));
const k=S.sort,d=S.dir;return r.sort((a,b)=>{if(k==="change"){if(a.rep!==b.rep)return a.rep?-1:1;const x=a.change??-1e9*d,y=b.change??-1e9*d;return(x-y)*d}if(k==="name")return(gu(a.sgg)+a.name).localeCompare(gu(b.sgg)+b.name,"ko")*d;return(a[k]-b[k])*d})}
function renderList(){const r=filtered(),pages=Math.max(1,Math.ceil(r.length/20));S.page=Math.min(S.page,pages-1);const p=r.slice(S.page*20,S.page*20+20);
$("#cnt").textContent=r.length.toLocaleString();
$("#rows").innerHTML=p.map(c=>`<tr data-id="${c.id}" class="${c.id===S.sel?"sel":""}"><td><div class="t1">${c.rep?"★ ":""}${gu(c.sgg)}<i>${sido(c.sgg)}</i></div><div class="t2">${c.name} · ${band(c.band)}</div></td><td class="r">${(+c.price).toFixed(1)}</td><td class="r ${cls(c.change)}">${pct(c.change)}</td></tr>`).join("");
document.querySelectorAll("#rows tr").forEach(t=>t.onclick=()=>select(t.dataset.id));
$("#pinfo").textContent=r.length?`${S.page*20+1}–${S.page*20+p.length} / ${r.length}개`:"결과 없음";
document.querySelectorAll("th[data-s]").forEach(th=>{th.textContent=th.textContent.replace(/ [↑↓]$/,"")+(th.dataset.s===S.sort?(S.dir>0?" ↑":" ↓"):"")})}
function select(id){S.sel=id;renderList();renderDetail()}
function renderDetail(){const c=ALL.find(x=>x.id===S.sel),el=$("#detail");if(!c){el.innerHTML='<p class="muted">단지를 선택하세요.</p>';return}
el.innerHTML=`<div class="loc">${SGG[c.sgg]} / ${c.dong}</div><h2>${c.name}</h2><div class="muted">전용 ${band(c.band)} · 누적 ${c.count}건${c.rep?'<span class="chip">★ 대표 단지 후보</span>':""}</div>
<div class="big">${eok(c.price)}<span class="${cls(c.change)}">${pct(c.change)}</span><span class="muted">최근 3개월 vs 직전 3개월 중위가</span></div>
<div class="per">${[[12,"1년"],[24,"2년"],[0,"전체"]].map(([n,l])=>`<button data-n="${n}" class="${S.per===n?"on":""}">${l}</button>`).join("")}<span class="lg">— 월별 중위가 &nbsp; ▮ 거래량</span></div>
<div id="chart"></div><h3>최근 거래 내역 <span class="muted" style="font-weight:400;font-size:12px">${c.recent.length}건</span></h3>
<table class="tbl"><thead><tr><th>계약일</th><th>전용면적</th><th>층</th><th class="r">거래금액</th></tr></thead><tbody>${c.recent.map(t=>`<tr><td>${t.date.replace(/-/g,".")}</td><td>${(+t.area).toFixed(2)}㎡</td><td>${t.floor}층</td><td class="r"><b>${eok(t.price)}</b></td></tr>`).join("")||'<tr><td colspan=4 class="muted">거래 없음</td></tr>'}</tbody></table>`;
el.querySelectorAll(".per button").forEach(b=>b.onclick=()=>{S.per=+b.dataset.n;renderDetail()});chart(c)}
function chart(c){let s=c.series||[];if(S.per)s=s.filter(x=>x.month>=lastMonths(S.per).pop());const box=$("#chart");if(s.length<1){box.innerHTML='<p class="muted">기간 내 거래가 없어요.</p>';return}
const W=box.clientWidth||700,H=280,L=26,R=54,T=14,PH=170,BT=200,BH=50,v=s.map(x=>x.median);let mn=Math.min(...v),mx=Math.max(...v);const pad=(mx-mn)*.15||mx*.05;mn-=pad;mx+=pad;
const n=s.length,X=i=>L+(n===1?(W-L-R)/2:i*(W-L-R)/(n-1)),Y=p=>T+(mx-p)/(mx-mn)*PH,cm=Math.max(...s.map(x=>x.count)),bw=Math.max(3,Math.min(14,(W-L-R)/n*.55));
let g="";for(let i=0;i<=4;i++){const p=mn+(mx-mn)*i/4;g+=`<line x1="${L}" x2="${W-R}" y1="${Y(p)}" y2="${Y(p)}" stroke="#e8dfcf" stroke-dasharray="3 3"/><text x="${W-R+6}" y="${Y(p)+3}">${p.toFixed(1)}</text>`}
const pts=s.map((x,i)=>`${X(i)},${Y(x.median)}`).join(" ");
const bars=s.map((x,i)=>`<rect x="${X(i)-bw/2}" y="${BT+BH-x.count/cm*BH}" width="${bw}" height="${x.count/cm*BH}" fill="${i===n-1?"#8a6a43":"#d9c9ab"}"><title>${x.month} ${x.count}건</title></rect>`).join("");
const step=Math.ceil(n/6),lab=s.map((x,i)=>(i%step===0||i===n-1)?`<text x="${X(i)}" y="${H-6}" text-anchor="middle">${x.month.replace("-",".")}</text>`:"").join("");
const dots=s.map((x,i)=>`<circle cx="${X(i)}" cy="${Y(x.median)}" r="2.5" fill="#fff" stroke="#7a5a35"><title>${x.month} ${x.median}억 (${x.count}건)</title></circle>`).join("");
const ly=Y(v[n-1]);box.innerHTML=`<svg width="${W}" height="${H}">${g}<polygon points="${X(0)},${T+PH} ${pts} ${X(n-1)},${T+PH}" fill="#efe4d0" opacity=".6"/><polyline points="${pts}" fill="none" stroke="#7a5a35" stroke-width="2"/>${dots}
<rect x="${W-R+2}" y="${ly-9}" width="${R-4}" height="18" rx="3" fill="#7a5a35"/><text x="${W-R+8}" y="${ly+4}" style="fill:#fff;font-weight:700">${v[n-1].toFixed(1)}</text>${bars}${lab}</svg>`}
init();
