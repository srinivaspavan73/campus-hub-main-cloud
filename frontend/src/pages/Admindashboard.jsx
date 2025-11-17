/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { adminState } from "../state/adminAtom";
import { 
    Menu, LogOut, ChevronLeft, AlertTriangle, CheckCircle, 
    XCircle, X, Calendar, PieChart, Users, Eye, Download, 
    Plus, Edit, Trash2 
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [admin, setAdmin] = useRecoilState(adminState);
    
    // State management
    const [events, setEvents] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);
    const [isEditingEvent, setIsEditingEvent] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', type: '' });
    
    const [eventForm, setEventForm] = useState({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        imageUrl: '',
        videoUrl: ''
    });

    // Configure axios with auth token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate('/admin/signin');
            return;
        }
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }, [navigate]);

    // Fetch initial data
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            fetchProfile();
            fetchEvents();
        }
    }, []);

    // ==================== API FUNCTIONS ====================
    
    const fetchProfile = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/profile`);
            if (response.data.success) {
                setAdmin(response.data.admin);
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
            if (error.response?.status === 401) {
                handleLogout();
            } else {
                handleError('Failed to load profile');
            }
        }
    };

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/events`);
            if (response.data.success) {
                setEvents(response.data.events);
            }
        } catch (error) {
            console.error('Events fetch error:', error);
            if (error.response?.status === 401) {
                handleLogout();
            } else {
                handleError('Failed to load events');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchEventRegistrations = async (eventId) => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/event/${eventId}/registrations`);
            if (response.data.success) {
                setRegistrations(response.data.registrations);
                setSelectedEvent(events.find(event => event.id === eventId));
                setActiveTab('registrations');
            }
        } catch (error) {
            console.error('Registrations fetch error:', error);
            handleError('Failed to load registrations');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/admin/create-event`, eventForm);
            if (response.data.success) {
                await fetchEvents();
                setIsCreatingEvent(false);
                resetEventForm();
                showToast('Event created successfully! Email notifications sent to all users.', 'success');
            }
        } catch (error) {
            console.error('Create event error:', error);
            handleError(error.response?.data?.msg || 'Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateEvent = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.put(`${API_BASE_URL}/admin/edit-event/${selectedEvent.id}`, eventForm);
            if (response.data.success) {
                await fetchEvents();
                setIsEditingEvent(false);
                setSelectedEvent(null);
                resetEventForm();
                showToast(`Event "${response.data.event.title}" updated successfully!`, 'success');
            }
        } catch (error) {
            console.error('Update event error:', error);
            handleError(error.response?.data?.msg || 'Failed to update event');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm('Are you sure you want to delete this event? This will also delete all registrations.')) {
            return;
        }

        setLoading(true);
        try {
            const response = await axios.delete(`${API_BASE_URL}/admin/delete-event/${eventId}`);
            if (response.data.success) {
                await fetchEvents();
                showToast('Event deleted successfully!', 'success');
            }
        } catch (error) {
            console.error('Delete event error:', error);
            handleError(error.response?.data?.msg || 'Failed to delete event');
        } finally {
            setLoading(false);
        }
    };

    // ==================== HELPER FUNCTIONS ====================

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000);
    };

    const handleError = (message) => {
        setError(message);
        console.error(message);
        showToast(message, 'error');
        setTimeout(() => setError(''), 5000);
    };

    const resetEventForm = () => {
        setEventForm({
            title: '',
            description: '',
            date: '',
            time: '',
            location: '',
            imageUrl: '',
            videoUrl: ''
        });
    };

    const startEditEvent = (event) => {
        setSelectedEvent(event);
        setEventForm({
            title: event.title,
            description: event.description || '',
            date: event.date.split('T')[0],
            time: event.time || '',
            location: event.location,
            imageUrl: event.imageUrl || '',
            videoUrl: event.videoUrl || ''
        });
        setIsEditingEvent(true);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const exportToCSV = () => {
        if (events.length === 0) {
            showToast("No events to export!", "warning");
            return;
        }

        const csvHeaders = ["Event Name,Description,Date,Time,Location,Attendees"];
        const csvRows = events.map(event =>
            `"${event.title}","${event.description || ''}","${formatDate(event.date)}","${event.time || ''}","${event.location}","${event.attendees?.length || 0}"`
        );

        const csvContent = [csvHeaders, ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `campushub_events_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast("Events exported successfully!", "success");
    };

    const exportRegistrationsToCSV = () => {
        if (registrations.length === 0) {
            showToast("No registrations to export!", "warning");
            return;
        }

        const csvHeaders = ["Name,Email,Registered Date"];
        const csvRows = registrations.map(reg =>
            `"${reg.user?.username || reg.user?.email.split("@")[0] || 'N/A'}","${reg.user?.email || 'N/A'}","${formatDate(reg.registeredAt)}"`
        );

        const csvContent = [csvHeaders, ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedEvent?.title.replace(/\s+/g, "_")}_registrations_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast("Registrations exported successfully!", "success");
    };

    const handleLogout = () => {
        setAdmin(null);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        navigate('/admin/signin');
        showToast("Logged out successfully", "success");
    };

    // ==================== RENDER ====================

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                handleLogout={handleLogout}
                setSelectedEvent={setSelectedEvent}
                setIsCreatingEvent={setIsCreatingEvent}
                setIsEditingEvent={setIsEditingEvent}
            />

            {/* Main content */}
            <div className="flex-1 overflow-auto">
                {/* Header */}
                <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center">
                        {activeTab === 'registrations' && (
                            <button
                                onClick={() => setActiveTab('events')}
                                className="mr-3 text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <h1 className="text-xl font-semibold text-gray-800">
                            {activeTab === 'dashboard' && 'Dashboard Overview'}
                            {activeTab === 'events' && (isCreatingEvent ? 'Create New Event' : isEditingEvent ? 'Edit Event' : 'Manage Events')}
                            {activeTab === 'registrations' && `Event Registrations`}
                        </h1>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                {admin?.username?.charAt(0).toUpperCase() || admin?.adminName?.charAt(0).toUpperCase() || 'A'}
                            </div>
                            <span className="text-gray-700 font-medium hidden md:block">
                                {admin?.username || admin?.adminName || admin?.email?.split('@')[0] || 'Admin'}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-6 rounded flex items-start">
                        <AlertTriangle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">{error}</div>
                        <button className="text-red-500 hover:text-red-700" onClick={() => setError('')}>
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Toast Notifications */}
                {toast.show && (
                    <Toast 
                        message={toast.message} 
                        type={toast.type} 
                        onClose={() => setToast({ show: false, message: '', type: '' })} 
                    />
                )}

                {/* Main content area */}
                <main className="p-6">
                    {loading ? (
                        <LoadingSpinner />
                    ) : (
                        <>
                            {/* Dashboard View */}
                            {activeTab === 'dashboard' && (
                                <DashboardView 
                                    events={events}
                                    formatDate={formatDate}
                                    exportToCSV={exportToCSV}
                                    setActiveTab={setActiveTab}
                                    fetchEventRegistrations={fetchEventRegistrations}
                                    setIsCreatingEvent={setIsCreatingEvent}
                                />
                            )}

                            {/* Events List */}
                            {activeTab === 'events' && !isCreatingEvent && !isEditingEvent && (
                                <EventsView 
                                    events={events}
                                    setIsCreatingEvent={setIsCreatingEvent}
                                    fetchEventRegistrations={fetchEventRegistrations}
                                    startEditEvent={startEditEvent}
                                    handleDeleteEvent={handleDeleteEvent}
                                    formatDate={formatDate}
                                />
                            )}

                            {/* Create/Edit Event Form */}
                            {activeTab === 'events' && (isCreatingEvent || isEditingEvent) && (
                                <EventForm 
                                    eventForm={eventForm}
                                    setEventForm={setEventForm}
                                    isCreatingEvent={isCreatingEvent}
                                    setIsCreatingEvent={setIsCreatingEvent}
                                    isEditingEvent={isEditingEvent}
                                    setIsEditingEvent={setIsEditingEvent}
                                    handleCreateEvent={handleCreateEvent}
                                    handleUpdateEvent={handleUpdateEvent}
                                    setSelectedEvent={setSelectedEvent}
                                    resetEventForm={resetEventForm}
                                />
                            )}

                            {/* Registrations View */}
                            {activeTab === 'registrations' && selectedEvent && (
                                <RegistrationsView 
                                    selectedEvent={selectedEvent}
                                    registrations={registrations}
                                    formatDate={formatDate}
                                    exportRegistrationsToCSV={exportRegistrationsToCSV}
                                />
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

// ==================== SIDEBAR COMPONENT ====================

function Sidebar({ 
    sidebarCollapsed, 
    setSidebarCollapsed, 
    activeTab, 
    setActiveTab, 
    handleLogout,
    setSelectedEvent,
    setIsCreatingEvent,
    setIsEditingEvent
}) {
    const SidebarLink = ({ icon, label, tabName }) => (
        <div
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                activeTab === tabName 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-100'
            } cursor-pointer`}
            onClick={() => {
                setActiveTab(tabName);
                if (tabName === 'events') {
                    setSelectedEvent(null);
                    setIsCreatingEvent(false);
                    setIsEditingEvent(false);
                }
            }}
        >
            {icon}
            {!sidebarCollapsed && <span className="ml-3 font-medium">{label}</span>}
        </div>
    );

    return (
        <div className={`bg-white shadow-md transition-all duration-300 flex flex-col ${
            sidebarCollapsed ? 'w-20' : 'w-64'
        }`}>
            <div className="p-4 flex justify-between items-center border-b">
                {!sidebarCollapsed && (
                    <h2 className="text-xl font-bold text-blue-600">CampusHub</h2>
                )}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <Menu size={20} />
                </button>
            </div>

            <div className="py-4 px-3 space-y-1 flex-1">
                <SidebarLink
                    icon={<PieChart size={20} />}
                    label="Dashboard"
                    tabName="dashboard"
                />
                <SidebarLink
                    icon={<Calendar size={20} />}
                    label="Events"
                    tabName="events"
                />
            </div>

            <div className="border-t p-3">
                <div
                    className="flex items-center px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                    onClick={handleLogout}
                >
                    <LogOut size={20} />
                    {!sidebarCollapsed && <span className="ml-3 font-medium">Logout</span>}
                </div>
            </div>
        </div>
    );
}

// ==================== DASHBOARD VIEW COMPONENT ====================

function DashboardView({ 
    events, 
    formatDate, 
    exportToCSV, 
    setActiveTab, 
    fetchEventRegistrations,
    setIsCreatingEvent
}) {
    const StatCard = ({ label, value, icon, color }) => (
        <div className="bg-white rounded-lg shadow-sm p-6 transition-all hover:shadow-md">
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-gray-500 text-sm font-medium">{label}</p>
                    <h3 className="text-3xl font-bold mt-1 text-gray-800">{value}</h3>
                </div>
                <div className={`p-3 ${color} rounded-full`}>
                    {icon}
                </div>
            </div>
        </div>
    );

    const totalAttendees = events.reduce((sum, event) => sum + (event.attendees?.length || 0), 0);
    const upcomingEvents = events.filter(event => new Date(event.date) > new Date()).length;

    return (
        <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <StatCard
                    label="Total Events"
                    value={events.length}
                    icon={<Calendar size={24} className="text-blue-600" />}
                    color="bg-blue-100"
                />
                <StatCard
                    label="Total Attendees"
                    value={totalAttendees}
                    icon={<Users size={24} className="text-green-600" />}
                    color="bg-green-100"
                />
                <StatCard
                    label="Upcoming Events"
                    value={upcomingEvents}
                    icon={<PieChart size={24} className="text-purple-600" />}
                    color="bg-purple-100"
                />
            </div>

            {/* Recent Events Table */}
            <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">Recent Events</h2>
                        <p className="text-sm text-gray-500 mt-1">Manage and track your campus events</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-700 rounded-lg shadow-md hover:from-green-600 hover:to-green-800 transform hover:scale-105 transition-all"
                        >
                            <Download size={16} />
                            Export CSV
                        </button>
                        <button
                            onClick={() => setActiveTab('events')}
                            className="text-blue-600 text-sm font-medium hover:underline"
                        >
                            View All →
                        </button>
                    </div>
                </div>

                <div className="p-5 overflow-x-auto">
                    {events.length > 0 ? (
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-gray-500 text-sm border-b">
                                    <th className="pb-3 px-5 font-semibold">Event</th>
                                    <th className="pb-3 px-5 font-semibold">Date & Time</th>
                                    <th className="pb-3 px-5 font-semibold">Location</th>
                                    <th className="pb-3 px-5 text-center font-semibold">Attendees</th>
                                    <th className="pb-3 px-5 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.slice(0, 5).map(event => (
                                    <tr key={event.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                                        <td className="px-5 py-4 font-semibold text-gray-800">{event.title}</td>
                                        <td className="px-5 py-4 text-gray-700">
                                            <div>{formatDate(event.date)}</div>
                                            {event.time && <div className="text-sm text-gray-500">{event.time}</div>}
                                        </td>
                                        <td className="px-5 py-4 text-gray-700">{event.location}</td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                                                {event.attendees?.length || 0}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <button
                                                onClick={() => fetchEventRegistrations(event.id)}
                                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline transition font-medium"
                                                title="View Registrations"
                                            >
                                                <Eye size={18} />
                                                <span className="text-sm">View</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-12">
                            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500 mb-4">No events found. Start by creating your first event!</p>
                            <button
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                onClick={() => { setActiveTab('events'); setIsCreatingEvent(true); }}
                            >
                                <Plus size={18} className="inline mr-2" />
                                Create Event
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ==================== EVENTS VIEW COMPONENT ====================

function EventsView({
    events,
    setIsCreatingEvent,
    fetchEventRegistrations,
    startEditEvent,
    handleDeleteEvent,
    formatDate
}) {
    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Manage Events</h2>
                    <p className="text-sm text-gray-500 mt-1">Create, edit, and manage all campus events</p>
                </div>
                <button
                    onClick={() => setIsCreatingEvent(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center font-medium shadow-sm"
                >
                    <Plus size={18} className="mr-2" /> Create New Event
                </button>
            </div>

            <div className="overflow-x-auto">
                {events.length > 0 ? (
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-gray-500 text-sm border-b">
                                <th className="pb-3 pl-4 font-semibold">Event Name</th>
                                <th className="pb-3 font-semibold">Date</th>
                                <th className="pb-3 font-semibold">Location</th>
                                <th className="pb-3 text-center font-semibold">Attendees</th>
                                <th className="pb-3 text-center font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map(event => (
                                <tr key={event.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                    <td className="py-4 pl-4 font-medium text-gray-800">{event.title}</td>
                                    <td className="py-4 text-gray-700">{formatDate(event.date)}</td>
                                    <td className="py-4 text-gray-700">{event.location}</td>
                                    <td className="py-4 text-center">
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                                            {event.attendees?.length || 0}
                                        </span>
                                    </td>
                                    <td className="py-4 flex justify-center gap-2">
                                        <button
                                            onClick={() => fetchEventRegistrations(event.id)}
                                            className="p-2 text-blue-500 hover:bg-blue-100 rounded-full transition-colors"
                                            title="View Registrations"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => startEditEvent(event)}
                                            className="p-2 text-green-500 hover:bg-green-100 rounded-full transition-colors"
                                            title="Edit Event"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteEvent(event.id)}
                                            className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                                            title="Delete Event"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-12">
                        <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 mb-4">No events created yet</p>
                        <button
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            onClick={() => setIsCreatingEvent(true)}
                        >
                            <Plus size={18} className="inline mr-2" />
                            Create Your First Event
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ==================== REGISTRATIONS VIEW COMPONENT ====================

function RegistrationsView({ 
    selectedEvent, 
    registrations, 
    formatDate, 
    exportRegistrationsToCSV 
}) {
    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-6">
                <div className="mb-4 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">{selectedEvent.title}</h3>
                        <p className="text-gray-500 mt-1">
                            {formatDate(selectedEvent.date)} • {selectedEvent.time} • {selectedEvent.location}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                            <strong>{registrations.length}</strong> {registrations.length === 1 ? 'person' : 'people'} registered
                        </p>
                    </div>
                    <button
                        onClick={exportRegistrationsToCSV}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition"
                    >
                        <Download size={16} /> Export CSV
                    </button>
                </div>

                <div className="overflow-x-auto mt-6">
                    {registrations.length > 0 ? (
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-gray-500 text-sm border-b">
                                    <th className="pb-3 pl-4 font-semibold">Name</th>
                                    <th className="pb-3 font-semibold">Email</th>
                                    <th className="pb-3 font-semibold">Registered Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrations.map((registration, index) => (
                                    <tr key={registration.id || index} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                        <td className="py-4 pl-4 font-medium text-gray-800">
                                            {registration.user?.username || registration.user?.email?.split("@")[0] || 'N/A'}
                                        </td>
                                        <td className="py-4 text-gray-700">{registration.user?.email || 'N/A'}</td>
                                        <td className="py-4 text-gray-700">{formatDate(registration.registeredAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-12">
                            <Users size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500">No registrations for this event yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ==================== EVENT FORM COMPONENT ====================

function EventForm({
    eventForm,
    setEventForm,
    isCreatingEvent,
    setIsCreatingEvent,
    isEditingEvent,
    setIsEditingEvent,
    handleCreateEvent,
    handleUpdateEvent,
    setSelectedEvent,
    resetEventForm
}) {
    const handleCancel = () => {
        if (isCreatingEvent) setIsCreatingEvent(false);
        if (isEditingEvent) {
            setIsEditingEvent(false);
            setSelectedEvent(null);
        }
        resetEventForm();
    };

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800">
                    {isCreatingEvent ? 'Create New Event' : 'Edit Event'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    {isCreatingEvent 
                        ? 'Fill in the details to create a new campus event' 
                        : 'Update the event details below'}
                </p>
            </div>

            <form onSubmit={isCreatingEvent ? handleCreateEvent : handleUpdateEvent}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Event Title */}
                    <div className="col-span-2">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                            Event Title *
                        </label>
                        <input
                            type="text"
                            id="title"
                            required
                            value={eventForm.title}
                            onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            placeholder="e.g., Annual Tech Fest 2024"
                        />
                    </div>

                    {/* Description */}
                    <div className="col-span-2">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            id="description"
                            value={eventForm.description}
                            onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                            rows="4"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            placeholder="Provide a detailed description of the event..."
                        ></textarea>
                    </div>

                    {/* Date */}
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                            Date *
                        </label>
                        <input
                            type="date"
                            id="date"
                            required
                            value={eventForm.date}
                            onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>

                    {/* Time */}
                    <div>
                        <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                            Time *
                        </label>
                        <input
                            type="time"
                            id="time"
                            required
                            value={eventForm.time}
                            onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>

                    {/* Location */}
                    <div className="col-span-2">
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                            Location *
                        </label>
                        <input
                            type="text"
                            id="location"
                            required
                            value={eventForm.location}
                            onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            placeholder="e.g., Main Auditorium, Building A"
                        />
                    </div>

                    {/* Image URL */}
                    <div className="col-span-2">
                        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
                            Image URL <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                            type="url"
                            id="imageUrl"
                            value={eventForm.imageUrl}
                            onChange={(e) => setEventForm({ ...eventForm, imageUrl: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            placeholder="https://example.com/event-image.jpg"
                        />
                        <p className="text-xs text-gray-500 mt-1">Provide a direct link to an event banner or poster image</p>
                    </div>

                    {/* Video URL */}
                    <div className="col-span-2">
                        <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700 mb-1">
                            Video URL <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                            type="url"
                            id="videoUrl"
                            value={eventForm.videoUrl}
                            onChange={(e) => setEventForm({ ...eventForm, videoUrl: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            placeholder="https://youtube.com/watch?v=..."
                        />
                        <p className="text-xs text-gray-500 mt-1">Link to a promotional video or live stream</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex justify-end gap-3">
                    <button
                        type="button"
                        className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        onClick={handleCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                    >
                        {isCreatingEvent ? 'Create Event' : 'Update Event'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// ==================== LOADING SPINNER COMPONENT ====================

function LoadingSpinner() {
    return (
        <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 mt-4">Loading...</span>
        </div>
    );
}

// ==================== TOAST NOTIFICATION COMPONENT ====================

function Toast({ message, type = 'success', onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle size={20} className="text-green-500" />;
            case 'warning':
                return <AlertTriangle size={20} className="text-yellow-500" />;
            case 'error':
                return <XCircle size={20} className="text-red-500" />;
            default:
                return <CheckCircle size={20} className="text-green-500" />;
        }
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'success':
                return 'bg-green-50 border-green-200';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200';
            case 'error':
                return 'bg-red-50 border-red-200';
            default:
                return 'bg-green-50 border-green-200';
        }
    };

    return (
        <div className={`fixed top-5 right-5 z-50 flex items-center p-4 rounded-lg shadow-lg border ${getBackgroundColor()} animate-slideIn max-w-md`}>
            <div className="flex items-center">
                {getIcon()}
                <div className="ml-3 mr-6">
                    <p className="text-sm font-medium text-gray-800">{message}</p>
                </div>
            </div>
            <button
                onClick={onClose}
                className="ml-auto text-gray-400 hover:text-gray-600 focus:outline-none transition"
                aria-label="Close"
            >
                <X size={16} />
            </button>
        </div>
    );
}