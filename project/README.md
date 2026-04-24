# Doooda Frontend

This is the frontend application for Doooda - Your Writing Companion.

## Features

- Modern React + TypeScript + Vite setup
- Beautiful UI with TailwindCSS
- RTL/LTR support for Arabic and English
- Authentication (Login/SignUp)
- Writer Dashboard
- Project Management
- Chapter & Scene Organization
- Professional, calm design

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend API running on http://localhost:4000

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

The application will open at http://localhost:3000

### Build

```bash
# Build for production
npm run build
```

### Preview Production Build

```bash
# Preview the production build locally
npm run preview
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   └── ProtectedRoute.tsx
├── contexts/        # React contexts
│   └── AuthContext.tsx
├── pages/           # Page components
│   ├── Welcome.tsx
│   ├── Login.tsx
│   ├── SignUp.tsx
│   ├── Dashboard.tsx
│   └── ProjectWorkspace.tsx
├── services/        # API client
│   └── api.ts
├── types/           # TypeScript types
│   └── index.ts
├── App.tsx          # Main app with routing
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:4000/api
```

## Available Routes

- `/` - Welcome page
- `/login` - Login page
- `/signup` - Sign up page
- `/dashboard` - Writer dashboard (protected)
- `/projects/:id` - Project workspace (protected)

## Technologies

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router** - Routing

## Design System

### Colors

- Primary: `#2c5f7c` (Doooda blue)
- Secondary: `#4a9eba` (Light blue)
- Accent: `#f59e0b` (Amber)
- Background: `#e8f4f8` (Calm blue)

### Typography

- English: Inter
- Arabic: Noto Sans Arabic

## Next Steps

1. Complete the onboarding flow
2. Add Ask Doooda AI assistant interface
3. Implement rich text editor for chapters
4. Add progress tracking visualizations
5. Build admin panel
6. Add export functionality

## Documentation

For complete UX specifications and implementation guide, see:
- `../FRONTEND_COMPLETE_UX_GUIDE.md` - Full UX specifications
- `../FRONTEND_IMPLEMENTATION_ROADMAP.md` - Implementation roadmap
