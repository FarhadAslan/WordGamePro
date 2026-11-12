# Söz Tap 🔤

Azərbaycan dilində professional Wordle oyunu.  
Vite + Vanilla JS + PWA (Progressive Web App)

---

## Tez Başlanğıc

```bash
npm install
npm run dev          # localhost:5173
npm run build        # dist/ qovluğu yaradılır (Vercel üçün)
npm run build:dict   # Lüğəti yenilə (şəbəkə lazımdır)
```

---

## Layihə Strukturu

```
soztap/
├── index.html
├── vite.config.js
├── capacitor.config.json
├── vitest.config.js
├── src/
│   ├── main.js              # Giriş nöqtəsi
│   ├── game/
│   │   ├── dict.js          # Lüğət yükləmə
│   │   ├── evaluate.js      # Hərflərin qiymətləndirilməsi
│   │   ├── state.js         # Oyun vəziyyəti
│   │   ├── daily.js         # Günün sözü / Bakı vaxtı
│   │   └── evaluate.test.js # Unit testlər
│   ├── ui/
│   │   ├── board.js         # Lövhə UI
│   │   ├── keyboard.js      # Klaviatura UI
│   │   ├── hints-ui.js      # İpucu UI
│   │   ├── screens.js       # Ekran/Modal idarəsi
│   │   ├── toast.js         # Toast bildirişlər
│   │   └── confetti.js      # Konfeti
│   ├── data/
│   │   ├── alphabet.js      # AZ əlifba + köməkçi funksiyalar
│   │   ├── economy.js       # Xal balans konfiqurasiyası
│   │   ├── words-fallback.js# Ehtiyat söz siyahısı
│   │   └── reward-provider.js# Rewarded reklam interfeysi (boş)
│   ├── storage/
│   │   └── store.js         # localStorage / Capacitor Preferences
│   ├── audio/
│   │   ├── sounds.js        # Səs effektləri
│   │   └── haptics.js       # Vibrasiya
│   └── styles/
│       └── main.css         # Tam CSS (dizayn tokenləri)
├── public/
│   ├── dict/
│   │   ├── answers5.txt     # Gizli söz siyahısı (build:dict ilə yaradılır)
│   │   └── words5.valid.txt # Lüğət yoxlaması üçün tam siyahı
│   ├── fonts/               # NotoSans-Regular.woff2, NotoSans-Bold.woff2
│   └── icons/               # icon-192.png, icon-512.png, icon-512-maskable.png
├── tools/
│   ├── build-dict.mjs       # Lüğət yaratma skripti
│   └── dict-report.txt      # Lüğət statistikası (build:dict ilə yaradılır)
├── data/
│   ├── blocklist.txt        # Bloklanan sözlər (əl ilə redaktə)
│   └── allowlist.txt        # İcazəli sözlər (əl ilə redaktə)
├── android/                 # Capacitor Android layihəsi (cap add android sonrası)
└── android-setup/           # Əlavə Android konfiqurasiya qeydləri
```

---

## Lüğəti Yeniləmə

```bash
npm run build:dict
```

Bu skript aşağıdakı mənbələrdən söz yığır:

| Mənbə | Lisenziya | URL |
|-------|-----------|-----|
| Mozilla AZ Hunspell | MPL-2.0 | [github.com/mozillaz/spellchecker](https://github.com/mozillaz/spellchecker) |
| AOSP Azerbaijani Wordlist | CC BY-SA 4.0 | [github.com/subhangadirli/aosp-dict-az](https://github.com/subhangadirli/aosp-dict-az) |
| AzTC Tezlik Korpusu | CC BY 4.0 | [HuggingFace: LocalDoc/azerbaijani_words_frequency](https://huggingface.co/datasets/LocalDoc/azerbaijani_words_frequency) |

Şəbəkə olmadıqda ehtiyat siyahı (`src/data/words-fallback.js`) istifadə edilir.

### Söz əlavə/çıxarmaq

- **Əl ilə bloklamaq**: `data/blocklist.txt` faylına sözü kiçik hərflə əlavə edin, sonra `npm run build:dict`
- **Məcburi əlavə**: `data/allowlist.txt` faylına əlavə edin

---

## İqtisadi Balansı Dəyişmək

`src/data/economy.js` faylını açın:

```js
export const ECONOMY = {
  startingCoins: 100,          // Başlanğıc balansı
  winCoins: [100,80,60,45,30,20], // 1-6-cı cəhddə qazanma
  hints: {
    reveal: { cost: 40, maxPerGame: 2 },
    // ...
  }
};
```

---

## APK Yaratmaq

### Tələblər
- **JDK 17+** — [adoptium.net](https://adoptium.net)
- **Android Studio** — [developer.android.com/studio](https://developer.android.com/studio)  
  (Android SDK, platform-tools, build-tools avtomatik quraşdırılır)
- **Node.js 18+**

### Addım-addım

```bash
# 1. Asılılıqları yüklə
npm install

# 2. Lüğəti yarat (şəbəkə varsa)
npm run build:dict

# 3. Şriftləri public/fonts/ qovluğuna əlavə edin:
#    NotoSans-Regular.woff2
#    NotoSans-Bold.woff2
#    Yükləmə: https://fonts.google.com/noto/specimen/Noto+Sans
#    (Download family → NotoSans-Regular.ttf → woff2 konvertasiya)
#    Konvertor: https://cloudconvert.com/ttf-to-woff2

# 4. İkonları public/icons/ qovluğuna əlavə edin:
#    icon-192.png, icon-512.png, icon-512-maskable.png
#    Sadə generator: https://maskable.app

# 5. Web layihəsini yarat
npm run build

# 6. Android layihəsini əlavə et (ilk dəfə)
npx cap add android

# 7. Sync et
npx cap sync android

# 8. Debug APK yarat
cd android
./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk

# 9. Android Studio ilə aç (cihaza quraşdırma üçün)
cd ..
npx cap open android
```

### Release APK (İmzalı)

```bash
# 1. Keystore yarat (bir dəfə)
keytool -genkey -v -keystore soztap.keystore \
  -alias soztap -keyalg RSA -keysize 2048 -validity 10000

# 2. Parolları mühit dəyişənlərinə yaz (kodda saxlama!)
#    Windows PowerShell:
$env:KEYSTORE_PASSWORD = "sizin_parolunuz"
$env:KEY_PASSWORD = "sizin_açar_parolunuz"

# 3. android/app/build.gradle faylında signingConfigs əlavə edin:
# signingConfigs {
#   release {
#     storeFile file(System.getenv("KEYSTORE_PATH") ?: "../../soztap.keystore")
#     storePassword System.getenv("KEYSTORE_PASSWORD")
#     keyAlias "soztap"
#     keyPassword System.getenv("KEY_PASSWORD")
#   }
# }

# 4. Release APK yarat
cd android
./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk

# 5. Google Play üçün AAB (tövsiyə edilir)
./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

> ⚠️ **Keystore faylını** (soztap.keystore) heç vaxt git-ə commit etməyin.  
> `.gitignore`-a əlavə edin: `*.keystore`

### PWABuilder / TWA Alternativ (Android Studio olmadan)

Əgər Android Studio quraşdırmaq istəmirsinizsə:
1. `npm run build` → `dist/` qovluğunu public serverə yükləyin
2. [PWABuilder.com](https://www.pwabuilder.com) saytına gedin
3. Saytınızın URL-ni daxil edin → "Build My PWA" → Android APK endirin  
   Bu yol daha sadədir amma Capacitor native plugin-ləri (haptics, notifications) işləməyəcək.

---

## Əlçatanlıq (Accessibility)

- ARIA etiketləri: `role="gridcell"`, `aria-label="2-ci sətir, 3-cü xana, A, düzgün"`
- `aria-live="polite"` — toast bildirişləri ekran oxuyuculara çatdırılır
- Kontrast ≥ 4.5:1 (normal), 3:1 (iri mətn)
- Yüksək kontrast rejimi (narıncı/mavi) — Ayarlar-dan
- `prefers-reduced-motion` — animasiyalar söndürülür

---

## Yoxlama Siyahısı

### Avtomatik (npm test)
- [x] `azUpper('ışıq') === 'IŞIQ'`
- [x] `azUpper('iki') === 'İKİ'`
- [x] `evaluate('ALAQA','BALIQ')` çoxlu hərf
- [x] `evaluate('ŞƏKƏR','ŞƏKƏR')` tam uyğun
- [x] `strLen('NƏFƏS') === 5`

### Əl ilə Yoxlanmalı Ssenarilər
1. **Oflayn rejim**: internet bağlantısını kəs, oyunu aç → ehtiyat söz siyahısı işləsin
2. **Gecəyarısı keçidi**: telefon saatını gecəyarısı +1 dəq sonrasına təyin et, tətbiqi arxa plandan qaytar → yeni söz gəlsin
3. **Tətbibi bağlayıb açma**: söz yazarkən (3 hərf), tətbiqi bağla, aç → həmin hərflər qalsın
4. **İpucu xərcləmə**: 40 xal xərclə, bağla, aç → xal azalmış olsun, ipucu ikinci dəfə pulsuzu tətbiq olunmasın
5. **Android Back düyməsi**: modal açıq ikən Back → modal bağlansın; ana ekranda Back → çıxış soruşulsun
6. **Landscape rejimi**: telefonu döndər → oyun istifadə edilə bilsin
7. **Şrift testi**: Ə ə İ ı Ğ ğ Ş ş Ç ç Ö ö Ü ü hərflərinin hamısı düzgün göstərilsin
8. **Paylaşma**: Nəticəni paylaş → Capacitor Share açılsın, brauzerdə clipboard-a kopyalansın

---

## Fərziyyələr

1. **Şrift faylları**: NotoSans-Regular.woff2 / Bold.woff2 əl ilə `public/fonts/` qovluğuna yerləşdirilməlidir (lisenziya uyğunluğu üçün avtomatik yüklənmir).
2. **İkon faylları**: PNG ikonlar `public/icons/` qovluğuna əl ilə əlavə edilməlidir.
3. **Lüğət**: `npm run build:dict` şəbəkə tələb edir; oflayn işlədildikdə `words-fallback.js` istifadə edilir.
4. **JDK/Android Studio**: İstifadəçi maşınında quraşdırılmalıdır. Layihə hazır — yalnız `gradlew assembleDebug` kifayətdir.
5. **`state.js`-dəki `eliminate` hint**: `require()` ES module-da işləmir — bu `import()` ilə düzəldilməlidir (aşağıya bax).

> **Kritik Düzəliş**: `state.js`-in `_applyHint('eliminate')` metodunda `require('../data/alphabet.js')` var — bu ES module-da işləmir. Capacitor build-dan əvvəl bu sətiri `import { AZ_ALPHABET } from '../data/alphabet.js'` ilə əvəzləyin (faylın başında statik import).

---

## Lisenziyalar

Söz Tap özü MIT lisenziyası altındadır.  
Lüğət mənbələrinin lisenziyaları "Haqqında" ekranında göstərilir.

| Mənbə | Lisenziya |
|-------|-----------|
| Mozilla AZ Hunspell | MPL-2.0 |
| AOSP az_wordlist | CC BY-SA 4.0 |
| AzTC Korpusu | CC BY 4.0 |
| Noto Sans | SIL OFL 1.1 |
