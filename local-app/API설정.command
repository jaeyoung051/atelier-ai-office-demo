#!/bin/zsh
cd "${0:A:h}"
if [[ ! -f .env ]]; then cp .env.example .env; chmod 600 .env; fi
open -a TextEdit .env
