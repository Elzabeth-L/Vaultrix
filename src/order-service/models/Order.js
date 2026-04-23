const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    clientId: { type: String, required: true }, // Ideally ObjectId from User DB, but string is fine for loose coupling
    providerId: { type: String }, // Assigned later
    amount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['CREATED', 'ASSIGNED', 'COMPLETED', 'SETTLED'], 
        default: 'CREATED' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
