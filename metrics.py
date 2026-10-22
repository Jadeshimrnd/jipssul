# 제이드의 내집마련 - 화면용 지표 계산 (trades.db -> web_data/*.json)
# 사용법: python metrics.py [YYYY-MM-DD]   (기준일 지정은 테스트용, 환경변수 JADE_REF_DATE도 가능)
import os, sys, json, sqlite3, statistics, datetime
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

_ref = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get("JADE_REF_DATE", "")).strip()
today = datetime.date.fromisoformat(_ref) if _ref else datetime.date.today()
def ym_ago(n):
    y, m = today.year, today.month - n
    while m <= 0: y, m = y - 1, m + 12
    return f"{y}-{m:02d}"
recent_from, prev_from = ym_ago(3), ym_ago(6)   # 최근 3개월 vs 그 전 3개월

complexes, up, down = [], 0, 0
chg = {}  # 단지키 -> 등락률 (시장의 마음 상승 비중용)
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
    chg[(sgg, umd, jb, nm, b)] = change
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

# ---------- 지금, 시장의 마음 ----------
# 실거래는 계약 후 30일 안에 신고되므로 이번 달·지난달은 덜 집계돼 있음.
# 그래서 거래량은 '이번 달을 뺀 최근 3개 완결 월' vs '작년 같은 3개월'(전년 동기)로 비교.
# (지난달은 여전히 일부 덜 신고됐을 수 있어 감소 쪽으로 약간 치우칠 수 있음)
# 점수(0~100) = 거래량 점수 30% + 상승 단지 비중 40% + 신고가 점수 30%
#   거래량 점수 = 50 + 전년 동기 대비 거래량 증감률(%) x 1.5   (0~100으로 자름)
#   상승 단지 비중 = 상승 / (상승 + 하락) x 100
#   신고가 점수 = 50 + (신고가 비중% - 15) x 2.5  (15%를 보통 수준으로 봄)
# 판단: 60 이상 '매수 우위', 40 이하 '매도 우위', 그 사이 '관망'
W_VOL, W_RISE, W_HIGH, NH_BASE = 0.3, 0.4, 0.3, 15
SCOPES = {"all": lambda s: True, "seoul": lambda s: s.startswith("11"),
          "gyeonggi_incheon": lambda s: s.startswith("41") or s.startswith("28")}
vol_recent = [ym_ago(i) for i in (3, 2, 1)]   # 이번 달 제외 최근 3개 완결 월
vol_prev = [ym_ago(i) for i in (15, 14, 13)]   # 작년 같은 3개월 (전년 동기 비교)
spark_months = [ym_ago(i) for i in range(12, 0, -1)]
clamp = lambda v: max(0.0, min(100.0, v))

def sentiment(pred):
    cnt = defaultdict(int)
    nh_total = nh_hit = 0
    for key, deals in cx.items():
        if not pred(key[0]): continue
        prior_max = None
        for d, amt, *_ in deals:          # 날짜순 정렬됨
            m = d[:7]
            cnt[m] += 1
            if m in vol_recent and prior_max is not None:
                nh_total += 1
                if amt > prior_max: nh_hit += 1
            if m <= vol_recent[-1]:
                prior_max = amt if prior_max is None else max(prior_max, amt)
    r, p = sum(cnt[m] for m in vol_recent), sum(cnt[m] for m in vol_prev)
    vol = round((r - p) / p * 100, 1) if p else None
    u = sum(1 for k, v in chg.items() if pred(k[0]) and v is not None and v > 0)
    dn = sum(1 for k, v in chg.items() if pred(k[0]) and v is not None and v < 0)
    rise = round(u / (u + dn) * 100, 1) if u + dn else None
    nh = round(nh_hit / nh_total * 100, 1) if nh_total else None
    parts = [(clamp(50 + vol * 1.5) if vol is not None else 50, W_VOL),
             (rise if rise is not None else 50, W_RISE),
             (clamp(50 + (nh - NH_BASE) * 2.5) if nh is not None else 50, W_HIGH)]
    score = round(sum(v * w for v, w in parts))
    label = "매수 우위" if score >= 60 else "매도 우위" if score <= 40 else "관망"
    tone = {"매수 우위": "매수 심리가 강한 편이에요.", "매도 우위": "매수 심리가 약한 편이에요.",
            "관망": "관망하는 분위기예요."}[label]
    vtxt = ("최근 3개월 거래량이 작년 같은 기간과 비슷하고" if vol is None or abs(vol) < 1 else
            f"최근 3개월 거래량이 작년 같은 기간보다 {abs(vol):.0f}% {'늘고' if vol > 0 else '줄고'}")
    sentence = (f"{vtxt}, 오른 단지가 {rise if rise is not None else 0:.0f}%, "
                f"신고가 거래 비중이 {nh if nh is not None else 0:.0f}%라 {tone}")
    return {"label": label, "score": score, "summary": sentence,
            "signals": {"volume_change_pct": vol, "volume_recent": r, "volume_prev": p,
                        "rising_share_pct": rise, "up": u, "down": dn,
                        "new_high_share_pct": nh, "new_high_trades": nh_hit, "new_high_base": nh_total},
            "windows": {"recent": [vol_recent[0], vol_recent[-1]], "prev": [vol_prev[0], vol_prev[-1]],
                        "price_change": "최근 3개월 vs 직전 3개월 중위가 (이번 달 포함, 단지·면적대별)",
                        "volume_basis": "yoy", "volume_compare": "최근 3개 완결 월 vs 작년 같은 3개월 (이번 달 제외)",
                        "note": "신고 기한(계약 후 30일) 때문에 이번 달은 거래량·신고가 계산에서 제외하고, 거래량은 계절 영향을 없애려 작년 같은 기간과 비교해요. 지난달은 아직 일부 덜 집계됐을 수 있어요."},
            "monthly": [{"month": m, "count": cnt[m]} for m in spark_months]}

summary["sentiment"] = {k: sentiment(f) for k, f in SCOPES.items()}
summary["sentiment_method"] = {"weights": {"volume": W_VOL, "rising": W_RISE, "new_high": W_HIGH},
    "volume_score": "50 + 전년 동기 대비 거래량 증감률 x 1.5 (최근 3개 완결 월 vs 작년 같은 3개월, 이번 달 제외)", "new_high_score": f"50 + (신고가 비중 - {NH_BASE}) x 2.5",
    "thresholds": {"매수 우위": ">= 60", "매도 우위": "<= 40", "관망": "41~59"}, "reference_date": today.isoformat()}

json.dump(summary, open(os.path.join(OUT, "summary.json"), "w", encoding="utf-8"), ensure_ascii=False)
json.dump(complexes, open(os.path.join(OUT, "complexes.json"), "w", encoding="utf-8"), ensure_ascii=False)
print(f"단지(면적대) {len(complexes)}개 | 상승 {up} | 하락 {down}")
print("상승률 상위 5:")
for c in ranked[:5]:
    print(f"  {c['dong']} {c['name']} {c['band']}㎡  {c['price']}억  {c['change']:+}%")
for k, v in summary["sentiment"].items():
    g = v["signals"]
    print(f"시장의 마음[{k}] {v['label']} {v['score']}점 | 거래량 {g['volume_change_pct']}% | 상승 {g['rising_share_pct']}% | 신고가 {g['new_high_share_pct']}%")
