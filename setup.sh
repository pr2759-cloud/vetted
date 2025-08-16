#!/bin/bash

# Vetted Project Setup Script
# This script sets up the complete development environment for Vetted

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_header() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

# ASCII Art Banner
print_banner() {
    echo -e "${PURPLE}"
    cat << "EOF"
    ██╗   ██╗███████╗████████╗████████╗███████╗██████╗ 
    ██║   ██║██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
    ██║   ██║█████╗     ██║      ██║   █████╗  ██║  ██║
    ╚██╗ ██╔╝██╔══╝     ██║      ██║   ██╔══╝  ██║  ██║
     ╚████╔╝ ███████╗   ██║      ██║   ███████╗██████╔╝
      ╚═══╝  ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═════╝ 
                                                        
    Product Discovery Platform - Development Setup
EOF
    echo -e "${NC}"
}

# Check if required tools are installed
check_requirements() {
    print_header "Checking Requirements"
    
    local missing_tools=()
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_tools+=("Node.js 18+")
    else
        NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            missing_tools+=("Node.js 18+ (current: $(node -v))")
        else
            print_status "Node.js $(node -v) ✓"
        fi
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    else
        print_status "npm $(npm -v) ✓"
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        missing_tools+=("Git")
    else
        print_status "Git $(git --version | cut -d ' ' -f 3) ✓"
    fi
    
    # Check Docker (optional)
    if ! command -v docker &> /dev/null; then
        print_warning "Docker not found - you can still run locally with PostgreSQL and Redis installed"
    else
        print_status "Docker $(docker --version | cut -d ' ' -f 3 | tr -d ',') ✓"
    fi
    
    # Check PostgreSQL (if not using Docker)
    if ! command -v docker &> /dev/null && ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL not found - you'll need PostgreSQL or Docker to run the database"
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools:"
        for tool in "${missing_tools[@]}"; do
            echo -e "  ${RED}•${NC} $tool"
        done
        echo ""
        print_error "Please install the missing tools and run this script again."
        exit 1
    fi
    
    print_status "All requirements satisfied!"
    echo ""
}

# Create project structure
create_structure() {
    print_header "Creating Project Structure"
    
    # Create main directories
    mkdir -p {frontend,backend,shared,docs}/{src,tests}
    mkdir -p frontend/public
    mkdir -p frontend/src/{components,pages,hooks,services,store,types,utils,styles}
    mkdir -p frontend/src/components/{common,product,chat}
    mkdir -p frontend/src/components/common/{Header,SearchBox,LoadingSpinner}
    mkdir -p frontend/src/components/product/{ProductCard,ProductGrid,SentimentBadge,FilterTabs}
    mkdir -p frontend/src/components/chat/{ChatInterface,MessageBubble,SuggestionNudges}
    mkdir -p frontend/src/pages/{HomePage,SearchResults,ProductDetail}
    
    mkdir -p backend/src/{controllers,services,models,middleware,routes,database,utils,config,types}
    mkdir -p backend/src/database/{migrations,seeds}
    mkdir -p backend/prisma
    
    mkdir -p shared/{types,utils}
    
    mkdir -p docs/{api,setup}
    mkdir -p logs
    
    print_status "Project structure created"
    echo ""
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    print_info "Installing root dependencies..."
    npm install
    
    print_info "Installing shared dependencies..."
    cd shared && npm install && cd ..
    
    print_info "Installing backend dependencies..."
    cd backend && npm install && cd ..
    
    print_info "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
    
    print_status "All dependencies installed"
    echo ""
}

# Setup environment
setup_environment() {
    print_header "Setting Up Environment"
    
    if [ ! -f ".env" ]; then
        cp .env.example .env
        print_status "Environment file created (.env)"
        print_warning "Please update .env with your actual configuration values"
    else
        print_warning ".env file already exists"
    fi
    echo ""
}

# Setup database
setup_database() {
    print_header "Setting Up Database"
    
    print_info "Generating Prisma client..."
    cd backend && npx prisma generate
    
    print_info "Running database migrations..."
    npx prisma migrate dev --name init
    
    print_info "Seeding database with sample data..."
    npx prisma db seed
    
    cd ..
    print_status "Database setup completed"
    echo ""
}

# Setup Git hooks
setup_git_hooks() {
    print_header "Setting Up Git Hooks"
    
    if [ -d ".git" ]; then
        npx husky install
        npx husky add .husky/pre-commit "npm run lint-staged"
        print_status "Git hooks configured"
    else
        print_warning "Not a Git repository - skipping Git hooks setup"
    fi
    echo ""
}

# Create essential files
create_essential_files() {
    print_header "Creating Essential Files"
    
    # Create frontend index.html if it doesn't exist
    if [ ! -f "frontend/public/index.html" ]; then
        cat > frontend/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vetted - Product Discovery</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF
        print_status "Frontend index.html created"
    fi
    
    # Create backend health endpoint if it doesn't exist
    if [ ! -f "backend/src/controllers/healthController.ts" ]; then
        mkdir -p backend/src/controllers
        cat > backend/src/controllers/healthController.ts << 'EOF'
import { Request, Response } from 'express';

export const healthCheck = (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
};
EOF
        print_status "Backend health controller created"
    fi
    
    echo ""
}

# Main setup function
main() {
    print_banner
    
    print_info "Starting Vetted project setup..."
    echo ""
    
    check_requirements
    create_structure
    install_dependencies
    setup_environment
    
    # Ask user about database setup
    echo -e "${BLUE}Would you like to set up the database now? (requires PostgreSQL)${NC}"
    echo "  1) Yes, set up database with Docker"
    echo "  2) Yes, set up database with local PostgreSQL" 
    echo "  3) Skip for now"
    echo ""
    read -p "Choose option (1-3): " db_choice
    
    case $db_choice in
        1)
            print_info "Starting database with Docker..."
            docker-compose up -d postgres redis
            sleep 5
            setup_database
            ;;
        2)
            print_info "Using local PostgreSQL..."
            setup_database
            ;;
        3)
            print_warning "Skipping database setup - you'll need to set it up manually later"
            ;;
        *)
            print_warning "Invalid choice - skipping database setup"
            ;;
    esac
    
    setup_git_hooks
    create_essential_files
    
    echo ""
    print_status "🎉 Project setup completed successfully!"
    echo ""
    print_header "Next Steps"
    echo ""
    echo "1. Update your .env file with API keys and configuration:"
    echo "   ${YELLOW}nano .env${NC}"
    echo ""
    echo "2. Start the development servers:"
    echo "   ${YELLOW}npm run dev${NC}"
    echo ""
    echo "3. Or use Docker for the full stack:"
    echo "   ${YELLOW}npm run docker:dev${NC}"
    echo ""
    echo "4. Open your browser:"
    echo "   ${YELLOW}Frontend: http://localhost:3000${NC}"
    echo "   ${YELLOW}Backend:  http://localhost:3001${NC}"
    echo ""
    echo "5. Optional - Access admin tools:"
    echo "   ${YELLOW}Database: http://localhost:8080 (with Docker admin profile)${NC}"
    echo "   ${YELLOW}Redis:    http://localhost:8081 (with Docker admin profile)${NC}"
    echo ""
    print_info "For more information, check the README.md file"
    echo ""
    print_status "Happy coding! 🚀"
}

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi