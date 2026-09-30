# AGENTS.md — Factory Map (خريطة المصانع)

Style guide for contributors and AI agents working in this repo.

## Toolchain (IMPORTANT)
- **Node.js 22** required (system Node 18 breaks Vite 8). Export:
  `export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:$PATH"`
- Android builds need `export ANDROID_HOME="$HOME/Android/Sdk"` and Java 21.
- Firebase CLI: use `~/setup-firebase/firebase` or `$(which firebase)` (v15+).

## Verify (run before finishing any task)
```bash
npm run lint        # tsc --noEmit — MUST pass
npm run build       # vite build (PWA + precache) — MUST succeed
```
Do NOT run full native builds as a routine gate; CI handles Android/iOS/Desktop.

## Conventions
- **No code comments** unless asked.
- **RTL Arabic first**: all UI strings Arabic, `dir="rtl"`; layout uses safe-area insets.
- **Overlays**: any new modal MUST use `ModalShell` (from `src/components/ModalShell.tsx`) with a unique overlay id registered in `src/lib/overlayBack.ts` semantics (Android back / ESC / focus trap / scroll lock).
- **Map security**: factory/user content inserted into popups MUST be sanitized via `escapeHtml` (src/lib/escapeHtml.ts) or DOM `textContent`. Never concatenate raw user input into HTML strings.
- **Auth**: Google sign-in is hybrid — native (Capacitor) uses redirect flow (`resumeNativeAuth`), web uses popup with redirect fallback. Keep `src/lib/firebase.ts` sync with any auth changes.
- **Admin**: `SUPER_ADMIN_EMAIL = 'mnymjdy897@gmail.com'` in `src/lib/firebase.ts`; also mirrored in `firestore.rules` `isAdmin()`. Keep both in sync.
- **Rules**: any new Firestore collection needs `allow` rules in `firestore.rules` (default-deny at top). Factories MUST remain `status: 'pending'` on create.

## Release protocol
1. Bump `versionCode`/`versionName` in `android/app/build.gradle`, `version` in `package.json` + `src-tauri/tauri.conf.json`, `CFBundleVersion` in `ios/App/App/Info.plist`.
2. `npm run lint && npm run build`
3. Android: `mkdir android/keystore` if missing; `keystore.properties` lives locally (gitignored; template in `android/keystore.properties.example`).
   - `cd android && ./gradlew assembleDebug assembleRelease bundleRelease`
4. Copy artifacts to `release/`, write `release/SHA256SUMS.txt`.
5. Deploy: `npm run deploy:rules` then `npm run deploy:hosting`.
6. Push to `main` → GitHub Actions builds Android (signs from repo secrets), iOS (needs Apple secrets), Desktop (Tauri).
7. Upload `release/*.aab` to Play Console (Internal testing → Production), `.ipa` to App Store / TestFlight, desktop bundles to releases.

## Secrets
- Never commit: `.env*` (real), `android/keystore*.properties`, `*.keystore`, `*.jks`.
- GitHub repo secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `APPLE_CERT_P12`, `APPLE_CERT_PASSWORD`, `APPLE_PROFILE_MOBILEPROVISION`, `APPLE_TEAM_ID`.

## Key facts
- Firebase project: `gen-lang-client-0409964320`; Firestore DB: `ai-studio-b43aca98-7cce-4bbc-aab1-f30f0287b065`.
- Hosting: default site = project id → https://gen-lang-client-0409964320.web.app
- appId/bundle id: `com.factorymap.app` (Android, iOS, Tauri identifier).
- Correct working dir: `/home/wafaa-mohamed-ra/Downloads/factory-map---خريطة-المصانع` (ends with Arabic ع — never replace with Latin `c`).