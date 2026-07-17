const axios = require('axios');
const jwt = require('jsonwebtoken');
const Ticket = require('./models/Ticket');
const User = require('./src/models/User');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

async function callAIService(message, conversationId, chatHistory, mode) {
  const response = await axios.post(
    `${AI_SERVICE_URL}/chat`,
    { message, conversationId, chatHistory, mode },
    { timeout: 10000 }
  );
  return response.data;
}

function buildHistoryPayload(messages) {
  return messages.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Multi-tenant identity resolution
// ---------------------------------------------------------------------------
// Every socket is classified exactly once, at connection time, based on how
// it authenticated — never on data the client sends afterwards:
//
//   - 'agent'   — a logged-in dashboard user. Identity comes from a verified
//                 JWT (`socket.handshake.auth.token`); projectId is read from
//                 the *database* user record, not from the client.
//   - 'customer' — a visitor on a tenant's site via the embeddable widget.js.
//                 Identity is the projectId passed in the handshake query
//                 (`data-aeroreply-project-id` on the widget's <script> tag).
//   - 'landing' — the AI-only sales/demo widget on AeroReply's own landing
//                 page. Belongs to no tenant, is never persisted as a
//                 ticket, and can never trigger a human handoff.
//
// This resolution is the single source of truth for room membership —
// everything downstream (`.to(projectId).emit(...)`) relies on it to keep
// tenants fully isolated from one another.
async function resolveSocketIdentity(socket) {
  const auth = socket.handshake.auth || {};
  const query = socket.handshake.query || {};

  const token = auth.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        return { role: 'agent', projectId: user.projectId };
      }
    } catch {
      // Invalid/expired token — fall through and treat as unauthenticated.
    }
  }

  const queryProjectId = query.projectId;
  if (queryProjectId && String(queryProjectId).trim()) {
    return { role: 'customer', projectId: String(queryProjectId).trim() };
  }

  return { role: 'landing', projectId: null };
}

function registerSocketHandlers(io) {
  // Presence tracking is scoped per tenant (projectId), never global — this
  // is what guarantees Agent A never sees Agent B's visitors or online status.
  const agentsByProject = new Map(); // projectId -> Set<socketId>
  const visitorsByProject = new Map(); // projectId -> Set<socketId>

  function addPresence(map, projectId, socketId) {
    if (!map.has(projectId)) map.set(projectId, new Set());
    map.get(projectId).add(socketId);
  }

  function removePresence(map, projectId, socketId) {
    const set = map.get(projectId);
    if (!set) return false;
    const removed = set.delete(socketId);
    if (set.size === 0) map.delete(projectId);
    return removed;
  }

  function broadcastAgentStatus(projectId) {
    const online = (agentsByProject.get(projectId)?.size ?? 0) > 0;
    io.to(projectId).emit('agent:status', { online });
  }

  function broadcastVisitorCount(projectId) {
    const count = visitorsByProject.get(projectId)?.size ?? 0;
    io.to(projectId).emit('visitors:count', { count });
  }

  io.on('connection', async (socket) => {
    const { role, projectId } = await resolveSocketIdentity(socket);
    socket.data.role = role;
    socket.data.projectId = projectId;

    console.log(
      `[Socket] Connected — id=${socket.id} role=${role} project=${projectId || 'none (landing/sales demo)'}`
    );

    if (projectId) {
      // Every socket belonging to a tenant joins a room named after that
      // tenant's projectId — this is the isolation boundary for every
      // real-time event emitted below.
      socket.join(projectId);

      if (role === 'agent') {
        addPresence(agentsByProject, projectId, socket.id);
        broadcastAgentStatus(projectId);
      } else {
        addPresence(visitorsByProject, projectId, socket.id);
        broadcastVisitorCount(projectId);

        // Send the project owner's widget customisation settings so the
        // embedded widget.js can apply them immediately after connecting.
        try {
          const projectOwner = await User.findOne({ projectId }).select('widgetSettings');
          if (projectOwner) {
            socket.emit('widget:config', projectOwner.widgetSettings ?? {});
          }
        } catch (err) {
          console.warn(`[Socket] Could not fetch widgetSettings for project=${projectId}: ${err.message}`);
        }
      }

      socket.emit('agent:status', {
        online: (agentsByProject.get(projectId)?.size ?? 0) > 0,
      });
    }

    // Widgets that mount after the initial connection (e.g. a floating
    // launcher opened later) can miss the one-shot emit above — let them
    // explicitly ask for the current status instead of relying on timing.
    socket.on('agent:status:request', () => {
      if (!projectId) {
        // Landing-page sales demo: always AI, never checks human presence.
        socket.emit('agent:status', { online: false });
        return;
      }
      socket.emit('agent:status', {
        online: (agentsByProject.get(projectId)?.size ?? 0) > 0,
      });
    });

    // ---------------------------------------------------------------
    // Customer sends a new message
    // ---------------------------------------------------------------
    socket.on('customer:message', async (data) => {
      const { conversationId, message } = data || {};

      if (!conversationId || !message) {
        socket.emit('error:invalid', { error: 'conversationId and message are required.' });
        return;
      }

      // The landing-page demo has no tenant and is always sales-mode: it
      // never creates a ticket and can never escalate to a human agent.
      const isLandingDemo = !projectId;
      const aiMode = isLandingDemo ? 'sales' : 'support';

      console.log(
        `[Socket] customer:message | project=${projectId || 'landing'} | conv=${conversationId} | msg="${message}"`
      );

      try {
        let ticket = null;
        let historySource = [];

        if (!isLandingDemo) {
          // 1. Upsert the ticket (scoped to this tenant) and append the message
          ticket = await Ticket.findOneAndUpdate(
            { conversationId, projectId },
            {
              $setOnInsert: { conversationId, projectId, customerSocketId: socket.id },
              $push: { messages: { role: 'customer', content: message } },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );

          // Keep the socket in a named room for this specific conversation
          socket.join(conversationId);

          // 2. If the ticket is already in handoff, route straight to the
          // tenant's agent room only — never globally.
          if (ticket.status === 'handoff') {
            io.to(projectId).emit('agent:customer_message', {
              conversationId,
              message,
              timestamp: new Date().toISOString(),
            });
            return;
          }

          historySource = ticket.messages.slice(0, -1);
        }

        // 3. Call the Python AI microservice
        const history = buildHistoryPayload(historySource);
        const aiResult = await callAIService(message, conversationId, history, aiMode);

        const reply = aiResult.reply;
        // Sales-demo conversations can never escalate, regardless of what
        // the model returns — this is enforced here too, not just in the
        // AI service, so a misbehaving prompt can't create a phantom ticket.
        const triggerHandoff = isLandingDemo ? false : Boolean(aiResult.triggerHandoff);

        // 4. Persist the AI reply
        if (!isLandingDemo) {
          await Ticket.findOneAndUpdate(
            { conversationId, projectId },
            {
              $push: { messages: { role: 'ai', content: reply } },
              ...(triggerHandoff && { $set: { status: 'handoff' } }),
            }
          );
        }

        // 5. Emit the AI reply back to the customer
        socket.emit('agent:reply', {
          conversationId,
          reply,
          sender: 'ai',
          timestamp: new Date().toISOString(),
        });

        // 6. If handoff triggered, notify only this tenant's agent room
        if (triggerHandoff) {
          console.log(`[Socket] Handoff triggered | project=${projectId} | conv=${conversationId}`);
          socket.emit('handoff:triggered', { conversationId });
          io.to(projectId).emit('handoff:new_ticket', {
            conversationId,
            lastMessage: message,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error(`[Socket] Error processing customer:message — ${err.message}`);
        socket.emit('error:server', {
          error: 'Failed to process your message. Please try again.',
        });
      }
    });

    // ---------------------------------------------------------------
    // Human agent dashboard acknowledgement. Room membership/presence is
    // already established above from the verified JWT at connection time —
    // this handler is just a client-triggered ack, it never determines
    // identity or room membership itself.
    // ---------------------------------------------------------------
    socket.on('agent:join', (data) => {
      const { conversationId } = data || {};
      if (role !== 'agent' || !projectId) {
        socket.emit('error:invalid', { error: 'Not authorized as an agent.' });
        return;
      }
      if (conversationId) {
        socket.join(conversationId);
      }
      socket.emit('agent:joined', { conversationId: conversationId || null, projectId });
    });

    // ---------------------------------------------------------------
    // Lead capture: visitor leaves an email while no agent is online
    // ---------------------------------------------------------------
    socket.on('lead:capture_email', async (data) => {
      const { conversationId, email } = data || {};

      if (!conversationId || !email || !EMAIL_RE.test(String(email).trim())) {
        socket.emit('error:invalid', { error: 'A valid conversationId and email are required.' });
        return;
      }
      if (!projectId) {
        // The landing/sales demo never falls back to lead capture.
        socket.emit('error:invalid', { error: 'Lead capture is not available on this widget.' });
        return;
      }

      try {
        const ticket = await Ticket.findOneAndUpdate(
          { conversationId, projectId },
          {
            $setOnInsert: { conversationId, projectId, customerSocketId: socket.id },
            $set: { 'metadata.email': String(email).trim() },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log(`[Socket] Lead captured | project=${projectId} | conv=${conversationId} | email set`);
        socket.emit('lead:captured', { conversationId, email: ticket.metadata.get('email') });
      } catch (err) {
        console.error(`[Socket] Error capturing lead email — ${err.message}`);
        socket.emit('error:server', { error: 'Failed to save your email. Please try again.' });
      }
    });

    // ---------------------------------------------------------------
    // Human agent sends a message to a customer
    // ---------------------------------------------------------------
    socket.on('agent:message', async (data) => {
      const { conversationId, message } = data || {};

      if (!conversationId || !message) {
        socket.emit('error:invalid', { error: 'conversationId and message are required.' });
        return;
      }
      if (role !== 'agent' || !projectId) {
        socket.emit('error:invalid', { error: 'Not authorized as an agent.' });
        return;
      }

      console.log(`[Socket] agent:message | project=${projectId} | conv=${conversationId} | msg="${message}"`);

      try {
        // Scoping the update by projectId means an agent can never mutate
        // another tenant's ticket, even if they somehow guess its
        // conversationId.
        const updated = await Ticket.findOneAndUpdate(
          { conversationId, projectId },
          { $push: { messages: { role: 'agent', content: message } } }
        );

        if (!updated) {
          socket.emit('error:invalid', { error: 'Ticket not found for this project.' });
          return;
        }

        // Deliver the human agent reply to the customer's private
        // conversation room.
        io.to(conversationId).emit('agent:reply', {
          conversationId,
          reply: message,
          sender: 'agent',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`[Socket] Error processing agent:message — ${err.message}`);
        socket.emit('error:server', { error: 'Failed to send message.' });
      }
    });

    // ---------------------------------------------------------------
    // Close / resolve a ticket
    // ---------------------------------------------------------------
    socket.on('ticket:close', async (data) => {
      const { conversationId } = data || {};
      if (!conversationId || role !== 'agent' || !projectId) return;

      try {
        const updated = await Ticket.findOneAndUpdate(
          { conversationId, projectId },
          { $set: { status: 'closed' } }
        );
        if (!updated) return;
        io.to(conversationId).emit('ticket:closed', { conversationId });
        console.log(`[Socket] Ticket closed | project=${projectId} | conv=${conversationId}`);
      } catch (err) {
        console.error(`[Socket] Error closing ticket — ${err.message}`);
      }
    });

    // ---------------------------------------------------------------
    // Disconnect
    // ---------------------------------------------------------------
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected — ID: ${socket.id}`);

      if (!projectId) return;

      if (role === 'agent') {
        if (removePresence(agentsByProject, projectId, socket.id)) {
          broadcastAgentStatus(projectId);
        }
      } else {
        if (removePresence(visitorsByProject, projectId, socket.id)) {
          broadcastVisitorCount(projectId);
        }
      }
    });
  });
}

module.exports = { registerSocketHandlers };
