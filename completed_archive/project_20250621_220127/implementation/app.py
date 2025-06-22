
# Import necessary libraries
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Initialize FastAPI application
app = FastAPI()

# Configure CORS for cross-origin requests
origins = [
    "http://localhost",
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define base model for user
class User(BaseModel):
    username: str
    password: str
    email: str
    is_active: bool = True
    is_superuser: bool = False

# Create a list to store users
users = []

# Define route to create new user
@app.post("/users/", response_model=User)
def create_user(user: User):
    # Check if username or email already exists
    for existing_user in users:
        if existing_user.username == user.username or existing_user.email == user.email:
            raise HTTPException(status_code=400, detail="Username or email already exists.")

    # Add user to list and return created user
    users.append(user)
    return user

# Define route to retrieve all users
@app.get("/users/", response_model=List[User])
def get_users():
    return users

# Define route to retrieve specific user
@app.get("/users/{username}", response_model=User)
def get_user(username: str):
    # Check if user exists
    for user in users:
        if user.username == username:
            return user

    # If user does not exist, raise HTTP exception
    raise HTTPException(status_code=404, detail="User not found.")

# Define route to update user information
@app.put("/users/{username}", response_model=User)
def update_user(username: str, updated_user: User):
    # Check if user exists
    for user in users:
        if user.username == username:
            # Update user information
            user.username = updated_user.username
            user.password = updated_user.password
            user.email = updated_user.email
            user.is_active = updated_user.is_active
            user.is_superuser = updated_user.is_superuser

            return user

    # If user does not exist, raise HTTP exception
    raise HTTPException(status_code=404, detail="User not found.")

# Define route to delete user
@app.delete("/users/{username}")
def delete_user(username: str):
    # Check if user exists
    for user in users:
        if user.username == username:
            # Delete user from list
            users.remove(user)

            return {"message": "User deleted."}

    # If user does not exist, raise HTTP exception
    raise HTTPException(status_code=404, detail="User not found.")

# Define route for real-time feature
@app.get("/real-time/")
def get_real_time():
    # Get current date and time
    now = datetime.now()

    # Return current date and time in real-time
    return {"real_time": now}

# Define custom error handling for 404 errors
@app.exception_handler(404)
async def not_found(request, exc):
    return JSONResponse(
        status_code=404,
        content={"message": "Not Found"}
    )

# Define custom error handling for 500 errors
@app.exception_handler(500)
async def internal_server_error(request, exc):
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error"}
    )

# Add documentation to routes
@app.get("/", tags=["documentation"])
async def documentation():
    return {"message": "This is the documentation for the API."}

# Add documentation to get users route
@app.get("/users/", tags=["documentation"])
def get_users_documentation():
    return {"message": "Returns a list of all users."}

# Add documentation to create user route
@app.post("/users/", tags=["documentation"])
def create_user_documentation(user: User):
    return {"message": "Creates a new user."}

# Add documentation to get user route
@app.get("/users/{username}", tags=["documentation"])
def get_user_documentation(username: str):
    return {"message": "Returns information about a specific user."}

# Add documentation to update user route
@app.put("/users/{username}", tags=["documentation"])
def update_user_documentation(username: str, updated_user: User):
    return {"message": "Updates information about a specific user."}

# Add documentation to delete user route
@app.delete("/users/{username}", tags=["documentation"])
def delete_user_documentation(username: str):
    return {"message": "Deletes a specific user."}

# Add documentation to real-time feature route
@app.get("/real-time