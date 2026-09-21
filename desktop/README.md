# Taskora для Windows

Небольшой desktop-компаньон открывает рабочий экран Taskora в отдельном адаптивном окне и остаётся доступным из системного трея.

## Локальный запуск

Из корня репозитория:

```powershell
npm --prefix desktop install
npm --prefix desktop start
```

При первом запуске откроется обычная страница Taskora. Авторизация сохраняется в профиле приложения Electron.

## Сборка установщика

```powershell
npm --prefix desktop install
npm --prefix desktop run dist
```

Установщик появится в `desktop/dist`. CI собирает его автоматически для изменений в каталоге `desktop` и сохраняет `.exe` как artifact GitHub Actions.

По умолчанию приложение открывает:

```
https://kanban.region-free.online/desktop
```

Для локального стенда можно переопределить адрес:

```powershell
$env:TASKORA_URL = "http://localhost:3000/desktop"
npm --prefix desktop start
```
