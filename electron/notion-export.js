// Personal direct-test connection. Credentials live in the main process for this session.
function pageId(link) {
  const url = new URL(link);
  if (url.protocol !== 'https:' || !/(^|\.)notion\.(so|com|site)$/.test(url.hostname)) throw Error('노션 페이지 링크를 입력하세요.');
  const tail = url.pathname.split('/').filter(Boolean).pop() || '';
  const id = tail.match(/([a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i)?.[1];
  if (!id) throw Error('주소에서 노션 페이지 ID를 찾지 못했어요.');
  return id;
}
function session(provider = fetch) {
  let album = null, busy = false;
  const rich = content => [{type:'text',text:{content}}];
  async function call(token, path, body) {
    const form = body instanceof FormData;
    const res = await provider('https://api.notion.com/v1/'+path,{
      method:body ? 'POST':'GET', redirect:'error', signal:AbortSignal.timeout(30000),
      headers:{Authorization:'Bearer '+token,'Notion-Version':'2026-03-11',...(form?{}:{'Content-Type':'application/json'})},
      body:form ? body : JSON.stringify(body),
    });
    if (!res.ok) throw Error(res.status === 404 ? '페이지를 찾을 수 없어요. 앨범 페이지에 PeeKit 연결을 추가했는지 확인하세요.' :
      res.status === 401 ? '노션 API 토큰을 확인하세요.' : res.status === 403 ? 'PeeKit 연결의 콘텐츠 읽기·삽입 권한을 확인하세요.' : '노션 요청 실패 ('+res.status+')');
    return res.json();
  }
  return async (action, data = {}) => {
    if (action === 'status') return {ok:true,connected:!!album};
    if (busy) return {ok:false,error:'진행 중인 노션 요청이 있어요.'};
    busy = true;
    try {
      if (action === 'clear') { album=null; return {ok:true,connected:false}; }
      if (action === 'connect') {
        const id=pageId(data.link.trim()), token=data.token.trim();
        if (!token) throw Error('노션 API 토큰을 입력하세요.');
        await call(token,'pages/'+id);
        album={id,token}; return {ok:true,connected:true};
      }
      if (!album || action !== 'export') throw Error('설정에서 노션 앨범을 먼저 연결하세요.');
      const text = [data.section, data.text].filter(Boolean).join('\n\n');
      const parts = text.match(/[\s\S]{1,1000}/gu) || [];
      const photos = data.photos || [];
      if (parts.length+photos.length > 100) throw Error('메모를 더 짧게 나눠 주세요.');
      const children=parts.map(s=>({object:'block',type:'paragraph',paragraph:{rich_text:rich(s)}}));
      for (const src of photos) {
        const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(src);
        if (!match) throw Error('첨부 사진 형식을 확인하세요.');
        const name='photo.'+match[1].split('/')[1];
        const file=await call(album.token,'file_uploads',{mode:'single_part',filename:name,content_type:match[1]});
        const form=new FormData();
        form.append('file',new Blob([Buffer.from(match[2],'base64')],{type:match[1]}),name);
        await call(album.token,'file_uploads/'+file.id+'/send',form);
        children.push({object:'block',type:'image',image:{type:'file_upload',file_upload:{id:file.id}}});
      }
      const firstPhoto=children.find(b=>b.type==='image');
      await call(album.token,'pages',{parent:{page_id:album.id},properties:{title:{type:'title',title:rich((data.title || 'PeeKit 메모').slice(0,250))}},
        children,...(firstPhoto?{cover:firstPhoto.image}:{})});
      return {ok:true};
    } catch(e) { return {ok:false,error:e.message,connected:!!album}; }
    finally { busy=false; }
  };
}
module.exports={session,pageId};
