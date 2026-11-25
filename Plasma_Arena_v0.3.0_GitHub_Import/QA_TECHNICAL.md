# QA טכני — Plasma Arena v0.4.0-dev (Milestone 2)

נבדק ב־25 בנובמבר 2026. בנייה ב־Node 24, Vite 6.4.6, Phaser 3.90.0. בדיקות משחק עם Google Chrome Headless + Playwright (Node).

## Build & Regression

| נושא | סטטוס | ראיה |
|---|---|---|
| typecheck | PASS | `tsc --noEmit` ללא שגיאות מתוך `/tmp/pa-build` (התקנה נקייה מחוץ ל־mount הבעייתי) |
| build + offline HTML | PASS | `npm run build` → `dist/Plasma_Arena.html` (~1.55 MB). הועתק לשורש החבילה. SHA256: `5c894e20ae4b970bdc021caf1e5b76156568fd898135ecda586821000a9baa25` |
| node regression tests | PARTIAL | `tests/regression.test.mjs` דורש `../audit/resolve-ts.mjs` שאינו כלול ב־GitHub import. typecheck + build מחליפים את ליבת ה־check. |
| Python Playwright suite | NOT RUN | pip/proxy ל־playwright נכשל בסביבה (502). בוצע תחליף Node Playwright. |

## Playtests — מקלדת רגילה (בוט מכוון, לא probe מבוקר)

שישה סיבובים (3 לכל זירה). שליטה: Arrow + Space + J (ירי רציף) + החלפת נשק מזדמנת. **לא** ניצחונות מבוקרים.

| זירה | ניסיון | תוצאה | משך (ש׳) | splits | pops | hits | מקורות נזק | maxAlive (נצפה) |
|---|---|---|---|---|---|---|---|---|
| core_chamber | 1 | lose | 14 | 0 | 0 | 3 | plasma | ~1 |
| core_chamber | 2 | lose | 19 | 3 | 2 | 3 | plasma | ~2 |
| core_chamber | 3 | lose | 16 | 2 | 0 | 3 | plasma | ~3 |
| relay_deck | 1 | lose | 18 | 2 | 1 | 3 | plasma / barrier | ~3 |
| relay_deck | 2 | lose | 16 | 2 | 1 | 3 | plasma | ~3 |
| relay_deck | 3 | lose | 18 | 2 | 1 | 3 | plasma / barrier | ~3 |

- כל הסיבובים הסתיימו בהפסד אחרי 3 פגיעות (hull=3), כמו ב־v0.3.0 (שם ~7–23 ש׳).
- התפצלויות ופגיעות נרשמו בפועל; אין קריסות / שגיאות קונסול.
- צפיפות: maxAlive נצפה ≤3; הודעת density לא הופיעה. `maxBodies=20` לא נגע בתקרה בסיבובים אלה.
- iFrame 900 ms: עדיין מאפשר התאוששות; ההפסדים נבעו מפגיעות חוזרות ולא ממצב ללא מוצא.

### מוקשים / יעדים גבוהים ב־Relay Deck
- נצפו targets עם y < 300 (גבוה מעל הפלטפורמות).
- השחקן הצליח לקפוץ (y ירד מתחת ל־420 ואז עלה) ולכוון ליעדים גבוהים.
- נזק מ־`barrier_pulse` נרשם — השחקן מגיע לאזורי השערים.
- אין אירועי telemetry עם id `mine_drift` (getTargets לא מחזיר id), אך המיקום הגבוה והתנהגות drift תואמים למוקשים בגל 2.

### נשקים וסגנונות
- חנית: ירי רציף, cooldown נמוך — סגנון דיוק/קצב.
- רשת: אירועי `net` נרשמו; slow area פעיל — סגנון שליטה/האטה.
- קפיצה מאפשרת התחמקות מכוונת (נצפה עלייה לפלטפורמות).

## השוואה ל־v0.3.0

| מדד | v0.3.0 | v0.4-dev |
|---|---|---|
| מהירות / קפיצה | 300 / −580 | 330 / −640 (snappier) |
| coyote / buffer | 100 / 120 | 140 / 150 |
| iFrame | 1000 | 900 |
| maxBodies | 18 | 20 |
| משך הפסד בוט | ~7–23 ש׳ | ~14–19 ש׳ (דומה) |
| צפיפות בסיבוב קצר | לא נגע בתקרה | לא נגע בתקרה |
| hit feedback | shake בסיסי | shake + particles + knock-up חזק יותר |

הגדלת maxBodies וקיצור iFrame **לא** יצרו מצבים לא הוגנים בסיבובים שנבדקו. הסיבובים עדיין קצרים כי הבוט לא מיומן; יעד 90–180 ש׳ לניצחון נשאר מנחה לבדיקת בעלים אנושית.

## מגבלות / מה לא בוצע

1. **ניצחון אנושי מלא** — הבוט הפסיד בכל 6 הניסיונות. אין מדידת משך סיבוב מנצח אמיתי.
2. **בדיקות Python המקוריות** (browser_qa / gameplay_qa / touch_qa / webgl) — pip ל־playwright נחסם (proxy 502).
3. **מגע פיזי / Safari / Firefox** — לא זמינים בסביבה.
4. **מצב אנרגיה מעמיק** — לא נבדק בנפרד בסיבובים אלה.
5. **node test suite המלא** — חסר `audit/` ב־import.

## שחזור

```sh
cd plasma-arena
# התקנה מומלצת מחוץ ל־bind-mount אם יש בעיית ENOTEMPTY:
cp -a . /tmp/pa-build && cd /tmp/pa-build
npm ci --registry https://registry.npmjs.org
npm run typecheck
npm run build
# HTML: dist/Plasma_Arena.html
```

בדיקות משחק: Playwright Node מול `file://.../Plasma_Arena.html?qa` עם מקלדת אמיתית.

## סיכום Milestone 2

- Build + HTML אופליין תקין.
- 6 playtests רגילים (3+3) תועדו — הפסדים, splits/pops, נזק, צפיפות נמוכה.
- מוקשים/יעדים גבוהים נגישים ב־Relay Deck.
- האיזון החדש לא שבר הוגנות ביחס ל־v0.3.0; משוב ארקיידי חזק יותר.
- דרושה בדיקת בעלים אנושית לניצחונות ולמשך 90–180 ש׳.
