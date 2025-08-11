# Multi-stage build for build-manager
FROM archlinux:multilib-devel AS base

# Update the image and install dependencies
RUN pacman-key --init
RUN pacman -Sy --noconfirm archlinux-keyring
RUN pacman -Syu --noconfirm fcron nodejs-lts-iron npm docker

# Create the builder user with default values
RUN useradd -u 1000 -ms /bin/bash builder
RUN usermod -a -G fcron builder
RUN chmod o+x /usr/sbin/fcron

ARG DOCKER_GID=964
ENV DOCKER_GID=$DOCKER_GID

# Create docker group with default GID and add builder to it
RUN groupadd -g $DOCKER_GID docker || true
RUN usermod -a -G docker builder

# Set up Docker socket permissions
RUN echo '#!/bin/bash' > /usr/local/bin/setup-docker-permissions.sh && \
    echo 'chmod 666 /var/run/docker.sock' >> /usr/local/bin/setup-docker-permissions.sh && \
    chmod +x /usr/local/bin/setup-docker-permissions.sh

# Build stage for build-manager
FROM base AS build-manager-builder
WORKDIR /build-manager
COPY ./build-manager/package*.json ./
RUN npm ci
COPY ./build-manager/src ./src
COPY ./build-manager/tsconfig.json ./
RUN npm run build

# Build stage for builder
FROM base AS builder-builder
WORKDIR /builder
COPY ./builder/package*.json ./
RUN npm ci
COPY ./builder/src ./src
COPY ./builder/tsconfig.json ./
COPY ./builder/.dockerignore ./
COPY ./builder/Dockerfile ./
RUN npm run build

# Final stage
FROM base AS final

# Copy built applications and dependencies
COPY --from=build-manager-builder --chown=builder:builder /build-manager/dist /build-manager/dist
COPY --from=build-manager-builder --chown=builder:builder /build-manager/package*.json /build-manager/
COPY --from=build-manager-builder --chown=builder:builder /build-manager/node_modules /build-manager/node_modules
COPY --from=builder-builder --chown=builder:builder /builder /builder

# Copy scripts
COPY ./build-manager/docker/build-packages.sh /repository-builder/
COPY ./build-manager/docker/clean-repository-archive.sh /repository-builder/
RUN chown builder:builder /repository-builder/build-packages.sh /repository-builder/clean-repository-archive.sh
RUN chmod 755 /repository-builder/build-packages.sh /repository-builder/clean-repository-archive.sh

# Configure fcron
COPY ./build-manager/docker/fcron_builder.tab /tmp/
RUN chown builder:builder /tmp/fcron_builder.tab
RUN runuser -u builder -- fcrontab /tmp/fcron_builder.tab

WORKDIR /repository-builder
RUN chown builder:builder /repository-builder
RUN chmod 755 /repository-builder

USER root
CMD ["fcron", "--foreground", "--firstsleep", "0"]