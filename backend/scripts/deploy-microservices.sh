#!/bin/bash

# Microservices Deployment Script
# This script deploys the Okuz AI microservices architecture

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.microservices.yml"
ENVIRONMENT=${1:-development}

echo -e "${BLUE}🚀 Starting Okuz AI Microservices Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Create necessary directories
echo -e "${BLUE}📁 Creating necessary directories...${NC}"
mkdir -p logs
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/datasources
mkdir -p nginx/ssl
mkdir -p shared/schemas

print_status "Directories created"

# Copy environment files
echo -e "${BLUE}📋 Setting up environment files...${NC}"
if [ ! -f .env.microservices ]; then
    cat > .env.microservices << EOF
# Microservices Environment Configuration
NODE_ENV=${ENVIRONMENT}

# Database
DATABASE_URL=postgresql://okuz_user:okuz_password@postgres:5432/okuz_ai_db

# Redis
REDIS_URL=redis://redis:6379

# Kafka
KAFKA_BROKERS=kafka:29092

# Service URLs
API_GATEWAY_URL=http://localhost:3000
PLANNING_SERVICE_URL=http://localhost:3003
AUTH_SERVICE_URL=http://localhost:3001
AI_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_URL=http://localhost:3004

# Monitoring
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3001

# Security
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRES_IN=24h

# AI Configuration
OPENAI_API_KEY=your-openai-api-key-here
AI_DEFAULT_MODEL=gpt-3.5-turbo
AI_RATE_LIMIT_ENABLED=true

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
EOF
    print_status "Environment file created"
else
    print_warning "Environment file already exists"
fi

# Build services
echo -e "${BLUE}🔨 Building microservices...${NC}"

# Build Planning Service
echo -e "${BLUE}Building Planning Service...${NC}"
cd services/planning-service
if [ -f package.json ]; then
    npm install
    print_status "Planning Service dependencies installed"
else
    print_warning "Planning Service package.json not found"
fi
cd ../..

# Build API Gateway
echo -e "${BLUE}Building API Gateway...${NC}"
cd services/api-gateway
if [ -f package.json ]; then
    npm install
    print_status "API Gateway dependencies installed"
else
    print_warning "API Gateway package.json not found"
fi
cd ../..

print_status "Services built"

# Start infrastructure services first
echo -e "${BLUE}🏗️  Starting infrastructure services...${NC}"
docker-compose -f $COMPOSE_FILE up -d zookeeper kafka redis postgres

# Wait for infrastructure to be ready
echo -e "${BLUE}⏳ Waiting for infrastructure services to be ready...${NC}"
sleep 30

# Check if services are ready
echo -e "${BLUE}🔍 Checking infrastructure services...${NC}"

# Check Kafka
if docker-compose -f $COMPOSE_FILE exec kafka kafka-topics --bootstrap-server localhost:9092 --list > /dev/null 2>&1; then
    print_status "Kafka is ready"
else
    print_warning "Kafka is not ready, waiting..."
    sleep 10
fi

# Check Redis
if docker-compose -f $COMPOSE_FILE exec redis redis-cli ping > /dev/null 2>&1; then
    print_status "Redis is ready"
else
    print_warning "Redis is not ready, waiting..."
    sleep 10
fi

# Check PostgreSQL
if docker-compose -f $COMPOSE_FILE exec postgres pg_isready -U okuz_user > /dev/null 2>&1; then
    print_status "PostgreSQL is ready"
else
    print_warning "PostgreSQL is not ready, waiting..."
    sleep 10
fi

# Start microservices
echo -e "${BLUE}🚀 Starting microservices...${NC}"
docker-compose -f $COMPOSE_FILE up -d planning-service auth-service ai-service notification-service

# Wait for microservices to be ready
echo -e "${BLUE}⏳ Waiting for microservices to be ready...${NC}"
sleep 30

# Start API Gateway
echo -e "${BLUE}🌐 Starting API Gateway...${NC}"
docker-compose -f $COMPOSE_FILE up -d api-gateway

# Wait for API Gateway to be ready
echo -e "${BLUE}⏳ Waiting for API Gateway to be ready...${NC}"
sleep 15

# Start monitoring services
echo -e "${BLUE}📊 Starting monitoring services...${NC}"
docker-compose -f $COMPOSE_FILE up -d prometheus grafana

# Start load balancer
echo -e "${BLUE}⚖️  Starting load balancer...${NC}"
docker-compose -f $COMPOSE_FILE up -d nginx

# Health checks
echo -e "${BLUE}🏥 Performing health checks...${NC}"

# Check API Gateway
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    print_status "API Gateway is healthy"
else
    print_warning "API Gateway health check failed"
fi

# Check Planning Service
if curl -f http://localhost:3003/health > /dev/null 2>&1; then
    print_status "Planning Service is healthy"
else
    print_warning "Planning Service health check failed"
fi

# Check Auth Service
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    print_status "Auth Service is healthy"
else
    print_warning "Auth Service health check failed"
fi

# Check AI Service
if curl -f http://localhost:3002/health > /dev/null 2>&1; then
    print_status "AI Service is healthy"
else
    print_warning "AI Service health check failed"
fi

# Check Notification Service
if curl -f http://localhost:3004/health > /dev/null 2>&1; then
    print_status "Notification Service is healthy"
else
    print_warning "Notification Service health check failed"
fi

# Display service URLs
echo -e "${BLUE}🌐 Service URLs:${NC}"
echo -e "${GREEN}API Gateway: http://localhost:3000${NC}"
echo -e "${GREEN}API Documentation: http://localhost:3000/api${NC}"
echo -e "${GREEN}Planning Service: http://localhost:3003${NC}"
echo -e "${GREEN}Auth Service: http://localhost:3001${NC}"
echo -e "${GREEN}AI Service: http://localhost:3002${NC}"
echo -e "${GREEN}Notification Service: http://localhost:3004${NC}"
echo -e "${GREEN}Prometheus: http://localhost:9090${NC}"
echo -e "${GREEN}Grafana: http://localhost:3001 (admin/admin)${NC}"

# Display status
echo -e "${BLUE}📊 Deployment Status:${NC}"
docker-compose -f $COMPOSE_FILE ps

print_status "Microservices deployment completed!"

echo -e "${BLUE}🎉 Okuz AI Microservices are now running!${NC}"
echo -e "${BLUE}You can now access the services using the URLs above.${NC}"
