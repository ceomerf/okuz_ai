# 🏗️ Okuz AI - System Architecture

## 📋 İçindekiler

- [Genel Mimari](#genel-mimari)
- [Microservices Detayları](#microservices-detayları)
- [Veri Akışı](#veri-akışı)
- [Güvenlik Mimarisi](#güvenlik-mimarisi)
- [Deployment Mimarisi](#deployment-mimarisi)

## 🏛️ Genel Mimari

### Sistem Genel Bakış

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Flutter Mobile App]
        B[Web Dashboard]
        C[Admin Panel]
    end
    
    subgraph "API Gateway Layer"
        D[NestJS API Gateway]
        E[Load Balancer]
        F[Rate Limiter]
    end
    
    subgraph "Microservices Layer"
        G[Auth Service]
        H[Planning Service]
        I[Smart Tools Service]
        J[Gamification Service]
        K[Analytics Service]
        L[Notification Service]
    end
    
    subgraph "AI Services Layer"
        M[AI Orchestrator]
        N[OpenAI Integration]
        O[Prompt Management]
        P[AI Monitoring]
    end
    
    subgraph "Data Layer"
        Q[(PostgreSQL)]
        R[(Redis Cache)]
        S[File Storage]
    end
    
    subgraph "External Services"
        T[OpenAI API]
        U[Email Service]
        V[Push Notifications]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    F --> G
    F --> H
    F --> I
    F --> J
    F --> K
    F --> L
    
    H --> M
    I --> M
    M --> N
    M --> O
    M --> P
    
    G --> Q
    H --> Q
    I --> Q
    J --> R
    K --> Q
    L --> R
    
    N --> T
    L --> U
    L --> V
```

### Katman Mimarisi

```mermaid
graph LR
    subgraph "Presentation Layer"
        A[Flutter App]
        B[Web App]
        C[Admin Panel]
    end
    
    subgraph "API Layer"
        D[REST API]
        E[GraphQL API]
        F[WebSocket API]
    end
    
    subgraph "Business Layer"
        G[Auth Service]
        H[Planning Service]
        I[Smart Tools Service]
        J[Gamification Service]
    end
    
    subgraph "Integration Layer"
        K[AI Orchestrator]
        L[External APIs]
        M[Message Queue]
    end
    
    subgraph "Data Layer"
        N[PostgreSQL]
        O[Redis]
        P[File Storage]
    end
    
    A --> D
    B --> D
    C --> D
    D --> G
    D --> H
    D --> I
    D --> J
    G --> N
    H --> N
    I --> K
    J --> O
    K --> L
```

## 🔧 Microservices Detayları

### 1. Authentication Service

```mermaid
graph TD
    A[Client Request] --> B[JWT Guard]
    B --> C[Token Validation]
    C --> D[User Lookup]
    D --> E[Permission Check]
    E --> F[Response]
    
    subgraph "Auth Components"
        G[JWT Strategy]
        H[Password Hashing]
        I[Refresh Token]
        J[Role Management]
    end
    
    C --> G
    C --> H
    C --> I
    E --> J
```

**Özellikler:**
- JWT token tabanlı kimlik doğrulama
- Role-based access control (RBAC)
- Refresh token mekanizması
- Password hashing (bcrypt)
- Session management

### 2. Planning Service

```mermaid
graph TD
    A[User Request] --> B[Planning Controller]
    B --> C[Planning Facade]
    C --> D[Plan Generation]
    C --> E[Plan Validation]
    C --> F[Plan Optimization]
    
    D --> G[AI Service]
    E --> H[Business Rules]
    F --> I[Performance Metrics]
    
    G --> J[OpenAI API]
    H --> K[Database]
    I --> L[Analytics]
```

**Özellikler:**
- AI-powered plan generation
- Plan validation ve optimization
- Progress tracking
- Adaptive learning
- Performance analytics

### 3. Smart Tools Service

```mermaid
graph TD
    A[Tool Request] --> B[Smart Tools Controller]
    B --> C[Tool Router]
    
    C --> D[Quick Chat]
    C --> E[SOS Question Solver]
    C --> F[Summary Generator]
    C --> G[Flashcard Generator]
    C --> H[Concept Map]
    
    D --> I[AI Orchestrator]
    E --> I
    F --> I
    G --> I
    H --> I
    
    I --> J[OpenAI API]
    I --> K[Cache Layer]
    I --> L[Rate Limiter]
```

**Özellikler:**
- AI-powered content generation
- Real-time question solving
- Document summarization
- Interactive learning tools
- Caching ve rate limiting

### 4. Gamification Service

```mermaid
graph TD
    A[User Action] --> B[Gamification Controller]
    B --> C[Points Calculator]
    B --> D[Achievement Checker]
    B --> E[Leaderboard Update]
    
    C --> F[Point Rules Engine]
    D --> G[Achievement Rules]
    E --> H[Ranking Algorithm]
    
    F --> I[Redis Cache]
    G --> I
    H --> I
    
    I --> J[Real-time Updates]
    J --> K[WebSocket]
```

**Özellikler:**
- Point system
- Achievement system
- Leaderboards
- Badge management
- Real-time updates

## 🔄 Veri Akışı

### 1. Kullanıcı Kayıt ve Giriş Akışı

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Gateway
    participant AS as Auth Service
    participant DB as Database
    participant R as Redis
    
    C->>A: POST /auth/register
    A->>AS: Forward request
    AS->>DB: Create user
    DB-->>AS: User created
    AS->>R: Store session
    AS-->>A: JWT token
    A-->>C: Success response
```

### 2. Plan Oluşturma Akışı

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Gateway
    participant PS as Planning Service
    participant AI as AI Orchestrator
    participant O as OpenAI
    participant DB as Database
    
    C->>A: POST /planning/generate-plan
    A->>PS: Forward request
    PS->>AI: Generate plan request
    AI->>O: AI generation call
    O-->>AI: Generated content
    AI-->>PS: Structured plan
    PS->>DB: Save plan
    DB-->>PS: Plan saved
    PS-->>A: Plan response
    A-->>C: Success response
```

### 3. Smart Tools Kullanım Akışı

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Gateway
    participant ST as Smart Tools Service
    participant AI as AI Orchestrator
    participant O as OpenAI
    participant R as Redis
    
    C->>A: POST /smart-tools/sos-question
    A->>ST: Forward request
    ST->>R: Check cache
    alt Cache hit
        R-->>ST: Cached response
    else Cache miss
        ST->>AI: Process request
        AI->>O: OpenAI call
        O-->>AI: AI response
        AI-->>ST: Processed response
        ST->>R: Cache response
    end
    ST-->>A: Tool response
    A-->>C: Success response
```

## 🔐 Güvenlik Mimarisi

### Güvenlik Katmanları

```mermaid
graph TD
    subgraph "Network Layer"
        A[Firewall]
        B[DDoS Protection]
        C[SSL/TLS]
    end
    
    subgraph "Application Layer"
        D[API Gateway]
        E[Rate Limiting]
        F[Authentication]
        G[Authorization]
    end
    
    subgraph "Data Layer"
        H[Database Encryption]
        I[Data Masking]
        J[Audit Logging]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
```

### JWT Token Akışı

```mermaid
graph LR
    A[Client Login] --> B[Auth Service]
    B --> C[Validate Credentials]
    C --> D[Generate JWT]
    D --> E[Return Access Token]
    E --> F[Client Stores Token]
    F --> G[API Requests]
    G --> H[Validate Token]
    H --> I[Process Request]
```

## 🚀 Deployment Mimarisi

### Production Environment

```mermaid
graph TB
    subgraph "Load Balancer"
        A[Nginx]
    end
    
    subgraph "Application Servers"
        B[App Server 1]
        C[App Server 2]
        D[App Server 3]
    end
    
    subgraph "Database Cluster"
        E[PostgreSQL Primary]
        F[PostgreSQL Replica 1]
        G[PostgreSQL Replica 2]
    end
    
    subgraph "Cache Cluster"
        H[Redis Master]
        I[Redis Slave 1]
        J[Redis Slave 2]
    end
    
    subgraph "Monitoring"
        K[Prometheus]
        L[Grafana]
        M[AlertManager]
    end
    
    A --> B
    A --> C
    A --> D
    
    B --> E
    C --> E
    D --> E
    
    E --> F
    E --> G
    
    B --> H
    C --> H
    D --> H
    
    H --> I
    H --> J
    
    B --> K
    C --> K
    D --> K
    K --> L
    K --> M
```

### Kubernetes Deployment

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Ingress Layer"
            A[Ingress Controller]
        end
        
        subgraph "Application Pods"
            B[API Gateway Pod]
            C[Auth Service Pod]
            D[Planning Service Pod]
            E[Smart Tools Pod]
        end
        
        subgraph "Data Services"
            F[PostgreSQL StatefulSet]
            G[Redis StatefulSet]
        end
        
        subgraph "Monitoring"
            H[Prometheus Pod]
            I[Grafana Pod]
        end
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    
    C --> F
    D --> F
    E --> F
    
    C --> G
    D --> G
    E --> G
    
    B --> H
    C --> H
    D --> H
    E --> H
    H --> I
```

## 📊 Performance Architecture

### Caching Strategy

```mermaid
graph TD
    A[Client Request] --> B{Redis Cache}
    B -->|Cache Hit| C[Return Cached Data]
    B -->|Cache Miss| D[Process Request]
    D --> E[Database Query]
    E --> F[Store in Cache]
    F --> G[Return Response]
    C --> H[Client Response]
    G --> H
```

### Load Balancing

```mermaid
graph TD
    A[Client] --> B[Load Balancer]
    B --> C[Server 1]
    B --> D[Server 2]
    B --> E[Server 3]
    
    C --> F[Health Check]
    D --> F
    E --> F
    
    F --> G{Server Status}
    G -->|Healthy| H[Route Traffic]
    G -->|Unhealthy| I[Remove from Pool]
```

## 🔄 CI/CD Pipeline

### Deployment Pipeline

```mermaid
graph LR
    A[Code Commit] --> B[GitHub Actions]
    B --> C[Run Tests]
    C --> D[Build Image]
    D --> E[Security Scan]
    E --> F[Deploy to Staging]
    F --> G[Integration Tests]
    G --> H[Deploy to Production]
    H --> I[Health Check]
    I --> J[Monitor]
```

## 📈 Monitoring ve Observability

### Monitoring Stack

```mermaid
graph TD
    A[Application] --> B[Prometheus]
    B --> C[Grafana]
    
    A --> D[Logs]
    D --> E[ELK Stack]
    
    A --> F[Traces]
    F --> G[Jaeger]
    
    C --> H[Dashboard]
    E --> I[Log Analysis]
    G --> J[Trace Analysis]
```

Bu mimari dokümantasyonu, Okuz AI sisteminin tüm bileşenlerini, aralarındaki ilişkileri ve veri akışını detaylı bir şekilde açıklamaktadır. Sistemin ölçeklenebilir, güvenli ve yüksek performanslı olması için tasarlanmıştır.
