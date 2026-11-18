#import <Foundation/Foundation.h>
NSDictionary *MiFiReadConfig(void);
BOOL MiFiSaveConfig(NSDictionary *config);
NSString *MiFiNormalizeAddress(NSString *input);
