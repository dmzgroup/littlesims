local firsttime = true

local function update_time_slice (self, time)
if firsttime then
   local obj = dmz.object.create ("ls_node")
   dmz.object.state (obj, nil, "LS_Large")
   dmz.object.position (obj, nil, {10,10,10})
   dmz.object.activate (obj)
   firsttime = false
end
end

local function start (self)
   self.handle = self.timeSlice:create (update_time_slice, self, self.name)
end


local function stop (self)
   if self.handle and self.timeSlice then self.timeSlice:destroy (self.handle) end
end


function new (config, name)
   local self = {
      start_plugin = start,
      stop_plugin = stop,
      name = name,
      log = dmz.log.new ("lua." .. name),
      timeSlice = dmz.time_slice.new (),
      config = config,
   }

   self.log:info ("Creating plugin: " .. name)
   
   return self
end

