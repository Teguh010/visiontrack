# Contributing to Real-Time Fleet Tracking System

First off, thank you for considering contributing to this project! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/realtime-tracking-system.git
   cd realtime-tracking-system
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/teguhbadru/realtime-tracking-system.git
   ```

## Development Setup

### Prerequisites

- Node.js 18+ 
- Docker Desktop (for infrastructure services)
- Python 3.8+ (for nuScenes replayer)

### Quick Setup

```bash
# 1. Start infrastructure (MQTT, Redis, PostgreSQL)
docker compose up -d

# 2. Backend setup
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev

# 3. Frontend setup (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev -- --port 3001

# 4. Simulator (new terminal)
cd simulator
npm install
npm start
```

### Verify Setup

- Backend API: http://localhost:3000/api/vehicles
- Frontend Dashboard: http://localhost:3001
- MQTT Broker: localhost:1883

## How to Contribute

### Types of Contributions

- 🐛 **Bug fixes** - Fix issues and submit PRs
- ✨ **Features** - Implement new features after discussion
- 📝 **Documentation** - Improve docs, fix typos, add examples
- 🧪 **Tests** - Add missing tests or improve existing ones
- 🎨 **UI/UX** - Improve the dashboard interface

### Before You Start

1. Check [existing issues](../../issues) to avoid duplicates
2. For major changes, open an issue first to discuss
3. For bugs, try to reproduce with minimal steps

## Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** with clear, focused commits

3. **Ensure quality**:
   ```bash
   # Backend
   cd backend
   npm run lint
   npm run test
   
   # Frontend
   cd frontend
   npm run lint
   npm run build
   ```

4. **Update documentation** if needed

5. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Fill out the PR template** completely

7. **Wait for review** - maintainers will review your PR

### PR Checklist

- [ ] Code follows the project's coding standards
- [ ] Tests pass locally
- [ ] Linting passes with no errors
- [ ] Documentation is updated (if applicable)
- [ ] Commit messages follow conventions
- [ ] PR description explains the changes

## Coding Standards

### TypeScript/JavaScript

- Use **ESLint** configuration provided in the project
- Use **Prettier** for formatting
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Backend (NestJS)

```typescript
// ✅ Good: Descriptive names, proper decorators
@Injectable()
export class VehicleService {
  async findByStatus(status: VehicleStatus): Promise<Vehicle[]> {
    // implementation
  }
}

// ❌ Bad: Vague names, no types
export class VS {
  async find(s) {
    // implementation
  }
}
```

### Frontend (Next.js/React)

```typescript
// ✅ Good: Typed props, clear component structure
interface VehicleCardProps {
  vehicle: Vehicle;
  onSelect: (id: string) => void;
}

export function VehicleCard({ vehicle, onSelect }: VehicleCardProps) {
  return (/* JSX */);
}

// ❌ Bad: any types, unclear props
export function Card(props: any) {
  return (/* JSX */);
}
```

### File Structure

- One component/service per file
- Use kebab-case for file names: `vehicle-service.ts`
- Group related files in directories

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring |
| `test` | Adding tests |
| `chore` | Maintenance tasks |

### Examples

```bash
feat(tracking): add speed limit alerts
fix(map): resolve marker flickering on zoom
docs(readme): add Docker setup instructions
refactor(backend): extract MQTT logic to separate module
```

## Reporting Bugs

Use the [Bug Report template](../../issues/new?template=bug_report.md) and include:

1. **Description** - Clear summary of the bug
2. **Steps to Reproduce** - Minimal steps to trigger the issue
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happens
5. **Environment** - OS, Node version, browser, etc.
6. **Screenshots/Logs** - If applicable

## Suggesting Features

Use the [Feature Request template](../../issues/new?template=feature_request.md) and include:

1. **Problem Statement** - What problem does this solve?
2. **Proposed Solution** - How should it work?
3. **Alternatives Considered** - Other approaches you thought of
4. **Additional Context** - Mockups, examples, references

---

## Questions?

Feel free to open an issue with the `question` label or reach out to the maintainers.

Thank you for contributing! 🚀
