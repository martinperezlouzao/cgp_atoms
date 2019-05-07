var atomNames = [];
var boneGroupNames = [];
var atomsToDraw = [];
var groups = [];
var boneGroups = [];
var pairDistances = [];
var params;
var boneParameters;
var activeSelection;
var activeBoneGroup = -1;
var maxDistance = 0;


var atomType = function(name, coordinates, geometry, material){
        this.name = name;
        this.coordinates = coordinates;
        this.geometry = geometry;
        this.material = material;
    return this;
};

var boneGroup = function(name, minDistance, maxDistance, material){
        this.name = name;
        this.minDistance = minDistance;
        this.maxDistance = maxDistance;
        this.material = material;
        this.bonesAlreadyDrawn = [];
    return this;
}

var camera, controls, scene, renderer;
var ambientLight, light, r = 0.0;
THREE.Cache.enabled = true;
var file = new THREE.FileLoader();
var lines;
//----------------------
var turn = 0, cubeCamera1, cubeCamera2;
//---------------------------------
file.load(
    // resource URL
    'points.xyz',
    // onLoad callback
    function ( data ) {
        // output the text to the console
        lines = data.split('\n');
        var line;
        var coordinates = [];
        
        for (var i = 0; i < lines.length; i++){
            line = lines[i].split(' ');
            
            if(line.length > 1){
                for(var j=0;j<line.length;j++){
                    if(line[j] != ''){
                        var point = parseFloat(line[j]);
                        if (! isNaN(point)){
                            coordinates.push(point);
                        }
                        else{
                            coordinates.push(line[j]);
                            if(!atomNames.includes(line[j])){
                                atomNames.push(line[j]);
                            }
                        }
                    }
                }
            }
            if(coordinates.length == 4){
                var vector = new THREE.Vector3(coordinates[1],coordinates[2],coordinates[3]);
                var newAtom = [];
                newAtom.push(coordinates[0]);
                newAtom.push(vector);
                atomsToDraw.push(newAtom);
            }
            
            coordinates = [];
        }
        init();
    },				
    // onProgress callback
    function ( xhr ) {
        console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
    },
    // onError callback
    function ( err ) {
        console.error( 'An error happened loading the file' );
    }
);



function init(){				
    var SCREEN_WIDTH = window.innerWidth;
    var SCREEN_HEIGHT = window.innerHeight;
    
    var container = document.createElement( 'div' );
    document.body.appendChild( container );
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );
        
    scene = new THREE.Scene();
    var aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
        
    camera = new THREE.PerspectiveCamera( 45, aspect, 2, 10000 );
    camera.position.set( 10, 10, 30 );
    camera.lookAt( scene.position );
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.enableZoom = true;
    controls.enableDamping = true;
    controls.update();						
    ambientLight = new THREE.AmbientLight(0xffffff);
    scene.add(ambientLight);
    
    var light = new THREE.DirectionalLight( 0xffffff , 1);
    light.position.set(10,10,30);
    scene.add( light );
    var light2 = new THREE.DirectionalLight( 0xffffff , 1);
    light2.position.set(-10,-10,-30);
    scene.add( light2 );
    //------------------------------
    /*cubeCamera1 = new THREE.CubeCamera( 2, 10000, 512 );
    scene.add( cubeCamera1 );
    cubeCamera2 = new THREE.CubeCamera( 2, 10000, 512 );
    scene.add( cubeCamera2 );*/
    //------------------------------

    var randomColor = Math.random() * 0xffffff;

    for(var i=0, j=0;i<atomsToDraw.length;i++){
        var newAtom = new atomType(	atomsToDraw[i][0],
                                    atomsToDraw[i][1],
                                    new THREE.SphereGeometry( 0.6, 32, 32 ),
                                    new THREE.MeshStandardMaterial( {color: randomColor,
                                                metalness: 0.5,
                                                roughness: 0,
                                                /*envMap: cubeCamera2.renderTarget.texture*/} )
                                        );

        if(newAtom.name != atomNames[j]){
            randomColor = Math.random() * 0xffffff;
            newAtom.material.color.setHex(randomColor);
            j++;
        }								
    
        groups.push(newAtom);
    }
    

    if(groups.length == 0){
        console.log("Error: no atoms loaded");
        return;
    }
    
    
    for(i = 0; i<groups.length; i++){
        var distances = [];
        for(j = i+1; j<groups.length; j++){
            var distance = groups[i].coordinates.distanceTo(groups[j].coordinates)
            distances.push(groups[i].coordinates.distanceTo(groups[j].coordinates));
            if(distance > maxDistance){
                maxDistance = distance;
            }
        }
        pairDistances.push(distances);
    }
    
    activeSelection = atomNames[0];

    // function for finding atom object according to their names.
    function findAtom(groups){
        var objects = [];
        for(i = 0; i<groups.length; i++){
            if(groups[i].name == activeSelection){
                objects.push(groups[i])
            }
        }	
        return objects;		
    }


    for(var i=0;i<groups.length;i++){
        var mesh = new THREE.Mesh(groups[i].geometry, groups[i].material);
            mesh.position.set(groups[i].coordinates.x, groups[i].coordinates.y, groups[i].coordinates.z);
            scene.add(mesh);
    }


    //---------------------CREATION OF BONES---------------------------

    function createBone(v1, v2, material){
        var length = v1.distanceTo(v2);
        var position  = v2.clone().add(v1).divideScalar(2);

        var bone = new THREE.CylinderBufferGeometry(0.1,0.1,length,10,10,false);

        /*bone.verticesNeedUpdate = true;
        bone.elementsNeedUpdate = true;
        bone.morphTargetsNeedUpdate = true;
        bone.uvsNeedUpdate = true;
        bone.normalsNeedUpdate = true;
        bone.colorsNeedUpdate = true;
        bone.tangentsNeedUpdate = true;*/
    
        var orientation = new THREE.Matrix4();
        var rotation = new THREE.Matrix4();
        orientation.lookAt(v1,v2,new THREE.Vector3(0,1,0));
        rotation.makeRotationX(Math.PI * .5);
        orientation.multiply(rotation);
        bone.applyMatrix(orientation);
    
        var mesh = new THREE.Mesh(bone,material);
        mesh.position.set(position.x, position.y, position.z);
        return mesh;
    }


    //-----FIRST BONE GROUP INITIALIZATION---------
    boneGroups.push(new boneGroup("Group 1",
                    0,
                    0,
                    new THREE.MeshStandardMaterial( {color: Math.random() * 0xffffff,
                        metalness: 0.5,
                        roughness: 0} ),
                    0.2));

    boneGroupNames.push("Group 1");
    activeBoneGroup = 0;
    for(var i=0;i<pairDistances.length;i++){
        var row = [];
        for(var j=0;j<pairDistances[i].length;j++){
            row.push(null);
        }
        boneGroups[activeBoneGroup].bonesAlreadyDrawn.push(row);
    }


    function redrawBones(){

        for(var j=0;j<pairDistances.length;j++){
            for(var k=0;k<pairDistances[j].length;k++){
                if(pairDistances[j][k] > boneGroups[activeBoneGroup].minDistance && pairDistances[j][k] <= boneGroups[activeBoneGroup].maxDistance){    //has to be a bone
                    if(boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k] == null){
                        boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k] = createBone(groups[j].coordinates,groups[k+j+1].coordinates,boneGroups[activeBoneGroup].material,boneGroups[activeBoneGroup].thickness);    //the bone is drawn
                        scene.add(boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k]);
                    }
                    
                }

                else{   //there should not be a bone
                    if(boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k] != null){    //clean objects
                        scene.remove(boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k]);
                        boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k].geometry.dispose();
                        boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k].material.dispose();
                        boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k] = null;    //the bone is not drawn
                    }
                }
            }
        }

    }

    
    //---------------------CREATION OF BONES---------------------------

    
    var gui = new dat.GUI();
    var atomProperties = gui.addFolder('Atom properties');

    params = {
        'Element': findAtom(groups)[0].name,
        'Color': findAtom(groups)[0].material.color.getHex(),
        'Roughness': findAtom(groups)[0].material.roughness,
        'Metalness': findAtom(groups)[0].material.metalness,
    };
    atomProperties.add( params, "Element", atomNames).onChange( function ( value ) {
        activeSelection = atomNames[atomNames.indexOf(value)];
    } ).listen();
    
    atomProperties.addColor( params, 'Color' ).onChange( function ( value ) {
        findAtom(groups).forEach(obj => {
            obj.material.color.setHex(value);
        })
    } ).listen();
    
    atomProperties.add( params, "Metalness" ).min( 0 ).max( 1 ).onChange( function ( value ) {
        findAtom(groups).forEach(obj => {
            obj.material.metalness = value;
        })
    } );
    atomProperties.add( params, "Roughness" ).min( 0 ).max( 1 ).onChange( function ( value ) {
        findAtom(groups).forEach(obj => {
            obj.material.roughness = value;
        })
    } );

    var guiBone = gui.addFolder('Bone properties');

    boneParameters = {
        'Group name': boneGroups[activeBoneGroup].name,
        'Min distance': boneGroups[activeBoneGroup].minDistance,
        'Max distance' : boneGroups[activeBoneGroup].maxDistance,
        'Color' : boneGroups[activeBoneGroup].material.color.getHex(),
        'Thickness' : 0.1,
        'Roughness': boneGroups[activeBoneGroup].material.roughness,
        'Metalness': boneGroups[activeBoneGroup].material.metalness,
        'Create group': function(){
            var name = prompt("Enter a name for the bone group", "");

            if(name == ""){
                window.alert("You have to enter a name");
                return;
            }

            for(var i=0;i<boneGroups.length;i++){
                if(boneGroups[i].name == name){
                    window.alert("The bone group name " + name + " already exists, please select another");
                    return;
                }
            }
            boneGroups.push(new boneGroup(name,
                            0,
                            0,
                            new THREE.MeshStandardMaterial( {color: Math.random() * 0xffffff,
                                metalness: 0.5,
                                roughness: 0} ),
                            ));

            boneGroupNames.push(name);
            activeBoneGroup = boneGroups.length-1;
            for(var i=0;i<pairDistances.length;i++){
                var row = [];
                for(var j=0;j<pairDistances[i].length;j++){
                    row.push(null);
                }
                boneGroups[activeBoneGroup].bonesAlreadyDrawn.push(row);
            }
        }
    };

    guiBone.add( boneParameters, "Group name", boneGroupNames).listen();

    guiBone.add(boneParameters, 'Min distance').step(0.05).min(0).max(maxDistance).onChange( function(value){
        boneGroups[activeBoneGroup].minDistance = value;
        redrawBones();
    });
    guiBone.add(boneParameters, 'Max distance').step(0.05).min(0).max(maxDistance).onChange( function(value){
        boneGroups[activeBoneGroup].maxDistance = value;
        redrawBones();
    });

    guiBone.addColor( boneParameters, 'Color' ).onChange( function ( value ) {
        boneGroups[activeBoneGroup].material.color.setHex(value);
    } ).listen();

    guiBone.add(boneParameters, 'Thickness'). min(0.1).max(0.5).onChange( function(value){
        for(var i=0;i<boneGroups[activeBoneGroup].bonesAlreadyDrawn.length;i++){
            for(var j=0;j<boneGroups[activeBoneGroup].bonesAlreadyDrawn[i].length;j++){
                if(boneGroups[activeBoneGroup].bonesAlreadyDrawn[i][j] != null){
                    boneGroups[activeBoneGroup].bonesAlreadyDrawn[i][j].geometry.parameters.radiusTop = value;
                    boneGroups[activeBoneGroup].bonesAlreadyDrawn[i][j].geometry.parameters.radiusBottom = value;
                }
            }
        }
    });

    guiBone.add( boneParameters, "Metalness" ).min( 0 ).max( 1 ).onChange( function ( value ) {
        boneGroups[activeBoneGroup].material.metalness = value;
    } );
    guiBone.add( boneParameters, "Roughness" ).min( 0 ).max( 1 ).onChange( function ( value ) {
        boneGroups[activeBoneGroup].material.roughness = value;
    } );

    guiBone.add ( boneParameters, "Create group");  //not working yet
    
    gui.open();
        
    renderer.setClearColor( 0x000000, 1);
    renderer.render( scene, camera );
    animate();
}
function animate(){
    requestAnimationFrame( animate );
    
    /*if ( turn == 0 ) {
        for( var i=0;i<groups.length;i++ ) {
            groups[i].material.envMap = cubeCamera1.renderTarget.texture;
        } 
        cubeCamera2.update( renderer, scene );
        turn = 1;
    } 
    
    else {
        for(var i=0;i<groups.length;i++){
            groups[i].material.envMap = cubeCamera2.renderTarget.texture;
        } 
        cubeCamera1.update( renderer, scene );
        turn = 0;
    }*/
    controls.update();
    renderer.render( scene, camera );
}