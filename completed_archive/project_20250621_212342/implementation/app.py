
# Import necessary libraries
import numpy as np
import matplotlib.pyplot as plt

# Define function to create a golf ball graphic
def create_golfball_graphic(size: int = 100) -> np.ndarray:
    """
    Creates a small graphic of a golf ball.

    Args:
        size (int): Size of the graphic in pixels. Default is 100.

    Returns:
        numpy.ndarray: Numpy array representing the graphic.
    """

    # Initialize numpy array with zeros
    graphic = np.zeros((size, size))

    # Define center coordinates of the golf ball
    center_x = size // 2
    center_y = size // 2

    # Define radius of the golf ball
    radius = size // 4

    # Generate coordinates for the golf ball using numpy
    x, y = np.ogrid[:size, :size]

    # Calculate distance of each pixel from the center
    dist_from_center = np.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)

    # Set pixels within the radius as white
    graphic[dist_from_center <= radius] = 1

    # Add dimples to the golf ball using circles
    # Define coordinates of the dimples
    dimple_1 = (center_x - radius // 2, center_y - radius // 2)
    dimple_2 = (center_x + radius // 2, center_y - radius // 2)
    dimple_3 = (center_x, center_y + radius // 2)

    # Create circles using numpy
    circle_1 = (x - dimple_1[0]) ** 2 + (y - dimple_1[1]) ** 2 <= (radius // 6) ** 2
    circle_2 = (x - dimple_2[0]) ** 2 + (y - dimple_2[1]) ** 2 <= (radius // 6) ** 2
    circle_3 = (x - dimple_3[0]) ** 2 + (y - dimple_3[1]) ** 2 <= (radius // 6) ** 2

    # Set pixels within the circles as black
    graphic[circle_1 | circle_2 | circle_3] = 0

    return graphic

# Generate the golf ball graphic
golfball = create_golfball_graphic()

# Plot the graphic using matplotlib
plt.imshow(golfball, cmap="gray")
plt.axis("off")
plt.show()