#!/bin/bash
#
set -eux

script="$1"
fqdn="$2"
doctypes="$3"

echo {}
make-token $fqdn $doctypes
ACH script $script --url https://$fqdn -t /tmp/token-$fqdn.json --execute
