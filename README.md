# Роадмапы стажировки (GitHub Pages + Supabase)

## 1. Supabase
1. Создайте проект на supabase.com.
2. SQL Editor → вставьте содержимое `schema.sql` → Run.
3. Authentication → Sign In / Providers → включите **Allow anonymous sign-ins**.
4. Project Settings → API: скопируйте **Project URL** и **anon public key** в `config.js`.
   (anon key публичный — данные защищены политиками RLS. `service_role` ключ НИКОГДА не добавляйте на сайт.)

## 2. GitHub
```bash
cd roadmap-site
git init && git add . && git commit -m "roadmap site"
git branch -M main
git remote add origin https://github.com/<ваш-логин>/<репозиторий>.git
git push -u origin main
```
Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)` → Save.
Через 1–2 минуты сайт будет на `https://<ваш-логин>.github.io/<репозиторий>/`.

## 3. Как работает
- Сотрудник открывает сайт, вводит имя один раз. Отметки «изучено» сохраняются в таблицу `progress`.
- Пока `config.js` не заполнен, прогресс хранится только в браузере (localStorage).
- Прогресс привязан к браузеру (анонимный вход). Если нужен вход с любого устройства — замените на вход по email (`signInWithOtp`).
- Отчёт для наставника — запрос в конце `schema.sql`.
