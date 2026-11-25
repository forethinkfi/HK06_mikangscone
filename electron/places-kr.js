// 자주 쓰는 한국 지명 → 좌표. 짧은 한글 지명은 좌표 검색 서비스가 잘 못 찾는 경우가 있어서 앱에 직접 넣어 둔다.
// [한글 이름, 위도, 경도, 영문 이름(IP 위치 결과를 한글로 바꿀 때 사용)]
const PLACES = [
  ['서울', 37.5665, 126.978, 'Seoul'], ['부산', 35.1796, 129.0756, 'Busan'], ['대구', 35.8714, 128.6014, 'Daegu'],
  ['인천', 37.4563, 126.7052, 'Incheon'], ['광주', 35.1595, 126.8526, 'Gwangju'], ['대전', 36.3504, 127.3845, 'Daejeon'],
  ['울산', 35.5384, 129.3114, 'Ulsan'], ['세종', 36.48, 127.289, 'Sejong'], ['제주', 33.4996, 126.5312, 'Jeju'],
  ['서귀포', 33.2541, 126.56, 'Seogwipo'], ['수원', 37.2636, 127.0286, 'Suwon'], ['성남', 37.42, 127.1265, 'Seongnam'],
  ['분당', 37.3826, 127.1192, 'Bundang'], ['판교', 37.3947, 127.1112, 'Pangyo'], ['용인', 37.2411, 127.1776, 'Yongin'],
  ['고양', 37.6584, 126.832, 'Goyang'], ['일산', 37.6764, 126.7727, 'Ilsan'], ['부천', 37.5034, 126.766, 'Bucheon'],
  ['안양', 37.3943, 126.9568, 'Anyang'], ['화성', 37.1995, 126.831, 'Hwaseong'], ['평택', 36.9921, 127.1129, 'Pyeongtaek'],
  ['의정부', 37.7381, 127.0337, 'Uijeongbu'], ['남양주', 37.636, 127.2165, 'Namyangju'], ['김포', 37.6153, 126.7156, 'Gimpo'],
  ['파주', 37.76, 126.78, 'Paju'], ['하남', 37.5393, 127.2148, 'Hanam'], ['광명', 37.4786, 126.8646, 'Gwangmyeong'],
  ['시흥', 37.38, 126.8029, 'Siheung'], ['안산', 37.3219, 126.8309, 'Ansan'], ['군포', 37.3616, 126.9352, 'Gunpo'],
  ['과천', 37.4292, 126.9876, 'Gwacheon'], ['구리', 37.5943, 127.1296, 'Guri'], ['오산', 37.1499, 127.0774, 'Osan'],
  ['이천', 37.2723, 127.435, 'Icheon'], ['춘천', 37.8813, 127.7298, 'Chuncheon'], ['원주', 37.3422, 127.9202, 'Wonju'],
  ['강릉', 37.7519, 128.8761, 'Gangneung'], ['속초', 38.207, 128.5918, 'Sokcho'], ['청주', 36.6424, 127.489, 'Cheongju'],
  ['충주', 36.991, 127.9259, 'Chungju'], ['천안', 36.8151, 127.1139, 'Cheonan'], ['아산', 36.7898, 127.0019, 'Asan'],
  ['전주', 35.8242, 127.148, 'Jeonju'], ['군산', 35.9676, 126.7366, 'Gunsan'], ['익산', 35.9483, 126.9577, 'Iksan'],
  ['목포', 34.8118, 126.3922, 'Mokpo'], ['여수', 34.7604, 127.6622, 'Yeosu'], ['순천', 34.9507, 127.4872, 'Suncheon'],
  ['포항', 36.019, 129.3435, 'Pohang'], ['경주', 35.8562, 129.2247, 'Gyeongju'], ['구미', 36.1195, 128.3446, 'Gumi'],
  ['안동', 36.5684, 128.7294, 'Andong'], ['창원', 35.228, 128.6811, 'Changwon'], ['김해', 35.2285, 128.8894, 'Gimhae'],
  ['진주', 35.18, 128.1076, 'Jinju'], ['거제', 34.8806, 128.6211, 'Geoje'], ['통영', 34.8544, 128.4332, 'Tongyeong'],
  ['양산', 35.335, 129.0372, 'Yangsan'],
  // 도 이름 → 도청 근처
  ['경기', 37.2752, 127.0095, 'Gyeonggi-do'], ['강원', 37.8854, 127.7298, 'Gangwon-do'], ['충북', 36.6357, 127.4917, 'Chungcheongbuk-do'],
  ['충남', 36.6588, 126.6728, 'Chungcheongnam-do'], ['전북', 35.8203, 127.1088, 'Jeollabuk-do'], ['전남', 34.8161, 126.4629, 'Jeollanam-do'],
  ['경북', 36.576, 128.5056, 'Gyeongsangbuk-do'], ['경남', 35.2383, 128.6925, 'Gyeongsangnam-do'],
  // 서울 25개 구
  ['강남구', 37.5172, 127.0473, 'Gangnam-gu'], ['강동구', 37.5301, 127.1238, 'Gangdong-gu'], ['강북구', 37.6396, 127.0257, 'Gangbuk-gu'],
  ['강서구', 37.5509, 126.8495, 'Gangseo-gu'], ['관악구', 37.4784, 126.9516, 'Gwanak-gu'], ['광진구', 37.5385, 127.0823, 'Gwangjin-gu'],
  ['구로구', 37.4954, 126.8874, 'Guro-gu'], ['금천구', 37.4569, 126.8955, 'Geumcheon-gu'], ['노원구', 37.6542, 127.0568, 'Nowon-gu'],
  ['도봉구', 37.6688, 127.0471, 'Dobong-gu'], ['동대문구', 37.5744, 127.04, 'Dongdaemun-gu'], ['동작구', 37.5124, 126.9393, 'Dongjak-gu'],
  ['마포구', 37.5663, 126.9019, 'Mapo-gu'], ['서대문구', 37.5791, 126.9368, 'Seodaemun-gu'], ['서초구', 37.4837, 127.0324, 'Seocho-gu'],
  ['성동구', 37.5633, 127.0371, 'Seongdong-gu'], ['성북구', 37.5894, 127.0167, 'Seongbuk-gu'], ['송파구', 37.5145, 127.1059, 'Songpa-gu'],
  ['양천구', 37.517, 126.8665, 'Yangcheon-gu'], ['영등포구', 37.5264, 126.8962, 'Yeongdeungpo-gu'], ['용산구', 37.5324, 126.99, 'Yongsan-gu'],
  ['은평구', 37.6027, 126.9291, 'Eunpyeong-gu'], ['종로구', 37.5735, 126.979, 'Jongno-gu'], ['중구', 37.5641, 126.9979, 'Jung-gu'],
  ['중랑구', 37.6066, 127.0927, 'Jungnang-gu'],
  // 많이 말하는 동네
  ['강남', 37.4979, 127.0276, 'Gangnam'], ['강남역', 37.4979, 127.0276, ''], ['홍대', 37.5563, 126.922, 'Hongdae'], ['여의도', 37.5219, 126.9245, 'Yeouido'],
  ['잠실', 37.5133, 127.1001, 'Jamsil'], ['명동', 37.5636, 126.9869, 'Myeongdong'], ['신촌', 37.5551, 126.9368, 'Sinchon'],
  ['이태원', 37.5345, 126.9946, 'Itaewon'], ['성수', 37.5446, 127.0557, 'Seongsu'], ['광화문', 37.5759, 126.9768, 'Gwanghwamun'],
  ['해운대', 35.1631, 129.1635, 'Haeundae'], ['서면', 35.1578, 129.0597, 'Seomyeon'], ['동탄', 37.2006, 127.0732, 'Dongtan'],
];

const byKo = new Map(PLACES.map(([ko, lat, lon, en]) => [ko, { name: ko, lat, lon, en }]));
const byEnExact = new Map(PLACES.filter((p) => p[3]).map(([ko, , , en]) => [en.toLowerCase(), ko]));
const byEn = new Map();
for (const [ko, , , en] of PLACES) { if (!en) continue; const k = en.toLowerCase().replace(/-(gu|si|do|gun)$/, ''); if (!byEn.has(k)) byEn.set(k, ko); }
const SUFFIX = /(특별자치시|특별자치도|특별시|광역시|시청|시|군|도)$/;

/** 한글 지명 찾기. "서울 강남구"처럼 여러 단어면 가장 자세한 것을 쓰고 이름은 합쳐서 보여준다. */
function findKo(query) {
  const words = String(query || '').trim().split(/\s+/).filter(Boolean);
  const hits = [];
  for (const w of words) {
    const p = byKo.get(w) || byKo.get(w.replace(SUFFIX, '')) || (w.endsWith('도') ? byKo.get(w.replace(/(특별자치)?도$/, '')) : null);
    if (p) hits.push(p);
  }
  if (!hits.length) return null;
  const best = hits[hits.length - 1];
  return { ...best, name: hits.map((h) => h.name).join(' ') };
}
/** IP 위치 결과의 영문 지명을 한글로 (없으면 영문 그대로) */
function koName(en) {
  if (!en) return '';
  const low = String(en).toLowerCase().trim();
  return byEnExact.get(low) || byEn.get(low.replace(/-(gu|si|do|gun)$/, '').replace(/ (city|province)$/, '')) || en;
}

/** 좌표에서 가장 가까운 지명 (주소 서비스가 안 될 때 이름 붙이기용, 20km 이내) */
function nearest(lat, lon) {
  let best = null, bd = Infinity;
  for (const [ko, la, lo] of PLACES) {
    const d = Math.hypot((la - lat) * 111, (lo - lon) * 88);
    if (d < bd) { bd = d; best = ko; }
  }
  return bd <= 20 ? best : null;
}

module.exports = { findKo, koName, nearest };
