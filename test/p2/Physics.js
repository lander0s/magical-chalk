

var Physics = (function(){

    var world;
    var scale = 100;

    function init()
    {
    	console.log("P2.js Implementation");
        world = new p2.World({ gravity : [0,9.8]});
        world.setGlobalStiffness(1e4);
        world.solver.iterations = 20;
        world.solver.tolerance = 0.01;
        world.islandSplit = true;
        world.solver.frictionIterations = 10;

       //var app = new p2.WebGLRenderer(function(){
       //     this.setWorld(world);
       //     this.setState(p2.Renderer.DRAWPOLYGON);
       //     this.frame(0, 1, 6, 8);
       //});
    }
    var si = true;
    function update()
    {
        world.step(1/60);
    }

    function clear()
    {
        var contraints = world.contraints;
        for(var i = 0; i < contraints.length; i++)
        {
            world.removeBody(contraints[i]);
        }
        var bodies = world.bodies;
        for(var i = 0; i < bodies.length; i++)
        {
            world.removeBody(bodies[i]);
        }
    }

    function getPosition(body_handler)
    {
        return {
            x: body_handler.position[0] * scale,
            y: body_handler.position[1] * scale,
        };
    }

    function getAngle(body_handler)
    {
        return body_handler.angle;
    }

    function getLabel(body_handler)
    {
        return body_handler.label;
    }

    function createBody(options)
    {
        var vertices = options.vertices;

        var poly = [];

        for(var i = 0; i < vertices.length; i++)
        { poly.push([vertices[i].x, vertices[i].y]); }

        var centroid = new p2.Convex({ vertices : poly }).centerOfMass;
        centroid_obj = { x : centroid[0], y : centroid[1] };

        /*
        * Create a static or no-static object
        */
        var body = null;
        var config = { position : [options.x / scale, options.y / scale] };
        if(options.isStatic)
        {
            config.mass = 0; // static
            console.log("El objeto " + options.label + " es estatico");
        }
        else
        {
            config.mass = 1; // non-static
        }
        body = new p2.Body(config);

        /*
         * Build a compatible array from the game polygon
         */
        var poly = [];
        for(var i = 0; i < vertices.length; i++)
        {
            poly.push([vertices[i].x / scale, vertices[i].y / scale]);
        }

        body.fromPolygon(poly);
        world.addBody(body);

        /*
         * Add label property
         */
        body.label = options.label;
        body.centroid = centroid_obj;
        return body;
    }

    function preventCollision(bodyA, bodyB)
    {

    }

    function createCircle(options)
    {
        /*
        * Create a static or no-static object
        */
        var body = null;
        var config = { position : [options.x / scale, options.y / scale] };
        if(options.isStatic)
        {
            config.mass = 0; // static
        }
        body = new p2.Body(config);
        var circle = new p2.Circle({
            radius  : options.radio / scale,
        });
        body.addShape(circle);
        world.addBody(body);

        /*
         * Add label property
         */
        body.label = options.label;
        return body;
    }

    function createWire(vertices)
    {

    }

    function createRectangle(options)
    {

    }

    function isStatic(body_handler)
    {
        return body_handler.mass == 0;
    }

    function setStatic(body_handler, value)
    {
        console.log("Este metodo esta obsoleto");
    }

    function createRevoluteJoint(options)
    {
        var constraint = new p2.RevoluteConstraint(options.bodyA, options.bodyB, {
            localPivotA: [options.pointA.x / scale, options.pointA.y / scale],
            localPivotB: [options.pointB.x / scale, options.pointB.y / scale],
            collideConnected : false,
        });
        world.addConstraint(constraint);
        return constraint;
    }

    function remove(bodies)
    {
        if(!Array.isArray(bodies))
            bodies = [bodies];
        for(var i = 0; i < bodies.length; i++)
        {
            world.removeBody(bodies[i]);
        }
    }

    function isSensor(body_handler)
    {
        return body_handler.isSensor;
    }

    function getId(body_handler)
    {
        return body_handler.id;
    }

    function getAllBodies()
    {
    	return world.bodies;
    }

    function getCentroid(body_handler)
    {
        return body_handler.centroid;
    }

    function getBodiesAtPoint(point)
    {
        var mapped_point = point;
        var _bodies = Physics.getAllBodies();
        return Matter.Query.point(_bodies, mapped_point);
    }

    return { init            : init,
    	     clear           : clear,
             getPosition     : getPosition,
             getAngle        : getAngle,
             getLabel        : getLabel,
             createBody      : createBody,
             createRectangle : createRectangle,
             createCircle    : createCircle,
             isStatic        : isStatic,
             setStatic       : setStatic,
             remove          : remove,
             getBodiesAtPoint : getBodiesAtPoint,
             getAllBodies     : getAllBodies,
             preventCollision : preventCollision,
             isSensor         : isSensor,
             createRevoluteJoint : createRevoluteJoint,
             getId           : getId,
             getCentroid     : getCentroid,
             createWire      : createWire,
             update          : update };

})();