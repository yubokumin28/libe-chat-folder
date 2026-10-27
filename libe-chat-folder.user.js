// ==UserScript==
// @name         リベ チャット フォルダー
// @namespace    https://github.com/yubokumin28/libe-chat-folder
// @version      0.4.0
// @description  リベシティのチャット一覧をフォルダー分け・並び替えし、フォルダーごとの通知の合計を出します。選んだ文字をGoogleカレンダーに登録できます。
// @author       遊牧民
// @match        https://libecity.com/*
// @icon         https://raw.githubusercontent.com/yubokumin28/libe-chat-folder/main/icon128.png
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_addStyle
// @grant        GM_openInTab
// @run-at       document-idle
// @homepageURL  https://yubokumin28.github.io/libe-chat-folder/
// @updateURL    https://raw.githubusercontent.com/yubokumin28/libe-chat-folder/main/libe-chat-folder.user.js
// @downloadURL  https://raw.githubusercontent.com/yubokumin28/libe-chat-folder/main/libe-chat-folder.user.js
// ==/UserScript==
// ⛔ このファイルは tools/build_userscript.py が作る。直接直さない(正本は extension/ の中)
(function () {
'use strict';
GM_addStyle(`/* リベ チャット フォルダー: 並びは order で決めるので一覧を縦の flex にする */
.content_chatlist[data-lcf] { display: flex !important; flex-direction: column; }
/* 本物の一覧は高さ固定のスクロール枠なので、縮めずに並べる(縮むとチャットが潰れる) */
.content_chatlist[data-lcf] > * { flex-shrink: 0; }
.content_chatlist[data-lcf] > .chat_item { position: relative; }
.content_chatlist[data-lcf] > .chat_item[data-lcf-hidden] { display: none !important; }
.content_chatlist[data-lcf] > .chat_item[data-lcf-dragging],
.content_chatlist[data-lcf] > .lcf-head[data-lcf-dragging] { opacity: .45; }

/* 上の操作帯 */
.lcf-bar { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 6px 4px; font-size: 12px; }
.lcf-btn { border: 1px solid #2b7de9; background: #2b7de9; color: #fff; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; line-height: 1.4; }
.lcf-btn.lcf-sub { background: #fff; color: #2b7de9; }
.lcf-btn:hover { filter: brightness(1.06); }
.lcf-btn.lcf-help { background: #16a34a; border-color: #16a34a; }
.lcf-btn.lcf-gear { padding: 4px 8px; }

/* Tampermonkey 版: 文字を選ぶと出る「📅 Googleカレンダーに登録」 */
.lcf-cal { position: fixed; z-index: 2147483000; border: 0; border-radius: 18px; padding: 7px 14px; background: #1a73e8; color: #fff;
  font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,.22); white-space: nowrap; }
.lcf-cal:hover { background: #1765cc; }
.lcf-hint { width: 100%; color: #8a8f98; font-size: 11px; }

/* フォルダーの見出し */
.lcf-head { display: flex; align-items: center; gap: 6px; margin: 8px 4px 2px; padding: 7px 8px; border-radius: 8px;
  background: #eef3fb; color: #2a3445; font-size: 13px; font-weight: 700; cursor: pointer; user-select: none; }
.lcf-head:hover { background: #e3ecf9; }
.lcf-head[data-lcf-solo] { display: none; }
.lcf-head[data-lcf-fid="__none__"] { background: #f4f5f7; }
.lcf-caret { width: 12px; font-size: 10px; color: #6b7480; }
.lcf-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lcf-count { flex: none; color: #8a8f98; font-weight: 400; font-size: 11px; }
.lcf-unread { flex: none; display: none; background: #e5484d; color: #fff; border-radius: 10px; padding: 1px 8px; font-size: 11px; }
.lcf-unread[data-lcf-on] { display: inline-block; }
.lcf-all { flex: none; display: none; background: #e59500; color: #fff; border-radius: 10px; padding: 1px 8px; font-size: 11px; }
.lcf-all[data-lcf-on] { display: inline-block; }
.lcf-icon { flex: none; font-size: 15px; line-height: 1; }
.lcf-icon[data-act] { cursor: pointer; padding: 2px 3px; border-radius: 6px; }
.lcf-icon[data-act]:hover { background: #d6e2f5; }
/* 編集ボタン: いつも見えるように白い札にする(前の ✎ は小さく薄くて見えにくかった) */
.lcf-edit { flex: none; border: 1px solid #b9c7da; background: #fff; color: #3d4a5c; cursor: pointer;
  font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px; line-height: 1.4; }
.lcf-edit:hover { background: #2b7de9; border-color: #2b7de9; color: #fff; }

/* 落とし先の印 */
[data-lcf-drop="before"] { box-shadow: inset 0 3px 0 #2b7de9; }
[data-lcf-drop="after"] { box-shadow: inset 0 -3px 0 #2b7de9; }
[data-lcf-drop="into"] { outline: 2px dashed #2b7de9; outline-offset: -2px; }

/* チャットの 📁 ボタン(マウスを乗せた時だけ出る) */
.lcf-move { position: absolute; left: 2px; bottom: 2px; z-index: 3; width: 22px; height: 22px; padding: 0;
  border: 1px solid #c9d3e0; border-radius: 6px; background: #fff; font-size: 12px; line-height: 20px; cursor: pointer;
  opacity: 0; transition: opacity .12s; }
.chat_item:hover > .lcf-move, .lcf-move:focus { opacity: 1; }

/* 📁 のメニュー */
.lcf-menu { position: fixed; z-index: 2147483000; min-width: 200px; max-width: 320px; max-height: 60vh; overflow: auto;
  background: #fff; border: 1px solid #d5dbe3; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.16); padding: 4px; }
.lcf-menu-item { display: block; width: 100%; text-align: left; border: 0; background: transparent; padding: 7px 10px;
  border-radius: 6px; font-size: 13px; color: #2a3445; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lcf-menu-item:hover { background: #eef3fb; }
.lcf-menu-item.lcf-on { font-weight: 700; color: #2b7de9; }
.lcf-menu-sep { height: 1px; background: #e6e9ee; margin: 4px 6px; }
.lcf-menu-title { padding: 6px 10px 4px; font-size: 11px; color: #8a8f98; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lcf-menu.lcf-menu-wide { max-width: none; width: 300px; max-height: 80vh; }
.lcf-menu-note { padding: 2px 10px 6px; font-size: 11px; color: #6b7480; line-height: 1.5; white-space: normal; }
.lcf-input-row { display: flex; gap: 6px; padding: 4px 8px 4px; }
.lcf-input { flex: 1 1 auto; min-width: 0; border: 2px solid #2b7de9; border-radius: 6px; padding: 6px 8px; font-size: 16px; outline: none; }
.lcf-input-ok { flex: none; border: 0; background: #2b7de9; color: #fff; border-radius: 6px; padding: 0 12px; font-size: 13px; font-weight: 700; cursor: pointer; }
.lcf-menu-item.lcf-danger { color: #d1343a; }
.lcf-menu-item.lcf-danger:hover { background: #fdecec; }
.lcf-icon-grid { display: grid; grid-template-columns: repeat(8, 32px); gap: 2px; padding: 4px 6px; }
.lcf-icon-pick { width: 32px; height: 32px; border: 1px solid transparent; background: transparent; border-radius: 6px;
  font-size: 18px; line-height: 1; cursor: pointer; padding: 0; }
.lcf-icon-pick:hover { background: #eef3fb; }
.lcf-icon-pick.lcf-on { border-color: #2b7de9; background: #eef3fb; }
`);
// ---------- dateparse.js ----------
// 選んだ文字から日付・時刻・場所を拾い、Googleカレンダーの「予定を作成」画面のURLを作る。
// ログインやAPIキーは使わない(Googleの公式の下書きURL)。最後の「保存」は利用者が押す。

const WEEK = '日月火水木金土';
// 時刻1つ分: 8:00 / 8時 / 8時30分 / 8時半
const T = String.raw`(\d{1,2})(?::(\d{2})|時(?!間)(?:(\d{1,2})分|(半))?)`;
const AMPM = String.raw`(午前|午後|AM|PM|am|pm)?\s*`;
const RANGE_RE = new RegExp(AMPM + T + String.raw`\s*(?:[-~〜ー−–—]|から)\s*(翌日)?\s*` + AMPM + T);
const SINGLE_RE = new RegExp(AMPM + T);

function hm(ampm, h, mm, m2, half) {
  let hour = Number(h);
  const min = mm != null ? Number(mm) : m2 != null ? Number(m2) : half ? 30 : 0;
  if (ampm && /午後|pm/i.test(ampm) && hour < 12) hour += 12;
  if (hour > 24 || min > 59) return null;
  return { h: hour, m: min };
}

function sameOrNext(base, add) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + add);
  return d;
}

// 年が書かれていない日付: 90日より前なら来年の話とみなす(10月に「1/5」と書いたら来年1月)
function guessYear(m, d, now) {
  const y = now.getFullYear();
  const cand = new Date(y, m - 1, d);
  const limit = sameOrNext(now, -90);
  return cand < limit ? y + 1 : y;
}

function findDate(s, now) {
  let r;
  if ((r = /(\d{4})\s*[\/年.\-]\s*(\d{1,2})\s*[\/月.\-]\s*(\d{1,2})/.exec(s))) {
    return { y: +r[1], m: +r[2], d: +r[3], at: r.index, end: r.index + r[0].length };
  }
  if ((r = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/.exec(s))) {
    return { y: guessYear(+r[1], +r[2], now), m: +r[1], d: +r[2], at: r.index, end: r.index + r[0].length };
  }
  // 11/28 の形。分数や URL の一部(数字や / が前後に続く)は外す
  const re = /(?<![\d\/])(\d{1,2})\/(\d{1,2})(?![\d\/])/g;
  while ((r = re.exec(s))) {
    const m = +r[1], d = +r[2];
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { y: guessYear(m, d, now), m, d, at: r.index, end: r.index + r[0].length };
    }
  }
  const rel = [[/明後日|あさって/, 2], [/明日|あした/, 1], [/今日|本日/, 0]];
  for (const [re2, add] of rel) {
    if ((r = re2.exec(s))) {
      const d = sameOrNext(now, add);
      return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), at: r.index, end: r.index + r[0].length };
    }
  }
  // 曜日だけ「(火)20:00〜」「火曜」→ 今日以降で一番近いその曜日
  if ((r = /[(（]([日月火水木金土])[)）]|([日月火水木金土])曜/.exec(s))) {
    const want = WEEK.indexOf(r[1] || r[2]);
    const d = sameOrNext(now, (want - now.getDay() + 7) % 7);
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), at: r.index, end: r.index + r[0].length, weekdayOnly: true };
  }
  return null;
}

function findTimes(s, from) {
  const tail = s.slice(from);
  for (const src of [tail, s]) {
    let r = RANGE_RE.exec(src);
    if (r) {
      const a = hm(r[1], r[2], r[3], r[4], r[5]);
      const b = hm(r[7] || r[1], r[8], r[9], r[10], r[11]);
      if (a && b) return { start: a, end: b, nextDay: !!r[6] };
    }
    r = SINGLE_RE.exec(src);
    if (r) {
      const a = hm(r[1], r[2], r[3], r[4], r[5]);
      if (a) return { start: a, end: null, nextDay: false };
    }
  }
  return null;
}

// 題名: 「日時:」「場所:」のような項目行は飛ばし、最初の普通の行を使う
function firstLine(text) {
  const lines = (text || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const label = /^[【\[]?(?:日時|日程|開催日|時間|場所|会場|開催場所|集合場所|参加費|定員)[】\]]?\s*[:：]/;
  const line = lines.find(x => !label.test(x)) || lines[0] || '';
  return line.length > 80 ? line.slice(0, 80) + '…' : line;
}

function findPlace(s) {
  const r = /(?:開催場所|集合場所|場所|会場)\s*[:：]\s*([^\n]+)/.exec(s);
  return r ? r[1].trim().slice(0, 100) : '';
}

function parseEvent(text, now = new Date()) {
  const s = (text || '').normalize('NFKC');
  const date = findDate(s, now);
  const times = findTimes(s, date ? date.at : 0);
  const base = date ? new Date(date.y, date.m - 1, date.d) : sameOrNext(now, 0);
  const ev = {
    title: firstLine(text) || 'リベシティの予定',
    place: findPlace(s),
    foundDate: !!date,
    foundTime: !!times,
    allDay: !times,
  };
  if (!times) {
    ev.start = base;
    ev.end = sameOrNext(base, 1);
    return ev;
  }
  ev.start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), times.start.h, times.start.m);
  if (times.end) {
    let end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), times.end.h, times.end.m);
    if (times.nextDay || end <= ev.start) end = new Date(end.getTime() + 24 * 3600e3);
    ev.end = end;
  } else {
    ev.end = new Date(ev.start.getTime() + 3600e3); // 終わりが無ければ1時間
  }
  return ev;
}

const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const ymdhm = d => `${ymd(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

function calendarUrl(ev, text, pageUrl) {
  let details = (text || '').trim();
  if (details.length > 1500) details = details.slice(0, 1500) + '…';
  if (pageUrl) details += `\n\n元のページ: ${pageUrl}`;
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: ev.allDay ? `${ymd(ev.start)}/${ymd(ev.end)}` : `${ymdhm(ev.start)}/${ymdhm(ev.end)}`,
    details,
    ctz: 'Asia/Tokyo',
  });
  if (ev.place) p.set('location', ev.place);
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}

// ---------- shim.js ----------
// Tampermonkey 版の土台: 拡張の content.js がそのまま動くよう、chrome.storage を GM_getValue / GM_setValue で代わりに用意する。
// (content.js を2つに分けて持たないための仕掛け。保存は Tampermonkey の中に残る)
const chrome = {
  storage: {
    sync: {
      get(key, cb) { setTimeout(() => cb({ [key]: GM_getValue(key) }), 0); },
      set(obj) { for (const k in obj) GM_setValue(k, JSON.parse(JSON.stringify(obj[k]))); },
    },
    onChanged: {
      // 別のタブで変えた時に、このタブにも反映する
      addListener(fn) {
        GM_addValueChangeListener('lcfState', (name, _old, value, remote) => {
          if (remote) fn({ [name]: { newValue: value } }, 'sync');
        });
      },
    },
  },
  runtime: { onMessage: { addListener() {} } }, // 右クリックのメニューは無い(代わりに bubble.js)
};

// ---------- content.js ----------
// リベ チャット フォルダー
// チャット一覧(.content_chatlist)をフォルダー分け・並び替えし、フォルダーごとに未読の合計を出す。
// 一覧は Vue が描いているので、Vue の要素は動かさない。並びは CSS の order、隠すのは data 属性で行う。
// (class を足すと Vue が描き直しで消す。data 属性と style には Vue は触らない)
(() => {
  // 拡張版と Tampermonkey 版を両方入れていても、先に動いた方だけが働く(一覧に操作帯が2つ出ないように)
  const root = document.documentElement;
  if (root.dataset.lcfRunning) return;
  root.dataset.lcfRunning = typeof GM_info === 'undefined' ? 'extension' : 'userscript';

  const GUIDE_URL = 'https://yubokumin28.github.io/libe-chat-folder/';
  const KEY = 'lcfState';
  const NONE = '__none__';
  // noneOrder: フォルダーなしの手動の並び(room_id の配列)。null はリベシティの元の並び(v0.3 で追加)
  const DEFAULT = { folders: [], noneCollapsed: false, autoLoad: true, noneOrder: null };
  const LIST = '.content_chatlist';
  const OURS = '.lcf-head, .lcf-bar, .lcf-move, .lcf-menu';

  let state = structuredClone(DEFAULT);
  let ready = false;
  let timer = 0;
  let dragging = null; // { type: 'room' | 'folder', id }
  let loadClicks = 0;
  let loadBusy = false;
  let lastSelection = '';
  let noneSeq = []; // 今「フォルダーなし」に見えている順(手で並べ始める時の元になる)

  const store = chrome.storage.sync;

  // ---------- 保存 ----------
  // ⛔ 利用者のフォルダーを消さないための約束(機能を足す時も守る):
  //   ・保存のキー名 lcfState と、folders[].id / name / rooms の意味は変えない
  //   ・新しい項目は「無ければ既定値」で読む。知らない項目も捨てずに残す(...s / ...f)
  //   ・形を変える必要が出たら、ここで古い形から読み替える(消してから作り直さない)
  function normalize(s) {
    const st = { ...structuredClone(DEFAULT), ...(s || {}) };
    st.folders = (Array.isArray(st.folders) ? st.folders : []).filter(f => f && f.id).map(f => ({
      ...f,
      name: f.name || 'フォルダー',
      collapsed: !!f.collapsed,
      rooms: Array.isArray(f.rooms) ? f.rooms : [],
      icon: typeof f.icon === 'string' ? f.icon : '', // v0.2 で追加。空なら 📁/📂
    }));
    st.noneOrder = Array.isArray(st.noneOrder) ? st.noneOrder.filter(r => typeof r === 'string') : null;
    return st;
  }
  // 控え: 拡張(や Tampermonkey)を外すと、その中の保存は消えることがある。
  // そこでリベシティのページ側の保存(localStorage)にも同じ物を置き、入れ直した時はそこから戻す。
  // 拡張版 ⇔ Tampermonkey 版の乗り換えも、この控えで自動で引き継がれる。
  // 消えるのは「⚙ → 全部消す」か、Chrome でリベシティのサイトデータを消した時だけ。
  const BACKUP_KEY = 'lcfBackup';
  function readBackup() {
    try { const b = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null'); return b && b.state ? b : null; }
    catch { return null; }
  }
  function writeBackup() {
    try { localStorage.setItem(BACKUP_KEY, JSON.stringify({ app: 'libe-chat-folder', savedAt: state.savedAt, state })); }
    catch { /* 容量不足などは諦める(本体の保存は済んでいる) */ }
  }
  function load() {
    store.get(KEY, r => {
      const own = r && r[KEY];
      const backup = readBackup();
      // 新しい方を使う。入れ直し直後は own が空なので控えから戻る
      const useBackup = backup && (!own || (backup.state.savedAt || 0) > (own.savedAt || 0));
      state = normalize(useBackup ? backup.state : own);
      ready = true;
      if (useBackup) store.set({ [KEY]: state }); // 控えから戻した物を本体にも書く
      else if (own) writeBackup();
      schedule();
    });
  }
  function save() {
    state.savedAt = Date.now();
    store.set({ [KEY]: state });
    writeBackup();
    schedule();
  }
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === 'sync' && ch[KEY] && ch[KEY].newValue) { state = normalize(ch[KEY].newValue); schedule(); }
  });

  // ---------- 読み取り ----------
  function roomIdOf(item) {
    const a = item.querySelector('a.chat_link');
    if (!a) return '';
    try { return new URL(a.getAttribute('href'), location.href).searchParams.get('room_id') || ''; }
    catch { return ''; }
  }
  // 通知(2026-10-27 本物の一覧で実測):
  //   数字つき  <span class="status_info is_count_unread is_to">1</span>  … 自分あての通知の数(青緑の丸)
  //   数字なし  <span class="status_info is_all"></span>                 … @ALL の全体通知(オレンジの点)
  //   何もなし  <span class="status_info"></span>
  // 数字は合計し、数字の無い @ALL の点は「全体通知のあるチャットの数」として別に数える
  function unreadOf(item) {
    const s = item.querySelector('.status_info');
    if (!s) return { n: 0, plus: false, all: 0 };
    const t = (s.textContent || '').trim();
    const num = parseInt(t.replace(/[^\d]/g, ''), 10) || 0;
    if (s.classList.contains('is_count_unread') && num) return { n: num, plus: t.includes('+'), all: 0 };
    if (s.classList.contains('is_to')) return { n: 1, plus: false, all: 0 };
    if (s.classList.contains('is_all')) return { n: 0, plus: false, all: 1 };
    return { n: 0, plus: false, all: 0 };
  }
  function nameOf(item) {
    const p = item.querySelector('.chat_name');
    return p ? p.textContent.trim() : '';
  }
  function folderById(id) { return state.folders.find(f => f.id === id); }

  // ---------- 部品 ----------
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function setText(e, t) { if (e.textContent !== t) e.textContent = t; }
  function setOrder(e, n) { const v = String(n); if (e.style.order !== v) e.style.order = v; }
  function setFlag(e, name, on) {
    if (on) { if (e.dataset[name] !== '1') e.dataset[name] = '1'; }
    else if (name in e.dataset) delete e.dataset[name];
  }

  function ensureBar(list) {
    let bar = list.querySelector(':scope > .lcf-bar');
    if (bar) return bar;
    bar = el('div', 'lcf-bar');
    const add = el('button', 'lcf-btn', '＋ フォルダーを作る'); add.dataset.act = 'add';
    const fold = el('button', 'lcf-btn lcf-sub', 'すべてたたむ'); fold.dataset.act = 'fold-all';
    const open = el('button', 'lcf-btn lcf-sub', 'すべて開く'); open.dataset.act = 'open-all';
    const help = el('button', 'lcf-btn lcf-help', '❓ 使い方'); help.dataset.act = 'help';
    const gear = el('button', 'lcf-btn lcf-sub lcf-gear', '⚙'); gear.dataset.act = 'settings'; gear.title = 'フォルダーの書き出し・読み込み';
    const hint = el('div', 'lcf-hint', '📁 を押すか、チャットをつかんでフォルダーの見出しへ運ぶと入ります');
    bar.append(add, fold, open, help, gear, hint);
    list.prepend(bar);
    return bar;
  }

  function ensureHeader(list, id) {
    let h = list.querySelector(`:scope > .lcf-head[data-lcf-fid="${CSS.escape(id)}"]`);
    if (h) return h;
    h = el('div', 'lcf-head');
    h.dataset.lcfFid = id;
    h.draggable = id !== NONE;
    const caret = el('span', 'lcf-caret');
    const icon = el('span', 'lcf-icon');
    const name = el('span', 'lcf-name');
    const count = el('span', 'lcf-count');
    const unread = el('span', 'lcf-unread');
    unread.title = '自分あての通知の合計(チャットの青緑の数字を足したもの)';
    const all = el('span', 'lcf-all');
    all.title = '@ALL の全体通知(オレンジの点)があるチャットの数';
    h.append(caret, icon, name, count, unread, all);
    if (id !== NONE) {
      icon.dataset.act = 'icon';
      icon.title = 'アイコンを変える';
    }
    const edit = el('button', 'lcf-edit', '✏️ 編集');
    edit.dataset.act = 'edit';
    edit.title = id === NONE ? '並び順を元に戻す' : '名前・アイコンを変える、フォルダーを消す';
    h.append(edit);
    list.append(h);
    return h;
  }

  function tally() { return { sum: 0, plus: false, all: 0, shown: 0 }; }
  function addTo(t, item) {
    const u = unreadOf(item);
    t.sum += u.n; t.plus = t.plus || u.plus; t.all += u.all; t.shown++;
  }

  function paintHeader(h, { name, icon, collapsed, sum, plus, all, shown, total }) {
    setFlag(h, 'lcfCollapsed', collapsed);
    setText(h.querySelector('.lcf-caret'), collapsed ? '▶' : '▼');
    setText(h.querySelector('.lcf-icon'), h.dataset.lcfFid === NONE ? '💬' : icon || (collapsed ? '📁' : '📂'));
    setText(h.querySelector('.lcf-name'), name);
    const missing = total - shown;
    setText(h.querySelector('.lcf-count'), missing > 0 ? `${shown}件(あと${missing}件は未読み込み)` : `${shown}件`);
    const u = h.querySelector('.lcf-unread');
    setText(u, sum > 0 ? `通知 ${sum}${plus ? '+' : ''}` : '');
    setFlag(u, 'lcfOn', sum > 0);
    const a = h.querySelector('.lcf-all');
    setText(a, all > 0 ? `全体 ${all}` : '');
    setFlag(a, 'lcfOn', all > 0);
  }

  function ensureMoveBtn(item) {
    if (item.querySelector(':scope > .lcf-move')) return;
    const b = el('button', 'lcf-move', '📁');
    b.type = 'button';
    b.title = 'フォルダーへ入れる';
    item.append(b);
  }

  // ---------- 並べ直し(何度呼んでも同じ結果になる) ----------
  function apply(list) {
    if (!ready) return;
    list.dataset.lcf = '1';
    const items = [...list.querySelectorAll(':scope > .chat_item')];
    const byRoom = new Map();
    items.forEach(it => {
      const id = roomIdOf(it);
      if (id && !byRoom.has(id)) byRoom.set(id, it);
      it.draggable = true;
      ensureMoveBtn(it);
    });

    setOrder(ensureBar(list), 0);
    const keep = new Set();
    const placed = new Set();
    let base = 10;

    for (const f of state.folders) {
      const h = ensureHeader(list, f.id);
      keep.add(h);
      setOrder(h, base);
      const t = tally();
      f.rooms.forEach((r, j) => {
        const it = byRoom.get(r);
        if (!it || placed.has(r)) return;
        placed.add(r);
        setOrder(it, base + 1 + j);
        setFlag(it, 'lcfHidden', f.collapsed);
        if (it.dataset.lcfFid !== f.id) it.dataset.lcfFid = f.id;
        addTo(t, it);
      });
      paintHeader(h, { ...t, name: f.name, icon: f.icon, collapsed: f.collapsed, total: new Set(f.rooms).size });
      base += 10000;
    }

    // フォルダーに入っていないチャット。手で並べる前(noneOrder が null)はリベシティの元の並び(新着順など)。
    // 手で並べた後は noneOrder の順。noneOrder に無いチャット(新しく参加した物など)は先頭に元の並びで出す
    const hn = ensureHeader(list, NONE);
    keep.add(hn);
    setOrder(hn, base);
    const t = tally();
    const rest = items.filter(it => { const id = roomIdOf(it); return !(id && placed.has(id)); });
    let seq = rest;
    if (state.noneOrder) {
      const rank = new Map(state.noneOrder.map((r, i) => [r, i]));
      const fresh = rest.filter(it => !rank.has(roomIdOf(it)));
      const known = rest.filter(it => rank.has(roomIdOf(it))).sort((a, b) => rank.get(roomIdOf(a)) - rank.get(roomIdOf(b)));
      seq = [...fresh, ...known];
    }
    noneSeq = seq.map(roomIdOf).filter(Boolean);
    seq.forEach((it, i) => {
      setOrder(it, base + 1 + i);
      setFlag(it, 'lcfHidden', state.noneCollapsed);
      if (it.dataset.lcfFid !== NONE) it.dataset.lcfFid = NONE;
      addTo(t, it);
    });
    paintHeader(hn, { ...t, name: 'フォルダーなし', collapsed: state.noneCollapsed, total: t.shown });
    setFlag(hn, 'lcfSolo', state.folders.length === 0); // フォルダーが1つも無い時は見出しを出さない

    list.querySelectorAll(':scope > .lcf-head').forEach(h => { if (!keep.has(h)) h.remove(); });
    const more = list.querySelector(':scope > .morelink_area');
    if (more) setOrder(more, 99999999);
    bind(list);
    autoLoad(list);
  }

  // 「さらに読み込む」を自動で押して、フォルダーの未読合計に全チャットが入るようにする
  function autoLoad(list) {
    if (!state.autoLoad || loadBusy || loadClicks >= 30) return;
    const a = list.querySelector(':scope > .morelink_area a');
    if (!a) return;
    loadBusy = true;
    setTimeout(() => {
      loadBusy = false;
      if (a.isConnected) { loadClicks++; a.click(); }
    }, 700);
  }

  function applyAll() {
    timer = 0;
    document.querySelectorAll(LIST).forEach(apply);
  }
  function schedule() {
    if (!timer) timer = setTimeout(applyAll, 120);
  }

  // ---------- 操作 ----------
  function newFolder(name) {
    const f = { id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, collapsed: false, rooms: [], icon: '' };
    state.folders.push(f);
    return f;
  }
  function askName(def) {
    const n = prompt('フォルダーの名前', def || '');
    return n && n.trim() ? n.trim().slice(0, 40) : '';
  }
  function insertAt(arr, room, target, after) {
    let idx = arr.length;
    const k = target ? arr.indexOf(target) : -1;
    if (k >= 0) idx = after ? k + 1 : k;
    arr.splice(idx, 0, room);
  }
  function moveRoom(room, fid, target, after) {
    if (!room || room === target) return;
    state.folders.forEach(f => { f.rooms = f.rooms.filter(r => r !== room); });
    const f = folderById(fid);
    if (f) {
      insertAt(f.rooms, room, target, after);
      if (state.noneOrder) state.noneOrder = state.noneOrder.filter(r => r !== room);
    } else if (fid === NONE && (target || state.noneOrder)) {
      // フォルダーなしの中で位置を決めた時: 今見えている順を書き留めてから入れる
      if (!state.noneOrder) state.noneOrder = noneSeq.slice();
      state.noneOrder = state.noneOrder.filter(r => r !== room);
      if (target) insertAt(state.noneOrder, room, target, after);
      else state.noneOrder.unshift(room); // 見出しに落とした・フォルダーから出した → 先頭
    }
    save();
  }
  function moveFolder(id, targetId, after) {
    if (id === targetId) return;
    const i = state.folders.findIndex(f => f.id === id);
    if (i < 0) return;
    const [f] = state.folders.splice(i, 1);
    let k = state.folders.findIndex(x => x.id === targetId);
    if (k < 0) k = state.folders.length; else if (after) k++;
    state.folders.splice(k, 0, f);
    save();
  }
  function toggle(fid) {
    if (fid === NONE) state.noneCollapsed = !state.noneCollapsed;
    else { const f = folderById(fid); if (f) f.collapsed = !f.collapsed; }
    save();
  }

  // ---------- 小さなメニュー(📁・編集・アイコン選び で共通) ----------
  // entries: { label, fn, on } / 'sep' / { title } / { note } / { grid: [文字...], fn(文字), current }
  //          / { input: 初期値, placeholder, fn(入力値) }  … Enter か「決定」で fn
  function closeMenu() { document.querySelectorAll('.lcf-menu').forEach(m => m.remove()); }
  function showMenu(anchor, entries, extraClass) {
    closeMenu();
    const m = el('div', 'lcf-menu' + (extraClass ? ' ' + extraClass : ''));
    const click = (b, fn) => b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); closeMenu(); fn(); });
    let focusMe = null;
    for (const x of entries) {
      if (x === 'sep') { m.append(el('div', 'lcf-menu-sep')); continue; }
      if (x.title) { m.append(el('div', 'lcf-menu-title', x.title)); continue; }
      if (x.note) { m.append(el('div', 'lcf-menu-note', x.note)); continue; }
      if ('input' in x) {
        const row = el('div', 'lcf-input-row');
        const inp = el('input', 'lcf-input');
        inp.type = 'text';
        inp.value = x.input || '';
        inp.placeholder = x.placeholder || '';
        const ok = el('button', 'lcf-input-ok', '決定');
        const done = () => { const v = inp.value; closeMenu(); x.fn(v); };
        ok.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); done(); });
        inp.addEventListener('keydown', e => {
          e.stopPropagation(); // リベシティ側のショートカットに渡さない
          if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); done(); }
          if (e.key === 'Escape') closeMenu();
        });
        row.append(inp, ok);
        m.append(row);
        focusMe = inp;
        continue;
      }
      if (x.grid) {
        const g = el('div', 'lcf-icon-grid');
        x.grid.forEach(ch => {
          const b = el('button', 'lcf-icon-pick' + (ch === x.current ? ' lcf-on' : ''), ch);
          click(b, () => x.fn(ch));
          g.append(b);
        });
        m.append(g);
        continue;
      }
      const b = el('button', 'lcf-menu-item' + (x.on ? ' lcf-on' : '') + (x.danger ? ' lcf-danger' : ''), x.label);
      click(b, x.fn);
      m.append(b);
    }
    document.body.append(m);
    const r = anchor.getBoundingClientRect();
    const top = Math.min(r.bottom + 4, innerHeight - m.offsetHeight - 8);
    const left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8));
    m.style.top = `${Math.max(8, top)}px`;
    m.style.left = `${left}px`;
    if (focusMe) { focusMe.focus(); focusMe.select(); }
  }

  // 📁 を押した時: どのフォルダーへ入れるか
  function openMoveMenu(btn, room) {
    const cur = state.folders.find(f => f.rooms.includes(room));
    const entries = state.folders.map(f => ({
      label: (cur === f ? '✓ ' : '　') + (f.icon || '📁') + ' ' + f.name, fn: () => moveRoom(room, f.id), on: cur === f,
    }));
    if (entries.length) entries.push('sep');
    entries.push({ label: '＋ 新しいフォルダーを作って入れる', fn: () => { const n = askName(); if (n) { const f = newFolder(n); moveRoom(room, f.id); } } });
    if (cur) entries.push({ label: 'フォルダーから出す', fn: () => moveRoom(room, NONE) });
    showMenu(btn, entries);
  }

  // フォルダーのアイコン候補(種類ごと。ここに無い物は上の入力欄に何でも入れられる)
  const ICON_GROUPS = [
    ['よく使う', '📁 ⭐ ❤️ 🔥 📌 🔔 💬 👥 ✅ ⚠️ 👑 🔰 💎 🏆 🎯 🚩'],
    ['仕事・学び', '💼 🏢 📊 📈 💰 💴 🧾 📝 📚 ✏️ 💡 🎓 🧠 🔍 ⏰ 📅'],
    ['AI・道具・趣味', '🤖 💻 📱 🖥️ ⌨️ 🛠️ ⚙️ 🧪 🎨 🎬 🎵 🎤 📷 🎮 🔧 🔗'],
    ['人・気持ち', '😀 😊 😎 🥰 🤔 😴 🙏 👍 👏 💪 🤝 👋 🎉 🎂 🍻 ☕'],
    ['自然・生き物', '🌸 🌻 🍀 🌈 ☀️ 🌙 ⛄ 🌊 🍓 🍎 🐊 🦆 🐑 🐶 🐱 🐼'],
    ['場所・乗り物', '🏠 🏡 🏫 🏥 ⛩️ 🗾 🗻 🏖️ 🚗 🚃 ✈️ 🚲 ⛺ 🎪 🏟️ 🍜'],
    ['色', '🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟥 🟧 🟨 🟩 🟦 🟪 ⬛ ⬜'],
  ].map(([title, s]) => [title, s.split(' ')]);

  // 見た目の1文字ずつ数えて2文字まで(❤️ や 👨‍👩‍👧 のような組み合わせ絵文字を途中で切らない)
  function iconText(v) {
    const seg = [...new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(v.trim())].map(s => s.segment);
    return seg.slice(0, 2).join('');
  }

  function openIconMenu(anchor, f) {
    const pick = ch => { f.icon = ch === '📁' ? '' : ch; save(); };
    const entries = [
      { title: `「${f.name}」のアイコン` },
      { input: f.icon, placeholder: '好きな絵文字・文字(2文字まで)', fn: v => { const t = iconText(v); if (t) pick(t); } },
      { note: 'Windows は「Windowsキー + .(ピリオド)」で絵文字の一覧が出ます' },
    ];
    ICON_GROUPS.forEach(([title, list]) => entries.push({ title }, { grid: list, current: f.icon || '📁', fn: pick }));
    entries.push('sep', { label: '📁 元のフォルダーの形に戻す', fn: () => pick('📁') });
    showMenu(anchor, entries, 'lcf-menu-wide');
  }

  // ⚙: フォルダーの書き出し・読み込み(拡張版 ⇔ Tampermonkey 版、パソコンの引っ越しで使う)
  function openSettingsMenu(anchor) {
    showMenu(anchor, [
      { title: 'フォルダーの引っ越し' },
      { label: '📤 書き出す(文字をコピー)', fn: async () => {
        const text = JSON.stringify({ app: 'libe-chat-folder', saved: new Date().toISOString(), state });
        try { await navigator.clipboard.writeText(text); alert('コピーしました。移す先の ⚙ →「読み込む」に貼り付けてください。'); }
        catch { prompt('下の文字を全部コピーしてください', text); }
      } },
      { label: '📥 読み込む(貼り付け)', fn: () => {
        const v = prompt('書き出した文字を貼り付けてください');
        if (!v) return;
        try {
          const o = JSON.parse(v);
          const next = normalize(o.state || o);
          if (!confirm(`フォルダー ${next.folders.length} 個を読み込みます。今のフォルダー分けは置き換わります。よろしいですか?`)) return;
          state = next;
          save();
        } catch { alert('読み込めませんでした。書き出した文字を、最初から最後まで貼り付けてください。'); }
      } },
      'sep',
      { label: '🗑️ フォルダー分けを全部消す', danger: true, fn: () => {
        if (!confirm('フォルダー・名前・アイコン・並び順を全部消して、最初の状態に戻します。\n(チャット自体は消えません)\n本当に消しますか?')) return;
        state = normalize(null);
        save();
        try { localStorage.removeItem(BACKUP_KEY); } catch { /* 無視 */ }
      } },
    ]);
  }

  // 「フォルダーなし」の編集: 手で並べた順をやめて、リベシティの並び(新着順)に戻す
  function openNoneMenu(anchor) {
    const entries = [{ title: 'フォルダーなし' }];
    if (state.noneOrder) {
      entries.push({ label: '↩️ リベシティの並び(新着順)に戻す', fn: () => { state.noneOrder = null; save(); } });
    } else {
      entries.push({ note: '今はリベシティの並び(新着順)です。チャットをつかんで動かすと、好きな順に並べられます' });
    }
    showMenu(anchor, entries);
  }

  function openEditMenu(anchor, f) {
    showMenu(anchor, [
      { title: f.name },
      { label: '✏️ 名前を変える', fn: () => { const n = askName(f.name); if (n) { f.name = n; save(); } } },
      { label: `${f.icon || '📁'} アイコンを変える`, fn: () => openIconMenu(anchor, f) },
      'sep',
      { label: '🗑️ フォルダーを消す', danger: true, fn: () => {
        if (confirm(`「${f.name}」を消しますか?\n中のチャットは「フォルダーなし」へ戻ります(チャット自体は消えません)。`)) {
          state.folders = state.folders.filter(x => x !== f);
          save();
        }
      } },
    ]);
  }
  document.addEventListener('click', e => { if (!e.target.closest('.lcf-menu, .lcf-move, .lcf-edit, .lcf-icon')) closeMenu(); }, true);
  // 一覧やページを動かしたら閉じる(メニューの中を動かした時は閉じない)
  addEventListener('scroll', e => { if (!elOf(e.target)?.closest?.('.lcf-menu')) closeMenu(); }, true);

  // 一覧ごとに1回だけ、操作の受け口を付ける
  function bind(list) {
    if (list.dataset.lcfBound) return;
    list.dataset.lcfBound = '1';

    list.addEventListener('click', e => {
      const mv = e.target.closest('.lcf-move');
      if (mv) {
        e.preventDefault(); e.stopPropagation();
        openMoveMenu(mv, roomIdOf(mv.closest('.chat_item')));
        return;
      }
      const btn = e.target.closest('.lcf-bar button, .lcf-edit, .lcf-head .lcf-icon[data-act]');
      if (btn) {
        e.preventDefault(); e.stopPropagation();
        const act = btn.dataset.act;
        const f = folderById(btn.closest('.lcf-head')?.dataset.lcfFid);
        if (act === 'add') { const n = askName(); if (n) { newFolder(n); save(); } }
        else if (act === 'fold-all' || act === 'open-all') {
          const c = act === 'fold-all';
          state.folders.forEach(x => { x.collapsed = c; });
          state.noneCollapsed = c;
          save();
        } else if (act === 'help') window.open(GUIDE_URL, '_blank', 'noopener');
        else if (act === 'settings') openSettingsMenu(btn);
        else if (act === 'edit' && f) openEditMenu(btn, f);
        else if (act === 'edit') openNoneMenu(btn);
        else if (act === 'icon' && f) openIconMenu(btn, f);
        return;
      }
      const head = e.target.closest('.lcf-head');
      if (head) { e.preventDefault(); toggle(head.dataset.lcfFid); }
    }, true);

    list.addEventListener('dragstart', e => {
      const node = elOf(e.target);
      const head = node && node.closest('.lcf-head');
      const item = node && node.closest('.chat_item');
      if (head && head.dataset.lcfFid !== NONE) dragging = { type: 'folder', id: head.dataset.lcfFid };
      else if (item) dragging = { type: 'room', id: roomIdOf(item) };
      else return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragging.id);
      (head || item).dataset.lcfDragging = '1';
    });

    list.addEventListener('dragover', e => {
      if (!dragging) return;
      const t = dropTarget(e, list);
      clearMarks();
      if (!t) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      t.el.dataset.lcfDrop = t.pos;
    });

    list.addEventListener('drop', e => {
      if (!dragging) return;
      const t = dropTarget(e, list);
      clearMarks(true);
      if (!t) return;
      e.preventDefault();
      const d = dragging;
      dragging = null;
      if (d.type === 'folder') {
        moveFolder(d.id, t.fid === NONE ? null : t.fid, t.pos === 'after');
      } else if (t.el.classList.contains('lcf-head')) {
        moveRoom(d.id, t.fid);
      } else {
        moveRoom(d.id, t.fid, roomIdOf(t.el), t.pos === 'after');
      }
    });

    list.addEventListener('dragend', () => { dragging = null; clearMarks(true); });
  }

  function clearMarks(all) {
    document.querySelectorAll(all ? '[data-lcf-drop], [data-lcf-dragging]' : '[data-lcf-drop]').forEach(x => {
      delete x.dataset.lcfDrop;
      if (all) delete x.dataset.lcfDragging;
    });
  }

  // 文字の上から掴むと target が文字(テキストノード)になり closest が無い → 親の要素から探す
  function elOf(n) { return n && (n.nodeType === 1 ? n : n.parentElement); }

  // 指の真下に見出しもチャットも無い時(すき間・操作帯・さらに読み込む)は、上下で一番近い物にする
  function nearest(list, y) {
    let best = null, dist = Infinity;
    for (const c of list.children) {
      if (!c.matches('.chat_item, .lcf-head') || !c.getClientRects().length) continue;
      const r = c.getBoundingClientRect();
      const d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      if (d < dist) { dist = d; best = c; }
    }
    return best;
  }

  // どこに落とすか: フォルダーの見出しなら「中へ」、チャットなら上半分=前・下半分=後ろ
  // (v0.3 から「フォルダーなし」の中でも前後に並べられる)
  function dropTarget(e, list) {
    const node = elOf(e.target);
    let t = node && node.closest('.lcf-head, .chat_item');
    if (!t || t.parentElement !== list) t = nearest(list, e.clientY);
    if (!t) return null;
    const r = t.getBoundingClientRect();
    const half = e.clientY > r.top + r.height / 2 ? 'after' : 'before';
    const isHead = t.classList.contains('lcf-head');
    if (dragging.type === 'folder') {
      // フォルダーをチャットの上に落とした時は、そのチャットが入っているフォルダーの見出しを相手にする
      const fid = isHead ? t.dataset.lcfFid : (t.dataset.lcfFid || NONE);
      const h = isHead ? t : list.querySelector(`:scope > .lcf-head[data-lcf-fid="${CSS.escape(fid)}"]`);
      if (!h) return null;
      return { el: h, fid, pos: fid === NONE ? 'after' : isHead ? half : 'after' };
    }
    if (isHead) return { el: t, fid: t.dataset.lcfFid, pos: 'into' };
    return { el: t, fid: t.dataset.lcfFid || NONE, pos: half };
  }

  // ---------- 右クリック登録用: 改行つきの選択文字を覚えておく ----------
  document.addEventListener('contextmenu', () => { lastSelection = String(getSelection() || ''); }, true);
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg && msg.type === 'lcf-get-selection') reply({ text: lastSelection || String(getSelection() || '') });
  });

  // ---------- 一覧の変化を見張る(Vue の描き直し・未読数の変化・さらに読み込む) ----------
  function isOurs(n) {
    return n.nodeType === 1 && (n.matches(OURS) || n.closest(OURS));
  }
  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      const t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      if (!t) continue;
      if (t.closest(OURS)) continue;
      const nodes = [...m.addedNodes, ...m.removedNodes];
      if (m.type === 'childList' && nodes.length && nodes.every(isOurs)) continue;
      if (t.closest(LIST) || nodes.some(n => n.nodeType === 1 && (n.matches(LIST) || n.querySelector?.(LIST)))) {
        schedule();
        return;
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  load();
})();

// ---------- bubble.js ----------
// Tampermonkey 版のカレンダー登録: 文字を選ぶと、すぐ下に「📅 Googleカレンダーに登録」が出る。
// (Tampermonkey は右クリックのメニューに項目を足せないため。拡張版は右クリック)
(() => {
  if (document.documentElement.dataset.lcfRunning !== 'userscript') return;
  let btn = null;
  const hide = () => { if (btn) { btn.remove(); btn = null; } };

  document.addEventListener('mouseup', e => {
    if (e.button !== 0 || e.target.closest?.('.lcf-cal')) return;
    setTimeout(() => {
      const sel = getSelection();
      const text = String(sel || '').trim();
      if (!sel || !sel.rangeCount || text.length < 2) return hide();
      const node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
      if (node && node.closest('input, textarea, [contenteditable="true"], .lcf-menu')) return hide(); // 書いている途中は出さない
      const r = sel.getRangeAt(sel.rangeCount - 1).getBoundingClientRect();
      hide();
      btn = document.createElement('button');
      btn.className = 'lcf-cal';
      btn.type = 'button';
      btn.textContent = '📅 Googleカレンダーに登録';
      btn.addEventListener('mousedown', ev => ev.preventDefault()); // 押しても選んだ文字が消えないように
      btn.addEventListener('click', ev => {
        ev.preventDefault();
        const url = calendarUrl(parseEvent(text), text, location.href);
        GM_openInTab(url, { active: true });
        hide();
      });
      document.body.append(btn);
      const top = Math.min(r.bottom + 8, innerHeight - btn.offsetHeight - 8);
      const left = Math.max(8, Math.min(r.left, innerWidth - btn.offsetWidth - 8));
      btn.style.top = `${top}px`;
      btn.style.left = `${left}px`;
    }, 10);
  });
  document.addEventListener('mousedown', e => { if (!e.target.closest?.('.lcf-cal')) hide(); }, true);
  addEventListener('scroll', hide, true);
  addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });

  // 入れて最初の1回だけ、使い方のページを開く
  if (!GM_getValue('lcfGuideShown')) {
    GM_setValue('lcfGuideShown', true);
    GM_openInTab('https://yubokumin28.github.io/libe-chat-folder/', { active: true });
  }
})();

})();
