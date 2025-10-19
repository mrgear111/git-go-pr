# Frontend Structure Documentation

## 📁 New Folder Structure

```
client/src/
├── components/
│   ├── layout/               # Layout components
│   │   ├── Navbar.astro     # Professional navbar with auth
│   │   └── Footer.astro     # Modern footer with social links
│   ├── common/              # Common reusable components
│   ├── ui/                  # UI-specific components
│   └── old-backup/          # Backup of old components
│       ├── Navbar.astro
│       └── Footer.astro
├── pages/                   # Astro pages (routes)
│   ├── index.astro         # Homepage
│   ├── login.astro         # Login page
│   ├── register.astro      # Profile registration
│   ├── leaderboard.astro   # Leaderboard
│   └── admindashboard.astro # Admin dashboard
├── layouts/                 # Layout templates
│   └── Layout.astro        # Main layout with Navbar & Footer
├── utils/                   # Utility functions
│   └── api.js              # API helper functions
├── constants/               # Constants and config
│   └── navigation.js       # Navigation links & social links
├── styles/                  # Global styles
│   └── global.css          # Tailwind and custom styles
└── assets/                  # Static assets
    └── icons/              # Icon files
```

## 🎨 New Components

### Navbar (`components/layout/Navbar.astro`)

**Features:**
- ✅ Sticky top navigation with smooth scroll effects
- ✅ Responsive mobile menu with hamburger icon
- ✅ Dark/Light mode toggle (persists in localStorage)
- ✅ Dynamic authentication state
  - Shows login button when not authenticated
  - Shows user avatar & username when logged in
  - Shows "Complete Profile" warning if profile incomplete
- ✅ Gradient branding with logo
- ✅ Smooth hover animations on all links
- ✅ Active link indicators
- ✅ Professional glassmorphism effects

**Key Features:**
```astro
- Sticky positioning with scroll effects
- Mobile-responsive hamburger menu
- Theme toggle (dark/light mode)
- Auth-aware navigation links
- Profile completion status indicator
```

### Footer (`components/layout/Footer.astro`)

**Features:**
- ✅ Multi-column responsive grid layout
- ✅ Brand section with logo and description
- ✅ Social media links (GitHub, LinkedIn, Twitter)
- ✅ Organized link sections:
  - About links
  - Resources links
  - Community links
- ✅ Scroll-to-top button (appears after scrolling)
- ✅ Gradient backgrounds and animations
- ✅ Copyright and branding information
- ✅ Hacktoberfest 2025 badge

**Key Features:**
```astro
- Gradient overlays
- Animated social icons
- Scroll-to-top functionality
- External link indicators
- Responsive grid layout
```

## 🛠️ Utilities & Constants

### API Utilities (`utils/api.js`)

Centralized API functions:
- `API_BASE_URL` - Base URL for API requests
- `checkAuth()` - Check user authentication status
- `fetchUserProfile()` - Get user profile data

### Navigation Constants (`constants/navigation.js`)

Centralized navigation configuration:
- `NAV_LINKS` - Main navigation links
- `SOCIAL_LINKS` - Social media links
- `FOOTER_LINKS` - Footer link sections

## 🎯 Layout System

### Main Layout (`layouts/Layout.astro`)

The Layout component now includes:
- ✅ Automatic Navbar integration
- ✅ Automatic Footer integration
- ✅ SEO meta tags (Open Graph, Twitter Card)
- ✅ Dark mode support
- ✅ Custom scrollbar styling
- ✅ Smooth scroll behavior

**Usage in pages:**
```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="Page Title">
  <div>
    <!-- Your page content -->
  </div>
</Layout>
```

## 🎨 Design System

### Colors
- **Primary:** Green (`#4ade80`, `#22c55e`)
- **Secondary:** Emerald & Teal
- **Background:** Dark gradients (black to gray-900)
- **Text:** White/Gray with green accents

### Typography
- **Primary Font:** System fonts (system-ui, sans-serif)
- **Monospace:** Used for code and technical elements

### Spacing
- Consistent use of Tailwind spacing scale
- Max-width containers: `max-w-7xl`
- Padding: `px-4 sm:px-6 lg:px-8`

### Animations
- Smooth transitions: `transition-all duration-300`
- Hover effects on all interactive elements
- Gradient animations
- Scroll-triggered animations

## 📱 Responsive Design

### Breakpoints (Tailwind)
- **sm:** 640px
- **md:** 768px
- **lg:** 1024px
- **xl:** 1280px

### Mobile Features
- Hamburger menu for mobile devices
- Touch-friendly tap targets
- Responsive typography
- Stack layouts for mobile

## 🔐 Authentication Flow

### States
1. **Not Authenticated**
   - Shows "Login" button
   - Redirects to login page

2. **Authenticated (Incomplete Profile)**
   - Shows "Complete Profile" warning (yellow)
   - Displays user info
   - Shows "Sign Out" button

3. **Authenticated (Complete Profile)**
   - Shows user avatar & username
   - Shows "Sign Out" button
   - Hides "Complete Profile" warning

### Auth Check Logic
```javascript
// Runs on page load
fetch('/auth/me', { credentials: 'include' })
  .then(response => response.json())
  .then(data => {
    if (data.authenticated) {
      // Show user info
      // Check profile completion
    }
  });
```

## 🚀 Features

### Dark Mode
- Toggle button in navbar
- Persists in localStorage
- Smooth transitions
- Moon/Sun icon indicators

### Scroll Effects
- Navbar shadow on scroll
- Scroll-to-top button (appears at 300px)
- Smooth scroll behavior

### Mobile Menu
- Slide-down animation
- Full-width on mobile
- Touch-friendly
- Auto-closes on route change

## 📦 Dependencies

- **Astro** - Framework
- **Tailwind CSS** - Styling
- **@astrojs/tailwind** - Tailwind integration
- **@tailwindcss/forms** - Form styling

## 🔧 Configuration

### Tailwind Config (`tailwind.config.mjs`)
```javascript
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom colors
      },
      fontFamily: {
        mono: ['Monaco', 'monospace']
      }
    }
  }
}
```

### Astro Config (`astro.config.mjs`)
```javascript
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()]
});
```

## 🎯 Best Practices

### Component Organization
- ✅ Layout components in `components/layout/`
- ✅ Reusable UI in `components/ui/`
- ✅ Common components in `components/common/`
- ✅ Page-specific components next to pages

### Naming Conventions
- **Components:** PascalCase (e.g., `Navbar.astro`)
- **Utilities:** camelCase (e.g., `api.js`)
- **Constants:** UPPER_CASE or camelCase

### Code Style
- Use Tailwind utilities first
- Create custom CSS only when necessary
- Keep components small and focused
- Use semantic HTML

## 🐛 Troubleshooting

### Issue: Components not loading
**Solution:** Check import paths and ensure files are in correct locations

### Issue: Navbar not sticky
**Solution:** Ensure `sticky top-0 z-50` classes are applied

### Issue: Theme toggle not working
**Solution:** Check localStorage permissions and JavaScript console

### Issue: Auth state not updating
**Solution:** Verify API_BASE_URL and credentials in fetch requests

## 📝 Migration Notes

### Changes from Old Structure
1. ✅ Navbar and Footer moved to `components/layout/`
2. ✅ Added centralized utilities and constants
3. ✅ Unified Layout component
4. ✅ Improved responsive design
5. ✅ Added dark mode support
6. ✅ Enhanced animations and transitions

### Old Components
Backed up in `components/old-backup/` for reference

## 🎉 Next Steps

1. ✅ Test all pages in development
2. ✅ Verify authentication flow
3. ✅ Check mobile responsiveness
4. ✅ Test dark mode toggle
5. ✅ Validate all links
6. ✅ Run production build

---

**Built with 💚 by NST-SDC Dev Club**
**Hacktoberfest 2025** 🎃
