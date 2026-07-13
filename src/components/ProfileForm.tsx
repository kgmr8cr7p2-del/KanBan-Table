"use client";

import { ImagePlus, Save, Trash2 } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileCard, { type ProfileUser, ProfileAvatar } from "@/components/ProfileCard/ProfileCard";

const TELEGRAM_INVITE_URL = "https://t.me/+V1kH1F871nc5MTUy";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export function ProfileForm({ user }: { user: ProfileUser }) {
  const router = useRouter();
  const [draft, setDraft] = useState({
    name: user.name,
    jobTitle: user.jobTitle ?? "",
    handle: user.handle ?? "",
    profileStatus: user.profileStatus ?? "В сети",
  });
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(user.avatarUrl ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl(avatarUrl);
      return;
    }
    const objectUrl = URL.createObjectURL(avatarFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile, avatarUrl]);

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_AVATAR_SIZE) {
      setStatus("error");
      setMessage("Выберите изображение JPG, PNG, WebP или GIF размером до 5 МБ.");
      event.target.value = "";
      return;
    }
    setAvatarFile(file);
    setStatus("idle");
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      let nextAvatarUrl = avatarUrl;
      if (avatarFile) {
        const body = new FormData();
        body.set("avatar", avatarFile);
        const avatarResponse = await fetch("/api/profile/avatar", { method: "POST", body });
        const avatarPayload = await avatarResponse.json().catch(() => ({}));
        if (!avatarResponse.ok) throw new Error(avatarPayload.error || "Не удалось загрузить аватар.");
        nextAvatarUrl = avatarPayload.avatarUrl;
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Не удалось сохранить профиль.");

      setAvatarUrl(nextAvatarUrl);
      setAvatarFile(null);
      setStatus("saved");
      setMessage("Профиль сохранён");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить профиль.");
    }
  }

  async function removeAvatar() {
    if (avatarFile && !avatarUrl) {
      setAvatarFile(null);
      return;
    }
    setStatus("saving");
    const response = await fetch("/api/profile/avatar", { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(payload.error || "Не удалось удалить аватар.");
      return;
    }
    setAvatarFile(null);
    setAvatarUrl("");
    setStatus("saved");
    setMessage("Аватар удалён");
    router.refresh();
  }

  return (
    <div className="profile-editor-layout">
      <form className="profile-editor-form" onSubmit={submit}>
        <section className="profile-avatar-editor" aria-labelledby="profile-photo-title">
          <ProfileAvatar name={draft.name} avatarUrl={previewUrl} size={72} />
          <div>
            <h2 id="profile-photo-title">Фото профиля</h2>
            <p className="muted">JPG, PNG, WebP или GIF до 5 МБ.</p>
            <div className="toolbar">
              <label className="button secondary profile-avatar-upload">
                <ImagePlus size={17} aria-hidden="true" />
                Выбрать фото
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseAvatar} />
              </label>
              {previewUrl ? (
                <button className="button secondary" type="button" onClick={removeAvatar} disabled={status === "saving"}>
                  <Trash2 size={16} aria-hidden="true" /> Удалить
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <div className="profile-fields-grid">
          <label className="field">
            <span className="label">Имя</span>
            <input className="input" name="name" autoComplete="name" value={draft.name} minLength={2} maxLength={80} required onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label className="field">
            <span className="label">Рабочая почта</span>
            <input className="input" type="email" value={user.email} readOnly />
          </label>
          <label className="field">
            <span className="label">Должность</span>
            <input className="input" name="jobTitle" value={draft.jobTitle} maxLength={100} placeholder="Например, инженер" onChange={(event) => setDraft({ ...draft, jobTitle: event.target.value })} />
          </label>
          <label className="field">
            <span className="label">Ник</span>
            <span className="profile-handle-input"><span aria-hidden="true">@</span><input className="input" name="handle" value={draft.handle} maxLength={40} pattern="[A-Za-zА-Яа-яЁё0-9._-]*" placeholder="username" onChange={(event) => setDraft({ ...draft, handle: event.target.value })} /></span>
          </label>
          <label className="field profile-status-field">
            <span className="label">Статус</span>
            <input className="input" name="profileStatus" value={draft.profileStatus} maxLength={60} placeholder="В сети" onChange={(event) => setDraft({ ...draft, profileStatus: event.target.value })} />
          </label>
        </div>

        <div className="profile-form-footer">
          <a className="button secondary profile-chat-link" href={TELEGRAM_INVITE_URL} target="_blank" rel="noreferrer">Рабочий Telegram-чат</a>
          <button className="button" disabled={status === "saving"}>
            <Save size={17} aria-hidden="true" /> {status === "saving" ? "Сохраняем…" : "Сохранить профиль"}
          </button>
        </div>
        {message ? <p className={`profile-form-message ${status === "error" ? "is-error" : ""}`} role="status">{message}</p> : null}
      </form>

      <aside className="profile-preview" aria-label="Предпросмотр карточки профиля">
        <span className="profile-preview-label">Так вас увидят коллеги</span>
        <ProfileCard name={draft.name || "Ваше имя"} title={draft.jobTitle || "Участник команды"} handle={draft.handle} status={draft.profileStatus} avatarUrl={previewUrl} showUserInfo enableTilt />
      </aside>
    </div>
  );
}
