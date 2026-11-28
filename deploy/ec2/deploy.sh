#!/usr/bin/env bash
set -euo pipefail

# Usage: MAJUNGMUL_SSH_KEY=/path/key.pem bash deploy/ec2/deploy.sh dev|prod
target=${1:-}
case "$target" in
  dev) branch=dev; port=3001 ;;
  prod) branch=main; port=3000 ;;
  *) echo 'Usage: deploy/ec2/deploy.sh dev|prod' >&2; exit 2 ;;
esac
cd "$(git rev-parse --show-toplevel)"
if [[ $(git branch --show-current) != "$branch" ]]; then
  echo "Deploy $target from branch $branch only." >&2; exit 1
fi
if [[ -n $(git status --porcelain) ]]; then
  echo 'Commit working changes before deployment.' >&2; exit 1
fi
npm test
npx tsc --noEmit
npm run build:ec2
release="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
archive="$(mktemp -d)/majungmul.tar.gz"
trap 'rm -f "$archive"; rmdir "$(dirname "$archive")"' EXIT
COPYFILE_DISABLE=1 tar --no-xattrs -czf "$archive" -C .output .
ssh_args=(-o BatchMode=yes -o IdentitiesOnly=yes)
if [[ -n ${MAJUNGMUL_SSH_KEY:-} ]]; then ssh_args+=(-i "$MAJUNGMUL_SSH_KEY"); fi
host=${MAJUNGMUL_SSH_TARGET:-ec2-user@ec2-16-208-56-91.ap-northeast-3.compute.amazonaws.com}
remote_archive="/tmp/majungmul-${target}-${release}.tar.gz"
scp "${ssh_args[@]}" "$archive" "$host:$remote_archive"
ssh "${ssh_args[@]}" "$host" "sudo bash -s -- '$target' '$port' '$release' '$remote_archive'" <<'REMOTE'
set -euo pipefail
target=$1; port=$2; release=$3; archive=$4
base="/srv/majungmul/$target"
unit="majungmul-$target"
test -f "/etc/systemd/system/$unit.service"
previous=$(readlink -f "$base/current")
mkdir -p "$base/releases/$release"
tar --no-same-owner -xzf "$archive" -C "$base/releases/$release"
rm -f "$archive"
test -f "$base/releases/$release/server/index.mjs"
ln -s "$base/releases/$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
if systemctl restart "$unit" && curl --fail --silent --retry 15 --retry-connrefused --retry-delay 1 "http://127.0.0.1:$port/" -o /dev/null; then
  printf 'Deployed %s: %s\n' "$target" "$release"
else
  ln -s "$previous" "$base/current.rollback"
  mv -Tf "$base/current.rollback" "$base/current"
  systemctl restart "$unit"
  echo 'Deployment failed; restored previous release.' >&2
  exit 1
fi
REMOTE
