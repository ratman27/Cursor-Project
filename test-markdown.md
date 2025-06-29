# User Authentication System

This system handles user authentication and authorization.

- User login with email and password
- Password validation and encryption
- Session management
- Role-based access control
- Password reset functionality

## Database Schema

The database stores user information and session data.

- Users table with email, password hash, and role
- Sessions table for active user sessions
- Password reset tokens for recovery

## API Endpoints

The authentication API provides several endpoints.

- POST /auth/login - User login
- POST /auth/logout - User logout
- POST /auth/register - User registration
- POST /auth/reset-password - Password reset request 