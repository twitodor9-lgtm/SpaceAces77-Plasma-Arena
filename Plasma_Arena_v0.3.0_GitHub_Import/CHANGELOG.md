# Changelog

## v0.4.0-dev (in progress)

- **Arcade Feel**: snappier player movement (speed 330, jump −640, coyote 140 ms, buffer 150 ms).
- Stronger hit feedback (larger knock-up, camera shake, particle burst on damage).
- Improved pop/split juice (more particles, rise, longer life, shake on mid splits).
- Split tuning: shorter child grace, stronger pop velocity, wider separation; maxBodies 20.
- Weapon differentiation: faster lance, stronger/wider pulse-net slow.
- Plasma motion: slightly higher mid/heavy cruise, moderated spark speed for density fairness.
- Spawn telegraph and intermission slightly tighter.

## v0.3.0

- תיקון שגיאות תחביר וטיפוסים והוספת lockfile עצמאי.
- בניית HTML אופליין יחיד ובדיקת פתיחה ב־`file://`.
- גילוי אוטומטי לזירות JSON; ולידציה לנקודות הופעה, תקרות שלמות ונשק פתיחה חינמי.
- ההופעה משתמשת במשך האזהרה שבנתונים ומתרחשת במיקום המסומן לאחר בדיקת מרחק. הופעות שנחסמו נדחות. פיצול ממשיך לכבד תקרת גופים ודרגות פיצול.
- נזק מוגדר לכל גוף וסכנה, חלון חסינות, הקפאת תוצאה ותיקוני Retry/Menu וניקוי קלט.
- נקודות כוונת לפי כיוון הירי, הבזק לוע ומשוב כמות בהתפצלות. יישור סימון תחתית הזירה.
- הוזזה נקודת הופעה בסיפון הממסר כדי שמוקשים בסיור ייצאו מעל צדו של המשטח המרכזי.
- טלמטריה, בדיקות Chromium אופליין, תרחיש הרחבת תוכן וצילומי מסך.

## v0.2

חבילת שחזור מקור Work עם קוד Grok v0.1, מסמכי עיצוב, ביקורת ועשר בדיקות ליבה.
