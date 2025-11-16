import { useEffect, useState } from "react";

export default function CustomSignup() {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [apiStatus, setApiStatus] = useState({ connected: false, testing: false });

    const API_BASE_URL = "http://localhost:5000";

    useEffect(() => {
        checkApiConnection();
    }, []);

    const checkApiConnection = async () => {
        setApiStatus(prev => ({ ...prev, testing: true }));
        try {
            const response = await fetch(`${API_BASE_URL}/`);
            if (response.ok) {
                setApiStatus({ connected: true, testing: false });
            } else {
                setApiStatus({ connected: false, testing: false });
            }
        } catch (error) {
            setApiStatus({ connected: false, testing: false });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ""
            }));
        }

        if (serverError) {
            setServerError("");
        }
    };

    const validateEmail = (email) => {
        const trimmedEmail = email.trim().toLowerCase();
        const validDomain = '@gmail.com';

        if (!trimmedEmail.endsWith(validDomain)) {
            return { valid: false, message: 'Email must end with @gmail.com' };
        }

        const username = trimmedEmail.split('@')[0];
        if (!username.startsWith('pavan')) {
            return { valid: false, message: 'Email must start with letter "pavan"' };
        }

        return { valid: true, normalizedEmail: trimmedEmail };
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.email) {
            newErrors.email = "Email is required";
        } else {
            const validation = validateEmail(formData.email);
            if (!validation.valid) {
                newErrors.email = validation.message;
            }
        }

        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = "Please confirm your password";
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        if (!apiStatus.connected) {
            setServerError("API server is not connected. Please check if the backend server is running.");
            return;
        }

        setIsSubmitting(true);
        setServerError("");
        setSuccessMessage("");

        try {
            const validation = validateEmail(formData.email);
            if (!validation.valid) {
                setServerError(validation.message);
                setIsSubmitting(false);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/user/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: validation.normalizedEmail,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // ✅ Don’t auto-login or save token here
                setSuccessMessage("🎉 Account created successfully! Please sign in to continue.");

                // Clear form
                setFormData({
                    email: "",
                    password: "",
                    confirmPassword: ""
                });

                // Redirect to signin after short delay
                setTimeout(() => {
                    window.location.href = "/signin";
                }, 2000);
            } else {
                setServerError(data.msg || 'Signup failed. Please try again.');
            }

        } catch (error) {
            console.error("💥 Signup error:", error);

            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                setServerError("Unable to connect to the custom API server. Please ensure the backend is running on " + API_BASE_URL);
            } else {
                setServerError("An error occurred during signup. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h1 className="text-center text-3xl font-extrabold text-gray-900">🎓 CampusHub</h1>
                <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">Create your account</h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <a href="/signin" className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                        Sign in
                    </a>
                </p>

                {/* API Status Indicator */}
                <div className="mt-3 text-center">
                    {apiStatus.testing ? (
                        <p className="text-xs text-yellow-600">🔄 Checking API connection...</p>
                    ) : apiStatus.connected ? (
                        <p className="text-xs text-green-600">✅ Custom API Connected - Ready for Database Storage</p>
                    ) : (
                        <p className="text-xs text-red-600">❌ API Not Connected - Please start backend server</p>
                    )}
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {serverError && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                            <p className="text-sm">{serverError}</p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                            <p className="text-sm font-medium">{successMessage}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email address *
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`appearance-none block w-full px-3 py-2 border ${
                                    errors.email ? "border-red-300" : "border-gray-300"
                                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                                placeholder="pavan@gmail.com"
                            />
                            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password *
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={`appearance-none block w-full px-3 py-2 border ${
                                        errors.password ? "border-red-300" : "border-gray-300"
                                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? "🙈" : "👁️"}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Confirm Password *
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={`appearance-none block w-full px-3 py-2 border ${
                                    errors.confirmPassword ? "border-red-300" : "border-gray-300"
                                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                                placeholder="••••••••"
                            />
                            {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !apiStatus.connected}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Creating account..." : "🚀 Create Account"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
