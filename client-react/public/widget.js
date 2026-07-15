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
 * handshake.  The gateway uses that value to:
 *   - join the socket to the correct tenant room (`socket.join(projectId)`)
 *   - scope every ticket read/write to that project
 *   - broadcast events exclusively inside that room
 *
 * This means Agent A's visitors, tickets, and messages are never visible to
 * Agent B, even when both are connected to the same gateway server.
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

  // Derive the gateway origin from the URL the script was loaded from so the
  // widget always talks back to the same server that served it.
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

  /* ── 3. Inject widget styles ──────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    '#ar-launcher{position:fixed;bottom:24px;right:24px;z-index:2147483646;width:56px;height:56px;border-radius:50%;border:none;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;cursor:pointer;box-shadow:0 10px 26px rgba(59,130,246,0.45);display:flex;align-items:center;justify-content:center;font-size:22px;transition:transform 0.2s;}',
    '#ar-launcher:hover{transform:scale(1.08);}',
    '#ar-frame{position:fixed;bottom:90px;right:24px;z-index:2147483645;width:380px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 120px);border:1px solid #2d3648;border-radius:18px;overflow:hidden;background:linear-gradient(180deg,#131a2a 0%,#0e1420 100%);font-family:system-ui,sans-serif;font-size:14px;color:#f9fafb;box-shadow:0 20px 50px rgba(0,0,0,0.5);display:none;flex-direction:column;}',
    '#ar-frame.ar-open{display:flex;}',
    '#ar-header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:linear-gradient(135deg,#1e293b 0%,#172033 100%);border-bottom:1px solid #2d3648;flex-shrink:0;}',
    '#ar-header-title{font-weight:700;font-size:15px;letter-spacing:-0.2px;}',
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
    '#ar-send{background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:600;font-size:14px;font-family:inherit;}',
    '#ar-send:disabled{opacity:0.5;cursor:default;}',
    '#ar-hint{color:#6b7280;text-align:center;margin-top:40px;font-size:13px;}',
    '#ar-lead-form{flex:1;display:flex;flex-direction:column;justify-content:center;gap:14px;padding:24px 20px;}',
    '#ar-lead-msg{margin:0;line-height:1.6;color:#d1d5db;font-size:14px;}',
    '#ar-lead-input{background:#374151;border:1px solid #4b5563;border-radius:8px;padding:8px 12px;color:#f9fafb;font-size:14px;outline:none;font-family:inherit;}',
    '#ar-lead-submit{background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:10px 16px;cursor:pointer;font-weight:600;font-size:14px;font-family:inherit;}',
    '#ar-checking{flex:1;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:13px;}',
  ].join('');
  document.head.appendChild(style);

  /* ── 4. Build DOM ─────────────────────────────────────────────────────── */
  // Launcher button
  var launcher = document.createElement('button');
  launcher.id = 'ar-launcher';
  launcher.setAttribute('aria-label', 'Open AeroReply chat');
  launcher.innerHTML = '&#128172;'; // 💬
  document.body.appendChild(launcher);

  // Chat frame
  var frame = document.createElement('div');
  frame.id = 'ar-frame';
  frame.innerHTML =
    '<div id="ar-header">' +
      '<span id="ar-header-title">AeroReply Support</span>' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
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

  /* ── 5. Toggle open/close ─────────────────────────────────────────────── */
  var isOpen = false;
  function toggleFrame() {
    isOpen = !isOpen;
    frame.classList.toggle('ar-open', isOpen);
    launcher.innerHTML = isOpen ? '&#10005;' : '&#128172;';
    launcher.setAttribute('aria-label', isOpen ? 'Close chat' : 'Open AeroReply chat');
  }
  launcher.addEventListener('click', toggleFrame);
  document.getElementById('ar-close').addEventListener('click', toggleFrame);

  /* ── 6. Load Socket.io client from the gateway origin ────────────────── */
  var socketScript = document.createElement('script');
  socketScript.src = GATEWAY_ORIGIN + '/socket.io/socket.io.js';
  socketScript.onload = initSocket;
  socketScript.onerror = function () {
    console.error('[AeroReply] Failed to load socket.io from ' + GATEWAY_ORIGIN);
    setStatus('● Unavailable', '#ef4444');
    if (checkingEl) checkingEl.textContent = 'Could not connect to AeroReply.';
  };
  document.head.appendChild(socketScript);

  /* ── 7. Socket.io connection + event wiring ───────────────────────────── */
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
    // Pass the projectId in the Socket.io handshake query so the gateway's
    // resolveSocketIdentity() classifies this as a 'customer' socket and
    // joins it to the correct projectId room.
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
      // Remove checking/lead views; build the appropriate body
      var old = frame.querySelector('#ar-checking, #ar-lead-form, #ar-chat-body');
      if (old) old.parentNode.removeChild(old);

      if (agentOnline === false) {
        // No agent available — show lead-capture form
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

      // Agent is online (or status just became true) — show chat UI
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
