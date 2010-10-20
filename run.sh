#!/bin/sh

. ../scripts/envsetup.sh

export DMZ_APP_NAME=littlesims
$RUN_DEBUG$BIN_HOME/dmzAppQt -f config/canvas.xml config/common.xml config/input.xml config/js.xml config/resource.xml config/runtime.xml config/version.xml $*
