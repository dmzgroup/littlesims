var dmz =
   { object: require("dmz/components/object")
   , objectType: require("dmz/runtime/objectType")
   , defs: require("dmz/runtime/definitions")
   , data: require("dmz/runtime/data")
   , mask: require("dmz/types/mask")
   , matrix: require("dmz/types/matrix")
   , message: require("dmz/runtime/messaging")
   , sphere: require("dmz/runtime/sphere")
   , time: require("dmz/runtime/time")
   , ui:
      { loader: require("dmz/ui/uiLoader")
      , mainWindow: require("dmz/ui/mainWindow")
      , consts: require("dmz/ui/consts")
      }
   , util: require("dmz/types/util")
   , vector: require("dmz/types/vector")
   }

// UI windows

   , ControlsForm = dmz.ui.loader.load("./scripts/Controls.ui")
   , ControlsDock = dmz.ui.mainWindow.createDock
     ("Controls"
     , { area: dmz.ui.consts.LeftDockWidgetArea, floating: true }
     , ControlsForm
     )
   , SpeedBox = ControlsForm.lookup("speedBox")

// Constant decls

     , NodeType = dmz.objectType.lookup ("ls_node")
     , NodeLinkHandle = dmz.defs.createNamedHandle("Node_Link")
     , AngleHandle = dmz.defs.createNamedHandle("Angle_Handle")
     , RadiusHandle = dmz.defs.createNamedHandle("Radius_Handle")
     , SmallState = dmz.defs.lookupState("LS_Small")
     , MediumState = dmz.defs.lookupState("LS_Medium")
     , LargeState = dmz.defs.lookupState("LS_Large")
     , MaxRadius = 285
     , HalfMaxRadius = MaxRadius * 0.5
     , NodeSpeed = 30
     , Arena =
          { max: dmz.vector.create([300, 0, 300])
          , min: dmz.vector.create([-300, 0, -300])
          }
     , MiteType = dmz.objectType.lookup("mite")
     , ChipType = dmz.objectType.lookup("chip")
     , CountHandle = dmz.defs.createNamedHandle ("Chip_Count")
     , ChipOffset = dmz.vector.create (0, 0, -14)
     , UnitMatrix = dmz.matrix.create ()
     , MaxTurn = Math.PI / 2
     , TurnDelay = 3
     , Speed = 300
     , WaitTime = 1

// Global variables
     , Mites = []
       /*
       { object: int Handle
       , pos: Vector position
       , ori: Matrix orientation
       , nextTurn: Number nextTurn
       , chip: reference to element of Chips[]
       , timer: Time until haul change
       }
       */
     , Chips = []
       /*
       { object: int Handle
       , pos: Vector position
       , mite: reference to an element of Mites[]
       }
       */
     , ChipHandleMap = {} // Map handle to element of Chips[]
     , ClusterSphere = dmz.sphere.create()
     , HaulSphere = dmz.sphere.create()

     , objectCount = 50
     , linkCount = 100
     , active = false
     , reset = true

     , index = []
     , objects = {}
     , links = []
     , grid = null
     , offset = 30
     , realLinkCount = 0
     , timeSlice

// Function decls

   , init
   , update
   , varRandom
   , radiusPosition
   , randomPosition
   , isLinked
   , findThirdObject
   , clearCanvas
   , initScaleFree
   , updateScaleFree
   , initSmallWorld
   , updateSmallWorld
   , rankNodes
   , updateTimeSlice
   , linkObjects
   , unlinkObjects

   , initMites
   , updateMiteSimulation
   , calcNextTurnTime
   , validatePosition
   , updateMites
   , updateObjectCount
   , updateLinkCount
   , findChipCluster
   , updateChipClusters
   , findNearestChip
   , updateHaul
   ;

varRandom = function (min, max, offset) {
   var result = 0
   if (offset > 0) {
      var range = Math.floor ((max - min) / offset)
      result = dmz.util.randomInt (0, range - 1);
   }
   return Math.floor (result)
};

radiusPosition = function (angle, radius) {
   if (!radius) { radius = MaxRadius; }
   return dmz.vector.create (Math.sin (angle) * radius, 0, Math.cos (angle) * radius)
};

randomPosition = function () {
   var x = 0
     , z = 0
     , done = false
     ;

   while (!done) {
      x = varRandom (Arena.min.x, Arena.max.x, offset);
      z = varRandom (Arena.min.z, Arena.max.z, offset);
      if (!grid) { grid = {}; }
      if (!grid[x]) { grid[x] = {}; }
      if (!grid[x][z]) {
         grid[x][z] = true;
         done = true;
      }
   }
   x = (x * offset) + Arena.min.x + offset;
   if (x < Arena.min.x + 15) { x = Arena.min.x + 15; }
   if (x > Arena.max.x - 15) { x = Arena.max.x - 15; }
   z = (z * offset) + Arena.min.z + offset;
   if (z < Arena.min.z + 15) { z = Arena.min.z + 15; }
   if (z > Arena.max.z - 15) { z = Arena.max.z - 15; }
   return dmz.vector.create (x, 0, z);
};

isLinked = function (obj1, obj2) {
   var sub = dmz.object.subLinks (obj1, NodeLinkHandle)
     , superLink = dmz.object.superLinks (obj1, NodeLinkHandle)
     , resultSub = false
     , resultSuper = false
     ;
   if (sub) {
      sub.forEach (function (key) { if (key === obj2) { resultSub = true; } });
   }

   if (superLink) {
      superLink.forEach(function (key) { if (key === obj2) { resultSuper = true; } });
   }

   return resultSub || resultSuper;
};


findThirdObject = function (obj1, obj2, minLinkCount) {
   var place = dmz.util.randomInt(0, index.length - 1)
     , start = place
     , done = false
     , result = null
     , current
     ;
   if (!minLinkCount) { minLinkCount = 0; }
   while (!done) {
      if (place >= index.length) { place = 0; }
      current = index[place];
      if ((current.handle != obj1) && (current.handle != obj2) &&
            (current.links >= minLinkCount)) {
         result = current;
         done = true;
      }
      else {
         place += 1;
         if (place === start) { done = true; }
      }
   }
   return result ? result.handle : 0;
};

clearCanvas = function () {
   var maxLinks
     , data
     , mite
     , chip
     ;

   index.forEach (function (key) {
      dmz.object.destroy (key.handle);
   });
   objects = {};
   index = [];
   links = [];
   grid = undefined;
   maxLinks = Math.floor ((objectCount - 1) * 0.5 * objectCount * 0.8);
   if (linkCount > maxLinks) {
      linkCount = maxLinks;
      ControlsForm.lookup("linkSpinBox").value(linkCount);
   }

   while (Mites.length > 0) {

      mite = Mites.pop();
      dmz.object.destroy (mite.object);
      mite.object = 0;
      mite.pos = dmz.vector.create();
      mite.ori = dmz.matrix.create();
      mite.chip = false;
   }
   while (Chips.length > 0) {

      chip = Chips.pop();
      dmz.object.destroy (chip.object);
      chip.object = 0;
      chip.pos = dmz.vector.create();
      chip.mite = false;
   }
}

initScaleFree = function () {
   var offset
     , v
     , obj
     , angle
     , count
     , loops
     , done
     , obj1
     , obj2
     ;

   clearCanvas ();
   offset = Math.PI * 2 / objectCount;

   for (v = 0; v < objectCount; v += 1) {
      obj = dmz.object.create (NodeType);
      angle = v * offset;
      dmz.object.scalar (obj, AngleHandle, angle);
      dmz.object.scalar (obj, RadiusHandle, MaxRadius);
      dmz.object.position (obj, null, radiusPosition (angle));
      dmz.object.state (obj, null, SmallState);
      index[v] = { handle: obj, links: 0 };
      objects[obj] = index[v];
      dmz.object.activate (obj);
   }
   count = 0;
   loops = linkCount * 2;
   realLinkCount = 0;
   done = false;
   while (!done) {
      obj1 = dmz.util.randomInt (0, objectCount - 1);
      obj2 = dmz.util.randomInt (0, objectCount - 1);
      if (obj1 != obj2) {
         obj1 = index[obj1].handle;
         obj2 = index[obj2].handle;
         if (!isLinked (obj1, obj2)) {
            links.push (dmz.object.link(NodeLinkHandle, obj1, obj2));
            realLinkCount += 1;
         }
      }
      count += 1
      if (realLinkCount === linkCount) { done = true; }
      else if (loops <= count) { done = true; }
   }
}

init = initScaleFree;

updateScaleFree = function (time) {
   var place = dmz.util.randomInt (0, links.length - 1)
     , link = links[place]
     , attr
     , obj1
     , obj2
     , obj3
     , d1
     , d2
     , d3
     , origLink
     , maxLinks
     , ratio
     , radius
     , angle
     , targetRadius
     , diff
     , mod
     , obj
     , count
     ;
   if (link) {
      obj = dmz.object.linkedObjects (link);
      if (obj) {
         attr = obj.attribute;
         obj1 = obj.sub;
         obj2 = obj.super;
      }
      if (obj1 && obj2) {
         obj3 = findThirdObject (obj1, obj2, 1);
         if (obj3) {
            d1 = objects[obj1].links;
            d2 = objects[obj2].links;
            d3 = objects[obj3].links;
            if ((d3 > d1) && (d1 > d2)) {
               if (!isLinked (obj1, obj3)) {
                  dmz.object.unlink (links[place]);
                  links[place] = dmz.object.link (NodeLinkHandle, obj1, obj3);
               }
            }
            else if ((d3 > d2) && (d2 > d1)) {
               if (!isLinked (obj2, obj3)) {
                  dmz.object.unlink (links[place]);
                  links[place] = dmz.object.link (NodeLinkHandle, obj2, obj3);
               }
            }
//            if ((d3 > d1) || (d3 > d2)) {
//               origLink = link;
//               links[place] = -1;
//               if ((d1 > d2)) {
//                  if (!isLinked (obj1, obj3)) {
//                     links[place] = dmz.object.link (NodeLinkHandle, obj1, obj3);
//                  }
//               }
//               else if (!isLinked (obj2, obj3)) {
//                  links[place] = dmz.object.link (NodeLinkHandle, obj2, obj3);
//               }

//               if (links[place] === -1) { links[place] = origLink; }
//               else { dmz.object.unlink (origLink); }
//            }
         }
      }
   }
   else { self.log.error ("No link found at. " + place); }

   maxLinks = 0;
   count = 0;
   index.forEach(function (key) {
      if (key.links > maxLinks) { maxLinks = key.links; }
      count += key.links;
   });
   if (count != (realLinkCount * 2)) {
      self.log.error("Link count wrong. Should be. " + realLinkCount + " is. " + count);
   }
   if (maxLinks > 0) {
      index.forEach(function (obj) {
         ratio = (maxLinks - obj.links) / maxLinks;
         radius = dmz.object.scalar (obj.handle, RadiusHandle);
         angle = dmz.object.scalar (obj.handle, AngleHandle);
         targetRadius = (ratio * HalfMaxRadius) + HalfMaxRadius;
         diff = radius - targetRadius;
         if (Math.abs (diff) > NodeSpeed * time) {
            mod = (diff >= 0) ? 1 : -1;
            diff = NodeSpeed * time * mod;
            radius = radius - diff;
         }
         else { radius = targetRadius; }
         dmz.object.scalar (obj.handle, RadiusHandle, radius);
         dmz.object.position (obj.handle, null, radiusPosition (angle, radius));
      });
   }
};

initSmallWorld = function () {
   var idx
     , obj
     , obj1
     , obj2
     , done
     , count
     , loops
     ;
   clearCanvas();
   for (idx = 0; idx < objectCount; idx += 1) {
      obj = dmz.object.create (NodeType);
      dmz.object.position (obj, null, randomPosition());
      dmz.object.state (obj, null, SmallState);
      index[idx] = { handle: obj, links: 0 };
      objects[obj] = index[idx];
      dmz.object.activate (obj);
   }
   count = 0;
   loops = linkCount * 2;
   realLinkCount = 0;
   done = false;
   while (!done) {
      obj1 = dmz.util.randomInt (0, objectCount - 1);
      obj2 = dmz.util.randomInt (0, objectCount - 1);
      if (obj1 != obj2) {
         obj1 = index[obj1].handle;
         obj2 = index[obj2].handle;
         if (!isLinked (obj1, obj2)) {
            links.push (dmz.object.link(NodeLinkHandle, obj1, obj2));
            realLinkCount += 1;
         }
      }
      count += 1
      if (realLinkCount === linkCount) { done = true; }
      else if (loops <= count) { done = true; }
   }
};

updateSmallWorld = function () {
   var place = dmz.util.randomInt (0, links.length - 1)
     , link = links[place]
     , attr
     , obj1
     , obj2
     , v1
     , v2
     , v3
     , d12
     , d13
     , d23
     , origLink
     , obj
     ;

   if (link) {
      obj = dmz.object.linkedObjects (link);
      attr = obj.attribute;
      obj1 = obj.sub;
      obj2 = obj.super;
      if (obj1 && obj2) {
         var obj3 = findThirdObject (obj1, obj2);
         if (obj3) {
            v1 = dmz.object.position (obj1);
            v2 = dmz.object.position (obj2);
            v3 = dmz.object.position (obj3);
            if (v1 && v2 && v3) {
               d12 = (v1.subtract(v2)).magnitude ();
               d13 = (v1.subtract(v3)).magnitude ();
               d23 = (v2.subtract(v3)).magnitude ();
               if ((d12 > d13) || (d12 > d23)) {
                  origLink = link;
                  links[place] = -1;
                  if ((d13 < d23) && !isLinked (obj1, obj3)) {
                     links[place] = dmz.object.link (NodeLinkHandle, obj1, obj3);
                  }
                  if (!links[place] && (d23 < d12) && !isLinked (obj2, obj3)) {
                     links[place] = dmz.object.link (NodeLinkHandle, obj2, obj3);
                  }
                  if ((links[place] === -1) || (links[place] === undefined)) {
                     links[place] = origLink;
                  }
                  else { dmz.object.unlink (origLink); }
               }
            }
         }
      }
   }
   else { self.log.error ("No link found at. " + place); }
};

initMites = function () {

   var mite
     , chip
     ;

   ClusterSphere.radius(80);
   HaulSphere.radius(8);

   clearCanvas();

   // Move these two while loops to clearCanvas code.

   updateObjectCount();
   updateLinkCount();
}

updateMiteSimulation = function (time) {

   updateMites (time);
   updateChipClusters (time);
   updateHaul (time);
}

calcNextTurnTime = function (delay) {
   var result = Math.random() * delay;
   return (result < 0) ? 0 : result;
};

validatePosition = function (pos) {

   if (pos.x > Arena.max.x) { pos.x = Arena.min.x - (Arena.max.x - pos.x); }
   else if (pos.x < Arena.min.x) { pos.x = Arena.max.x - (Arena.min.x - pos.x); }

   if (pos.z > Arena.max.z) { pos.z = Arena.min.z - (Arena.max.z - pos.z); }
   else if (pos.z < Arena.min.z) { pos.z = Arena.max.z - (Arena.min.z - pos.z); }
}

updateObjectCount = function () {

   var MinX
     , MaxX
     , MinZ
     , MaxZ
     , mite
     ;

   MinX = Arena.min.x;
   MaxX = Arena.max.x - MinX;
   MinZ = Arena.min.z;
   MaxZ = Arena.max.z - MinZ;

   while (Mites.length < objectCount) {

      mite = {}
      mite.object = dmz.object.create (MiteType);
      mite.chip = false;
      mite.pos = dmz.vector.create(
         [ MaxX * Math.random() + MinX
         , 0
         , (MaxZ * Math.random()) + MinZ
         ]);
      dmz.object.position (mite.object, null, mite.pos);
      mite.ori =
         dmz.matrix.create().fromAxisAndAngle(dmz.vector.Up, Math.random() * Math.PI * 2);
      dmz.object.orientation (mite.object, null, mite.ori);
      dmz.object.activate(mite.object);
      mite.nextTurn = calcNextTurnTime(TurnDelay);
      Mites.push(mite);
   }
   while (Mites.length > objectCount) {

      mite = Mites.pop();
      dmz.object.destroy (mite.object);
      mite.object = 0;
      mite.pos = dmz.vector.create();
      mite.ori = dmz.matrix.create();
      if (mite.chip) { mite.chip.mite = false; mite.chip = false; }
   }
}

updateLinkCount = function (count) {

   var MinX
     , MaxX
     , MinZ
     , MaxZ
     , chip
     ;

   MinX = Arena.min.x;
   MaxX = Arena.max.x - MinX;
   MinZ = Arena.min.z;
   MaxZ = Arena.max.z - MinZ;
   while (Chips.length < linkCount) {

      chip = {}
      chip.object = dmz.object.create (ChipType);
      chip.mite = false;
      chip.pos = dmz.vector.create(
         [ MaxX * Math.random() + MinX
         , 0
         , (MaxZ * Math.random()) + MinZ
         ]);
      dmz.object.position (chip.object, null, chip.pos);
      dmz.object.orientation (chip.object, null, UnitMatrix);
      dmz.object.activate(chip.object);
      Chips.push(chip);
      ChipHandleMap[chip.object] = chip;
   }
   while (Chips.length > linkCount) {

      chip = Chips.pop();
      dmz.object.destroy (chip.object);
      chip.object = 0;
      chip.pos = dmz.vector.create();
      if (chip.mite) { chip.mite.chip = false; chip.mite = false; }
      delete ChipHandleMap[chip.object];
   }
}

updateMites = function (time) {

   var idx
     , mite
     , pos
     , ori
     , vec
     ;

   if (active) {

      Mites.forEach(function (mite) {

         pos = mite.pos;
         ori = mite.ori;
         mite.nextTurn -= time;
         if (mite.nextTurn <= 0) {

            ori = dmz.matrix.create().fromAxisAndAngle(
                     dmz.vector.Up,
                     (Math.random() - 0.5) * MaxTurn)
                        .multiply(ori);

            mite.nextTurn = calcNextTurnTime(TurnDelay);
         }
         pos = pos.add(ori.transform(dmz.vector.Forward).multiply(time * Speed));
         validatePosition(pos);
         mite.pos = pos;
         mite.ori = ori;
         dmz.object.position(mite.object, null, mite.pos);
         dmz.object.orientation(mite.object, null, mite.ori);
         if (mite.chip) {

            pos = pos.add(ori.transform(ChipOffset));
            validatePosition(pos);
            dmz.object.position (
               mite.chip.object,
               null,
               pos);
         }
      });
   }
}

findChipCluster = function (chips, chip) {

   var result = [chip.object]
     , net
     , chipHandle
     , type
     , links
     ;

   ClusterSphere.origin(chip.pos);
   net = dmz.object.find(ClusterSphere);
   if (net) {

      net.forEach(function (chipHandle) {

         if (!chips[chipHandle]) {

            type = dmz.object.type (chipHandle);
            if (type && type.isOfType(ChipType)) { result.push(chip); }
            chips[chipHandle] = true;
         }
      });
   }
   return result;
}

updateChipClusters = function () {

   var chips = {}
     , clusters = []
     , chip
     , index
     ;

   Chips.forEach(function (chip) {

      if (!chips[chip.object]) {

         chips[chip.object] = true;
         clusters.push(findChipCluster (chips, chip))
      }
   });
   clusters.sort(function (obj1, obj2) { return obj2.length > obj1.length; });
   for (index = 0; index < clusters.length; index += 1) {

      clusters[index].forEach(function (chip) {
         dmz.object.counter (chip, CountHandle, index);
      });
   }
}

findNearestChip = function (pos) {

   var result = false
     , net
     , done
     , count
     , object
     , type
     , links
     ;

   HaulSphere.origin(pos);
   net = dmz.object.find(HaulSphere);
   if (net) {

      done = false;
      count = 0;
      while (!done) {

         object = net[count];
         if (object) {

            type = dmz.object.type(object);
            if (type && type.isOfType(ChipType) && ChipHandleMap[object]) {

               result = object;
               done = true;
            }
            count += 1;
         }
         else { done = true; }
      }
   }
   return result;
}

updateHaul = function (time) {

   var ctime
     , object
     , mite
     , timer
     , ori
     , pos
     , chip
     ;

   if (active) {

      ctime = dmz.time.getFrameTime();
      Mites.forEach(function (mite) {

         timer = mite.timer;
         if (!timer) { timer = ctime; }
         if (timer <= ctime) {

            ori = mite.ori;
            pos = mite.pos;
            chip = ChipHandleMap[findNearestChip(pos)];
            if (chip) {

               if (mite.chip) {

                  mite.chip.mite = false;
                  mite.chip = false;
               }
               else {

                  mite.chip = chip;
                  chip.mite = mite;
               }
               mite.timer = ctime + WaitTime;
            }
         }
      });
   }
}

rankNodes = function () {
   var largeValue
     , mediumValue
     , state
     ;

   index.sort (function (obj1, obj2) {
      return obj2.links - obj1.links;
   });
   largeValue = null
   mediumValue = null
   index.forEach(function (obj) {
      state = SmallState;
      if (!largeValue) { largeValue = obj.links; }
      if (obj.links === largeValue) { state = LargeState; }
      else if (!mediumValue) { mediumValue = obj.links; }
      if (obj.links === mediumValue) { state = MediumState; }
      dmz.object.state (obj.handle, null, state);
   });
};

updateTimeSlice = function (time) {
   if (reset) {
      init ();
      reset = false;
   }
   if (active) { update(time); }
   rankNodes();
};

linkObjects = function (link, attr, superNode, sub) {
   objects[superNode].links += 1;
   objects[sub].links += 1;
};

unlinkObjects = function (link, attr, superNode, sub) {
   objects[superNode].links -= 1;
   objects[sub].links -= 1;
};

timeSlice = dmz.time.setRepeatingTimer (self, updateTimeSlice);

dmz.object.link.observe (self, NodeLinkHandle, linkObjects);
dmz.object.unlink.observe (self, NodeLinkHandle, unlinkObjects);

ControlsForm.observe(self, "resetButton", "clicked", function () { reset = true; });


ControlsForm.observe(self, "nodeSpinBox", "valueChanged", function (value, uiObject) {

   if (objectCount !== value) {
      reset = true;
      objectCount = value;
   }
});

ControlsForm.observe(self, "linkSpinBox", "valueChanged", function (value, uiObject) {

   if (linkCount !== value) {
      reset = true;
      linkCount = value;
   }
});

ControlsForm.observe(self, "pauseButton", "clicked", function (btn) {

   active = !active;
   if (active) { btn.text("Pause"); }
   else { btn.text("Start"); }
});

ControlsForm.observe(self, "speedSpinBox", "valueChanged", function (value) {

   NodeSpeed = value;
   Speed = value * 10;
});

ControlsForm.observe(self, "simBox", "currentIndexChanged", function (value) {

   reset = true;
   if (value === 0) {

      init = initScaleFree;
      update = updateScaleFree;
   }
   else if (value === 1) {

      init = initSmallWorld;
      update = updateSmallWorld;
   }
   else if (value === 2) {

      init = initMites;
      update = updateMiteSimulation;
   }
});


(function () {

   init = initScaleFree;
   update = updateScaleFree;
   ControlsForm.lookup("linkSlider").value(linkCount);
   ControlsForm.lookup("nodeSlider").value(objectCount);
   ControlsForm.lookup("nodeSlider").value(NodeSpeed);
   ControlsForm.lookup("simBox").addItems(["Scale Free", "Small World", "Mites"]);
}());
