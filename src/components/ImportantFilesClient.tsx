"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  Download,
  Expand,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import styles from "./Documents.module.css";

type ImportantFile = {
  id: string;
  title: string;
  description: string;
  category: string;
  originalName: string;
  size: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: { name: string };
};
type Preview =
  | {
      type: "text" | "code";
      text: string;
      language?: string;
      truncated?: boolean;
    }
  | {
      type: "sheet" | "csv";
      rows: string[][];
      sheetName?: string;
      sheets?: { index: number; name: string }[];
      truncated?: boolean;
    }
  | { type: "pdf" | "image"; url: string }
  | { type: "empty" | "unsupported"; message: string };

export function ImportantFilesClient({ canManage }: { canManage: boolean }) {
  const [files, setFiles] = useState<ImportantFile[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [sheet, setSheet] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ImportantFile | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const autoTitleRef = useRef("");
  const previewDialogRef = useRef<HTMLDialogElement>(null);
  const selected = useMemo(
    () => files.find((file) => file.id === selectedId) ?? files[0] ?? null,
    [files, selectedId],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setError("");
        try {
          const params = new URLSearchParams({ q: query.trim(), category });
          const response = await fetch(`/api/important-files?${params}`, {
            cache: "no-store",
            signal: controller.signal,
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !Array.isArray(data.files))
            throw Error(
              data.error ||
                "Не удалось загрузить библиотеку. Обновите страницу.",
            );
          if (!controller.signal.aborted) {
            setFiles(data.files ?? []);
            setCategories(data.categories ?? []);
          }
        } catch (error) {
          if (!controller.signal.aborted)
            setError(
              error instanceof Error
                ? error.message
                : "Не удалось загрузить документы",
            );
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      query ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, category, refresh]);

  useEffect(() => {
    setSheet(0);
  }, [selected?.id]);
  useEffect(() => {
    const controller = new AbortController();
    setPreview(null);
    if (!selected?.id) {
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    fetch(`/api/important-files/${selected.id}/preview?sheet=${sheet}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.preview)
          throw Error(data.error || "Не удалось подготовить предпросмотр");
        if (!controller.signal.aborted) setPreview(data.preview);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setPreview({
            type: "unsupported",
            message:
              error instanceof Error
                ? error.message
                : "Предпросмотр недоступен",
          });
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewLoading(false);
      });
    return () => controller.abort();
  }, [selected?.id, sheet, refresh]);

  function chooseFile(file: File | null) {
    if (uploading) return;
    setUploadError("");
    if (file && (file.size === 0 || file.size > 50 * 1024 * 1024)) {
      setUploadError(
        file.size === 0
          ? "Файл пустой"
          : "Размер файла не должен превышать 50 МБ",
      );
      setUploadFile(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploadFile(file);
    if (!file && inputRef.current) inputRef.current.value = "";
    if (file && formRef.current) {
      const title = formRef.current.elements.namedItem(
        "title",
      ) as HTMLInputElement;
      if (!title.value || title.value === autoTitleRef.current) {
        title.value = file.name.replace(/\.[^.]+$/, "").slice(0, 180);
        autoTitleRef.current = title.value;
      }
    }
  }
  function openUpload() {
    formRef.current?.reset();
    autoTitleRef.current = "";
    setUploadFile(null);
    setUploadError("");
    dialogRef.current?.showModal();
  }
  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length !== 1) {
      setUploadError("Добавляйте по одному документу за раз");
      return;
    }
    chooseFile(event.dataTransfer.files.item(0));
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    if (!uploadFile) {
      setUploadError("Выберите документ");
      return;
    }
    const data = new FormData(event.currentTarget);
    data.set("file", uploadFile);
    setUploading(true);
    setUploadError("");
    try {
      const response = await fetch("/api/important-files", {
        method: "POST",
        body: data,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.file)
        throw Error(payload.error || "Не удалось загрузить документ");
      setFiles((current) => [
        payload.file,
        ...current.filter((file) => file.id !== payload.file.id),
      ]);
      setSelectedId(payload.file.id);
      setMobilePreview(true);
      setQuery("");
      setCategory("");
      setRefresh((value) => value + 1);
      dialogRef.current?.close();
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить документ",
      );
    } finally {
      setUploading(false);
    }
  }
  async function remove() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/important-files/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw Error(data.error || "Не удалось удалить документ");
      }
      setFiles((current) =>
        current.filter((file) => file.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      setMobilePreview(false);
      setRefresh((value) => value + 1);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Не удалось удалить документ",
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }
  const downloadUrl = selected
    ? `/api/important-files/${selected.id}/download`
    : "";
  return (
    <div className={`content ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <h1>Документы</h1>
          <span className="muted">
            {files.length} документов · {categories.length} категорий
          </span>
        </div>
        {canManage ? (
          <button
            ref={triggerRef}
            type="button"
            className="button files-upload-trigger"
            onClick={openUpload}
          >
            <UploadCloud size={17} />
            Добавить документ
          </button>
        ) : null}
      </header>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={17} />
          <input
            aria-label="Поиск по документам"
            placeholder="Название, описание или файл"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          className="select"
          aria-label="Категория документов"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">Все категории</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        {query || category ? (
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("");
            }}
          >
            <X size={16} />
            Сбросить
          </button>
        ) : null}
        <button
          className="button icon secondary"
          type="button"
          aria-label="Обновить библиотеку"
          title="Обновить библиотеку"
          onClick={() => setRefresh((value) => value + 1)}
        >
          <RefreshCw size={17} />
        </button>
      </div>
      {error ? (
        <p className="task-modal-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.workspace} data-mobile-preview={mobilePreview}>
        <aside className={styles.library} aria-label="Библиотека документов">
          <header>
            <FolderOpen size={17} />
            <h2>Библиотека</h2>
            <span>{files.length}</span>
          </header>
          <div className={styles.fileList} aria-busy={loading}>
            {loading ? (
              <p role="status" className={styles.status}>
                Загрузка…
              </p>
            ) : null}
            {!loading && !files.length ? (
              <p className={styles.status}>
                {query || category
                  ? "Документы не найдены"
                  : "В библиотеке пока нет документов"}
              </p>
            ) : null}
            {files.map((file) => (
              <button
                type="button"
                className={styles.fileRow}
                aria-pressed={selected?.id === file.id}
                key={file.id}
                onClick={() => {
                  setSelectedId(file.id);
                  setMobilePreview(true);
                }}
              >
                <span className={styles.fileIcon}>
                  {/\.(csv|xlsx?|ods)$/i.test(file.originalName) ? (
                    <FileSpreadsheet size={21} />
                  ) : (
                    <FileText size={21} />
                  )}
                </span>
                <span>
                  <strong>{file.title}</strong>
                  <small>
                    {file.category || "Без категории"} · {bytes(file.size)}
                  </small>
                  <small>{file.originalName}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>
        <section className={styles.preview} aria-label="Предпросмотр документа">
          {selected ? (
            <>
              <header className={styles.previewHead}>
                <button
                  className={`button icon secondary ${styles.back}`}
                  type="button"
                  aria-label="Назад к библиотеке"
                  onClick={() => setMobilePreview(false)}
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2>{selected.title}</h2>
                  <p>{selected.originalName}</p>
                  <small>
                    {bytes(selected.size)} ·{" "}
                    {selected.uploadedBy?.name ?? "Неизвестно"} ·{" "}
                    {new Date(selected.createdAt).toLocaleDateString("ru-RU")}
                  </small>
                </div>
                <div className={styles.actions}>
                  <button
                    className="button icon secondary"
                    type="button"
                    title="Раскрыть предпросмотр"
                    aria-label="Раскрыть предпросмотр"
                    onClick={() => {
                      setExpanded(true);
                      previewDialogRef.current?.showModal();
                    }}
                  >
                    <Expand size={17} />
                  </button>
                  <a
                    className="button icon secondary"
                    href={downloadUrl}
                    title="Скачать документ"
                    aria-label="Скачать документ"
                  >
                    <Download size={17} />
                  </a>
                  {canManage ? (
                    <button
                      className="button icon secondary"
                      type="button"
                      disabled={deleting}
                      title="Удалить документ"
                      aria-label="Удалить документ"
                      onClick={() => setDeleteTarget(selected)}
                    >
                      <Trash2 size={17} />
                    </button>
                  ) : null}
                </div>
              </header>
              {selected.description ? (
                <p className={styles.description}>{selected.description}</p>
              ) : null}
              <PreviewPane
                preview={preview}
                loading={previewLoading}
                name={selected.originalName}
                sheet={sheet}
                onSheet={setSheet}
              />
            </>
          ) : (
            <div className={styles.empty}>
              <FileText size={32} />
              <p>Выберите документ в библиотеке</p>
            </div>
          )}
        </section>
      </div>
      <dialog
        ref={previewDialogRef}
        className={styles.previewDialog}
        onClose={() => setExpanded(false)}
      >
        <header>
          <h2>{selected?.title}</h2>
          <button
            className="button icon secondary"
            type="button"
            aria-label="Закрыть предпросмотр"
            onClick={() => previewDialogRef.current?.close()}
          >
            <X size={18} />
          </button>
        </header>
        {expanded ? (
          <PreviewPane
            preview={preview}
            loading={previewLoading}
            name={selected?.originalName ?? ""}
            sheet={sheet}
            onSheet={setSheet}
          />
        ) : null}
      </dialog>
      {canManage ? (
        <dialog
          ref={dialogRef}
          className={styles.uploadDialog}
          aria-labelledby="upload-document-title"
          onCancel={(event) => {
            if (uploading) event.preventDefault();
          }}
          onClose={() => {
            setDragging(false);
            triggerRef.current?.focus();
          }}
        >
          <form ref={formRef} onSubmit={upload}>
            <header>
              <h2 id="upload-document-title">Добавить документ</h2>
              <button
                className="button icon secondary"
                type="button"
                disabled={uploading}
                aria-label="Закрыть окно загрузки"
                onClick={() => dialogRef.current?.close()}
              >
                <X size={18} />
              </button>
            </header>
            <div className={styles.uploadBody}>
              <div
                className={styles.dropzone}
                data-active={dragging}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={drop}
              >
                <UploadCloud size={32} />
                <strong>
                  {uploadFile?.name || "Перетащите документ сюда"}
                </strong>
                <span>{uploadFile ? bytes(uploadFile.size) : "До 50 МБ"}</span>
                <button
                  className="button secondary"
                  type="button"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                >
                  Выбрать файл
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  hidden
                  onChange={(event) =>
                    chooseFile(event.target.files?.item(0) ?? null)
                  }
                />
                {uploadFile ? (
                  <button
                    className="button icon secondary"
                    type="button"
                    disabled={uploading}
                    title="Убрать файл"
                    aria-label="Убрать выбранный файл"
                    onClick={() => chooseFile(null)}
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
              <label className="field">
                <span className="label">Название</span>
                <input
                  className="input"
                  name="title"
                  minLength={2}
                  maxLength={180}
                  required
                  disabled={uploading}
                />
              </label>
              <label className="field">
                <span className="label">Категория</span>
                <input
                  className="input"
                  name="category"
                  list="document-categories"
                  maxLength={80}
                  disabled={uploading}
                />
                <datalist id="document-categories">
                  {categories.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>
              <label className="field">
                <span className="label">Описание</span>
                <textarea
                  className="textarea"
                  name="description"
                  maxLength={2000}
                  rows={3}
                  disabled={uploading}
                />
              </label>
              {uploadError ? (
                <p className="task-modal-error" role="alert">
                  {uploadError}
                </p>
              ) : null}
              {uploading ? <progress aria-label="Загрузка документа" /> : null}
            </div>
            <footer>
              <button
                className="button secondary"
                type="button"
                disabled={uploading}
                onClick={() => dialogRef.current?.close()}
              >
                Отмена
              </button>
              <button
                className="button"
                type="submit"
                disabled={uploading || !uploadFile}
              >
                <UploadCloud size={17} />
                {uploading ? "Загружаем…" : "Добавить"}
              </button>
            </footer>
          </form>
        </dialog>
      ) : null}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Удалить документ?"
        description={`«${deleteTarget?.title ?? ""}» будет удалён из библиотеки без возможности восстановления.`}
        confirmLabel={deleting ? "Удаляем…" : "Удалить"}
        tone="danger"
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

function PreviewPane({
  preview,
  loading,
  name,
  sheet,
  onSheet,
}: {
  preview: Preview | null;
  loading: boolean;
  name: string;
  sheet: number;
  onSheet: (value: number) => void;
}) {
  if (loading)
    return (
      <div className={styles.empty} role="status">
        Готовим предпросмотр…
      </div>
    );
  if (!preview)
    return <div className={styles.empty}>Предпросмотр появится здесь</div>;
  if (preview.type === "empty" || preview.type === "unsupported")
    return <div className={styles.empty}>{preview.message}</div>;
  if (preview.type === "pdf")
    return (
      <iframe className={styles.pdf} src={preview.url} title={`PDF: ${name}`} />
    );
  if (preview.type === "image")
    return (
      <div className={styles.image}>
        <img src={preview.url} alt={name} />
      </div>
    );
  if (preview.type === "sheet" || preview.type === "csv")
    return (
      <div className={styles.sheet}>
        {preview.sheets?.length ? (
          <select
            className="select"
            aria-label="Лист Excel"
            value={sheet}
            onChange={(event) => onSheet(Number(event.target.value))}
          >
            {preview.sheets.map((item) => (
              <option key={item.index} value={item.index}>
                {item.name}
              </option>
            ))}
          </select>
        ) : null}
        <div className={styles.tableScroll}>
          <table>
            <tbody>
              {preview.rows.map((row, index) => (
                <tr key={index}>
                  <th scope="row">{index + 1}</th>
                  {row.map((cell, column) => (
                    <td key={column}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {preview.truncated ? (
          <p className="muted">
            Показана часть таблицы. Полная версия доступна для скачивания.
          </p>
        ) : null}
      </div>
    );
  if (preview.type === "text" || preview.type === "code")
    return (
      <div className={styles.text} data-code={preview.type === "code"}>
        <pre>{preview.text}</pre>
        {preview.truncated ? (
          <p className="muted">
            Показана часть документа. Полная версия доступна для скачивания.
          </p>
        ) : null}
      </div>
    );
  return null;
}
function bytes(size: number) {
  return size < 1024
    ? `${size} Б`
    : size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} КБ`
      : `${(size / 1024 / 1024).toFixed(1)} МБ`;
}
