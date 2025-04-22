import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getChatHistory, sendMessage } from '../services/chatService';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';

interface ChatResponse {
    id: number;
    message: string;
    response: string;
    created_at: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const Chat: React.FC = () => {
    const [message, setMessage] = useState('');
    const [chats, setChats] = useState<ChatResponse[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('token');
            navigate('/login');
        }
    };

    const fetchChatsWithRetry = async (retryCount = 0) => {
        try {
            const data = await getChatHistory();
            setChats(data);
            setError('');
            setIsLoadingHistory(false);
        } catch (error) {
            if (retryCount < MAX_RETRIES) {
                setTimeout(() => {
                    fetchChatsWithRetry(retryCount + 1);
                }, RETRY_DELAY * Math.pow(2, retryCount));
            } else {
                if (error instanceof Error) {
                    setError(error.message);
                } else {
                    setError('Failed to load chat history');
                }
                setIsLoadingHistory(false);
            }
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSendMessage = useCallback(
        debounce(async (messageText: string) => {
            try {
                const newChat = await sendMessage(messageText);
                if (newChat && newChat.id) {
                    setChats(prevChats => [...prevChats, newChat]);
                    setMessage('');
                } else {
                    throw new Error('Invalid chat response received');
                }
            } catch (error) {
                if (error instanceof Error) {
                    setError(error.message);
                } else {
                    setError('An unexpected error occurred');
                }
            } finally {
                setIsLoading(false);
            }
        }, 300),
        []
    );

    const handleSendMessage = async () => {
        if (!message.trim() || isLoading) return;

        setIsLoading(true);
        setError('');
        debouncedSendMessage(message);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        fetchChatsWithRetry();
    }, [navigate]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chats]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Have a good day!</h1>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={toggleTheme}
                            className={`p-2 rounded-full transition-colors duration-300 ${
                                theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                        >
                            {theme === 'dark' ? '🌞' : '🌙'}
                        </button>
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`flex items-center space-x-2 p-2 rounded-full transition-colors duration-300 ${
                                    theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </button>
                            {isDropdownOpen && (
                                <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 ${
                                    theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                                } ring-1 ring-black ring-opacity-5`}>
                                    <button
                                        onClick={handleLogout}
                                        className={`block w-full text-left px-4 py-2 text-sm ${
                                            theme === 'dark' 
                                                ? 'text-red-400 hover:bg-gray-700' 
                                                : 'text-red-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={`rounded-lg shadow-lg overflow-hidden ${
                    theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                }`}>
                    <div 
                        ref={chatContainerRef}
                        className="h-[calc(100vh-200px)] overflow-y-auto p-4"
                    >
                        {isLoadingHistory ? (
                            <div className={`flex justify-center items-center h-full ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                            </div>
                        ) : error ? (
                            <div className={`text-center p-2 mb-4 rounded ${
                                theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
                            }`}>
                                {error}
                                <button
                                    onClick={() => fetchChatsWithRetry()}
                                    className={`ml-2 underline ${
                                        theme === 'dark' ? 'text-red-300' : 'text-red-800'
                                    }`}
                                >
                                    Retry
                                </button>
                            </div>
                        ) : (
                            chats.map((chat, index) => (
                                <div key={`chat-${chat.id || index}`} className="space-y-2 mb-4">
                                    <div className={`p-3 rounded-lg ${
                                        theme === 'dark' ? 'bg-gray-700' : 'bg-blue-100'
                                    }`}>
                                        <p className="font-semibold">You:</p>
                                        <p>{chat.message}</p>
                                    </div>
                                    <div className={`p-3 rounded-lg ${
                                        theme === 'dark' ? 'bg-gray-600' : 'bg-gray-100'
                                    }`}>
                                        <p className="font-semibold">AI:</p>
                                        <p>{chat.response}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-4 border-t border-gray-200">
                        <div className="flex space-x-4">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                className={`flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    theme === 'dark' 
                                        ? 'bg-gray-700 border-gray-600 text-white' 
                                        : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                placeholder="Type your message..."
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`px-4 py-2 rounded-lg text-white ${
                                    isLoading
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : theme === 'dark'
                                            ? 'bg-blue-600 hover:bg-blue-700'
                                            : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                            >
                                {isLoading ? (
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Sending...
                                    </div>
                                ) : 'Send'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chat; 