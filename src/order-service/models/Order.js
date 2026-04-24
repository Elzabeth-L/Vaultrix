const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId:        { type: String, required: true },
    serviceId:     { type: String, required: true },
    serviceName:   { type: String, required: true },
    description:   { type: String, required: true },
    address:       { type: String, required: true },
    scheduledDate: { type: Date,   required: true },
    amount:        { type: Number, required: true },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
        default: 'PENDING'
    },
    paymentStatus: {
        type: String,
        enum: ['UNPAID', 'PAID'],
        default: 'UNPAID'
    },
    rejectionReason: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
