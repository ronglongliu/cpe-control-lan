/* Display-only translations. Never alter API values, SSIDs, firmware strings or identifiers. */
window.CPE_ZH=(()=>{
 const exact={
  'china mobile':'中国移动','china unicom':'中国联通','china telecom':'中国电信','china broadnet':'中国广电','china broadcasting network':'中国广电',cmcc:'中国移动',chinamobile:'中国移动',chinamobileltd:'中国移动','chn-cmcc':'中国移动','chn-mobile':'中国移动',unicom:'中国联通','chn-unicom':'中国联通',chinaunicom:'中国联通',chinatelecom:'中国电信','chn-ct':'中国电信',ctcc:'中国电信',broadnet:'中国广电',cbn:'中国广电',
  connected:'已连接',disconnected:'未连接',connecting:'正在连接',disconnecting:'正在断开',unconfigured:'未配置',enabled:'已启用',disabled:'已停用',normal:'正常',debug:'调试',unknown:'未知',available:'可用',unavailable:'不可用',forbidden:'禁止接入',success:'成功',failure:'失败',home:'本地网络',internal:'国内漫游',international:'国际漫游',roaming:'漫游',
  ipv4_ipv6_connected:'IPv4 / IPv6 已连接',ipv4_connected:'IPv4 已连接',ipv6_connected:'IPv6 已连接',ppp_connected:'移动数据已连接',ppp_disconnected:'移动数据未连接',ppp_connecting:'移动数据连接中',ppp_disconnecting:'移动数据断开中',ipv4_ipv6_disconnected:'IPv4 / IPv6 未连接',ipv4_ipv6_connecting:'IPv4 / IPv6 连接中',
  modem_init_complete:'蜂窝模块就绪',modem_sim_undetected:'未检测到 SIM 卡',modem_waitpin:'等待输入 PIN 码',modem_waitpuk:'等待输入 PUK 码',modem_imsi_waitnck:'等待网络解锁码',modem_undetected:'未检测到蜂窝模块',modem_detected:'已检测到蜂窝模块',modem_sim_state:'正在读取 SIM 卡',modem_online:'蜂窝模块在线',modem_offline:'蜂窝模块离线',modem_handover:'正在切换网络',modem_no_service:'无网络服务',modem_imsi_lock:'SIM 卡被锁定',no_service:'无服务',limited_service:'服务受限',limited_service_sa:'5G 服务受限',
  ca_activated:'载波聚合已启用',ca_deactivated:'载波聚合未激活',ca_deconfigured:'未启用载波聚合',ca_configured:'载波聚合已配置',no_ca:'无载波聚合',
  short_mode:'近距离',medium_mode:'标准',long_mode:'远距离',ethernet:'有线连接',wireless:'无线连接',wifi:'无线网络',wlan:'无线网络',usb:'USB 连接','no encryption':'不加密',open:'不加密',none:'无',true:'是',false:'否',automatic:'自动',auto:'自动',dhcp:'自动获取（DHCP）',static:'静态地址',
  manual_select:'手动选网',auto_select:'自动选网',manual_success:'手动选网成功',manual_fail:'手动选网失败',manual_selecting:'正在选网'
 };
 function value(input){if(input===null||input===undefined||input==='')return '—';let text=String(input),key=text.trim().toLowerCase();return exact[key]||text;}
 function carrier(input){if(input===null||input===undefined||input==='')return '运营商未知';const text=String(input).trim(),key=text.toLowerCase();if(exact[key])return exact[key];const compact=key.replace(/[\s_\-]/g,'');return exact[compact]||text;}
 function network(input){const text=String(input||'');const map={SA:'5G 独立组网',ENDC:'5G 非独立组网',NSA:'5G 非独立组网','SA+NSA':'独立 / 非独立自动',LTE:'4G',LTE_CA:'4G+',LTE_A:'4G+','LTE-NSA':'5G 非独立组网',NR:'5G',UMTS:'3G',WCDMA:'3G',HSDPA:'3G',HSUPA:'3G',HSPA:'3G','HSPA+':'3G+',GSM:'2G',GPRS:'2G',EDGE:'2G'};return map[text]||value(text);}
 return {value,carrier,network};
})();
