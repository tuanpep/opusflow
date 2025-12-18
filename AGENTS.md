# AGENTS.md

> A simple, open format for guiding coding agents. Think of it as a README for agents.
> See: [agents.md](https://agents.md)

## Project Overview

**ErgonML-PaaS** is a multi-tenant Machine Learning Platform as a Service providing:
- Enterprise/Organization/Project/Team hierarchy (IAM)
- LakeFS integration for data versioning
- Feast integration for feature store
- API Gateway for unified access

## Setup Commands

```bash
# Install dependencies
cd ErgonML-platform && go mod download
cd ErgonML-frontend && pnpm install

# Start dev environment
docker-compose -f infrastructure/docker-compose/docker-compose.full.yml up -d

# Run backend tests
go test ./...

# Run frontend tests
cd ErgonML-frontend && pnpm test

# Build service
go build -o bin/platform-service ./services/platform-service/cmd/server
```

## Code Style

### Go (Backend)
- Go 1.21+ with standard project layout
- Error handling: Return `error` as last return value
- Logging: Structured logging with `slog`
- Naming: `camelCase` variables, `PascalCase` exports
- Tests: Table-driven tests with descriptive names
- Formatting: `gofmt` and `golangci-lint`

### TypeScript (Frontend)
- TypeScript strict mode
- React functional components with hooks
- State: React Query for server state
- Styling: Mantine components
- Path aliases: `@/` for src directory

## Directory Structure

```
ErgonML-platform/
├── services/
│   ├── api-gateway/         # Entry point, routing, auth proxy
│   ├── identity-access/     # IAM, authentication, RBAC
│   └── platform-service/    # Core platform logic, LakeFS, Feast
├── infrastructure/
│   ├── docker-compose/      # Local development
│   ├── helm/               # Kubernetes deployments
│   └── migrations/         # Database migrations
└── docs/                   # Documentation

ErgonML-frontend/
├── apps/
│   ├── web/                # Main user application
│   └── platform-admin/     # Admin dashboard
└── packages/
    ├── api/                # API client library
    └── ui/                 # Shared UI components
```

## API Standards

- RESTful endpoints: `/api/v1/{resource}`
- Response format: `{ "data": T, "error": string, "meta": {} }`
- Authentication: JWT Bearer token in `Authorization` header
- Multi-tenancy: `X-Enterprise-ID` header for scoping
- Errors: Use `handler.RespondWithError(c, err)` helpers

## Testing Requirements

- Unit tests for all service methods
- Integration tests for API endpoints
- Table-driven tests with meaningful names
- Minimum 80% coverage for new code

## Common Patterns

### Service Interface
```go
type MyService interface {
    Create(ctx context.Context, req CreateRequest) (*Entity, error)
    Get(ctx context.Context, id string) (*Entity, error)
    List(ctx context.Context, filter Filter) ([]Entity, error)
    Update(ctx context.Context, id string, req UpdateRequest) (*Entity, error)
    Delete(ctx context.Context, id string) error
}
```

### HTTP Handler
```go
func (h *Handler) Create(c *gin.Context) {
    var req CreateRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        handler.RespondWithBadRequest(c, err.Error())
        return
    }
    result, err := h.service.Create(c.Request.Context(), req)
    if err != nil {
        handler.RespondWithError(c, err)
        return
    }
    handler.RespondWithCreated(c, result)
}
```

### React Component
```tsx
export function MyComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-resource'],
    queryFn: () => api.getResource(),
  });

  if (isLoading) return <Loader />;
  return <DataDisplay data={data} />;
}
```

## Security Considerations

- Never hardcode secrets; use environment variables
- Validate all inputs before processing
- Use prepared statements for database queries
- Sanitize user input in frontend
- Log security events with request context
- Use HTTPS in production

## Git Workflow

- Branch naming: `feature/`, `fix/`, `chore/`
- Commit messages: Conventional commits format
- PRs require: Tests, lint pass, code review
