# AI Chat Application

A web-based chat application that integrates with OpenRouter.ai's LLM API.

## Project Structure

- `backend/`: Python FastAPI server
- `frontend/`: React TypeScript frontend

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the backend server:
   ```bash
   python main.py
   ```

The backend server will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will run on `http://localhost:3000`

## Features

- Real-time chat interface
- Integration with OpenRouter.ai's LLM API
- Modern UI using Material-UI
- TypeScript support for type safety
- Responsive design

## API Configuration

The application uses OpenRouter.ai's API. The API key is configured in the backend's `main.py` file. For production use, it's recommended to move the API key to an environment variable. 