#!/bin/bash

# ============================================
# AuraTicTac Server Setup Commands
# Server: 45.45.239.13
# ============================================

echo "=== AuraTicTac Server Setup ==="

# ============================================
# 1. POSTGRESQL DATABASE SETUP
# ============================================

echo "--- Setting up PostgreSQL ---"

# Install PostgreSQL (if not installed)
# sudo apt update
# sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
# sudo systemctl start postgresql
# sudo systemctl enable postgresql

# Create database and user
# Run as postgres user:
sudo -u postgres psql << EOF
CREATE DATABASE auratictac;
CREATE USER auratictac_user WITH ENCRYPTED PASSWORD 'TicTacAura2010@...';
GRANT ALL PRIVILEGES ON DATABASE auratictac TO auratictac_user;
\c auratictac
GRANT ALL ON SCHEMA public TO auratictac_user;
EOF

echo "Database 'auratictac' created with user 'auratictac_user'"

# Run the schema creation script
# sudo -u postgres psql -d auratictac -f scripts/001-create-database.sql

# ============================================
# 2. NGINX SETUP
# ============================================

echo "--- Setting up Nginx ---"

# Install Nginx (if not installed)
# sudo apt install -y nginx

# Copy nginx config
# sudo cp scripts/nginx.conf /etc/nginx/sites-available/auratictac
# sudo ln -s /etc/nginx/sites-available/auratictac /etc/nginx/sites-enabled/
# sudo rm /etc/nginx/sites-enabled/default

# Test nginx config
# sudo nginx -t

# Restart nginx
# sudo systemctl restart nginx

# ============================================
# 3. SSL CERTIFICATE (Let's Encrypt)
# ============================================

echo "--- Setting up SSL ---"

# Install certbot
# sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
# sudo certbot --nginx -d auratictac.com -d www.auratictac.com

# For IP-only (self-signed - NOT RECOMMENDED for production)
# sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
#   -keyout /etc/ssl/private/auratictac.key \
#   -out /etc/ssl/certs/auratictac.crt

# ============================================
# 4. NODE.JS & APPLICATION SETUP
# ============================================

echo "--- Setting up Node.js Application ---"

# Install Node.js 20 LTS
# curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
# sudo apt install -y nodejs

# Install PM2 for process management
# sudo npm install -g pm2

# Clone/deploy your application
# cd /var/www
# git clone <your-repo> auratictac
# cd auratictac

# Install dependencies
# npm install

# Build Next.js app
# npm run build

# Start with PM2
# pm2 start npm --name "auratictac-web" -- start
# pm2 start scripts/websocket-server.js --name "auratictac-ws"

# Save PM2 config
# pm2 save
# pm2 startup

# ============================================
# 5. ENVIRONMENT VARIABLES
# ============================================

echo "--- Environment Variables ---"

# Create .env file
cat > .env << EOF
# Database
DATABASE_URL=postgresql://auratictac_user:TicTacAura2010@...@localhost:5432/auratictac

# WebSocket
WS_PORT=3001
WS_HOST=0.0.0.0

# App
NODE_ENV=production
PORT=3000
EOF

# ============================================
# 6. FIREWALL SETUP
# ============================================

echo "--- Setting up Firewall ---"

# Configure UFW
# sudo ufw allow 22/tcp    # SSH
# sudo ufw allow 80/tcp    # HTTP
# sudo ufw allow 443/tcp   # HTTPS
# sudo ufw enable

# ============================================
# 7. VERIFY SETUP
# ============================================

echo "--- Verification Commands ---"

echo "Check PostgreSQL:"
echo "  sudo -u postgres psql -c '\\l' | grep auratictac"

echo "Check Nginx:"
echo "  sudo nginx -t && sudo systemctl status nginx"

echo "Check Node processes:"
echo "  pm2 status"

echo "Check ports:"
echo "  sudo netstat -tlnp | grep -E '(3000|3001|5432|80|443)'"

echo "Test database connection:"
echo "  psql -h localhost -U auratictac_user -d auratictac -c 'SELECT 1'"

echo ""
echo "=== Setup Complete ==="
echo "Access your game at: https://45.45.239.13"
