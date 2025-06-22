# Contributing to Orchestrator

We love your input! We want to make contributing to Orchestrator as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## We Develop with Github
We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## We Use [Github Flow](https://guides.github.com/introduction/flow/index.html)
Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code follows the existing style.
6. Issue that pull request!

## Any contributions you make will be under the MIT Software License
In short, when you submit code changes, your submissions are understood to be under the same [MIT License](LICENSE) that covers the project.

## Report bugs using Github's [issues](https://github.com/yourusername/orchestrator/issues)
We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/yourusername/orchestrator/issues/new).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Code Style

### Python
- Follow PEP 8
- Use type hints where possible
- Document all functions and classes
- Keep functions focused and small

### JavaScript
- Use modern ES6+ syntax
- Follow the existing code style
- Comment complex logic
- Use meaningful variable names

## Setting Up Development Environment

1. Clone the repository
2. Create a virtual environment: `python -m venv venv`
3. Activate it: `source venv/bin/activate` (Unix) or `venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Copy `.env.example` to `.env` and add your API keys
6. Run `./setup.sh` to complete setup

## Running Tests

```bash
# Run all tests
python -m pytest

# Run with coverage
python -m pytest --cov=.

# Run specific test file
python -m pytest tests/test_orchestrator_core.py
```

## Adding New Agents

1. Create a new connector class in `agent_bridge.py` inheriting from `AgentConnector`
2. Add the agent type to `AgentType` enum in `orchestrator_core.py`
3. Register the agent in `_initialize_connectors()` in `agent_bridge.py`
4. Update documentation in `docs/AGENT_INTEGRATION.md`
5. Add tests for the new agent

## License
By contributing, you agree that your contributions will be licensed under its MIT License.