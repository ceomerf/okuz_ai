# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it to security@okuz.ai or create a private issue.

## Security Measures

### CI/CD Pipeline Security

Our CI/CD pipeline includes the following security measures:

1. **Dependency Vulnerability Scanning**
   - `npm audit --audit-level=high` on every PR
   - Automated security updates via Dependabot

2. **Secret Scanning**
   - TruffleHog scans for accidentally committed secrets
   - Pre-commit hooks prevent secret commits

3. **Container Security**
   - Trivy vulnerability scanning for Docker images
   - Multi-stage builds with minimal attack surface
   - Non-root user execution

4. **Code Quality**
   - ESLint with security rules
   - SonarCloud code analysis
   - Pre-commit hooks for code quality

### Required GitHub Secrets

The following secrets must be configured in the GitHub repository:

#### CI/CD Secrets
- `SONAR_TOKEN`: SonarCloud authentication token
- `VPS_HOST`: Production server hostname/IP
- `VPS_USERNAME`: Production server username
- `VPS_SSH_KEY`: SSH private key for production deployment

#### Application Secrets
- `JWT_SECRET`: JWT signing secret (32+ characters)
- `JWT_REFRESH_SECRET`: JWT refresh token secret (32+ characters)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

### Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong, unique secrets
   - Rotate secrets regularly

2. **Dependencies**
   - Keep dependencies updated
   - Use `npm audit` regularly
   - Pin dependency versions

3. **Database Security**
   - Use connection pooling
   - Enable SSL connections
   - Regular backups

4. **API Security**
   - Rate limiting enabled
   - CORS properly configured
   - Input validation
   - Authentication required

### Security Checklist

- [ ] All dependencies are up to date
- [ ] No secrets in code or configuration files
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Database connections secured
- [ ] Regular security audits performed
- [ ] Monitoring and logging enabled

## Contact

For security-related questions, contact: security@okuz.ai
