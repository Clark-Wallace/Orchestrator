
# Import FastAPI framework
from fastapi import FastAPI

# Create an instance of the FastAPI app
app = FastAPI()

# Define endpoint for the webpage
@app.get("/")
# Add type hints for the response
async def hello_fred() -> str:
    # Return a simple string with the message
    return "Hello Fred"

# Add proper error handling
@app.exception_handler(Exception)
# Add type hints for the response
async def handle_error(request, exc) -> str:
    # Return an error message with the status code
    return {"error": str(exc), "status_code": 500}

# Add documentation for the endpoint
@app.get("/", tags=["Webpage"])
async def hello_fred() -> str:
    """
    Returns a webpage with the message 'Hello Fred'
    """
    return "Hello Fred"
