#!/bin/bash

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Create template_service_db if it doesn't exist
echo "Creating template_service_db..."
docker-compose exec -T postgres-db psql -U postgres -c "CREATE DATABASE template_service_db;" || echo "Database already exists"

echo "Databases initialized!"

