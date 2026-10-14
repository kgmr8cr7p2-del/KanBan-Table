"use client";

import { Save, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cacheSoundPreferences, getSoundPreferences, playChatNotification } from "@/lib/chat-notification";
import { defaultSoundPreferences, parseSoundPreferences, type SoundPreferences, type SoundCategory } from "@/lib/sound-preferences";

const categories: [SoundCategory, string][] = [["chat", "Сообщения в чатах"], ["mention", "Упоминания"], ["created", "Создание задач"], ["completed", "Завершение задач"], ["reminder", "Напоминания и вечерний звук"], ["prank", "Шутки от обезьяны"]];

export function NotificationSoundSettings() {
  const [value, setValue] = useState<SoundPreferences>(defaultSoundPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setValue(getSoundPreferences());
    fetch("/api/notification-preferences", {cache:"no-store"}).then(async response => {
      if (!response.ok) throw Error("Не удалось загрузить настройки");
      const data = await response.json();
      if (active) setValue(parseSoundPreferences(data.preferences?.soundPreferences));
    }).catch(() => { if(active) setError("Не удалось загрузить настройки. Откройте раздел повторно."); })
      .finally(() => { if(active) setLoading(false); });
    return () => {active = false;};
  }, []);
  function change(patch: Partial<SoundPreferences>) { setValue(current=>({...current,...patch})); setMessage(""); }
  async function save() {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/notification-preferences", {method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({soundPreferences:value})});
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Не удалось сохранить настройки");
      cacheSoundPreferences(data.preferences.soundPreferences);
      setMessage("Личные настройки сохранены");
    } catch(error) {setError(error instanceof Error ? error.message : "Не удалось сохранить настройки");}
    finally {setSaving(false);}
  }
  return <section className="personal-sound-settings" aria-labelledby="personal-sound-title">
    <h2 id="personal-sound-title">Личные звуки</h2>
    <fieldset disabled={loading || saving}>
      <label className="sound-toggle"><span>Звуки включены</span><input type="checkbox" role="switch" checked={value.enabled} onChange={event=>change({enabled:event.target.checked})}/></label>
      <label className="sound-volume"><span>Громкость <output>{Math.round(value.volume*100)}%</output></span><input type="range" min="0" max="1" step="0.01" aria-valuetext={`${Math.round(value.volume*100)}%`} value={value.volume} onChange={event=>change({volume:Number(event.target.value)})}/></label>
      <div className="sound-category-list">{categories.map(([key,label])=><label className="sound-toggle" key={key}><span>{label}</span><input type="checkbox" role="switch" checked={value[key]} onChange={event=>change({[key]:event.target.checked})}/></label>)}</div>
      <label className="sound-toggle"><span>Обезьяна на экране</span><input type="checkbox" role="switch" checked={value.mascotEnabled} onChange={event=>change({mascotEnabled:event.target.checked})}/></label>
      <label className="sound-toggle"><span>Тихие часы · Москва</span><input type="checkbox" role="switch" checked={value.quietEnabled} onChange={event=>change({quietEnabled:event.target.checked})}/></label>
      {value.quietEnabled ? <div className="sound-quiet-times"><label className="field"><span className="label">С</span><input className="input" type="time" value={value.quietFrom} onChange={event=>change({quietFrom:event.target.value})}/></label><label className="field"><span className="label">До</span><input className="input" type="time" value={value.quietTo} onChange={event=>change({quietTo:event.target.value})}/></label></div> : null}
    </fieldset>
    {error ? <p role="alert" className="task-modal-error">{error}</p> : null}
    {message ? <p role="status">{message}</p> : null}
    <div className="sound-settings-actions"><button className="button secondary" type="button" disabled={loading || saving || value.volume === 0} onClick={async()=>{ const result=await playChatNotification("mention", {...value,enabled:true,mention:true,quietEnabled:false});setMessage(result==="played"?"Тестовый звук воспроизведён":"Нажмите проверку ещё раз, чтобы разрешить звук"); }}><Volume2 size={16}/>Проверить</button><button className="button" type="button" disabled={loading || saving} onClick={()=>void save()}><Save size={16}/>{saving ? "Сохранение…" : "Сохранить"}</button></div>
  </section>;
}
