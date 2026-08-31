"use client";

import { type DragEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText, FileType2, Search, ShieldCheck, Trash2, UploadCloud, X } from "lucide-react";

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
  const [uploadSelection, setUploadSelection] = useState<File | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const uploadDialogRef = useRef<HTMLDialogElement>(null);
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const uploadTriggerRef = useRef<HTMLButtonElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const dialog = uploadDialogRef.current;
    if (!dialog) return;

    function handleClose() {
      setIsDropActive(false);
      setUploadSelection(null);
      uploadFormRef.current?.reset();
      uploadTriggerRef.current?.focus();
    }

    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

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
      uploadDialogRef.current?.close();
    } catch {
      setError("Не удалось загрузить файл. Проверьте соединение и повторите попытку.");
    }
  }

  function openUploadDialog() {
    setError("");
    const dialog = uploadDialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      requestAnimationFrame(() => dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus());
    }
  }

  function closeUploadDialog() {
    uploadDialogRef.current?.close();
  }

  function setSelectedUploadFile(file: File | null) {
    setUploadSelection(file);
    if (!file) {
      if (uploadInputRef.current) uploadInputRef.current.value = "";
      return;
    }

    if (uploadInputRef.current) {
      try {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        uploadInputRef.current.files = dataTransfer.files;
      } catch {
        // Browsers that do not allow assigning FileList still support the picker.
      }
    }
  }

  function handleUploadDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDropActive(false);
    setSelectedUploadFile(event.dataTransfer.files.item(0));
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
        <div className="files-upload-launcher">
          <div className="files-upload-launcher-copy">
            <span className="files-upload-launcher-icon"><UploadCloud size={20} aria-hidden="true" /></span>
            <span>
              <strong>Добавьте документ в библиотеку</strong>
              <small>Регламенты, инструкции и шаблоны для всей команды.</small>
            </span>
          </div>
          <button ref={uploadTriggerRef} className="button files-upload-trigger" type="button" onClick={openUploadDialog}>
            <UploadCloud size={17} aria-hidden="true" />
            Загрузить файл
          </button>
        </div>
      ) : null}

      {canManage ? (
        <dialog
          ref={uploadDialogRef}
          className="files-upload-dialog"
          aria-labelledby="files-upload-dialog-title"
          aria-describedby="files-upload-dialog-description"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeUploadDialog();
          }}
        >
          <form ref={uploadFormRef} className="files-upload-dialog-card" action={uploadFile}>
            <header className="files-upload-dialog-head">
              <div className="files-upload-dialog-icon"><UploadCloud size={24} aria-hidden="true" /></div>
              <div className="files-upload-dialog-heading">
                <span className="files-upload-dialog-kicker">Документы команды</span>
                <h2 id="files-upload-dialog-title">Загрузить файл</h2>
                <p id="files-upload-dialog-description">Выберите файл или перетащите его в окно.</p>
              </div>
              <button className="files-upload-dialog-close" type="button" aria-label="Закрыть окно загрузки" onClick={closeUploadDialog}>
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <div className="files-upload-dialog-body">
              <label
                className={`files-dropzone ${isDropActive ? "is-active" : ""} ${uploadSelection ? "has-file" : ""}`}
                htmlFor="files-upload-file-input"
                onDragEnter={(event) => { event.preventDefault(); setIsDropActive(true); }}
                onDragOver={(event) => { event.preventDefault(); setIsDropActive(true); }}
                onDragLeave={() => setIsDropActive(false)}
                onDrop={handleUploadDrop}
              >
                <span className="files-dropzone-icon"><UploadCloud size={28} aria-hidden="true" /></span>
                <strong>{uploadSelection ? uploadSelection.name : "Выберите файл или перетащите его сюда"}</strong>
                <small>{uploadSelection ? `${formatBytes(uploadSelection.size)} · готов к загрузке` : "TXT, DOCX, PDF, XLSX · до 50 МБ"}</small>
                <span className="button secondary files-dropzone-button">Выбрать файл</span>
                <input
                  ref={uploadInputRef}
                  id="files-upload-file-input"
                  className="files-upload-file-input"
                  type="file"
                  name="file"
                  required
                  onChange={(event) => setSelectedUploadFile(event.currentTarget.files?.item(0) ?? null)}
                />
              </label>

              {uploadSelection ? (
                <div className="files-upload-selected">
                  <span className="important-file-icon">{iconFor(uploadSelection.name)}</span>
                  <span>
                    <strong>{uploadSelection.name}</strong>
                    <small>{formatBytes(uploadSelection.size)} · файл выбран</small>
                  </span>
                  <button className="files-upload-selected-remove" type="button" aria-label={`Убрать файл ${uploadSelection.name}`} onClick={() => setSelectedUploadFile(null)}>
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
              ) : null}

              <div className="files-upload-dialog-fields">
                <label className="field">
                  <span className="label">Название</span>
                  <input className="input" name="title" placeholder="Например: Регламент запуска" />
                </label>
                <label className="field">
                  <span className="label">Категория</span>
                  <input className="input" name="category" placeholder="Регламенты, Скрипты, Шаблоны" />
                </label>
                <label className="field files-upload-dialog-description">
                  <span className="label">Описание</span>
                  <textarea className="textarea" name="description" rows={3} placeholder="Коротко: зачем нужен файл" />
                </label>
              </div>

              {error ? <p className="files-upload-dialog-error" role="alert">{error}</p> : null}
            </div>

            <footer className="files-upload-dialog-actions">
              <button className="button secondary" type="button" onClick={closeUploadDialog}>Отмена</button>
              <button className="button" type="submit" data-autofocus>
                <UploadCloud size={17} aria-hidden="true" />
                Загрузить файл
              </button>
            </footer>
          </form>
        </dialog>
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
