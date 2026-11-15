#!/bin/zsh
cd "${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null; then
 echo 'Node.js 22.20.x 설치가 필요합니다.'
 read -r 'reply?Enter를 누르면 닫습니다.'
 exit 1
fi
node --env-file-if-exists=.env --experimental-strip-types tools/manage.ts start
if [[ $? != 0 ]]; then read -r 'reply?Enter를 누르면 닫습니다.'; exit 1; fi
PORT=$(node --env-file-if-exists=.env -e 'process.stdout.write(process.env.PIXFFICE_PORT||"4313")')
open "http://127.0.0.1:$PORT"
