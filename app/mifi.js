window.CPE_ZH=window.CPE_ZH||{value:v=>(v===null||v===undefined||v==='')?'—':String(v),carrier:v=>(v===null||v===undefined||v==='')?'运营商未知':String(v),network:v=>(v===null||v===undefined||v==='')?'—':String(v)};
const MT={coverage:['wifi_coverage'],apSwitch:['wifi_onoff_state','wifi_syncparas_flag','wifi_lbd_enable','wifi_chip1_ssid1_ssid','wifi_chip2_ssid1_ssid','m_SSID','m_ssid_enable','SSID1','AuthMode','HideSSID','MAX_Access_num','EncrypType','WPAPSK1_encode','m_AuthMode','m_HideSSID','m_MAX_Access_num','m_EncrypType','m_WPAPSK1_encode','RadioOff','lan_sec_ssid_control','wifi_access_sta_num'],netSelect:['current_network_mode','m_netselect_save','net_select_mode','m_netselect_contents','net_select','ppp_status','modem_main_state'],net:['network_type','network_provider','ppp_status','signalbar','simcard_roam','wan_ipaddr','modem_main_state'],
battery:['battery_pers','battery_vol_percent','battery_charging','battery_temp'],
speed:['realtime_rx_thrpt','realtime_tx_thrpt','realtime_rx_bytes','realtime_tx_bytes'],
traffic:['monthly_rx_bytes','monthly_tx_bytes','date_month'],
wifi:['wifi_onoff_state','wifi_lbd_enable','wifi_chip1_ssid1_ssid','wifi_chip2_ssid1_ssid','wifi_access_sta_num','lan_ipaddr'],
dev:['imei','imsi','msisdn','sim_iccid','wa_inner_version','hardware_version','mac_address'],
sched:['reboot_schedule_enable','reboot_schedule_mode','reboot_dow','reboot_dod','reboot_hour1','reboot_min1','reboot_hour2','reboot_min2'],
led:['night_mode_switch','night_mode_start_time','night_mode_end_time'],
sel:['m_netselect_status']};
const RAT=[['0','自动'],['2','仅 4G'],['7','仅 5G'],['12','4G/5G 自动']];
const RAT_OF={SA:'7',ENDC:'7','5G':'7',LTE:'2','LTE_CA':'2','LTE_A':'2','4G':'2','UMTS':'2',GSM:'0'};
const DAYS_ZH=['周日','周一','周二','周三','周四','周五','周六'];
let mi={data:null,online:false,busy:false,timer:null,active:false,loginLock:null};
const byId=id=>document.getElementById(id);
const COV={short_mode:'近距离（省电）',medium_mode:'标准',long_mode:'远距离（穿墙）'};
function miFmtBytes(v){let n=Number(v);if(!v||!isFinite(n))return '—';const units=['B','KB','MB','GB','TB'];let k=0;while(n>=1024&&k<4){n/=1024;k++}return n.toFixed(k?2:0)+' '+units[k]}
function miSpeed(v){const n=Number(v);if(v===''||v==null||!isFinite(n))return '—';const bps=n*8;const units=['bps','Kbps','Mbps','Gbps'];let k=0,val=bps;while(val>=1000&&k<3){val/=1000;k++}return val.toFixed(k?2:0)+' '+units[k]}
function miSwitch(on){return `<label class="switch"><input type="checkbox" ${on?'checked':''}><span></span></label>`}
function miControlsRender(){const d=mi.data||{};const online=mi.online&&!mi.busy;
let html=`<div class="control"><div class="label">移动数据<small>${esc(d.ppp_status||'—')}</small></div><label class="switch"><input id="miData" type="checkbox" ${String(d.ppp_status||'').indexOf('connected')>-1?'checked':''} ${online?'':'disabled'}><span></span></label></div>
<div class="control"><div class="label">Wi-Fi 强度<small>${esc(COV[d.wifi_coverage]||"档位未读取")}</small></div><select id="miCov" ${online?"":"disabled"}><option value="short_mode" ${d.wifi_coverage==="short_mode"?"selected":""}>近·省电</option><option value="medium_mode" ${d.wifi_coverage==="medium_mode"?"selected":""}>标准</option><option value="long_mode" ${d.wifi_coverage==="long_mode"?"selected":""}>远·穿墙</option></select></div>
<div class="control wide"><div class="label">网络制式<small>当前 ${esc(d.network_type||'—')}，切换需数秒</small></div><select id="miRat" ${online?'':'disabled'}>${RAT.map(([v,t])=>`<option value="${v}" ${RAT_OF[String(d.network_type)]===v?'selected':''}>${t}</option>`).join('')}</select></div>`;
byId('miControls').innerHTML=html;
if(online){byId('miData').onchange=e=>miToggleData(e.target.checked);byId('miRat').onchange=e=>miSetRat(e.target.value);const cov=byId('miCov');if(cov)cov.onchange=e=>miSetCoverage(e.target.value)}
byId('miRebootBtn').disabled=!online;byId('miScheduleBtn').disabled=!online;byId('miWifiManageBtn').disabled=!online;
}

function miSig(d){const s=Number(d&&d.signalbar);if(!d||!d.signalbar||!isFinite(s))return null;const lvl=Math.max(1,Math.min(5,Math.round(s)));return {lvl,strength:lvl>=4?'good':lvl===3?'fair':lvl===2?'weak':'bad',label:lvl>=4?'强':lvl===3?'中':lvl===2?'弱':'很弱'};}
function miRows(id,pairs){byId(id).innerHTML=pairs.map(([k,v])=>`<div class="row"><span class="key">${esc(k)}</span><span class="value">${esc(v===''||v==null?'—':v)}</span></div>`).join('')}
function miRender(){const d=mi.data||{};const net=d.network_type||'—';miControlsRender();
byId('miTag').textContent=CPE_ZH.network(net)+(d.signalbar?` · ${d.signalbar}/5`:'');
byId('miCarrier').textContent=CPE_ZH.carrier(d.network_provider)+' · '+CPE_ZH.network(net);
byId('miSignalBrief').textContent=[CPE_ZH.value(d.ppp_status),CPE_ZH.value(d.simcard_roam),d.wan_ipaddr].filter(x=>x&&x!=='—').join(' · ');
byId('miDown').textContent=miSpeed(d.realtime_rx_thrpt);byId('miUp').textContent=miSpeed(d.realtime_tx_thrpt);
byId('miSignal').textContent=d.signalbar?d.signalbar+'/5':'—';paintSignal('mi',miSig(d));
byId('miBattery').textContent=(d.battery_vol_percent||'')?d.battery_vol_percent+'%'+(d.battery_charging==='1'?' ⚡':''):'—';
byId('miTemp').textContent=(d.battery_temp||'')?d.battery_temp+' °C':'—';
byId('miModel').textContent='中兴 MU5120';
miRows('miDeviceRows',[['型号',CPE_ZH.value('MU5120')],['固件',d.wa_inner_version],['硬件',d.hardware_version],['IMEI',d.imei],['IMSI',d.imsi],['SIM 卡号',d.sim_iccid],['LAN IP',d.lan_ipaddr],['WAN IP',d.wan_ipaddr]]);
miRows('miCellRows',[['网络制式',CPE_ZH.network(net)],['运营商',CPE_ZH.carrier(d.network_provider)],['信号格',d.signalbar?d.signalbar+'/5':'—'],['数据状态',CPE_ZH.value(d.ppp_status)],['漫游',CPE_ZH.value(d.simcard_roam)],['SIM 状态',CPE_ZH.value(d.modem_main_state)]]);
miRows('miTrafficRows',[['本月下载',miFmtBytes(d.monthly_rx_bytes)],['本月上传',miFmtBytes(d.monthly_tx_bytes)],['累计下载',miFmtBytes(d.realtime_rx_bytes)],['累计上传',miFmtBytes(d.realtime_tx_bytes)],['账期',d.date_month]]);
const hosts=mi.hosts||[];byId('miHostCount').textContent=(d.wifi_access_sta_num||hosts.length||0)+' 台';
byId('miHosts').innerHTML=hosts.length?hosts.map(h=>`<div class="host"><strong>${esc(h.hostName||'未命名设备')}</strong><small>${esc(h.ipAddress||'')}　${esc(h.macAddress||'')}</small></div>`).join(''):`<p>暂无可显示的在线设备</p>`;
byId('miUpdated').textContent='最后更新 '+new Date().toLocaleTimeString('zh-CN',{hour12:false});
}
async function miRefresh(force=false){if(!mi.active)return;if(mi.busy)return;mi.busy=true;try{await bridge('miLogin');const all=[...MT.net,...MT.battery,...MT.speed,...MT.traffic,...MT.wifi,...MT.dev];const d=await bridge('miRead',{cmds:all});if(!d)throw Error('MiFi 返回空状态');mi.data=d;mi.online=true;try{const st=await bridge('miRead',{cmds:['station_list']});mi.hosts=(st&&st.station_list)||[]}catch(e){mi.hosts=[]}mi.busy=false;miRender();setStatusBar('MiFi 已自动登录 · 局域网直连',true,'mifi')}catch(e){mi.online=false;setStatusBar(e.message,false,'mifi')}finally{mi.busy=false;miControlsRender()}}
async function miWrite(label,cmd,fields){mi.busy=true;miControlsRender();try{const r=await bridge('miWrite',{cmd,fields:fields||{}});if(r&&r.result&&r.result!=='success'&&r.result!=='0')throw Error('MiFi 未接受：'+r.result);CPE_record(label,true);toast(label+'，已发送');await new Promise(s=>setTimeout(s,1800));await miRefresh(true)}catch(e){CPE_record(label+'：'+e.message,false);throw e}finally{mi.busy=false}}
async function miToggleData(on){try{await miWrite(on?'恢复移动数据':'断开移动数据',on?'CONNECT_NETWORK':'DISCONNECT_NETWORK')}catch(e){toast(e.message)}}
async function miSetRat(v){try{await miWrite('切换网络制式','SET_NETWORK',{NetworkNumber:'',Rat:v});toast('制式切换需要数秒，稍后刷新确认')}catch(e){toast(e.message)}}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>switchDevice(b.dataset.device));
function switchDevice(dev){window.CPE_activeDevice=dev;document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.device===dev));byId('viewCpe').hidden=dev!=='cpe';byId('viewMiFi').hidden=dev!=='mifi';byId('eyebrow').textContent=dev==='cpe'?'FIBERHOME · LOCAL CONTROL':'ZTE · LOCAL CONTROL';byId('appTitle').textContent=dev==='cpe'?'CPE 控制':'MiFi 控制';localStorage.setItem('cpe-device',dev);
clearInterval(mi.timer);mi.timer=null;mi.active=dev==='mifi';
if(dev==='mifi'){window.CPE_pause&&window.CPE_pause();miRefresh(true);mi.timer=setInterval(()=>miRefresh(),10000);setStatusBar('正在连接 MiFi…',false,'mifi')}
else{window.CPE_resume&&window.CPE_resume()}
}
const miRoutes=[['完整后台','/index.html#home'],['Wi-Fi 设置','/index.html#wifi_main'],['网络设置','/index.html#internet_setting'],['短信','/index.html#sms'],['流量套餐','/index.html#traffic_alert'],['设备信息','/index.html#status/device_info'],['重启计划','/index.html#adm/restart_schedule'],['高级设置','/index.html#adm/others']];document.getElementById('miLinks').innerHTML=miRoutes.map(([t,r])=>`<button data-miroute="${esc(r)}">${esc(t)}</button>`).join('');document.querySelectorAll('[data-miroute]').forEach(b=>b.onclick=()=>bridge('miAdmin',{route:b.dataset.miroute}).catch(e=>toast(e.message)));
byId('miRebootBtn').onclick=async()=>{if(!await confirmDialog('重启 MiFi','MiFi 会断开移动网络与 Wi-Fi，所有通过它上网的设备都会受影响。','立即重启'))return;try{await miWrite('重启 MiFi','REBOOT_DEVICE');toast('重启指令已发送，等待设备重新上线');mi.online=false;miRender()}catch(e){toast(e.message)}};
byId('miScheduleBtn').onclick=async()=>{const d=await bridge('miRead',{cmds:MT.sched});modal('MiFi 定时重启',`<div class="errorbox">由 MiFi 自身执行，退出 APP 仍生效。</div>${frow('启用',`<label class="switch"><input id="miSched" type="checkbox" ${d.reboot_schedule_enable==='1'?'checked':''}><span></span></label>`)}${frow('模式（按周）',`<input id="miDow" value="${esc(d.reboot_dow||'1,2,3,4,5,6,7')}" placeholder="1=周日 … 7=周六">`)}${frow('时间',`<input id="miSchedTime" type="time" value="${esc((d.reboot_hour1||'03').padStart(2,'0')+':'+(d.reboot_min1||'00').padStart(2,'0'))}">`)}<button class="formbtn" id="miSaveSched">保存</button>`);
byId('miSaveSched').onclick=async()=>{const en=byId('miSched').checked,t=byId('miSchedTime').value.split(':'),dow=byId('miDow').value.trim();
const f={reboot_schedule_enable:en?'1':'0'};if(en){f.reboot_schedule_mode='0';f.reboot_dow=dow;f.reboot_hour1=schTimeParts[0];f.reboot_min1=schTimeParts[1]}closeModal();try{await miWrite('定时重启设置','SAVE_TSW',f)}catch(e){toast(e.message)}}};
window.MiFi_diagnostics=()=>({online:mi.online,busy:mi.busy,data:mi.data,hosts:(mi.hosts||[]).length,overflows:[...document.querySelectorAll('main:not([hidden]), .card, .hero, .control')].filter(x=>x.getBoundingClientRect().right>innerWidth+1).length,errors:window.CPE_errors||[]});window.CPE_startOnMiFi=()=>switchDevice('mifi');
window.APP_resume=()=>switchDevice(window.CPE_activeDevice==='mifi'?'mifi':'cpe');
window.APP_pause=()=>{window.CPE_pause();clearInterval(mi.timer);mi.timer=null};
(function(){const last=localStorage.getItem('cpe-device');if(last==='mifi'){switchDevice('mifi');}else{window.CPE_activeDevice='cpe';switchDevice('cpe');}})();
async function miSetCoverage(mode){if(!['short_mode','medium_mode','long_mode'].includes(mode))return;try{await miWrite('Wi-Fi 强度：'+COV[mode],'setWiFiCoverage',{WiFiCoverage:mode});const back=await bridge('miRead',{cmds:['wifi_coverage']});if(back&&String(back.wifi_coverage)!==mode)toast('指令已发送，但设备未回报新档位，请稍后刷新核对');else CPE_record('Wi-Fi 强度已确认',true)}catch(e){toast(e.message)}}
const miwifi=byId('miWifiManageBtn');
if(miwifi)miwifi.onclick=()=>{modal('Wi-Fi 管理',`<p>固件把 SSID、密码、加密方式和双频合一放在官方无线设置页；这里会沿用已登录会话打开，不会改写现有配置。</p><div class="links"><button data-wifiroute="/index.html#wifi_main">无线设置</button><button data-wifiroute="/index.html#station_info">连接设备</button><button data-wifiroute="/index.html#wifi_advance">高级参数</button><button data-wifiroute="/index.html#black_list">MAC 过滤</button></div>`);document.querySelectorAll('[data-wifiroute]').forEach(b=>b.onclick=()=>{const route=b.dataset.wifiroute;closeModal();bridge('miAdmin',{route}).catch(e=>toast(e.message))})};

window.MiFi_configSaved=async result=>{if(!result.changed)return;mi.online=false;mi.data=null;mi.hosts=[];mi.loginLock=null;mi.busy=false;miControlsRender();if(mi.active)await miRefresh(true)};
