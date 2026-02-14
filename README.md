# KRAG - Serverless RAG Agent

<div align="center">

**"The wolf that lurks in the shadows sees everything, yet remains unseen"**

World's First Serverless RAG Agent

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

</div>

---

## 📑 Table of Contents

- [Introduction](#-introduction)
- [Features](#-features)
- [Architecture](#-architecture)
- [Setup & Installation](#-setup--installation)
- [Development](#-development)
- [Deployment](#-deployment)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Introduction

KRAG is a production-ready, serverless Retrieval-Augmented Generation (RAG) platform that enables users to build intelligent knowledge bases from PDF documents and web URLs. The system provides secure, encrypted document processing with real-time chat capabilities powered by advanced AI.

### Key Highlights

- **Serverless Architecture**: Built on Modal for scalable, cost-effective processing
- **Multi-Format Support**: Process PDFs and web URLs seamlessly
- **Enterprise Security**: Multiple encryption levels (None, Simple, Advanced)
- **Real-time Processing**: Live status updates during document ingestion
- **Intelligent Chat**: Context-aware conversations with citation support
- **Modern Stack**: Next.js 16, tRPC, Prisma, Python workers

---

## ✨ Features

### Core Functionality

- **📚 Notebook Management**
  - Create, organize, and manage multiple knowledge bases
  - Custom descriptions and metadata
  - Per-notebook encryption settings

- **📄 Document Processing**
  - PDF file upload and parsing
  - Web URL ingestion with content extraction
  - Automatic chunking and embedding generation
  - Image extraction from documents
  - Real-time processing status updates

- **💬 Intelligent Chat Interface**
  - Context-aware conversations based on uploaded documents
  - Streaming responses with Server-Sent Events (SSE)
  - Citation tracking and source references
  - Message history and conversation context

- **🔒 Security & Encryption**
  - Three encryption levels: NotEncrypted, SimpleEncryption, AdvancedEncryption
  - User-configurable encryption settings
  - Encrypted data deletion capabilities
  - Secure key management

- **👤 User Management**
  - Email/password authentication via Better Auth
  - Session management
  - User statistics and analytics
  - Account management

- **🎨 Modern UI/UX**
  - Responsive design with Tailwind CSS
  - Resizable panels for optimal workspace
  - Real-time status indicators
  - Drag-and-drop file uploads
  - Beautiful landing page

---

## 🏗️ Architecture

### Monorepo Structure

KRAG uses a Turborepo monorepo with the following structure:

```
krag/
├── apps/
│   ├── web/                          # Next.js web application
│   │   ├── app/                      # Next.js app directory
│   │   │   ├── (public)/             # Public routes (landing, auth)
│   │   │   ├── (protected)/          # Protected routes (notebooks, settings)
│   │   │   └── api/                  # API routes (auth, tRPC)
│   │   ├── components/               # React components
│   │   ├── lib/                      # Utility libraries
│   │   └── server/                   # Server-side code (tRPC routers)
│   ├── ingestion-worker/            # Python worker for document processing
│   │   ├── lib/                      # Core processing libraries
│   │   │   ├── pdf_parser.py         # PDF parsing logic
│   │   │   ├── website_parser.py     # URL content extraction
│   │   │   ├── chunker.py            # Document chunking
│   │   │   └── save_to_db.py         # Database operations
│   │   ├── schemas/                  # Data schemas
│   │   └── utils/                    # Utility functions
│   └── retrieval-worker/            # Python worker for RAG queries
│       ├── src/                      # Main application
│       ├── lib/                      # Core retrieval logic
│       │   ├── process_request.py    # Request processing
│       │   └── llm_client.py         # LLM integration
│       ├── schemas/                  # Data schemas
│       └── utils/                    # Utility functions
├── packages/
│   ├── database/                     # Prisma schema and database client
│   │   ├── prisma/                   # Prisma schema and migrations
│   │   └── src/                      # Database client exports
│   ├── ui/                           # Shared React components
│   ├── modal_services/               # Modal serverless functions
│   ├── eslint-config/                # Shared ESLint configuration
│   ├── typescript-config/            # Shared TypeScript configuration
│   └── tailwind-config/              # Shared Tailwind CSS configuration
├── docker-compose.yml                # Local development services
├── turbo.json                        # Turborepo configuration
└── pyproject.toml                    # Python workspace configuration
```

### Technology Stack

**Frontend:**

- Next.js 16 (App Router)
- React 19
- TypeScript 5.9
- Tailwind CSS 4
- tRPC for type-safe APIs
- Radix UI components
- Better Auth for authentication

**Backend:**

- Python 3.12+ workers
- FastAPI for retrieval worker
- Modal for serverless functions
- Redis for task queues
- PostgreSQL (Supabase) for data storage

**Infrastructure:**

- Docker & Docker Compose for local development
- Turborepo for monorepo management
- Prisma for database ORM
- UV for Python package management

### Data Flow

1. **Document Ingestion:**
   - User uploads PDF/URL via web app
   - File queued in Redis
   - Ingestion worker processes document
   - Content chunked and embedded
   - Stored in PostgreSQL with vector embeddings

2. **Query Processing:**
   - User sends query via chat interface
   - Retrieval worker processes request
   - Vector similarity search on embeddings
   - Context retrieved and sent to LLM
   - Streaming response delivered to user

---

## 🛠️ Setup & Installation

### Prerequisites

- **Node.js** >= 18
- **Python** >= 3.12
- **Docker** and **Docker Compose** (for local services)
- **UV** (Python package manager)
- **npm** 11.5.1+

### Quick Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd krag
   ```

2. **Copy environment file and add Modal keys:**

   ```bash
   cp .env.example .env
   # Edit .env and add your MODAL_TOKEN_ID and MODAL_TOKEN_SECRET
   ```

3. **Start Docker services:**

   ```bash
   docker-compose up -d
   ```

4. **Run repository setup:**
   ```bash
   npm run repo:setup
   ```

That's it! The setup script will:

- Install all Node.js and Python dependencies
- Deploy database migrations
- Deploy Modal services

### Access the Application

Once setup is complete, start the development servers:

```bash
npm run dev
```

Access the application at `http://localhost:3001`

### Environment Variables

The `.env.example` file contains all required environment variables. After copying it to `.env`, you only need to add your Modal credentials:

- `MODAL_TOKEN_ID` - Your Modal token ID
- `MODAL_TOKEN_SECRET` - Your Modal token secret

All other variables are pre-configured for local development.

---

## 💻 Development

### Available Scripts

**Root level:**

- `npm run dev` - Start all apps in development mode
- `npm run build` - Build all apps and packages
- `npm run lint` - Lint all packages
- `npm run check-types` - Type check all packages
- `npm run format` - Format code with Prettier
- `npm run repo:setup` - Complete repository setup

**Web app:**

- `npm run dev` - Start Next.js dev server (port 3001)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run check-types` - Type check

### Database Management

```bash
# Generate Prisma client
npx turbo db:generate

# Run migrations
npx turbo db:migrate

# Deploy schema changes
npx turbo db:deploy
```

### Code Quality

- **Linting**: ESLint with shared configs
- **Formatting**: Prettier with Tailwind plugin
- **Type Checking**: TypeScript strict mode
- **Python**: Black and Ruff for formatting and linting

### Git Hooks

Husky is configured with pre-commit hooks for:

- Linting staged files
- Type checking
- Code formatting

---

## 🚢 Deployment

### Docker Deployment

The project includes Docker Compose configuration for production deployment:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services

- **Web App**: Next.js application (port 3001)
- **Ingestion Worker**: 3 replicas for document processing
- **Retrieval Worker**: FastAPI service for RAG queries
- **PostgreSQL**: Supabase database
- **Redis**: Task queue and caching

### Environment-Specific Configuration

Update environment variables in `docker-compose.yml` or use `.env` file for:

- Production database URLs
- API keys and secrets
- Service endpoints
- Encryption keys

### Modal Deployment

Modal services are deployed separately:

```bash
cd packages/modal_services
modal deploy modal_services/modal_service.py
```

---

## ⚙️ Configuration

### Encryption Levels

Users can configure encryption at three levels:

1. **NotEncrypted**: No encryption applied
2. **SimpleEncryption**: Basic encryption for sensitive data
3. **AdvancedEncryption**: Full encryption with advanced algorithms

Configure via Settings page in the web application.

### File Processing Status

Documents go through the following states:

- `uploading` - File being uploaded
- `queued` - Waiting for processing
- `processing` - Currently being processed
- `starting` - Initialization phase
- `extracting` - Content extraction
- `images` - Image processing
- `chunking` - Document chunking
- `completed` - Successfully processed
- `failed` - Processing failed

### Worker Configuration

**Ingestion Worker:**

- Processes PDF and URL documents
- Generates embeddings using vector models
- Stores chunks in PostgreSQL with vector support

**Retrieval Worker:**

- Handles chat queries
- Performs vector similarity search
- Streams responses via SSE

---

## 📡 API Documentation

### tRPC Routers

The application uses tRPC for type-safe API communication:

#### Notebook Router

- `createNotebook` - Create a new notebook
- `getNotebooks` - List user's notebooks
- `getNotebook` - Get notebook details
- `deleteNotebook` - Delete a notebook

#### Sources Router

- `uploadFile` - Upload PDF file
- `getSources` - List sources in a notebook
- `getSource` - Get source details
- `pollSourceStatus` - Poll processing status
- `deleteSource` - Delete a source

#### Messages Router

- `createMessage` - Send a chat message
- `getMessages` - Retrieve conversation history

#### User Router

- `getStats` - Get user statistics
- `handleEncryption` - Update encryption settings
- `deleteAllData` - Delete all user data
- `deleteAllEncryptedData` - Delete encrypted data only

### REST Endpoints

**Retrieval Worker (FastAPI):**

- `POST /chat` - Process chat query (SSE streaming)
- `GET /search` - Health check endpoint

**Authentication:**

- Handled by Better Auth at `/api/auth/*`

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the code style:
   - TypeScript/JavaScript: ESLint + Prettier
   - Python: Black + Ruff
4. **Run tests and linting**: `npm run lint && npm run check-types`
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Code Style

- Follow existing code patterns
- Write clear, descriptive commit messages
- Add comments for complex logic
- Update documentation as needed

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

This project uses several open-source libraries. Key dependencies include:

- **Next.js**: MIT License
- **React**: MIT License
- **Prisma**: Apache 2.0 License
- **tRPC**: MIT License
- **Better Auth**: MIT License
- **Modal**: Proprietary (see Modal's terms)
- **Supabase**: Apache 2.0 License

Please review individual package licenses in `node_modules` and Python packages for complete licensing information.

---

## 📞 Support

For issues, questions, or contributions:

- Open an issue on GitHub
- Check existing documentation
- Review code comments and inline docs

---

## 🙏 Acknowledgments

- Built with [Turborepo](https://turbo.build/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- Serverless functions powered by [Modal](https://modal.com/)
- Database by [Supabase](https://supabase.com/)

---

<div align="center">

**Made with ❤️ by the KRAG team**

_Silent as a wolf, secure as a fortress_

</div>
