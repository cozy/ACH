#!/bin/bash

set -eo pipefail

script=$1
domain=$2
if [[ $script == "" || $domain == "" ]]; then
    echo "Usage: ./executeACHScriptBatch.sh <script> <domain>"
    echo "Example: ./executeACHScriptBatch.sh deleteOrphanOperations cozy.rocks"
    exit 1
fi

set -u

host=""
if [[ $domain == "cozy.wtf" ]]; then
    host="gozy-adm-dev"
elif [[ $domain == "cozy.works" ]]; then
    host="gozy-adm-int"
elif [[ $domain == "cozy.rocks" ]]; then
    host="gozy-adm-stg"
elif [[ $domain == "mycozy.cloud" ]]; then
    host="gozy-adm-prod"
fi

# Check the domain
if [[ $host == "" ]]; then
    echo "<domain> should be one of [cozy.wtf, cozy.works, cozy.rocks, mycozy.cloud]"
    exit 1
fi

# Check that we have a file containing the list of instances
instanceFile="/tmp/$domain-instances"
if [[ ! -f $instanceFile ]]; then
    echo "You should generate $instanceFile (ssh $host.int.cozycloud.cc cozy-stack instances ls | sort > $instanceFile)"
    exit 1
fi

# Get the necessary doctypes from the script
doctypes=$(ACH script $script -d)

# Only run on a subset of the instances
min=${3:-0}
max=${4:-10}
delta=$((max - min))

echo "Instance file : $instanceFile"
echo "Running $script on $domain instances $min to $max"

cat /tmp/$domain-instances | tail -n +$min | head -n $delta \
    | cut -d '.' -f 1  \
    | xargs -P 12 -I '{}' -L 1 ./execScriptOnInstance.sh "$script" "{}.$domain" "$doctypes" | ts | tee -a $domain.log
