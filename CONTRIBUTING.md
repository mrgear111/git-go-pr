# 🤝 Contributing to GitGoPR

Thank you for considering contributing to GitGoPR! We love your input, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Testing Guidelines](#testing-guidelines)

---

## 🤗 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- **Be Respectful**: Treat everyone with respect
- **Be Collaborative**: Work together constructively
- **Be Professional**: Keep discussions focused and productive
- **Be Inclusive**: Welcome newcomers and diverse perspectives

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- Git
- GitHub account
- Basic knowledge of Astro, Express, and MongoDB

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/git-go-pr-old.git
   cd git-go-pr-old
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_ORG/git-go-pr-old.git
   ```

### Setup Development Environment

1. **Install Dependencies**:
   ```bash
   # Backend
   cd server
   npm install

   # Frontend
   cd ../client
   npm install
   npm install astro-icon@latest @iconify-json/heroicons @iconify-json/mdi
   ```

2. **Configure Environment**:
   - Copy `.env.example` to `.env` in both `server/` and `client/`
   - Fill in your credentials (see README.md for details)

3. **Start Development Servers**:
   ```bash
   # Terminal 1 - Backend
   cd server && npm start

   # Terminal 2 - Frontend
   cd client && npm run dev
   ```

---

## 💻 Development Process

### 1. Create a Branch

Always create a new branch for your work:

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

**Branch Naming Conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `style/` - UI/styling updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

**Examples:**
- `feature/add-dark-mode`
- `fix/navbar-mobile-menu`
- `docs/update-api-guide`
- `style/improve-leaderboard-ui`

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style
- Comment complex logic
- Keep changes focused and atomic

### 3. Test Your Changes

**Backend Tests:**
```bash
cd server
npm start
# Test API endpoints manually or with Postman
```

**Frontend Tests:**
```bash
cd client
npm run dev
# Test UI in browser
npm run build  # Ensure build works
```

**Full Stack Test:**
- Start both servers
- Test the complete flow
- Check browser console for errors
- Test on multiple devices/browsers

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add contribution calendar component"
```

See [Commit Messages](#commit-messages) section for guidelines.

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

---

## 🔀 Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Self-reviewed your code
- [ ] Commented complex code sections
- [ ] Updated documentation (if needed)
- [ ] No new warnings or errors
- [ ] Tested on different browsers
- [ ] Branch is up-to-date with main

### PR Title Format

Use conventional commit format:

```
feat: add user contribution calendar
fix: resolve navbar mobile responsive issue
docs: update API documentation
style: improve leaderboard dark theme
refactor: optimize PR fetching service
```

### PR Description Template

```markdown
## 📝 Description
Brief description of what this PR does.

## 🎯 Changes Made
- Added X
- Fixed Y
- Updated Z

## 🧪 Testing
- [x] Tested locally on development server
- [x] Verified responsive design
- [x] Checked all API endpoints
- [x] No console errors

## 📸 Screenshots (if UI changes)
[Add screenshots]

## 🔗 Related Issues
Closes #123
Related to #456

## ✅ Checklist
- [x] Code follows style guidelines
- [x] Self-reviewed
- [x] Documentation updated
- [x] Tests pass
- [x] No merge conflicts
```

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged
4. Celebrate your contribution! 🎉

---

## 📐 Coding Standards

### JavaScript/TypeScript

```javascript
// Use const/let, not var
const API_BASE = 'http://localhost:4000';
let userCount = 0;

// Descriptive variable names
const contributionData = fetchContributions();  // Good
const data = fetchData();  // Avoid

// Function naming (camelCase)
function fetchUserContributions() {
  // Implementation
}

// Arrow functions for callbacks
users.map(user => user.username);

// Async/await over promises
async function getData() {
  const response = await fetch(url);
  return response.json();
}
```

### Astro Components

```astro
---
// Imports at top
import Layout from '../layouts/Layout.astro';
import { Icon } from 'astro-icon/components';

// Props with TypeScript types
interface Props {
  username: string;
  prCount: number;
}

const { username, prCount } = Astro.props;
---

<!-- Use semantic HTML -->
<main class="container">
  <h1>{username}</h1>
  <p>{prCount} PRs</p>
</main>

<!-- TailwindCSS classes -->
<button class="bg-green-500 hover:bg-green-600 px-4 py-2 rounded">
  Click Me
</button>
```

### CSS/Tailwind

- Use Tailwind utility classes first
- Create custom CSS only when necessary
- Follow mobile-first approach
- Use CSS variables for theme colors

```css
/* Custom CSS (when needed) */
.custom-component {
  @apply bg-gray-900 text-white p-4 rounded-lg;
}

/* Dark mode support */
.dark .custom-component {
  @apply bg-gray-800;
}
```

---

## 📝 Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style/formatting (no logic change)
- **refactor**: Code refactoring
- **test**: Adding/updating tests
- **chore**: Maintenance tasks
- **perf**: Performance improvements

### Examples

**Good commits:**
```bash
feat: add GitHub-style contribution calendar
feat(api): implement hourly PR sync cron job
fix: resolve navbar mobile menu toggle issue
fix(leaderboard): correct merged PR count calculation
docs: update setup instructions in README
style: improve dark mode colors on leaderboard
refactor(server): optimize PR fetching logic
```

**Bad commits:**
```bash
update files
fixed bug
changes
WIP
asdfgh
```

### Commit Message Guidelines

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Limit first line to 72 characters
- Reference issues and PRs when applicable
- Explain *what* and *why*, not *how*

---

## 🧪 Testing Guidelines

### Manual Testing Checklist

**Backend:**
- [ ] Server starts without errors
- [ ] All API endpoints respond correctly
- [ ] MongoDB connections work
- [ ] OAuth flow works end-to-end
- [ ] Cron jobs execute properly

**Frontend:**
- [ ] Page loads without errors
- [ ] All routes work
- [ ] Components render correctly
- [ ] Responsive on mobile/tablet/desktop
- [ ] No console errors or warnings
- [ ] Build completes successfully

**Integration:**
- [ ] Login flow works
- [ ] Data syncs between frontend/backend
- [ ] Real-time updates work
- [ ] Error states display properly

### Browser Testing

Test on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (if on Mac)
- Mobile browsers

### Performance

- Check page load times
- Ensure no memory leaks
- Optimize images and assets
- Minimize bundle size

---

## 🎨 UI/UX Guidelines

### Design Principles

- **Consistency**: Follow existing design patterns
- **Accessibility**: Use semantic HTML and ARIA labels
- **Responsiveness**: Mobile-first, works on all devices
- **Dark Theme**: Maintain dark theme aesthetic
- **Green Accent**: Use green (#22c55e) as primary color

### Component Patterns

- Use existing components when possible
- Follow TailwindCSS utility-first approach
- Maintain glass-morphism effects
- Add hover/focus states
- Include loading and error states

---

## 🐛 Reporting Bugs

### Before Reporting

1. Check if the bug has already been reported
2. Try to reproduce it consistently
3. Gather relevant information

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., macOS]
- Browser: [e.g., Chrome 120]
- Node version: [e.g., 18.17.0]

**Additional context**
Any other relevant information.
```

---

## 💡 Suggesting Features

We love new ideas! When suggesting a feature:

1. **Check existing issues** - Might already be planned
2. **Be specific** - Clear description helps
3. **Explain the use case** - Why is it needed?
4. **Consider alternatives** - Other ways to solve it?

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
What you want to happen.

**Describe alternatives you've considered**
Other solutions you thought about.

**Additional context**
Mockups, examples, etc.
```

---

## 📚 Documentation

### When to Update Docs

- Adding new features
- Changing existing functionality
- Adding new API endpoints
- Modifying environment variables
- Changing project structure

### Documentation Files

- `README.md` - Project overview
- `CONTRIBUTING.md` - This file
- `SETUP.md` - Detailed setup guide
- `API_DOCUMENTATION.md` - API reference
- `ARCHITECTURE.md` - Project architecture
- Code comments - For complex logic

---

## 🎓 Resources

- [Astro Documentation](https://docs.astro.build)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 🏆 Recognition

Contributors will be:
- Listed in our contributors page
- Mentioned in release notes
- Part of the Hacktoberfest 2025 celebration!

---

## ❓ Questions?

- Open an issue for questions
- Tag maintainers if stuck
- Join our community discussions

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

<p align="center">
  <b>Thank you for contributing to GitGoPR! 🎉</b>
</p>

<p align="center">
  Every contribution, no matter how small, makes a difference!
</p>
