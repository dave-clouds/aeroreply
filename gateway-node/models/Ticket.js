const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['customer', 'ai', 'agent'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const TicketSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerSocketId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['open', 'handoff', 'closed'],
      default: 'open',
    },
    messages: [MessageSchema],
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', TicketSchema);
