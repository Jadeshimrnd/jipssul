# 제이드의 내집마련 - 아파트 매매 실거래가 수집기
# 사용법: python collect.py            -> 이번 달 + 지난달 갱신 (매일 실행용)
#         python collect.py 202401 202609 -> 기간 전체 백필
import os, sys, sqlite3, time, datetime
import xml.etree.ElementTree as ET
import requests

from urllib.parse import unquote
API_KEY = unquote((os.environ.get("MOLIT_API_KEY") or "").strip().strip('"'))  # Encoding/Decoding 둘 다 OK
URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade"
DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "trades.db")

# 관심 지역 시군구 코드 (필요한 만큼 추가)
REGIONS = {
    "11440": "서울 마포구", "11170": "서울 용산구", "11110": "서울 종로구",
    "11620": "서울 관악구", "11140": "서울 중구",  "11305": "서울 강북구",
    "41590": "경기 화성시", "41310": "경기 구리시", "41117": "경기 수원시 영통구",
    "41465": "경기 용인시 수지구", "28185": "인천 연수구", "28237": "인천 부평구",
}

def t(item, tag):
    v = item.findtext(tag)
    return v.strip() if v else ""

def init_db(con):
    con.execute("""CREATE TABLE IF NOT EXISTS trades(
      sgg_cd TEXT, umd_nm TEXT, jibun TEXT, apt_nm TEXT, apt_dong TEXT,
      area REAL, floor INTEGER, amount INTEGER, deal_date TEXT,
      build_year INTEGER, dealing_gbn TEXT, cancel_type TEXT, cancel_day TEXT,
      updated_at TEXT,
      PRIMARY KEY(sgg_cd, umd_nm, jibun, apt_nm, apt_dong, area, floor, amount, deal_date))""")

def fetch(lawd, ym):
    rows, page = [], 1
    while True:
        r = requests.get(URL, params={"serviceKey": API_KEY, "LAWD_CD": lawd,
            "DEAL_YMD": ym, "numOfRows": 1000, "pageNo": page}, timeout=30)
        root = ET.fromstring(r.content)
        code = root.findtext(".//resultCode")
        if code not in ("000", "00"):
            raise RuntimeError(f"{lawd} {ym} 오류: {r.text[:200]}")
        items = root.findall(".//item")
        rows += items
        total = int(root.findtext(".//totalCount") or 0)
        if page * 1000 >= total: return rows
        page += 1

def save(con, items):
    now = datetime.datetime.now().isoformat(timespec="seconds")
    for it in items:
        date = f"{t(it,'dealYear')}-{int(t(it,'dealMonth')):02d}-{int(t(it,'dealDay')):02d}"
        con.execute("""INSERT INTO trades VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT DO UPDATE SET cancel_type=excluded.cancel_type,
            cancel_day=excluded.cancel_day, updated_at=excluded.updated_at""",
          (t(it,"sggCd"), t(it,"umdNm"), t(it,"jibun"), t(it,"aptNm"), t(it,"aptDong"),
           float(t(it,"excluUseAr") or 0), int(t(it,"floor") or 0),
           int(t(it,"dealAmount").replace(",","") or 0), date,
           int(t(it,"buildYear") or 0), t(it,"dealingGbn"),
           t(it,"cdealType"), t(it,"cdealDay"), now))

def months(start, end):
    y, m = int(start[:4]), int(start[4:])
    while f"{y}{m:02d}" <= end:
        yield f"{y}{m:02d}"
        m += 1
        if m > 12: y, m = y + 1, 1

if __name__ == "__main__":
    if not API_KEY: sys.exit("MOLIT_API_KEY 환경변수를 먼저 설정하세요.")
    print(f"키 확인: 길이 {len(API_KEY)}자, 앞 4자리 {API_KEY[:4]}")
    today = datetime.date.today()
    if len(sys.argv) == 3:
        yms = list(months(sys.argv[1], sys.argv[2]))
    else:
        prev = (today.replace(day=1) - datetime.timedelta(days=1))
        yms = [prev.strftime("%Y%m"), today.strftime("%Y%m")]
    con = sqlite3.connect(DB); init_db(con)
    for lawd, name in REGIONS.items():
        for ym in yms:
            items = fetch(lawd, ym); save(con, items); con.commit()
            print(f"{name} {ym}: {len(items)}건")
            time.sleep(0.3)
    print("완료:", con.execute("SELECT COUNT(*) FROM trades").fetchone()[0], "건 저장됨")
