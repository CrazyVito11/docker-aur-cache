FROM --platform=linux/amd64 archlinux:multilib-devel

# Update the image and install dependencies
RUN pacman-key --init
RUN pacman -Sy --noconfirm archlinux-keyring
RUN pacman -Syu --noconfirm fcron nodejs-lts-iron npm docker

# Create the builder user
RUN useradd -u 1000 -ms /bin/bash builder
RUN usermod -a -G fcron builder
RUN chmod o+x /usr/sbin/fcron
USER builder
RUN mkdir -p /home/builder
WORKDIR /home/builder

# Build build-manager application
USER builder
COPY ./build-manager /build-manager
USER root
RUN chown -R builder /build-manager
USER builder
WORKDIR /build-manager
RUN npm install && npm run build

# Copy builder application
USER builder
COPY ./builder /builder
USER root
RUN chown -R builder /builder

# Copy script
USER root
COPY /build-manager/docker/build-packages.sh /repository-builder/
COPY /build-manager/docker/clean-repository-archive.sh /repository-builder/
RUN chmod 777 /repository-builder/build-packages.sh
RUN chmod 777 /repository-builder/clean-repository-archive.sh
USER builder

# Configure fcron
USER root
COPY /build-manager/docker/fcron_builder.tab /tmp/
RUN fcrontab -u builder /tmp/fcron_builder.tab

WORKDIR /repository-builder
RUN chmod 777 /repository-builder

CMD ["fcron", "--foreground", "--firstsleep", "0"]
