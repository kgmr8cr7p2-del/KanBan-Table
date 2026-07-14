"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, FileType2, Search, ShieldCheck, Trash2, UploadCloud } from "lucide-react";

type ImportantFile = {
  id: string;
  title: string;
  description: string;
  category: string;
  originalName: string;
  size: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: { id: string; name: string; email: string };
};

type Preview =
  | { type: "text" | "code"; language?: string; text: string; truncated?: boolean }
  | { type: "csv"; language?: string; text: string; rows?: string[][]; truncated?: boolean }
  | { type: "sheet"; sheetName: string; rows: string[][]; truncated?: boolean; totalRows: number; totalColumns: number }
  | { type: "empty" | "unsupported"; message: string };

export function ImportantFilesClient({ canManage }: { canManage: boolean }) {
  const [files, setFiles] = useState<ImportantFile[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(() => files.find((file) => file.id === selectedId) ?? files[0] ?? null, [files, selectedId]);

  useEffect(() => {
    void loadFiles();
  }, []);

  useEffect(() => {
    if (!selected) {
      setPreview(null);
      return;
    }
    setSelectedId(selected.id);
    void loadPreview(selected.id);
  }, [selected?.id]);

  async function loadFiles(nextQuery = query, nextCategory = category) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextCategory) params.set("category", nextCategory);
    const response = await fetch(`/api/important-files?${params.toString()}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Не удалось загрузить файлы");
      return;
    }
    setFiles(payload.files ?? []);
    setCategories(payload.categories ?? []);
  }

  async function loadPreview(id: string) {
    setPreviewLoading(true);
    const response = await fetch(`/api/important-files/${id}/preview`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    setPreviewLoading(false);
    setPreview(response.ok ? payload.preview : { type: "unsupported", message: payload.error ?? "Предпросмотр недоступен" });
  }

  async function uploadFile(formData: FormData) {
    setError("");
    const response = await fetch("/api/important-files", { method: "POST", body: formData });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Не удалось загрузить файл");
      return;
    }
    setSelectedId(payload.file?.id ?? null);
    await loadFiles();
  }

  async function deleteFile(id: string) {
    if (!window.confirm("Удалить файл из общего хранилища?")) return;
    const response = await fetch(`/api/important-files/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "Не удалось удалить файл");
      return;
    }
    setSelectedId(null);
    await loadFiles();
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadFiles();
  }

  return (
    <div className="content important-files-page">
      <header className="files-head">
        <div>
          <span className="settings-page-kicker"><ShieldCheck size={17} /> Защищённое хранилище</span>
          <h1>Общие важные файлы</h1>
        </div>
        <form className="files-search" onSubmit={submitSearch}>
          <label className="field search compact-field">
            <span className="meta-row search-shell">
              <Search size={17} />
              <input className="input compact-input" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Поиск" aria-label="Поиск по файлам" />
            </span>
          </label>
          <select className="select compact-select" value={category} onChange={(event) => { setCategory(event.currentTarget.value); void loadFiles(query, event.currentTarget.value); }} aria-label="Категория файлов">
            <option value="">Все категории</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button className="button secondary compact-button">Найти</button>
        </form>
      </header>

      {error ? <p className="chip priority-HIGH" role="alert">{error}</p> : null}

      {canManage ? (
        <form className="files-upload-panel panel" action={uploadFile}>
          <label className="field">
            <span className="label">Название</span>
            <input className="input" name="title" placeholder="Например: Регламент запуска" />
          </label>
          <label className="field">
            <span className="label">Категория</span>
            <input className="input" name="category" placeholder="Регламенты, Скрипты, Шаблоны" />
          </label>
          <label className="field files-upload-description">
            <span className="label">Описание</span>
            <input className="input" name="description" placeholder="Коротко: зачем нужен файл" />
          </label>
          <label className="field files-upload-file">
            <span className="label">Файл</span>
            <input className="input" type="file" name="file" required />
          </label>
          <button className="button">
            <UploadCloud size={17} />
            Загрузить
          </button>
        </form>
      ) : null}

      <section className="files-workspace">
        <aside className="files-list-panel panel" aria-label="Список файлов">
          {loading ? <p className="muted">Загрузка...</p> : null}
          {!loading && !files.length ? <p className="muted">Файлов пока нет.</p> : null}
          {files.map((file) => (
            <button className={`important-file-row ${selected?.id === file.id ? "is-active" : ""}`} type="button" key={file.id} onClick={() => setSelectedId(file.id)}>
              <span className="important-file-icon">{iconFor(file.originalName)}</span>
              <span className="important-file-copy">
                <strong>{file.title}</strong>
                <small>{file.category || "Без категории"} · {formatBytes(file.size)}</small>
              </span>
            </button>
          ))}
        </aside>

        <main className="files-preview-panel panel">
          {selected ? (
            <>
              <div className="files-preview-head">
                <div>
                  <h2>{selected.title}</h2>
                  <p className="muted">{selected.originalName} · {formatBytes(selected.size)} · загрузил {selected.uploadedBy.name}</p>
                </div>
                <span className="spacer" />
                <a className="button secondary compact-button" href={`/api/important-files/${selected.id}/download`}>
                  <Download size={16} />
                  Скачать
                </a>
                {canManage ? (
                  <button className="button danger compact-button" type="button" onClick={() => void deleteFile(selected.id)}>
                    <Trash2 size={16} />
                    Удалить
                  </button>
                ) : null}
              </div>
              {selected.description ? <p className="files-description">{selected.description}</p> : null}
              <PreviewPane preview={preview} loading={previewLoading} />
            </>
          ) : (
            <p className="muted">Выберите файл слева.</p>
          )}
        </main>
      </section>
    </div>
  );
}

function PreviewPane({ preview, loading }: { preview: Preview | null; loading: boolean }) {
  if (loading) return <div className="files-preview-empty">Готовим предпросмотр...</div>;
  if (!preview) return <div className="files-preview-empty">Предпросмотр появится здесь.</div>;
  if (preview.type === "unsupported" || preview.type === "empty") return <div className="files-preview-empty">{preview.message}</div>;
  if (preview.type === "sheet" || preview.type === "csv") {
    const rows = preview.type === "sheet" ? preview.rows : preview.rows ?? [];
    return (
      <div className="files-sheet-preview">
        {preview.type === "sheet" ? <p className="muted">Лист: {preview.sheetName}. Показано до 200 строк и 40 столбцов.</p> : null}
        <div className="files-sheet-scroll">
          <table>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {preview.truncated ? <p className="muted">Предпросмотр усечён. Скачайте файл, чтобы увидеть всё содержимое.</p> : null}
      </div>
    );
  }
  if (preview.type === "text" || preview.type === "code") {
    return (
      <div className="files-code-preview">
        <div className="files-code-meta">{preview.language ?? "text"}</div>
        <pre>{preview.text}</pre>
        {preview.truncated ? <p className="muted">Предпросмотр усечён. Скачайте файл, чтобы увидеть всё содержимое.</p> : null}
      </div>
    );
  }
  return <div className="files-preview-empty">Предпросмотр недоступен.</div>;
}

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "csv") return <FileSpreadsheet size={18} />;
  if (ext === "docx" || ext === "doc") return <FileType2 size={18} />;
  return <FileText size={18} />;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${Math.round(value / 102.4) / 10} КБ`;
  return `${Math.round(value / 1024 / 102.4) / 10} МБ`;
}
