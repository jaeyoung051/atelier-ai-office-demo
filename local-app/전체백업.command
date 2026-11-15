#!/bin/zsh
cd "${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
node --env-file-if-exists=.env --experimental-strip-types backend/backup-cli.ts backup
read -r 'reply?Enter를 누르면 닫습니다.'
