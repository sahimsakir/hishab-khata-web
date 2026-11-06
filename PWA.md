# HishabKhata mobile app

Production: https://hishab-khata-web.vercel.app

- Android: open in Chrome, then use Install HishabKhata when offered, or the browser menu → Install app / Add to Home Screen.
- iPhone/iPad: open in Safari → Share → Add to Home Screen. Keep Open as Web App enabled if shown, then Add.
- Launch the new home-screen icon for the standalone app. Sign in there if requested; browser and installed-app sessions may be separate.

## Connectivity and privacy

Financial data and authentication responses are never written to service-worker caches. Financial operations require internet access. The worker only precaches public icons, the manifest, and the offline explanation page. An open app shows an offline banner when the browser detects lost connectivity. No transactions are queued offline.

## Updates

The service-worker script is revalidated on launch. New worker versions activate when all existing app windows close; close and reopen the app to apply an update. Bump the worker cache version when changing precached public files. Older HishabKhata installation caches are deleted on activation.

## Verification

Run `npm run build`, `npm test`, and `node scripts/check-pwa.cjs`. Inspect the manifest and service worker in browser developer tools. Real iOS/Android installation requires checking on those devices; desktop browser verification does not replace it.
