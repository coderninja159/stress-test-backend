# StressTest Backend

Production-ready API: **Express.js**, **Supabase (PostgreSQL)**, **JWT + RBAC**, **Groq** (AI), **Eskiz.uz** (SMS). Frontend bilan aloqa: `Authorization: Bearer <token>`.

## O‘rnatish

```bash
npm install
cp .env.example .env
# .env ni to‘ldiring
npm run dev
```

Tekshiruv: [http://localhost:3000/api/health](http://localhost:3000/api/health)

```json
{
  "status": "ok",
  "timestamp": "2026-04-06T12:00:00.000Z",
  "version": "1.0.0",
  "database": "connected"
}
```

`database: "error"` bo‘lsa, Supabase URL/kalit yoki jadvallarni tekshiring.

## Environment variables

| O‘zgaruvchi | Tavsif |
|-------------|--------|
| `PORT` | Server porti (Railway avtomatik beradi) |
| `NODE_ENV` | `development` \| `production` |
| `SUPABASE_URL` | Supabase loyiha URL |
| `SUPABASE_SERVICE_KEY` | **Service role** kalit (backend faqat serverda) |
| `JWT_SECRET` | Kamida 64 belgi tavsiya etiladi |
| `JWT_EXPIRES_IN` | Masalan `7d` |
| `OTP_VERIFY_SECRET` | OTP dan keyin beriladigan `verified_token` uchun (yo‘q bo‘lsa `JWT_SECRET` ishlatiladi) |
| `GROQ_API_KEY` | Groq API kaliti |
| `GROQ_MODEL` | Masalan `llama-3.1-8b-instant` |
| `ESKIZ_LOGIN` | Eskiz akkaunt |
| `ESKIZ_PASSWORD` | Eskiz parol |
| `ESKIZ_FROM` | SMS yuboruvchi nomi |
| `ESKIZ_BASE_URL` | Ixtiyoriy, default `https://notify.eskiz.uz/api` |
| `FRONTEND_URL` | CORS (vergul bilan bir nechta origin mumkin) |

**Eslatma:** `file-saver` brauzer kutubxonasi — backend `xlsx` orqali Excel buffer qaytaradi, `file-saver` frontendda qo‘llanadi.

## Supabase SQL (minimal sxema)

`otp_codes` (siz bergan jadval):

```sql
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Qo‘shimcha jadvallar (backend kutilgan ustunlar):

```sql
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'psychologist', 'admin')),
  school_id UUID REFERENCES schools (id),
  student_id TEXT UNIQUE,
  phone TEXT,
  age INT,
  class_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  test_type TEXT DEFAULT 'stress',
  score NUMERIC,
  risk_level TEXT,
  answers JSONB DEFAULT '{}'::jsonb,
  student_ai_explanation TEXT,
  professional_ai_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_results_user ON results (user_id);
CREATE INDEX idx_users_school_role ON users (school_id) WHERE role = 'student';
```

**Admin / psixolog:** `auth.users` bilan `public.users.id` mos kelishi kerak (login `signInWithPassword` orqali). Admin API psixolog yaratganda `auth.admin.createUser` + `users` qatorini qo‘shadi.

**O‘quvchi:** faqat `public.users` (Supabase Auth shart emas), `student_id` `ST-YYYY-NNNN` formatida generatsiya qilinadi.

## API endpoints

Barcha himoyalangan so‘rovlarda header: `Authorization: Bearer <token>`.

### Auth — `/api/auth`

| Method | URL | Limit | Body | Javob |
|--------|-----|-------|------|--------|
| POST | `/admin/login` | authLimiter | `{ email, password }` | `{ token, user }` |
| POST | `/psychologist/login` | authLimiter | `{ email, password }` | `{ token, user, schoolId, schoolName }` |
| POST | `/student/verify-school` | general | `{ schoolCode }` | `{ schoolId, schoolName }` |
| POST | `/student/register` | register | `{ fullName, phone, age, className, schoolId }` | `{ token, studentId }` |
| POST | `/student/login` | auth | `{ studentId }` | `{ token, user }` |
| POST | `/logout` | verifyToken | — | `{ message }` |

### Student — `/api/students` (faqat `student`)

| Method | URL | Qoʻshimcha |
|--------|-----|------------|
| GET | `/me` | O‘z profili |
| GET | `/me/results` | `?type=&limit=&offset=` |
| GET | `/me/results/:resultId` | `requireOwnResult` |
| POST | `/test/submit` | testLimiter; body: `test_type`, `answers`, ixtiyoriy `score` |

### Psychologist — `/api/psychologist` (faqat `psychologist`)

| Method | URL | Izoh |
|--------|-----|------|
| GET | `/students` | `school_id = req.user.school_id`; `?class=&risk=&dateFrom=&dateTo=` |
| GET | `/students/:studentId` | `requireSameSchool` |
| GET | `/students/:studentId/results` | `requireSameSchool` |
| GET | `/stats` | Maktab statistikasi |
| GET | `/export` | Excel (o‘z maktabi) |

### Admin — `/api/admin` (faqat `admin`)

| Method | URL |
|--------|-----|
| GET | `/stats` |
| GET | `/schools` |
| POST | `/schools` — `{ code, name, is_active? }` |
| PATCH | `/schools/:id` |
| GET | `/psychologists` |
| POST | `/psychologists` — `{ email, password, fullName, schoolId }` |
| DELETE | `/psychologists/:id` |
| GET | `/students` — `?school_id=&limit=&offset=` |
| GET | `/export` | Barcha ma’lumotlar Excel |

### AI — `/api/ai` (admin **ishlatmaydi**)

| Method | URL | Rol | Middleware |
|--------|-----|-----|------------|
| POST | `/student-explanation/:resultId` | student | verifyToken, requireRole, requireOwnResult, aiLimiter |
| POST | `/professional-analysis/:resultId` | psychologist | xuddi shu tartibda |

Javob: `{ success, text, cached }`. Matn `results.student_ai_explanation` / `professional_ai_analysis` ustunlarida saqlanadi (mavjud bo‘lsa cache).

### SMS — `/api/sms`

| Method | URL | Limit |
|--------|-----|--------|
| POST | `/send-otp` | smsLimiter (telefon bo‘yicha soatiga 3) |
| POST | `/verify-otp` | general | Body: `{ phone, code }` → `{ verified_token }` |

Telefon: `+998XXXXXXXXX`.

## Rol matritsasi

| Endpoint / harakat | student | psychologist | admin |
|--------------------|---------|--------------|-------|
| O‘z profili | ✅ | ✅ | ✅ |
| O‘z natijalari | ✅ | — | ✅ |
| O‘z maktabi o‘quvchilari / natijalari | ❌ | ✅ | ✅ |
| Boshqa maktab | ❌ | ❌ | ✅ |
| Maktab CRUD | ❌ | ❌ | ✅ |
| Psixolog yaratish/o‘chirish | ❌ | ❌ | ✅ |
| AI student tushuntirish | ✅ (faqat o‘z natijasi) | ❌ | ❌ |
| AI professional tahlil | ❌ | ✅ (faqat o‘z maktabi natijasi) | ❌ |

## Rate limitlar

| Middleware | Qoidalar |
|------------|----------|
| authLimiter | 5 / 15 daqiqa (login) |
| registerLimiter | 10 / soat |
| smsLimiter | 3 / soat (bir telefon) |
| testLimiter | 5 / soat (o‘quvchi) |
| aiLimiter | 20 / daqiqa |
| generalLimiter | 100 / 15 daqiqa |

Login limitiga yetganda log: `[XAVFSIZLIK] IP: ... login limitiga yetdi`.

## Xavfsizlik tekshiruvlari (qisqa)

1. Student `/api/admin/stats` → 403, `[XAVFSIZLIK] ... ga kirmoqchi bo'ldi`
2. Student boshqa natija → 403 + log
3. Psixolog boshqa maktab o‘quvchisi → 403 + log
4. Token yo‘q / eskirgan / rol mos kelmasa → 401 yoki 403
5. Login spam → 429

## Deploy (Railway)

Repoda `railway.json` bor. Start: `node src/app.js`.

Railway environment: `PORT`, `NODE_ENV=production`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `GROQ_*`, `ESKIZ_*`, `FRONTEND_URL`.

Frontend (masalan Netlify): `VITE_API_URL=https://<sizning>.railway.app`

## Frontend integratsiya (qisqa)

- `src/lib/api.js`: `axios` instance, `baseURL: import.meta.env.VITE_API_URL`, so‘rovlarga `Authorization`.
- 401: token va storage tozalash, login sahifasiga yo‘naltirish.
- 403: foydalanuvchiga “Ruxsat yo‘q”.
- AI: to‘g‘ridan-to‘g‘ri Groq emas, `POST /api/ai/...` orqali.

---

Loyiha: **StressTest** — stress testlari va natijalar boshqaruvi.
# stress-test-beckenti
