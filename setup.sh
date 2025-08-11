#!/bin/bash

# Setup script for docker-aur-cache
# This script ensures the required configuration files are in place

set -e

echo "🚀 Setting up docker-aur-cache..."

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "📋 Configuration file not found, copying example..."
    curl -o docker-compose.yml https://raw.githubusercontent.com/CrazyVito11/docker-aur-cache/refs/heads/master/docker-compose.prod.yml.example || {
        echo "❌ Failed to download docker-compose.yml from GitHub"
        exit 1
    }
    echo "✅ docker-compose.yml file created from example"
    echo "⚠️  Please review and customize docker-compose.yml before running docker compose"
else
    echo "✅ docker-compose.yml file already exists"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📋 Configuration file not found, copying example..."
    curl -o .env https://raw.githubusercontent.com/CrazyVito11/docker-aur-cache/refs/heads/master/.env.example || {
        echo "❌ Failed to download .env from GitHub"
        exit 1
    }
    echo "✅ .env file created from example"
    echo "⚠️  Please review and customize .env before running docker compose"
else
    echo "✅ .env file already exists"
fi

# Check if packagelist.config.json exists
if [ ! -f "packagelist.config.json" ]; then
    echo "📋 Configuration file not found, copying example..."
    curl -o packagelist.config.json https://raw.githubusercontent.com/CrazyVito11/docker-aur-cache/refs/heads/master/packagelist.config.json.example || {
        echo "❌ Failed to download packagelist.config.json from GitHub"
        exit 1
    }
    echo "✅ Configuration file created from example"
    echo "⚠️  Please review and customize packagelist.config.json before running docker compose"
else
    echo "✅ Configuration file already exists"
fi

# Check if repository directory exists
if [ ! -d "repository" ]; then
    echo "📁 Creating repository directory..."
    mkdir -p repository
    echo "✅ Repository directory created"
else
    echo "✅ Repository directory already exists"
fi

# Check if assets directory exists
if [ ! -f "assets/nginx-default.conf" ]; then
    echo "📁 Creating assets directory..."
    mkdir -p assets
    # get nginx-default.conf from git
    curl -o assets/nginx-default.conf https://raw.githubusercontent.com/CrazyVito11/docker-aur-cache/refs/heads/master/assets/nginx-default.conf || {
        echo "❌ Failed to download nginx-default.conf from GitHub"
        exit 1
    }
    echo "✅ Assets directory created"
else
    echo "✅ Assets directory already exists"
fi 

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review and customize packagelist.config.json"
echo "2. Run: docker compose up -d"