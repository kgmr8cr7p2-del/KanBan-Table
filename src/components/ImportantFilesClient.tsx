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
    // The first request uses the initial URL state; subsequent searches are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) {
      setPreview(null);
      return;
    }
    setSelectedId(selected.id);
    void loadPreview(selected.id);
  }, [selected]);

  async function loadFiles(nextQuery = query, nextCategory = category) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextCategory) params.set("category", nextCategory);
    try {
      const response = await fetch(`/api/important-files?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Не удалось загрузить файлы");
        return;
      }
      setFiles(Array.isArray(payload.files) ? payload.files : []);
      setCategories(Array.isArray(payload.categories) ? payload.categories : []);
    } catch {
      setError("Не удалось загрузить файлы. Проверьте соединение и повторите попытку.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPreview(id: string) {
    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/important-files/${id}/preview`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      setPreview(response.ok ? payload.preview : { type: "unsupported", message: payload.error ?? "Предпросмотр недоступен" });
    } catch {
      setPreview({ type: "unsupported", message: "Предпросмотр недоступен без соединения с сервером" });
    } finally {
      setPreviewLoading(false);
    }
  }

  async function uploadFile(formData: FormData) {
    setError("");
    try {
      const response = await fetch("/api/important-files", { method: "POST", body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Не удалось загрузить файл");
        return;
      }
      setSelectedId(payload.file?.id ?? null);
      await loadFiles();
    } catch {
      setError("Не удалось загрузить файл. Проверьте соединение и повторите попытку.");
    }
  }

  async function deleteFile(id: string) {
    if (!window.confirm("Удалить файл из общего хранилища?")) return;
    try {
      const response = await fetch(`/api/important-files/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? "Не удалось удалить файл");
        return;
      }
      setSelectedId(null);
      await loadFiles();
    } catch {
      setError("Не удалось удалить файл. Проверьте соединение и повторите попытку.");
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadFiles();
  }

  return (
    <div className="content important-files-page">
      <header className="files-head">
        <div className="files-head-copy">
          <span className="settings-page-kicker"><ShieldCheck size={17} /> Документы команды</span>
          <h1>Документы</h1>
          <p>Регламенты, инструкции и шаблоны — в одной библиотеке с быстрым предпросмотром.</p>
        </div>
        <div className="files-head-summary" aria-label="Сводка документов">
          <span><strong>{files.length}</strong><small>найдено</small></span>
          <span><strong>{categories.length}</strong><small>категорий</small></span>
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
          <div className="files-upload-intro">
            <span className="files-upload-intro-icon"><UploadCloud size={20} aria-hidden="true" /></span>
            <span>
              <strong>Добавить в библиотеку</strong>
              <small>Сохраните регламент, шаблон или инструкцию для всей команды.</small>
            </span>
          </div>
          <label className="field files-upload-title">
            <span className="label">Название</span>
            <input className="input" name="title" placeholder="Например: Регламент запуска" />
          </label>
          <label className="field files-upload-category">
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
          <header className="files-list-head">
            <div>
              <span>Библиотека</span>
              <strong>Все документы</strong>
            </div>
            <b>{loading ? "…" : files.length}</b>
          </header>
          {loading ? <p className="files-list-status" role="status">Загрузка библиотеки...</p> : null}
          {!loading && !files.length ? (
            <div className="files-empty-state">
              <span><FileText size={20} aria-hidden="true" /></span>
              <strong>{query || category ? "Ничего не найдено" : "Документов пока нет"}</strong>
              <p>{query || category ? "Измените запрос или сбросьте фильтр." : "Загрузите первый файл, чтобы команда могла быстро его найти."}</p>
            </div>
          ) : null}
          {files.map((file) => (
            <button className={`important-file-row file-kind-${fileKind(file.originalName)} ${selected?.id === file.id ? "is-active" : ""}`} type="button" aria-pressed={selected?.id === file.id} key={file.id} onClick={() => setSelectedId(file.id)}>
              <span className="important-file-icon">{iconFor(file.originalName)}</span>
              <span className="important-file-copy">
                <strong>{file.title}</strong>
                <small><span className="important-file-kind">{fileKindLabel(file.originalName)}</span><span aria-hidden="true"> · </span>{file.category || "Без категории"} · {formatBytes(file.size)}</small>
              </span>
            </button>
          ))}
        </aside>

        <main className="files-preview-panel panel">
          {selected ? (
            <>
              <div className="files-preview-head">
                <div className="files-preview-title">
                  <span className="files-preview-kicker"><FileText size={14} aria-hidden="true" /> Предпросмотр</span>
                  <h2>{selected.title}</h2>
                  <p className="muted">{selected.originalName} · {formatBytes(selected.size)} · загрузил {selected.uploadedBy.name}</p>
                </div>
                <div className="files-preview-actions">
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
              </div>
              {selected.description ? <p className="files-description">{selected.description}</p> : null}
              <PreviewPane preview={preview} loading={previewLoading} />
            </>
          ) : (
            <div className="files-preview-empty files-preview-empty-start" role="status">
              <FileText size={22} aria-hidden="true" />
              <strong>Выберите документ</strong>
              <span>Здесь появится его описание и содержимое.</span>
            </div>
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
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return <FileSpreadsheet size={18} />;
  if (ext === "docx" || ext === "doc") return <FileType2 size={18} />;
  return <FileText size={18} />;
}

function fileKind(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "sheet";
  if (ext === "docx" || ext === "doc" || ext === "pdf") return "document";
  if (ext === "md" || ext === "txt" || ext === "json" || ext === "xml" || ext === "yaml" || ext === "yml") return "text";
  return "other";
}

function fileKindLabel(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "Таблица";
  if (ext === "docx" || ext === "doc") return "Документ";
  if (ext === "pdf") return "PDF";
  if (ext === "md" || ext === "txt" || ext === "json" || ext === "xml" || ext === "yaml" || ext === "yml") return "Текст";
  return ext ? ext.toUpperCase() : "Файл";
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${Math.round(value / 102.4) / 10} КБ`;
  return `${Math.round(value / 1024 / 102.4) / 10} МБ`;
}
