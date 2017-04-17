
var Game = (function(){

  /* module/local variables */
  var canvas;
  var context;
  var canvas_rect;
  var objects;
  var drawing_data;
  var level_data;
  var listeners = [];

  function init(options)
  {
      MenuManager.init();
      canvas = options.canvas;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      objects = {
          shapes : [],
          tacks  : [],
      };

      level_data = {
          id          : 0,
          game_over   : false,
          update_fnc  : null,
          setup_fnc   : null,
          title       : "",
          description : "",
          context     : { },
          hints       : [],
      };

      drawing_data = {
          current_polygon     : [],
          current_color_index : -1,
          is_linto_locked     : false,
          clear : function() {
              drawing_data.current_polygon = [];
              drawing_data.current_color_index = -1;
              drawing_data.is_linto_locked = false;
          }
      };

      canvas_rect = canvas.getBoundingClientRect();
      context = canvas.getContext("2d");
      ColorManager.init(context);
      PlayerCursor.init({ canvas : canvas, context : context });
      window.addEventListener("mousemove", onMouseMove);
      Touch.surface("div.main_container", onTouchEvent);

      Physics.init();

      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      window.requestAnimationFrame(update);
      LevelSelector.show();
  }

  function restartEngine()
  {
      // remove all objects.shapes
      Physics.clear();
      listeners = [];

      // Reset some variables
      objects.shapes = [];
      objects.tacks  = [];

      level_data.hints = [];

      drawing_data.clear();

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
  }

  function update()
  {
      Physics.update();
      if(!level_data.game_over && level_data.update_fnc != null)
      {
          level_data.game_over = level_data.update_fnc(level_data.context);
          if(level_data.game_over)
          {
              setTimeout(function(){
                LevelSelector.show();
              }, 1000);
          }
      }
      render();
      window.requestAnimationFrame(update);
  }

  function render()
  {
      context.lineWidth = (8 / 96) * Physics.getScale();

      /* Clearing the screen */
      context.clearRect(0,0, canvas.width, canvas.height);
      context.save();

      /* Drawing the current polygon */
      context.save();
      if(drawing_data.current_polygon.length > 1)
      {
          context.strokeStyle = ColorManager.getColorAt(drawing_data.current_color_index);
          context.beginPath();
          context.moveTo(drawing_data.current_polygon[0][0], drawing_data.current_polygon[0][1]);
          for(var i = 0; i < drawing_data.current_polygon.length; i++)
          {
              context.lineTo(drawing_data.current_polygon[i][0], drawing_data.current_polygon[i][1]);
          }
          context.stroke();
      }
      context.restore();

      /* Drawing polygons */
      var i, l = objects.shapes.length;
      for(i = 0; i < l; i++)
      {
          if(objects.shapes[i].isSensor)
          {
              continue;
          }
          context.strokeStyle = ColorManager.getColorAt(objects.shapes[i].color_index);
          context.fillStyle = ColorManager.getColorAt(objects.shapes[i].color_index);
          /* Drawing polygons */
          context.save();
              context.globalAlpha = objects.shapes[i].deleted ? 0.1 : 1.0;
              var position = Physics.getPosition(objects.shapes[i].body);
              context.translate(position[0], position[1]);
              context.rotate(Physics.getAngle(objects.shapes[i].body));
              context.translate(-objects.shapes[i].centroid[0], -objects.shapes[i].centroid[1]);
              context.beginPath();
              if(objects.shapes[i].type == "polygon" || objects.shapes[i].type == "wire" ) {
                  context.moveTo(objects.shapes[i].vertices[0][0], objects.shapes[i].vertices[0][1]);
                  for(var j = 1; j < objects.shapes[i].vertices.length; j++) {
                      context.lineTo(objects.shapes[i].vertices[j][0], objects.shapes[i].vertices[j][1]);
                  }
                  if(objects.shapes[i].type == "polygon")
                      context.closePath();
              }
              else if(objects.shapes[i].type == "circle" ) {
                  context.arc(0,0, objects.shapes[i].radio, 0, Math.PI * 2);
              }
              if(objects.shapes[i].type == "wire")
              {
                  context.stroke();
              }
              else
              {
                  context.globalAlpha = objects.shapes[i].deleted ? 0.05 : 0.2;
                  context.fill();
                  context.globalAlpha = objects.shapes[i].deleted ? 0.1 : 1.0;
                  context.stroke(); 
              }
          context.restore();
          /* Drawing polygons (ghost mode) */
          if( Physics.getLabel( objects.shapes[i].body) == "Body" ) {
              context.save();
                  context.beginPath();
                  context.moveTo(objects.shapes[i].vertices[0][0], objects.shapes[i].vertices[0][1]);
                  for(var j = 1; j < objects.shapes[i].vertices.length; j++) {
                      context.lineTo(objects.shapes[i].vertices[j][0], objects.shapes[i].vertices[j][1]);
                  }

                  if(objects.shapes[i].type == "polygon")
                      context.closePath();
                  context.globalAlpha = 0.1;
                  context.stroke();
              context.restore();
          }
      }

      /* Drawing objects.tacks */
      context.strokeStyle = ColorManager.getColorAt(0);
      var tack_radius = (10 / 96) * Physics.getScale();
      for(var i = 0; i < objects.tacks.length; i++)
      {
          context.save();
          context.beginPath();
          var pos = calcTackAbsPos(i);
          context.translate(pos[0],pos[1]);
          context.arc(0, 0, tack_radius, 0, Math.PI * 2);
          context.globalAlpha = objects.tacks[i].deleted ? 0.1 : 1.0;
          context.stroke();
          context.restore();
      }

      /* Drawing level.hints (ghost mode) */
      var i, l = level_data.hints.length;
      for(var i = 0; i < l; i++)
      {
          context.save();
            context.translate(level_data.hints[i].position[0], level_data.hints[i].position[1]);
            context.beginPath();
            var j, l2 = level_data.hints[i].vertices.length;
            if(l2 > 1)
            {
                context.moveTo(level_data.hints[i].vertices[0][0], level_data.hints[i].vertices[0][1]);
                for(j = 0; j < l2; j++)
                {
                    context.lineTo(level_data.hints[i].vertices[j][0], level_data.hints[i].vertices[j][1]);
                }
                context.globalAlpha = level_data.hints[i].opacity;
                context.stroke();
            }
          context.restore();
      }

      context.restore();
  }

  function onKeyDown(e)
  {
      
  }

  function onKeyUp(e)
  {
      if(e.keyCode == 80) // P key
      {
          if(MenuSettings.isVisible())
          {
              MenuSettings.hide();
          }
          else
          {
              MenuSettings.show();
          }
      }
      if(e.keyCode == 76) // L key
      {
          if(LevelSelector.isVisible())
          {
              LevelSelector.hide();
          }
          else
          {
              LevelSelector.show();
          }
      }
      if(e.keyCode == 84) // T key
      {
          PlayerCursor.changeTool();
      }
  }

  function onMouseMove(e)
  {
      var pos = new Float32Array(2);
      pos[0] = e.clientX - canvas_rect.left;
      pos[1] = e.clientY - canvas_rect.top;
      moveTo(pos);
  }

  function onTouchEvent(e)
  {
      if(e.type == "touchstart")
      {
        drawing_data.clear();
      }
      if(e.button == 2 && e.type == "touchstart")
      {
          erease();
          return;
      }
      if(e.type == "touchmove")
      {
          if(e.button == 2)
          {
              erease();
          }
          else
          {
              lineTo([e.x, e.y]);
          }
      }
      else if(e.type == "touchend")
      {
          if(PlayerCursor.getCurrentToolName() == "ereaser")
          {
              erease();
          }
          if(PlayerCursor.getCurrentToolName() == "tack" || (drawing_data.current_polygon.length < 2))
          {
              if(e.button != 2)
              {
                  if(!drawing_data.is_linto_locked)
                  {
                      tack();
                  }
                  drawing_data.clear();
              }
          }
          else
          {
              closePath();
          }
      }
  }

  function moveTo(pos)
  {
      PlayerCursor.moveTo(pos);
  }

  function lineTo(pos)
  {
      if(drawing_data.is_linto_locked)
      {
          return;
      }
      if(PlayerCursor.getCurrentToolName() == "chalk")
      {
          var new_pos = pos.slice();
          if(drawing_data.current_polygon.length > 0){
            var old_pos = drawing_data.current_polygon[drawing_data.current_polygon.length - 1];
            var distance = Math.sqrt((new_pos[0] - old_pos[0]) * (new_pos[0] - old_pos[0]) + (new_pos[1] - old_pos[1]) * (new_pos[1] - old_pos[1]));
            if(distance < ConfigOptions.min_vertex_distance * Physics.getScale())
            {
              return; 
            }
          }
          if(drawing_data.current_color_index == -1)
          {
            drawing_data.current_color_index = ColorManager.getRandomColorIndex();
          }     
          drawing_data.current_polygon.push(new_pos);
          if(drawing_data.current_polygon.length > 20)
          {
              var tail = drawing_data.current_polygon[drawing_data.current_polygon.length -1];
              var head = drawing_data.current_polygon[0];
              var vec = new Float32Array(2);
              vec[0] = tail[0] - head[0];
              vec[1] = tail[1] - head[1];
              distance = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
              if(distance < (Physics.getScale() * ConfigOptions.polygon_autoclose_distance))
              {
                  if(decomp.isSimple(drawing_data.current_polygon))
                  {
                      closePath();
                      drawing_data.is_linto_locked = true;
                  }
              }
          }
      }
      moveTo(pos);
  }

  function closePath()
  {
      var type = evalCurrentShape();
      console.log("Last evaluation: " + type);
      console.log(JSON.stringify(drawing_data.current_polygon));

      if(type == "invalid")
      {
          drawing_data.clear();
          return;
      }

      if(type == "polygon")
      {
          closeAsPolygon();
          return;
      }

      if(type == "wire")
      {
          closeAsWire();
          return;
      }
  }

  /*
   * return "polygon", "wire", "chain" or "invalid"
   */
  function evalCurrentShape()
  {
      if(drawing_data.current_polygon.length < ConfigOptions.min_vertices_per_polygon)
      {
          return "invalid";
      }

      decomp.removeCollinearPoints(drawing_data.current_polygon, 0.2);

      var h2t_vector = new Float32Array(2);
      h2t_vector[0] = drawing_data.current_polygon[0][0] - drawing_data.current_polygon[drawing_data.current_polygon.length-1][0];
      h2t_vector[1] = drawing_data.current_polygon[0][1] - drawing_data.current_polygon[drawing_data.current_polygon.length-1][1];

      var h2t_distance = Math.sqrt(h2t_vector[0] * h2t_vector[0] + h2t_vector[1] * h2t_vector[1]);
      var h2t_angle = Math.atan( h2t_vector[1] / h2t_vector[0] );
      if(h2t_vector[0] < 0)
        h2t_angle += Math.PI;

      var tail_vector = new Float32Array(2);
      tail_vector[0] = drawing_data.current_polygon[drawing_data.current_polygon.length-1][0] - drawing_data.current_polygon[drawing_data.current_polygon.length-3][0];
      tail_vector[1] = drawing_data.current_polygon[drawing_data.current_polygon.length-1][1] - drawing_data.current_polygon[drawing_data.current_polygon.length-3][1];

      var tail_angle = Math.atan(tail_vector[1] / tail_vector[0] );
      if(tail_vector[0] < 0)
        tail_angle += Math.PI;

      if(Math.abs(tail_angle - h2t_angle) <= 0.7)
      {
          h2t_distance *= 0.5;
      }


      if(h2t_distance > Physics.getScale() * ConfigOptions.polygon_autoclose_distance * 3)
      {
          return "wire";
      }

      if(!decomp.isSimple(drawing_data.current_polygon))
      {
          return "wire";
      }

      return "polygon";
  }

  function closeAsPolygon()
  {
      var body = undefined;

      body = Physics.createBody({
          position : new Float32Array(2),
          vertices : drawing_data.current_polygon,
      });

      if(body == undefined) {
          drawing_data.clear();
          return;
      };
      var group = null;
      var tack_indices = [];
      var i, l = objects.tacks.length;
      for(i = 0; i < l; i++)
      {
          if(objects.tacks[i].bodyB == null)
          {
              if(itsInsideOf(calcTackAbsPos(i), drawing_data.current_polygon ))
              {
                  tack_indices.push(i);
              }
          }
      }

      objects.shapes.push({
          body : body,
          type : "polygon",
          vertices : drawing_data.current_polygon,
          centroid: Physics.getCentroid(body),
          color_index : drawing_data.current_color_index,
      });

      l = tack_indices.length;
      var static_connections = 0;
      for(i = 0; i < l; i++)
      {
          objects.tacks[tack_indices[i]].bodyB = body;
          objects.tacks[tack_indices[i]].offsetB = calcTackOffset(calcTackAbsPos(tack_indices[i]), body);

          objects.tacks[tack_indices[i]].contraint = Physics.createRevoluteJoint({
              bodyA  : objects.tacks[tack_indices[i]].bodyA,
              pointA : objects.tacks[tack_indices[i]].offsetA,
              bodyB  : objects.tacks[tack_indices[i]].bodyB,
              pointB : objects.tacks[tack_indices[i]].offsetB,
          });

          if(Physics.isStatic(objects.tacks[tack_indices[i]].bodyA))
          {
              static_connections++;
          }
          onTackConnected();
      }
      drawing_data.clear();
  }

  function closeAsWire()
  {
      var body = Physics.createWire({vertices:drawing_data.current_polygon});
      if(body == undefined)
      {
          drawing_data.clear();
          return;
      }
      var tack_indices = [];
      var i, l = objects.tacks.length;
      for(i = 0; i < l; i++)
      {
          if(objects.tacks[i].bodyB == null)
          {
              if(itsInsideOf(calcTackAbsPos(i), drawing_data.current_polygon ))
              {
                  tack_indices.push(i);
              }
          }
      }

      objects.shapes.push({
          body : body,
          type : "wire",
          vertices : drawing_data.current_polygon,
          centroid : Physics.getCentroid(body),
          color_index : drawing_data.current_color_index,
      });

      l = tack_indices.length;
      var static_connections = 0;
      for(i = 0; i < l; i++)
      {
          objects.tacks[tack_indices[i]].bodyB = body;
          objects.tacks[tack_indices[i]].offsetB = calcTackOffset(calcTackAbsPos(tack_indices[i]), body);

          objects.tacks[tack_indices[i]].contraint = Physics.createRevoluteJoint({
              bodyA  : objects.tacks[tack_indices[i]].bodyA,
              pointA : objects.tacks[tack_indices[i]].offsetA,
              bodyB  : objects.tacks[tack_indices[i]].bodyB,
              pointB : objects.tacks[tack_indices[i]].offsetB,
          });

          if(objects.tacks[tack_indices[i]].bodyA.isStatic)
          {
              static_connections++;
          }
          onTackConnected();
      }

      drawing_data.clear();
  }

  function tack()
  {
      var cur_pos = PlayerCursor.getPosition();

      var tack = {
          bodyA     : null,
          offsetA   : null,
          bodyB     : null,
          offsetB   : null,
          contraint : null,
      };

      var _bodies = Physics.getBodiesAtPoint(cur_pos);
      
      for(var i = 0; i < _bodies.length; i++)
      {
          if(!Physics.isSensor(_bodies[i]))
          {
              tack.bodyA = _bodies[i];
              break;
          }
      }

      if(tack.bodyA == null)
      {
          console.log("You cannot put tacks in the air");
          return;
      }

      tack.offsetA = calcTackOffset(cur_pos, tack.bodyA);
      objects.tacks.push(tack);
      onTackAdded();
  }

  function erease()
  {
      /* AQUI VOY */
      // obtener la posicion del cursor
      var cur_pos = PlayerCursor.getPosition();

      // buscar tacks para elminarlas
      var i, l = objects.tacks.length;
      for(i = 0 ; i < l; i ++)
      {
          if(!objects.tacks[i].deleted)
          {
              var tack_pos = calcTackAbsPos(i)
              var diff_x = cur_pos[0] - tack_pos[0];
              var diff_y = cur_pos[1] - tack_pos[1];
              var distance = Math.sqrt((diff_x * diff_x) + (diff_y * diff_y));
              if(distance < 20)
              {
                 // si se encuentra un tack, borrarla y terminar
                  if(objects.tacks[i].contraint != null)
                  {
                      Physics.removeConstraint(objects.tacks[i].contraint);
                  }
                  objects.tacks[i].contraint = null;
                  objects.tacks[i].deleted = true;
                  drawing_data.clear();
                  return;
              }
          }
      }

      // si no se encuentra tack, eliminar una figura que se encuentre bajo el cursor
      var _bodies = Physics.getBodiesAtPoint(cur_pos);

      l = _bodies.length;
      for(i = 0; i < l; i++)
      {
          if( Physics.isSensor(_bodies[i]) || Physics.getLabel(_bodies[i]) != "Body")
              continue;
          removeBody(_bodies[i]);
          break;
      }
      drawing_data.clear();
  }

  function removeBody(body)
  {
      if(body.label != "Body")
        return;
      Physics.removeBody(body);
      removeTacksConnectedTo(body.id);
      var i, l = objects.shapes.length;
      for(i = 0; i < l; i++)
      {
          if(body == objects.shapes[i].body)
          {
              objects.shapes[i].deleted = true;
              return;
          }
      }      
  }

  function calcTackAbsPos(index)
  {
      var tack = objects.tacks[index];
      var scaled_offsetA = tack.offsetA;
      var x = scaled_offsetA[0];
      var y = scaled_offsetA[1];
      var r = Physics.getAngle(tack.bodyA);

      // 2D Rotation 
      var pos = new Float32Array(2);
      pos[0] = (x  * Math.cos(r)) - (y * Math.sin(r)); 
      pos[1] = (y * Math.cos(r)) + (x * Math.sin(r));
      
      var body_pos = Physics.getPosition(tack.bodyA);
      pos[0] += body_pos[0];
      pos[1] += body_pos[1];
      return pos;
  }

  function calcTackOffset(pos, body)
  {
      var body_pos = Physics.getPosition(body);
      var x = pos[0] - body_pos[0];
      var y = pos[1] - body_pos[1];
      var angle = -Physics.getAngle(body);

      // 2D Rotation 
      var offset = new Float32Array(2);
      offset[0] = (x  * Math.cos(angle)) - (y * Math.sin(angle));
      offset[1] = (y * Math.cos(angle)) + (x * Math.sin(angle));
      return offset;
  }

  function removeTacksConnectedTo(body_id)
  {
      for(var i = objects.tacks.length-1; i >= 0; i--)
      {
          if(!objects.tacks[i].deleted)
          {
              if( Physics.getId(objects.tacks[i].bodyA) == body_id)
              {
                   if(objects.tacks[i].contraint != null)
                   {
                       Physics.removeConstraint(objects.tacks[i].contraint);
                   }
                   objects.tacks[i].contraint = null;
                   objects.tacks[i].deleted = true;
              }
              if(objects.tacks[i].bodyB != null &&  Physics.getId(objects.tacks[i].bodyB) ==  body_id)
              {
                   Physics.removeConstraint(objects.tacks[i].contraint);
                   objects.tacks[i].contraint = null;
                   objects.tacks[i].deleted = true;
              }
          }
      }
  }

  function changeTool()
  {
      PlayerCursor.changeTool();
  }

  function loadLevel(level_index)
  {
      restartEngine();
      level_data.game_over = false;
      level_data.context = {};
      level_data.id = level_index;
      var level = LevelSelector.getLevels()[level_index];
      level_data.update_fnc = level.update;
      var _bodies = [];
      level.hints = level.hints || [];
      level_data.hints = [];
      for(var i = 0; i < level.hints.length;i++)
      {
          level_data.hints.push(prepareLevelShapes(level.hints[i]));
      }
      for(var i = 0; i < level.bodies.length; i++)
      {
          var type = level.bodies[i].type == "circle" ? "circle" : "polygon";
          var scaledBody = prepareLevelShapes(level.bodies[i]);
          if(type == "polygon")
          {
              var body = Physics.createBody({
                  position : scaledBody.position,
                  vertices : scaledBody.vertices,
                  label : level.bodies[i].label,
                  isKinematic : level.bodies[i].isKinematic || false,
                  isStatic : level.bodies[i].isStatic,
                  friction : 0.5,
                  isSensor: level.bodies[i].isSensor,
              });
              var centroid = Physics.getCentroid(body);
          }
          else if(type == "circle")
          {
              var body = Physics.createCircle({
                  position : scaledBody.position,
                  radio    : scaledBody.radio,
                  label    : level.bodies[i].label,
                  isStatic : level.bodies[i].isStatic,
                  friction : 0.5,
              });
              var centroid = new Float32Array(2);
          }
          objects.shapes.push({
              body        : body,
              deleted     : false,
              isSensor    : level.bodies[i].isSensor,
              type        : type,
              vertices    : scaledBody.vertices,
              radio       : scaledBody.radio,
              centroid    : centroid,
              color_index : ColorManager.getRandomColorIndex(),
          });
          _bodies.push(body);
      }

      level_data.title       = level.title;
      level_data.description = level.description;
      level_data.setup_fnc   = level.setup;

      Screen.setTitleText(level.description);
      if(level_data.setup_fnc != undefined)
          level_data.setup_fnc(level_data.context);
  }

  function restartLevel()
  {
      loadLevel(level_data.id);
  }

  function itsInsideOf(pos, polygon)
  {
      var sides = polygon.length - 1;
      var j = sides - 1;
      var pointStatus = false;
      for (var i = 0; i < sides; i++)
      {
          if (polygon[i][1] < pos[1] && polygon[j][1] >= pos[1] || polygon[j][1] < pos[1] && polygon[i][1] >= pos[1])
          {
              if (polygon[i][0] + (pos[1] - polygon[i][1]) /  (polygon[j][1] - polygon[i][1]) * (polygon[j][0] - polygon[i][0]) < pos[0])
              {
                  pointStatus = !pointStatus ;                        
              }
          }
          j = i;
      }
      return pointStatus;
  }

  function prepareLevelShapes(const_shape)
  {
      /* Fixme: improve this coping technique */
      var shape = JSON.parse(JSON.stringify(const_shape));
      
      shape.position[0] *= Physics.getScale();
      shape.position[1] *= Physics.getScale();

      shape.position[1] = -shape.position[1];
      shape.position[0] += Screen.getWidth()>>1;
      shape.position[1] += Screen.getHeight();
      if(shape.vertices)
      {
          var v, l = shape.vertices.length;
          for(v = 0; v < l; v++)
          {
              shape.vertices[v][0] *= Physics.getScale();
              shape.vertices[v][1] *= Physics.getScale();

              shape.vertices[v][1] = -shape.vertices[v][1];
          }
      }
      if(shape.radio)
      {
          shape.radio *= Physics.getScale();
      }
      
      if(shape.opacity != 0.0)
      {
          shape.opacity = shape.opacity || 0.1;
      }
      
      return shape;
  }

  function getHints()
  {
      return level_data.hints;
  }

  function on(type, callback)
  {
      if(!listeners[type])
      {
          listeners[type] = [];
      }
      listeners[type].push(callback);
  }

  function onTackAdded()
  {
      var callbacks = listeners["addTack"];
      if(callbacks)
      {
          for(var i = 0; i < callbacks.length; i++)
          {
               callbacks[i](event);
          }
      }
  }

  function onTackConnected()
  {
      var callbacks = listeners["connectTack"];
      if(callbacks)
      {
          for(var i = 0; i < callbacks.length; i++)
          {
               callbacks[i](event);
          }
      }
  }

  function DrawEvilShape(shape)
  {
      //drawing_data.current_polygon = [];
      //closePath();
  }

  return {  init          : init,
            moveTo        : moveTo,
            lineTo        : lineTo,
            closePath     : closePath,
            tack          : tack,
            erease        : erease,
            changeTool    : changeTool,
            loadLevel     : loadLevel,
            restartLevel  : restartLevel,
            getHints      : getHints,
            on            : on,
            DrawEvilShape : DrawEvilShape };
})();
