const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const { connectDB } = require('./config/db');
const { registerSocketHandlers } = require('./socketHandlers');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const Ticket = require('./models/Ticket');
const User = require('./src/models/User');
const authRoutes = require('./src/routes/authRoutes');
const { protect } = require('./src/middleware/authMiddleware');

// ---------------------------------------------------------------------------
// App bootstrap
// ---------------------------------------------------------------------------
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// ---------------------------------------------------------------------------
// MongoDB connection
// ---------------------------------------------------------------------------
let dbConnected = false;

connectDB()
  .then(() => {
    dbConnected = true;
  })
  .catch((err) => {
    console.warn(`[DB] Running in DB-less mode — ticket/auth persistence disabled (${err.message})`);
  });

mongoose.connection.on('disconnected', () => {
  dbConnected = false;
  console.warn('[DB] MongoDB disconnected');
});
mongoose.connection.on('reconnected', () => {
  dbConnected = true;
  console.log('[DB] MongoDB reconnected');
});

// ---------------------------------------------------------------------------
// HTTP server + Socket.io
// ---------------------------------------------------------------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000,
});

registerSocketHandlers(io);

// ---------------------------------------------------------------------------
// REST routes
// ---------------------------------------------------------------------------

app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AeroReply Gateway',
    db: dbConnected ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
  });
});

// All ticket routes require an authenticated agent and are strictly scoped
// to that agent's own tenant (req.user.projectId) — this is the multi-tenant
// isolation boundary for REST access, mirroring the Socket.io room scoping.

// List all tickets for the caller's project (open + handoff by default)
app.get('/api/tickets', protect, async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status
      ? { projectId: req.user.projectId, status }
      : { projectId: req.user.projectId, status: { $in: ['open', 'handoff'] } };
    const tickets = await Ticket.find(filter)
      .select('-messages')
      .sort({ updatedAt: -1 })
      .limit(100);
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

// Get a single ticket with full message history — scoped to the caller's project
app.get('/api/tickets/:conversationId', protect, async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({
      conversationId: req.params.conversationId,
      projectId: req.user.projectId,
    });
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.status = 404;
      return next(err);
    }
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

// Update ticket status (e.g. mark as closed) — scoped to the caller's project
app.patch('/api/tickets/:conversationId/status', protect, async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['open', 'handoff', 'closed'];
    if (!allowed.includes(status)) {
      const err = new Error(`Invalid status. Must be one of: ${allowed.join(', ')}`);
      err.status = 400;
      return next(err);
    }
    const ticket = await Ticket.findOneAndUpdate(
      { conversationId: req.params.conversationId, projectId: req.user.projectId },
      { $set: { status } },
      { new: true }
    );
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.status = 404;
      return next(err);
    }
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Widget settings routes — authenticated agents only
// ---------------------------------------------------------------------------

// GET current user's widget settings
app.get('/api/user/widget-settings', protect, async (req, res, next) => {
  try {
    res.json({ widgetSettings: req.user.widgetSettings });
  } catch (err) {
    next(err);
  }
});

// PATCH to save all widget settings in one request
app.patch('/api/user/widget-settings', protect, async (req, res, next) => {
  try {
    const ALLOWED = [
      'widgetTitle', 'widgetSubtitle', 'primaryColor',
      'textIconColor', 'widgetIcon', 'position', 'offset',
    ];
    const updates = {};
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) {
        updates[`widgetSettings.${key}`] = req.body[key];
      }
    }
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    res.json({ widgetSettings: updated.widgetSettings });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Error handling (must be registered last)
// ---------------------------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.GATEWAY_PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Gateway] Server running on port ${PORT}`);
  console.log(`[Gateway] AI service target: ${process.env.AI_SERVICE_URL || 'http://localhost:8000'}`);
});
