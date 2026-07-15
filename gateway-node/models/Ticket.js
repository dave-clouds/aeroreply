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
    // Multi-tenant isolation: every ticket belongs to exactly one business
    // (identified by the owning agent's User.projectId). All ticket queries
    // must be scoped by this field so agents never see another tenant's
    // conversations. Landing-page/sales-demo conversations have no tenant
    // and are never persisted as tickets, so this is always present here.
    projectId: {
      type: String,
      required: true,
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
