"use client";

import { useState } from "react";
import { Building2, Search, Users, X } from "lucide-react";
import styles from "./OilDepotDirectory.module.css";

type Depot = { name: string; os: string; timezone: string; owner: string; equipment: string };

export function OilDepotDirectory({ depots }: { depots: Depot[] }) {
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("");
  const [os, setOs] = useState("");
  const owners = [...new Set(depots.map((d) => d.owner))].sort((a, b) => a.localeCompare(b, "ru"));
  const systems = [...new Set(depots.map((d) => d.os))].sort();
  const needle = query.trim().toLocaleLowerCase("ru").replaceAll("ё", "е");
  const visible = depots.filter((d) => (!owner || d.owner === owner) && (!os || d.os === os) &&
    Object.values(d).join(" ").toLocaleLowerCase("ru").replaceAll("ё", "е").includes(needle));
  const filtered = Boolean(query || owner || os);
  function reset() { setQuery(""); setOwner(""); setOs(""); }

  return <div className={`content insights-page ${styles.directory}`}>
    <section className="page-heading">
      <h1>Нефтебазы</h1>
      <p className="muted">Ответственные и состав АСУ ТП по объектам.</p>
    </section>
    <div className={styles.overview}>
      <div><Building2 size={20} aria-hidden="true" /><span><strong>{depots.length}</strong> нефтебаз</span></div>
      <div><Users size={20} aria-hidden="true" /><span><strong>{owners.length}</strong> ответственных</span></div>
    </div>
    <section className={styles.panel} aria-label="Справочник нефтебаз">
      <div className={styles.filters}>
        <label className={styles.search}><span>Поиск</span><div><Search size={18} aria-hidden="true" /><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Нефтебаза, сотрудник, оборудование" /></div></label>
        <label><span>Ответственный</span><select aria-label="Ответственный" className="input" value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">Все ответственные</option>{owners.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label><span>Операционная система</span><select aria-label="Операционная система" className="input" value={os} onChange={(e) => setOs(e.target.value)}><option value="">Все ОС</option>{systems.map((name) => <option key={name}>{name}</option>)}</select></label>
      </div>
      <div className={styles.results}><span className="muted" role="status">Показано {visible.length} из {depots.length}</span>{filtered && <button type="button" className="button secondary" onClick={reset}><X size={15} aria-hidden="true" />Сбросить</button>}</div>
      {visible.length ? <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Таблица нефтебаз, доступна горизонтальная прокрутка">
        <table className={styles.table}>
          <caption>Нефтебазы и ответственные за АСУ ТП</caption>
          <thead><tr><th scope="col">Нефтебаза</th><th scope="col">Ответственный</th><th scope="col">ОС</th><th scope="col">Часовой пояс</th><th scope="col">Состав АСУ ТП</th></tr></thead>
          <tbody>{visible.map((d) => <tr key={d.name}><th scope="row">{d.name}</th><td><span className={styles.owner}>{d.owner}</span></td><td><span className={styles.os}>{d.os}</span></td><td>{d.timezone}</td><td className={styles.equipment}>{d.equipment}</td></tr>)}</tbody>
        </table>
      </div> : <div className={styles.empty}><Search size={28} aria-hidden="true" /><h2>Нефтебазы не найдены</h2><p className="muted">Измените запрос или сбросьте фильтры.</p><button className="button secondary" type="button" onClick={reset}>Сбросить фильтры</button></div>}
    </section>
    <p className={`muted ${styles.note}`}>Источник: Нефтебазы_АСУ_ТП.xlsx. Ответственные и часовые пояса приведены как в исходной таблице. В источнике отмечено, что инициалы перенесены с фотографии и требуют проверки.</p>
  </div>;
}
