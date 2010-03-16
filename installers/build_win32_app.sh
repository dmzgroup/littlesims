#!/bin/sh
DEPTH=../../..
rm -f ./littlesimssetup.exe
lmk -m opt -b
$DEPTH/depend/InnoSetup5/ISCC.exe littlesims.iss
INSTALLER_PATH=$DEPTH/installers
if [ ! -d $INSTALLER_PATH ] ; then
   mkdir $INSTALLER_PATH
fi
cp littlesimssetup.exe $INSTALLER_PATH/MBRA-`cat $DEPTH/tmp/win32-opt/littlesimsapp/buildnumber.txt`.exe
