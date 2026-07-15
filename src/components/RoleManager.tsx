"use client";

import { LockKeyhole, Plus, RotateCcw, Save, Search, ShieldCheck, Trash2, UsersRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { permissionOptions, type PermissionValue } from "@/lib/role-permission-options";

type RoleItem = {
  id: string;
  name: string;
  systemKey: string | null;
  permissions: PermissionValue[];
  _count?: { users: number; userInvites: number };
};

type PermissionGroup = {
  key: string;
  label: string;
  description: string;
  keys: PermissionValue[];
};

const permissionGroups: PermissionGroup[] = [
  {
    key: "work",
    label: "Рабочее пространство",
    description: "Доски, задачи и рабочие колонки",
    keys: ["VIEW_BOARD", "CREATE_TASKS", "EDIT_ALL_TASKS", "DELETE_TASKS", "MANAGE_COLUMNS"],
  },
  {
    key: "insights",
    label: "Отчёты и документы",
    description: "История, отчётность и защищённые файлы",
    keys: ["VIEW_REPORTS", "VIEW_HISTORY", "VIEW_FILES", "MANAGE_FILES"],
  },
  {
    key: "communication",
    label: "Связь",
    description: "Внутренние чаты и Telegram-уведомления",
    keys: ["USE_CHATS", "USE_TELEGRAM"],
  },
  {
    key: "admin",
    label: "Администрирование",
    description: "Настройки пространства, пользователи и роли",
    keys: ["MANAGE_WORKSPACE", "MANAGE_USERS"],
  },
];

export function RoleManager({ initialRoles }: { initialRoles: RoleItem[] }) {
  const router = useRouter();
  const [roles, setRoles] = useState(initialRoles);
  const [savedRoles, setSavedRoles] = useState(initialRoles);
  const [selectedId, setSelectedId] = useState(initialRoles[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [saving, setSaving] = useState(false);
  const [dirtyRoleIds, setDirtyRoleIds] = useState<Set<string>>(new Set());

  const selected = roles.find((role) => role.id === selectedId) ?? roles[0] ?? null;
  const permissionMap = useMemo(() => new Map(permissionOptions.map((permission) => [permission.key, permission])), []);
  const filteredRoles = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru-RU");
    return normalized ? roles.filter((role) => role.name.toLocaleLowerCase("ru-RU").includes(normalized)) : roles;
  }, [query, roles]);

  const selectedIsDirty = Boolean(selected && dirtyRoleIds.has(selected.id));
  const enabledCount = selected?.systemKey === "ADMIN" ? permissionOptions.length : selected?.permissions.length ?? 0;
  const assignedCount = selected ? (selected._count?.users ?? 0) + (selected._count?.userInvites ?? 0) : 0;
  const replacementRole = selected ? findReplacementRole(roles, selected.id) : null;

  function updateSelected(patch: Partial<RoleItem>) {
    if (!selected || selected.systemKey === "ADMIN") return;
    setRoles((current) => current.map((role) => role.id === selected.id ? { ...role, ...patch } : role));
    setDirtyRoleIds((current) => new Set(current).add(selected.id));
    setMessage("");
  }

  function selectRole(id: string) {
    setSelectedId(id);
    setDeleteOpen(false);
    setMessage("");
  }

  function togglePermission(permission: PermissionValue, checked: boolean) {
    if (!selected || selected.systemKey === "ADMIN") return;
    const permissions = checked
      ? Array.from(new Set([...selected.permissions, permission]))
      : selected.permissions.filter((item) => item !== permission);
    updateSelected({ permissions });
  }

  function setGroupPermissions(group: PermissionGroup, enabled: boolean) {
    if (!selected || selected.systemKey === "ADMIN") return;
    const permissions = enabled
      ? Array.from(new Set([...selected.permissions, ...group.keys]))
      : selected.permissions.filter((permission) => !group.keys.includes(permission));
    updateSelected({ permissions });
  }

  function setAllPermissions(enabled: boolean) {
    updateSelected({ permissions: enabled ? permissionOptions.map((permission) => permission.key) : [] });
  }

  function resetSelected() {
    if (!selected) return;
    const saved = savedRoles.find((role) => role.id === selected.id);
    if (!saved) return;
    setRoles((current) => current.map((role) => role.id === saved.id ? saved : role));
    setDirtyRoleIds((current) => {
      const next = new Set(current);
      next.delete(saved.id);
      return next;
    });
    setMessage("");
  }

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newRoleName.trim();
    if (name.length < 2) return;
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, permissions: [] }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setMessageKind("error");
      setMessage(data.error ?? "Не удалось создать роль");
      return;
    }
    const created: RoleItem = { ...data.role, _count: data.role._count ?? { users: 0, userInvites: 0 } };
    setRoles((current) => [...current, created]);
    setSavedRoles((current) => [...current, created]);
    setSelectedId(created.id);
    setNewRoleName("");
    setCreating(false);
    setMessageKind("success");
    setMessage(`Роль «${created.name}» создана. Теперь настройте её права.`);
    router.refresh();
  }

  async function saveRole() {
    if (!selected || selected.systemKey === "ADMIN" || !selectedIsDirty) return;
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/roles/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: selected.name.trim(), permissions: selected.permissions }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setMessageKind("error");
      setMessage(data.error ?? "Не удалось сохранить роль");
      return;
    }
    const updated: RoleItem = { ...selected, ...data.role, _count: selected._count };
    setRoles((current) => current.map((role) => role.id === selected.id ? updated : role));
    setSavedRoles((current) => current.map((role) => role.id === selected.id ? updated : role));
    setDirtyRoleIds((current) => {
      const next = new Set(current);
      next.delete(selected.id);
      return next;
    });
    setMessageKind("success");
    setMessage(`Изменения роли «${updated.name}» сохранены.`);
    router.refresh();
  }

  async function deleteRole() {
    setDeleteOpen(false);
    if (!selected || selected.systemKey === "ADMIN") return;
    if (assignedCount && !replacementRole) {
      setMessageKind("error");
      setMessage("Сначала создайте другую роль для переназначения пользователей.");
      return;
    }
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/roles/${selected.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ replacementRoleId: assignedCount ? replacementRole?.id : undefined }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setMessageKind("error");
      setMessage(data.error ?? "Не удалось удалить роль");
      return;
    }
    const next = roles.filter((role) => role.id !== selected.id);
    setRoles(next);
    setSavedRoles((current) => current.filter((role) => role.id !== selected.id));
    setDirtyRoleIds((current) => {
      const updated = new Set(current);
      updated.delete(selected.id);
      return updated;
    });
    setSelectedId(next[0]?.id ?? "");
    setMessageKind("success");
    setMessage(`Роль «${selected.name}» удалена.`);
    router.refresh();
  }

  return (
    <section className="role-manager" aria-label="Управление ролями и правами">
      <header className="role-manager-toolbar">
        <div className="role-manager-summary">
          <span className="role-manager-summary-icon" aria-hidden="true"><ShieldCheck size={19} /></span>
          <span><strong>{roles.length} {pluralizeRole(roles.length)}</strong><small>Настройте доступ и назначьте роли пользователям</small></span>
        </div>
        <button className="button" type="button" onClick={() => { setCreating(true); setMessage(""); }} disabled={creating || saving}>
          <Plus size={16} />Новая роль
        </button>
      </header>

      {message ? <p className={`role-manager-message ${messageKind}`} role="status">{message}</p> : null}

      <div className="role-manager-layout">
        <aside className="role-directory" aria-label="Список ролей">
          {creating ? <form className="role-create-panel" onSubmit={createRole}>
            <div className="role-create-panel-head"><strong>Новая роль</strong><button className="button icon ghost" type="button" aria-label="Отменить создание роли" onClick={() => { setCreating(false); setNewRoleName(""); }}><X size={16} /></button></div>
            <label className="field"><span className="label">Название</span><input className="input" value={newRoleName} minLength={2} maxLength={60} placeholder="Например, координатор" autoFocus onChange={(event) => setNewRoleName(event.currentTarget.value)} required /></label>
            <button className="button" disabled={saving || newRoleName.trim().length < 2}><Plus size={16} />Создать</button>
          </form> : null}

          <label className="field role-search-field">
            <span className="label">Поиск по ролям</span>
            <span className="role-search-control"><Search size={16} aria-hidden="true" /><input className="input" type="search" value={query} placeholder="Название роли" onChange={(event) => setQuery(event.currentTarget.value)} /></span>
          </label>

          <div className="role-directory-head"><span>Все роли</span><strong>{filteredRoles.length}</strong></div>
          <ul className="role-directory-list" role="list">
            {filteredRoles.map((role) => {
              const roleAssignedCount = (role._count?.users ?? 0) + (role._count?.userInvites ?? 0);
              const rolePermissionCount = role.systemKey === "ADMIN" ? permissionOptions.length : role.permissions.length;
              return <li key={role.id}><button className={`role-directory-item ${selected?.id === role.id ? "is-active" : ""}`} type="button" aria-current={selected?.id === role.id ? "true" : undefined} onClick={() => selectRole(role.id)}>
                <span className="role-directory-mark">{role.systemKey === "ADMIN" ? <LockKeyhole size={16} /> : <ShieldCheck size={16} />}</span>
                <span className="role-directory-copy"><strong>{role.name}</strong><small>{roleAssignedCount} назначено, {rolePermissionCount} прав</small></span>
                {dirtyRoleIds.has(role.id) ? <span className="role-directory-state">Изменено</span> : null}
              </button></li>;
            })}
          </ul>
          {!filteredRoles.length ? <div className="role-directory-empty"><Search size={20} /><strong>Роли не найдены</strong><small>Измените запрос или создайте новую роль.</small></div> : null}
        </aside>

        {selected ? <div className="role-editor">
          <header className="role-editor-head">
            <div className="role-editor-title">
              <span className="role-editor-label">Настройка доступа</span>
              <h3>{selected.name}</h3>
              <p className="muted">{selected.systemKey === "ADMIN" ? "Администратор получает полный доступ автоматически." : "Изменения применятся после сохранения роли."}</p>
            </div>
            <div className="role-editor-metrics" aria-label="Сводка роли">
              <span><UsersRound size={16} /><strong>{assignedCount}</strong><small>назначено</small></span>
              <span><ShieldCheck size={16} /><strong>{enabledCount}/{permissionOptions.length}</strong><small>прав включено</small></span>
            </div>
          </header>

          <div className="role-editor-identity">
            <label className="field role-name-field"><span className="label">Название роли</span><input className="input" value={selected.name} minLength={2} maxLength={60} disabled={selected.systemKey === "ADMIN" || saving} onChange={(event) => updateSelected({ name: event.currentTarget.value })} /></label>
            {selected.systemKey === "ADMIN" ? <span className="role-system-note"><LockKeyhole size={15} />Системная роль защищена от изменений</span> : null}
          </div>

          <div className="permission-toolbar">
            <div><strong>Разрешения</strong><small>Выберите действия, доступные пользователям этой роли</small></div>
            {selected.systemKey !== "ADMIN" ? <div className="permission-toolbar-actions">
              <button className="button ghost compact-button" type="button" disabled={saving || enabledCount === permissionOptions.length} onClick={() => setAllPermissions(true)}>Включить все</button>
              <button className="button ghost compact-button" type="button" disabled={saving || enabledCount === 0} onClick={() => setAllPermissions(false)}>Снять все</button>
            </div> : null}
          </div>

          <div className="permission-groups">
            {permissionGroups.map((group) => {
              const groupEnabledCount = group.keys.filter((key) => selected.systemKey === "ADMIN" || selected.permissions.includes(key)).length;
              const groupFullyEnabled = groupEnabledCount === group.keys.length;
              return <section className="permission-group" key={group.key} aria-labelledby={`permission-group-${group.key}`}>
                <header className="permission-group-head">
                  <div><h4 id={`permission-group-${group.key}`}>{group.label}</h4><p>{group.description}</p></div>
                  <div className="permission-group-status"><span>{groupEnabledCount} из {group.keys.length}</span>{selected.systemKey !== "ADMIN" ? <button className="button ghost compact-button" type="button" disabled={saving} onClick={() => setGroupPermissions(group, !groupFullyEnabled)}>{groupFullyEnabled ? "Снять" : "Включить"}</button> : null}</div>
                </header>
                <div className="permission-grid">
                  {group.keys.map((key) => {
                    const permission = permissionMap.get(key)!;
                    const checked = selected.systemKey === "ADMIN" || selected.permissions.includes(key);
                    return <label className={`permission-option ${checked ? "is-checked" : ""}`} key={key}>
                      <input className="permission-checkbox" type="checkbox" checked={checked} disabled={selected.systemKey === "ADMIN" || saving} onChange={(event) => togglePermission(key, event.currentTarget.checked)} />
                      <span className="permission-copy"><strong>{permission.label}</strong><small>{permission.description}</small></span>
                    </label>;
                  })}
                </div>
              </section>;
            })}
          </div>

          <footer className="role-editor-footer">
            <div className={`role-editor-save-state ${selectedIsDirty ? "is-dirty" : ""}`} role="status">
              {selected.systemKey === "ADMIN" ? <><LockKeyhole size={16} /><span><strong>Полный доступ</strong><small>Права администратора нельзя ограничить</small></span></> : selectedIsDirty ? <><RotateCcw size={16} /><span><strong>Есть несохранённые изменения</strong><small>Сохраните роль, чтобы применить новые права</small></span></> : <><ShieldCheck size={16} /><span><strong>Все изменения сохранены</strong><small>Текущие права уже действуют</small></span></>}
            </div>
            {selected.systemKey !== "ADMIN" ? <div className="role-editor-actions">
              <button className="button ghost danger-text" type="button" onClick={() => setDeleteOpen(true)} disabled={saving}><Trash2 size={16} />Удалить</button>
              {selectedIsDirty ? <button className="button secondary" type="button" onClick={resetSelected} disabled={saving}><RotateCcw size={16} />Отменить</button> : null}
              <button className="button" type="button" onClick={() => void saveRole()} disabled={saving || !selectedIsDirty || selected.name.trim().length < 2}><Save size={16} />{saving ? "Сохраняем" : "Сохранить"}</button>
            </div> : null}
          </footer>
        </div> : <div className="role-editor role-editor-empty"><ShieldCheck size={26} /><h3>Создайте первую роль</h3><p className="muted">После создания здесь появится настройка прав.</p></div>}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title={selected ? `Удалить роль «${selected.name}»?` : "Удалить роль?"}
        description={assignedCount && replacementRole ? `${assignedCount} назначений будут перенесены на роль «${replacementRole.name}». Это действие нельзя отменить.` : "Роль будет удалена без возможности восстановления."}
        confirmLabel="Удалить роль"
        tone="danger"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteRole()}
      />
    </section>
  );
}

function findReplacementRole(roles: RoleItem[], selectedId: string) {
  return roles.find((role) => role.id !== selectedId && role.systemKey === "MANAGER")
    ?? roles.find((role) => role.id !== selectedId && role.systemKey === "EXECUTOR")
    ?? roles.find((role) => role.id !== selectedId)
    ?? null;
}

function pluralizeRole(count: number) {
  const value = Math.abs(count) % 100;
  const last = value % 10;
  if (value > 10 && value < 20) return "ролей";
  if (last === 1) return "роль";
  if (last >= 2 && last <= 4) return "роли";
  return "ролей";
}
