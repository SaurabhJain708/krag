# Code Formatting Setup

This project uses both Prettier (for JavaScript/TypeScript) and Black (for Python) to ensure consistent code formatting.

## JavaScript/TypeScript Formatting

- **Tool**: Prettier
- **Config**: `.prettierrc.json`
- **Ignore**: `.prettierignore`
- **Command**: `npm run format`

Prettier automatically formats:

- TypeScript/JavaScript files (`.ts`, `.tsx`, `.js`, `.jsx`)
- Markdown, JSON, CSS files
- Automatically sorts Tailwind CSS classes

## Python Formatting

- **Tool**: Black
- **Config**: `pyproject.toml` (under `[tool.black]`)
- **Linter**: Ruff (configured in `pyproject.toml`)
- **Command**: `black .` (or `ruff check .` for linting)

Black automatically formats:

- Python files (`.py`, `.pyi`)
- Line length: 88 characters
- Target Python versions: 3.11+

## Pre-commit Hooks

Both formatters run automatically on commit via Husky:

- Prettier formats JS/TS files
- Black formats Python files
- ESLint fixes JS/TS issues
- Ruff checks Python code

## Setup

### JavaScript/TypeScript

Already configured via npm dependencies.

### Python

Install Black and Ruff:

```bash
pip install black ruff
# or
pip install -r requirements-dev.txt
```

## Manual Formatting

Format all files:

```bash
# JavaScript/TypeScript
npm run format

# Python
black .
```

## Notes

- Prettier ignores Python files (configured in `.prettierignore`)
- Black only formats Python files
- Both tools use consistent line lengths (80 for Prettier, 88 for Black)
- Pre-commit hooks ensure all code is formatted before commit
