export const permissionOptions = [
  { key: "VIEW_BOARD", label: "Доски и задачи", description: "Просматривать общую и личные доски, задачи и архив." },
  { key: "CREATE_TASKS", label: "Создание задач", description: "Создавать задачи на общей доске и назначать исполнителей." },
  { key: "EDIT_ALL_TASKS", label: "Редактирование всех задач", description: "Изменять любые задачи общей доски. Без этого права пользователь меняет только назначенные ему задачи." },
  { key: "DELETE_TASKS", label: "Удаление задач", description: "Удалять и переносить в архив задачи общей доски." },
  { key: "MANAGE_COLUMNS", label: "Колонки доски", description: "Создавать, переименовывать, переставлять и удалять колонки общей доски." },
  { key: "VIEW_REPORTS", label: "Отчёты", description: "Открывать отчёты и выгружать данные." },
  { key: "VIEW_HISTORY", label: "История изменений", description: "Просматривать историю действий по задачам." },
  { key: "VIEW_FILES", label: "Общие файлы", description: "Открывать защищённое хранилище общих важных файлов." },
  { key: "MANAGE_FILES", label: "Управление файлами", description: "Загружать и удалять файлы в общем защищённом хранилище." },
  { key: "USE_CHATS", label: "Личные чаты", description: "Переписываться с другими участниками внутри Taskora." },
  { key: "USE_TELEGRAM", label: "Telegram-уведомления", description: "Подключать личный чат с ботом и получать напоминания." },
  { key: "MANAGE_WORKSPACE", label: "Настройки пространства", description: "Управлять нефтебазами и общими настройками рабочего пространства." },
  { key: "MANAGE_USERS", label: "Пользователи и роли", description: "Одобрять пользователей, назначать роли и настраивать права." },
] as const;

export type PermissionValue = (typeof permissionOptions)[number]["key"];
