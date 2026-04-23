const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    clientId: { type: String, required: true },
    providerId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['INITIATED', 'SUCCESS', 'FAILED'], 
        default: 'INITIATED' 
    },
    errorReason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
