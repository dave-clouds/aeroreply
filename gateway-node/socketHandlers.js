const axios = require('axios');
const Ticket = require('./models/Ticket');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

async function callAIService(message, conversationId, chatHistory) {
  const response = await axios.post(
    `${AI_SERVICE_URL}/chat`,
    { message, conversationId, chatHistory },
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

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected — ID: ${socket.id}`);

    // ---------------------------------------------------------------
    // Customer sends a new message
    // ---------------------------------------------------------------
    socket.on('customer:message', async (data) => {
      const { conversationId, message } = data;

      if (!conversationId || !message) {
        socket.emit('error:invalid', { error: 'conversationId and message are required.' });
        return;
      }

      console.log(`[Socket] customer:message | conv=${conversationId} | msg="${message}"`);

      try {
        // 1. Upsert the ticket and append the customer message
        let ticket = await Ticket.findOneAndUpdate(
          { conversationId },
          {
            $setOnInsert: { conversationId, customerSocketId: socket.id },
            $push: { messages: { role: 'customer', content: message } },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Keep the socket in a named room for this conversation
        socket.join(conversationId);

        // 2. If ticket is in handoff status, route to human agent room only
        if (ticket.status === 'handoff') {
          io.to(`agents:${conversationId}`).emit('agent:customer_message', {
            conversationId,
            message,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // 3. Call the Python AI microservice
        const history = buildHistoryPayload(ticket.messages.slice(0, -1));
        const aiResult = await callAIService(message, conversationId, history);

        const { reply, triggerHandoff } = aiResult;

        // 4. Persist the AI reply
        await Ticket.findOneAndUpdate(
          { conversationId },
          {
            $push: { messages: { role: 'ai', content: reply } },
            ...(triggerHandoff && { $set: { status: 'handoff' } }),
          }
        );

        // 5. Emit the AI reply back to the customer
        socket.emit('agent:reply', {
          conversationId,
          reply,
          sender: 'ai',
          timestamp: new Date().toISOString(),
        });

        // 6. If handoff triggered, notify agent dashboard room
        if (triggerHandoff) {
          console.log(`[Socket] Handoff triggered for conv=${conversationId}`);
          socket.emit('handoff:triggered', { conversationId });
          io.to('agents:dashboard').emit('handoff:new_ticket', {
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
    // Human support agent joins the dashboard / a conversation
    // ---------------------------------------------------------------
    socket.on('agent:join', async (data) => {
      const { conversationId } = data || {};

      if (conversationId) {
        socket.join(`agents:${conversationId}`);
        console.log(`[Socket] Agent joined conv room: agents:${conversationId}`);
      } else {
        socket.join('agents:dashboard');
        console.log(`[Socket] Agent joined dashboard`);
      }

      socket.emit('agent:joined', { conversationId: conversationId || null });
    });

    // ---------------------------------------------------------------
    // Human agent sends a message to a customer
    // ---------------------------------------------------------------
    socket.on('agent:message', async (data) => {
      const { conversationId, message } = data;

      if (!conversationId || !message) {
        socket.emit('error:invalid', { error: 'conversationId and message are required.' });
        return;
      }

      console.log(`[Socket] agent:message | conv=${conversationId} | msg="${message}"`);

      try {
        await Ticket.findOneAndUpdate(
          { conversationId },
          { $push: { messages: { role: 'agent', content: message } } }
        );

        // Deliver the human agent reply to the customer's room
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
      if (!conversationId) return;

      try {
        await Ticket.findOneAndUpdate({ conversationId }, { $set: { status: 'closed' } });
        io.to(conversationId).emit('ticket:closed', { conversationId });
        console.log(`[Socket] Ticket closed: conv=${conversationId}`);
      } catch (err) {
        console.error(`[Socket] Error closing ticket — ${err.message}`);
      }
    });

    // ---------------------------------------------------------------
    // Disconnect
    // ---------------------------------------------------------------
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected — ID: ${socket.id}`);
    });
  });
}

module.exports = { registerSocketHandlers };
