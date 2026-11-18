#import <UIKit/UIKit.h>
#import <Foundation/Foundation.h>
// ZTE MiFi (MU5120) adapter: plain form API + Cookie session, SHA256 double hash login.
// Only allow-listed reads/writes; never guesses passwords or retries into a lockout.
@interface MiFi:NSObject
@property NSDictionary *config;
@property NSURLSession *session;
@property BOOL loggedIn;
@property NSInteger lockSeconds;
-(instancetype)initWithAddress:(NSString*)address password:(NSString*)password;
-(void)reset;
// returns a JSON-compatible object or nil with error
-(id)read:(NSArray<NSString*>*)cmd error:(NSError**)e;
-(id)write:(NSString*)goformId fields:(NSDictionary*)fields error:(NSError**)e;
-(BOOL)login:(NSError**)e;
-(NSString*)pendingLoginState;
-(NSArray*)cookies;
@end