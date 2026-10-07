# Embras Iluminação — Web Platform

Client-facing web platform for **Embras Iluminação**, built with Next.js and React.

The project combines institutional content, product presentation, catalog experiences and editorial/blog capabilities in a modern web application focused on performance, visual quality and maintainability.

## Overview

This repository contains the application used to power the Embras Iluminação digital experience, including:

- Institutional and brand pages
- Product and catalog experiences
- Editorial/blog content
- Responsive user interfaces
- Interactive product experiences
- 3D product visualization
- Form-driven interactions
- Server-side integrations and data access
- AI-assisted content and application capabilities

## Technology Stack

**Frontend**
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Radix UI
- Lucide React
- GSAP
- Lenis

**Data & Integrations**
- Supabase
- AWS S3 / S3-compatible storage
- Google Generative AI
- OpenAI
- Groq
- Gradio

**Product & Content**
- `@google/model-viewer` for 3D product visualization
- TipTap for rich-text editing
- React Hook Form + Zod for typed form validation
- RSS parsing for content integrations

**Testing & Tooling**
- Playwright
- ESLint
- TypeScript
- Next.js App Router

## Engineering Focus

The project is structured as a production-oriented web application rather than a static landing page, with emphasis on:

- Component-based React architecture
- Type-safe application development
- Server/client separation in Next.js
- Reusable UI primitives
- Data and storage integrations
- Interactive product experiences
- Performance-conscious animation and rendering
- Validation and maintainable application flows

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

## Production

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Environment Variables

Environment-specific configuration should be provided through local or deployment environment variables.

Do not commit credentials, API keys, private tokens or production secrets to the repository.

## Repository Notes

This repository represents a real client-facing product and is maintained as part of a professional web development workflow.

Some implementation details and internal tooling are intentionally excluded from the public repository.

---

Built with **Next.js · React · TypeScript**