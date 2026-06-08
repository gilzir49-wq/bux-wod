# 🦌 BUX WOD — מחולל אימונים ל-CrossFit BUX

PWA (אפליקציית אינטרנט מותקנת) שמייצרת אימון CrossFit אמיתי ומלא — בכל מקום בעולם.
לחברי CrossFit BUX שנמצאים במילואים, בחו״ל, בחופשה, עם המשפחה, או סתם עם חצר/פארק
ורוצים אימון BUX אמיתי בלי הקופסה.

האפליקציה רצה לגמרי בדפדפן, ללא שרת וללא התחברות. בוחרים זמן, רמה, מטרה וציוד —
ומקבלים מיידית אימון מובנה (חימום · אימון מרכזי · שחרור) עם קישור וידאו לכל תרגיל.

## יכולות
- ✅ מחולל אימונים חכם מבוסס-חוקים (rule-based) — מיידי, חינמי, עובד אופליין
- ✅ ספריית תנועות CrossFit אמיתית, מסווגת לפי מודאליות וציוד
- ✅ שלוש מתכונות פלט: חימום, אימון מרכזי (AMRAP / For Time / EMOM / Chipper / Rounds), שחרור
- ✅ שמות תרגילים באנגלית (טרמינולוגיית CrossFit) + הערות סקיילינג בעברית
- ✅ קישור YouTube ▶ לכל תנועה
- ✅ שמירה, דירוג בכוכבים והיסטוריה ב-LocalStorage
- ✅ שיתוף לוואטסאפ/אינסטגרם דרך Web Share API + כיתוב ממותג מתחלף
- ✅ ממשק בעברית (RTL), Mobile-first, מתאים להתקנה למסך הבית
- ✅ עובד אופליין (Service Worker + manifest)

## הרצה מקומית
```bash
npm install
npm run dev
```
פתחו http://localhost:3000

## בנייה לפרודקשן (Static Export)
```bash
npm run build
```
הפלט הסטטי נכתב לתיקיית `out/`.

## פריסה

### Cloudflare Pages (מומלץ)
1. העלו את הריפו ל-GitHub.
2. ב-Cloudflare Pages → Create project → חברו את הריפו.
3. הגדרות בנייה:
   - **Build command:** `npm run build`
   - **Output directory:** `out`
4. Deploy. זהו — תקבלו דומיין `*.pages.dev`.

האפליקציה משתמשת ב-paths יחסיים, כך שהיא עובדת מכל דומיין/שורש ללא הגדרות נוספות.

### GitHub Pages
לאתר פרויקט (`https://<user>.github.io/<repo>/`) צריך להגדיר base path בזמן הבנייה:
```bash
NEXT_PUBLIC_BASE_PATH="/<repo>" npm run build
```
ואז לפרסם את תיקיית `out/` (למשל עם GitHub Actions או הענף `gh-pages`).
לאתר משתמש/ארגון (`https://<user>.github.io/`) אין צורך ב-base path — פשוט `npm run build`.

> ⚠️ אל תפרסו ל-Netlify או tiiny.host — היעדים הנתמכים הם Cloudflare Pages / GitHub Pages.

## האייקונים והלוגו
- הלוגו הרשמי של CrossFit Bux מוטמע באפליקציה. קבצי המקור (רקע לבן) נמצאים ב-`brand-src/`,
  והגרסאות המעובדות (רקע שקוף + אייקוני PWA על רקע ירוק) ב-`public/brand/` ו-`public/icons/`.
- ליצירה מחדש של כל נכסי המותג מתוך `brand-src/`: `npm run build-logo`
  (הסקריפט מסיר את הרקע הלבן בעזרת flood-fill, חותך לתוכן, ומרכיב אייקונים — ללא תלויות).
- להחלפת הלוגו: שימו קובץ חדש ב-`brand-src/icon.png` (ו/או `horizontal.png`) והריצו `npm run build-logo`.
- רכיב התצוגה: `components/BuxLogo.tsx`.
- כדי לקבע סרטון YouTube ספציפי לתנועה, החליפו את שדה `youtube` של אותה תנועה
  בקובץ `lib/movements.ts` בקישור מלא מסוג `https://youtu.be/<id>`.

## מבנה הפרויקט
```
app/            Next.js App Router — layout + עמוד ראשי (state machine)
components/      BuxLogo · WorkoutView · StarRating · ServiceWorker
lib/
  types.ts       טיפוסי הליבה
  movements.ts   ספריית התנועות + מאגרי חימום/שחרור
  engine.ts      מנוע יצירת האימונים (rule-based)
  options.ts     אפשרויות הממשק (זמן/רמה/מטרה/ציוד)
  captions.ts    כיתובי שיתוף ממותגים
  share.ts       בניית טקסט השיתוף
  storage.ts     שמירה/דירוג/היסטוריה ב-LocalStorage
public/          manifest.json · sw.js · icons
scripts/         מחולל אייקונים (PNG ללא תלויות)
```

## הערה על קישורי הווידאו
כדי שהקישורים לעולם לא יישברו (מזהי וידאו נמחקים עם הזמן), כל תנועה מקושרת
לחיפוש YouTube ממוקד ("CrossFit <movement> demo") שתמיד נוחת על הדגמה רלוונטית.
ניתן לקבע סרטונים ספציפיים כמתואר למעלה.

---
Built for CrossFit BUX. **Let’s Go BUX 🦌**
