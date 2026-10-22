# 제이드의 내집마련 - 화면용 지표 계산 (trades.db -> web_data/*.json)
# 사용법: python metrics.py
import os, json, sqlite3, statistics, datetime
from collections import defaultdict

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "web_data"); os.makedirs(OUT, exist_ok=True)
con = sqlite3.connect(os.path.join(BASE, "trades.db"))

def band(a):  # 면적대: 59/84 등 평형 묶음
    for lo, hi, n in [(0,50,"~50"),(50,66,"59"),(66,76,"74"),(76,90,"84"),(90,110,"100"),(110,999,"110+")]:
        if lo <= a < hi: return n

rows = con.execute("""SELECT sgg_cd, umd_nm, jibun, apt_nm, area, floor, amount, deal_date
                      FROM trades WHERE cancel_type = '' ORDER BY deal_date""").fetchall()

cx = defaultdict(list)
for sgg, umd, jb, nm, area, fl, amt, d in rows:
    cx[(sgg, umd, jb, nm, band(area))].append((d, amt, area, fl))

today = datetime.date.today()
def ym_ago(n):
    y, m = today.year, today.month - n
    while m <= 0: y, m = y - 1, m + 12
    return f"{y}-{m:02d}"
recent_from, prev_from = ym_ago(3), ym_ago(6)   # 최근 3개월 vs 그 전 3개월

complexes, up, down = [], 0, 0
for (sgg, umd, jb, nm, b), deals in cx.items():
    monthly = defaultdict(list)
    for d, amt, *_ in deals: monthly[d[:7]].append(amt)
    recent = [a for d, a, *_ in deals if d[:7] >= recent_from]
    prev = [a for d, a, *_ in deals if prev_from <= d[:7] < recent_from]
    change = None
    if len(recent) >= 2 and len(prev) >= 2:
        r, p = statistics.median(recent), statistics.median(prev)
        change = round((r - p) / p * 100, 1)
        if change > 0: up += 1
        elif change < 0: down += 1
    last = deals[-1]
    complexes.append({
        "id": f"{sgg}-{umd}-{jb}-{nm}-{b}", "sgg": sgg, "dong": umd, "name": nm, "band": b,
        "price": round(last[1] / 10000, 2), "change": change, "count": len(deals),
        "series": [{"month": m, "median": round(statistics.median(v) / 10000, 2), "count": len(v)}
                   for m, v in sorted(monthly.items())],
        "recent": [{"date": d, "price": round(a / 10000, 2), "area": ar, "floor": f}
                   for d, a, ar, f in reversed(deals[-5:])],
    })

ranked = sorted([c for c in complexes if c["change"] is not None and c["count"] >= 10],
                key=lambda c: c["change"], reverse=True)
summary = {"updated": today.isoformat(), "total": len(complexes), "up": up, "down": down,
           "top_up": ranked[:20], "top_down": ranked[-20:][::-1]}

json.dump(summary, open(os.path.join(OUT, "summary.json"), "w", encoding="utf-8"), ensure_ascii=False)
json.dump(complexes, open(os.path.join(OUT, "complexes.json"), "w", encoding="utf-8"), ensure_ascii=False)
print(f"단지(면적대) {len(complexes)}개 | 상승 {up} | 하락 {down}")
print("상승률 상위 5:")
for c in ranked[:5]:
    print(f"  {c['dong']} {c['name']} {c['band']}㎡  {c['price']}억  {c['change']:+}%")
