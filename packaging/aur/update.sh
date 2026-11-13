#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
# Points the AUR package at a new release: `./update.sh 0.4.0` sets the
# version, resets the release number, takes the checksum of the .deb of
# the GitHub release and writes .SRCINFO again. Publishing to the AUR is
# then a commit and a push to the AUR repository, by its maintainer.
set -eu
version="$1"
cd "$(dirname "$0")"
url="https://github.com/mumpkin/musubi/releases/download/v${version}/Musubi_${version}_amd64.deb"
licence="https://raw.githubusercontent.com/mumpkin/musubi/v${version}/LICENSE"
sum="$(curl -fsSL "$url" | sha256sum | cut -d ' ' -f 1)"
licence_sum="$(curl -fsSL "$licence" | sha256sum | cut -d ' ' -f 1)"
sed -i \
	-e "s/^pkgver=.*/pkgver=${version}/" \
	-e "s/^pkgrel=.*/pkgrel=1/" \
	-e "s/^sha256sums=('[0-9a-f]*'/sha256sums=('${sum}'/" \
	-e "s/^            '[0-9a-f]*')/            '${licence_sum}')/" \
	PKGBUILD
makepkg --printsrcinfo > .SRCINFO
echo "musubi-bin ${version}: ${sum}"
