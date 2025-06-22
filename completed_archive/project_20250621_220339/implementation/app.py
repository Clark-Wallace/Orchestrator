
# Import necessary packages
from fastapi import FastAPI, Request, Form, Depends, BackgroundTasks
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

# Create app instance
app = FastAPI()

# Instantiate Jinja2 templates
templates = Jinja2Templates(directory="templates")

# Create data model for perfume
class Perfume(BaseModel):
    name: str
    brand: str
    fragrance_notes: str
    description: str
    price: float

# Create a list to store all perfumes
perfumes = []

# Define route for landing page
@app.get("/")
def landing_page(request: Request):
    # Render the landing page template
    return templates.TemplateResponse("landing_page.html", {"request": request})

# Define route for creating a new perfume
@app.post("/perfumes/")
def create_perfume(
    request: Request,
    name: str = Form(...),
    brand: str = Form(...),
    fragrance_notes: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    background_tasks: BackgroundTasks,
):
    # Create a new instance of the Perfume model
    new_perfume = Perfume(
        name=name,
        brand=brand,
        fragrance_notes=fragrance_notes,
        description=description,
        price=price,
    )
    # Add the new perfume to the list
    perfumes.append(new_perfume)
    # Add a task to run in the background to save the new perfume to a database
    background_tasks.add_task(save_perfume, new_perfume)
    # Redirect to the landing page
    return templates.TemplateResponse("landing_page.html", {"request": request})

# Define route for getting all perfumes
@app.get("/perfumes/", response_model=list[Perfume])
def get_all_perfumes():
    # Return the list of perfumes
    return perfumes

# Define function to save the perfume to a database
def save_perfume(perfume: Perfume):
    # Code to save the perfume to a database would go here
    pass