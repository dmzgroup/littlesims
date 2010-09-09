#!/bin/sh
DEPTH=../../..
lmk -m opt -b
cp -RL $DEPTH/bin/macos-opt/littlesims.app $DEPTH
mkdir $DEPTH/littlesims.app/Contents/Frameworks/Qt
mkdir $DEPTH/littlesims.app/Contents/Frameworks/Qt/plugins
mkdir $DEPTH/littlesims.app/Contents/Frameworks/Qt/plugins/imageformats
mkdir $DEPTH/littlesims.app/Contents/Frameworks/v8
cp $DEPTH/depend/Qt/QtCore $DEPTH/littlesims.app/Contents/Frameworks/Qt
cp $DEPTH/depend/Qt/QtGui $DEPTH/littlesims.app/Contents/Frameworks/Qt
cp $DEPTH/depend/Qt/QtOpenGL $DEPTH/littlesims.app/Contents/Frameworks/Qt
cp $DEPTH/depend/Qt/QtXml $DEPTH/littlesims.app/Contents/Frameworks/Qt
cp $DEPTH/depend/Qt/QtSvg $DEPTH/littlesims.app/Contents/Frameworks/Qt
cp $DEPTH/depend/Qt/libqgif.dylib $DEPTH/littlesims.app/Contents/Frameworks/Qt/plugins/imageformats
cp $DEPTH/depend/Qt/libqjpeg.dylib $DEPTH/littlesims.app/Contents/Frameworks/Qt/plugins/imageformats
cp $DEPTH/depend/Qt/libqtiff.dylib $DEPTH/littlesims.app/Contents/Frameworks/Qt/plugins/imageformats
cp $DEPTH/depend/Qt/libqsvg.dylib $DEPTH/littlesims.app/Contents/Frameworks/Qt/plugins/imageformats
if [ -d $DEPTH/depend/QtGui.framework/Versions/4/Resources/qt_menu.nib ] ; then
cp -R $DEPTH/depend/QtGui.framework/Versions/4/Resources/qt_menu.nib $DEPTH/littlesims.app/Contents/Resources
fi
cp $DEPTH/depend/v8/lib/libv8.dylib $DEPTH/littlesims.app/Contents/Frameworks/v8
TARGET=$DEPTH/littlesims-`cat $DEPTH/tmp/macos-opt/mbraapp/buildnumber.txt`.dmg
hdiutil create -srcfolder $DEPTH/littlesims.app $TARGET
hdiutil internet-enable -yes -verbose $TARGET
rm -rf $DEPTH/littlesims.app/
INSTALLER_PATH=$DEPTH/installers
if [ ! -d $INSTALLER_PATH ] ; then
   mkdir $INSTALLER_PATH
fi
mv $TARGET $INSTALLER_PATH
