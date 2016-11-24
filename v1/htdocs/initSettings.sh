#!/bin/bash

RANDOM_ID=`< /dev/urandom tr -dc A-Za-z0-9 | head -c45`

echo -n "Type account name (default: MyFirstKadecot) > "
read ACCOUNT_NAME

cat <<EOF > ./settings.js
// Kadecot cloud terminal registartion URL (Eg. https://[cloud host name]/terminal_regist.html
var REGIST_URL = 'https://dev.hems.gallery/terminal_regist.html';
// Random UUID string (typically 45 random characters)
var UUID = '${RANDOM_ID}';
// Arbitrary name of your Kadecot user (Eg. Arbitrary string is accepted, but you may want to change to your favorite name
var ACCOUNT_NAME = '${ACCOUNT_NAME:-MyFirstKadecot}';
EOF

echo "Success."

