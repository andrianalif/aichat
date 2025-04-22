import axios from 'axios';

const API_URL = 'http://localhost:8000/api/auth';

export const register = async (username: string, email: string, password: string) => {
    try {
        const response = await axios.post(`${API_URL}/register`, {
            username,
            email,
            password
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
};

export const login = async (username: string, password: string) => {
    try {
        const response = await axios.post(
            `${API_URL}/login`,
            `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        if (response.data.access_token) {
            localStorage.setItem('token', response.data.access_token);
        }
        return response.data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

export const logout = () => {
    localStorage.removeItem('token');
}; 