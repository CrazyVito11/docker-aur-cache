FROM --platform=linux/amd64 archlinux:multilib-devel

# Update the image and install dependencies
ENV CARCH=x86_64
RUN pacman-key --init
RUN pacman -Sy --noconfirm archlinux-keyring
RUN pacman -Syu --noconfirm git base-devel fcron nodejs-lts-jod npm

# Create the builder user
RUN useradd -u 1000 -ms /bin/bash builder
RUN usermod -a -G fcron builder
RUN chmod o+x /usr/sbin/fcron
RUN echo "builder ALL=(ALL) NOPASSWD:/usr/bin/pacman -S --noconfirm *, /usr/bin/pacman -U --noconfirm *, /usr/bin/pacman -Fy *" >> /etc/sudoers
USER builder
RUN mkdir -p /home/builder
WORKDIR /home/builder

# Build builder application
USER builder
COPY . /builder
USER root
RUN chown -R builder /builder
USER builder
WORKDIR /builder
RUN npm install && npm run build

WORKDIR /repository-builder
USER root
RUN chmod 777 /repository-builder
USER builder

CMD ["fcron", "--foreground", "--firstsleep", "0"]
