#!/bin/bash

set -e

# First, ensure that required directories are made
mkdir -p /repository/archive
mkdir -p /repository/build-reports


cd /build-manager
node ./dist/build-manager.js \
    --builder_image_name=docker-aur-cache-builder \
    --packagelist_configuration_path=/repository-builder/packagelist.config.json \
    --builder_dir=/builder \
    --package_staging_dir=/package-staging \
    --build_report_dir=/repository/build-reports \
    --repository_archive_dir=/repository/archive \
    --repository_dir=/repository \
    --repository_name=$COMPOSE_PROJECT_NAME
