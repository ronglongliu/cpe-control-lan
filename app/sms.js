/* CPE SMS: read via get_sms_data, send via send_msg, delete via del_xmlnode. */
const SMS={threads:[],open:null,inFlight:null,entryPending:true,lastAttempt:null,lastSuccess:null,lastError:'',payloadKind:'',sessionKeys:0,loads:0};
function smsEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function smsPick(input){
 let payload=input;
 if(typeof payload==='string'){try{payload=JSON.parse(payload)}catch(e){throw Error('短信接口返回内容无法解析，请刷新重试')}}
 if(!payload||typeof payload!=='object')throw Error('短信接口返回格式不正确');
 if(payload.ERRORSTATUS||payload.error)throw Error('CPE 短信读取失败：'+String(payload.message||payload.error||payload.ERRORSTATUS));
 if(payload.data_2&&typeof payload.data_2==='object')payload=payload.data_2;
 let sessions;
 if(Array.isArray(payload))sessions=payload;
 else if('session_phone' in payload)sessions=[payload];
 else{const keys=Object.keys(payload);const named=keys.filter(k=>/^session_item_\d+$/.test(k));if(keys.length&&!named.length)throw Error('短信接口返回了未识别的结构，未将其误报为空收件箱');sessions=named.map(k=>payload[k])}
 const result=[];
 for(const thread of sessions){if(!thread||typeof thread!=='object')continue;const rows=[];
 for(const key of Object.keys(thread)){if(!/^message_item_\d+$/.test(key))continue;const m=thread[key];if(!m||typeof m!=='object')continue;
 const incoming=m.rcvorsend==='recv';rows.push({dir:incoming?'in':'out',text:String(m.msg_content??''),time:String(m.time??''),idx:String(m.childnode??''),key:String(m.key_index||''),unread:incoming&&String(m.isOpened)==='0'});}
 rows.sort((a,b)=>a.time.localeCompare(b.time));if(rows.length)result.push({phone:String(thread.session_phone??''),rows});}
 return result.sort((a,b)=>b.rows[b.rows.length-1].time.localeCompare(a.rows[a.rows.length-1].time));
}
function smsSummary(){const all=SMS.threads.flatMap(t=>t.rows);return {ok:!SMS.lastError,threads:SMS.threads.length,messages:all.length,received:all.filter(r=>r.dir==='in').length,sent:all.filter(r=>r.dir==='out').length,unread:all.filter(r=>r.unread).length,updated:SMS.lastSuccess}}
function smsFeedback(text,failed=false){const el=$('smsFeedback');if(el){el.textContent=text;el.dataset.error=failed?'1':'0'}}
function smsRender(){const summary=smsSummary();$('smsCount').textContent=summary.messages+' 条'+(summary.unread?' · '+summary.unread+' 未读':'');$('smsCount').dataset.unread=summary.unread?'1':'0';const dot=$('smsDot');if(dot)dot.hidden=!summary.unread;
 $('smsThreads').innerHTML=SMS.threads.length?SMS.threads.map((thread,index)=>{const last=thread.rows[thread.rows.length-1],unread=thread.rows.filter(row=>row.unread).length;return `<div class="smsThread" data-t="${index}"><div class="smsTop"><strong>${smsEsc(thread.phone||'未知号码')}</strong><small>${smsEsc(last.time.slice(0,16))}${unread?' · <b class="dotbadge">'+unread+' 未读</b>':''}</small></div><div class="smsPrev">${smsEsc((last.dir==='out'?'我：':'')+last.text.slice(0,64))}</div></div>`}).join(''):'<p>设备当前没有短信</p>';
 document.querySelectorAll('.smsThread').forEach(el=>el.onclick=()=>smsOpenThread(Number(el.dataset.t)));return summary;
}
async function smsLoad(manual=false){
 if(SMS.inFlight){if(manual)toast('已收到刷新请求，短信正在读取中…');return SMS.inFlight}
 SMS.entryPending=false;SMS.lastAttempt=Date.now();SMS.lastError='';SMS.loads++;const button=$('smsRefresh');button.disabled=true;button.textContent='读取中…';button.setAttribute('aria-busy','true');smsFeedback('正在从 CPE 读取短信…');if(manual)toast('正在刷新短信…');
 SMS.inFlight=(async()=>{try{const payload=await api('get_sms_data',null,'读取短信');SMS.payloadKind=Array.isArray(payload)?'array':typeof payload;SMS.sessionKeys=payload&&typeof payload==='object'?Object.keys(payload).filter(k=>/^session_item_\d+$/.test(k)).length:0;
 SMS.threads=smsPick(payload);SMS.lastSuccess=Date.now();const summary=smsRender();const stamp=new Date(SMS.lastSuccess).toLocaleTimeString('zh-CN',{hour12:false});const text=`已获取 ${summary.messages} 条短信（收件 ${summary.received}、发件 ${summary.sent}${summary.unread?'，未读 '+summary.unread:''}） · ${stamp}`;smsFeedback(text);if(manual)toast(text);return summary;
 }catch(e){SMS.lastError=e.message||String(e);$('smsCount').textContent='读取失败';smsFeedback('读取失败：'+SMS.lastError,true);if(manual)toast('短信刷新失败：'+SMS.lastError);return {ok:false,error:SMS.lastError};
 }finally{SMS.inFlight=null;button.disabled=false;button.textContent='刷新短信';button.setAttribute('aria-busy','false')}})();return SMS.inFlight;
}
window.CPE_afterRefresh=()=>SMS.entryPending?smsLoad(false):null;
window.SMS_prepareEntry=()=>{SMS.entryPending=true};
window.SMS_diagnostics=()=>({...smsSummary(),busy:!!SMS.inFlight,lastAttempt:SMS.lastAttempt,lastSuccess:SMS.lastSuccess,lastError:SMS.lastError,payloadKind:SMS.payloadKind,sessionKeys:SMS.sessionKeys,loads:SMS.loads,renderedThreads:document.querySelectorAll('#smsThreads .smsThread').length,countText:$('smsCount')?.textContent,feedback:$('smsFeedback')?.textContent,polling:false,open:!!SMS.open,errors:window.CPE_errors||[]});

function smsOpenThread(i){
 if(SMS.opening)return;SMS.opening=true;setTimeout(()=>SMS.opening=false,400);const t=SMS.threads[i];if(!t)return;SMS.open=t.phone;
 modal('短信 · '+t.phone,`<div class="smsMsgs">${t.rows.map(r=>`<div class="smsMsg ${r.dir}"><div>${smsEsc(r.text).replace(/\n/g,'<br>')}</div><small>${smsEsc(r.time)}${r.dir==='out'?' · 已发送':''}</small>${/^[1-9]\d*$/.test(r.idx)?`<button class="smsDel" data-idx="${smsEsc(r.idx)}" data-dir="${r.dir}" data-key="${smsEsc(r.key)}" aria-label="${r.dir==='out'?'删除已发送短信':'删除收件短信'}">删除</button>`:''}</div>`).join('')}</div><button class="formbtn" id="smsReply">回复此号码</button>`);document.querySelectorAll('.smsDel').forEach(b=>b.onclick=()=>smsDeleteMessage(t,{idx:b.dataset.idx,dir:b.dataset.dir,key:b.dataset.key},b));$('smsReply').onclick=()=>smsCompose(t.phone)}
async function smsDeleteMessage(thread,message,button){
 const kind=message.dir==='out'?'已发送短信':'收到的短信';
 if(SMS.deleting){toast('正在删除上一条短信，请稍候…');return}
 if(!await confirmDialog('删除'+kind,'将从 CPE 中永久删除这条'+kind+'。删除已发送记录不会撤回对方收到的内容。','删除'))return;
 SMS.deleting=true;if(button){button.disabled=true;button.textContent='删除中…'}toast('正在删除'+kind+'…');
 try{const result=await bridge('smsDelete',{data:{direction:message.dir==='out'?'send':'recv',index:message.idx,key:message.key,phone:thread.phone}});if(!result?.ok)throw Error('设备未确认删除');
 const loaded=await smsLoad(false);if(!loaded?.ok)throw Error('删除指令已执行，但无法刷新确认：'+(loaded?.error||'读取失败'));
 const remains=SMS.threads.some(t=>t.phone===thread.phone&&t.rows.some(r=>r.dir===message.dir&&(message.key?r.key===message.key:r.idx===message.idx)));
 if(remains)throw Error('刷新后该记录仍存在，请稍后核对，未标记删除成功');
 record('删除'+kind,true);toast(kind+'已删除');closeModal();SMS.open=null;
 }catch(e){record('删除'+kind+'失败',false);toast('删除未完成：'+e.message)}finally{SMS.deleting=false;if(button){button.disabled=false;button.textContent='删除'}}
}
function smsCompose(phone=''){modal('新建短信',`${frow('收件号码',`<input id="smsTo" inputmode="tel" value="${smsEsc(phone)}" placeholder="手机号">`)}${frow('短信内容',`<textarea id="smsBody" rows="4" maxlength="500" style="width:100%;border:1px solid var(--line);background:var(--field);color:var(--text);padding:12px;border-radius:10px;font:inherit" placeholder="最多 500 字"></textarea>`)}<p class="small">通过 CPE 的 SIM 卡发送；简体中文将使用 UCS2 编码。</p><button class="formbtn" id="smsSend">发送</button>`);$('smsSend').onclick=async()=>{const to=$('smsTo').value.trim(),body=$('smsBody').value;if(!/^\+?\d{5,20}$/.test(to.replace(/[\s-]/g,''))){toast('请输入有效号码');return}if(!body.trim()){toast('短信内容不能为空');return}const btn=$('smsSend');btn.disabled=true;btn.textContent='发送中…';try{const enc=[...body].some(ch=>ch.charCodeAt(0)>=1000)?'GSM_UCS2':'GSM_8BIT';const r=await api('send_msg',{recv_number:to.replace(/[\s-]/g,''),encode_schema:enc,content:body},'发送短信');const ok=r&&(r.result===0||r.result==='0'||r.result==='');if(!ok)throw Error('CPE 未接受发送：'+JSON.stringify(r).slice(0,80));record('发送短信',true);toast('短信已发送');closeModal();await smsLoad(true)}catch(e){record('发送短信失败',false);toast(e.message)}finally{btn.disabled=false;btn.textContent='发送'}}}
$('smsCompose').onclick=()=>smsCompose();
$('smsRefresh').onclick=()=>smsLoad(true);
// Expanding the SMS card changes presentation only; it never starts a request.
