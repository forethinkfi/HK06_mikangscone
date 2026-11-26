// 기상청 단기예보 격자 (시청 소재지 기준)
const grids = new Map(Object.entries({
  서울:[60,127], 부산:[98,76], 대구:[89,90], 인천:[55,124], 광주:[58,74],
  대전:[67,100], 울산:[102,84], 세종:[66,103], 수원:[60,121], 성남:[63,124],
  고양:[57,128], 용인:[64,119], 부천:[56,125], 안양:[59,123], 안산:[58,121],
  화성:[57,119], 평택:[62,114], 파주:[56,131], 강릉:[92,131], 춘천:[73,134],
  원주:[76,122], 청주:[69,106], 충주:[76,114], 천안:[63,110], 전주:[63,89],
  목포:[50,67], 여수:[73,66], 순천:[74,70], 경주:[100,91], 포항:[102,94],
  창원:[90,77], 김해:[95,77], 진주:[81,75], 제주:[52,38], 서귀포:[52,33],
}));
const stamp = t => new Date(t + 9 * 3600000).toISOString();
const day = t => stamp(t).slice(0,10).replaceAll('-', '');
function sky(pty, cloud) {
  if (pty === 3 || pty === 2) return 71;
  if (pty > 0) return 61;
  return cloud === 4 ? 3 : cloud === 3 ? 2 : 0;
}
function parseForecast(items, obs, now, place) {
  const temps = obs.find(r => r.category === 'T1H')?.obsrValue;
  if (temps == null || !Number.isFinite(Number(temps))) throw Error();
  const pty = Number(obs.find(r => r.category === 'PTY')?.obsrValue || 0);
  function daily(date) {
    const rows = items.filter(r => r.fcstDate === date);
    const values = c => rows.filter(r => r.category === c).map(r => Number(r.fcstValue)).filter(Number.isFinite);
    const temp = values('TMP'), pop = values('POP');
    if (!temp.length || !pop.length) throw Error();
    return { min: values('TMN')[0] ?? Math.min(...temp), max: values('TMX')[0] ?? Math.max(...temp),
      pop: Math.max(...pop), code: sky(Math.max(0,...values('PTY')), Math.max(0,...values('SKY'))) };
  }
  const cloud = items.find(r => r.fcstDate === day(now) && r.fcstTime === stamp(now).slice(11,13)+'00' && r.category === 'SKY');
  return { ok:true, place, source:'기상청', now:{temp:Number(temps),code:sky(pty, Number(cloud?.fcstValue))},
    today:daily(day(now)), tomorrow:daily(day(now+86400000)) };
}
function weatherService(key, provider = fetch) {
  const cache = new Map();
  return async city => {
    if (!key) return {ok:false,error:'운영 서버에 기상청 인증키를 등록해 주세요.'};
    const place = String(city || '서울').trim().replace(/(?:특별자치시|특별자치도|특별시|광역시|시)$/, '');
    const grid = grids.get(place);
    if (!grid) return {ok:false,error:'지원 지역: ' + [...grids.keys()].join(', ')};
    const now = Date.now();
    const existing = cache.get(place);
    if (existing?.until > now) return existing.task;
    async function rows(op, date, time, count) {
      const url = new URL('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/'+op);
      url.search = new URLSearchParams({serviceKey:decodeURIComponent(key.trim()),dataType:'JSON',pageNo:'1',numOfRows:count,
        base_date:date,base_time:time,nx:String(grid[0]),ny:String(grid[1])});
      const response = await provider(url,{signal:AbortSignal.timeout(12000),redirect:'error'});
      if (!response.ok) throw Error();
      const data = (await response.json()).response;
      if (data?.header?.resultCode !== '00' || !Array.isArray(data.body?.items?.item)) throw Error();
      return data.body.items.item;
    }
    // Yesterday's 23:00 release includes both complete KST calendar days.
    const observed = now - 45*60000;
    const task = Promise.all([
      rows('getVilageFcst',day(now-86400000),'2300','1000'),
      rows('getUltraSrtNcst',day(observed),stamp(observed).slice(11,13)+'00','20'),
    ]).then(([forecast,obs]) => parseForecast(forecast,obs,now,place)).catch(() => {
      cache.set(place,{until:Date.now()+30000,task:{ok:false,error:'기상청 자료를 가져오지 못했어요. 잠시 후 다시 확인해 주세요.'}});
      return {ok:false,error:'공공데이터포털 단기예보 인증키와 활용 승인을 확인해 주세요.'};
    });
    cache.set(place,{until:now+600000,task});
    return task;
  };
}
module.exports = { weatherService, parseForecast };
