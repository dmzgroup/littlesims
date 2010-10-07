var dmz =
   { object: require("dmz/components/object")
   , objectType: require("dmz/runtime/objectType")
   , defs: require("dmz/runtime/definitions")
   , data: require("dmz/runtime/data")
   , message: require("dmz/runtime/messaging")
   , util: require("dmz/types/util")
   , time: require("dmz/runtime/time")
   , vector: require("dmz/types/vector")
   , ui:
      { loader: require("dmz/ui/uiLoader")
      , mainWindow: require("dmz/ui/mainWindow")
      , qt: require("dmz/ui")
      }
   }

   , ControlsForm = dmz.ui.loader.load("./scripts/Controls.ui")
   , ControlsDock = dmz.ui.mainWindow.createDock ("Controls", ControlsForm)
   , NodeType = dmz.objectType.lookup ("ls_node")
   , NodeLinkHandle = dmz.defs.createNamedHandle("Node_Link")
   , AngleHandle = dmz.defs.createNamedHandle("Angle_Handle")
   , RadiusHandle = dmz.defs.createNamedHandle("Radius_Handle")
   , SmallState = dmz.defs.lookupState("LS_Small")
   , MediumState = dmz.defs.lookupState("LS_Medium")
   , LargeState = dmz.defs.lookupState("LS_Large")
   , MaxRadius = 280
   , HalfMaxRadius = MaxRadius * 0.5
   , NodeSpeed = 30
   , timeSlice

   , reset = true
   , active = false
   , index = []
   , objects = {}
   , links = []
   , grid = null
   , min = { x: -300, y: -300 }
   , max = { x: 280, y: 280 }
   , offset = 20
   , objectCount = 50
   , linkCount = 100
   , realLinkCount = 0

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
     , y = 0
     , done = false
     ;

   while (!done) {
      x = varRandom (min.x, max.x, offset);
      y = varRandom (min.y, max.y, offset);
      if (!grid) { grid = {}; }
      if (!grid[x]) { grid[x] = {}; }
      if (!grid[x][y]) {
         grid[x][y] = true;
         done = true;
      }
   }
   return dmz.vector.create (
      (x * offset) + min.x + offset,
      0,
      (y * offset) + min.y + offset);
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

ControlsForm.observe(self, "simBox", "currentIndexChanged", function (value) {

   reset = true;
   if (value === 0) {

      init = initScaleFree;
      update = updateScaleFree;
   }
   else {

      init = initSmallWorld;
      update = updateSmallWorld;
   }
});

(function () {

   init = initScaleFree;
   update = updateScaleFree;
   ControlsForm.lookup("linkSlider").value(linkCount);
   ControlsForm.lookup("nodeSlider").value(objectCount);
   ControlsForm.lookup("simBox").addItems(["Scale Free", "Small World"]);
   ControlsForm.show();
   dmz.ui.mainWindow.addDock("Controls", dmz.ui.qt.LeftDockWidgetArea);
}());
