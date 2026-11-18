#import "MiFiConfig.h"
#import <Security/Security.h>
static NSString * const MiFiService=@"io.github.ronglongliu.cpecontrol.lan.mifi.connection";
NSDictionary *MiFiReadConfig(void){
    NSDictionary*q=@{(__bridge id)kSecClass:(__bridge id)kSecClassGenericPassword,(__bridge id)kSecAttrService:MiFiService,(__bridge id)kSecReturnData:@YES};
    CFTypeRef result=NULL;
    if(SecItemCopyMatching((__bridge CFDictionaryRef)q,&result)==errSecSuccess){NSData*d=CFBridgingRelease(result);id config=[NSJSONSerialization JSONObjectWithData:d options:0 error:nil];if([config isKindOfClass:NSDictionary.class]&&[config[@"address"]isKindOfClass:NSString.class]&&[config[@"password"]isKindOfClass:NSString.class])return config;}
    return @{@"address":@"",@"password":@""};
}
BOOL MiFiSaveConfig(NSDictionary*config){
    NSData*d=[NSJSONSerialization dataWithJSONObject:config options:0 error:nil];if(!d)return NO;
    NSDictionary*q=@{(__bridge id)kSecClass:(__bridge id)kSecClassGenericPassword,(__bridge id)kSecAttrService:MiFiService};
    OSStatus status=SecItemUpdate((__bridge CFDictionaryRef)q,(__bridge CFDictionaryRef)@{(__bridge id)kSecValueData:d});
    if(status==errSecItemNotFound){NSMutableDictionary*m=[q mutableCopy];m[(__bridge id)kSecValueData]=d;m[(__bridge id)kSecAttrAccessible]=(__bridge id)kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly;status=SecItemAdd((__bridge CFDictionaryRef)m,NULL);}
    return status==errSecSuccess;
}
NSString *MiFiNormalizeAddress(NSString*input){
    if(![input isKindOfClass:NSString.class])return nil;NSString*text=[input stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
    if(![text containsString:@"://"])text=[@"http://"stringByAppendingString:text];NSURLComponents*c=[NSURLComponents componentsWithString:text];
    if(!c||![@[@"http",@"https"]containsObject:c.scheme.lowercaseString]||c.user.length||c.password.length||c.query||c.fragment||(![c.path isEqual:@""]&&![c.path isEqual:@"/"]))return nil;
    NSString*host=c.host.lowercaseString;if(!host.length)return nil;BOOL valid=[host isEqual:@"localhost"]||[host hasSuffix:@".local"];
    NSArray*parts=[host componentsSeparatedByString:@"."];if(parts.count==4){BOOL numeric=YES;for(NSString*p in parts){if(!p.length||p.length>3||[p rangeOfCharacterFromSet:NSCharacterSet.decimalDigitCharacterSet.invertedSet].location!=NSNotFound||p.integerValue>255){numeric=NO;break;}}
        if(numeric){NSInteger a=[parts[0]integerValue],b=[parts[1]integerValue];valid=a==10||(a==172&&b>=16&&b<=31)||(a==192&&b==168)||a==127;}}
    if(!valid||(c.port&&(c.port.integerValue<1||c.port.integerValue>65535)))return nil;c.scheme=c.scheme.lowercaseString;c.host=host;c.path=@"";return c.string;
}
