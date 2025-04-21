import React from 'react';

const ChatBubble = ({ message, isUser }) => {
  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}
      style={{ animation: 'fadeIn 0.3s ease-in-out' }}
    >
      <div
        className={`relative max-w-[70%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-none'
            : 'bg-gray-100 text-gray-800 rounded-bl-none'
        } shadow-lg transform transition-all duration-300 hover:scale-105`}
      >
        <div className="text-sm whitespace-pre-wrap">{message}</div>
        {!isUser && (
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-100 transform rotate-45"></div>
        )}
        {isUser && (
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-indigo-600 transform rotate-45"></div>
        )}
      </div>
    </div>
  );
};

export default ChatBubble; 