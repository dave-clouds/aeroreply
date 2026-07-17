/**
 * AeroReply Embed Widget
 *
 * Drop this snippet on any page to add a live-chat widget scoped to your
 * AeroReply project:
 *
 *   <script
 *     src="https://YOUR_AEROREPLY_DOMAIN/widget.js"
 *     data-aeroreply-project-id="YOUR_PROJECT_ID"
 *     async
 *   ></script>
 *
 * The widget reads `data-aeroreply-project-id` from its own <script> tag and
 * passes it as the `projectId` query-string parameter during the Socket.io
 * handshake.  When the customer socket connects the gateway looks up that
 * project's saved widgetSettings and emits them back as a `widget:config`
 * event, which this script applies immediately.
 */
(function () {
  'use strict';

  /* ── 1. Locate this script tag and extract config ─────────────────────── */
  var scriptTag =
    document.currentScript ||
    (function () {
      var all = document.querySelectorAll('script[data-aeroreply-project-id]');
      return all[all.length - 1] || null;
    })();

  if (!scriptTag) {
    console.warn('[AeroReply] Could not locate the widget <script> tag.');
    return;
  }

  var PROJECT_ID = (scriptTag.getAttribute('data-aeroreply-project-id') || '').trim();
  if (!PROJECT_ID) {
    console.warn('[AeroReply] data-aeroreply-project-id is missing or empty. Widget not loaded.');
    return;
  }

  var GATEWAY_ORIGIN = (function () {
    try {
      return new URL(scriptTag.src).origin;
    } catch (_) {
      return window.location.origin;
    }
  })();

  /* ── 2. Guard against double-initialisation ───────────────────────────── */
  if (window.__aeroreplyLoaded) return;
  window.__aeroreplyLoaded = true;

  /* ── 3. SVG icon library ──────────────────────────────────────────────── */
  var ICONS = {
    'speech-bubble':
      '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    'message':
      '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>',
    'headset':
      '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
  };

  function getIconSvg(name) {
    return ICONS[name] || ICONS['speech-bubble'];
  }

  /* ── 4. Inject base widget styles ─────────────────────────────────────── */
  var baseStyle = document.createElement('style');
  baseStyle.textContent = [
    '@keyframes ar-pulse{0%,100%{box-shadow:0 12px 30px rgba(0,0,0,0.45),0 0 0 0 rgba(59,130,246,0.45)}65%{box-shadow:0 12px 30px rgba(0,0,0,0.45),0 0 0 16px rgba(59,130,246,0)}}',
    '#ar-launcher{position:fixed;bottom:24px;right:24px;left:auto;z-index:2147483646;width:62px;height:62px;border-radius:50%;border:none;background:#0f172a;color:#ffffff;cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:0;overflow:hidden;animation:ar-pulse 2.8s ease-in-out infinite;transition:transform 0.2s ease,background 0.2s ease;}',
    '#ar-launcher:hover{transform:scale(1.10)!important;animation:none;}',
    '#ar-launcher:active{transform:scale(0.96)!important;animation:none;}',
    '#ar-frame{position:fixed;bottom:90px;right:24px;left:auto;z-index:2147483645;width:380px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 120px);border:1px solid #2d3648;border-radius:18px;overflow:hidden;background:linear-gradient(180deg,#131a2a 0%,#0e1420 100%);font-family:system-ui,sans-serif;font-size:14px;color:#f9fafb;box-shadow:0 20px 50px rgba(0,0,0,0.5);display:none;flex-direction:column;}',
    '#ar-frame.ar-open{display:flex;}',
    '#ar-header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:#0f172a;border-bottom:1px solid #2d3648;flex-shrink:0;}',
    '#ar-header-text{display:flex;flex-direction:column;gap:1px;}',
    '#ar-header-title{font-weight:700;font-size:15px;letter-spacing:-0.2px;}',
    '#ar-header-subtitle{font-size:11px;opacity:0.7;margin-top:2px;}',
    '#ar-header-controls{display:flex;align-items:center;gap:10px;flex-shrink:0;}',
    '#ar-status{font-size:12px;}',
    '#ar-close{background:transparent;border:none;color:#9ca3af;cursor:pointer;padding:4px;border-radius:6px;line-height:1;font-size:18px;}',
    '#ar-messages{flex:1;display:flex;flex-direction:column;gap:8px;padding:12px 16px;overflow-y:auto;}',
    '.ar-bubble{max-width:78%;padding:8px 12px;border-radius:10px;line-height:1.45;word-break:break-word;font-size:14px;}',
    '.ar-bubble-customer{align-self:flex-end;background:#3b82f6;color:#fff;}',
    '.ar-bubble-ai{align-self:flex-start;background:#374151;color:#f9fafb;}',
    '.ar-bubble-agent{align-self:flex-start;background:#10b981;color:#fff;}',
    '.ar-sender{font-size:11px;opacity:0.75;font-weight:600;margin-bottom:2px;display:block;}',
    '#ar-form{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #374151;background:#1f2937;flex-shrink:0;}',
    '#ar-input{flex:1;background:#374151;border:1px solid #4b5563;border-radius:8px;padding:8px 12px;color:#f9fafb;font-size:14px;outline:none;font-family:inherit;}',
    '#ar-send{background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:600;font-size:14px;font-family:inherit;transition:background 0.2s,color 0.2s;}',
    '#ar-send:disabled{opacity:0.5;cursor:default;}',
    '#ar-hint{color:#6b7280;text-align:center;margin-top:40px;font-size:13px;}',
    '#ar-lead-form{flex:1;display:flex;flex-direction:column;justify-content:center;gap:14px;padding:24px 20px;}',
    '#ar-lead-msg{margin:0;line-height:1.6;color:#d1d5db;font-size:14px;}',
    '#ar-lead-input{background:#374151;border:1px solid #4b5563;border-radius:8px;padding:8px 12px;color:#f9fafb;font-size:14px;outline:none;font-family:inherit;}',
    '#ar-lead-submit{background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:10px 16px;cursor:pointer;font-weight:600;font-size:14px;font-family:inherit;transition:background 0.2s,color 0.2s;}',
    '#ar-checking{flex:1;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:13px;}',
  ].join('');
  document.head.appendChild(baseStyle);

  // A second style block written by applyConfig() so dynamic overrides
  // always cascade on top of the base styles without mutating them.
  var configStyle = document.createElement('style');
  document.head.appendChild(configStyle);

  /* ── 5. Build DOM ─────────────────────────────────────────────────────── */
  // Default launcher icon: the custom SVG asset served from the gateway origin.
  // Falls back to the inline SVG if the asset path returns an error.
  function getDefaultLauncherHtml() {
    return '<img src="' + GATEWAY_ORIGIN + '/assets/chat-launcher.svg"'
      + ' width="38" height="38" alt="" draggable="false"'
      + ' style="pointer-events:none;display:block;border-radius:0;"'
      + ' onerror="this.outerHTML=\'' + getIconSvg('speech-bubble').replace(/'/g, "\\'") + '\'" />';
  }

  // Returns the right HTML for a given icon name.
  // 'speech-bubble' uses the asset file; others use inline SVG strings.
  function getLauncherHtml(name) {
    if (!name || name === 'speech-bubble') return getDefaultLauncherHtml();
    return getIconSvg(name);
  }

  // Launcher button
  var launcher = document.createElement('button');
  launcher.id = 'ar-launcher';
  launcher.setAttribute('aria-label', 'Open AeroReply chat');
  launcher.innerHTML = getDefaultLauncherHtml();
  document.body.appendChild(launcher);

  // Chat frame
  var frame = document.createElement('div');
  frame.id = 'ar-frame';
  frame.innerHTML =
    '<div id="ar-header">' +
      '<div id="ar-header-text">' +
        '<span id="ar-header-title">Live Support</span>' +
        '<span id="ar-header-subtitle">Typically replies in minutes</span>' +
      '</div>' +
      '<div id="ar-header-controls">' +
        '<span id="ar-status" style="color:#f59e0b;">○ Connecting…</span>' +
        '<button id="ar-close" aria-label="Close chat">&#10005;</button>' +
      '</div>' +
    '</div>' +
    '<div id="ar-checking">Checking availability…</div>';
  document.body.appendChild(frame);

  var statusEl = document.getElementById('ar-status');
  var checkingEl = document.getElementById('ar-checking');

  function setStatus(text, color) {
    statusEl.textContent = text;
    statusEl.style.color = color;
  }

  /* ── 6. Apply dynamic widget config ─────────────────────────────────────
   * Called once when the gateway emits `widget:config` immediately after
   * the customer socket connects.  Uses a second <style> block to cascade
   * colour and position overrides on top of the base CSS.
   * ─────────────────────────────────────────────────────────────────────── */
  var CLOSE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  function applyConfig(cfg) {
    if (!cfg) return;

    var primary   = cfg.primaryColor  || '#0f172a';
    var textColor = cfg.textIconColor || '#ffffff';
    var pos       = cfg.position === 'left' ? 'left' : 'right';
    var opp       = pos === 'left' ? 'right' : 'left';
    var offset    = Number(cfg.offset) || 20;
    var offsetPx  = offset + 'px';
    var frameBottomPx = (offset + 72) + 'px';

    // ── Cascade overrides ──
    configStyle.textContent = [
      // Launcher position + colours
      '#ar-launcher {',
      '  ' + pos + ': ' + offsetPx + ';',
      '  ' + opp + ': auto;',
      '  bottom: ' + offsetPx + ';',
      '  background: ' + primary + ' !important;',
      '  color: ' + textColor + ' !important;',
      '}',
      // Frame position
      '#ar-frame {',
      '  ' + pos + ': ' + offsetPx + ';',
      '  ' + opp + ': auto;',
      '  bottom: ' + frameBottomPx + ';',
      '}',
      // Header background
      '#ar-header { background: ' + primary + ' !important; }',
      // Header text / icon colours
      '#ar-header-title, #ar-header-subtitle { color: ' + textColor + ' !important; }',
      // Send button
      '#ar-send { background: ' + primary + ' !important; color: ' + textColor + ' !important; }',
      // Lead submit button
      '#ar-lead-submit { background: ' + primary + ' !important; color: ' + textColor + ' !important; }',
      // Customer chat bubbles
      '.ar-bubble-customer { background: ' + primary + ' !important; color: ' + textColor + ' !important; }',
    ].join('\n');

    // ── Text content ──
    var titleEl = document.getElementById('ar-header-title');
    if (titleEl) titleEl.textContent = cfg.widgetTitle || 'Live Support';

    var subtitleEl = document.getElementById('ar-header-subtitle');
    if (subtitleEl) subtitleEl.textContent = cfg.widgetSubtitle || 'Typically replies in minutes';

    // ── Launcher icon (when closed) ──
    var currentIcon = getLauncherHtml(cfg.widgetIcon);
    launcher.innerHTML = currentIcon;
    launcher.setAttribute('aria-label', 'Open AeroReply chat');

    // Store icon choice so toggleFrame can restore it when closing
    launcher._arClosedIcon = currentIcon;
    launcher._arPrimaryColor = primary;
    launcher._arTextColor = textColor;
  }

  /* ── 7. Toggle open/close ─────────────────────────────────────────────── */
  var isOpen = false;
  function toggleFrame() {
    isOpen = !isOpen;
    frame.classList.toggle('ar-open', isOpen);
    if (isOpen) {
      launcher.innerHTML = CLOSE_SVG;
      launcher.setAttribute('aria-label', 'Close chat');
      launcher.style.animation = 'none'; // pause pulse while open
    } else {
      launcher.innerHTML = launcher._arClosedIcon || getDefaultLauncherHtml();
      launcher.setAttribute('aria-label', 'Open AeroReply chat');
      launcher.style.animation = ''; // restore pulse
    }
  }
  launcher.addEventListener('click', toggleFrame);
  document.getElementById('ar-close').addEventListener('click', toggleFrame);

  /* ── 8. Load Socket.io client from the gateway origin ────────────────── */
  var socketScript = document.createElement('script');
  socketScript.src = GATEWAY_ORIGIN + '/socket.io/socket.io.js';
  socketScript.onload = initSocket;
  socketScript.onerror = function () {
    console.error('[AeroReply] Failed to load socket.io from ' + GATEWAY_ORIGIN);
    setStatus('● Unavailable', '#ef4444');
    if (checkingEl) checkingEl.textContent = 'Could not connect to AeroReply.';
  };
  document.head.appendChild(socketScript);

  /* ── 9. Socket.io connection + event wiring ───────────────────────────── */
  var CONV_KEY = 'ar_conv_' + PROJECT_ID;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function getOrCreateConvId() {
    var id = sessionStorage.getItem(CONV_KEY);
    if (!id) {
      id = 'conv-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now();
      sessionStorage.setItem(CONV_KEY, id);
    }
    return id;
  }

  function initSocket() {
    var socket = io(GATEWAY_ORIGIN, {
      query: { projectId: PROJECT_ID },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    var conversationId = getOrCreateConvId();
    var agentOnline = null; // null = pending, true/false = known
    var convStatus = 'open'; // 'open' | 'handoff' | 'closed'

    socket.on('connect', function () {
      setStatus('● Connected', '#22c55e');
      socket.emit('agent:status:request');
    });

    socket.on('disconnect', function () {
      setStatus('○ Reconnecting…', '#f59e0b');
    });

    // Gateway sends saved widgetSettings right after customer connects —
    // apply them immediately so the widget reflects the owner's branding.
    socket.on('widget:config', function (cfg) {
      applyConfig(cfg);
    });

    socket.on('agent:status', function (data) {
      agentOnline = Boolean(data.online);
      renderBody();
    });

    socket.on('agent:reply', function (data) {
      var role = data.sender === 'agent' ? 'agent' : 'ai';
      appendBubble(role, data.reply);
    });

    socket.on('handoff:triggered', function () {
      convStatus = 'handoff';
      setStatus('⟳ Connecting to agent…', '#3b82f6');
    });

    socket.on('ticket:closed', function () {
      convStatus = 'closed';
      setStatus('✓ Closed', '#6b7280');
      var inp = document.getElementById('ar-input');
      if (inp) { inp.disabled = true; inp.placeholder = 'Conversation closed.'; }
      var btn = document.getElementById('ar-send');
      if (btn) btn.disabled = true;
    });

    socket.on('lead:captured', function () {
      var lf = document.getElementById('ar-lead-form');
      if (lf) lf.innerHTML = '<p style="color:#4ade80;font-weight:600;">Thanks! We\'ll be in touch soon.</p>';
    });

    socket.on('error:server', function (d) { appendError(d.error); });
    socket.on('error:invalid', function (d) { appendError(d.error); });

    /* ── Render body based on agent availability ── */
    function renderBody() {
      var old = frame.querySelector('#ar-checking, #ar-lead-form, #ar-chat-body');
      if (old) old.parentNode.removeChild(old);

      if (agentOnline === false) {
        var lf = document.createElement('div');
        lf.id = 'ar-lead-form';
        lf.innerHTML =
          '<p id="ar-lead-msg">We\'re away right now. Leave your email and we\'ll follow up as soon as possible.</p>' +
          '<input id="ar-lead-input" type="email" placeholder="you@example.com" />' +
          '<button id="ar-lead-submit" type="button">Submit Email</button>';
        frame.appendChild(lf);
        document.getElementById('ar-lead-submit').addEventListener('click', submitLead);
        return;
      }

      var body = document.createElement('div');
      body.id = 'ar-chat-body';
      body.style.cssText = 'display:flex;flex-direction:column;flex:1;overflow:hidden;';
      body.innerHTML =
        '<div id="ar-messages"><p id="ar-hint">Send a message to start the conversation.</p></div>' +
        '<form id="ar-form">' +
          '<input id="ar-input" type="text" placeholder="Type a message…" autocomplete="off" />' +
          '<button id="ar-send" type="submit">Send</button>' +
        '</form>';
      frame.appendChild(body);
      document.getElementById('ar-form').addEventListener('submit', sendMessage);
    }

    function sendMessage(e) {
      e.preventDefault();
      var inp = document.getElementById('ar-input');
      var text = (inp.value || '').trim();
      if (!text || convStatus === 'closed') return;
      inp.value = '';
      appendBubble('customer', text);
      socket.emit('customer:message', { conversationId: conversationId, message: text });
    }

    function submitLead() {
      var inp = document.getElementById('ar-lead-input');
      var email = (inp ? inp.value : '').trim();
      if (!EMAIL_RE.test(email)) {
        appendError('Please enter a valid email address.');
        return;
      }
      socket.emit('lead:capture_email', { conversationId: conversationId, email: email });
    }

    function appendBubble(role, text) {
      var hint = document.getElementById('ar-hint');
      if (hint) hint.parentNode.removeChild(hint);
      var msgs = document.getElementById('ar-messages');
      if (!msgs) return;
      var div = document.createElement('div');
      div.className = 'ar-bubble ar-bubble-' + role;
      var senderLabel = role === 'customer' ? 'You' : role === 'agent' ? 'Agent' : 'AI';
      div.innerHTML = '<span class="ar-sender">' + senderLabel + '</span>' + escHtml(text);
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function appendError(msg) {
      var msgs = document.getElementById('ar-messages');
      if (!msgs) return;
      var div = document.createElement('div');
      div.style.cssText = 'background:#7f1d1d;color:#fca5a5;padding:8px 12px;border-radius:8px;font-size:13px;';
      div.textContent = msg;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function escHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  }
})();
