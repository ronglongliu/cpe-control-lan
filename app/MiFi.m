#import "MiFi.h"
#import <CommonCrypto/CommonDigest.h>

static NSError *MErr(NSString *s) {
    return [NSError errorWithDomain:@"MiFi" code:1 userInfo:@{NSLocalizedDescriptionKey: s ?: @"MiFi 请求失败"}];
}

static NSString *SHA256Hex(NSString *s) {
    NSData *d = [s dataUsingEncoding:NSUTF8StringEncoding];
    unsigned char b[CC_SHA256_DIGEST_LENGTH];
    CC_SHA256(d.bytes, (CC_LONG)d.length, b);
    NSMutableString *o = [NSMutableString stringWithCapacity:64];
    for (int i = 0; i < CC_SHA256_DIGEST_LENGTH; i++) [o appendFormat:@"%02X", b[i]];
    return o;
}

static NSString *FormEncode(NSString *value) {
    NSData *data=[value dataUsingEncoding:NSUTF8StringEncoding];const uint8_t *bytes=data.bytes;NSMutableString *out=[NSMutableString stringWithCapacity:data.length];
    for(NSUInteger i=0;i<data.length;i++){uint8_t c=bytes[i];BOOL ok=(c>='A'&&c<='Z')||(c>='a'&&c<='z')||(c>='0'&&c<='9')||c=='-'||c=='_'||c=='.'||c=='~';if(ok)[out appendFormat:@"%c",c];else [out appendFormat:@"%%%02X",c];}
    return out;
}

@implementation MiFi
-(instancetype)initWithAddress:(NSString*)address password:(NSString*)password {
    if ((self = [super init])) {
        _config = @{ @"address": address.length ? address : @"",
                    @"password": password ?: @""};
        [self reset];
    }
    return self;
}
-(void)reset {
    [_session invalidateAndCancel];
    NSURLSessionConfiguration *c = [NSURLSessionConfiguration ephemeralSessionConfiguration];
    c.timeoutIntervalForRequest = 10;
    c.timeoutIntervalForResource = 14;
    c.requestCachePolicy = NSURLRequestReloadIgnoringLocalCacheData;
    c.HTTPShouldSetCookies = YES;
    c.connectionProxyDictionary = @{};
    _session = [NSURLSession sessionWithConfiguration:c];
    _loggedIn = NO;
    _lockSeconds = -1;
}
-(NSData*)raw:(NSURLRequest*)q status:(NSInteger*)status error:(NSError**)e {
    dispatch_semaphore_t sem = dispatch_semaphore_create(0);
    __block NSData *out = nil; __block NSError *ne = nil; __block NSInteger st = 0;
    NSURLSessionDataTask *t = [_session dataTaskWithRequest:q completionHandler:^(NSData*d,NSURLResponse*r,NSError*x){
        out = d; ne = x; st = [r isKindOfClass:NSHTTPURLResponse.class] ? [(NSHTTPURLResponse*)r statusCode] : 0;
        dispatch_semaphore_signal(sem);
    }];
    [t resume];
    if (dispatch_semaphore_wait(sem, dispatch_time(DISPATCH_TIME_NOW, 15*NSEC_PER_SEC))) {
        [t cancel];
        if (e) *e = MErr(@"MiFi 请求超时，请确认手机仍连在 MiFi 的 Wi-Fi");
        return nil;
    }
    if (status) *status = st;
    if (ne) { if (e) *e = MErr(@"无法连接 MiFi，请检查 Wi-Fi 与局域网权限"); return nil; }
    if (st < 200 || st >= 300) { if (e) *e = MErr([NSString stringWithFormat:@"MiFi 返回 HTTP %ld", (long)st]); return nil; }
    return out;
}
-(NSString*)base { return _config[@"address"]; }
-(id)read:(NSArray<NSString*>*)cmd error:(NSError**)e {
    NSString *q = [NSString stringWithFormat:@"%@/goform/goform_get_cmd_process?isTest=false&multi_data=1&cmd=%@&_=%u",
                   [self base], [cmd componentsJoinedByString:@","], arc4random()];
    NSMutableURLRequest *r = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:q]];
    [r setValue:[NSString stringWithFormat:@"%@/index.html", [self base]] forHTTPHeaderField:@"Referer"];
    NSData *d = [self raw:r status:NULL error:e];
    if (!d) return nil;
    id j = [NSJSONSerialization JSONObjectWithData:d options:NSJSONReadingFragmentsAllowed error:nil];
    if (!j) { if (e) *e = MErr(@"MiFi 状态数据格式异常"); return nil; }
    return j;
}
-(NSString*)readCmd:(NSString*)cmd error:(NSError**)e {id r=[self read:@[cmd] error:e];if(!r)return nil;return [r[cmd] isKindOfClass:NSString.class]?r[cmd]:[r[cmd]description];}
-(id)write:(NSString*)goformId fields:(NSDictionary*)fields error:(NSError**)e {
    NSMutableDictionary *payload=[fields mutableCopy]?:[NSMutableDictionary dictionary];
    // PC UI signs every protected write except LOGIN and language selection.
    if(![goformId isEqual:@"LOGIN"]&&![goformId isEqual:@"SET_WEB_LANGUAGE"]){NSString *rd=[self readCmd:@"RD" error:e];if(!rd)return nil;payload[@"AD"]=SHA256Hex([SHA256Hex(@"") stringByAppendingString:rd]);}
    NSMutableString *body = [NSMutableString stringWithFormat:@"isTest=false&goformId=%@", FormEncode(goformId)];
    for (NSString *k in payload) {
        NSString *v = [payload[k] description];
        [body appendFormat:@"&%@=%@", FormEncode(k), FormEncode(v)];
    }
    NSMutableURLRequest *r = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:[NSString stringWithFormat:@"%@/goform/goform_set_cmd_process", [self base]]]];
    r.HTTPMethod = @"POST";
    r.HTTPBody = [body dataUsingEncoding:NSUTF8StringEncoding];
    [r setValue:@"application/x-www-form-urlencoded; charset=UTF-8" forHTTPHeaderField:@"Content-Type"];
    [r setValue:[NSString stringWithFormat:@"%@/index.html", [self base]] forHTTPHeaderField:@"Referer"];
    [r setValue:@"XMLHttpRequest" forHTTPHeaderField:@"X-Requested-With"];
    NSData *d = [self raw:r status:NULL error:e];
    if (!d) return nil;
    id j = [NSJSONSerialization JSONObjectWithData:d options:NSJSONReadingFragmentsAllowed error:nil];
    if (!j) { if (e) *e = MErr(@"MiFi 指令响应格式异常"); return nil; }
    return j;
}
-(BOOL)login:(NSError**)e {
    if (_loggedIn) return YES;
    if (![[_config objectForKey:@"address"] isKindOfClass:NSString.class] || ![[_config objectForKey:@"address"] length]) { if (e) *e = MErr(@"请先在连接设置中填写 MiFi 局域网地址和密码"); return NO; }
    id st = [self read:@[@"loginfo", @"login_lock_time"] error:e];
    if (!st) return NO;
    if ([st[@"loginfo"] isEqual:@"ok"]) { _loggedIn = YES; _lockSeconds = -1; return YES; }
    // login_lock_time is unreliable (stale after a successful login), so never
    // pre-abort on it: the device itself rejects the attempt if truly locked.
    _lockSeconds = -1;
    id ld = [self read:@[@"LD"] error:e];
    if (!ld) return NO;
    NSString *token = [ld[@"LD"] description];
    if (!token.length) token = @"";
    NSString *inner = SHA256Hex(_config[@"password"] ?: @"");
    NSString *pw = SHA256Hex([inner stringByAppendingString:token]);
    id res = [self write:@"LOGIN" fields:@{@"password": pw} error:e];
    if (!res) return NO;
    NSString *result = [res[@"result"] description];
    if (![result isEqual:@"0"] && ![result isEqual:@"4"]) {
        if ([result isEqual:@"5"]) { if (e) *e = MErr(@"MiFi 已有其他管理员登录，请在后台退出后重试"); return NO; }
        if ([result isEqual:@"2"]) { if (e) *e = MErr(@"MiFi 提示另一位用户已登录"); return NO; }
        if ([result isEqual:@"3"]) { id lk=[self read:@[@"login_lock_time"] error:nil]; _lockSeconds=[lk[@"login_lock_time"] integerValue]; if (_lockSeconds>0) { if (e) *e = MErr([NSString stringWithFormat:@"MiFi 密码错误，设备已临时锁定 %ld 秒；为避免继续锁定不再重试", (long)_lockSeconds]); } else { if (e) *e = MErr(@"MiFi 密码错误，已停止重试以防锁定"); } return NO; }
        if (e) *e = MErr(@"MiFi 登录失败（固件拒绝）");
        return NO;
    }
    _loggedIn = YES;
    _lockSeconds = -1;
    return YES;
}
-(NSString*)pendingLoginState { return _lockSeconds > 0 ? [NSString stringWithFormat:@"%ld", (long)_lockSeconds] : @""; }
-(NSArray*)cookies { return _session.configuration.HTTPCookieStorage.cookies ?: @[]; }
@end