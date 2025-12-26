# HiveMind

Track and manage your investment portfolio with ease.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk
- **Payments**: Stripe
- **Styling**: Tailwind CSS + shadcn/ui
- **Development**: Docker

## Getting Started

### Prerequisites

- Node.js 18+
- Docker Desktop
- npm

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/akshith27hiremath/hivemind_app.git
cd hivemind_app
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Start PostgreSQL:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── api/            # API routes
│   └── ...             # Page components
├── components/
│   ├── ui/             # shadcn/ui components
│   └── shared/         # Shared components
├── config/             # App configuration
├── lib/                # Utility functions
└── types/              # TypeScript types
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

See `.env.example` for all required environment variables.

## License

Private
