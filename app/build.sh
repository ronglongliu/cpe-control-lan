#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SDK=${IOS_SDK:-$HOME/.ios-sdk/iPhoneOS16.5.sdk}
SIGNER=${IOS_SIGNER:-ldid}
W=$(mktemp -d "${TMPDIR:-/tmp}/cpe-control-build.XXXXXX")
trap 'rm -rf "$W"' EXIT
APP="$W/Payload/CPEControl.app"
mkdir -p "$APP"
python3 "$ROOT/package.py" prepare "$APP"
for f in "$ROOT"/*.m; do
 clang -target arm64-apple-ios16.0 -isysroot "$SDK" -F"$SDK/System/Library/Frameworks" -fobjc-arc -O2 -Wall -Wextra -Wno-unused-parameter -c "$f" -o "$W/$(basename "$f" .m).o"
done
clang -target arm64-apple-ios16.0 -isysroot "$SDK" -fuse-ld=lld -F"$SDK/System/Library/Frameworks" -framework UIKit -framework Foundation -framework WebKit -framework Security -framework CoreGraphics -framework UserNotifications "$W"/*.o -o "$APP/CPEControl"
"$SIGNER" -S"$ROOT/entitlements.plist" "$APP/CPEControl"
python3 "$ROOT/package.py" pack "$W" "${OUTPUT_TIPA:-$ROOT/../CPEControl.tipa}"
