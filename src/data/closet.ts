// ─── TYPES ───────────────────────────────────────────────────────────
export type Season = "spring" | "summer" | "fall" | "winter";
export type Mood = "casual" | "neat" | "cool" | "formal";
export type StyleTag = "워크웨어" | "아이비" | "프레피" | "힙합" | "캐주얼" | "공식" | "아웃도어" | "특수" | "데일리";

export type CategoryKey = string;

export interface ClothingItem {
  id: string;
  cat: CategoryKey;
  name: string;
  brand?: string;
  color?: string;
  season?: Season[];
  tags: StyleTag[];
  note?: string;
  image_url?: string;
  purchased_at?: string;
  last_cleaned_at?: string;
  acquired_via?: string;
  size?: string;
}

export interface Combo {
  bottom: string;
  tops: string[];
  outers: string[];
  shoes: string[];
  mood: Mood[];
  desc: string;
  season: Season[];
}

export interface WishItem {
  id: string;
  name: string;
  price?: string;
  status: string;
  note: string;
  link?: string;
  image_url?: string;
}

// ─── CONSTANTS ──────────────────────────────────────────────────────
export const CATEGORIES: Record<string, string> = {
  bottoms: "하의",
  shirts: "긴팔 셔츠",
  knits: "니트/가디건",
  hoodies: "후디",
  longTees: "긴팔 티셔츠",
  shortTees: "반팔 라운드티",
  poloTees: "반팔 카라티",
  outerWinter: "아우터 · 겨울",
  outerSpringFall: "아우터 · 봄가을",
  outerSummer: "아우터 · 여름",
  shoes: "신발",
  accessories: "소품",
};

export const SEASONS: Record<Season, string> = {
  spring: "봄",
  summer: "여름",
  fall: "가을",
  winter: "겨울",
};

export const MOODS: Record<Mood, string> = {
  casual: "편하게",
  neat: "깔끔하게",
  cool: "멋있게",
  formal: "공식자리",
};

export const STATUS_LABELS: Record<string, string> = {
  confirmed: "다음달 구매",
  summer: "여름에 찾기",
  watch: "나오면 잡기",
  hold: "보류",
};

export const STATUS_COLORS: Record<string, string> = {
  confirmed: "#4A7C59",
  summer: "#C4952B",
  watch: "#5A7BA0",
  hold: "#8E8E8E",
};

export const TAG_COLORS: Record<string, string> = {
  "워크웨어": "#6B6B42",
  "아이비": "#2C3E6B",
  "프레피": "#5A7BA0",
  "힙합": "#6B2D3E",
  "공식": "#3A3A3A",
  "캐주얼": "#B0A090",
  "아웃도어": "#4A7C59",
  "특수": "#8E8E8E",
  "데일리": "#C4952B",
};

// ─── COLOR MAP ──────────────────────────────────────────────────────
const colorMap: Record<string, string> = {
  "크림": "#F5F0E1", "베이지": "#D4C5A9", "샌드베이지": "#C8B68E", "화이트": "#F8F8F5",
  "블랙": "#2A2A2A", "네이비": "#2C3E6B", "그레이": "#8E8E8E", "회색": "#9E9E9E",
  "브라운": "#7B5B3A", "갈색": "#7B5B3A", "버건디": "#6B2D3E", "머스터드": "#C4952B",
  "카키": "#6B6B42", "진청": "#2B4570", "연청": "#7BA0C9", "중청": "#3B6AA0",
  "더스티핑크": "#C9A0A0", "인디언핑크": "#C47070", "하늘색": "#87BFDC",
  "짙은 녹색": "#2D5A3D", "흙색": "#6B4E3A", "고동색": "#5A3A2A", "토바코": "#6B4E2A",
  "흰색": "#F5F5F0", "노랑": "#D4B840",
};

export function getColor(name: string): string {
  for (const [key, val] of Object.entries(colorMap)) {
    if (name.includes(key)) return val;
  }
  return "#B0A090";
}

// ─── ITEMS ──────────────────────────────────────────────────────────
export const ITEMS: ClothingItem[] = [
  // 하의
  { id: "b1", cat: "bottoms", name: "카펜터 팬츠 그레이", brand: "무탠다드", color: "그레이", season: ["spring","summer","fall","winter"], tags: ["워크웨어"] },
  { id: "b2", cat: "bottoms", name: "카펜터 팬츠 샌드베이지", brand: "디키즈", color: "샌드베이지", season: ["spring","fall","winter"], tags: ["워크웨어"], note: "덕 캔버스, 크롭 수선" },
  { id: "b3", cat: "bottoms", name: "스트레이트 청바지 연청", color: "연청", season: ["spring","fall","winter"], tags: ["캐주얼"] },
  { id: "b4", cat: "bottoms", name: "스트레이트 청바지 진청", color: "진청", season: ["spring","fall","winter"], tags: ["캐주얼","아이비"] },
  { id: "b5", cat: "bottoms", name: "테이퍼드 청바지 중청", color: "중청", season: ["summer"], tags: ["캐주얼"], note: "여름용 얇은 청바지" },
  { id: "b6", cat: "bottoms", name: "스트레이트 청바지 진청", color: "진청", season: ["summer"], tags: ["캐주얼"], note: "여름용 얇은 청바지" },
  // 긴팔 셔츠
  { id: "s1", cat: "shirts", name: "옥스포드 셔츠 크림", brand: "무탠다드", color: "크림", season: ["spring","fall","winter"], tags: ["아이비","프레피"], note: "릴렉스드핏, 빼입기" },
  { id: "s2", cat: "shirts", name: "옥스포드 셔츠 하늘색", brand: "무탠다드", color: "하늘색", season: ["spring","fall","winter"], tags: ["아이비","프레피"], note: "릴렉스드핏, 빼입기" },
  { id: "s3", cat: "shirts", name: "드레스 셔츠 화이트", color: "화이트", season: ["spring","fall","winter"], tags: ["공식"] },
  { id: "s4", cat: "shirts", name: "드레스 셔츠 블랙", color: "블랙", season: ["spring","fall","winter"], tags: ["공식"] },
  // 니트/가디건
  { id: "k1", cat: "knits", name: "크리켓 니트 V넥", color: "블랙", season: ["fall","winter"], tags: ["아이비","프레피"], note: "블랙+화이트+오렌지 라인, 울" },
  { id: "k2", cat: "knits", name: "케이블 니트 브라운", color: "브라운", season: ["fall","winter"], tags: ["캐주얼"] },
  { id: "k3", cat: "knits", name: "가디건 베이지", color: "베이지", season: ["spring","fall"], tags: ["아이비","프레피"] },
  { id: "k4", cat: "knits", name: "면니트 그레이 카라", color: "그레이", season: ["spring","fall"], tags: ["캐주얼","아이비"] },
  { id: "k5", cat: "knits", name: "면니트 브라운 라운드넥", color: "브라운", season: ["spring","fall"], tags: ["캐주얼"] },
  { id: "k6", cat: "knits", name: "스트라이프 니트 크림-그레이", color: "크림", season: ["spring","fall"], tags: ["캐주얼"] },
  // 후디
  { id: "h1", cat: "hoodies", name: "후디 크림", brand: "골스튜디오", color: "크림", season: ["spring","fall","winter"], tags: ["캐주얼"] },
  { id: "h2", cat: "hoodies", name: "후디 흙색", brand: "아웃도어 프로덕츠", color: "흙색", season: ["spring","fall","winter"], tags: ["캐주얼","워크웨어"] },
  { id: "h3", cat: "hoodies", name: "후디 머스터드", brand: "내셔널지오그래픽", color: "머스터드", season: ["spring","fall","winter"], tags: ["캐주얼"] },
  { id: "h4", cat: "hoodies", name: "후디 블랙", color: "블랙", season: ["spring","fall","winter"], tags: ["캐주얼"] },
  { id: "h5", cat: "hoodies", name: "후디 버건디", brand: "에비스", color: "버건디", season: ["spring","fall","winter"], tags: ["캐주얼","힙합"] },
  { id: "h6", cat: "hoodies", name: "레이어드 후디", brand: "PEEPS", color: "베이지", season: ["spring","fall","winter"], tags: ["힙합"], note: "베이지+블랙" },
  { id: "h7", cat: "hoodies", name: "니트 후디 그레이", brand: "커버낫", color: "그레이", season: ["fall","winter"], tags: ["캐주얼"] },
  // 긴팔 티셔츠
  { id: "lt1", cat: "longTees", name: "럭비티 노랑-크림", color: "노랑", season: ["spring","fall"], tags: ["프레피","캐주얼"] },
  { id: "lt2", cat: "longTees", name: "럭비티 흰색-네이비", color: "흰색", season: ["spring","fall"], tags: ["프레피","캐주얼"] },
  { id: "lt3", cat: "longTees", name: "레이어드 라운드티 블랙-그레이", color: "블랙", season: ["spring","fall","winter"], tags: ["캐주얼"] },
  // 반팔 라운드 티셔츠
  { id: "st1", cat: "shortTees", name: "레글런 반팔 머스터드 피너츠", color: "머스터드", season: ["summer"], tags: ["캐주얼","힙합"] },
  { id: "st2", cat: "shortTees", name: "라운드티 짙은 녹색", color: "짙은 녹색", season: ["summer"], tags: ["캐주얼"] },
  { id: "st3", cat: "shortTees", name: "라운드티 하늘색", color: "하늘색", season: ["summer"], tags: ["캐주얼"] },
  { id: "st4", cat: "shortTees", name: "라운드티 인디언 핑크", color: "인디언핑크", season: ["summer"], tags: ["캐주얼"] },
  { id: "st5", cat: "shortTees", name: "라운드티 크림", color: "크림", season: ["summer"], tags: ["캐주얼"] },
  // 반팔 카라 티셔츠
  { id: "pt1", cat: "poloTees", name: "슬릿 셔츠 흰색-블랙", color: "흰색", season: ["summer"], tags: ["캐주얼"] },
  { id: "pt2", cat: "poloTees", name: "슬릿 셔츠 베이지", color: "베이지", season: ["summer"], tags: ["캐주얼"] },
  { id: "pt3", cat: "poloTees", name: "버튼다운 인디언핑크", color: "인디언핑크", season: ["summer"], tags: ["캐주얼","프레피"] },
  // 아우터 겨울
  { id: "ow1", cat: "outerWinter", name: "롱 패딩 블랙", color: "블랙", season: ["winter"], tags: ["캐주얼"], note: "무릎 위 길이" },
  { id: "ow2", cat: "outerWinter", name: "헤링본 블레이저 베이지+갈색", color: "베이지", season: ["winter"], tags: ["아이비"] },
  { id: "ow3", cat: "outerWinter", name: "오버핏 블레이저 회색 모직", color: "회색", season: ["winter"], tags: ["캐주얼","아이비"] },
  { id: "ow4", cat: "outerWinter", name: "플리스 점퍼 갈색", color: "갈색", season: ["winter"], tags: ["캐주얼","워크웨어"] },
  { id: "ow5", cat: "outerWinter", name: "롱코트 베이지 모직", color: "베이지", season: ["winter"], tags: ["공식","아이비"] },
  // 아우터 봄가을
  { id: "osf1", cat: "outerSpringFall", name: "블레이저 네이비", color: "네이비", season: ["spring","fall"], tags: ["아이비","공식"] },
  { id: "osf2", cat: "outerSpringFall", name: "바시티 재킷 네이비", color: "네이비", season: ["spring","fall"], tags: ["프레피"] },
  { id: "osf3", cat: "outerSpringFall", name: "초어 재킷 네이비", brand: "무탠다드", color: "네이비", season: ["spring","fall"], tags: ["워크웨어"] },
  { id: "osf4", cat: "outerSpringFall", name: "필드 재킷 카키", brand: "노티카 x 하이츠", color: "카키", season: ["spring","fall"], tags: ["워크웨어"], note: "나일론, 후드 있음" },
  { id: "osf5", cat: "outerSpringFall", name: "바람막이 블랙", color: "블랙", season: ["spring","fall"], tags: ["캐주얼"] },
  { id: "osf6", cat: "outerSpringFall", name: "셔츠 재킷 갈색", color: "갈색", season: ["spring","fall"], tags: ["워크웨어","캐주얼"] },
  { id: "osf7", cat: "outerSpringFall", name: "트렌치코트 카키/짙은베이지", color: "카키", season: ["spring","fall"], tags: ["공식","아이비"] },
  // 아우터 여름
  { id: "os1", cat: "outerSummer", name: "바람막이 짙은 녹색", color: "짙은 녹색", season: ["summer"], tags: ["캐주얼"], note: "매우 얇음" },
  { id: "os2", cat: "outerSummer", name: "블레이저 블랙", color: "블랙", season: ["summer"], tags: ["공식"] },
  { id: "os3", cat: "outerSummer", name: "블레이저 베이지", color: "베이지", season: ["summer"], tags: ["아이비","캐주얼"] },
  // 신발
  { id: "sh1", cat: "shoes", name: "뉴발란스 1080", brand: "뉴발란스", color: "흰색", season: ["spring","summer","fall","winter"], tags: ["캐주얼"], note: "흰+고동색+더티핑크, 일상 메인" },
  { id: "sh2", cat: "shoes", name: "아디다스 캠퍼스 회색", brand: "아디다스", color: "회색", season: ["spring","summer","fall","winter"], tags: ["캐주얼"], note: "비 올 때" },
  { id: "sh3", cat: "shoes", name: "머렐 랩트 토바코", brand: "머렐", color: "토바코", season: ["spring","summer","fall","winter"], tags: ["워크웨어"], note: "캠핑, 어스톤 코디" },
  { id: "sh4", cat: "shoes", name: "노스페이스 등산화 블랙", brand: "노스페이스", color: "블랙", season: ["spring","fall","winter"], tags: ["아웃도어"] },
  { id: "sh5", cat: "shoes", name: "캠퍼 구두 블랙", brand: "캠퍼", color: "블랙", season: ["spring","summer","fall","winter"], tags: ["공식","아이비"], note: "공식 자리 전용" },
  { id: "sh6", cat: "shoes", name: "장화", season: ["spring","summer","fall"], tags: ["특수"], note: "특수 목적" },
  { id: "sh7", cat: "shoes", name: "크록스", season: ["summer"], tags: ["특수"], note: "특수 목적" },
  // 소품
  { id: "a1", cat: "accessories", name: "니트 타이 버건디", color: "버건디", tags: ["아이비","프레피"], note: "플레인 노트" },
  { id: "a2", cat: "accessories", name: "니트 타이 네이비", color: "네이비", tags: ["아이비","프레피"] },
  { id: "a3", cat: "accessories", name: "가죽 벨트 브라운", color: "브라운", tags: [] },
  { id: "a4", cat: "accessories", name: "안경 투명테", tags: [] },
  { id: "a5", cat: "accessories", name: "안경 갈색 투명 동그란테", color: "갈색", tags: [] },
  { id: "a6", cat: "accessories", name: "애플워치", tags: [] },
  { id: "a7", cat: "accessories", name: "파타고니아 아톰 6L", brand: "파타고니아", color: "블랙", tags: [], note: "운동" },
  { id: "a8", cat: "accessories", name: "배럴 호보백 그레이", brand: "배럴", color: "그레이", tags: [], note: "가벼운 외출" },
  { id: "a9", cat: "accessories", name: "헤링본 크로스백", tags: [], note: "카메라" },
  { id: "a10", cat: "accessories", name: "토트백 네이비", color: "네이비", tags: [], note: "백팩 싫은 날" },
  { id: "a11", cat: "accessories", name: "인케이스 슬리브 블랙", brand: "인케이스", color: "블랙", tags: [], note: "노트북 이너" },
  { id: "a12", cat: "accessories", name: "벨로이 슬링 10L", brand: "벨로이", color: "블랙", tags: [], note: "카메라 외출" },
  { id: "a13", cat: "accessories", name: "그레고리 데이팩 디럭스", brand: "그레고리", color: "블랙", tags: ["데일리"], note: "데일리" },
  { id: "a14", cat: "accessories", name: "WANDRD PRVKE 31L", brand: "WANDRD", color: "블랙", tags: [], note: "행사 촬영" },
];

// ─── COMBOS ─────────────────────────────────────────────────────────
export const COMBOS: Combo[] = [
  // ═══════════════════════════════════════════════════════════════
  // 여름 (하의: b1 그레이카펜터, b5 중청테이퍼드, b6 진청스트레이트)
  // 상의: 반팔라운드티(st1~5), 반팔카라티(pt1~3)
  // 아우터: os1 녹색바람막이, os2 블랙블레이저, os3 베이지블레이저
  // 신발: sh1 뉴발, sh2 캠퍼스, sh3 머렐, sh5 캠퍼구두, sh7 크록스
  // ═══════════════════════════════════════════════════════════════

  // 여름 — 그레이 카펜터
  { bottom: "b1", tops: ["st2","st3","st5","pt1","pt2"], outers: ["os1","os3"], shoes: ["sh1","sh2","sh3"], mood: ["casual"], season: ["summer"], desc: "여름 그레이카펜터 캐주얼" },
  { bottom: "b1", tops: ["st5","pt2"], outers: ["os3"], shoes: ["sh1","sh3"], mood: ["neat"], season: ["summer"], desc: "여름 그레이카펜터 깔끔하게" },
  { bottom: "b1", tops: ["pt1","pt3"], outers: ["os2"], shoes: ["sh5"], mood: ["formal"], season: ["summer"], desc: "여름 그레이카펜터 공식자리" },

  // 여름 — 중청 테이퍼드
  { bottom: "b5", tops: ["st1","st2","st3","st4","st5","pt1","pt2","pt3"], outers: ["os1","os3"], shoes: ["sh1","sh2","sh3","sh7"], mood: ["casual"], season: ["summer"], desc: "여름 중청 캐주얼" },
  { bottom: "b5", tops: ["st5","pt2","pt3"], outers: ["os3"], shoes: ["sh1","sh3"], mood: ["neat"], season: ["summer"], desc: "여름 중청 깔끔하게" },
  { bottom: "b5", tops: ["pt1","pt3"], outers: ["os2"], shoes: ["sh5"], mood: ["formal"], season: ["summer"], desc: "여름 중청 공식자리" },
  { bottom: "b5", tops: ["st1","st4"], outers: ["os1"], shoes: ["sh1","sh2"], mood: ["cool"], season: ["summer"], desc: "여름 중청 컬러 포인트" },

  // 여름 — 진청 스트레이트 (얇은)
  { bottom: "b6", tops: ["st2","st3","st5","pt1","pt3"], outers: ["os1","os3"], shoes: ["sh1","sh2","sh3"], mood: ["casual"], season: ["summer"], desc: "여름 진청 캐주얼" },
  { bottom: "b6", tops: ["st5","pt2"], outers: ["os3"], shoes: ["sh1","sh3"], mood: ["neat","cool"], season: ["summer"], desc: "여름 진청 클린" },
  { bottom: "b6", tops: ["pt1","pt3"], outers: ["os2"], shoes: ["sh5"], mood: ["formal"], season: ["summer"], desc: "여름 진청 공식자리" },

  // ═══════════════════════════════════════════════════════════════
  // 봄가을 (하의: b1 그레이카펜터, b2 샌드베이지카펜터, b3 연청, b4 진청)
  // 상의: s1~4 셔츠, k3~6 면니트+가디건, h1~6 후디, lt1~3 긴팔티
  // 아우터: osf1~7
  // 신발: sh1~5
  // ═══════════════════════════════════════════════════════════════

  // 봄가을 — 그레이 카펜터
  { bottom: "b1", tops: ["s1","k4","k6","h1","h2","lt2","lt3"], outers: ["osf3","osf5"], shoes: ["sh1","sh2"], mood: ["casual"], season: ["spring","fall"], desc: "그레이카펜터 캐주얼" },
  { bottom: "b1", tops: ["s1","k4"], outers: ["osf3"], shoes: ["sh3"], mood: ["neat","cool"], season: ["spring","fall"], desc: "크림 옥스포드 + 초어재킷 워크웨어" },
  { bottom: "b1", tops: ["s1","s3"], outers: ["osf1"], shoes: ["sh5"], mood: ["formal"], season: ["spring","fall"], desc: "그레이카펜터 블레이저 공식" },
  { bottom: "b1", tops: ["h1","h4"], outers: ["osf3","osf5"], shoes: ["sh1"], mood: ["casual"], season: ["spring","fall"], desc: "그레이카펜터 후디 레이어링" },

  // 봄가을 — 샌드베이지 카펜터
  { bottom: "b2", tops: ["s2","k5","h2","h5","h6"], outers: ["osf4","osf6"], shoes: ["sh3","sh1"], mood: ["casual","cool"], season: ["spring","fall"], desc: "샌드베이지 어스톤 코디" },
  { bottom: "b2", tops: ["s2"], outers: ["osf1"], shoes: ["sh5"], mood: ["neat","formal"], season: ["spring","fall"], desc: "하늘색 옥스포드 + 네이비 블레이저" },
  { bottom: "b2", tops: ["s1","k3"], outers: ["osf4"], shoes: ["sh3"], mood: ["neat"], season: ["spring","fall"], desc: "샌드베이지 아이비+워크웨어 믹스" },
  { bottom: "b2", tops: ["lt1","lt2"], outers: ["osf5","osf6"], shoes: ["sh1","sh2"], mood: ["casual"], season: ["spring","fall"], desc: "샌드베이지 럭비티 캐주얼" },

  // 봄가을 — 연청
  { bottom: "b3", tops: ["s1","s2","k4","k6","lt1","lt2","h1"], outers: ["osf3","osf2","osf5"], shoes: ["sh1","sh2"], mood: ["casual","neat"], season: ["spring","fall"], desc: "연청 캐주얼" },
  { bottom: "b3", tops: ["s1"], outers: ["osf2"], shoes: ["sh1"], mood: ["cool"], season: ["spring","fall"], desc: "크림 옥스포드 + 바시티 프레피" },
  { bottom: "b3", tops: ["s1","s3"], outers: ["osf1","osf7"], shoes: ["sh5"], mood: ["formal"], season: ["spring","fall"], desc: "연청 블레이저/트렌치 공식" },
  { bottom: "b3", tops: ["k4","k5"], outers: ["osf4","osf6"], shoes: ["sh3"], mood: ["casual"], season: ["spring","fall"], desc: "연청 면니트 + 워크웨어 아우터" },

  // 봄가을 — 진청
  { bottom: "b4", tops: ["s1","k4","k5","h4","h5","lt3"], outers: ["osf1","osf3","osf4"], shoes: ["sh3","sh1"], mood: ["casual","neat","cool"], season: ["spring","fall"], desc: "진청 클래식" },
  { bottom: "b4", tops: ["s1","s3"], outers: ["osf1","osf7"], shoes: ["sh5"], mood: ["neat","formal"], season: ["spring","fall"], desc: "진청 블레이저/트렌치 공식" },
  { bottom: "b4", tops: ["h4","h5"], outers: ["osf3"], shoes: ["sh3"], mood: ["casual","cool"], season: ["spring","fall"], desc: "진청 후디 + 초어재킷 레이어링" },
  { bottom: "b4", tops: ["s2","k3"], outers: ["osf2"], shoes: ["sh1"], mood: ["neat","cool"], season: ["spring","fall"], desc: "진청 하늘셔츠 + 바시티 프레피" },

  // ═══════════════════════════════════════════════════════════════
  // 겨울 (하의: b1 그레이카펜터, b2 샌드베이지카펜터, b3 연청, b4 진청)
  // 상의: 봄가을 전부 + k1 크리켓니트, k2 케이블니트, h7 니트후디
  // 아우터: ow1~5
  // 신발: sh1~5
  // ═══════════════════════════════════════════════════════════════

  // 겨울 — 그레이 카펜터
  { bottom: "b1", tops: ["s1","k1","k4","h1","h2","h7","lt3"], outers: ["ow3","ow4"], shoes: ["sh1","sh2","sh3"], mood: ["casual"], season: ["winter"], desc: "겨울 그레이카펜터 캐주얼" },
  { bottom: "b1", tops: ["s1","k1"], outers: ["ow2"], shoes: ["sh5"], mood: ["neat","cool"], season: ["winter"], desc: "크림 옥스포드 + 헤링본블레이저 아이비" },
  { bottom: "b1", tops: ["s3","k1"], outers: ["ow5"], shoes: ["sh5"], mood: ["formal"], season: ["winter"], desc: "겨울 그레이카펜터 롱코트 공식" },
  { bottom: "b1", tops: ["h4","h2","h7"], outers: ["ow1","ow4"], shoes: ["sh1","sh4"], mood: ["casual"], season: ["winter"], desc: "겨울 그레이카펜터 패딩/플리스" },

  // 겨울 — 샌드베이지 카펜터
  { bottom: "b2", tops: ["s2","k2","k5","h2","h5","h6"], outers: ["ow2","ow4"], shoes: ["sh3","sh1"], mood: ["casual","cool"], season: ["winter"], desc: "겨울 샌드베이지 어스톤" },
  { bottom: "b2", tops: ["s1","k1"], outers: ["ow5"], shoes: ["sh5"], mood: ["neat","formal"], season: ["winter"], desc: "겨울 샌드베이지 롱코트 공식" },
  { bottom: "b2", tops: ["h1","h3","h7"], outers: ["ow1","ow4"], shoes: ["sh1","sh4"], mood: ["casual"], season: ["winter"], desc: "겨울 샌드베이지 패딩/플리스" },

  // 겨울 — 연청
  { bottom: "b3", tops: ["s1","s2","k4","k6","h1","h7","lt3"], outers: ["ow3","ow4"], shoes: ["sh1","sh2"], mood: ["casual","neat"], season: ["winter"], desc: "겨울 연청 캐주얼" },
  { bottom: "b3", tops: ["s1","k1"], outers: ["ow2","ow5"], shoes: ["sh5"], mood: ["neat","cool"], season: ["winter"], desc: "겨울 연청 아이비/공식" },
  { bottom: "b3", tops: ["h4","h5","h7"], outers: ["ow1","ow4"], shoes: ["sh1","sh4"], mood: ["casual"], season: ["winter"], desc: "겨울 연청 패딩/플리스" },
  { bottom: "b3", tops: ["k2","k1"], outers: ["ow3"], shoes: ["sh3"], mood: ["cool"], season: ["winter"], desc: "겨울 연청 울니트 + 모직블레이저" },

  // 겨울 — 진청
  { bottom: "b4", tops: ["s1","k1","k2","h4","h5","lt3"], outers: ["ow2","ow3"], shoes: ["sh3","sh1"], mood: ["casual","neat","cool"], season: ["winter"], desc: "겨울 진청 클래식" },
  { bottom: "b4", tops: ["s1","s3"], outers: ["ow5"], shoes: ["sh5"], mood: ["neat","formal"], season: ["winter"], desc: "겨울 진청 롱코트 공식" },
  { bottom: "b4", tops: ["h4","h5","h2"], outers: ["ow1","ow4"], shoes: ["sh1","sh4"], mood: ["casual"], season: ["winter"], desc: "겨울 진청 패딩/플리스" },
  { bottom: "b4", tops: ["k1","s1"], outers: ["ow2"], shoes: ["sh5"], mood: ["cool","formal"], season: ["winter"], desc: "겨울 진청 크리켓니트 + 헤링본 아이비" },
];

// ─── WISHLIST DEFAULT ───────────────────────────────────────────────
export const WISHLIST_DEFAULT: WishItem[] = [
  { id: "w1", name: "코닥 워시드 블랙 반팔티 XL", price: "53,000원", status: "confirmed", note: "등판 CAN MAKE GOOD PICTURES WITH KODAK" },
  { id: "w2", name: "오픈카라 셔츠 (올리브/블랙, 린넨)", status: "summer", note: "빼입기용" },
  { id: "w3", name: "린넨/코튼 워크 셔츠", status: "summer", note: "플랩 포켓, 데님 느낌 가볍게" },
  { id: "w4", name: "카고 크롭 반바지", status: "summer", note: "여름용" },
  { id: "w5", name: "슬램덩크 / 젤다 유니클로 UT", status: "watch", note: "나오면 잡기" },
  { id: "w6", name: "일포드 / 후지필름 콜라보 티", status: "watch", note: "희망사항" },
];
