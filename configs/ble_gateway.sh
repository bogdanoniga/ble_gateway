#!/bin/bash

service bluetooth stop
service bluetooth start

cd /usr/share/ble_gateway && npm run start
