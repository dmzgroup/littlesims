#include "dmzLittlesimsPluginControlsQt.h"
#include <dmzRuntimePluginFactoryLinkSymbol.h>
#include <dmzRuntimePluginInfo.h>
#include <dmzRuntimeConfig.h>
#include <dmzRuntimeConfigToTypesBase.h>

dmz::LittlesimsPluginControlsQt::LittlesimsPluginControlsQt (
      const PluginInfo &Info,
      Config &local) :
      Plugin (Info),
      MessageObserver (Info),
      QtWidget (Info),
      _log (Info),
      _convert (Info),
      _boolConvert (Info),
      _inChange (False),
      _active (False) {

   _ui.setupUi (this);
   _init (local);
   adjustSize ();
}


dmz::LittlesimsPluginControlsQt::~LittlesimsPluginControlsQt () {

   _simTable.empty ();
}


// Plugin Interface
void
dmz::LittlesimsPluginControlsQt::update_plugin_state (
      const PluginStateEnum State,
      const UInt32 Level) {

   if (State == PluginStateInit) {

   }
   else if (State == PluginStateStart) {

   }
   else if (State == PluginStateStop) {

   }
   else if (State == PluginStateShutdown) {

   }
}


void
dmz::LittlesimsPluginControlsQt::discover_plugin (
      const PluginDiscoverEnum Mode,
      const Plugin *PluginPtr) {

   if (Mode == PluginDiscoverAdd) {

   }
   else if (Mode == PluginDiscoverRemove) {

   }
}


// Message Observer Interface
void
dmz::LittlesimsPluginControlsQt::receive_message (
      const Message &Type,
      const UInt32 MessageSendHandle,
      const Handle TargetObserverHandle,
      const Data *InData,
      Data *outData) {

   if (Type == _updateNodeCountMsg) {

      _ui.nodeSlider->setValue ((int)_convert.to_float64 (InData));
   }
   else if (Type == _updateLinkCountMsg) {

      _ui.linkSlider->setValue ((int)_convert.to_float64 (InData));
   }
   else if (Type == _activateSimMsg) {

      _ui.pauseButton->setText (_active ? "Pause" : "Start");
   }
   else {

      HashTableStringIterator it;
      Message *ptr (0);
      String found;

      while (!found && _simTable.get_next (it, ptr)) {

         if (Type == *ptr) { found = it.get_hash_key (); }
      }

      if (found) {

         const int Index = _ui.simBox->findData (found.get_buffer ());

         if (Index > -1) { _ui.simBox->setCurrentIndex (Index); }
      }
   }
}


// QtWidget Interface
QWidget *
dmz::LittlesimsPluginControlsQt::get_qt_widget () { return this; }


// Protected slots
void
dmz::LittlesimsPluginControlsQt::on_simBox_currentIndexChanged (const QString &text) {

   Message *ptr = _simTable.lookup (qPrintable (text));
   if (ptr) { ptr->send (); }
}


void
dmz::LittlesimsPluginControlsQt::on_pauseButton_clicked () {

   _active = _active ? False : True;
   Data out = _boolConvert.to_data (_active);
   _activateSimMsg.send (&out);
}


void
dmz::LittlesimsPluginControlsQt::on_resetButton_clicked () {

   _resetMsg.send ();
}


void
dmz::LittlesimsPluginControlsQt::on_nodeSpinBox_valueChanged (int value) {

   if (!_inChange) {

      _inChange = True;

      Data out = _convert.to_data ((Float64)value);
      _updateNodeCountMsg.send (&out);
      _ui.nodeSlider->setValue (value);
      _inChange = False;
   }
}


void
dmz::LittlesimsPluginControlsQt::on_linkSpinBox_valueChanged (int value) {

   if (!_inChange) {

      _inChange = True;

      Data out = _convert.to_data ((Float64)value);
      _updateLinkCountMsg.send (&out);
      _ui.linkSlider->setValue (value);
      _inChange = False;
   }
}


// LittlesimsPluginControlsQt Interface
void
dmz::LittlesimsPluginControlsQt::_init (Config &local) {

   RuntimeContext *context = get_plugin_runtime_context ();

   _resetMsg = config_create_message (
      "reset-message.name",
      local,
      "Reset_Simulation_Message",
      context,
      &_log);

   _activateSimMsg = config_create_message (
      "activate-simulation-message.name",
      local,
      "Activate_Simulation_Message",
      context,
      &_log);

   subscribe_to_message (_activateSimMsg);

   _updateNodeCountMsg = config_create_message (
      "update-node-count-message.name",
      local,
      "Update_Node_Count_Message",
      context,
      &_log);

   subscribe_to_message (_updateNodeCountMsg);

   _updateLinkCountMsg = config_create_message (
      "update-link-count-message.name",
      local,
      "Update_Link_Count_Message",
      context,
      &_log);

   subscribe_to_message (_updateLinkCountMsg);

   Config simList;

   if (local.lookup_all_config ("sim", simList)) {

      ConfigIterator it;
      Config sim;

      while (simList.get_next_config (it, sim)) {

         const String Name = config_to_string ("name", sim);
         Message msg = config_create_message ("message", sim, "", context, &_log);

         if (Name && msg) {

            Message *ptr = new Message (msg);

            if (ptr && _simTable.store (Name, ptr)) {

               _ui.simBox->addItem (Name.get_buffer ());
               subscribe_to_message (msg);
            }
            else if (ptr) {

               _log.error << "Failed to register message: " << msg.get_name ()
                  << " for simulation name: " << Name << ". Possible duplicate?" << endl;
               delete ptr; ptr = 0;
            }
         }
         else {

            if (!Name) { _log.error << "Simulation name not specified." << endl; }
            if (!msg) { _log.error << "Simulation message not specified." << endl; }
         }
      }
   }
}


extern "C" {

DMZ_PLUGIN_FACTORY_LINK_SYMBOL dmz::Plugin *
create_dmzLittlesimsPluginControlsQt (
      const dmz::PluginInfo &Info,
      dmz::Config &local,
      dmz::Config &global) {

   return new dmz::LittlesimsPluginControlsQt (Info, local);
}

};
