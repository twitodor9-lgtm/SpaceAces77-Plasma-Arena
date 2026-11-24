# Plasma Arena — ביקורת סטטית

## מקור
11 ZIP נבדקו לתקינות ארכיון. שני ZIP של plasma-arena זהים ברמת שמות ותוכן; גם שני ZIP של src של מעטפת Grok זהים. המקור העצמאי הוא plasma-arena ולא מעטפת TanStack/React/auth/DB. לא נכללו תשתיות המעטפת שאינן דרושות למשחק; המניפסט מזהה את כל הקלטים. קובצי package של המעטפת נשמרו כראיה בלבד; אינם lockfile תואם למשחק.

## ממצאים לפי עדיפות
- P0: `package.json` מפנה ל-`scripts/inline-dist.mjs` ול-`tests/*.ts` שאינם קיימים. אין dist ואין lockfile ייעודי. להשלים ולבדוק offline אמיתי.
- P1: `core/content.ts` מייבא במפורש שתי זירות; הוספת קובץ זירה שלישי בלבד לא תטען אותו. להשתמש ב-import.meta.glob או מניפסט JSON עם בדיקות.
- P1: `gameScene.ts` queueSpawn משתמש בזמני delay החל מ-280ms, בעוד balance.spawn.telegraphMs=720 אינו נקרא שם. awayFromPlayer מזיז את ההופעה לאחר חיווי, ו-clamp עלול להפר את safeRadius. לתקן חיווי, מיקום ומשך חסינות; לבדוק קצוות ומכשולים.
- P1: `hazards/plasmas.ts` בודק contactDamage>0 אך `gameScene.ts` ו-`core/runState.ts` מחסירים תמיד נקודה אחת. ליישר חוזה או להגביל סכמה; בדיקת ערכים 0/1/2.
- P1: spawn נכשל תחת cap וה-pending יורד בכל מקרה; החלט אם דוחים spawn מתוכנן או משמיטים במפורש. ילדים קטומים לפי cap הם התנהגות קיימת; לבדוק ניצחון וצפיפות.
- P1: `player/controls.ts` setKeys מפעיל override ללא דרך חזרה לקלט אמיתי; blur/visibility מנקים רק keys ולא touch/override. לתקן מחזור חיים ולבדוק Retry/Menu, פוקוס ומגע.
- P1: `gameScene.ts` finish מסמן ended אך update עדיין מפעיל shots/plasmas/hazards; לבדוק הקפאת תוצאה, ניקוד וטלמטריה, ושחרור משאבים. בדוק שימוש ב-sprite אחרי destroy ב-killNow/onPop. אלו סיכונים סטטיים ולא תקלות דפדפן מאומתות.
- P2: `gameScene.ts` מרכז תנועה, נשק, גלים, HUD, נזק, spawn וציור. לחלץ בהדרגה player controller ו-wave scheduler עם בדיקות שימור, לא לשכתב.
- P2: בדוק התאמת Arcade body לסקייל הגרפי של שחקן/פלזמה; תצוגת boxes קיימת דרך query. בדוק bounce על משטחים, חסימה של ירי, תזמון pulse ותחושת פגיעה.

## לשמר
core/validate.ts עם בדיקות IDs/behavior/מעגלי split; core/runState.ts, splitSim.ts, aim.ts; מערכות motion/plasmas/stageHazards/shots; UI, שני נשקים, audio, שלוש פעימות בכל זירה, אנרגיה אופציונלית; אירוע plasma-arena-mission הוא hook עצמאי ולא חוזה קמפיין מאושר.
