#ifndef DMZ_LITTLESIMS_PLUGIN_CONTROLS_QT_DOT_H
#define DMZ_LITTLESIMS_PLUGIN_CONTROLS_QT_DOT_H

#include <dmzQtWidget.h>
#include <dmzRuntimeDataConverterTypesBase.h>
#include <dmzRuntimeLog.h>
#include <dmzRuntimeMessaging.h>
#include <dmzRuntimePlugin.h>
#include <dmzTypesHashTableStringTemplate.h>
#include <QtGui/QWidget>
#include <ui_Controls.h>

namespace dmz {

   class LittlesimsPluginControlsQt :
         public QWidget,
         public Plugin,
         public MessageObserver,
         public QtWidget {

      Q_OBJECT

      public:
         LittlesimsPluginControlsQt (const PluginInfo &Info, Config &local);
         ~LittlesimsPluginControlsQt ();

         // Plugin Interface
         virtual void update_plugin_state (
            const PluginStateEnum State,
            const UInt32 Level);

         virtual void discover_plugin (
            const PluginDiscoverEnum Mode,
            const Plugin *PluginPtr);

         // Message Observer Interface
         virtual void receive_message (
            const Message &Type,
            const UInt32 MessageSendHandle,
            const Handle TargetObserverHandle,
            const Data *InData,
            Data *outData);

         // QtWidget Interface
         virtual QWidget *get_qt_widget ();

      protected slots:
         void on_simBox_currentIndexChanged (const QString &text);
         void on_pauseButton_clicked ();
         void on_resetButton_clicked ();
         void on_nodeSpinBox_valueChanged (int value);
         void on_linkSpinBox_valueChanged (int value);

      protected:
         void _init (Config &local);

         Log _log;
         DataConverterFloat64 _convert;
         DataConverterBoolean _boolConvert;
         Message _resetMsg;
         Message _activateSimMsg;
         Message _updateNodeCountMsg;
         Message _updateLinkCountMsg;
         HashTableStringTemplate<Message> _simTable;
         Ui::Controls _ui;
         Boolean _inChange;
         Boolean _active;

      private:
         LittlesimsPluginControlsQt ();
         LittlesimsPluginControlsQt (const LittlesimsPluginControlsQt &);
         LittlesimsPluginControlsQt &operator= (const LittlesimsPluginControlsQt &);

   };
};

#endif // DMZ_LITTLESIMS_PLUGIN_CONTROLS_QT_DOT_H
