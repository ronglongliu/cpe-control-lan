from pathlib import Path
import sys,json,os,plistlib,zipfile
from PIL import Image,ImageDraw
R=Path(__file__).parent
if sys.argv[1]=='prepare':
 app=Path(sys.argv[2]);app.mkdir(parents=True,exist_ok=True)
 for size,suf in [(120,'@2x'),(180,'@3x'),(1024,'-Marketing')]:
  im=Image.new('RGB',(size,size),'#0b337f');d=ImageDraw.Draw(im);s=size/100
  for y in range(size):
   q=y/max(size-1,1);d.line((0,y,size,y),fill=(int(24-13*q),int(101-54*q),int(234-95*q)))
  d.rounded_rectangle((18*s,45*s,82*s,78*s),radius=8*s,fill='#f1f7ff')
  d.line((28*s,45*s,24*s,26*s),fill='#f1f7ff',width=max(1,int(4*s)))
  d.line((72*s,45*s,76*s,26*s),fill='#f1f7ff',width=max(1,int(4*s)))
  for x in [29,39,49]:d.ellipse(((x-2)*s,64*s,(x+2)*s,68*s),fill='#1762df')
  d.arc((39*s,16*s,61*s,37*s),195,345,fill='#9cf4df',width=max(1,int(3*s)))
  d.arc((44*s,22*s,56*s,33*s),195,345,fill='#9cf4df',width=max(1,int(3*s)))
  d.ellipse((48*s,29*s,52*s,33*s),fill='#9cf4df')
  im.save(app/('AppIcon60x60'+suf+'.png'))
 info={'CFBundleExecutable':'CPEControl','CFBundleIdentifier':'io.github.ronglongliu.cpecontrol.lan','CFBundleName':'CPEControl','CFBundleDisplayName':'CPE控制','CFBundleShortVersionString':'1.0.1','CFBundleVersion':'22','CFBundlePackageType':'APPL','CFBundleInfoDictionaryVersion':'6.0','CFBundleSupportedPlatforms':['iPhoneOS'],'CFBundleDevelopmentRegion':'zh_CN','MinimumOSVersion':'16.0','LSRequiresIPhoneOS':True,'UIDeviceFamily':[1,2],'UIRequiredDeviceCapabilities':['arm64'],'UILaunchScreen':{},'UISupportedInterfaceOrientations':['UIInterfaceOrientationPortrait'],'NSLocalNetworkUsageDescription':'连接您的烽火 CPE，查看蜂窝信号并调整网络设置。','NSAppTransportSecurity':{'NSAllowsLocalNetworking':True},'CFBundleIcons':{'CFBundlePrimaryIcon':{'CFBundleIconFiles':['AppIcon60x60']}},'CFBundleIconFiles':['AppIcon60x60']}
 (app/'Info.plist').write_bytes(plistlib.dumps(info,fmt=plistlib.FMT_BINARY))
 for name in ['index.html','style.css','app.js','mifi.js','sms.js','locale.js','schema.js','schema.json']:
  if not (R/name).exists():raise SystemExit('Missing web asset: '+name)
  (app/name).write_bytes((R/name).read_bytes())
 # Public builds never embed router addresses, usernames, or passwords.
 # Enter connection details in the app; they are stored locally in Keychain.
else:
 w=Path(sys.argv[2]);out=Path(sys.argv[3])
 with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
  for p in (w/'Payload').rglob('*'):
   if p.is_file():
    n=str(p.relative_to(w));i=zipfile.ZipInfo(n);i.external_attr=(0o755 if p.name=='CPEControl' else 0o600 if p.name in ('Connection.plist','MiFi.plist') else 0o644)<<16;i.compress_type=zipfile.ZIP_DEFLATED;z.writestr(i,p.read_bytes())
 os.chmod(out,0o600)
 with zipfile.ZipFile(out) as z:
  assert z.testzip() is None
  import re,hashlib
  prefix='Payload/CPEControl.app/'
  html=z.read(prefix+'index.html').decode()
  for name in re.findall(r'(?:src|href)="([^"]+)"',html):
   name=name.split('?')[0]
   if not name or '://' in name or name.startswith('#'):continue
   assert prefix+name in z.namelist(), 'Missing referenced asset: '+name
   assert z.read(prefix+name)==(R/name).read_bytes(), 'Stale asset: '+name
  sms=z.read(prefix+'sms.js').decode()
  assert 'SMS.threads=smsPick(payload)' in sms
  assert 'setInterval(' not in sms and 'miNotify' not in sms
  assert 'Array.isArray(d)?d:[]' not in sms
  print('All referenced assets present and match source; SMS object parsing verified; no SMS polling.')
 print('Private CPE package built and ZIP verified:',out.name,out.stat().st_size,'bytes')
