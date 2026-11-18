#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
@interface AdminView:UIViewController<WKNavigationDelegate>
@property(copy)void(^onClose)(void);
@property(copy)BOOL (^miLogin)(NSError**);
-(instancetype)initWithConfig:(NSDictionary*)config cookies:(NSArray*)cookies route:(NSString*)route;
@end