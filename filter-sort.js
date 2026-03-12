/* ── EdTech Navigator: Shared Filter & Sort System ─────────────────── */
(function () {
  'use strict';

  // ── INJECT STYLES ────────────────────────────────────────────────────
  const CSS = `
/* ── Filter Bar Container ── */
.fb-wrap {
  background: white;
  border: 1.5px solid #E5E7EB;
  border-radius: 14px;
  margin-bottom: 24px;
  position: relative;
  z-index: 10;
}
.fb-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 16px;
  flex-wrap: wrap;
}
.fb-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.fb-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ── Sort Select ── */
.fb-sort-wrap {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 12px;
  border: 1.5px solid #E5E7EB;
  border-radius: 9999px;
  background: white;
  cursor: pointer;
  transition: border-color 0.15s;
}
.fb-sort-wrap:focus-within {
  border-color: #4F39F6;
}
.fb-sort-icon { flex-shrink: 0; color: #6A7282; }
.fb-sort-select {
  border: none;
  background: transparent;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  outline: none;
  padding: 0;
  -webkit-appearance: none;
  appearance: none;
}

/* ── Divider ── */
.fb-divider {
  width: 1px;
  height: 20px;
  background: #E5E7EB;
  flex-shrink: 0;
  align-self: center;
}

/* ── Filter Dropdown Buttons ── */
.fb-dropdown {
  position: relative;
}
.fb-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 12px;
  border: 1.5px solid #E5E7EB;
  border-radius: 9999px;
  background: white;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.fb-filter-btn:hover {
  border-color: #4F39F6;
  color: #4F39F6;
}
.fb-filter-btn[aria-expanded="true"] {
  border-color: #4F39F6;
  background: #F5F3FF;
  color: #4F39F6;
}
.fb-filter-btn.fb-has-active {
  border-color: #4F39F6;
  background: #EEF2FF;
  color: #4F39F6;
}

/* ── Badge (count indicator) ── */
.fb-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9999px;
  background: linear-gradient(90deg, #4F39F6 0%, #9810FA 100%);
  color: white;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

/* ── Chevron ── */
.fb-chevron {
  flex-shrink: 0;
  transition: transform 0.15s;
}
.fb-filter-btn[aria-expanded="true"] .fb-chevron {
  transform: rotate(180deg);
}

/* ── Dropdown Panel ── */
.fb-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 200;
  min-width: 210px;
  background: white;
  border: 1.5px solid #E5E7EB;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08);
  overflow: hidden;
}
.fb-panel[hidden] { display: none !important; }

/* Keep panel inside viewport if near right edge */
.fb-dropdown:last-of-type .fb-panel,
.fb-panel.fb-align-right {
  left: auto;
  right: 0;
}

.fb-panel-inner {
  padding: 6px 0;
  max-height: 260px;
  overflow-y: auto;
}
.fb-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  color: #374151;
  transition: background 0.1s;
  user-select: none;
}
.fb-option:hover { background: #F9FAFB; }
.fb-option input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #4F39F6;
  cursor: pointer;
  flex-shrink: 0;
}

/* ── Summary + Clear All ── */
.fb-summary {
  font-size: 12px;
  font-weight: 500;
  color: #6A7282;
  white-space: nowrap;
}
.fb-clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 12px;
  border: 1.5px solid #E5E7EB;
  border-radius: 9999px;
  background: white;
  font-size: 12px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  color: #6A7282;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.fb-clear-btn:hover {
  border-color: #DC2626;
  color: #DC2626;
}

/* ── Active Filter Chips ── */
.fb-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 16px 10px;
  border-top: 1px solid #F3F4F6;
}
.fb-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  background: #EEF2FF;
  border: 1px solid #C7D7FD;
  border-radius: 9999px;
  font-size: 12px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  color: #4F39F6;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.fb-chip:hover {
  background: #E0E7FF;
  border-color: #818CF8;
}
.fb-chip svg { flex-shrink: 0; }

@media (max-width: 680px) {
  .fb-row { padding: 10px 12px; gap: 6px; }
  .fb-chips-row { padding: 0 12px 10px; }
  .fb-left { gap: 5px; }
  .fb-divider { display: none; }
}
@media (max-width: 440px) {
  .fb-filter-btn { padding: 0 9px; font-size: 12px; }
  .fb-sort-wrap { padding: 0 9px; }
  .fb-sort-select { font-size: 12px; }
}
`;

  const styleEl = document.createElement('style');
  styleEl.id = 'edtech-filter-sort-css';
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // ── GRADE HELPERS ────────────────────────────────────────────────────
  const GRADE_BUCKETS = {
    'PreK':  [-1, -1],
    'K–2':   [0,  2],
    '3–5':   [3,  5],
    '6–8':   [6,  8],
    '9–12':  [9, 12],
  };

  function _g2n(g) {
    const s = String(g).toLowerCase().trim();
    if (s === 'prek' || s === 'pre-k') return -1;
    if (s === 'k') return 0;
    const n = parseInt(s, 10);
    return isNaN(n) ? 0 : n;
  }

  function parseToolGradeRange(gl) {
    const s = (gl || '').replace(/\s*\(.*?\)/g, '').trim();
    const sl = s.toLowerCase();
    if (sl === 'k-12' || sl === 'k–12' || sl === 'all grades') return [0, 12];
    if (sl === 'prek-12' || sl === 'prek–12' || sl === 'pre-k–12') return [-1, 12];
    if (sl === 'prek' || sl === 'pre-k') return [-1, -1];
    if (sl === 'k') return [0, 0];
    const m = s.match(/^(PreK|Pre-K|K|\d+)\s*[-–]\s*(\d+|K)$/i);
    if (m) return [_g2n(m[1]), _g2n(m[2])];
    const single = sl.match(/^(\d+)$/);
    if (single) { const n = parseInt(single[1], 10); return [n, n]; }
    return [-1, 12]; // unknown → show in all grade filters
  }

  function _rangesOverlap([min1, max1], [min2, max2]) {
    return min1 <= max2 && min2 <= max1;
  }

  // ── SUBJECT HELPERS ──────────────────────────────────────────────────
  const SUBJECT_KEYS = {
    'ELA / Reading':  ['ELA', 'Reading', 'Literacy', 'Phonics', 'Fluency', 'Language Arts', 'Writing'],
    'Math':           ['Math', 'Mathematics', 'Algebra', 'Geometry', 'STEM'],
    'Science':        ['Science', 'STEM', 'Biology', 'Chemistry', 'Physics', 'Earth Science'],
    'Social Studies': ['Social Studies', 'History', 'Geography', 'Civics'],
    'Computer Science': ['Computer Science', 'Coding', 'Programming'],
    'SEL':            ['SEL', 'Social Emotional', 'Social-Emotional'],
    'World Languages':['World Languages', 'Spanish', 'Language'],
    'Arts & Creativity': ['Creativity', 'Art', 'Music', 'Media', 'Arts'],
  };

  function _subjectMatches(toolSubjects, filterSubject) {
    if (!toolSubjects || !toolSubjects.length) return false;
    if (toolSubjects.includes('All')) return true;
    const keys = SUBJECT_KEYS[filterSubject] || [filterSubject];
    return toolSubjects.some(ts =>
      keys.some(k => ts.toLowerCase().includes(k.toLowerCase()))
    );
  }

  // ── PLATFORM HELPERS ─────────────────────────────────────────────────
  const PLATFORM_KEYS = {
    'Web Browser':    ['Web'],
    'iOS / iPad':     ['iOS', 'iPad', 'iPhone'],
    'Android':        ['Android'],
    'Chromebook':     ['Chromebook', 'Chrome OS'],
    'Windows / Mac':  ['Windows', 'Mac', 'Desktop'],
  };

  function _platformMatches(toolPlatforms, filterPlatform) {
    const keys = PLATFORM_KEYS[filterPlatform] || [filterPlatform];
    return keys.some(k =>
      (toolPlatforms || '').toLowerCase().includes(k.toLowerCase())
    );
  }

  // ── PRICING HELPERS ──────────────────────────────────────────────────
  function _pricingMatches(pricingModel, bucket) {
    const p = (pricingModel || '').toLowerCase();
    switch (bucket) {
      case 'Free':
        return p.includes('free') &&
               !p.includes('freemium') && !p.includes('free tier') &&
               !p.includes('free trial') && !p.includes('free plan') &&
               !p.includes('subscription') && !p.includes('premium');
      case 'Freemium':
        return p.includes('freemium') ||
               (p.includes('free') && (p.includes('premium') || p.includes('upgrade') || p.includes('paid plan') || p.includes('pro plan'))) ||
               p.includes('free tier') || p.includes('free plan') || p.includes('free trial');
      case 'Subscription':
        return (p.includes('subscription') || p.includes('per user') ||
                p.includes('monthly') || p.includes('annual fee') ||
                p.includes('per month') || p.includes('per year')) &&
               !p.includes('school') && !p.includes('district') &&
               !p.includes('institution') && !p.includes('enterprise');
      case 'School / District':
        return p.includes('school') || p.includes('district') ||
               p.includes('institution') || p.includes('enterprise') ||
               p.includes('license') || p.includes('quote') ||
               p.includes('contact') || p.includes('site license');
      default:
        return false;
    }
  }

  // ── SORT ─────────────────────────────────────────────────────────────
  function _sortTools(tools, sortBy) {
    const arr = tools.slice();
    switch (sortBy) {
      case 'name-asc':  return arr.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc': return arr.sort((a, b) => b.name.localeCompare(a.name));
      case 'rating':    return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      default:          return arr; // 'relevance' → keep order from getToolsForAudience
    }
  }

  // ── MAIN PUBLIC FILTER FUNCTION ──────────────────────────────────────
  /**
   * Apply text search + attribute filters + sort.
   * @param {Array}  tools   Base tool list (already audience-filtered)
   * @param {string} query   Search text
   * @param {Object} state   FilterBar state object
   * @returns {Array}
   */
  window.applyFiltersAndSort = function (tools, query, state) {
    // Text search (uses filterTools() from edtech-tools.js)
    let results = (typeof filterTools === 'function')
      ? filterTools(tools, query)
      : tools.slice();

    const s = state || {};

    // Category
    if (s.categories && s.categories.size > 0) {
      results = results.filter(t => s.categories.has(t.category));
    }

    // Grade
    if (s.grades && s.grades.size > 0) {
      const gradeRanges = [...s.grades].map(g => GRADE_BUCKETS[g]).filter(Boolean);
      if (gradeRanges.length > 0) {
        results = results.filter(t => {
          const toolRange = parseToolGradeRange(t.gradeLevels);
          return gradeRanges.some(gr => _rangesOverlap(toolRange, gr));
        });
      }
    }

    // Subject
    if (s.subjects && s.subjects.size > 0) {
      results = results.filter(t =>
        [...s.subjects].some(sub => _subjectMatches(t.subjects, sub))
      );
    }

    // Platform
    if (s.platforms && s.platforms.size > 0) {
      results = results.filter(t =>
        [...s.platforms].some(p => _platformMatches(t.platforms, p))
      );
    }

    // Pricing
    if (s.pricing && s.pricing.size > 0) {
      results = results.filter(t =>
        [...s.pricing].some(p => _pricingMatches(t.pricingModel, p))
      );
    }

    // Sort
    return _sortTools(results, s.sortBy || 'relevance');
  };

  // ── FilterBar CLASS ──────────────────────────────────────────────────
  /**
   * Renders and manages an interactive filter + sort bar.
   *
   * Usage:
   *   const bar = new FilterBar({
   *     container: 'filter-bar-container-id',   // id string or DOM element
   *     categories: ['Reading & Literacy', ...], // optional explicit list
   *     onChange: (state) => rerenderTools(state)
   *   });
   */
  window.FilterBar = class FilterBar {
    constructor({ container, categories, onChange }) {
      this.el = (typeof container === 'string')
        ? document.getElementById(container)
        : container;
      this._availCategories = categories || [];
      this.onChange = onChange || function () {};
      this.state = {
        sortBy:     'relevance',
        categories: new Set(),
        grades:     new Set(),
        subjects:   new Set(),
        platforms:  new Set(),
        pricing:    new Set(),
      };
      this._openDd = null;
      this._render();
    }

    // ── Helpers ──────────────────────────────────────────────────────
    get _totalActive() {
      return (this.state.sortBy !== 'relevance' ? 1 : 0) +
        this.state.categories.size + this.state.grades.size +
        this.state.subjects.size   + this.state.platforms.size +
        this.state.pricing.size;
    }

    _esc(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    // ── Render ───────────────────────────────────────────────────────
    _render() {
      const grades    = Object.keys(GRADE_BUCKETS);
      const subjects  = Object.keys(SUBJECT_KEYS);
      const platforms = Object.keys(PLATFORM_KEYS);
      const pricing   = ['Free', 'Freemium', 'Subscription', 'School / District'];

      const sortIconSvg = `<svg class="fb-sort-icon" width="15" height="15" fill="none" viewBox="0 0 15 15" aria-hidden="true">
        <path d="M2 3.5h11M4 7.5h7M6 11.5h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;

      const catDdHtml = this._availCategories.length > 0
        ? this._ddHtml('categories', 'Category', this._availCategories)
        : '';

      this.el.innerHTML = `
        <div class="fb-wrap" id="fb-outer">
          <div class="fb-row">
            <div class="fb-left">
              <div class="fb-sort-wrap">
                ${sortIconSvg}
                <select class="fb-sort-select" id="fb-sort-select" aria-label="Sort tools by">
                  <option value="relevance">Sort: Relevance</option>
                  <option value="name-asc">Name: A–Z</option>
                  <option value="name-desc">Name: Z–A</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
              <div class="fb-divider" aria-hidden="true"></div>
              ${catDdHtml}
              ${this._ddHtml('grades',    'Grade',    grades)}
              ${this._ddHtml('subjects',  'Subject',  subjects)}
              ${this._ddHtml('platforms', 'Platform', platforms)}
              ${this._ddHtml('pricing',   'Pricing',  pricing)}
            </div>
            <div class="fb-right" id="fb-right">
              <span class="fb-summary" id="fb-summary" style="display:none;"></span>
              <button class="fb-clear-btn" id="fb-clear-btn" type="button" style="display:none;" aria-label="Clear all filters">
                Clear all
              </button>
            </div>
          </div>
          <div class="fb-chips-row" id="fb-chips-row" style="display:none;" role="list" aria-label="Active filters"></div>
        </div>
      `;

      this._bindEvents();
    }

    _ddHtml(key, label, options) {
      const items = options.map(opt => {
        const checked = this.state[key] && this.state[key].has(opt);
        return `<label class="fb-option">
          <input type="checkbox" value="${this._esc(opt)}" ${checked ? 'checked' : ''}>
          <span>${this._esc(opt)}</span>
        </label>`;
      }).join('');

      const chevronSvg = `<svg class="fb-chevron" width="13" height="13" fill="none" viewBox="0 0 13 13" aria-hidden="true">
        <path d="M3 4.5l3.5 4 3.5-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

      return `
        <div class="fb-dropdown" data-key="${key}" id="fb-dd-${key}">
          <button class="fb-filter-btn" type="button"
                  aria-expanded="false" aria-haspopup="listbox"
                  id="fb-btn-${key}">
            <span class="fb-btn-label">${label}</span>
            <span class="fb-badge" id="fb-badge-${key}" style="display:none;" aria-label="${label} filters active"></span>
            ${chevronSvg}
          </button>
          <div class="fb-panel" id="fb-panel-${key}" hidden role="listbox" aria-label="${label} options">
            <div class="fb-panel-inner">${items}</div>
          </div>
        </div>`;
    }

    // ── Events ───────────────────────────────────────────────────────
    _bindEvents() {
      const el = this.el;

      // Sort
      const sortSel = el.querySelector('#fb-sort-select');
      if (sortSel) {
        sortSel.value = this.state.sortBy;
        sortSel.addEventListener('change', () => {
          this.state.sortBy = sortSel.value;
          this._updateUI();
          this.onChange(this.state);
        });
      }

      // Dropdown toggle + checkboxes
      el.querySelectorAll('.fb-dropdown').forEach(dd => {
        const key   = dd.dataset.key;
        const btn   = dd.querySelector('.fb-filter-btn');
        const panel = dd.querySelector('.fb-panel');

        btn.addEventListener('click', e => {
          e.stopPropagation();
          const isOpen = !panel.hidden;
          this._closeAllDropdowns();
          if (!isOpen) {
            panel.hidden = false;
            btn.setAttribute('aria-expanded', 'true');
            this._openDd = dd;
            // Right-align panel if near viewport edge
            const rect = btn.getBoundingClientRect();
            if (rect.right + 210 > window.innerWidth) {
              panel.classList.add('fb-align-right');
            }
          }
        });

        panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.addEventListener('change', () => {
            if (cb.checked) this.state[key].add(cb.value);
            else            this.state[key].delete(cb.value);
            this._updateUI();
            this.onChange(this.state);
          });
        });
      });

      // Close on outside click
      document.addEventListener('click', e => {
        if (this._openDd && !this._openDd.contains(e.target)) {
          this._closeAllDropdowns();
        }
      });

      // Close on Escape
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && this._openDd) {
          this._closeAllDropdowns();
        }
      });

      // Clear all
      const clearBtn = el.querySelector('#fb-clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.reset();
          this.onChange(this.state);
        });
      }
    }

    _closeAllDropdowns() {
      this.el.querySelectorAll('.fb-panel').forEach(p => { p.hidden = true; });
      this.el.querySelectorAll('.fb-filter-btn').forEach(b =>
        b.setAttribute('aria-expanded', 'false')
      );
      this._openDd = null;
    }

    // ── Update UI state ──────────────────────────────────────────────
    _updateUI() {
      // Per-button badges + active class
      ['categories', 'grades', 'subjects', 'platforms', 'pricing'].forEach(key => {
        const badge = this.el.querySelector('#fb-badge-' + key);
        const btn   = this.el.querySelector('#fb-btn-' + key);
        if (!badge || !btn) return;
        const count = this.state[key].size;
        if (count > 0) {
          badge.textContent = count;
          badge.style.display = 'inline-flex';
          btn.classList.add('fb-has-active');
        } else {
          badge.style.display = 'none';
          btn.classList.remove('fb-has-active');
        }
      });

      // Sync sort select
      const sortSel = this.el.querySelector('#fb-sort-select');
      if (sortSel) sortSel.value = this.state.sortBy;

      // Summary + clear button
      const total   = this._totalActive;
      const summary = this.el.querySelector('#fb-summary');
      const clearBtn= this.el.querySelector('#fb-clear-btn');
      if (summary) {
        if (total > 0) {
          summary.textContent = total === 1 ? '1 filter active' : total + ' filters active';
          summary.style.display = 'inline';
        } else {
          summary.style.display = 'none';
        }
      }
      if (clearBtn) {
        clearBtn.style.display = total > 0 ? 'inline-flex' : 'none';
      }

      // Chips
      this._updateChips();
    }

    _updateChips() {
      const chipsRow = this.el.querySelector('#fb-chips-row');
      if (!chipsRow) return;

      const chips = [];

      if (this.state.sortBy !== 'relevance') {
        const labels = {
          'name-asc':  'Name: A–Z',
          'name-desc': 'Name: Z–A',
          'rating':    'Highest Rated',
        };
        chips.push({ key: 'sortBy', val: '', label: 'Sort: ' + (labels[this.state.sortBy] || this.state.sortBy) });
      }

      for (const key of ['categories', 'grades', 'subjects', 'platforms', 'pricing']) {
        for (const val of this.state[key]) {
          chips.push({ key, val, label: val });
        }
      }

      if (chips.length === 0) {
        chipsRow.style.display = 'none';
        chipsRow.innerHTML = '';
        return;
      }

      const xSvg = `<svg width="10" height="10" fill="none" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;

      chipsRow.style.display = 'flex';
      chipsRow.innerHTML = chips.map(c => `
        <button class="fb-chip" type="button"
                data-key="${this._esc(c.key)}" data-val="${this._esc(c.val)}"
                role="listitem" aria-label="Remove filter: ${this._esc(c.label)}">
          ${this._esc(c.label)} ${xSvg}
        </button>
      `).join('');

      chipsRow.querySelectorAll('.fb-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const key = chip.dataset.key;
          const val = chip.dataset.val;
          if (key === 'sortBy') {
            this.state.sortBy = 'relevance';
          } else if (val) {
            this.state[key].delete(val);
          }
          this._updateUI();
          this._syncCheckboxes();
          this.onChange(this.state);
        });
      });
    }

    _syncCheckboxes() {
      ['categories', 'grades', 'subjects', 'platforms', 'pricing'].forEach(key => {
        const panel = this.el.querySelector('#fb-panel-' + key);
        if (!panel) return;
        panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.checked = this.state[key].has(cb.value);
        });
      });
    }

    // ── Public API ───────────────────────────────────────────────────
    reset() {
      this.state.sortBy = 'relevance';
      ['categories', 'grades', 'subjects', 'platforms', 'pricing'].forEach(k =>
        this.state[k].clear()
      );
      this._updateUI();
      this._syncCheckboxes();
      const sortSel = this.el.querySelector('#fb-sort-select');
      if (sortSel) sortSel.value = 'relevance';
    }
  };

})();
