#!/bin/sh

. ../scripts/envsetup.sh
export LITTLESIMS_WORKING_DIR="./"
$RUN_DEBUG$BIN_HOME/littlesims $*
