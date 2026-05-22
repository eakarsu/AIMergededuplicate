#!/bin/bash

# CatalogIQ - E-Commerce Catalog Deduplication Platform
# Start script with port cleanup, database setup, seeding, and hot-reload

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                                                      ║${NC}"
echo -e "${PURPLE}║   ${GREEN}CatalogIQ${PURPLE} - E-Commerce Catalog Deduplication     ║${NC}"
echo -e "${PURPLE}║                                                      ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}[OK]${NC} Environment variables loaded"
else
  echo -e "${RED}[ERROR]${NC} .env file not found. Please create it first."
  exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
DB_NAME=${DB_NAME:-ecommerce_catalog}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

# Function to kill processes on a port
kill_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pids" ]; then
    echo -e "${YELLOW}[CLEANUP]${NC} Killing processes on port $port (PIDs: $pids)"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

# Cleanup function
cleanup() {
  echo ""
  echo -e "${YELLOW}[SHUTDOWN]${NC} Stopping all services..."
  kill_port $BACKEND_PORT
  kill_port $FRONTEND_PORT
  # Kill background processes
  jobs -p | xargs kill 2>/dev/null || true
  echo -e "${GREEN}[OK]${NC} All services stopped."
  exit 0
}

trap cleanup SIGINT SIGTERM

# Step 1: Clean up used ports
echo -e "${BLUE}[STEP 1]${NC} Cleaning up ports..."
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT
echo -e "${GREEN}[OK]${NC} Ports $BACKEND_PORT and $FRONTEND_PORT are free"

# Step 2: Setup PostgreSQL database
echo -e "${BLUE}[STEP 2]${NC} Setting up PostgreSQL database..."

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
  echo -e "${YELLOW}[INFO]${NC} Starting PostgreSQL..."
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
  sleep 2
fi

# Create database if not exists
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw $DB_NAME; then
  echo -e "${YELLOW}[INFO]${NC} Creating database '$DB_NAME'..."
  createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
fi
echo -e "${GREEN}[OK]${NC} Database '$DB_NAME' is ready"

# Step 3: Install dependencies
echo -e "${BLUE}[STEP 3]${NC} Installing dependencies..."

cd "$SCRIPT_DIR/backend"
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}[INFO]${NC} Installing backend dependencies..."
  npm install
else
  echo -e "${GREEN}[OK]${NC} Backend dependencies already installed"
fi

cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}[INFO]${NC} Installing frontend dependencies..."
  npm install
else
  echo -e "${GREEN}[OK]${NC} Frontend dependencies already installed"
fi

cd "$SCRIPT_DIR"

# Step 4: Drop and recreate tables, seed data
echo -e "${BLUE}[STEP 4]${NC} Seeding database..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
  DROP TABLE IF EXISTS ai_jobs CASCADE;
  DROP TABLE IF EXISTS data_quality_reports CASCADE;
  DROP TABLE IF EXISTS audit_log CASCADE;
  DROP TABLE IF EXISTS price_history CASCADE;
  DROP TABLE IF EXISTS bulk_imports CASCADE;
  DROP TABLE IF EXISTS merge_history CASCADE;
  DROP TABLE IF EXISTS duplicate_group_items CASCADE;
  DROP TABLE IF EXISTS duplicate_groups CASCADE;
  DROP TABLE IF EXISTS merge_decisions CASCADE;
  DROP TABLE IF EXISTS dedupe_rules CASCADE;
  DROP TABLE IF EXISTS products CASCADE;
  DROP TABLE IF EXISTS categories CASCADE;
  DROP TABLE IF EXISTS vendors CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
" > /dev/null 2>&1

cd "$SCRIPT_DIR/backend"
node src/db/seed.js
echo -e "${GREEN}[OK]${NC} Database seeded with sample data"

cd "$SCRIPT_DIR"

# Step 5: Start services with hot-reload
echo -e "${BLUE}[STEP 5]${NC} Starting services with hot-reload..."

# Start backend with --watch for hot-reload
echo -e "${YELLOW}[INFO]${NC} Starting backend on port $BACKEND_PORT (with hot-reload)..."
cd "$SCRIPT_DIR/backend"
npm run dev &
BACKEND_PID=$!

# Start frontend with Vite (built-in HMR)
echo -e "${YELLOW}[INFO]${NC} Starting frontend on port $FRONTEND_PORT (with HMR)..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

cd "$SCRIPT_DIR"

sleep 3

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║   All services are running!                          ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║   Frontend:  http://localhost:${FRONTEND_PORT}                    ║${NC}"
echo -e "${GREEN}║   Backend:   http://localhost:${BACKEND_PORT}                    ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║   Login:     admin@catalog.com / admin123            ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║   Press Ctrl+C to stop all services                  ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Wait for processes
wait
