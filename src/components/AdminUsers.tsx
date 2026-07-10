"use client";

import { useState } from "react";

const roleLabels = {
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  EXECUTOR: "Исполнитель",
};

export function AdminUsers({ users }: { users: Array<{ id: string; name: string; email: string; emailVerifiedAt: string | null; role: { name: keyof typeof roleLabels } }> }) {
  const [items, setItems] = useState(users);

  async function changeRole(id: string, role: string) {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (response.ok) {
      setItems((current) => current.map((user) => (user.id === id ? { ...user, role: { name: role as keyof typeof roleLabels } } : user)));
    }
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Пользователь</th>
          <th>Почта</th>
          <th>Статус</th>
          <th>Роль</th>
        </tr>
      </thead>
      <tbody>
        {items.map((user) => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>{user.emailVerifiedAt ? "Подтверждена" : "Ожидает"}</td>
            <td>
              <select className="select" value={user.role.name} onChange={(event) => changeRole(user.id, event.target.value)}>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
