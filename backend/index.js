const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

const { User, Event, Registration, Admin } = require('./db/db');

dotenv.config();

const app = express();

// ✅ CRITICAL: Apply CORS BEFORE any other middleware
const allowedOrigins = [
    'https://campus-hub-main-cloud.vercel.app', // ✅ NO trailing slash
    'http://localhost:5173',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400 // 24 hours
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json());

// Validation Schemas
const authSchema = z.object({
    email: z.string().min(5).max(255).email({ message: "Invalid email format" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters long" })
});

const eventSchema = z.object({
    title: z.string().min(1, { message: "Title is required" }),
    description: z.string().optional(),
    date: z.string().min(1, { message: "Date is required" }),
    time: z.string().min(1, { message: "Time is required" }),
    location: z.string().min(1, { message: "Location is required" }),
    imageUrl: z.string().url().optional().or(z.literal('')),
    videoUrl: z.string().url().optional().or(z.literal(''))
});

// Email Configuration
const emailConfig = {
    transporter: nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    }),
    async sendEmail(to, subject, htmlContent) {
        try {
            const info = await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
                to,
                subject,
                html: htmlContent,
                text: htmlContent.replace(/<[^>]*>/g, '')
            });
            console.log("Email sent successfully:", info.response);
            return true;
        } catch (error) {
            console.error("Email sending failed:", error);
            return false;
        }
    },
    async sendWelcomeEmail(user) {
        const username = user.username ? user.username : user.email.split("@")[0];
        return this.sendEmail(
            user.email,
            "🎉 Welcome to CampusHub! 🚀",
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h1 style="color: #4a6ee0; text-align: center;">Welcome to CampusHub! 🚀</h1>
                <p style="font-size: 16px; line-height: 1.5;">Hey <strong>${username}</strong>! 👋</p>
                <p style="font-size: 16px; line-height: 1.5;">Welcome to <strong>CampusHub</strong> — your one-stop destination for campus events! 🎓🎉</p>
                <p style="font-size: 16px; line-height: 1.5;">Explore exciting meetups, workshops, and activities happening around you. Never miss an event again! 🔥</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://campus-hub-main-cloud.vercel.app/" style="background-color: #4a6ee0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Visit CampusHub</a>
                </div>
                <p style="font-size: 16px; line-height: 1.5;">If you have any questions, we're here to help.</p>
                <p style="font-size: 16px; line-height: 1.5;">Happy exploring! 🚀</p>
                <p style="font-size: 16px; line-height: 1.5;"><strong>Team CampusHub</strong></p>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                <p style="font-size: 14px; color: #777; text-align: center;">
                    <a href="https://campus-hub-main-cloud.vercel.app/" style="color: #4a6ee0; text-decoration: none;">CampusHub</a>
                </p>
            </div>
            `
        );
    },
    async sendEventRegistrationEmail(event, user) {
        const username = user.username ? user.username : user.email.split("@")[0];
        return this.sendEmail(
            user.email,
            `🎟️ You're Registered: ${event.title}!`,
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h1 style="color: #4a6ee0; text-align: center;">You're Registered! 🎉</h1>
                <p style="font-size: 16px; line-height: 1.5;">Hey <strong>${username}</strong>!</p>
                <p style="font-size: 16px; line-height: 1.5;">Awesome! You've successfully registered for <strong>${event.title}</strong>! 🎉</p>
                
                <div style="background-color: #f8f9fa; border-radius: 6px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                    <p style="margin: 8px 0;"><strong>⏰ Time:</strong> ${event.time}</p>
                    <p style="margin: 8px 0;"><strong>📍 Location:</strong> ${event.location}</p>
                </div>
                
                <p style="font-size: 16px; line-height: 1.5;">We can't wait to see you there! 🙌</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://campus-hub-main-cloud.vercel.app/" style="background-color: #4a6ee0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Event Details</a>
                </div>
                
                <p style="font-size: 16px; line-height: 1.5;">Cheers,<br><strong>Team CampusHub 🚀</strong></p>
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                <p style="font-size: 14px; color: #777; text-align: center;">
                    <a href="https://campus-hub-main-cloud.vercel.app/" style="color: #4a6ee0; text-decoration: none;">CampusHub</a>
                </p>
            </div>
            `
        );
    },
    async sendEventNotification(event) {
        const users = await User.find({}, 'email');
        if (!users.length) return;

        return this.sendEmail(
            users.map(user => user.email).join(", "),
            `🚀 New Event: ${event.title}!`,
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h1 style="color: #4a6ee0; text-align: center;">New Event Alert! 🔔</h1>
                <p style="font-size: 16px; line-height: 1.5;">Hey there! 🎉</p>
                <p style="font-size: 16px; line-height: 1.5;">A brand-new event <strong>"${event.title}"</strong> is happening soon! Don't miss out! 🔥</p>
                
                <div style="background-color: #f8f9fa; border-radius: 6px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                    <p style="margin: 8px 0;"><strong>⏰ Time:</strong> ${event.time}</p>
                    <p style="margin: 8px 0;"><strong>📍 Location:</strong> ${event.location}</p>
                </div>
                
                <p style="font-size: 16px; line-height: 1.5;">Be part of the experience and make unforgettable memories! 💡🎭</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://campus-hub-main-cloud.vercel.app/" style="background-color: #4a6ee0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Register Now</a>
                </div>
                
                <p style="font-size: 16px; line-height: 1.5;">See you there!<br><strong>Team CampusHub 🚀</strong></p>
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                <p style="font-size: 14px; color: #777; text-align: center;">
                    <a href="https://campus-hub-main-cloud.vercel.app/" style="color: #4a6ee0; text-decoration: none;">CampusHub</a>
                </p>
            </div>
            `
        );
    }
};

// Middleware
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, msg: 'Internal server error' });
};

const authenticateToken = (req, res, next) => {
    try {
        const token = req.header("Authorization")?.split(" ")[1];
        if (!token) return res.status(401).json({ success: false, msg: "Access denied" });

        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ success: false, msg: "Invalid token" });
    }
};

const isAdmin = async (req, res, next) => {
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ success: false, msg: "Access denied" });
        }
        next();
    } catch (error) {
        res.status(500).json({ success: false, msg: "Server error" });
    }
};

// Route Handlers
const userRoutes = {
    async signup(req, res) {
        try {
            const { email, password } = authSchema.parse(req.body);

            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ success: false, msg: 'User already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const username = email.split("@")[0];

            const newUser = new User({
                username,
                email,
                password: hashedPassword
            });

            await newUser.save();

            const token = jwt.sign(
                { id: newUser._id, email },
                process.env.JWT_SECRET,
            );

            await emailConfig.sendWelcomeEmail(newUser);

            res.status(201).json({
                success: true,
                msg: 'User signed up successfully',
                token,
                user: { id: newUser._id, username, email }
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    msg: 'Invalid input',
                    errors: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
                });
            }
            throw error;
        }
    },

    async signin(req, res) {
        try {
            const { email, password } = authSchema.parse(req.body);

            const user = await User.findOne({ email });
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(400).json({ success: false, msg: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { id: user._id, email },
                process.env.JWT_SECRET,
            );

            res.json({
                success: true,
                msg: 'User logged in successfully',
                token,
                user: { id: user._id, username: user.username, email }
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    msg: 'Invalid input',
                    errors: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
                });
            }
            throw error;
        }
    },

    async getProfile(req, res) {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, msg: "User not found" });
        }
        res.json({ success: true, user });
    },

    async registerForEvent(req, res) {
        try {
            const event = await Event.findById(req.params.id);
            if (!event) {
                return res.status(404).json({ success: false, msg: 'Event not found' });
            }

            const existingRegistration = await Registration.findOne({
                userId: req.user.id,
                eventId: event._id
            });

            if (existingRegistration) {
                return res.status(400).json({ success: false, msg: 'Already registered' });
            }

            const registration = new Registration({
                userId: req.user.id,
                eventId: event._id
            });
            await registration.save();

            event.attendees.push(req.user.id);
            await event.save();

            const user = await User.findById(req.user.id);
            await emailConfig.sendEventRegistrationEmail(event, user);

            res.json({ success: true, msg: 'Registered successfully!' });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ success: false, msg: 'Server error' });
        }
    }
};

const adminRoutes = {
    async signup(req, res) {
        try {
            const { email, password } = authSchema.parse(req.body);

            const existingAdmin = await Admin.findOne({ email });
            if (existingAdmin) {
                return res.status(400).json({ success: false, msg: 'Admin already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const username = email.split("@")[0];

            const newAdmin = new Admin({
                username,
                adminName: username,
                email,
                password: hashedPassword
            });

            await newAdmin.save();

            const token = jwt.sign(
                { id: newAdmin._id, email },
                process.env.JWT_SECRET,
            );

            res.status(201).json({
                success: true,
                msg: 'Admin signed up successfully',
                token,
                admin: { id: newAdmin._id, adminName: username, email }
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    msg: 'Invalid input',
                    errors: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
                });
            }
            throw error;
        }
    },

    async signin(req, res) {
        try {
            const { email, password } = authSchema.parse(req.body);

            const admin = await Admin.findOne({ email });
            if (!admin || !(await bcrypt.compare(password, admin.password))) {
                return res.status(400).json({ success: false, msg: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { id: admin._id, email },
                process.env.JWT_SECRET,
            );

            res.json({
                success: true,
                msg: 'Admin logged in successfully',
                token,
                admin: { id: admin._id, adminName: admin.adminName, email }
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    msg: 'Invalid input',
                    errors: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
                });
            }
            throw error;
        }
    },

    async getProfile(req, res) {
        const admin = await Admin.findById(req.user.id).select('-password');
        if (!admin) {
            return res.status(404).json({ success: false, msg: "Admin not found" });
        }
        res.json({ success: true, admin });
    },

    async createEvent(req, res) {
        try {
            const eventData = eventSchema.parse(req.body);

            const newEvent = new Event({
                ...eventData,
                organizerId: req.user.id,
                attendees: []
            });

            await newEvent.save();
            await emailConfig.sendEventNotification(newEvent);

            res.status(201).json({
                success: true,
                msg: 'Event created successfully',
                event: newEvent
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    msg: 'Invalid input',
                    errors: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
                });
            }
            throw error;
        }
    },

    async updateEvent(req, res) {
        try {
            const eventData = eventSchema.parse(req.body);

            const updatedEvent = await Event.findByIdAndUpdate(
                req.params.id,
                eventData,
                { new: true, runValidators: true }
            );

            if (!updatedEvent) {
                return res.status(404).json({ success: false, msg: "Event not found" });
            }

            await emailConfig.sendEventNotification(updatedEvent);

            res.json({
                success: true,
                msg: "Event updated successfully",
                event: updatedEvent
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    msg: 'Invalid input',
                    errors: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
                });
            }
            throw error;
        }
    },

    async deleteEvent(req, res) {
        try {
            await Registration.deleteMany({ eventId: req.params.eventId });
            
            const deletedEvent = await Event.findByIdAndDelete(req.params.eventId);
            
            if (!deletedEvent) {
                return res.status(404).json({ success: false, msg: 'Event not found' });
            }

            res.json({ success: true, msg: 'Event deleted successfully' });
        } catch (error) {
            console.error('Delete event error:', error);
            res.status(500).json({ success: false, msg: 'Server error' });
        }
    },

    async getEventRegistrations(req, res) {
        try {
            const registrations = await Registration.find({ eventId: req.params.eventId })
                .populate('userId', 'username email');

            const formattedRegistrations = registrations.map(reg => ({
                id: reg._id,
                userId: reg.userId._id,
                eventId: reg.eventId,
                registeredAt: reg.registeredAt,
                user: {
                    username: reg.userId.username,
                    email: reg.userId.email
                }
            }));

            res.json({ success: true, registrations: formattedRegistrations });
        } catch (error) {
            console.error('Get registrations error:', error);
            res.status(500).json({ success: false, msg: 'Server error' });
        }
    }
};

// Routes
app.get('/', (req, res) => res.send("Hello from CampusHub Backend"));

// Admin routes
app.post('/admin/signup', adminRoutes.signup);
app.post('/admin/signin', adminRoutes.signin);
app.get('/admin/profile', authenticateToken, adminRoutes.getProfile);
app.get('/admin/events', authenticateToken, isAdmin, async (req, res) => {
    try {
        const events = await Event.find()
            .populate('attendees', 'id username email');

        const formattedEvents = events.map(event => ({
            id: event._id,
            title: event.title,
            description: event.description,
            date: event.date,
            time: event.time,
            location: event.location,
            imageUrl: event.imageUrl,
            videoUrl: event.videoUrl,
            organizerId: event.organizerId,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
            attendees: event.attendees.map(user => ({
                id: user._id,
                username: user.username,
                email: user.email
            }))
        }));

        res.json({ success: true, events: formattedEvents });
    } catch (error) {
        console.error('Get admin events error:', error);
        res.status(500).json({ success: false, msg: 'Server error' });
    }
});
app.post('/admin/create-event', authenticateToken, isAdmin, adminRoutes.createEvent);
app.put('/admin/edit-event/:id', authenticateToken, isAdmin, adminRoutes.updateEvent);
app.delete('/admin/delete-event/:eventId', authenticateToken, isAdmin, adminRoutes.deleteEvent);
app.get('/admin/event/:eventId/registrations', authenticateToken, isAdmin, adminRoutes.getEventRegistrations);

// User routes
app.post('/user/signup', userRoutes.signup);
app.post('/user/signin', userRoutes.signin);
app.get('/user/profile', authenticateToken, userRoutes.getProfile);
app.get('/user/events', async (req, res) => {
    try {
        const events = await Event.find()
            .populate('attendees', 'id username email');

        const formattedEvents = events.map(event => ({
            id: event._id,
            title: event.title,
            description: event.description,
            date: event.date,
            time: event.time,
            location: event.location,
            imageUrl: event.imageUrl,
            videoUrl: event.videoUrl,
            organizerId: event.organizerId,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
            attendees: event.attendees.map(user => ({
                id: user._id,
                username: user.username,
                email: user.email
            }))
        }));

        res.json({ success: true, events: formattedEvents });
    } catch (error) {
        console.error('Get user events error:', error);
        res.status(500).json({ success: false, msg: 'Server error' });
    }
});
app.post('/user/register-event/:id', authenticateToken, userRoutes.registerForEvent);

// Test routes
app.get('/test-db', async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        res.json({ 
            success: true, 
            userCount, 
            timestamp: new Date().toISOString() 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, 'id username email createdAt');
        res.json({ 
            success: true, 
            users, 
            count: users.length 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Error handling
app.use(errorHandler);

// Use Render's dynamic PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 Backend URL: https://campus-hub-main-cloud.onrender.com`);
    console.log(`🌐 Allowed origins:`, allowedOrigins);
});