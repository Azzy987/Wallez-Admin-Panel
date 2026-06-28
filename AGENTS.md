# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server on port 8080
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Linting and Type Checking
- Always run `npm run lint` after making code changes
- No test command is configured - this project doesn't appear to have tests

## Project Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query for server state
- **Database**: Firebase Firestore + Supabase (dual setup)
- **Storage**: AWS S3 with CloudFront CDN
- **Routing**: React Router DOM

### Core Structure

#### Database Architecture
The app uses a dual database approach:
- **Firebase Firestore**: Primary database for wallpapers, categories, devices, banners
- **Supabase**: Used for S3 upload functions and edge functions

#### Key Collections (Firebase)
- `TrendingWallpapers` - Main wallpapers collection
- `Categories` - Category definitions (main/brand types)
- `Devices` - Device compatibility data per brand
- `Banners` - Banner images for wallpapers
- Brand collections (`Samsung`, etc.) - Brand-specific wallpapers

#### Key Components Structure
- `src/components/wallpaper/` - Wallpaper management components
  - `AddWallpaperForm.tsx` - Main wallpaper upload form
  - `FormComponents/` - Reusable form components
- `src/pages/` - Route pages (Index, AddWallpaper, EditWallpaper, etc.)
- `src/integrations/supabase/` - Supabase client and types
- `src/lib/firebase.ts` - Firebase configuration and helper functions

#### Image Handling
- S3 upload via Supabase Edge Functions
- Presigned URLs for secure uploads
- CloudFront CDN with image transformation pattern: `/fit-in/{w}x{h}/`
- Automatic duplicate detection by URL

### Key Business Logic

#### Category System
- Two category types: `main` (trending) and `brand` (device-specific)
- Main categories can have subcategories (predefined in `firebase.ts`)
- Brand categories are tied to device models and launch years

#### Device Management
- Samsung devices predefined with launch year mappings (2019-2025)
- Other brands store device lists in `Devices` collection
- iOS versions supported for Apple devices

#### Wallpaper Upload Flow
1. Form validation and image selection
2. S3 presigned URL generation via Supabase function
3. Direct upload to S3
4. Metadata saved to Firebase Firestore
5. Automatic thumbnail generation via CloudFront

## Important Files

### Configuration
- `vite.config.ts` - Vite configuration with path aliases (@/ -> src/)
- `tailwind.config.ts` - Tailwind CSS configuration
- `supabase/config.toml` - Supabase project configuration

### Core Logic
- `src/lib/firebase.ts` - All Firebase operations and business logic
- `supabase/functions/s3-presign-upload/index.ts` - S3 upload handling
- `src/App.tsx` - Main app structure with routing

### Environment Dependencies
The S3 upload function requires these environment variables:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY` 
- `AWS_S3_REGION`
- `AWS_S3_BUCKET`
- `CLOUDFRONT_DOMAIN`
- `IMAGE_TRANSFORM_PATTERN`

## Development Guidelines

### Code Patterns
- Use shadcn/ui components consistently
- Follow existing TypeScript patterns
- Firebase operations should go through `firebase.ts` helper functions
- Use TanStack Query for data fetching and caching

### Form Handling
- React Hook Form with Zod validation is the standard
- Form components are in `FormComponents/` directory
- Category and device selection logic is centralized

### State Management
- TanStack Query for server state
- React Context for theme management
- Local component state for UI interactions

### Error Handling
- Firebase operations include try/catch with logging
- S3 upload function has comprehensive error reporting
- Form validation provides user feedback

### Image Management
- Always check for duplicates before upload
- Use proper content-type headers for S3 uploads
- Thumbnail URLs use CloudFront transformation patterns