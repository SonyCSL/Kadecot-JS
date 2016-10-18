#!/bin/bash

cd ./v1/plugins/com.sonycsl.kadecot.gotapi

# First, install dependencies
npm i

# When you use DeviceConnect-NodeJS, please run below
# git submodule init && git submodule update
# (cd DeviceConnect-NodeJS && patch -p0 -R) < ./DeviceConnect-NodeJS.patch
# npm i DeviceConnect-NodeJS/packages/deviceconnect-manager
# npm i DeviceConnect-NodeJS/packages/deviceconnect-plugin-host

# Edit config.yml
cp ./config.template.yml ./config.yml

echo -en '\nGotAPI IP > '
read IPADDR

sed -i ./config.yml -e "s/hostname:.*$/hostname: ${IPADDR}/"

echo -e '\nFinished.'
