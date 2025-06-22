
# Import necessary libraries
from fastapi import FastAPI
from typing import Optional
from pydantic import BaseModel

# Create FastAPI app
app = FastAPI()

# Define data model for plane
class Plane(BaseModel):
    name: str
    model: str
    color: Optional[str]
    passenger_capacity: int

# Create endpoint for building a plane
@app.post("/build-plane")
async def build_plane(plane: Plane):
    """
    Endpoint for building a new plane with provided information.
    :param plane: Plane object containing name, model, color and passenger capacity.
    :return: A json response with the plane information.
    """
    # Validate input data
    if not plane.name:
        return {"error": "Plane name is required."}
    if not plane.model:
        return {"error": "Plane model is required."}
    if not plane.passenger_capacity:
        return {"error": "Passenger capacity is required."}

    # Build the plane
    new_plane = {
        "name": plane.name,
        "model": plane.model,
        "color": plane.color or "None",
        "passenger_capacity": plane.passenger_capacity
    }

    # Return success message with plane information
    return {"message": "Plane successfully built!", "plane_info": new_plane}

# Run the app
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Sample request body
{
    "name": "Boeing 747",
    "model": "747-8",
    "color": "white",
    "passenger_capacity": 467
}

# Sample response
{
    "message": "Plane successfully built!",
    "plane_info": {
        "name": "Boeing 747",
        "model": "747-8",
        "color": "white",
        "passenger_capacity": 467
    }
}