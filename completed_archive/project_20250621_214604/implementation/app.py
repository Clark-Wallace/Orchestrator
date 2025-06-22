
# Import necessary library
import matplotlib.pyplot as plt

# Create a function to generate the apple graphic
def make_apple_graphic():
    """
    Function to create a graphic of an apple using matplotlib library.
    Returns a matplotlib figure object.
    """
    
    # Define the data points for the apple shape
    x = [0, 0.3, 0.6, 0.8, 1, 1.2, 1.4, 1.5, 1.4, 1.2, 1, 0.8, 0.6, 0.3, 0]
    y = [0, 0.4, 0.5, 0.7, 0.9, 1.1, 1.3, 1.7, 2.1, 2.3, 2.5, 2.7, 2.8, 3, 3]

    # Create a figure object
    fig = plt.figure()

    # Add axes to the figure
    ax = fig.add_axes([0, 0, 1, 1])

    # Plot the apple shape using the data points
    ax.plot(x, y, color='red', linewidth=3)

    # Add a stem to the apple
    ax.plot([0.75, 0.75], [0, 0.3], color='green', linewidth=3)

    # Add a leaf to the stem
    ax.plot([0.75, 0.9], [0.3, 0.4], color='green', linewidth=3)

    # Add a title to the figure
    ax.set_title('Apple Graphic', fontsize=14)

    # Set limits for the axes to show only the apple shape
    ax.set_xlim([-0.5, 2])
    ax.set_ylim([-0.5, 3])

    # Remove the axes ticks and labels
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_xticklabels([])
    ax.set_yticklabels([])

    # Show the figure
    plt.show()

    # Return the figure object
    return fig

# Call the function to generate the apple graphic
apple_graphic = make_apple_graphic()

# Save the figure as a png image
apple_graphic.savefig('apple_graphic.png')

# Print success message
print('Apple graphic successfully generated and saved as apple_graphic.png')