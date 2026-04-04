/**
 * EdTech Navigator – My Tools List
 * Manages a user's saved tools list via localStorage.
 * Requires edtech-tools.js to be loaded first for getMyTools().
 */

const MY_TOOLS_KEY = 'edtech_my_tools_v1';

function getMyToolIds() {
  try { return JSON.parse(localStorage.getItem(MY_TOOLS_KEY)) || []; }
  catch { return []; }
}

function _saveMyToolIds(ids) {
  localStorage.setItem(MY_TOOLS_KEY, JSON.stringify(ids));
}

function addToMyList(toolId) {
  const ids = getMyToolIds();
  if (!ids.includes(toolId)) {
    ids.push(toolId);
    _saveMyToolIds(ids);
  }
}

function removeFromMyList(toolId) {
  _saveMyToolIds(getMyToolIds().filter(id => id !== toolId));
}

function toggleMyList(toolId) {
  if (isInMyList(toolId)) {
    removeFromMyList(toolId);
    return false; // removed
  } else {
    addToMyList(toolId);
    return true;  // added
  }
}

function isInMyList(toolId) {
  return getMyToolIds().includes(toolId);
}

function getMyTools() {
  const ids = getMyToolIds();
  return (typeof EDTECH_TOOLS !== 'undefined')
    ? EDTECH_TOOLS.filter(t => ids.includes(t.id))
    : [];
}

function getMyToolsCount() {
  return getMyToolIds().length;
}

/**
 * Updates the nav badge count (if present) across all pages.
 * Looks for elements with class "my-list-count".
 */
function updateMyListBadge() {
  const count = getMyToolsCount();
  document.querySelectorAll('.my-list-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'inline-flex' : 'none';
  });
}

/**
 * Attach save/unsave click handling via event delegation on a container.
 * Buttons inside the container need class "btn-save-tool" and data-tool-id attribute.
 * onToggle(toolId, saved) is called after each toggle.
 */
function initSaveButtons(containerId, onToggle) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn-save-tool');
    if (!btn) return;
    const toolId = parseInt(btn.dataset.toolId, 10);
    if (isNaN(toolId)) return;
    const saved = toggleMyList(toolId);
    updateSaveButton(btn, saved);
    updateMyListBadge();
    if (typeof onToggle === 'function') onToggle(toolId, saved);
  });
}

/**
 * Update a single save button's visual state.
 */
function updateSaveButton(btn, saved) {
  if (saved) {
    btn.textContent = 'Saved ✓';
    btn.classList.add('btn-save-tool--saved');
  } else {
    btn.textContent = 'Save to My List';
    btn.classList.remove('btn-save-tool--saved');
  }
}

/**
 * After rendering cards into the DOM, call this to sync button states.
 */
function syncSaveButtons(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.btn-save-tool').forEach(btn => {
    const toolId = parseInt(btn.dataset.toolId, 10);
    if (!isNaN(toolId)) updateSaveButton(btn, isInMyList(toolId));
  });
}
