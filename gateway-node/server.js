const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const { connectDB } = require('./config/db');
const { registerSocketHandlers } = require('./socketHandlers');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const Ticket = require('./models/Ticket');
const authRoutes = require('./src/routes/authRoutes');

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

// List all tickets (open + handoff by default)
app.get('/api/tickets', async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : { status: { $in: ['open', 'handoff'] } };
    const tickets = await Ticket.find(filter)
      .select('-messages')
      .sort({ updatedAt: -1 })
      .limit(100);
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

// Get a single ticket with full message history
app.get('/api/tickets/:conversationId', async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ conversationId: req.params.conversationId });
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

// Update ticket status (e.g. mark as closed)
app.patch('/api/tickets/:conversationId/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['open', 'handoff', 'closed'];
    if (!allowed.includes(status)) {
      const err = new Error(`Invalid status. Must be one of: ${allowed.join(', ')}`);
      err.status = 400;
      return next(err);
    }
    const ticket = await Ticket.findOneAndUpdate(
      { conversationId: req.params.conversationId },
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
