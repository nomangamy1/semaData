from flask import request, jsonify
from functools import wraps
from datetime import datetime, timedelta
import time

# In-memory rate limit storage (use Redis in production)
rate_limit_store = {}


class RateLimiter:
    """
    Rate limiting middleware for Flask
    Tracks requests by IP address or user ID
    """
    
    def __init__(self, max_requests=100, window_seconds=60):
        """
        Initialize rate limiter
        
        Args:
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    def get_client_id(self):
        """Get unique identifier for client (IP address or user ID)"""
        # Try to get user ID from JWT token first
        try:
            from flask_jwt_extended import get_jwt_identity
            return f"user_{get_jwt_identity()}"
        except:
            pass
        
        # Fall back to IP address
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        return request.remote_addr
    
    def is_allowed(self):
        """Check if request is allowed based on rate limit"""
        client_id = self.get_client_id()
        current_time = time.time()
        
        # Initialize or get client's request history
        if client_id not in rate_limit_store:
            rate_limit_store[client_id] = []
        
        requests = rate_limit_store[client_id]
        
        # Remove old requests outside the window
        requests[:] = [
            req_time for req_time in requests 
            if current_time - req_time < self.window_seconds
        ]
        
        # Check if under limit
        if len(requests) < self.max_requests:
            requests.append(current_time)
            return True, len(requests), self.max_requests
        
        return False, len(requests), self.max_requests
    
    def get_remaining(self):
        """Get remaining requests for client"""
        client_id = self.get_client_id()
        current_time = time.time()
        
        if client_id not in rate_limit_store:
            return self.max_requests
        
        requests = rate_limit_store[client_id]
        requests[:] = [
            req_time for req_time in requests 
            if current_time - req_time < self.window_seconds
        ]
        
        return max(0, self.max_requests - len(requests))


def rate_limit(max_requests=100, window_seconds=60):
    """
    Decorator for rate limiting endpoints
    
    Usage:
        @app.route('/api/endpoint')
        @rate_limit(max_requests=10, window_seconds=60)
        def endpoint():
            return "OK"
    """
    limiter = RateLimiter(max_requests, window_seconds)
    
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            is_allowed, used, total = limiter.is_allowed()
            
            if not is_allowed:
                remaining_time = int(window_seconds - (time.time() % window_seconds))
                return jsonify({
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Try again in {remaining_time} seconds.",
                    "retry_after": remaining_time
                }), 429
            
            # Call the actual endpoint
            response = f(*args, **kwargs)
            
            # Add rate limit headers to response
            if isinstance(response, tuple):
                resp, status = response[0], response[1] if len(response) > 1 else 200
                headers = {
                    'X-RateLimit-Limit': str(total),
                    'X-RateLimit-Used': str(used),
                    'X-RateLimit-Remaining': str(limiter.get_remaining()),
                    'X-RateLimit-Reset': str(int(time.time() + window_seconds))
                }
                return resp, status, headers
            else:
                return response
        
        return decorated_function
    
    return decorator


def cleanup_rate_limit_store():
    """Cleanup expired entries from rate limit store (call periodically)"""
    current_time = time.time()
    expired_clients = []
    
    for client_id, requests in rate_limit_store.items():
        requests[:] = [
            req_time for req_time in requests 
            if current_time - req_time < 3600  # Keep 1 hour of data
        ]
        
        if not requests:
            expired_clients.append(client_id)
    
    for client_id in expired_clients:
        del rate_limit_store[client_id]
