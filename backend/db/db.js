const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log(`MongoDB connected successfully: ${conn.connection.host}`);
        console.log(`Database: ${conn.connection.name}`);
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// User Schema
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'organizer'],
        default: 'student'
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

// Admin Schema
const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    adminName: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin'],
        default: 'admin'
    }
}, {
    timestamps: true
});

// Event Schema
const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    imageUrl: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+/, 'Please provide a valid URL']
    },
    videoUrl: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+/, 'Please provide a valid URL']
    },
    organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    // Store attendee IDs directly in the event for easy access
    attendees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Registration Schema (for tracking registration details)
const registrationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    registeredAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Prevent duplicate registrations
registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });

// Create Models
const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Event = mongoose.model('Event', eventSchema);
const Registration = mongoose.model('Registration', registrationSchema);

// Initialize database connection
connectDB();

module.exports = {
    connectDB,
    User,
    Admin,
    Event,
    Registration
};