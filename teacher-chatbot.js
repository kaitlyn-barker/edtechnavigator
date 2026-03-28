/**
 * Teacher Tool Advisor Chatbot
 *
 * A floating AI chat widget powered by the Claude API that helps teachers
 * find the right EdTech tool based on their lesson, content focus, and
 * state standards.
 *
 * Requires: edtech-tools.js (EDTECH_TOOLS must be loaded first)
 */

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────

  const STORAGE_KEY_API_KEY   = 'edtech_chatbot_api_key';
  const STORAGE_KEY_HISTORY   = 'edtech_chatbot_history';
  const MODEL                 = 'claude-opus-4-6';
  const API_URL               = 'https://api.anthropic.com/v1/messages';
  const MAX_HISTORY_MESSAGES  = 20; // keep last N messages to avoid token overflow

  // ── Build a compact tools reference for the system prompt ─────────────────

  function buildToolsReference() {
    if (typeof EDTECH_TOOLS === 'undefined') return '(tools data unavailable)';

    return EDTECH_TOOLS.map(t =>
      `[${t.id}] ${t.name} | ${t.category} | Grades: ${t.gradeLevels} | ` +
      `Subjects: ${t.subjects.join(', ')} | Price: ${t.pricingModel} | ` +
      `${t.description}`
    ).join('\n');
  }

  // ── System prompt ──────────────────────────────────────────────────────────

  function buildSystemPrompt() {
    const toolsRef = buildToolsReference();

    return `You are an expert EdTech advisor embedded in the EdTech Navigator platform, \
helping K-12 teachers choose the best digital tools for their specific classroom needs.

Your goal is to have a friendly, focused conversation to understand:
1. The teacher's grade level(s)
2. Their subject or content focus area
3. The specific lesson goal or instructional challenge (e.g., differentiation, assessment, engagement, literacy)
4. Any relevant state standards they need to address (e.g., Common Core ELA, CCSS Math, NGSS, TEKS, Virginia SOLs, etc.)
5. Any constraints: budget (free-only vs. paid), device availability (web, iOS, Android, Chromebook), or special needs

Once you have enough context (you don't need all five — two or three key details are enough to start), \
recommend 1–3 tools from the catalog below. For each recommendation:
- Name the tool and its category
- Explain in 1–2 sentences why it fits their specific situation
- Mention how it connects to any standards they raised
- Note the pricing model
- If helpful, suggest how they might use it in that particular lesson

Be conversational and helpful. Ask natural follow-up questions if critical info is missing. \
Keep responses concise and teacher-friendly — avoid jargon. \
If the teacher describes a scenario outside the catalog's scope, acknowledge that honestly \
and suggest the closest available match.

---
AVAILABLE TOOLS CATALOG (${EDTECH_TOOLS ? EDTECH_TOOLS.length : 0} tools):
${toolsRef}
---

When recommending, reference tools by name. You may suggest a tool even if it is \
rated "Medium" teacher relevance if it genuinely fits the lesson context. \
Always tailor your recommendation to the grade level and subject provided.`;
  }

  // ── State ──────────────────────────────────────────────────────────────────

  let conversationHistory = []; // { role: 'user'|'assistant', content: string }[]
  let isStreaming          = false;

  // ── localStorage helpers ───────────────────────────────────────────────────

  function getApiKey()  { return localStorage.getItem(STORAGE_KEY_API_KEY) || ''; }
  function saveApiKey(k){ localStorage.setItem(STORAGE_KEY_API_KEY, k.trim()); }
  function clearApiKey(){ localStorage.removeItem(STORAGE_KEY_API_KEY); }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function saveHistory(history) {
    // Keep only the last MAX_HISTORY_MESSAGES to stay within token limits
    const trimmed = history.slice(-MAX_HISTORY_MESSAGES);
    try { localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(trimmed)); } catch {}
  }

  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    conversationHistory = [];
  }

  // ── Claude API ─────────────────────────────────────────────────────────────

  /**
   * Stream a response from the Claude API.
   * Calls onDelta(text) for each chunk, onDone() when finished, onError(msg) on failure.
   */
  async function streamClaude({ apiKey, messages, onDelta, onDone, onError }) {
    const systemPrompt = buildSystemPrompt();

    let response;
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          stream: true,
          system: systemPrompt,
          messages: messages,
        }),
      });
    } catch (err) {
      onError('Network error — please check your connection and try again.');
      return;
    }

    if (!response.ok) {
      let errMsg = `API error ${response.status}`;
      try {
        const body = await response.json();
        if (body?.error?.message) errMsg = body.error.message;
      } catch {}

      if (response.status === 401) {
        onError('Invalid API key. Please check your key and try again.');
        clearApiKey();
      } else if (response.status === 429) {
        onError('Rate limit reached. Please wait a moment and try again.');
      } else {
        onError(errMsg);
      }
      return;
    }

    // Parse the SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);
            if (
              event.type === 'content_block_delta' &&
              event.delta?.type === 'text_delta' &&
              event.delta?.text
            ) {
              onDelta(event.delta.text);
            }
          } catch {}
        }
      }
    } catch (err) {
      onError('Stream interrupted. Please try again.');
      return;
    }

    onDone();
  }

  // ── DOM helpers ────────────────────────────────────────────────────────────

  function esc(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Very lightweight Markdown → HTML renderer for bold, bullets, and line breaks.
   * Handles: **bold**, *italic*, bullet lists (- or *), numbered lists, and newlines.
   */
  function renderMarkdown(text) {
    // Escape HTML first, then selectively re-introduce formatting
    let html = esc(text);

    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic: *text* (single asterisk, not at line start to avoid bullet collision)
    html = html.replace(/(?<![*\n])\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>');

    // Convert bullet list lines into <li>
    // Group consecutive bullet lines into <ul>
    html = html.replace(/((?:^|\n)[•\-] .+)+/g, (block) => {
      const items = block
        .trim()
        .split('\n')
        .filter(l => /^[•\-] /.test(l.trim()))
        .map(l => `<li>${l.trim().replace(/^[•\-] /, '')}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    });

    // Numbered lists
    html = html.replace(/((?:^|\n)\d+\. .+)+/g, (block) => {
      const items = block
        .trim()
        .split('\n')
        .filter(l => /^\d+\. /.test(l.trim()))
        .map(l => `<li>${l.trim().replace(/^\d+\. /, '')}</li>`)
        .join('');
      return `<ol>${items}</ol>`;
    });

    // Newlines → <br> (but not inside list blocks)
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  // ── Chat UI rendering ──────────────────────────────────────────────────────

  function appendMessage(role, content, streaming = false) {
    const messagesEl = document.getElementById('chatbot-messages');
    if (!messagesEl) return null;

    const wrapper = document.createElement('div');
    wrapper.className = `chat-message chat-message--${role}`;
    if (streaming) wrapper.id = 'chatbot-streaming-msg';

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';

    if (role === 'assistant') {
      bubble.innerHTML = renderMarkdown(content);
      if (streaming) {
        const cursor = document.createElement('span');
        cursor.className = 'chat-cursor';
        cursor.textContent = '▋';
        bubble.appendChild(cursor);
      }
    } else {
      bubble.textContent = content;
    }

    wrapper.appendChild(bubble);
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrapper;
  }

  function updateStreamingMessage(fullText) {
    const el = document.getElementById('chatbot-streaming-msg');
    if (!el) return;
    const bubble = el.querySelector('.chat-bubble');
    if (!bubble) return;

    bubble.innerHTML = renderMarkdown(fullText);
    const cursor = document.createElement('span');
    cursor.className = 'chat-cursor';
    cursor.textContent = '▋';
    bubble.appendChild(cursor);

    const messagesEl = document.getElementById('chatbot-messages');
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function finalizeStreamingMessage(fullText) {
    const el = document.getElementById('chatbot-streaming-msg');
    if (!el) return;
    el.removeAttribute('id');
    const bubble = el.querySelector('.chat-bubble');
    if (!bubble) return;
    bubble.innerHTML = renderMarkdown(fullText);

    const messagesEl = document.getElementById('chatbot-messages');
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTypingIndicator() {
    const messagesEl = document.getElementById('chatbot-messages');
    if (!messagesEl) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'chat-message chat-message--assistant';
    wrapper.id = 'chatbot-typing';
    wrapper.innerHTML = `
      <div class="chat-bubble chat-typing">
        <span></span><span></span><span></span>
      </div>`;
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTypingIndicator() {
    const el = document.getElementById('chatbot-typing');
    if (el) el.remove();
  }

  function setInputDisabled(disabled) {
    const input = document.getElementById('chatbot-input');
    const btn   = document.getElementById('chatbot-send');
    if (input) input.disabled = disabled;
    if (btn)   btn.disabled   = disabled;
  }

  // ── API key setup screen ───────────────────────────────────────────────────

  function showApiKeyScreen() {
    const messagesEl = document.getElementById('chatbot-messages');
    if (!messagesEl) return;

    messagesEl.innerHTML = `
      <div class="chatbot-setup">
        <div class="chatbot-setup__icon">🔑</div>
        <h3 class="chatbot-setup__title">Connect Your Claude API Key</h3>
        <p class="chatbot-setup__desc">
          This chatbot uses the Claude AI API to give you personalized EdTech tool recommendations.
          Your key is stored only in your browser and never sent anywhere except Anthropic's API.
        </p>
        <div class="chatbot-setup__field">
          <input
            id="chatbot-apikey-input"
            type="password"
            placeholder="sk-ant-api03-..."
            autocomplete="off"
            spellcheck="false"
          />
          <button id="chatbot-apikey-save">Connect</button>
        </div>
        <a class="chatbot-setup__link" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">
          Get a free API key from Anthropic →
        </a>
      </div>`;

    const saveBtn   = document.getElementById('chatbot-apikey-save');
    const keyInput  = document.getElementById('chatbot-apikey-input');

    saveBtn.addEventListener('click', () => {
      const key = keyInput.value.trim();
      if (!key) {
        keyInput.style.borderColor = '#DC2626';
        return;
      }
      saveApiKey(key);
      initChatView();
    });

    keyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveBtn.click();
    });

    // Hide normal input area
    setInputDisabled(true);
    const inputRow = document.querySelector('.chatbot-input-row');
    if (inputRow) inputRow.style.display = 'none';
  }

  // ── Main chat view init ────────────────────────────────────────────────────

  function initChatView() {
    const messagesEl = document.getElementById('chatbot-messages');
    if (!messagesEl) return;

    // Show input area
    const inputRow = document.querySelector('.chatbot-input-row');
    if (inputRow) inputRow.style.display = '';
    setInputDisabled(false);

    // Load or start history
    conversationHistory = loadHistory();

    messagesEl.innerHTML = '';

    if (conversationHistory.length === 0) {
      // Welcome message
      const welcome =
        "Hi! I'm your EdTech Tool Advisor. Tell me about your lesson and I'll recommend the best tools from our catalog.\n\n" +
        "For example: *\"I'm a 3rd grade math teacher looking for something to help with multiplication fact fluency. We use Chromebooks and need something free.\"*\n\n" +
        "What are you working on?";
      appendMessage('assistant', welcome);
    } else {
      // Replay history
      conversationHistory.forEach(msg => appendMessage(msg.role, msg.content));
    }

    focusInput();
  }

  function focusInput() {
    setTimeout(() => {
      const input = document.getElementById('chatbot-input');
      if (input) input.focus();
    }, 100);
  }

  // ── Send a message ─────────────────────────────────────────────────────────

  async function sendMessage() {
    if (isStreaming) return;

    const input   = document.getElementById('chatbot-input');
    const userMsg = (input.value || '').trim();
    if (!userMsg) return;

    const apiKey = getApiKey();
    if (!apiKey) {
      showApiKeyScreen();
      return;
    }

    input.value = '';
    input.style.height = 'auto';

    // Add to UI and history
    appendMessage('user', userMsg);
    conversationHistory.push({ role: 'user', content: userMsg });
    saveHistory(conversationHistory);

    setInputDisabled(true);
    isStreaming = true;
    showTypingIndicator();

    let fullResponse = '';
    let firstDelta   = true;

    await streamClaude({
      apiKey,
      messages: conversationHistory.slice(-MAX_HISTORY_MESSAGES),
      onDelta(text) {
        fullResponse += text;
        if (firstDelta) {
          removeTypingIndicator();
          appendMessage('assistant', fullResponse, true);
          firstDelta = false;
        } else {
          updateStreamingMessage(fullResponse);
        }
      },
      onDone() {
        finalizeStreamingMessage(fullResponse);
        conversationHistory.push({ role: 'assistant', content: fullResponse });
        saveHistory(conversationHistory);
        setInputDisabled(false);
        isStreaming = false;
        focusInput();
      },
      onError(msg) {
        removeTypingIndicator();
        appendMessage('assistant', `Sorry, something went wrong: ${msg}`);
        setInputDisabled(false);
        isStreaming = false;
        focusInput();
      },
    });
  }

  // ── Build the widget DOM ───────────────────────────────────────────────────

  function buildWidget() {
    // Floating button
    const fab = document.createElement('button');
    fab.id          = 'chatbot-fab';
    fab.className   = 'chatbot-fab';
    fab.title       = 'Ask the EdTech Advisor';
    fab.setAttribute('aria-label', 'Open EdTech Tool Advisor');
    fab.innerHTML   = `
      <svg id="chatbot-fab-open" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
        <path d="M7 9h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/>
      </svg>
      <svg id="chatbot-fab-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style="display:none">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>`;

    // Chat window
    const window_ = document.createElement('div');
    window_.id        = 'chatbot-window';
    window_.className = 'chatbot-window chatbot-window--hidden';
    window_.setAttribute('role', 'dialog');
    window_.setAttribute('aria-label', 'EdTech Tool Advisor');
    window_.innerHTML = `
      <div class="chatbot-header">
        <div class="chatbot-header__info">
          <div class="chatbot-header__avatar">✨</div>
          <div>
            <div class="chatbot-header__title">EdTech Tool Advisor</div>
            <div class="chatbot-header__subtitle">Powered by Claude AI</div>
          </div>
        </div>
        <div class="chatbot-header__actions">
          <button id="chatbot-menu-btn" class="chatbot-icon-btn" title="Options" aria-label="Options">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
          <div id="chatbot-menu" class="chatbot-menu chatbot-menu--hidden">
            <button id="chatbot-menu-new"     class="chatbot-menu-item">New conversation</button>
            <button id="chatbot-menu-apikey"  class="chatbot-menu-item">Change API key</button>
          </div>
          <button id="chatbot-close-btn" class="chatbot-icon-btn" title="Close" aria-label="Close chat">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>

      <div id="chatbot-messages" class="chatbot-messages" role="log" aria-live="polite"></div>

      <div class="chatbot-input-row">
        <textarea
          id="chatbot-input"
          class="chatbot-textarea"
          placeholder="Describe your lesson or ask about a tool..."
          rows="1"
          maxlength="2000"
          aria-label="Message input"
        ></textarea>
        <button id="chatbot-send" class="chatbot-send-btn" aria-label="Send message">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>`;

    document.body.appendChild(fab);
    document.body.appendChild(window_);
  }

  // ── Widget CSS ─────────────────────────────────────────────────────────────

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* ── FAB button ── */
      .chatbot-fab {
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 9999;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4F39F6 0%, #9810FA 100%);
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 25px rgba(79,57,246,0.45);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .chatbot-fab:hover {
        transform: scale(1.08);
        box-shadow: 0 12px 32px rgba(79,57,246,0.55);
      }
      .chatbot-fab:active { transform: scale(0.96); }

      /* ── Chat window ── */
      .chatbot-window {
        position: fixed;
        bottom: 100px;
        right: 28px;
        z-index: 9998;
        width: 380px;
        max-width: calc(100vw - 32px);
        height: 540px;
        max-height: calc(100vh - 130px);
        background: #ffffff;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: opacity 0.2s, transform 0.2s;
        transform-origin: bottom right;
      }
      .chatbot-window--hidden {
        opacity: 0;
        pointer-events: none;
        transform: scale(0.92) translateY(12px);
      }

      /* ── Header ── */
      .chatbot-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px 12px;
        background: linear-gradient(135deg, #4F39F6 0%, #9810FA 100%);
        color: white;
        flex-shrink: 0;
      }
      .chatbot-header__info {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .chatbot-header__avatar {
        width: 36px; height: 36px;
        background: rgba(255,255,255,0.2);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
        flex-shrink: 0;
      }
      .chatbot-header__title {
        font-size: 14px;
        font-weight: 700;
        line-height: 1.2;
      }
      .chatbot-header__subtitle {
        font-size: 11px;
        opacity: 0.8;
        line-height: 1.2;
      }
      .chatbot-header__actions {
        display: flex;
        align-items: center;
        gap: 4px;
        position: relative;
      }
      .chatbot-icon-btn {
        background: none;
        border: none;
        color: rgba(255,255,255,0.8);
        cursor: pointer;
        padding: 6px;
        border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.15s;
      }
      .chatbot-icon-btn:hover { background: rgba(255,255,255,0.15); color: white; }

      /* ── Dropdown menu ── */
      .chatbot-menu {
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        background: white;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        min-width: 180px;
        overflow: hidden;
        z-index: 10000;
        transition: opacity 0.15s, transform 0.15s;
        transform-origin: top right;
      }
      .chatbot-menu--hidden {
        opacity: 0;
        pointer-events: none;
        transform: scale(0.94);
      }
      .chatbot-menu-item {
        display: block;
        width: 100%;
        padding: 10px 16px;
        font-size: 13px;
        font-weight: 500;
        color: #374151;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        transition: background 0.1s;
      }
      .chatbot-menu-item:hover { background: #F3F4F6; }

      /* ── Messages ── */
      .chatbot-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        scroll-behavior: smooth;
      }
      .chatbot-messages::-webkit-scrollbar { width: 4px; }
      .chatbot-messages::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }

      .chat-message {
        display: flex;
        max-width: 88%;
      }
      .chat-message--user {
        align-self: flex-end;
        flex-direction: row-reverse;
      }
      .chat-message--assistant {
        align-self: flex-start;
      }

      .chat-bubble {
        padding: 10px 13px;
        border-radius: 16px;
        font-size: 13.5px;
        line-height: 1.55;
        word-break: break-word;
      }
      .chat-message--user .chat-bubble {
        background: linear-gradient(135deg, #4F39F6 0%, #9810FA 100%);
        color: white;
        border-bottom-right-radius: 4px;
      }
      .chat-message--assistant .chat-bubble {
        background: #F3F4F6;
        color: #111827;
        border-bottom-left-radius: 4px;
      }
      .chat-message--assistant .chat-bubble strong { color: #1e1b4b; }
      .chat-message--assistant .chat-bubble ul,
      .chat-message--assistant .chat-bubble ol {
        padding-left: 18px;
        margin: 6px 0;
      }
      .chat-message--assistant .chat-bubble li { margin: 3px 0; }

      /* Blinking cursor */
      .chat-cursor {
        display: inline-block;
        animation: chatblink 1s step-end infinite;
        color: #6B7280;
        font-size: 14px;
      }
      @keyframes chatblink { 0%,100%{opacity:1} 50%{opacity:0} }

      /* Typing indicator */
      .chat-typing {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 12px 16px;
      }
      .chat-typing span {
        width: 7px; height: 7px;
        background: #9CA3AF;
        border-radius: 50%;
        animation: chatbounce 1.2s infinite ease-in-out;
      }
      .chat-typing span:nth-child(2) { animation-delay: 0.2s; }
      .chat-typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes chatbounce {
        0%,80%,100%{ transform: translateY(0); }
        40%{ transform: translateY(-6px); }
      }

      /* ── Input row ── */
      .chatbot-input-row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        padding: 10px 12px 14px;
        border-top: 1px solid #F3F4F6;
        background: white;
        flex-shrink: 0;
      }
      .chatbot-textarea {
        flex: 1;
        resize: none;
        border: 1.5px solid #E5E7EB;
        border-radius: 12px;
        padding: 9px 12px;
        font-family: inherit;
        font-size: 13.5px;
        line-height: 1.5;
        color: #111827;
        background: #F9FAFB;
        outline: none;
        transition: border-color 0.15s;
        max-height: 120px;
        overflow-y: auto;
      }
      .chatbot-textarea:focus { border-color: #7C3AED; background: white; }
      .chatbot-textarea:disabled { opacity: 0.5; cursor: not-allowed; }
      .chatbot-textarea::placeholder { color: #9CA3AF; }
      .chatbot-send-btn {
        width: 38px; height: 38px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4F39F6 0%, #9810FA 100%);
        border: none;
        color: white;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: transform 0.15s, opacity 0.15s;
      }
      .chatbot-send-btn:hover { transform: scale(1.08); }
      .chatbot-send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

      /* ── API key setup screen ── */
      .chatbot-setup {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 28px 24px;
        gap: 14px;
      }
      .chatbot-setup__icon { font-size: 36px; }
      .chatbot-setup__title {
        font-size: 16px;
        font-weight: 700;
        color: #111827;
      }
      .chatbot-setup__desc {
        font-size: 13px;
        color: #6B7280;
        line-height: 1.55;
      }
      .chatbot-setup__field {
        display: flex;
        gap: 8px;
        width: 100%;
      }
      .chatbot-setup__field input {
        flex: 1;
        border: 1.5px solid #E5E7EB;
        border-radius: 10px;
        padding: 9px 12px;
        font-size: 13px;
        font-family: monospace;
        outline: none;
        transition: border-color 0.15s;
      }
      .chatbot-setup__field input:focus { border-color: #7C3AED; }
      .chatbot-setup__field button {
        padding: 9px 16px;
        background: linear-gradient(135deg, #4F39F6 0%, #9810FA 100%);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: opacity 0.15s;
      }
      .chatbot-setup__field button:hover { opacity: 0.9; }
      .chatbot-setup__link {
        font-size: 12px;
        color: #7C3AED;
        text-decoration: none;
      }
      .chatbot-setup__link:hover { text-decoration: underline; }

      /* ── Mobile adjustments ── */
      @media (max-width: 440px) {
        .chatbot-window {
          bottom: 0; right: 0;
          width: 100vw;
          max-width: 100vw;
          height: 100dvh;
          max-height: 100dvh;
          border-radius: 0;
        }
        .chatbot-fab {
          bottom: 20px;
          right: 20px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Wire up widget events ──────────────────────────────────────────────────

  function wireEvents() {
    const fab       = document.getElementById('chatbot-fab');
    const chatWin   = document.getElementById('chatbot-window');
    const closeBtn  = document.getElementById('chatbot-close-btn');
    const sendBtn   = document.getElementById('chatbot-send');
    const textarea  = document.getElementById('chatbot-input');
    const menuBtn   = document.getElementById('chatbot-menu-btn');
    const menu      = document.getElementById('chatbot-menu');
    const menuNew   = document.getElementById('chatbot-menu-new');
    const menuKey   = document.getElementById('chatbot-menu-apikey');
    const fabOpenIco  = document.getElementById('chatbot-fab-open');
    const fabCloseIco = document.getElementById('chatbot-fab-close');

    let isOpen = false;
    let menuOpen = false;

    function openChat() {
      chatWin.classList.remove('chatbot-window--hidden');
      fabOpenIco.style.display  = 'none';
      fabCloseIco.style.display = '';
      isOpen = true;

      if (!getApiKey()) {
        showApiKeyScreen();
      } else {
        initChatView();
      }
    }

    function closeChat() {
      chatWin.classList.add('chatbot-window--hidden');
      fabOpenIco.style.display  = '';
      fabCloseIco.style.display = 'none';
      isOpen = false;
      closeMenu();
    }

    function toggleMenu() {
      menuOpen = !menuOpen;
      menu.classList.toggle('chatbot-menu--hidden', !menuOpen);
    }

    function closeMenu() {
      menuOpen = false;
      menu.classList.add('chatbot-menu--hidden');
    }

    fab.addEventListener('click', () => isOpen ? closeChat() : openChat());
    closeBtn.addEventListener('click', closeChat);

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (menuOpen && !menu.contains(e.target) && e.target !== menuBtn) {
        closeMenu();
      }
    });

    menuNew.addEventListener('click', () => {
      closeMenu();
      clearHistory();
      initChatView();
    });

    menuKey.addEventListener('click', () => {
      closeMenu();
      clearApiKey();
      showApiKeyScreen();
    });

    sendBtn.addEventListener('click', sendMessage);

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize textarea
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) closeChat();
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    injectStyles();
    buildWidget();
    wireEvents();
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
