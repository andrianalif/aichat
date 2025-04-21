import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export interface ChatMessage {
    message: string;
}

export interface ChatResponse {
    id: number;
    message: string;
    response: string;
    created_at: string;
}

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('No authentication token found');
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

export const getChatHistory = async (): Promise<ChatResponse[]> => {
    try {
        const response = await axios.get(
            `${API_URL}/chats`,
            {
                headers: getAuthHeader()
            }
        );
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        throw error;
    }
};

export const sendMessage = async (message: string): Promise<ChatResponse> => {
    try {
        const response = await axios.post(
            `${API_URL}/chat`,
            { message },
            {
                headers: getAuthHeader()
            }
        );
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        throw error;
    }
}; 