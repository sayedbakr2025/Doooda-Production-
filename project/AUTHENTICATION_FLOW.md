# Writer Authentication & Onboarding Flow

## Overview
Complete rebuild of the authentication and onboarding flow with proper language support, email verification, and comprehensive user data collection.

## Signup Flow

### Required Fields
The signup form now collects all required information:

1. **First Name** - User's legal first name
2. **Last Name** - User's legal last name
3. **Pen Name** - Author's publishing name (required)
4. **Preferred Writing Language** - Arabic or English (mandatory dropdown)
5. **Email** - User's email address
6. **Password** - Minimum 8 characters
7. **Confirm Password** - Must match password

### Language Selection
- **Mandatory field** - Cannot be skipped
- **Controls entire UI** - Selected during signup
- **Persists across sessions** - Stored in:
  - User metadata in Supabase
  - Browser localStorage as `doooda_language`
  - Applied to HTML document (`lang` and `dir` attributes)

### Email Verification Flow
1. User submits signup form with all required fields
2. Supabase sends verification email automatically
3. User sees verification screen with:
   - Success message in selected language
   - User's email address displayed
   - Button to check email (opens Gmail)
   - Link back to login page
4. After clicking verification link in email:
   - User is redirected to dashboard
   - Session is automatically created

### Data Storage
All user information is stored in Supabase user metadata:
```javascript
{
  first_name: string,
  last_name: string,
  pen_name: string,
  preferred_language: 'ar' | 'en'
}
```

## Login Flow
- Email and password authentication
- Language-aware interface
- Loads user's preferred language from metadata
- Applies RTL for Arabic automatically
- Error messages translated to user's language

## Language System

### Language Context
- Global language state managed via React Context
- Persists selection in localStorage
- Automatically applies to entire application
- Controls RTL/LTR direction

### Language Selector
- Fixed position in top-right corner
- Visible on public pages (Welcome, Login, Signup)
- Two-button toggle: English | العربية
- Instant UI updates on selection

### Translation System
- Centralized translations in `src/utils/translations.ts`
- Simple `t(key, language)` function for translations
- Error message translation with `translateError()`
- Covers all UI text:
  - Form labels and placeholders
  - Button text
  - Error messages
  - Success messages
  - Welcome page content

### RTL Support
- Automatic direction change via `document.dir`
- Arabic font (Noto Sans Arabic) preloaded
- Form layouts adjust automatically
- Proper text alignment for both directions

## Files Changed

### New Files
1. `src/contexts/LanguageContext.tsx` - Language state management
2. `src/utils/translations.ts` - Translation dictionary and utilities
3. `src/components/LanguageSelector.tsx` - Language toggle component

### Modified Files
1. `src/pages/SignUp.tsx` - Complete rebuild with all required fields
2. `src/pages/Login.tsx` - Added language support
3. `src/pages/Welcome.tsx` - Made language-aware
4. `src/contexts/AuthContext.tsx` - Sync language preference on auth
5. `src/App.tsx` - Wrapped with LanguageProvider, added language selector

## User Experience

### Consistency
- **No mixing of languages** - Entire UI uses selected language
- **Professional appearance** - Clean, modern design
- **Seamless transitions** - Instant language switching
- **Proper typography** - Correct fonts for each language

### Flow Steps
1. User visits Welcome page
2. Selects preferred language (English or العربية)
3. Clicks "Sign Up"
4. Fills complete registration form
5. Submits form
6. Sees email verification screen
7. Checks email and clicks verification link
8. Gets redirected to dashboard
9. Language preference persists forever

### Error Handling
- Validation before submission
- Translated error messages
- Clear, specific feedback
- User-friendly language

## Technical Implementation

### Language Persistence
```javascript
// Stored in three places:
1. localStorage.setItem('doooda_language', 'ar')
2. user.user_metadata.preferred_language
3. document.documentElement.lang = 'ar'
4. document.documentElement.dir = 'rtl'
```

### Email Verification
```javascript
// Supabase configuration
options: {
  data: { /* user metadata */ },
  emailRedirectTo: `${window.location.origin}/dashboard`
}
```

### Translation Usage
```javascript
import { t, translateError } from '../utils/translations';

// UI Text
{t('signup.title', language)}

// Error Messages
translateError(error.message, language)
```

## Configuration Required

### Supabase Email Templates
Ensure email verification is **enabled** in Supabase:
1. Go to Authentication > Email Templates
2. Confirm Email template should be active
3. Use default redirect or custom domain

### No Additional Setup Needed
- Fonts are preloaded in `index.html`
- CSS already supports RTL
- Language context auto-initializes

## Benefits

1. **Complete User Data** - Collect all required information upfront
2. **Security** - Email verification before access
3. **Internationalization** - Full Arabic and English support
4. **User Experience** - Clean, professional onboarding
5. **Persistence** - Language preference never lost
6. **Consistency** - Single language throughout session
7. **Accessibility** - Proper RTL/LTR support
