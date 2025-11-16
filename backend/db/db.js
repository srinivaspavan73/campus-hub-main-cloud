const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();


// Database Connection
const sequelize = new Sequelize(
    process.env.DB_NAME || 'CampusHub',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        port: process.env.DB_PORT || 3306,
        logging: false, // Set to console.log to see SQL queries
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Test database connection
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('MySQL database connected successfully');
        
        // Sync all models (create tables if they don't exist)
        await sequelize.sync({ alter: true }); // Use { force: true } to drop and recreate tables
        console.log('Database synced successfully');
    } catch (error) {
        console.error('Unable to connect to database:', error);
        process.exit(1);
    }
};

// User Model
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('student', 'organizer'),
        defaultValue: 'student'
    }
}, {
    tableName: 'users',
    timestamps: true, // This adds createdAt and updatedAt
    underscored: true // This converts camelCase to snake_case in database
});

// Admin Model
const Admin = sequelize.define('Admin', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    adminName: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('admin'),
        defaultValue: 'admin'
    }
}, {
    tableName: 'admins',
    timestamps: true,
    underscored: true
});

// Event Model
const Event = sequelize.define('Event', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    date: {
        type: DataTypes.DATEONLY, // Only date, no time
        allowNull: false
    },
    time: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    location: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    imageUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
            isUrl: true
        }
    },
    videoUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
            isUrl: true
        }
    },
    organizerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'organizer_id' // This maps to the actual column name in database
    }
}, {
    tableName: 'events',
    timestamps: true,
    underscored: true
});

// Registration Model (Junction table for User-Event relationship)
const Registration = sequelize.define('Registration', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id'
    },
    eventId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'event_id'
    },
    registeredAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'registered_at'
    }
}, {
    tableName: 'registrations',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'event_id'] // Prevent duplicate registrations
        }
    ]
});

// Define Associations
// Event belongs to Admin (organizer)
Event.belongsTo(Admin, {
    foreignKey: 'organizerId',
    as: 'organizer'
});

Admin.hasMany(Event, {
    foreignKey: 'organizerId',
    as: 'events'
});

// User-Event Many-to-Many through Registration
User.belongsToMany(Event, {
    through: Registration,
    foreignKey: 'userId',
    otherKey: 'eventId',
    as: 'registeredEvents'
});

Event.belongsToMany(User, {
    through: Registration,
    foreignKey: 'eventId',
    otherKey: 'userId',
    as: 'attendees'
});

// Direct associations for Registration table
Registration.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

Registration.belongsTo(Event, {
    foreignKey: 'eventId',
    as: 'event'
});

User.hasMany(Registration, {
    foreignKey: 'userId',
    as: 'registrations'
});

Event.hasMany(Registration, {
    foreignKey: 'eventId',
    as: 'registrations'
});

// Initialize database connection
connectDB();

module.exports = {
    sequelize,
    User,
    Event,
    Registration,
    Admin,
    connectDB
};