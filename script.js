/* ============================================================
   ULTIMATE LIBRARY BOOK MANAGEMENT SYSTEM — SCRIPT
   Pure Vanilla JavaScript (ES6+) — No frameworks, no libraries
   Modules:
     01. Utilities
     02. Storage Module
     03. Activity Logger
     04. Validation Module
     05. UI Module (toasts, modals, loaders)
     06. Auth Module
     07. Books Module
     08. Members Module
     09. Issued Module (Issue + Return + History)
     10. Dashboard Module
     11. Reports Module
     12. Settings Module
     13. Router / Navigation
     14. Global Event Handlers
     15. Sample Data Seeder
     16. App Bootstrap
   ============================================================ */

'use strict';

/* ============================================================
   01. UTILITIES
   ============================================================ */

/**
 * Returns a shallow-debounced version of a function.
 * @param {Function} fn - Function to debounce
 * @param {number} [delay=250] - Delay in ms
 * @returns {Function}
 */
const debounce = (fn, delay = 250) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

/**
 * Formats a Date (or date string) into "DD MMM YYYY".
 * @param {Date|string} date
 * @returns {string}
 */
const formatDate = (date) => {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Formats a Date (or ISO string) into "DD MMM YYYY, HH:MM".
 * @param {Date|string} date
 * @returns {string}
 */
const formatDateTime = (date) => {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

/**
 * Formats a number as Indian Rupees.
 * @param {number} n
 * @returns {string}
 */
const formatCurrency = (n) => {
  const num = Number(n) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Returns today's date as YYYY-MM-DD (local).
 * @returns {string}
 */
const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Adds N days to a YYYY-MM-DD string, returns YYYY-MM-DD.
 * @param {string} isoDate
 * @param {number} days
 * @returns {string}
 */
const addDays = (isoDate, days) => {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Returns number of full days between two YYYY-MM-DD strings (b - a).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
const daysBetween = (a, b) => {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.floor((db - da) / (1000 * 60 * 60 * 24));
};

/**
 * Escapes HTML special characters in a string.
 * @param {string} str
 * @returns {string}
 */
const escapeHTML = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Generates a unique ID for entities.
 * @param {string} prefix - e.g. "BK", "MB", "ISS"
 * @param {number} seq - Sequence number (1-based)
 * @returns {string}
 */
const generateId = (prefix, seq = 1) => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const n = String(seq).padStart(3, '0');
  return `${prefix}-${y}${m}${day}-${n}`;
};

/**
 * Generates a next sequence id from existing array of {id} items.
 * @param {Array<{id:string}>} items
 * @param {string} prefix
 * @param {string} key - field name holding the id (default "id")
 * @returns {string}
 */
const nextId = (items, prefix, key = 'id') => {
  const stamp = (() => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  })();
  const sameDay = items.filter(it => (it[key] || '').includes(stamp));
  return generateId(prefix, sameDay.length + 1);
};

/**
 * Simple deep clone via JSON.
 * @template T
 * @param {T} obj
 * @returns {T}
 */
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/* ============================================================
   02. STORAGE MODULE
   ============================================================ */
const Storage = (() => {
  const KEYS = {
    BOOKS:    'lms_books',
    MEMBERS:  'lms_members',
    ISSUED:   'lms_issued',
    ACTIVITY: 'lms_activity',
    SETTINGS: 'lms_settings',
    SESSION:  'lms_session'
  };

  const DEFAULT_SETTINGS = {
    libraryName: 'City Central Library',
    address: '123 Library Road, Mumbai, India',
    contactEmail: 'info@citylibrary.com',
    contactPhone: '022-12345678',
    fineRate: 5,
    borrowDays: 14,
    maxBooksPerMember: 5,
    darkMode: false
  };

  /**
   * Reads and parses a JSON value from localStorage.
   * @param {string} key
   * @param {*} fallback
   * @returns {*}
   */
  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.error('[LMS] Storage.read error for', key, err);
      return fallback;
    }
  };

  /**
   * Serializes and writes a value to localStorage.
   * @param {string} key
   * @param {*} value
   * @returns {boolean}
   */
  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('[LMS] Storage.write error for', key, err);
      return false;
    }
  };

  /**
   * Removes a key from localStorage.
   * @param {string} key
   */
  const remove = (key) => {
    try { localStorage.removeItem(key); }
    catch (err) { console.error('[LMS] Storage.remove error', err); }
  };

  /* Getters */
  const getBooks    = () => read(KEYS.BOOKS, []);
  const getMembers  = () => read(KEYS.MEMBERS, []);
  const getIssued   = () => read(KEYS.ISSUED, []);
  const getActivity = () => read(KEYS.ACTIVITY, []);
  const getSettings = () => ({ ...DEFAULT_SETTINGS, ...read(KEYS.SETTINGS, {}) });
  const getSession  = () => read(KEYS.SESSION, null);

  /* Setters */
  const setBooks    = (v) => write(KEYS.BOOKS, v);
  const setMembers  = (v) => write(KEYS.MEMBERS, v);
  const setIssued   = (v) => write(KEYS.ISSUED, v);
  const setActivity = (v) => write(KEYS.ACTIVITY, v);
  const setSettings = (v) => write(KEYS.SETTINGS, v);
  const setSession  = (v) => write(KEYS.SESSION, v);

  /**
   * Checks whether the library has been seeded yet.
   * @returns {boolean}
   */
  const isEmpty = () =>
    getBooks().length === 0 &&
    getMembers().length === 0 &&
    getIssued().length === 0;

  return {
    KEYS, DEFAULT_SETTINGS,
    read, write, remove,
    getBooks, getMembers, getIssued, getActivity, getSettings, getSession,
    setBooks, setMembers, setIssued, setActivity, setSettings, setSession,
    isEmpty
  };
})();

/* ============================================================
   03. ACTIVITY LOGGER
   ============================================================ */
const Activity = (() => {
  const MAX_ENTRIES = 200;

  /**
   * Logs an activity entry.
   * @param {string} action - e.g. "BOOK_ADDED"
   * @param {string} details
   */
  const log = (action, details) => {
    try {
      const all = Storage.getActivity();
      const entry = {
        id: nextId(all, 'ACT'),
        action,
        details,
        timestamp: new Date().toISOString()
      };
      all.unshift(entry);
      Storage.setActivity(all.slice(0, MAX_ENTRIES));
    } catch (err) {
      console.error('[LMS] Activity.log error', err);
    }
  };

  /** Clears the activity log. */
  const clear = () => Storage.setActivity([]);

  /** Returns the most recent N activities. */
  const recent = (n = 10) => Storage.getActivity().slice(0, n);

  return { log, clear, recent };
})();

/* ============================================================
   04. VALIDATION MODULE
   ============================================================ */
const Validation = (() => {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^[0-9]{10}$/;
  const ISBN_RE  = /^(?:\d{9}[\dXx]|\d{13})$/;
  const NAME_RE  = /^[A-Za-z\s.'-]{3,}$/;

  /** @returns {boolean} */
  const isEmail = (v) => EMAIL_RE.test((v || '').trim());

  /** @returns {boolean} */
  const isPhone = (v) => PHONE_RE.test((v || '').trim());

  /** @returns {boolean} */
  const isIsbn = (v) => ISBN_RE.test((v || '').trim());

  /** @returns {boolean} */
  const isName = (v) => NAME_RE.test((v || '').trim());

  /** @returns {boolean} */
  const isPositiveInt = (v) => Number.isInteger(Number(v)) && Number(v) >= 1;

  /** @returns {boolean} */
  const isYear = (v) => {
    const n = Number(v);
    const cy = new Date().getFullYear();
    return Number.isInteger(n) && n >= 1900 && n <= cy;
  };

  /**
   * Sets field error state and message.
   * @param {HTMLElement} input
   * @param {string} message - empty to clear
   */
  const setFieldError = (input, message) => {
    if (!input) return;
    const small = document.querySelector(`[data-error-for="${input.id}"]`);
    if (message) {
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
      if (small) small.textContent = message;
    } else {
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
      if (small) small.textContent = '';
    }
  };

  /** Clears error on an input. */
  const clearFieldError = (input) => {
    if (!input) return;
    input.classList.remove('is-invalid', 'is-valid');
    const small = document.querySelector(`[data-error-for="${input.id}"]`);
    if (small) small.textContent = '';
  };

  return {
    isEmail, isPhone, isIsbn, isName,
    isPositiveInt, isYear,
    setFieldError, clearFieldError
  };
})();

/* ============================================================
   05. UI MODULE
   ============================================================ */
const UI = (() => {

  /* ---------- Toasts ---------- */
  const TOAST_ICONS = {
    success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️'
  };
  const TOAST_TITLES = {
    success: 'Success', error: 'Error', warning: 'Warning', info: 'Info'
  };

  /**
   * Displays a toast notification.
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} [type='info']
   * @param {number} [duration=3000]
   */
  const showToast = (message, type = 'info', duration = 3000) => {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <span class="toast-icon">${TOAST_ICONS[type] || 'ℹ️'}</span>
      <div class="toast-content">
        <div class="toast-title">${escapeHTML(TOAST_TITLES[type] || 'Info')}</div>
        <div class="toast-message">${escapeHTML(message)}</div>
      </div>
      <button type="button" class="toast-close" aria-label="Close">✕</button>
    `;
    container.appendChild(toast);

    const dismiss = () => {
      toast.classList.add('is-leaving');
      setTimeout(() => toast.remove(), 250);
    };
    toast.querySelector('.toast-close').addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
  };

  /* ---------- Modals ---------- */
  let lastFocusedElement = null;

  /**
   * Opens a modal by id.
   * @param {string} id
   */
  const openModal = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    lastFocusedElement = document.activeElement;
    el.hidden = false;
    document.body.style.overflow = 'hidden';
    // Focus first focusable element inside modal
    const focusable = el.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) setTimeout(() => focusable.focus(), 50);
  };

  /**
   * Closes a modal by id.
   * @param {string} id
   */
  const closeModal = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = true;
    if (!document.querySelector('.modal:not([hidden])')) {
      document.body.style.overflow = '';
    }
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  };

  /**
   * Simple confirmation dialog.
   * @param {Object} opts
   * @param {string} opts.title
   * @param {string} opts.message
   * @param {string} [opts.confirmText='Confirm']
   * @param {string} [opts.cancelText='Cancel']
   * @param {string} [opts.icon='⚠️']
   * @param {string} [opts.variant='danger'] - danger|primary|warning
   * @returns {Promise<boolean>}
   */
  const confirm = (opts) => {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirmModal');
      const title = document.getElementById('confirmModalTitle');
      const icon = document.getElementById('confirmModalIcon');
      const message = document.getElementById('confirmModalMessage');
      const okBtn = document.getElementById('confirmModalOk');
      const cancelBtn = document.getElementById('confirmModalCancel');

      title.textContent = opts.title || 'Confirm';
      icon.textContent = opts.icon || '⚠️';
      message.innerHTML = opts.message || 'Are you sure?';
      okBtn.textContent = opts.confirmText || 'Confirm';
      cancelBtn.textContent = opts.cancelText || 'Cancel';
      okBtn.className = `btn btn-${opts.variant || 'danger'}`;

      const cleanup = () => {
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        modal.querySelectorAll('[data-close-modal]').forEach(el =>
          el.removeEventListener('click', onCancel));
      };
      const onOk = () => { cleanup(); closeModal('confirmModal'); resolve(true); };
      const onCancel = () => { cleanup(); closeModal('confirmModal'); resolve(false); };

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      modal.querySelectorAll('[data-close-modal]').forEach(el =>
        el.addEventListener('click', onCancel));

      openModal('confirmModal');
    });
  };

  /* ---------- Global loader ---------- */
  const showLoader = () => {
    const el = document.getElementById('globalLoader');
    if (el) el.hidden = false;
  };
  const hideLoader = () => {
    const el = document.getElementById('globalLoader');
    if (el) el.hidden = true;
  };

  /**
   * Toggles the loading state of a button.
   * @param {HTMLButtonElement} btn
   * @param {boolean} loading
   */
  const setButtonLoading = (btn, loading) => {
    if (!btn) return;
    btn.classList.toggle('is-loading', loading);
    btn.disabled = loading;
  };

  /* ---------- Avatar ---------- */
  /**
   * Generates an avatar HTML element for a name.
   * @param {string} name
   * @param {'sm'|'md'|'lg'} [size='sm']
   * @returns {string}
   */
  const avatarHTML = (name, size = 'sm') => {
    const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
    const hue = [...(name || 'A')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    const bg = `hsl(${hue}, 65%, 50%)`;
    return `<span class="avatar avatar-${size}" style="background:${bg};">${escapeHTML(initial)}</span>`;
  };

  /* ---------- Ripple effect on buttons ---------- */
  const attachRipple = () => {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn || btn.disabled) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top  = `${e.clientY - rect.top  - size / 2}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  };

  return {
    showToast, openModal, closeModal, confirm,
    showLoader, hideLoader, setButtonLoading,
    avatarHTML, attachRipple
  };
})();

/* ============================================================
   06. AUTH MODULE
   ============================================================ */
const Auth = (() => {
  const ADMIN_USER = 'admin';
  const ADMIN_PASS = 'admin123';
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  let inactivityTimer = null;

  /**
   * Verifies credentials.
   * @param {string} username
   * @param {string} password
   * @returns {boolean}
   */
  const verify = (username, password) =>
    username.trim() === ADMIN_USER && password === ADMIN_PASS;

  /**
   * Sets a session in sessionStorage or localStorage.
   * @param {boolean} remember
   */
  const startSession = (remember) => {
    const session = {
      username: ADMIN_USER,
      loginTime: new Date().toISOString()
    };
    try {
      sessionStorage.setItem('lms_session', JSON.stringify(session));
      if (remember) localStorage.setItem('lms_session_remember', JSON.stringify(session));
      else localStorage.removeItem('lms_session_remember');
    } catch (err) {
      console.error('[LMS] startSession error', err);
    }
    resetInactivityTimer();
  };

  /**
   * Ends the session.
   */
  const endSession = () => {
    try {
      sessionStorage.removeItem('lms_session');
      localStorage.removeItem('lms_session_remember');
    } catch (err) {
      console.error('[LMS] endSession error', err);
    }
    clearTimeout(inactivityTimer);
  };

  /**
   * @returns {boolean} whether the user is currently authenticated.
   */
  const isLoggedIn = () => {
    try {
      const s = sessionStorage.getItem('lms_session');
      const r = localStorage.getItem('lms_session_remember');
      return !!(s || r);
    } catch { return false; }
  };

  /** Resets the inactivity timer. */
  const resetInactivityTimer = () => {
    clearTimeout(inactivityTimer);
    if (!isLoggedIn()) return;
    inactivityTimer = setTimeout(() => {
      UI.showToast('Session expired. Please log in again.', 'warning');
      setTimeout(() => {
        endSession();
        location.reload();
      }, 1200);
    }, SESSION_TIMEOUT_MS);
  };

  return { verify, startSession, endSession, isLoggedIn, resetInactivityTimer };
})();

/* ============================================================
   07. BOOKS MODULE
   ============================================================ */
const Books = (() => {
  let allBooks = [];

  /* Pagination / filter state */
  const state = {
    search: '',
    category: '',
    availability: '',
    sort: 'newest',
    page: 1,
    perPage: 10,
    sortField: 'title',
    sortDir: 'asc',
    selected: new Set()
  };

  /** Reloads books from storage into memory. */
  const load = () => { allBooks = Storage.getBooks(); };

  /** Persists books to storage. */
  const save = () => Storage.setBooks(allBooks);

  /**
   * Returns books after applying search, filters, and sort.
   * @returns {Array}
   */
  const filtered = () => {
    let list = [...allBooks];

    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter(b =>
        (b.title || '').toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q) ||
        (b.isbn || '').toLowerCase().includes(q)
      );
    }

    if (state.category) list = list.filter(b => b.category === state.category);

    if (state.availability === 'available') list = list.filter(b => b.available > 0);
    else if (state.availability === 'out') list = list.filter(b => b.available === 0);
    else if (state.availability === 'low') list = list.filter(b => b.available > 0 && b.available <= 2);

    switch (state.sort) {
      case 'newest':
        list.sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));
        break;
      case 'oldest':
        list.sort((a, b) => new Date(a.addedDate) - new Date(b.addedDate));
        break;
      case 'title-asc':
        list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'title-desc':
        list.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        break;
      case 'author-asc':
        list.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
        break;
    }
    return list;
  };

  /**
   * Adds a new book.
   * @param {Object} data
   * @returns {Object|null}
   */
  const add = (data) => {
    try {
      // Duplicate ISBN check
      if (allBooks.some(b => b.isbn === data.isbn)) {
        UI.showToast('A book with this ISBN already exists.', 'error');
        return null;
      }
      const book = {
        id: nextId(allBooks, 'BK'),
        title: data.title.trim(),
        author: data.author.trim(),
        isbn: data.isbn.trim(),
        category: data.category,
        publisher: (data.publisher || '').trim(),
        year: data.year ? Number(data.year) : null,
        quantity: Number(data.quantity),
        available: Number(data.quantity),
        shelf: (data.shelf || '').trim(),
        price: data.price ? Number(data.price) : 0,
        addedDate: new Date().toISOString()
      };
      allBooks.unshift(book);
      save();
      Activity.log('BOOK_ADDED', `Added book: ${book.title}`);
      return book;
    } catch (err) {
      console.error('[LMS] Books.add', err);
      UI.showToast('Failed to add book.', 'error');
      return null;
    }
  };

  /**
   * Updates a book by id.
   * @param {string} id
   * @param {Object} patch
   * @returns {boolean}
   */
  const update = (id, patch) => {
    try {
      const idx = allBooks.findIndex(b => b.id === id);
      if (idx === -1) return false;
      // Duplicate ISBN (other book)
      if (patch.isbn && allBooks.some(b => b.id !== id && b.isbn === patch.isbn)) {
        UI.showToast('Another book already uses this ISBN.', 'error');
        return false;
      }
      const old = allBooks[idx];
      const newQty = Number(patch.quantity ?? old.quantity);
      const issuedCount = old.quantity - old.available;
      if (newQty < issuedCount) {
        UI.showToast(`Cannot reduce below ${issuedCount} (currently issued).`, 'error');
        return false;
      }
      allBooks[idx] = {
        ...old,
        title: (patch.title ?? old.title).trim(),
        author: (patch.author ?? old.author).trim(),
        isbn: (patch.isbn ?? old.isbn).trim(),
        category: patch.category ?? old.category,
        publisher: (patch.publisher ?? old.publisher ?? '').trim(),
        year: patch.year !== undefined && patch.year !== '' ? Number(patch.year) : old.year,
        quantity: newQty,
        available: newQty - issuedCount,
        shelf: (patch.shelf ?? old.shelf ?? '').trim(),
        price: patch.price !== undefined && patch.price !== '' ? Number(patch.price) : old.price
      };
      save();
      Activity.log('BOOK_UPDATED', `Updated book: ${allBooks[idx].title}`);
      return true;
    } catch (err) {
      console.error('[LMS] Books.update', err);
      return false;
    }
  };

  /**
   * Deletes a book by id (blocks if currently issued).
   * @param {string} id
   * @returns {boolean}
   */
  const remove = (id) => {
    const book = allBooks.find(b => b.id === id);
    if (!book) return false;
    const activeIssues = Storage.getIssued().filter(r => r.bookId === id && r.status !== 'returned');
    if (activeIssues.length > 0) {
      UI.showToast('Cannot delete: book is currently issued.', 'error');
      return false;
    }
    allBooks = allBooks.filter(b => b.id !== id);
    save();
    Activity.log('BOOK_DELETED', `Deleted book: ${book.title}`);
    return true;
  };

  /**
   * Bulk delete books by ids (skips those with active issues).
   * @param {string[]} ids
   * @returns {number} number deleted
   */
  const bulkDelete = (ids) => {
    const issued = Storage.getIssued();
    let deleted = 0;
    const skipped = [];
    ids.forEach(id => {
      const active = issued.some(r => r.bookId === id && r.status !== 'returned');
      if (active) { skipped.push(id); return; }
      const b = allBooks.find(x => x.id === id);
      if (b) { deleted++; Activity.log('BOOK_DELETED', `Deleted book: ${b.title}`); }
    });
    allBooks = allBooks.filter(b => !ids.includes(b.id) || skipped.includes(b.id));
    save();
    return deleted;
  };

  /** @returns {Object|undefined} */
  const findById = (id) => allBooks.find(b => b.id === id);

  /** Increments available copies. */
  const incrementAvailable = (id) => {
    const b = allBooks.find(x => x.id === id);
    if (b && b.available < b.quantity) { b.available += 1; save(); }
  };

  /** Decrements available copies. */
  const decrementAvailable = (id) => {
    const b = allBooks.find(x => x.id === id);
    if (b && b.available > 0) { b.available -= 1; save(); }
  };

  /** @returns {number} total cataloged copies */
  const totalCopies = () => allBooks.reduce((s, b) => s + (Number(b.quantity) || 0), 0);

  /** @returns {number} total available copies */
  const totalAvailable = () => allBooks.reduce((s, b) => s + (Number(b.available) || 0), 0);

  /** @returns {Object} category → count map */
  const categoryCounts = () => {
    const map = {};
    allBooks.forEach(b => {
      map[b.category] = (map[b.category] || 0) + Number(b.quantity || 0);
    });
    return map;
  };

  return {
    load, save, filtered, state,
    add, update, remove, bulkDelete, findById,
    incrementAvailable, decrementAvailable,
    totalCopies, totalAvailable, categoryCounts,
    getAll: () => allBooks
  };
})();

/* ============================================================
   08. MEMBERS MODULE
   ============================================================ */
const Members = (() => {
  let allMembers = [];
  const state = {
    search: '',
    type: '',
    sort: 'newest',
    page: 1,
    perPage: 10,
    selected: new Set()
  };

  const load = () => { allMembers = Storage.getMembers(); };
  const save = () => Storage.setMembers(allMembers);

  const filtered = () => {
    let list = [...allMembers];
    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.id || '').toLowerCase().includes(q)
      );
    }
    if (state.type) list = list.filter(m => m.type === state.type);

    switch (state.sort) {
      case 'newest':    list.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate)); break;
      case 'oldest':    list.sort((a, b) => new Date(a.joinDate) - new Date(b.joinDate)); break;
      case 'name-asc':  list.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'name-desc': list.sort((a, b) => (b.name || '').localeCompare(a.name || '')); break;
    }
    return list;
  };

  /**
   * Adds a new member.
   * @param {Object} data
   * @returns {Object|null}
   */
  const add = (data) => {
    try {
      if (allMembers.some(m => (m.email || '').toLowerCase() === data.email.toLowerCase())) {
        UI.showToast('A member with this email already exists.', 'error');
        return null;
      }
      const member = {
        id: nextId(allMembers, 'MB'),
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        address: (data.address || '').trim(),
        type: data.type,
        joinDate: data.joinDate || new Date().toISOString()
      };
      allMembers.unshift(member);
      save();
      Activity.log('MEMBER_ADDED', `Added member: ${member.name}`);
      return member;
    } catch (err) {
      console.error('[LMS] Members.add', err);
      return null;
    }
  };

  const update = (id, patch) => {
    try {
      const idx = allMembers.findIndex(m => m.id === id);
      if (idx === -1) return false;
      if (patch.email && allMembers.some(m => m.id !== id && m.email.toLowerCase() === patch.email.toLowerCase())) {
        UI.showToast('Another member already uses this email.', 'error');
        return false;
      }
      allMembers[idx] = {
        ...allMembers[idx],
        name: (patch.name ?? allMembers[idx].name).trim(),
        email: (patch.email ?? allMembers[idx].email).trim(),
        phone: (patch.phone ?? allMembers[idx].phone).trim(),
        address: (patch.address ?? allMembers[idx].address ?? '').trim(),
        type: patch.type ?? allMembers[idx].type
      };
      save();
      Activity.log('MEMBER_UPDATED', `Updated member: ${allMembers[idx].name}`);
      return true;
    } catch (err) {
      console.error('[LMS] Members.update', err);
      return false;
    }
  };

  const remove = (id) => {
    const member = allMembers.find(m => m.id === id);
    if (!member) return false;
    const active = Storage.getIssued().filter(r => r.memberId === id && r.status !== 'returned');
    if (active.length > 0) {
      UI.showToast('Cannot delete: member has active issued books.', 'error');
      return false;
    }
    allMembers = allMembers.filter(m => m.id !== id);
    save();
    Activity.log('MEMBER_DELETED', `Deleted member: ${member.name}`);
    return true;
  };

  const findById = (id) => allMembers.find(m => m.id === id);

  /** @returns {number} total active issues count for member */
  const issuedCount = (id) =>
    Storage.getIssued().filter(r => r.memberId === id && r.status !== 'returned').length;

  /** @returns {number} historical issues */
  const totalIssued = (id) =>
    Storage.getIssued().filter(r => r.memberId === id).length;

  /** @returns {number} total fines paid/owed */
  const totalFines = (id) =>
    Storage.getIssued()
      .filter(r => r.memberId === id)
      .reduce((s, r) => s + (Number(r.fine) || 0), 0);

  return {
    load, save, filtered, state,
    add, update, remove, findById,
    issuedCount, totalIssued, totalFines,
    getAll: () => allMembers
  };
})();

/* ============================================================
   09. ISSUED MODULE (issue / return / history)
   ============================================================ */
const Issued = (() => {
  let allIssued = [];
  const state = {
    history: {
      status: '', from: '', to: '', memberId: '',
      page: 1, perPage: 15
    },
    return: {
      search: '', status: 'active'
    }
  };

  const load = () => { allIssued = Storage.getIssued(); };
  const save = () => Storage.setIssued(allIssued);

  /**
   * Calculates fine.
   * @param {string} dueDate
   * @param {string} returnDate
   * @param {number} rate
   * @returns {number}
   */
  const calculateFine = (dueDate, returnDate, rate) => {
    const rDate = returnDate || todayISO();
    const overdue = daysBetween(dueDate, rDate);
    if (overdue <= 0) return 0;
    return overdue * Number(rate || 5);
  };

  /** @returns {number} days left (negative if overdue) */
  const daysLeft = (dueDate) => daysBetween(todayISO(), dueDate);

  /**
   * Determines live status for a record.
   * @param {Object} r
   * @returns {'issued'|'returned'|'overdue'}
   */
  const liveStatus = (r) => {
    if (r.status === 'returned') return 'returned';
    return daysLeft(r.dueDate) < 0 ? 'overdue' : 'issued';
  };

  /**
   * Issues a new book.
   * @param {Object} data - {memberId, bookId, issueDate, dueDate, remarks}
   * @returns {Object|null}
   */
  const issue = (data) => {
    try {
      const member = Members.findById(data.memberId);
      const book = Books.findById(data.bookId);
      if (!member || !book) { UI.showToast('Invalid member or book.', 'error'); return null; }
      if (book.available <= 0) { UI.showToast('Book is out of stock.', 'error'); return null; }

      const settings = Storage.getSettings();
      const activeForMember = allIssued.filter(r => r.memberId === member.id && r.status !== 'returned');
      if (activeForMember.length >= settings.maxBooksPerMember) {
        UI.showToast(`Member already has ${settings.maxBooksPerMember} active books.`, 'error');
        return null;
      }
      const sameBook = activeForMember.find(r => r.bookId === book.id);
      if (sameBook) {
        UI.showToast('Member already has this book issued.', 'error');
        return null;
      }
      if (data.dueDate <= data.issueDate) {
        UI.showToast('Due date must be after issue date.', 'error');
        return null;
      }

      const record = {
        issueId: nextId(allIssued, 'ISS', 'issueId'),
        bookId: book.id,
        bookTitle: book.title,
        memberId: member.id,
        memberName: member.name,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        returnDate: null,
        status: 'issued',
        fine: 0,
        remarks: (data.remarks || '').trim()
      };
      allIssued.unshift(record);
      save();
      Books.decrementAvailable(book.id);
      Activity.log('BOOK_ISSUED', `"${book.title}" issued to ${member.name}`);
      return record;
    } catch (err) {
      console.error('[LMS] Issued.issue', err);
      return null;
    }
  };

  /**
   * Processes a return for the given issue id.
   * @param {string} issueId
   * @returns {Object|null}
   */
  const returnBook = (issueId) => {
    try {
      const rec = allIssued.find(r => r.issueId === issueId);
      if (!rec) { UI.showToast('Record not found.', 'error'); return null; }
      if (rec.status === 'returned') { UI.showToast('Already returned.', 'warning'); return null; }

      const settings = Storage.getSettings();
      const returnDate = todayISO();
      const fine = calculateFine(rec.dueDate, returnDate, settings.fineRate);

      rec.returnDate = returnDate;
      rec.status = 'returned';
      rec.fine = fine;
      save();

      Books.incrementAvailable(rec.bookId);
      Activity.log('BOOK_RETURNED', `"${rec.bookTitle}" returned by ${rec.memberName}` + (fine > 0 ? ` — Fine ₹${fine}` : ''));
      return rec;
    } catch (err) {
      console.error('[LMS] Issued.returnBook', err);
      return null;
    }
  };

  /** Returns active issues (status !== returned). */
  const active = () => allIssued.filter(r => r.status !== 'returned');

  /** Returns overdue records. */
  const overdue = () => allIssued.filter(r => r.status !== 'returned' && daysLeft(r.dueDate) < 0);

  /** Returns records for return page (filtered by search and status). */
  const forReturnPage = () => {
    let list = allIssued.filter(r => r.status !== 'returned');
    if (state.return.status === 'overdue') list = list.filter(r => daysLeft(r.dueDate) < 0);
    if (state.return.search) {
      const q = state.return.search.toLowerCase();
      list = list.filter(r =>
        r.issueId.toLowerCase().includes(q) ||
        (r.bookTitle || '').toLowerCase().includes(q) ||
        (r.memberName || '').toLowerCase().includes(q) ||
        (r.memberId || '').toLowerCase().includes(q)
      );
    }
    // Sort: overdue first, then by dueDate ascending
    list.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    return list;
  };

  /** History records with filters. */
  const forHistoryPage = () => {
    let list = [...allIssued];
    const st = state.history;
    if (st.status) {
      if (st.status === 'overdue') list = list.filter(r => liveStatus(r) === 'overdue');
      else list = list.filter(r => r.status === st.status || (st.status === 'issued' && r.status !== 'returned'));
    }
    if (st.from) list = list.filter(r => (r.issueDate || '') >= st.from);
    if (st.to)   list = list.filter(r => (r.issueDate || '') <= st.to);
    if (st.memberId) list = list.filter(r => r.memberId === st.memberId);
    list.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
    return list;
  };

  /** Returns records for a specific member. */
  const byMember = (memberId) => allIssued.filter(r => r.memberId === memberId);

  return {
    load, save, state,
    issue, returnBook, calculateFine, daysLeft, liveStatus,
    active, overdue, forReturnPage, forHistoryPage, byMember,
    getAll: () => allIssued
  };
})();

/* ============================================================
   10. DASHBOARD MODULE
   ============================================================ */
const Dashboard = (() => {
  /**
   * Updates stat cards.
   */
  const updateStats = () => {
    const totalBooks = Books.getAll().reduce((s, b) => s + Number(b.quantity || 0), 0);
    const totalMembers = Members.getAll().length;
    const issuedNow = Issued.active().length;
    const overdueCount = Issued.overdue().length;

    setText('statTotalBooks', totalBooks);
    setText('statTotalMembers', totalMembers);
    setText('statIssuedBooks', issuedNow);
    setText('statOverdueBooks', overdueCount);
  };

  /**
   * Renders the recent activity table.
   */
  const renderActivity = () => {
    const tbody = document.getElementById('activityTableBody');
    const empty = document.getElementById('activityEmpty');
    const items = Activity.recent(10);
    if (!tbody) return;
    if (items.length === 0) {
      tbody.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    const ICONS = {
      BOOK_ADDED: '📗', BOOK_UPDATED: '✏️', BOOK_DELETED: '🗑️',
      MEMBER_ADDED: '👤', MEMBER_UPDATED: '✏️', MEMBER_DELETED: '🗑️',
      BOOK_ISSUED: '📤', BOOK_RETURNED: '📥'
    };
    tbody.innerHTML = items.map(a => `
      <tr>
        <td><small class="text-muted">${formatDateTime(a.timestamp)}</small></td>
        <td><span aria-hidden="true">${ICONS[a.action] || '•'}</span> ${escapeHTML(a.action.replace(/_/g, ' '))}</td>
        <td>${escapeHTML(a.details)}</td>
      </tr>
    `).join('');
  };

  /**
   * Renders the category chart.
   */
  const renderCategoryChart = () => {
    const wrap = document.getElementById('categoryChart');
    if (!wrap) return;
    const counts = Books.categoryCounts();
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      wrap.innerHTML = '<p class="text-muted">No data yet.</p>';
      return;
    }
    const max = Math.max(...entries.map(e => e[1]));
    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
    wrap.innerHTML = entries.map(([cat, n], i) => {
      const pct = max ? (n / max) * 100 : 0;
      const color = colors[i % colors.length];
      return `
        <div class="chart-bar-row">
          <span class="chart-bar-label">${escapeHTML(cat)}</span>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width:${pct}%; background:${color};"></div>
          </div>
          <span class="chart-bar-count">${n}</span>
        </div>
      `;
    }).join('');
  };

  /**
   * Renders top 5 most issued books.
   */
  const renderTopBooks = () => {
    const list = document.getElementById('topBooksList');
    const empty = document.getElementById('topBooksEmpty');
    if (!list) return;
    const issued = Issued.getAll();
    const map = {};
    issued.forEach(r => {
      map[r.bookId] = map[r.bookId] || { title: r.bookTitle, author: '', count: 0, bookId: r.bookId };
      map[r.bookId].count++;
    });
    // Attach authors
    Object.values(map).forEach(v => {
      const b = Books.findById(v.bookId);
      if (b) v.author = b.author;
    });
    const top = Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
    if (top.length === 0) {
      list.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.innerHTML = top.map((t, i) => `
      <li class="top-list-item">
        <span class="top-rank top-rank-${i + 1}">${i + 1}</span>
        <div class="top-info">
          <div class="top-title">${escapeHTML(t.title)}</div>
          <div class="top-author">${escapeHTML(t.author || '—')}</div>
        </div>
        <span class="top-count">${t.count} issue${t.count !== 1 ? 's' : ''}</span>
      </li>
    `).join('');
  };

  /**
   * Live clock in welcome banner.
   */
  const tickClock = () => {
    const t = document.getElementById('liveClockTime');
    const d = document.getElementById('liveClockDate');
    if (!t || !d) return;
    const now = new Date();
    t.textContent = now.toLocaleTimeString('en-IN', { hour12: false });
    d.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  /** Renders dashboard. */
  const render = () => {
    updateStats();
    renderActivity();
    renderCategoryChart();
    renderTopBooks();
    tickClock();

    const s = Storage.getSettings();
    setText('welcomeLibraryName', s.libraryName);
  };

  return { render, updateStats, renderActivity, tickClock };
})();

/* ============================================================
   11. REPORTS MODULE
   ============================================================ */
const Reports = (() => {
  let currentReport = null;

  /**
   * Builds a monthly issue chart for the last 12 months.
   */
  const monthly = () => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        key,
        label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        count: 0
      });
    }
    Issued.getAll().forEach(r => {
      const key = (r.issueDate || '').slice(0, 7);
      const m = months.find(x => x.key === key);
      if (m) m.count++;
    });
    return {
      title: 'Monthly Issue Report',
      rows: months.map(m => ({ Month: m.label, 'Books Issued': m.count })),
      chart: months
    };
  };

  /** Top 10 most issued books. */
  const mostBorrowed = () => {
    const map = {};
    Issued.getAll().forEach(r => {
      map[r.bookId] = map[r.bookId] || { title: r.bookTitle, author: '', count: 0, bookId: r.bookId };
      map[r.bookId].count++;
    });
    Object.values(map).forEach(v => {
      const b = Books.findById(v.bookId);
      if (b) v.author = b.author;
    });
    const rows = Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((v, i) => ({ Rank: i + 1, Title: v.title, Author: v.author || '—', Issues: v.count }));
    return { title: 'Most Borrowed Books (Top 10)', rows };
  };

  /** Top 10 most active members. */
  const mostActive = () => {
    const map = {};
    Issued.getAll().forEach(r => {
      map[r.memberId] = map[r.memberId] || { name: r.memberName, id: r.memberId, count: 0 };
      map[r.memberId].count++;
    });
    const rows = Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((v, i) => ({ Rank: i + 1, Member: v.name, ID: v.id, 'Books Borrowed': v.count }));
    return { title: 'Most Active Members (Top 10)', rows };
  };

  /** Currently overdue books. */
  const overdue = () => {
    const settings = Storage.getSettings();
    const rows = Issued.overdue().map(r => ({
      'Issue ID': r.issueId,
      Book: r.bookTitle,
      Member: r.memberName,
      'Due Date': r.dueDate,
      'Days Overdue': Math.abs(Issued.daysLeft(r.dueDate)),
      'Est. Fine': calculateFinePreview(r, settings.fineRate)
    }));
    return { title: 'Overdue Books', rows };
  };

  /** Category distribution. */
  const category = () => {
    const counts = Books.categoryCounts();
    const rows = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, n]) => ({ Category: cat, 'Total Copies': n }));
    return { title: 'Category Distribution', rows };
  };

  /** Fine collection. */
  const fines = () => {
    const returned = Issued.getAll().filter(r => r.status === 'returned');
    const collected = returned.reduce((s, r) => s + (Number(r.fine) || 0), 0);
    const settings = Storage.getSettings();
    const outstanding = Issued.overdue().reduce((s, r) => s + calculateFinePreview(r, settings.fineRate), 0);
    const rows = [
      { Metric: 'Total Fines Collected', Amount: formatCurrency(collected) },
      { Metric: 'Outstanding (Overdue)', Amount: formatCurrency(outstanding) },
      { Metric: 'Total', Amount: formatCurrency(collected + outstanding) }
    ];
    return { title: 'Fine Collection Report', rows };
  };

  const calculateFinePreview = (r, rate) => {
    const d = Math.abs(Issued.daysLeft(r.dueDate));
    return d * Number(rate || 5);
  };

  /**
   * Renders a report into the detail card.
   * @param {string} type - key
   */
  const render = (type) => {
    const builders = { monthly, mostBorrowed, mostActive, overdue, category, fines };
    const builder = builders[type];
    if (!builder) return;
    const data = builder();
    currentReport = data;

    document.getElementById('reportDetailCard').hidden = false;
    document.getElementById('reportDetailTitle').textContent = data.title;
    document.getElementById('reportGeneratedAt').textContent = `Generated on ${formatDateTime(new Date())}`;

    const content = document.getElementById('reportContent');
    if (!data.rows || data.rows.length === 0) {
      content.innerHTML = '<div class="empty-state"><div class="empty-illustration">📊</div><p>No data for this report.</p></div>';
      return;
    }

    // Optional CSS chart for monthly
    if (data.chart) {
      const max = Math.max(1, ...data.chart.map(m => m.count));
      const bars = data.chart.map(m => `
        <div class="chart-bar-row">
          <span class="chart-bar-label">${escapeHTML(m.label)}</span>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width:${(m.count / max) * 100}%;"></div>
          </div>
          <span class="chart-bar-count">${m.count}</span>
        </div>
      `).join('');
      content.innerHTML = `
        <div class="chart-bars mb-6">${bars}</div>
        ${renderTable(data.rows)}
      `;
    } else {
      content.innerHTML = renderTable(data.rows);
    }
  };

  /** Renders rows as a table. */
  const renderTable = (rows) => {
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    return `
      <div class="table-responsive">
        <table class="report-table">
          <thead><tr>${headers.map(h => `<th>${escapeHTML(h)}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(r => `<tr>${headers.map(h => `<td>${escapeHTML(r[h])}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  /** Exports current report to CSV. */
  const exportCSV = () => {
    if (!currentReport || !currentReport.rows.length) {
      UI.showToast('Nothing to export.', 'warning');
      return;
    }
    exportToCSV(currentReport.rows, currentReport.title);
  };

  /** Prints current report. */
  const print = () => {
    const card = document.getElementById('reportDetailCard');
    if (!card) return;
    printElement(card);
  };

  return { render, exportCSV, print };
})();

/* ============================================================
   12. SETTINGS MODULE
   ============================================================ */
const Settings = (() => {
  const load = () => Storage.getSettings();

  /**
   * Saves library info.
   * @param {Object} data
   */
  const saveLibraryInfo = (data) => {
    const s = load();
    Storage.setSettings({
      ...s,
      libraryName: data.libraryName.trim() || s.libraryName,
      address: data.address.trim(),
      contactEmail: data.contactEmail.trim(),
      contactPhone: data.contactPhone.trim()
    });
    Activity.log('SETTINGS_UPDATED', 'Library information updated');
    applyLibraryBranding();
    UI.showToast('Library information saved.', 'success');
  };

  /**
   * Saves borrowing rules.
   * @param {Object} data
   */
  const saveRules = (data) => {
    const s = load();
    Storage.setSettings({
      ...s,
      fineRate: Number(data.fineRate) || 5,
      borrowDays: Number(data.borrowDays) || 14,
      maxBooksPerMember: Number(data.maxBooks) || 5
    });
    Activity.log('SETTINGS_UPDATED', 'Borrowing rules updated');
    UI.showToast('Borrowing rules saved.', 'success');
  };

  /**
   * Applies library name to UI elements.
   */
  const applyLibraryBranding = () => {
    const s = load();
    ['sidebarLibraryName', 'welcomeLibraryName', 'loginLibraryName', 'appFooterName'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = s.libraryName;
    });
  };

  /**
   * Exports all data as a JSON backup file.
   */
  const backup = () => {
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        books: Storage.getBooks(),
        members: Storage.getMembers(),
        issued: Storage.getIssued(),
        activity: Storage.getActivity(),
        settings: Storage.getSettings()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lms-backup-${todayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      UI.showToast('Backup downloaded.', 'success');
    } catch (err) {
      console.error('[LMS] backup', err);
      UI.showToast('Backup failed.', 'error');
    }
  };

  /**
   * Restores data from a JSON file.
   * @param {File} file
   * @returns {Promise<void>}
   */
  const restore = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data || typeof data !== 'object') throw new Error('Invalid backup');
          if (Array.isArray(data.books))    Storage.setBooks(data.books);
          if (Array.isArray(data.members))  Storage.setMembers(data.members);
          if (Array.isArray(data.issued))   Storage.setIssued(data.issued);
          if (Array.isArray(data.activity)) Storage.setActivity(data.activity);
          if (data.settings)                Storage.setSettings({ ...Storage.DEFAULT_SETTINGS, ...data.settings });
          Activity.log('DATA_RESTORED', `Restored backup from ${file.name}`);
          UI.showToast('Backup restored successfully.', 'success');
          setTimeout(() => location.reload(), 900);
        } catch (err) {
          console.error('[LMS] restore', err);
          UI.showToast('Invalid backup file.', 'error');
        }
        resolve();
      };
      reader.onerror = () => { UI.showToast('Failed to read file.', 'error'); resolve(); };
      reader.readAsText(file);
    });
  };

  /**
   * Resets all data (after double confirmation in caller).
   */
  const resetAll = () => {
    Storage.setBooks([]);
    Storage.setMembers([]);
    Storage.setIssued([]);
    Storage.setActivity([]);
    Activity.log('DATA_RESET', 'All data was reset');
    UI.showToast('All data reset.', 'success');
    setTimeout(() => location.reload(), 800);
  };

  return {
    load, saveLibraryInfo, saveRules,
    applyLibraryBranding, backup, restore, resetAll
  };
})();

/* ============================================================
   13. ROUTER / NAVIGATION
   ============================================================ */
const Router = (() => {
  const PAGES = [
    { id: 'dashboardPage', title: 'Dashboard',    crumb: 'Dashboard' },
    { id: 'booksPage',     title: 'Books',        crumb: 'Books' },
    { id: 'membersPage',   title: 'Members',      crumb: 'Members' },
    { id: 'issuePage',     title: 'Issue Book',   crumb: 'Issue Book' },
    { id: 'returnPage',    title: 'Return Book',  crumb: 'Return Book' },
    { id: 'historyPage',   title: 'History',      crumb: 'History' },
    { id: 'reportsPage',   title: 'Reports',      crumb: 'Reports' },
    { id: 'settingsPage',  title: 'Settings',     crumb: 'Settings' }
  ];

  /**
   * Navigates to a page by id.
   * @param {string} pageId
   */
  const go = (pageId) => {
    const page = PAGES.find(p => p.id === pageId);
    if (!page) return;

    document.querySelectorAll('.page').forEach(el => {
      if (el.id === 'loginPage') return;
      el.hidden = el.id !== pageId;
    });
    document.querySelectorAll('.nav-link').forEach(el => {
      const active = el.dataset.page === pageId;
      el.classList.toggle('is-active', active);
      if (active) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });

    // Update navbar
    setText('navbarTitle', page.title);
    document.title = `${page.title} — Library Management System`;

    const crumb = document.getElementById('breadcrumbList');
    if (crumb) {
      crumb.innerHTML = `
        <li><a href="#dashboard" data-page="dashboardPage">Home</a></li>
        <li aria-current="page">${escapeHTML(page.crumb)}</li>
      `;
      crumb.querySelectorAll('a[data-page]').forEach(a => {
        a.addEventListener('click', (e) => { e.preventDefault(); go(a.dataset.page); });
      });
    }

    // Close sidebar on mobile
    if (window.innerWidth <= 992) closeSidebar();

    // Refresh page-specific content
    switch (pageId) {
      case 'dashboardPage': Dashboard.render(); break;
      case 'booksPage':     BooksUI.render(); break;
      case 'membersPage':   MembersUI.render(); break;
      case 'issuePage':     IssueUI.refresh(); break;
      case 'returnPage':    ReturnUI.render(); break;
      case 'historyPage':   HistoryUI.render(); break;
      case 'reportsPage':   /* nothing to auto-render */ break;
      case 'settingsPage':  SettingsUI.render(); break;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Sidebar helpers */
  const openSidebar = () => {
    document.getElementById('sidebar').classList.add('is-open');
    document.getElementById('sidebarOverlay').classList.add('is-visible');
    document.getElementById('hamburgerBtn').setAttribute('aria-expanded', 'true');
  };
  const closeSidebar = () => {
    document.getElementById('sidebar').classList.remove('is-open');
    document.getElementById('sidebarOverlay').classList.remove('is-visible');
    document.getElementById('hamburgerBtn').setAttribute('aria-expanded', 'false');
  };

  return { go, openSidebar, closeSidebar };
})();

/* ============================================================
   PAGE-SPECIFIC UI MODULES
   ============================================================ */

/* ---------- BOOKS UI ---------- */
const BooksUI = (() => {
  const render = () => {
    renderTable();
    renderPagination();
    renderCount();
    updateSidebarCount();
  };

  const renderCount = () => {
    const list = Books.filtered();
    setText('booksResultCount', `${list.length} result${list.length !== 1 ? 's' : ''}`);
  };

  const renderTable = () => {
    const tbody = document.getElementById('booksTableBody');
    const empty = document.getElementById('booksEmpty');
    const list = Books.filtered();
    const s = Books.state;
    const start = (s.page - 1) * s.perPage;
    const paged = list.slice(start, start + s.perPage);

    if (list.length === 0) {
      tbody.innerHTML = '';
      empty.hidden = false;
      document.getElementById('booksPagination').hidden = true;
      return;
    }
    empty.hidden = true;
    document.getElementById('booksPagination').hidden = false;

    tbody.innerHTML = paged.map(b => {
      const status = b.available === 0 ? 'danger' : (b.available <= 2 ? 'warning' : 'success');
      const statusText = b.available === 0 ? 'Out of Stock' : (b.available <= 2 ? 'Low Stock' : 'Available');
      const checked = s.selected.has(b.id) ? 'checked' : '';
      return `
        <tr data-id="${b.id}">
          <td><input type="checkbox" class="checkbox-input book-row-check" data-id="${b.id}" ${checked} aria-label="Select book" /></td>
          <td><code>${escapeHTML(b.id)}</code></td>
          <td><strong>${escapeHTML(b.title)}</strong></td>
          <td>${escapeHTML(b.author)}</td>
          <td><code>${escapeHTML(b.isbn)}</code></td>
          <td>${escapeHTML(b.category)}</td>
          <td>${b.quantity}</td>
          <td>${b.available}</td>
          <td><span class="badge badge-${status}">${statusText}</span></td>
          <td>
            <div class="table-actions">
              <button type="button" class="btn btn-ghost btn-sm btn-icon tooltip" data-tooltip="View" data-action="view-book" data-id="${b.id}" aria-label="View book">👁️</button>
              <button type="button" class="btn btn-ghost btn-sm btn-icon tooltip" data-tooltip="Edit" data-action="edit-book" data-id="${b.id}" aria-label="Edit book">✏️</button>
              <button type="button" class="btn btn-ghost btn-sm btn-icon tooltip" data-tooltip="Issue" data-action="issue-book" data-id="${b.id}" aria-label="Issue book">📤</button>
              <button type="button" class="btn btn-ghost btn-sm btn-icon tooltip" data-tooltip="Delete" data-action="delete-book" data-id="${b.id}" aria-label="Delete book">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Update bulk delete button
    const bulkBtn = document.getElementById('bulkDeleteBooksBtn');
    if (s.selected.size > 0) {
      bulkBtn.hidden = false;
      document.getElementById('bulkDeleteBooksCount').textContent = s.selected.size;
    } else {
      bulkBtn.hidden = true;
    }
  };

  const renderPagination = () => {
    const list = Books.filtered();
    const s = Books.state;
    const totalPages = Math.max(1, Math.ceil(list.length / s.perPage));
    if (s.page > totalPages) s.page = totalPages;
    const start = (s.page - 1) * s.perPage;
    const end = Math.min(start + s.perPage, list.length);

    setText('booksPageInfo', `Showing ${list.length ? start + 1 : 0} to ${end} of ${list.length} entries`);

    const prev = document.getElementById('booksPrevBtn');
    const next = document.getElementById('booksNextBtn');
    prev.disabled = s.page <= 1;
    next.disabled = s.page >= totalPages;

    const numbers = document.getElementById('booksPageNumbers');
    numbers.innerHTML = '';
    const range = paginationRange(s.page, totalPages);
    range.forEach(p => {
      if (p === '...') {
        const span = document.createElement('span');
        span.textContent = '…';
        span.className = 'text-muted';
        numbers.appendChild(span);
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'page-number' + (p === s.page ? ' is-active' : '');
        btn.textContent = p;
        btn.addEventListener('click', () => { s.page = p; render(); });
        numbers.appendChild(btn);
      }
    });
  };

  const updateSidebarCount = () => {
    setText('navBooksCount', Books.getAll().length);
  };

  return { render };
})();

/* ---------- MEMBERS UI ---------- */
const MembersUI = (() => {
  const render = () => {
    renderTable();
    renderPagination();
    renderCount();
    updateSidebarCount();
  };

  const renderCount = () => {
    const list = Members.filtered();
    setText('membersResultCount', `${list.length} result${list.length !== 1 ? 's' : ''}`);
  };

  const renderTable = () => {
    const tbody = document.getElementById('membersTableBody');
    const empty = document.getElementById('membersEmpty');
    const list = Members.filtered();
    const s = Members.state;
    const start = (s.page - 1) * s.perPage;
    const paged = list.slice(start, start + s.perPage);

    if (list.length === 0) {
      tbody.innerHTML = '';
      empty.hidden = false;
      document.getElementById('membersPagination').hidden = true;
      return;
    }
    empty.hidden = true;
    document.getElementById('membersPagination').hidden = false;

    const TYPE_BADGE = { Student: 'info', Teacher: 'primary', Public: 'success' };
    tbody.innerHTML = paged.map(m => {
      const checked = s.selected.has(m.id) ? 'checked' : '';
      const activeCount = Members.issuedCount(m.id);
      return `
        <tr data-id="${m.id}">
          <td><input type="checkbox" class="checkbox-input member-row-check" data-id="${m.id}" ${checked} aria-label="Select member" /></td>
          <td><code>${escapeHTML(m.id)}</code></td>
          <td>${UI.avatarHTML(m.name)}</td>
          <td><strong>${escapeHTML(m.name)}</strong></td>
          <td>${escapeHTML(m.email)}</td>
          <td>${escapeHTML(m.phone)}</td>
          <td><span class="badge badge-${TYPE_BADGE[m.type] || 'info'}">${escapeHTML(m.type)}</span></td>
          <td>${formatDate(m.joinDate)}</td>
          <td>${activeCount}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="btn btn-ghost btn-sm btn-icon tooltip" data-tooltip="Profile" data-action="view-member" data-id="${m.id}" aria-label="View profile">👤</button>
              <button type="button" class="btn btn-ghost btn-sm btn-icon tooltip" data-tooltip="Edit" data-action="edit-member" data-id="${m.id}" aria-label="Edit member">✏️</button>
              <button type="button" class="btn btn-ghost btn-sm btn-icon tooltip" data-tooltip="Delete" data-action="delete-member" data-id="${m.id}" aria-label="Delete member">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const renderPagination = () => {
    const list = Members.filtered();
    const s = Members.state;
    const totalPages = Math.max(1, Math.ceil(list.length / s.perPage));
    if (s.page > totalPages) s.page = totalPages;
    const start = (s.page - 1) * s.perPage;
    const end = Math.min(start + s.perPage, list.length);
    setText('membersPageInfo', `Showing ${list.length ? start + 1 : 0} to ${end} of ${list.length} entries`);

    document.getElementById('membersPrevBtn').disabled = s.page <= 1;
    document.getElementById('membersNextBtn').disabled = s.page >= totalPages;

    const numbers = document.getElementById('membersPageNumbers');
    numbers.innerHTML = '';
    paginationRange(s.page, totalPages).forEach(p => {
      if (p === '...') {
        const span = document.createElement('span');
        span.textContent = '…'; span.className = 'text-muted';
        numbers.appendChild(span);
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'page-number' + (p === s.page ? ' is-active' : '');
        btn.textContent = p;
        btn.addEventListener('click', () => { s.page = p; render(); });
        numbers.appendChild(btn);
      }
    });
  };

  const updateSidebarCount = () => {
    setText('navMembersCount', Members.getAll().length);
  };

  return { render };
})();

/* ---------- ISSUE UI ---------- */
const IssueUI = (() => {
  const refresh = () => {
    // Populate member dropdown
    const memberSel = document.getElementById('issueMemberSelect');
    memberSel.innerHTML = '<option value="">Select member...</option>' +
      Members.getAll().map(m =>
        `<option value="${m.id}">${escapeHTML(m.name)} — ${escapeHTML(m.id)}</option>`
      ).join('');

    // Populate book dropdown (available > 0 only)
    const bookSel = document.getElementById('issueBookSelect');
    bookSel.innerHTML = '<option value="">Select book...</option>' +
      Books.getAll()
        .filter(b => b.available > 0)
        .map(b => `<option value="${b.id}">${escapeHTML(b.title)} (${b.available} available)</option>`)
        .join('');

    // Set dates
    const issueDate = document.getElementById('issueDate');
    const dueDate = document.getElementById('dueDate');
    const settings = Storage.getSettings();
    issueDate.value = todayISO();
    if (!dueDate.value) dueDate.value = addDays(todayISO(), settings.borrowDays);
    dueDate.min = addDays(todayISO(), 1);

    document.getElementById('issueInfoPanel').hidden = true;
  };

  const showInfo = () => {
    const mId = document.getElementById('issueMemberSelect').value;
    const bId = document.getElementById('issueBookSelect').value;
    const panel = document.getElementById('issueInfoPanel');
    if (!mId || !bId) { panel.hidden = true; return; }
    const m = Members.findById(mId);
    const b = Books.findById(bId);
    if (!m || !b) { panel.hidden = true; return; }
    panel.hidden = false;
    setText('issueMemberInfo', `${m.name} · ${m.email} · ${m.type} · Active issues: ${Members.issuedCount(m.id)}`);
    setText('issueBookInfo', `${b.title} by ${b.author} · Available: ${b.available}/${b.quantity} · Shelf: ${b.shelf || '—'}`);
  };

  return { refresh, showInfo };
})();

/* ---------- RETURN UI ---------- */
const ReturnUI = (() => {
  const render = () => {
    const tbody = document.getElementById('returnTableBody');
    const empty = document.getElementById('returnEmpty');
    const list = Issued.forReturnPage();
    setText('returnResultCount', `${list.length} result${list.length !== 1 ? 's' : ''}`);

    if (list.length === 0) {
      tbody.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    const settings = Storage.getSettings();
    tbody.innerHTML = list.map(r => {
      const dLeft = Issued.daysLeft(r.dueDate);
      const overdue = dLeft < 0;
      const daysLabel = overdue
        ? `<span class="days-overdue">${Math.abs(dLeft)} days overdue</span>`
        : `<span class="days-left">${dLeft} days left</span>`;
      const fine = overdue ? Math.abs(dLeft) * Number(settings.fineRate || 5) : 0;
      const fineClass = fine > 0 ? 'fine-amount positive' : 'fine-amount zero';
      return `
        <tr data-issue="${escapeHTML(r.issueId)}">
          <td><code>${escapeHTML(r.issueId)}</code></td>
          <td>${escapeHTML(r.bookTitle)}</td>
          <td>${escapeHTML(r.memberName)}</td>
          <td>${formatDate(r.issueDate)}</td>
          <td class="due-date-cell ${overdue ? 'overdue' : ''}">${formatDate(r.dueDate)}</td>
          <td>${daysLabel}</td>
          <td><span class="${fineClass}">${formatCurrency(fine)}</span></td>
          <td>
            <button type="button" class="btn btn-primary btn-sm" data-action="return-book" data-issue="${escapeHTML(r.issueId)}">Return</button>
          </td>
        </tr>
      `;
    }).join('');
  };

  return { render };
})();

/* ---------- HISTORY UI ---------- */
const HistoryUI = (() => {
  const render = () => {
    populateMemberFilter();
    renderTable();
    renderPagination();
    renderCount();
  };

  const populateMemberFilter = () => {
    const sel = document.getElementById('historyMemberFilter');
    const current = sel.value;
    sel.innerHTML = '<option value="">All Members</option>' +
      Members.getAll().map(m =>
        `<option value="${m.id}">${escapeHTML(m.name)} — ${escapeHTML(m.id)}</option>`
      ).join('');
    sel.value = current;
  };

  const renderCount = () => {
    const list = Issued.forHistoryPage();
    setText('historyResultCount', `${list.length} result${list.length !== 1 ? 's' : ''}`);
  };

  const renderTable = () => {
    const tbody = document.getElementById('historyTableBody');
    const empty = document.getElementById('historyEmpty');
    const list = Issued.forHistoryPage();
    const s = Issued.state.history;
    const start = (s.page - 1) * s.perPage;
    const paged = list.slice(start, start + s.perPage);

    if (list.length === 0) {
      tbody.innerHTML = '';
      empty.hidden = false;
      document.getElementById('historyPagination').hidden = true;
      return;
    }
    empty.hidden = true;
    document.getElementById('historyPagination').hidden = false;

    const STATUS_BADGE = { issued: 'info', returned: 'success', overdue: 'danger' };
    tbody.innerHTML = paged.map(r => {
      const st = Issued.liveStatus(r);
      return `
        <tr>
          <td><code>${escapeHTML(r.issueId)}</code></td>
          <td>${escapeHTML(r.bookTitle)}</td>
          <td>${escapeHTML(r.memberName)}</td>
          <td>${formatDate(r.issueDate)}</td>
          <td>${formatDate(r.dueDate)}</td>
          <td>${r.returnDate ? formatDate(r.returnDate) : '—'}</td>
          <td><span class="badge badge-${STATUS_BADGE[st]}">${st.toUpperCase()}</span></td>
          <td class="${r.fine > 0 ? 'text-danger' : ''}">${formatCurrency(r.fine || 0)}</td>
        </tr>
      `;
    }).join('');
  };

  const renderPagination = () => {
    const list = Issued.forHistoryPage();
    const s = Issued.state.history;
    const totalPages = Math.max(1, Math.ceil(list.length / s.perPage));
    if (s.page > totalPages) s.page = totalPages;
    const start = (s.page - 1) * s.perPage;
    const end = Math.min(start + s.perPage, list.length);
    setText('historyPageInfo', `Showing ${list.length ? start + 1 : 0} to ${end} of ${list.length} entries`);

    document.getElementById('historyPrevBtn').disabled = s.page <= 1;
    document.getElementById('historyNextBtn').disabled = s.page >= totalPages;

    const numbers = document.getElementById('historyPageNumbers');
    numbers.innerHTML = '';
    paginationRange(s.page, totalPages).forEach(p => {
      if (p === '...') {
        const span = document.createElement('span');
        span.textContent = '…'; span.className = 'text-muted';
        numbers.appendChild(span);
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'page-number' + (p === s.page ? ' is-active' : '');
        btn.textContent = p;
        btn.addEventListener('click', () => { s.page = p; render(); });
        numbers.appendChild(btn);
      }
    });
  };

  return { render };
})();

/* ---------- SETTINGS UI ---------- */
const SettingsUI = (() => {
  const render = () => {
    const s = Storage.getSettings();
    setValue('settingsLibraryName', s.libraryName);
    setValue('settingsAddress', s.address);
    setValue('settingsEmail', s.contactEmail);
    setValue('settingsPhone', s.contactPhone);
    setValue('settingsFineRate', s.fineRate);
    setValue('settingsBorrowDays', s.borrowDays);
    setValue('settingsMaxBooks', s.maxBooksPerMember);
    const dm = document.getElementById('settingsDarkMode');
    if (dm) dm.checked = !!s.darkMode;
  };
  return { render };
})();

/* ============================================================
   14. GLOBAL EVENT HANDLERS
   ============================================================ */
const Handlers = (() => {

  /* ---------- Login ---------- */
  const initLogin = () => {
    const form = document.getElementById('loginForm');
    const toggle = document.getElementById('togglePassword');
    const pwInput = document.getElementById('loginPassword');
    const alertEl = document.getElementById('loginAlert');

    toggle?.addEventListener('click', () => {
      const showing = pwInput.type === 'text';
      pwInput.type = showing ? 'password' : 'text';
      toggle.setAttribute('aria-pressed', String(!showing));
      toggle.textContent = showing ? '👁️' : '🙈';
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('loginUsername').value.trim();
      const p = document.getElementById('loginPassword').value;
      const remember = document.getElementById('rememberMe').checked;
      const btn = document.getElementById('loginBtn');

      alertEl.hidden = true;
      if (!u || !p) {
        alertEl.hidden = false;
        alertEl.className = 'alert alert-error';
        alertEl.textContent = 'Please enter both username and password.';
        return;
      }

      UI.setButtonLoading(btn, true);
      setTimeout(() => {
        if (Auth.verify(u, p)) {
          Auth.startSession(remember);
          alertEl.hidden = false;
          alertEl.className = 'alert alert-success';
          alertEl.textContent = 'Login successful! Redirecting...';
          setTimeout(() => App.showApp(), 700);
        } else {
          alertEl.hidden = false;
          alertEl.className = 'alert alert-error';
          alertEl.textContent = 'Invalid credentials. Try admin / admin123.';
          form.classList.add('is-shaking');
          setTimeout(() => form.classList.remove('is-shaking'), 500);
        }
        UI.setButtonLoading(btn, false);
      }, 600);
    });
  };

  /* ---------- Logout ---------- */
  const handleLogout = async () => {
    const ok = await UI.confirm({
      title: 'Confirm Logout',
      message: 'Are you sure you want to log out?',
      icon: '⎋',
      confirmText: 'Logout',
      variant: 'danger'
    });
    if (!ok) return;
    Auth.endSession();
    location.reload();
  };

  /* ---------- Navbar / Sidebar / User menu ---------- */
  const initShell = () => {
    document.getElementById('hamburgerBtn')?.addEventListener('click', () => {
      const isOpen = document.getElementById('sidebar').classList.contains('is-open');
      if (isOpen) Router.closeSidebar();
      else Router.openSidebar();
    });
    document.getElementById('sidebarCloseBtn')?.addEventListener('click', Router.closeSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', Router.closeSidebar);

    // Nav links
    document.querySelectorAll('.nav-link').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        Router.go(a.dataset.page);
      });
    });

    // Quick action buttons
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
      btn.addEventListener('click', () => Router.go(btn.dataset.goto));
    });

    // User menu
    const userBtn = document.getElementById('userMenuBtn');
    const dropdown = document.getElementById('userDropdown');
    userBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.hidden = !dropdown.hidden;
      userBtn.setAttribute('aria-expanded', String(!dropdown.hidden));
    });
    document.addEventListener('click', (e) => {
      if (!dropdown || dropdown.hidden) return;
      if (!e.target.closest('.user-menu')) {
        dropdown.hidden = true;
        userBtn.setAttribute('aria-expanded', 'false');
      }
    });
    dropdown?.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        dropdown.hidden = true;
        if (action === 'logout') handleLogout();
        else if (action === 'settings') Router.go('settingsPage');
        else if (action === 'profile') UI.showToast('Profile page coming soon', 'info');
      });
    });

    // Sidebar logout
    document.getElementById('sidebarLogoutBtn')?.addEventListener('click', handleLogout);

    // Dark mode toggle (navbar)
    document.getElementById('darkModeToggle')?.addEventListener('click', () => toggleDarkMode());

    // Notification bell
    document.getElementById('notificationBell')?.addEventListener('click', () => {
      const overdueList = Issued.overdue();
      const body = document.getElementById('notificationsBody');
      if (overdueList.length === 0) {
        body.innerHTML = '<div class="empty-state"><div class="empty-illustration">✅</div><p>No overdue books. Great job!</p></div>';
      } else {
        body.innerHTML = `
          <p class="mb-4">You have <strong class="text-danger">${overdueList.length}</strong> overdue book(s):</p>
          <ul class="top-list">
            ${overdueList.map(r => `
              <li class="top-list-item">
                <span class="top-rank">${Math.abs(Issued.daysLeft(r.dueDate))}</span>
                <div class="top-info">
                  <div class="top-title">${escapeHTML(r.bookTitle)}</div>
                  <div class="top-author">${escapeHTML(r.memberName)} · Due ${formatDate(r.dueDate)}</div>
                </div>
                <span class="badge badge-danger">Overdue</span>
              </li>
            `).join('')}
          </ul>
        `;
      }
      UI.openModal('notificationsModal');
    });

    // Global search
    const gs = document.getElementById('globalSearch');
    gs?.addEventListener('input', debounce((e) => {
      const q = e.target.value.trim();
      if (q.length < 2) return;
      // Show results modal
      const bookHits = Books.getAll().filter(b =>
        b.title.toLowerCase().includes(q.toLowerCase()) ||
        b.author.toLowerCase().includes(q.toLowerCase()) ||
        b.isbn.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 5);
      const memberHits = Members.getAll().filter(m =>
        m.name.toLowerCase().includes(q.toLowerCase()) ||
        m.email.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 5);
      const body = document.getElementById('searchResultsBody');
      body.innerHTML = `
        <h4 class="mb-3">Books (${bookHits.length})</h4>
        ${bookHits.length ? `<ul class="top-list mb-6">${bookHits.map(b => `
          <li class="top-list-item">
            <div class="top-info">
              <div class="top-title">${escapeHTML(b.title)}</div>
              <div class="top-author">${escapeHTML(b.author)} · ${escapeHTML(b.id)}</div>
            </div>
          </li>`).join('')}</ul>` : '<p class="text-muted mb-6">No matching books.</p>'}
        <h4 class="mb-3">Members (${memberHits.length})</h4>
        ${memberHits.length ? `<ul class="top-list">${memberHits.map(m => `
          <li class="top-list-item">
            <div class="top-info">
              <div class="top-title">${escapeHTML(m.name)}</div>
              <div class="top-author">${escapeHTML(m.email)} · ${escapeHTML(m.id)}</div>
            </div>
          </li>`).join('')}</ul>` : '<p class="text-muted">No matching members.</p>'}
      `;
      UI.openModal('searchResultsModal');
    }, 300));
  };

  /* ---------- Books page ---------- */
  const initBooks = () => {
    document.getElementById('bookForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateBookForm()) return;
      const data = readBookForm();
      const created = Books.add(data);
      if (created) {
        UI.showToast('Book added successfully.', 'success');
        e.target.reset();
        document.querySelectorAll('#bookForm .form-input, #bookForm .form-select').forEach(Validation.clearFieldError);
        BooksUI.render();
        Dashboard.updateStats();
        updateSidebarCounts();
      }
    });

    document.getElementById('bookResetBtn')?.addEventListener('click', () => {
      document.getElementById('bookForm').reset();
      document.querySelectorAll('#bookForm .form-input, #bookForm .form-select').forEach(Validation.clearFieldError);
    });

    // Live validation on blur
    ['bookTitle', 'bookAuthor', 'bookIsbn', 'bookCategory', 'bookQuantity', 'bookYear', 'bookPrice'].forEach(id => {
      const el = document.getElementById(id);
      el?.addEventListener('blur', () => validateBookField(id));
      el?.addEventListener('input', () => {
        if (el.classList.contains('is-invalid')) validateBookField(id);
      });
    });

    // Search & filters
    document.getElementById('bookSearchInput')?.addEventListener('input', debounce((e) => {
      Books.state.search = e.target.value.trim();
      Books.state.page = 1;
      BooksUI.render();
    }, 300));
    document.getElementById('bookCategoryFilter')?.addEventListener('change', (e) => {
      Books.state.category = e.target.value; Books.state.page = 1; BooksUI.render();
    });
    document.getElementById('bookAvailabilityFilter')?.addEventListener('change', (e) => {
      Books.state.availability = e.target.value; Books.state.page = 1; BooksUI.render();
    });
    document.getElementById('bookSortSelect')?.addEventListener('change', (e) => {
      Books.state.sort = e.target.value; BooksUI.render();
    });
    document.getElementById('clearBookFilters')?.addEventListener('click', () => {
      Books.state.search = ''; Books.state.category = ''; Books.state.availability = ''; Books.state.sort = 'newest'; Books.state.page = 1;
      document.getElementById('bookSearchInput').value = '';
      document.getElementById('bookCategoryFilter').value = '';
      document.getElementById('bookAvailabilityFilter').value = '';
      document.getElementById('bookSortSelect').value = 'newest';
      BooksUI.render();
    });

    // Pagination
    document.getElementById('booksPrevBtn')?.addEventListener('click', () => {
      if (Books.state.page > 1) { Books.state.page--; BooksUI.render(); }
    });
    document.getElementById('booksNextBtn')?.addEventListener('click', () => {
      const total = Math.ceil(Books.filtered().length / Books.state.perPage);
      if (Books.state.page < total) { Books.state.page++; BooksUI.render(); }
    });

    // Select all
    document.getElementById('booksSelectAll')?.addEventListener('change', (e) => {
      const list = Books.filtered();
      const s = Books.state;
      const start = (s.page - 1) * s.perPage;
      const pageIds = list.slice(start, start + s.perPage).map(b => b.id);
      if (e.target.checked) pageIds.forEach(id => s.selected.add(id));
      else pageIds.forEach(id => s.selected.delete(id));
      BooksUI.render();
    });

    // Bulk delete
    document.getElementById('bulkDeleteBooksBtn')?.addEventListener('click', async () => {
      const n = Books.state.selected.size;
      const ok = await UI.confirm({
        title: 'Delete Selected Books',
        message: `Delete <strong>${n}</strong> selected book(s)? This cannot be undone.`,
        confirmText: 'Delete',
        variant: 'danger'
      });
      if (!ok) return;
      const ids = [...Books.state.selected];
      const deleted = Books.bulkDelete(ids);
      Books.state.selected.clear();
      UI.showToast(`${deleted} book(s) deleted.`, 'success');
      BooksUI.render();
      Dashboard.updateStats();
      updateSidebarCounts();
    });

    // Export / print
    document.getElementById('exportBooksBtn')?.addEventListener('click', () => {
      const rows = Books.filtered().map(b => ({
        ID: b.id, Title: b.title, Author: b.author, ISBN: b.isbn,
        Category: b.category, Quantity: b.quantity, Available: b.available,
        Shelf: b.shelf, Price: b.price
      }));
      exportToCSV(rows, 'books');
    });
    document.getElementById('printBooksBtn')?.addEventListener('click', () => {
      printElement(document.getElementById('booksTable')?.closest('.card'));
    });

    // Add first book button
    document.getElementById('addFirstBookBtn')?.addEventListener('click', () => {
      document.getElementById('bookTitle').focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Toggle book form
    document.getElementById('toggleBookFormBtn')?.addEventListener('click', (e) => {
      const wrap = document.getElementById('bookFormWrapper');
      const hidden = wrap.hidden;
      wrap.hidden = !hidden;
      e.target.textContent = hidden ? 'Hide Form' : 'Show Form';
    });

    // Row checkbox change (delegation)
    document.getElementById('booksTableBody')?.addEventListener('change', (e) => {
      if (e.target.matches('.book-row-check')) {
        const id = e.target.dataset.id;
        if (e.target.checked) Books.state.selected.add(id);
        else Books.state.selected.delete(id);
        const bulkBtn = document.getElementById('bulkDeleteBooksBtn');
        if (Books.state.selected.size > 0) {
          bulkBtn.hidden = false;
          document.getElementById('bulkDeleteBooksCount').textContent = Books.state.selected.size;
        } else {
          bulkBtn.hidden = true;
        }
      }
    });
  };

  /* ---------- Members page ---------- */
  const initMembers = () => {
    document.getElementById('memberForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateMemberForm()) return;
      const created = Members.add(readMemberForm());
      if (created) {
        UI.showToast('Member added successfully.', 'success');
        e.target.reset();
        document.querySelectorAll('#memberForm .form-input, #memberForm .form-select, #memberForm .form-textarea').forEach(Validation.clearFieldError);
        MembersUI.render();
        updateSidebarCounts();
      }
    });

    document.getElementById('memberResetBtn')?.addEventListener('click', () => {
      document.getElementById('memberForm').reset();
      document.querySelectorAll('#memberForm .form-input, #memberForm .form-select, #memberForm .form-textarea').forEach(Validation.clearFieldError);
    });

    ['memberName', 'memberEmail', 'memberPhone', 'memberType'].forEach(id => {
      const el = document.getElementById(id);
      el?.addEventListener('blur', () => validateMemberField(id));
      el?.addEventListener('input', () => { if (el.classList.contains('is-invalid')) validateMemberField(id); });
    });

    document.getElementById('memberSearchInput')?.addEventListener('input', debounce((e) => {
      Members.state.search = e.target.value.trim(); Members.state.page = 1; MembersUI.render();
    }, 300));
    document.getElementById('memberTypeFilter')?.addEventListener('change', (e) => {
      Members.state.type = e.target.value; Members.state.page = 1; MembersUI.render();
    });
    document.getElementById('memberSortSelect')?.addEventListener('change', (e) => {
      Members.state.sort = e.target.value; MembersUI.render();
    });

    document.getElementById('membersPrevBtn')?.addEventListener('click', () => {
      if (Members.state.page > 1) { Members.state.page--; MembersUI.render(); }
    });
    document.getElementById('membersNextBtn')?.addEventListener('click', () => {
      const total = Math.ceil(Members.filtered().length / Members.state.perPage);
      if (Members.state.page < total) { Members.state.page++; MembersUI.render(); }
    });

    document.getElementById('exportMembersBtn')?.addEventListener('click', () => {
      const rows = Members.filtered().map(m => ({
        ID: m.id, Name: m.name, Email: m.email, Phone: m.phone,
        Type: m.type, Joined: formatDate(m.joinDate),
        'Active Issues': Members.issuedCount(m.id)
      }));
      exportToCSV(rows, 'members');
    });
    document.getElementById('printMembersBtn')?.addEventListener('click', () => {
      printElement(document.getElementById('membersTable')?.closest('.card'));
    });
  };

  /* ---------- Issue page ---------- */
  const initIssue = () => {
    document.getElementById('issueMemberSelect')?.addEventListener('change', IssueUI.showInfo);
    document.getElementById('issueBookSelect')?.addEventListener('change', IssueUI.showInfo);

    document.getElementById('issueForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const mId = document.getElementById('issueMemberSelect').value;
      const bId = document.getElementById('issueBookSelect').value;
      const iDate = document.getElementById('issueDate').value;
      const dDate = document.getElementById('dueDate').value;
      const remarks = document.getElementById('issueRemarks').value;

      if (!mId) { UI.showToast('Please select a member.', 'error'); return; }
      if (!bId) { UI.showToast('Please select a book.', 'error'); return; }
      if (!dDate || dDate <= iDate) { UI.showToast('Due date must be after issue date.', 'error'); return; }

      const btn = document.getElementById('issueSubmitBtn');
      UI.setButtonLoading(btn, true);
      setTimeout(() => {
        const rec = Issued.issue({ memberId: mId, bookId: bId, issueDate: iDate, dueDate: dDate, remarks });
        UI.setButtonLoading(btn, false);
        if (rec) {
          UI.showToast('Book issued successfully.', 'success');
          showReceipt(rec, 'issue');
          document.getElementById('issueForm').reset();
          IssueUI.refresh();
          Dashboard.render();
          updateSidebarCounts();
        }
      }, 400);
    });

    document.getElementById('issueResetBtn')?.addEventListener('click', () => {
      document.getElementById('issueForm').reset();
      IssueUI.refresh();
    });
  };

  /* ---------- Return page ---------- */
  const initReturn = () => {
    document.getElementById('returnSearchInput')?.addEventListener('input', debounce((e) => {
      Issued.state.return.search = e.target.value.trim();
      ReturnUI.render();
    }, 300));
    document.getElementById('returnStatusFilter')?.addEventListener('change', (e) => {
      Issued.state.return.status = e.target.value;
      ReturnUI.render();
    });

    document.getElementById('returnTableBody')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action="return-book"]');
      if (!btn) return;
      const issueId = btn.dataset.issue;
      await handleReturn(issueId);
    });
  };

  /* ---------- History page ---------- */
  const initHistory = () => {
    document.getElementById('historyStatusFilter')?.addEventListener('change', (e) => {
      Issued.state.history.status = e.target.value; Issued.state.history.page = 1; HistoryUI.render();
    });
    document.getElementById('historyFromDate')?.addEventListener('change', (e) => {
      Issued.state.history.from = e.target.value; Issued.state.history.page = 1; HistoryUI.render();
    });
    document.getElementById('historyToDate')?.addEventListener('change', (e) => {
      Issued.state.history.to = e.target.value; Issued.state.history.page = 1; HistoryUI.render();
    });
    document.getElementById('historyMemberFilter')?.addEventListener('change', (e) => {
      Issued.state.history.memberId = e.target.value; Issued.state.history.page = 1; HistoryUI.render();
    });
    document.getElementById('clearHistoryFilters')?.addEventListener('click', () => {
      Issued.state.history = { status: '', from: '', to: '', memberId: '', page: 1, perPage: 15 };
      document.getElementById('historyStatusFilter').value = '';
      document.getElementById('historyFromDate').value = '';
      document.getElementById('historyToDate').value = '';
      document.getElementById('historyMemberFilter').value = '';
      HistoryUI.render();
    });
    document.getElementById('historyPrevBtn')?.addEventListener('click', () => {
      if (Issued.state.history.page > 1) { Issued.state.history.page--; HistoryUI.render(); }
    });
    document.getElementById('historyNextBtn')?.addEventListener('click', () => {
      const total = Math.ceil(Issued.forHistoryPage().length / Issued.state.history.perPage);
      if (Issued.state.history.page < total) { Issued.state.history.page++; HistoryUI.render(); }
    });
    document.getElementById('exportHistoryBtn')?.addEventListener('click', () => {
      const rows = Issued.forHistoryPage().map(r => ({
        'Issue ID': r.issueId, Book: r.bookTitle, Member: r.memberName,
        'Issue Date': r.issueDate, 'Due Date': r.dueDate,
        'Return Date': r.returnDate || '',
        Status: Issued.liveStatus(r),
        Fine: r.fine || 0
      }));
      exportToCSV(rows, 'issue-history');
    });
    document.getElementById('printHistoryBtn')?.addEventListener('click', () => {
      printElement(document.getElementById('historyTable')?.closest('.card'));
    });
  };

  /* ---------- Reports page ---------- */
  const initReports = () => {
    document.querySelectorAll('[data-report-btn]').forEach(btn => {
      btn.addEventListener('click', () => Reports.render(btn.dataset.reportBtn));
    });
    document.getElementById('reportExportBtn')?.addEventListener('click', Reports.exportCSV);
    document.getElementById('reportPrintBtn')?.addEventListener('click', Reports.print);
    document.getElementById('reportCloseBtn')?.addEventListener('click', () => {
      document.getElementById('reportDetailCard').hidden = true;
    });
  };

  /* ---------- Settings page ---------- */
  const initSettings = () => {
    document.getElementById('settingsLibraryForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      Settings.saveLibraryInfo({
        libraryName: document.getElementById('settingsLibraryName').value,
        address: document.getElementById('settingsAddress').value,
        contactEmail: document.getElementById('settingsEmail').value,
        contactPhone: document.getElementById('settingsPhone').value
      });
    });
    document.getElementById('settingsRulesForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      Settings.saveRules({
        fineRate: document.getElementById('settingsFineRate').value,
        borrowDays: document.getElementById('settingsBorrowDays').value,
        maxBooks: document.getElementById('settingsMaxBooks').value
      });
    });
    document.getElementById('settingsDarkMode')?.addEventListener('change', () => toggleDarkMode());

    document.getElementById('backupDataBtn')?.addEventListener('click', Settings.backup);
    document.getElementById('restoreFileInput')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) await Settings.restore(file);
      e.target.value = '';
    });
    document.getElementById('clearActivityBtn2')?.addEventListener('click', async () => {
      const ok = await UI.confirm({
        title: 'Clear Activity Log',
        message: 'Delete all activity entries?',
        confirmText: 'Clear',
        variant: 'warning',
        icon: '🧹'
      });
      if (ok) { Activity.clear(); Dashboard.renderActivity(); UI.showToast('Activity log cleared.', 'success'); }
    });
    document.getElementById('resetAllDataBtn')?.addEventListener('click', async () => {
      const ok1 = await UI.confirm({
        title: 'Reset All Data',
        message: '<strong>This will delete ALL books, members, and issued records.</strong><br>Are you sure?',
        confirmText: 'Yes, continue',
        variant: 'danger',
        icon: '⚠️'
      });
      if (!ok1) return;
      const ok2 = await UI.confirm({
        title: 'Final Confirmation',
        message: 'This cannot be undone. Delete everything?',
        confirmText: 'DELETE EVERYTHING',
        variant: 'danger',
        icon: '🔴'
      });
      if (ok2) Settings.resetAll();
    });
  };

  /* ---------- Dashboard misc ---------- */
  const initDashboardMisc = () => {
    document.getElementById('clearActivityBtn')?.addEventListener('click', async () => {
      const ok = await UI.confirm({
        title: 'Clear Activity Log',
        message: 'Delete all activity entries?',
        confirmText: 'Clear',
        variant: 'warning',
        icon: '🧹'
      });
      if (ok) { Activity.clear(); Dashboard.renderActivity(); UI.showToast('Activity log cleared.', 'success'); }
    });
  };

  /* ---------- Modal close wiring ---------- */
  const initModals = () => {
    document.querySelectorAll('[data-close-modal]').forEach(el => {
      el.addEventListener('click', () => UI.closeModal(el.dataset.closeModal));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal:not([hidden])').forEach(m => UI.closeModal(m.id));
      }
    });
  };

  /* ---------- Keyboard shortcuts ---------- */
  const initShortcuts = () => {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K → focus global search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('globalSearch')?.focus();
      }
      // Ctrl+D → toggle dark mode
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleDarkMode();
      }
    });
  };

  /* ---------- Delegated actions ---------- */
  const initDelegatedActions = () => {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === 'view-book')      return showBookView(id);
      if (action === 'edit-book')      return showBookEdit(id);
      if (action === 'delete-book')    return handleBookDelete(id);
      if (action === 'issue-book')     return handleQuickIssue(id);
      if (action === 'view-member')    return showMemberProfile(id);
      if (action === 'edit-member')    return showMemberEdit(id);
      if (action === 'delete-member')  return handleMemberDelete(id);
    });

    // Receipt print
    document.getElementById('receiptPrintBtn')?.addEventListener('click', () => {
      printElement(document.getElementById('receiptBody'));
    });
    document.getElementById('memberProfilePrintBtn')?.addEventListener('click', () => {
      printElement(document.getElementById('memberProfileBody'));
    });
  };

  /* ---------- Inactivity listener ---------- */
  const initInactivity = () => {
    ['click', 'keydown', 'mousemove', 'scroll'].forEach(evt => {
      document.addEventListener(evt, debounce(() => Auth.resetInactivityTimer(), 1000), { passive: true });
    });
  };

  return {
    initLogin, initShell, initBooks, initMembers, initIssue, initReturn,
    initHistory, initReports, initSettings, initDashboardMisc,
    initModals, initShortcuts, initDelegatedActions, initInactivity
  };
})();

/* ============================================================
   FORM VALIDATION HELPERS
   ============================================================ */
const validateBookField = (id) => {
  const el = document.getElementById(id);
  if (!el) return true;
  const v = el.value;
  switch (id) {
    case 'bookTitle':
      if (!v.trim()) return Validation.setFieldError(el, 'Title is required.'), false;
      if (v.trim().length < 2) return Validation.setFieldError(el, 'Title is too short.'), false;
      break;
    case 'bookAuthor':
      if (!v.trim()) return Validation.setFieldError(el, 'Author is required.'), false;
      break;
    case 'bookIsbn':
      if (!v.trim()) return Validation.setFieldError(el, 'ISBN is required.'), false;
      if (!Validation.isIsbn(v)) return Validation.setFieldError(el, 'ISBN must be 10 or 13 digits.'), false;
      if (Books.getAll().some(b => b.isbn === v.trim())) return Validation.setFieldError(el, 'ISBN already exists.'), false;
      break;
    case 'bookCategory':
      if (!v) return Validation.setFieldError(el, 'Please select a category.'), false;
      break;
    case 'bookQuantity':
      if (!Validation.isPositiveInt(v)) return Validation.setFieldError(el, 'Quantity must be ≥ 1.'), false;
      break;
    case 'bookYear':
      if (v && !Validation.isYear(v)) return Validation.setFieldError(el, `Year must be 1900–${new Date().getFullYear()}.`), false;
      break;
    case 'bookPrice':
      if (v && (Number(v) < 0 || !/^\d+(\.\d{1,2})?$/.test(v))) return Validation.setFieldError(el, 'Price must be a positive number.'), false;
      break;
  }
  Validation.setFieldError(el, '');
  return true;
};

const validateBookForm = () => {
  const fields = ['bookTitle', 'bookAuthor', 'bookIsbn', 'bookCategory', 'bookQuantity', 'bookYear', 'bookPrice'];
  return fields.map(validateBookField).every(Boolean);
};

const readBookForm = () => ({
  title:    document.getElementById('bookTitle').value,
  author:   document.getElementById('bookAuthor').value,
  isbn:     document.getElementById('bookIsbn').value,
  category: document.getElementById('bookCategory').value,
  publisher:document.getElementById('bookPublisher').value,
  year:     document.getElementById('bookYear').value,
  quantity: document.getElementById('bookQuantity').value,
  shelf:    document.getElementById('bookShelf').value,
  price:    document.getElementById('bookPrice').value
});

const validateMemberField = (id) => {
  const el = document.getElementById(id);
  if (!el) return true;
  const v = el.value;
  switch (id) {
    case 'memberName':
      if (!v.trim()) return Validation.setFieldError(el, 'Name is required.'), false;
      if (v.trim().length < 3) return Validation.setFieldError(el, 'Name must be at least 3 characters.'), false;
      if (!Validation.isName(v)) return Validation.setFieldError(el, 'Only letters and spaces.'), false;
      break;
    case 'memberEmail':
      if (!v.trim()) return Validation.setFieldError(el, 'Email is required.'), false;
      if (!Validation.isEmail(v)) return Validation.setFieldError(el, 'Invalid email format.'), false;
      if (Members.getAll().some(m => m.email.toLowerCase() === v.trim().toLowerCase()))
        return Validation.setFieldError(el, 'Email already registered.'), false;
      break;
    case 'memberPhone':
      if (!v.trim()) return Validation.setFieldError(el, 'Phone is required.'), false;
      if (!Validation.isPhone(v)) return Validation.setFieldError(el, 'Must be exactly 10 digits.'), false;
      break;
    case 'memberType':
      if (!v) return Validation.setFieldError(el, 'Please select a type.'), false;
      break;
  }
  Validation.setFieldError(el, '');
  return true;
};

const validateMemberForm = () => {
  const fields = ['memberName', 'memberEmail', 'memberPhone', 'memberType'];
  return fields.map(validateMemberField).every(Boolean);
};

const readMemberForm = () => ({
  name:     document.getElementById('memberName').value,
  email:    document.getElementById('memberEmail').value,
  phone:    document.getElementById('memberPhone').value,
  type:     document.getElementById('memberType').value,
  joinDate: document.getElementById('memberJoinDate').value
    ? new Date(document.getElementById('memberJoinDate').value).toISOString()
    : new Date().toISOString(),
  address:  document.getElementById('memberAddress').value
});

/* ============================================================
   ACTION HANDLERS
   ============================================================ */
const handleBookDelete = async (id) => {
  const b = Books.findById(id);
  if (!b) return;
  const ok = await UI.confirm({
    title: 'Delete Book',
    message: `Are you sure you want to delete "<strong>${escapeHTML(b.title)}</strong>"?`,
    confirmText: 'Delete',
    variant: 'danger',
    icon: '🗑️'
  });
  if (!ok) return;
  if (Books.remove(id)) {
    UI.showToast('Book deleted.', 'success');
    BooksUI.render();
    Dashboard.updateStats();
    updateSidebarCounts();
  }
};

const handleMemberDelete = async (id) => {
  const m = Members.findById(id);
  if (!m) return;
  const ok = await UI.confirm({
    title: 'Delete Member',
    message: `Delete "<strong>${escapeHTML(m.name)}</strong>"?`,
    confirmText: 'Delete',
    variant: 'danger',
    icon: '🗑️'
  });
  if (!ok) return;
  if (Members.remove(id)) {
    UI.showToast('Member deleted.', 'success');
    MembersUI.render();
    updateSidebarCounts();
  }
};

const handleQuickIssue = (bookId) => {
  Router.go('issuePage');
  setTimeout(() => {
    IssueUI.refresh();
    document.getElementById('issueBookSelect').value = bookId;
    IssueUI.showInfo();
  }, 200);
};

const handleReturn = async (issueId) => {
  const rec = Issued.getAll().find(r => r.issueId === issueId);
  if (!rec) return;
  const settings = Storage.getSettings();
  const today = todayISO();
  const fine = Issued.calculateFine(rec.dueDate, today, settings.fineRate);
  const ok = await UI.confirm({
    title: 'Confirm Return',
    message: `
      <strong>Book:</strong> ${escapeHTML(rec.bookTitle)}<br>
      <strong>Member:</strong> ${escapeHTML(rec.memberName)}<br>
      <strong>Due Date:</strong> ${formatDate(rec.dueDate)}<br>
      <strong>Return Date:</strong> ${formatDate(today)}<br>
      ${fine > 0 ? `<br><strong style="color:var(--color-danger)">Fine Due: ${formatCurrency(fine)}</strong>` : '<br><em>No fine.</em>'}
    `,
    confirmText: 'Confirm Return',
    variant: 'primary',
    icon: '📥'
  });
  if (!ok) return;
  const updated = Issued.returnBook(issueId);
  if (updated) {
    UI.showToast('Book returned successfully.', 'success');
    showReceipt(updated, 'return');
    ReturnUI.render();
    HistoryUI.render();
    Dashboard.render();
    updateSidebarCounts();
  }
};

/* ============================================================
   MODAL RENDERERS
   ============================================================ */
const showBookView = (id) => {
  const b = Books.findById(id);
  if (!b) return;
  const status = b.available === 0 ? 'danger' : (b.available <= 2 ? 'warning' : 'success');
  const statusText = b.available === 0 ? 'Out of Stock' : (b.available <= 2 ? 'Low Stock' : 'Available');
  document.getElementById('viewBookBody').innerHTML = `
    <h3>${escapeHTML(b.title)}</h3>
    <p class="text-muted mb-4">${escapeHTML(b.author)}</p>
    <ul class="about-list">
      <li><strong>ID:</strong> <code>${escapeHTML(b.id)}</code></li>
      <li><strong>ISBN:</strong> ${escapeHTML(b.isbn)}</li>
      <li><strong>Category:</strong> ${escapeHTML(b.category)}</li>
      <li><strong>Publisher:</strong> ${escapeHTML(b.publisher || '—')}</li>
      <li><strong>Year:</strong> ${b.year || '—'}</li>
      <li><strong>Shelf:</strong> ${escapeHTML(b.shelf || '—')}</li>
      <li><strong>Quantity:</strong> ${b.quantity}</li>
      <li><strong>Available:</strong> ${b.available}</li>
      <li><strong>Price:</strong> ${formatCurrency(b.price)}</li>
      <li><strong>Status:</strong> <span class="badge badge-${status}">${statusText}</span></li>
    </ul>
  `;
  UI.openModal('viewBookModal');
};

const showBookEdit = (id) => {
  const b = Books.findById(id);
  if (!b) return;
  setValue('editBookId', b.id);
  setValue('editBookTitleInput', b.title);
  setValue('editBookAuthor', b.author);
  setValue('editBookIsbn', b.isbn);
  setValue('editBookCategory', b.category);
  setValue('editBookPublisher', b.publisher);
  setValue('editBookYear', b.year);
  setValue('editBookQuantity', b.quantity);
  setValue('editBookShelf', b.shelf);
  setValue('editBookPrice', b.price);
  UI.openModal('editBookModal');
};

const showMemberEdit = (id) => {
  const m = Members.findById(id);
  if (!m) return;
  setValue('editMemberId', m.id);
  setValue('editMemberName', m.name);
  setValue('editMemberEmail', m.email);
  setValue('editMemberPhone', m.phone);
  setValue('editMemberType', m.type);
  setValue('editMemberAddress', m.address);
  UI.openModal('editMemberModal');
};

const showMemberProfile = (id) => {
  const m = Members.findById(id);
  if (!m) return;
  const history = Issued.byMember(id);
  const activeCount = Members.issuedCount(id);
  const totalCount = Members.totalIssued(id);
  const fines = Members.totalFines(id);
  document.getElementById('memberProfileBody').innerHTML = `
    <div class="flex items-center gap-4 mb-6">
      ${UI.avatarHTML(m.name, 'lg')}
      <div>
        <h3>${escapeHTML(m.name)}</h3>
        <p class="text-muted">${escapeHTML(m.id)} · ${escapeHTML(m.type)}</p>
      </div>
    </div>
    <ul class="about-list mb-6">
      <li><strong>Email:</strong> ${escapeHTML(m.email)}</li>
      <li><strong>Phone:</strong> ${escapeHTML(m.phone)}</li>
      <li><strong>Address:</strong> ${escapeHTML(m.address || '—')}</li>
      <li><strong>Joined:</strong> ${formatDate(m.joinDate)}</li>
    </ul>
    <div class="stat-grid mb-6">
      <div class="stat-card stat-card-primary"><div class="stat-body"><div class="stat-value">${totalCount}</div><div class="stat-label">Total Borrowed</div></div></div>
      <div class="stat-card stat-card-warning"><div class="stat-body"><div class="stat-value">${activeCount}</div><div class="stat-label">Currently Issued</div></div></div>
      <div class="stat-card stat-card-danger"><div class="stat-body"><div class="stat-value">${formatCurrency(fines)}</div><div class="stat-label">Total Fines</div></div></div>
    </div>
    <h4 class="mb-3">Issue History</h4>
    ${history.length ? `
      <div class="table-responsive">
        <table class="report-table">
          <thead><tr><th>Issue ID</th><th>Book</th><th>Issued</th><th>Due</th><th>Status</th><th>Fine</th></tr></thead>
          <tbody>
            ${history.map(r => `
              <tr>
                <td><code>${escapeHTML(r.issueId)}</code></td>
                <td>${escapeHTML(r.bookTitle)}</td>
                <td>${formatDate(r.issueDate)}</td>
                <td>${formatDate(r.dueDate)}</td>
                <td>${Issued.liveStatus(r).toUpperCase()}</td>
                <td>${formatCurrency(r.fine || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '<p class="text-muted">No issue history.</p>'}
  `;
  UI.openModal('memberProfileModal');
};

/**
 * Shows a printable receipt for issue or return.
 * @param {Object} rec
 * @param {'issue'|'return'} kind
 */
const showReceipt = (rec, kind) => {
  const s = Storage.getSettings();
  const title = kind === 'issue' ? 'Book Issue Receipt' : 'Book Return Receipt';
  document.getElementById('receiptTitle').textContent = title;
  document.getElementById('receiptBody').innerHTML = `
    <div class="receipt">
      <div class="text-center mb-4">
        <h3>${escapeHTML(s.libraryName)}</h3>
        <p class="text-muted">${escapeHTML(s.address)}</p>
        <p class="text-muted">${escapeHTML(s.contactEmail)} · ${escapeHTML(s.contactPhone)}</p>
        <hr>
        <h4>${escapeHTML(title)}</h4>
      </div>
      <ul class="about-list">
        <li><strong>Issue ID:</strong> ${escapeHTML(rec.issueId)}</li>
        <li><strong>Book:</strong> ${escapeHTML(rec.bookTitle)}</li>
        <li><strong>Member:</strong> ${escapeHTML(rec.memberName)} (${escapeHTML(rec.memberId)})</li>
        <li><strong>Issue Date:</strong> ${formatDate(rec.issueDate)}</li>
        <li><strong>Due Date:</strong> ${formatDate(rec.dueDate)}</li>
        ${rec.returnDate ? `<li><strong>Return Date:</strong> ${formatDate(rec.returnDate)}</li>` : ''}
        ${rec.fine > 0 ? `<li><strong>Fine:</strong> <span class="text-danger">${formatCurrency(rec.fine)}</span></li>` : ''}
        ${rec.remarks ? `<li><strong>Remarks:</strong> ${escapeHTML(rec.remarks)}</li>` : ''}
      </ul>
      <hr>
      <p class="text-center text-muted">Thank you for using ${escapeHTML(s.libraryName)}!</p>
    </div>
  `;
  UI.openModal('receiptModal');
};

/* ============================================================
   EDIT MODAL SAVE HANDLERS (init once)
   ============================================================ */
const initEditModals = () => {
  document.getElementById('editBookSaveBtn')?.addEventListener('click', () => {
    const id = document.getElementById('editBookId').value;
    const patch = {
      title: document.getElementById('editBookTitleInput').value,
      author: document.getElementById('editBookAuthor').value,
      isbn: document.getElementById('editBookIsbn').value,
      category: document.getElementById('editBookCategory').value,
      publisher: document.getElementById('editBookPublisher').value,
      year: document.getElementById('editBookYear').value,
      quantity: document.getElementById('editBookQuantity').value,
      shelf: document.getElementById('editBookShelf').value,
      price: document.getElementById('editBookPrice').value
    };
    if (!patch.title.trim() || !patch.author.trim() || !patch.isbn.trim() || !patch.category || !patch.quantity) {
      UI.showToast('Please fill all required fields.', 'error');
      return;
    }
    if (Books.update(id, patch)) {
      UI.showToast('Book updated.', 'success');
      UI.closeModal('editBookModal');
      BooksUI.render();
      Dashboard.updateStats();
    }
  });

  document.getElementById('editMemberSaveBtn')?.addEventListener('click', () => {
    const id = document.getElementById('editMemberId').value;
    const patch = {
      name: document.getElementById('editMemberName').value,
      email: document.getElementById('editMemberEmail').value,
      phone: document.getElementById('editMemberPhone').value,
      type: document.getElementById('editMemberType').value,
      address: document.getElementById('editMemberAddress').value
    };
    if (!patch.name.trim() || !patch.email.trim() || !patch.phone.trim()) {
      UI.showToast('Please fill all required fields.', 'error');
      return;
    }
    if (Members.update(id, patch)) {
      UI.showToast('Member updated.', 'success');
      UI.closeModal('editMemberModal');
      MembersUI.render();
    }
  });
};

/* ============================================================
   HELPERS — SET / GET DOM VALUES
   ============================================================ */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function setValue(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v ?? '';
}
function updateSidebarCounts() {
  setText('navBooksCount', Books.getAll().length);
  setText('navMembersCount', Members.getAll().length);
  const overdue = Issued.overdue().length;
  const badge = document.getElementById('navOverdueCount');
  if (badge) {
    badge.hidden = overdue === 0;
    badge.textContent = overdue;
  }
  const nb = document.getElementById('notificationCount');
  const bell = document.getElementById('notificationBell');
  if (nb) {
    nb.hidden = overdue === 0;
    nb.textContent = overdue;
  }
  if (bell) bell.classList.toggle('is-pulsing', overdue > 0);
}

/**
 * Computes a pagination range like [1, '...', 4, 5, 6, '...', 20].
 * @param {number} current
 * @param {number} total
 * @returns {Array<number|string>}
 */
function paginationRange(current, total) {
  const delta = 2;
  const range = [];
  const rangeWithDots = [];
  let l;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }
  for (const i of range) {
    if (l) {
      if (i - l === 2) rangeWithDots.push(l + 1);
      else if (i - l !== 1) rangeWithDots.push('...');
    }
    rangeWithDots.push(i);
    l = i;
  }
  return rangeWithDots;
}

/* ============================================================
   EXPORT / PRINT UTILITIES
   ============================================================ */
/**
 * Exports an array of objects to CSV.
 * @param {Array<Object>} rows
 * @param {string} filename
 */
function exportToCSV(rows, filename) {
  try {
    if (!rows || rows.length === 0) {
      UI.showToast('Nothing to export.', 'warning');
      return;
    }
    const headers = Object.keys(rows[0]);
    const escape = (v) => {
      const s = String(v ?? '');
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      headers.join(','),
      ...rows.map(r => headers.map(h => escape(r[h])).join(','))
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    UI.showToast('CSV downloaded.', 'success');
  } catch (err) {
    console.error('[LMS] exportToCSV', err);
    UI.showToast('Export failed.', 'error');
  }
}

/**
 * Opens the browser print dialog for a specific element.
 * @param {HTMLElement} el
 */
function printElement(el) {
  if (!el) return;
  const printWindow = window.open('', '_blank', 'width=900,height=650');
  if (!printWindow) {
    UI.showToast('Allow pop-ups to print.', 'warning');
    return;
  }
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(n => n.outerHTML).join('');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html><head><title>Print</title>${styles}
    <style>
      body { padding: 20px; background: #fff; color: #000; }
      .btn, .card-header-actions, .filter-bar, .pagination { display: none !important; }
    </style>
    </head><body>${el.outerHTML}</body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
}

/* ============================================================
   DARK MODE
   ============================================================ */
function toggleDarkMode() {
  const s = Storage.getSettings();
  const next = !s.darkMode;
  Storage.setSettings({ ...s, darkMode: next });
  applyTheme(next);
  const dm = document.getElementById('settingsDarkMode');
  if (dm) dm.checked = next;
}

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const toggle = document.getElementById('darkModeToggle');
  if (toggle) toggle.setAttribute('aria-pressed', String(dark));
}

/* ============================================================
   15. SAMPLE DATA SEEDER
   ============================================================ */
const seedSampleData = () => {
  try {
    if (!Storage.isEmpty()) return;

    console.log('[LMS] Seeding sample data...');

    const now = new Date();
    const iso = (d) => d.toISOString();

    // Books
    const sampleBooks = [
      { title: 'JavaScript: The Good Parts', author: 'Douglas Crockford', isbn: '9780596517748', category: 'Technology', publisher: "O'Reilly Media", year: 2008, quantity: 5, shelf: 'A-12', price: 450 },
      { title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', category: 'Technology', publisher: 'Prentice Hall', year: 2008, quantity: 4, shelf: 'A-13', price: 620 },
      { title: 'The Pragmatic Programmer', author: 'Andrew Hunt', isbn: '9780201616224', category: 'Technology', publisher: 'Addison-Wesley', year: 1999, quantity: 3, shelf: 'A-14', price: 550 },
      { title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '9780553380163', category: 'Science', publisher: 'Bantam', year: 1998, quantity: 6, shelf: 'B-01', price: 380 },
      { title: 'The Selfish Gene', author: 'Richard Dawkins', isbn: '9780199291151', category: 'Science', publisher: 'Oxford', year: 2006, quantity: 2, shelf: 'B-02', price: 420 },
      { title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '9780099590088', category: 'History', publisher: 'Vintage', year: 2015, quantity: 5, shelf: 'C-05', price: 599 },
      { title: 'The Diary of a Young Girl', author: 'Anne Frank', isbn: '9780553296983', category: 'Biography', publisher: 'Bantam', year: 1993, quantity: 4, shelf: 'D-03', price: 320 },
      { title: 'Harry Potter and the Philosopher\'s Stone', author: 'J.K. Rowling', isbn: '9780747532699', category: 'Fiction', publisher: 'Bloomsbury', year: 1997, quantity: 8, shelf: 'E-01', price: 499 },
      { title: 'The Very Hungry Caterpillar', author: 'Eric Carle', isbn: '9780241003008', category: 'Children', publisher: 'Puffin', year: 1969, quantity: 6, shelf: 'F-02', price: 250 },
      { title: 'Oxford English Dictionary', author: 'Oxford Press', isbn: '9780199571123', category: 'Reference', publisher: 'Oxford', year: 2010, quantity: 2, shelf: 'G-01', price: 1500 }
    ];
    const books = sampleBooks.map((b, i) => ({
      id: generateId('BK', i + 1),
      ...b,
      available: b.quantity,
      addedDate: iso(new Date(now.getTime() - i * 24 * 60 * 60 * 1000))
    }));

    // Members
    const sampleMembers = [
      { name: 'Rahul Sharma', email: 'rahul@example.com', phone: '9876543210', address: '123 Main St, Mumbai', type: 'Student' },
      { name: 'Priya Patel', email: 'priya@example.com', phone: '9876543211', address: '45 Park Ave, Delhi', type: 'Teacher' },
      { name: 'Amit Kumar', email: 'amit@example.com', phone: '9876543212', address: '78 Lake Rd, Bengaluru', type: 'Public' },
      { name: 'Sneha Reddy', email: 'sneha@example.com', phone: '9876543213', address: '9 Hill View, Hyderabad', type: 'Student' },
      { name: 'Vikram Singh', email: 'vikram@example.com', phone: '9876543214', address: '22 Rose Garden, Jaipur', type: 'Teacher' }
    ];
    const members = sampleMembers.map((m, i) => ({
      id: generateId('MB', i + 1),
      ...m,
      joinDate: iso(new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000))
    }));

    // Sample issued records
    const today = now.toISOString().slice(0, 10);
    const issued = [
      {
        issueId: generateId('ISS', 1),
        bookId: books[0].id, bookTitle: books[0].title,
        memberId: members[0].id, memberName: members[0].name,
        issueDate: addDays(today, -5), dueDate: addDays(today, 9),
        returnDate: null, status: 'issued', fine: 0, remarks: 'Active issue'
      },
      {
        issueId: generateId('ISS', 2),
        bookId: books[1].id, bookTitle: books[1].title,
        memberId: members[1].id, memberName: members[1].name,
        issueDate: addDays(today, -30), dueDate: addDays(today, -16),
        returnDate: addDays(today, -12), status: 'returned', fine: 20, remarks: 'Returned with fine'
      },
      {
        issueId: generateId('ISS', 3),
        bookId: books[2].id, bookTitle: books[2].title,
        memberId: members[3].id, memberName: members[3].name,
        issueDate: addDays(today, -20), dueDate: addDays(today, -6),
        returnDate: null, status: 'issued', fine: 0, remarks: 'Overdue'
      }
    ];

    // Adjust available counts for issued records
    issued.forEach(r => {
      const b = books.find(x => x.id === r.bookId);
      if (b && r.status !== 'returned') b.available -= 1;
    });

    Storage.setBooks(books);
    Storage.setMembers(members);
    Storage.setIssued(issued);
    Storage.setSettings(Storage.DEFAULT_SETTINGS);
    Storage.setActivity([
      { id: generateId('ACT', 1), action: 'BOOK_ADDED', details: 'Sample data seeded', timestamp: iso(now) }
    ]);

    console.log('[LMS] Sample data seeded successfully.');
  } catch (err) {
    console.error('[LMS] seedSampleData failed', err);
  }
};

/* ============================================================
   16. APP BOOTSTRAP
   ============================================================ */
const App = (() => {

  /**
   * Shows the app shell and hides login page.
   */
  const showApp = () => {
    document.getElementById('loginPage').hidden = true;
    document.getElementById('loginPage').classList.remove('is-active');
    document.getElementById('appShell').hidden = false;

    // Load data
    Books.load();
    Members.load();
    Issued.load();

    // Apply theme
    const s = Storage.getSettings();
    applyTheme(!!s.darkMode);

    // Apply branding
    Settings.applyLibraryBranding();

    // Initial renders
    Dashboard.render();
    BooksUI.render();
    MembersUI.render();
    IssueUI.refresh();
    ReturnUI.render();
    HistoryUI.render();
    SettingsUI.render();
    updateSidebarCounts();

    // Start navigation
    Router.go('dashboardPage');

    // Auth inactivity
    Auth.resetInactivityTimer();
  };

  /**
   * Shows the login page.
   */
  const showLogin = () => {
    document.getElementById('appShell').hidden = true;
    const lp = document.getElementById('loginPage');
    lp.hidden = false;
    lp.classList.add('is-active');
    // Set year
    setText('loginYear', new Date().getFullYear());
    // Load settings to display library name
    const s = Storage.getSettings();
    setText('loginLibraryName', s.libraryName);
    setTimeout(() => document.getElementById('loginUsername')?.focus(), 100);
  };

  /**
   * Bootstraps the app.
   */
  const init = () => {
    console.log('[LMS] Initializing application...');

    // Seed sample data on first run
    seedSampleData();

    // Set year in footer
    setText('appFooterYear', new Date().getFullYear());

    // Init all handlers
    Handlers.initLogin();
    Handlers.initShell();
    Handlers.initBooks();
    Handlers.initMembers();
    Handlers.initIssue();
    Handlers.initReturn();
    Handlers.initHistory();
    Handlers.initReports();
    Handlers.initSettings();
    Handlers.initDashboardMisc();
    Handlers.initModals();
    Handlers.initShortcuts();
    Handlers.initDelegatedActions();
    Handlers.initInactivity();
    initEditModals();

    UI.attachRipple();

    // Start clock
    setInterval(Dashboard.tickClock, 1000);

    // Route: login vs app
    if (Auth.isLoggedIn()) {
      showApp();
    } else {
      showLogin();
    }

    console.log('[LMS] Application ready.');
  };

  return { init, showApp, showLogin };
})();

/* ============================================================
   BOOTSTRAP ON DOM READY
   ============================================================ */
document.addEventListener('DOMContentLoaded', App.init);
