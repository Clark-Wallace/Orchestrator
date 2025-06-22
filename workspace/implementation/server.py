
# Import necessary modules
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

# Create app instance
app = FastAPI()

# Define Todo model
class Todo(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    completed: bool = False

# Create a list to store Todos
todos = []

# API endpoint for creating a Todo
@app.post("/todos/", response_model=Todo, status_code=201)
def create_todo(todo: Todo):
    """
    Creates a new Todo and adds it to the list.
    """
    todo.id = len(todos) + 1 # assign a unique id
    todos.append(todo)
    return todo

# API endpoint for getting all Todos
@app.get("/todos/", response_model=list[Todo])
def get_todos():
    """
    Returns a list of all Todos.
    """
    return todos

# API endpoint for getting a specific Todo
@app.get("/todos/{todo_id}", response_model=Todo)
def get_todo(todo_id: int):
    """
    Returns a specific Todo based on id.
    """
    for todo in todos:
        if todo.id == todo_id:
            return todo
    # if no Todo with given id is found, raise an exception
    raise HTTPException(status_code=404, detail="Todo not found")

# API endpoint for updating a Todo
@app.put("/todos/{todo_id}", response_model=Todo)
def update_todo(todo_id: int, todo: Todo):
    """
    Updates a specific Todo based on id.
    """
    for index, existing_todo in enumerate(todos):
        if existing_todo.id == todo_id:
            todos[index] = todo # update existing Todo
            return todo
    # if no Todo with given id is found, raise an exception
    raise HTTPException(status_code=404, detail="Todo not found")

# API endpoint for deleting a Todo
@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: int):
    """
    Deletes a specific Todo based on id.
    """
    for index, existing_todo in enumerate(todos):
        if existing_todo.id == todo_id:
            del todos[index] # delete existing Todo
            return {"message": "Todo deleted successfully"}
    # if no Todo with given id is found, raise an exception
    raise HTTPException(status_code=404, detail="Todo not found")

# Optional: API endpoint for searching Todos by title
@app.get("/todos/search", response_model=list[Todo])
def search_todos_by_title(title: str):
    """
    Returns a list of Todos matching the given title.
    """
    matching_todos = []
    for todo in todos:
        if todo.title.lower() == title.lower():
            matching_todos.append(todo)
    return matching_todos

# Optional: API endpoint for marking a Todo as completed
@app.put("/todos/{todo_id}/complete", response_model=Todo)
def complete_todo(todo_id: int):
    """
    Marks a specific Todo as completed.
    """
    for index, existing_todo in enumerate(todos):
        if existing_todo.id == todo_id:
            existing_todo.completed = True # mark Todo as completed
            return existing_todo
    # if no Todo with given id is found, raise an exception
    raise HTTPException(status_code=404, detail="Todo not found")

# Optional: API endpoint for marking a Todo as incomplete
@app.put("/todos/{todo_id}/incomplete", response_model=Todo)
def incomplete_todo(todo_id: int):
    """
    Marks a specific Todo as incomplete.
    """
    for index, existing_todo in enumerate(todos):
        if existing_todo.id == todo_id:
            existing_todo.completed = False # mark Todo as incomplete
            return existing_todo
    # if no Todo with given id is found, raise an exception
    raise HTTPException(status_code=404, detail="Todo not found")