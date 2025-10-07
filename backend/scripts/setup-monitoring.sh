#!/bin/bash

# Monitoring Setup Script for Okuz AI Backend
# This script sets up Prometheus, Grafana, and Alertmanager for production monitoring

set -e

echo "🔧 Setting up Okuz AI Monitoring Stack"
echo "====================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if backend is running
echo "🔍 Checking if backend is running..."
if ! curl -s -f "http://localhost:3000/health" > /dev/null; then
    echo "❌ Backend is not running at localhost:3000"
    echo "   Please start the backend first: npm run start:dev"
    exit 1
fi
echo "✅ Backend is running"

# Create necessary directories
echo "📁 Creating monitoring directories..."
mkdir -p observability/prometheus
mkdir -p observability/alertmanager
mkdir -p grafana/dashboards
mkdir -p grafana/provisioning/datasources
mkdir -p grafana/provisioning/dashboards

# Start monitoring stack
echo "🚀 Starting monitoring stack..."
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."

# Check Prometheus
if curl -s -f "http://localhost:9090/-/healthy" > /dev/null; then
    echo "✅ Prometheus is running at http://localhost:9090"
else
    echo "❌ Prometheus failed to start"
fi

# Check Alertmanager
if curl -s -f "http://localhost:9093/-/healthy" > /dev/null; then
    echo "✅ Alertmanager is running at http://localhost:9093"
else
    echo "❌ Alertmanager failed to start"
fi

# Check Grafana
if curl -s -f "http://localhost:3001/api/health" > /dev/null; then
    echo "✅ Grafana is running at http://localhost:3001"
else
    echo "❌ Grafana failed to start"
fi

echo ""
echo "🎉 Monitoring stack setup completed!"
echo ""
echo "📊 Access URLs:"
echo "  Prometheus: http://localhost:9090"
echo "  Grafana: http://localhost:3001 (admin/admin123)"
echo "  Alertmanager: http://localhost:9093"
echo ""
echo "📋 Next Steps:"
echo "  1. Open Grafana and import the dashboards"
echo "  2. Configure Slack webhook URL in alertmanager.yml"
echo "  3. Set up email notifications"
echo "  4. Test alert rules by generating load"
echo ""
echo "🧪 To test the monitoring:"
echo "  ./load-testing/run-load-tests.sh"
echo ""
echo "📈 Dashboard URLs:"
echo "  Main Dashboard: http://localhost:3001/d/main-dashboard"
echo "  Business Dashboard: http://localhost:3001/d/business-dashboard"
echo "  Resources Dashboard: http://localhost:3001/d/resources-dashboard"
