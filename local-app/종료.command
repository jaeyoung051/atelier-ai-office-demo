#!/bin/zsh
cd "${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
node --experimental-strip-types tools/manage.ts stop
if [[ $? != 0 ]]; then read -r 'reply?Enter를 누르면 닫습니다.'; fi
