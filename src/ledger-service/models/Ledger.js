const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
    transactionId: { type: String, required: true },
    orderId: { type: String, required: true },
    userId: { type: String, required: true }, // The user involved
    type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Ledger', ledgerSchema);
