#!/bin/bash

# Stop if any command fails
set -e

REPOSITORY_BUILDER_PATH="/repository-builder"
REPOSITORY_BUILDER_PACKAGES_PATH="$REPOSITORY_BUILDER_PATH/packages"

PACMAN_REPOSITORY_NAME="sb-aur-cache"
PACMAN_REPOSITORY_ARCH="x86_64"
PACMAN_REPOSITORY_PATH="/repository"

PACMAN_REPOSITORY_DEPLOYMENT_PATH="$PACMAN_REPOSITORY_PATH/$PACMAN_REPOSITORY_ARCH/$PACMAN_REPOSITORY_NAME"


# -------------------------------------------------------------------

isAurPackage() {
    PACKAGE_NAME="$1"

    if pacman -Si "$PACKAGE_NAME" ; then
        return false
    else
        return true
    fi
}

buildAurPackage() {
    ORIGINAL_PATH=$(pwd)
    PACKAGE_NAME="$1"

    echo "Building $PACKAGE_NAME..."

    cd "$REPOSITORY_BUILDER_PACKAGES_PATH"

    git clone "https://aur.archlinux.org/$package_name.git"
    cd "$package_name"



    # TODO: Build AUR package recursively
    # TODO: Install build dependencies
    # TODO: Detect if a package is an AUR package (something like: pacman -Si <package_name>)
    # TODO: Build and install build dependencies (if they are an AUR package)
    # TODO: Build runtime dependencies (if they are an AUR package)
    # TODO: Build the AUR package itself


    cd "$ORIGINAL_PATH"
}


# -------------------------------------------------------------------

echo "Removing old builder packages (if it exists)..."
[[ -d $REPOSITORY_BUILDER_PACKAGES_PATH ]] && rm -rf "$REPOSITORY_BUILDER_PACKAGES_PATH"
mkdir "$REPOSITORY_BUILDER_PACKAGES_PATH"

cd "$REPOSITORY_BUILDER_PACKAGES_PATH"

echo "Compiling all packages..."
cat "$REPOSITORY_BUILDER_PATH/packagelist.txt" | while read package_name
do
    buildAurPackage $package_name
done

cd "$REPOSITORY_BUILDER_PATH"

# TODO: Remove old database files if they exist

echo "Adding packages to database..."
repo-add "$REPOSITORY_BUILDER_PATH/$PACMAN_REPOSITORY_NAME.db.tar.gz" "$REPOSITORY_BUILDER_PATH"/**/*.pkg.tar.zst


echo "Removing old database and packages from repository deployment path..."
rm "$PACMAN_REPOSITORY_DEPLOYMENT_PATH/$PACMAN_REPOSITORY_NAME.db"
rm "$PACMAN_REPOSITORY_DEPLOYMENT_PATH/$PACMAN_REPOSITORY_NAME.files"
rm -rf "$PACMAN_REPOSITORY_DEPLOYMENT_PATH/*.pkg.tar.zst"


echo "Copying package database to repository deployment path..."
mv "$REPOSITORY_BUILDER_PATH/$PACMAN_REPOSITORY_NAME.db.tar.gz" "$PACMAN_REPOSITORY_DEPLOYMENT_PATH/$PACMAN_REPOSITORY_NAME.db"
mv "$REPOSITORY_BUILDER_PATH/$PACMAN_REPOSITORY_NAME.files.tar.gz" "$PACMAN_REPOSITORY_DEPLOYMENT_PATH/$PACMAN_REPOSITORY_NAME.files"


echo "Copying packages to repository deployment path..."
mv "$REPOSITORY_BUILDER_PATH"/**/*.pkg.tar.zst "$PACMAN_REPOSITORY_DEPLOYMENT_PATH/"