#!/bin/bash

# StablePay Platform Quick Start Script
# This script helps you set up the StablePay off-ramping platform

set -e

echo "🚀 StablePay Platform Quick Start"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Node.js $(node -v) is installed"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "npm $(npm -v) is installed"
}

# Check if PostgreSQL is installed
check_postgres() {
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL is not installed. You'll need to install it or use a cloud database."
        print_status "Options:"
        print_status "  - Install locally: https://www.postgresql.org/download/"
        print_status "  - Use cloud service: AWS RDS, Google Cloud SQL, DigitalOcean"
        return 1
    fi
    
    print_success "PostgreSQL is installed"
    return 0
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "Dependencies installed"
}

# Generate secrets
generate_secrets() {
    print_status "Generating security secrets..."
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        cp .env.example .env 2>/dev/null || touch .env
    fi
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env 2>/dev/null || echo "JWT_SECRET=$JWT_SECRET" >> .env
    
    # Generate webhook secret
    WEBHOOK_SECRET=$(openssl rand -base64 32)
    sed -i.bak "s/WEBHOOK_SECRET=.*/WEBHOOK_SECRET=$WEBHOOK_SECRET/" .env 2>/dev/null || echo "WEBHOOK_SECRET=$WEBHOOK_SECRET" >> .env
    
    # Generate encryption key
    ENCRYPTION_KEY=$(openssl rand -base64 32)
    sed -i.bak "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env 2>/dev/null || echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
    
    # Clean up backup files
    rm -f .env.bak
    
    print_success "Security secrets generated"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if DATABASE_URL is set
    if grep -q "DATABASE_URL=" .env; then
        print_success "Database URL is configured"
        return 0
    fi
    
    # Try to create local database
    if command -v psql &> /dev/null; then
        print_status "Creating local PostgreSQL database..."
        
        # Try to create database
        if psql -U postgres -c "CREATE DATABASE stablepay_dev;" 2>/dev/null; then
            echo "DATABASE_URL=postgresql://postgres@localhost:5432/stablepay_dev" >> .env
            print_success "Local database created: stablepay_dev"
        else
            print_warning "Could not create local database. Please set DATABASE_URL manually in .env"
        fi
    else
        print_warning "PostgreSQL not found. Please set DATABASE_URL manually in .env"
    fi
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    if npm run db:migrate 2>/dev/null; then
        print_success "Database migrations completed"
    else
        print_warning "Could not run migrations. Please run manually: npm run db:migrate"
    fi
}

# Build the application
build_app() {
    print_status "Building application..."
    
    if npm run build 2>/dev/null; then
        print_success "Application built successfully"
    else
        print_warning "Build failed. Please check for errors and run: npm run build"
    fi
}

# Create test partner
create_test_partner() {
    print_status "Creating test partner..."
    
    # Wait for server to start
    sleep 3
    
    # Create test partner
    curl -X POST http://localhost:3001/api/v1/partner/create \
        -H "Content-Type: application/json" \
        -d '{"name":"Test Partner","email":"test@stablepay.global"}' \
        2>/dev/null | jq '.' || print_warning "Could not create test partner. Server may not be running."
}

# Show next steps
show_next_steps() {
    echo ""
    echo "🎉 Setup Complete!"
    echo "=================="
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. 📋 Configure API Keys:"
    echo "   - Edit .env file with your credentials"
    echo "   - See CREDENTIALS_GUIDE.md for details"
    echo ""
    echo "2. 🚀 Start the server:"
    echo "   npm run dev"
    echo ""
    echo "3. 📚 Test the API:"
    echo "   curl http://localhost:3001/api/health"
    echo ""
    echo "4. 🔑 Get your API key:"
    echo "   curl -X POST http://localhost:3001/api/v1/partner/create \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"name\":\"Your Company\",\"email\":\"your@email.com\"}'"
    echo ""
    echo "5. 📖 Read the documentation:"
    echo "   - STABLEPAY_PLATFORM_BLUEPRINT_V2.md"
    echo "   - IMPLEMENTATION_GUIDE.md"
    echo "   - CREDENTIALS_GUIDE.md"
    echo ""
    echo "6. 🧪 Test the complete flow:"
    echo "   npm run test:integration"
    echo ""
    echo "📞 Need help? Check the documentation or create an issue."
    echo ""
}

# Main execution
main() {
    echo "Starting StablePay Platform setup..."
    echo ""
    
    # Check prerequisites
    check_node
    check_npm
    check_postgres
    
    echo ""
    
    # Install dependencies
    install_dependencies
    
    # Generate secrets
    generate_secrets
    
    # Setup database
    setup_database
    
    # Run migrations
    run_migrations
    
    # Build application
    build_app
    
    # Show next steps
    show_next_steps
}

# Run main function
main "$@" 