//----VARIABLES OF DATA-----
var atomNames = [];
var boneGroupNames = [];
var atomsToDraw = [];
var groups = [];
var boneGroups = [];
var pairDistances = [];

var atomParameters;
var boneParameters;
var settingsParameters;

var activeSelection;
var activeBoneGroup = -1;
var allowedx = 0, allowedy = 0;

var maxDistance = 0;
//--------------------------

var fileName;


var atomType = function(name, coordinates, geometry, material){
        this.name = name;
        this.coordinates = coordinates;
        this.geometry = geometry;
        this.material = material;
    return this;
};

var boneGroup = function(name, minDistance, maxDistance, material, thickness){
        this.name = name;
        this.minDistance = minDistance;
        this.maxDistance = maxDistance;
        this.material = material;
        this.thickness = thickness;
        this.bonesAlreadyDrawn = [];
        this.atomNamesCopy = [];
        this.allowedElements = [];
    return this;
}

var camera, controls, scene, renderer;
var ambientLight, light, r = 0.0;
var lights = [];

THREE.Cache.enabled = true;
var file = new THREE.FileLoader();
var lines;
//----------------------
var turn = 0, cubeCamera1, cubeCamera2;
//---------------------------------

var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight;

var container = document.createElement( 'div' );
document.body.appendChild( container );
renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
container.appendChild( renderer.domElement );    
scene = new THREE.Scene();

//--------------BEGIN OF PROGRAM------------------------

loadFile();

//-------------------------------------------------------

function loadFile(){
    fileName = prompt("Enter a name of the coordinates file", "points.xyz");
    
    if(fileName == ""){
        window.alert("You have to enter a name, please refresh the browser and try again");
        return;
    }

    file.load(
        // resource URL
        fileName,
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
            fillArrays();
            draw();
        },				
        // onProgress callback
        function ( xhr ) {
            console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
        },
        // onError callback
        function ( err ) {
            window.alert("Could not load the file " + fileName + ", please refresh the browser and try again");
        }
    );
}

function clearAllCylinders(){
    for(var i=0;i<boneGroups.length;i++){
        for(var j=0;j<pairDistances.length;j++){
            for(var k=0;k<pairDistances[j].length;k++){
                if(boneGroups[i].bonesAlreadyDrawn[j][k] != null){
                    scene.remove(boneGroups[i].bonesAlreadyDrawn[j][k]);
                    boneGroups[i].bonesAlreadyDrawn[j][k].geometry.dispose();
                    boneGroups[i].bonesAlreadyDrawn[j][k].material.dispose();
                    boneGroups[i].bonesAlreadyDrawn[j][k] = null; 
                }
            }
        }
    }
    boneGroups = [];
    boneGroupNames = [];
}

function fillArrays(){
    var randomColor = Math.random() * 0xffffff;
    for(var i=0, j=0;i<atomsToDraw.length;i++){
        var newAtom = new atomType(	atomsToDraw[i][0],
                                    atomsToDraw[i][1],
                                    new THREE.SphereBufferGeometry( 0.6, 32, 32 ),
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

    //-----------CREATE FIRST BONE GROUP--------------

    boneGroups.push(new boneGroup("Group 1",
                    0,
                    0,
                    new THREE.MeshStandardMaterial( {color: Math.random() * 0xffffff,
                        metalness: 0.5,
                        roughness: 0} ),
                    0.1));

    boneGroupNames.push("Group 1");
    activeBoneGroup = 0;
    for(var i=0;i<pairDistances.length;i++){
        var row = [];
        for(var j=0;j<pairDistances[i].length;j++){
            row.push(null);
        }
        boneGroups[activeBoneGroup].bonesAlreadyDrawn.push(row);
    }

    for(var i=0;i<atomNames.length;i++){
        var row = [];
        for(j=i;j<atomNames.length;j++){
            row.push(true);
        }
        boneGroups[activeBoneGroup].allowedElements.push(row);
        var row2 = [];
        for(j=i;j<atomNames.length;j++){
            row2.push(atomNames[j]);
        }
        boneGroups[activeBoneGroup].atomNamesCopy.push(row2);
    }
}

function createLights(position) {
    var sphere = new THREE.SphereBufferGeometry( 0.3, 16, 8 );
    var lightMaterial = new THREE.MeshBasicMaterial({color: 0xffffff });

    light = new THREE.PointLight( 0xff0040, 4, 0, 2);
    var lightMesh = new THREE.Mesh(sphere, lightMaterial);
    lightMesh.position.set(position[0], position[1], position[2]);
    lightMesh.add(light);
    lights.push(lightMesh);
    scene.add(lightMesh);
}



function draw(){
    var aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
        
    camera = new THREE.PerspectiveCamera( 45, aspect, 2, 10000 );
    camera.position.set( 10, 10, 30 );
    camera.lookAt( scene.position );
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.enableZoom = true;
    controls.enableDamping = true;
    controls.update();						
    ambientLight = new THREE.AmbientLight(0xffffff,1);
    scene.add(ambientLight);

    createLights([0,10,20]);
    createLights([-5,-3,10]);
    createLights([2,5,-6]);
        
    
    var dragControls = new THREE.DragControls( lights, camera, renderer.domElement );
    dragControls.addEventListener( 'dragstart', function () {
        controls.enabled = false;
    } );
    dragControls.addEventListener( 'dragend', function () {
        controls.enabled = true;
    } );
    
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


    // function for finding atom object according to their names.
    function findAtom(){
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
            //mesh.
            scene.add(mesh);
    }


    //---------------------CREATION OF BONES---------------------------

    function createBone(v1, v2, material, thickness){
        var length = v1.distanceTo(v2);
        var position  = v2.clone().add(v1).divideScalar(2);

        var bone = new THREE.CylinderBufferGeometry(thickness,thickness,length,10,10,false);
    
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


    function redrawBones(){
        for(var j=0;j<pairDistances.length;j++){
            for(var k=0;k<pairDistances[j].length;k++){
                var condition1 = (pairDistances[j][k] > boneGroups[activeBoneGroup].minDistance && pairDistances[j][k] <= boneGroups[activeBoneGroup].maxDistance); //Checks min and max distance
                var index1 = atomNames.indexOf(groups[j].name);
                var index2 = boneGroups[activeBoneGroup].atomNamesCopy[index1].indexOf(groups[k+j+1].name);
                var condition2 = boneGroups[activeBoneGroup].allowedElements[index1][index2];   //checks if the bone drawing is allowed
                if(condition1 && condition2){    //has to be a bone
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

    function redrawCylinders(){
        for(var j=0;j<pairDistances.length;j++){
            for(var k=0;k<pairDistances[j].length;k++){
                if(boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k] != null){
                    scene.remove(boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k]);
                    boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k].geometry.dispose();
                    boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k] = createBone(groups[j].coordinates,groups[k+j+1].coordinates,boneGroups[activeBoneGroup].material,boneGroups[activeBoneGroup].thickness);    //the bone is drawn
                    scene.add(boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k]);
                }
            }
        }
    }

    
    //---------------------CREATION OF GUI---------------------------


    function refreshAtomGui(){
        while(guiAtom.__controllers.length > 0){
            guiAtom.__controllers[0].remove();
        }

        atomParameters = {
            'Element': findAtom()[0].name,
            'Color': findAtom()[0].material.color.getHex(),
            'Roughness': findAtom()[0].material.roughness,
            'Metalness': findAtom()[0].material.metalness,
        };
        guiAtom.add( atomParameters, "Element", atomNames).onChange( function ( value ) {
            activeSelection = atomNames[atomNames.indexOf(value)];
            refreshAtomGui();
        } ).listen();
        
        guiAtom.addColor( atomParameters, 'Color' ).onChange( function ( value ) {
            findAtom().forEach(obj => {
                obj.material.color.setHex(value);
            })
        } ).listen();
        
        guiAtom.add( atomParameters, "Metalness" ).min( 0 ).max( 1 ).onChange( function ( value ) {
            findAtom().forEach(obj => {
                obj.material.metalness = value;
            })
        } );
        guiAtom.add( atomParameters, "Roughness" ).min( 0 ).max( 1 ).onChange( function ( value ) {
            findAtom().forEach(obj => {
                obj.material.roughness = value;
            })
        } );
    }


    //------GUI for bone groups---------------

    function refreshBoneGui(){
        while(guiBone.__controllers.length > 0){
            guiBone.__controllers[0].remove();
        }

        boneParameters = {
            'Group name': boneGroups[activeBoneGroup].name,
            'Edit name' : boneGroupNames[activeBoneGroup],
            'Save new name' : function(){
                var newName = boneParameters["Edit name"];
                for(var i=0;i<boneGroups.length;i++){
                    if(boneGroups[i].name == newName){
                        window.alert("The bone group name " + newName + " already exists, please select another");
                        return;
                    }
                }
                boneGroupNames[activeBoneGroup] = newName;
                boneGroups[activeBoneGroup].name = newName;
                refreshBoneGui();
            },
            'Min distance': boneGroups[activeBoneGroup].minDistance,
            'Max distance' : boneGroups[activeBoneGroup].maxDistance,
            'Bone from' : atomNames[allowedx],
            'Bone to' : boneGroups[activeBoneGroup].atomNamesCopy[allowedx][allowedy],
            'Allowed' : boneGroups[activeBoneGroup].allowedElements[allowedx][allowedy],
            'Color' : boneGroups[activeBoneGroup].material.color.getHex(),
            'Thickness' : boneGroups[activeBoneGroup].thickness,
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
                                0.1));
    
                boneGroupNames.push(name);
                activeBoneGroup = boneGroups.length-1;
                for(var i=0;i<pairDistances.length;i++){
                    var row = [];
                    for(var j=0;j<pairDistances[i].length;j++){
                        row.push(null);
                    }
                    boneGroups[activeBoneGroup].bonesAlreadyDrawn.push(row);
                }

                for(var i=0;i<atomNames.length;i++){
                    var row = [];
                    for(j=i;j<atomNames.length;j++){
                        row.push(true);
                    }
                    boneGroups[activeBoneGroup].allowedElements.push(row);
                    var row2 = [];
                    for(j=i;j<atomNames.length;j++){
                        row2.push(atomNames[j]);
                    }
                    boneGroups[activeBoneGroup].atomNamesCopy.push(row2);
                }
                refreshBoneGui();
            },
            'Delete group': function(){
                if(boneGroups.length == 1){
                    window.alert("You cannot delete the last bone group");
                    return;
                }

                var answer = confirm("Are you sure you want to delete the bone group " + boneGroupNames[activeBoneGroup] + "?");
                if (answer == true) {
                    for(var j=0;j<boneGroups[activeBoneGroup].bonesAlreadyDrawn.length;j++){
                        for(var k=0;k<boneGroups[activeBoneGroup].bonesAlreadyDrawn[j].length;k++){            
                            if(boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k] != null){    //clean objects
                                scene.remove(boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k]);
                                boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k].geometry.dispose();
                                boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k].material.dispose();
                                boneGroups[activeBoneGroup].bonesAlreadyDrawn[j][k] = null;   
                            }
                        }
                    }
                    boneGroupNames.splice(activeBoneGroup,1);
                    boneGroups.splice(activeBoneGroup,1);
                    activeBoneGroup = 0;
                    refreshBoneGui();
                }
            }
        };
        

        guiBone.add( boneParameters, "Group name", boneGroupNames).listen().onChange(function(value){
            activeBoneGroup = boneGroupNames.indexOf(value);
            refreshBoneGui();
        });

        guiBone.add( boneParameters, "Edit name");

        guiBone.add ( boneParameters, "Save new name");  

        guiBone.add(boneParameters, 'Min distance').step(0.005).min(0).max(maxDistance).onChange( function(value){
            boneGroups[activeBoneGroup].minDistance = value;
            redrawBones();
        });
        guiBone.add(boneParameters, 'Max distance').step(0.005).min(0).max(maxDistance).onChange( function(value){
            boneGroups[activeBoneGroup].maxDistance = value;
            redrawBones();
        });

        guiBone.add( boneParameters, "Bone from", atomNames).listen().onChange(function(value){
            allowedx = atomNames.indexOf(value);
            allowedy = 0;
            refreshBoneGui();
        });

        guiBone.add( boneParameters, "Bone to", boneGroups[activeBoneGroup].atomNamesCopy[allowedx]).listen().onChange(function(value){
            allowedy = boneGroups[activeBoneGroup].atomNamesCopy[allowedx].indexOf(value);
            refreshBoneGui();
        });

        guiBone.add( boneParameters, "Allowed").listen().onChange(function(value){
            boneGroups[activeBoneGroup].allowedElements[allowedx][allowedy] = value;
            redrawBones();
            refreshBoneGui();
        });

        guiBone.addColor( boneParameters, 'Color' ).onChange( function ( value ) {
            boneGroups[activeBoneGroup].material.color.setHex(value);
        } ).listen();

        guiBone.add(boneParameters, 'Thickness').step(0.01).min(0.1).max(0.7).onChange( function(value){
            boneGroups[activeBoneGroup].thickness = value;
            redrawCylinders();
        });

        guiBone.add( boneParameters, "Metalness" ).min( 0 ).max( 1 ).onChange( function ( value ) {
            boneGroups[activeBoneGroup].material.metalness = value;
        } );
        guiBone.add( boneParameters, "Roughness" ).min( 0 ).max( 1 ).onChange( function ( value ) {
            boneGroups[activeBoneGroup].material.roughness = value;
        } );

        guiBone.add ( boneParameters, "Create group");  
        guiBone.add ( boneParameters, "Delete group");  
    }  

    function refreshSettingsGui(){
        settingsParameters = {
            "Load settings": function(){
                var settingsFile = prompt("Enter a name for the file which contains the settings", fileName + "_settings.txt");
    
                if(settingsFile == ""){
                    window.alert("You have to enter a name");
                    return;
                }

                file.load(
                    // resource URL
                    settingsFile,
                    // onLoad callback
                    function ( data ) {
                        // output the text to the console
                        var lines = data.split('#');

                        var groupsOfAtoms = lines[0].split('$');
                        var groupsOfBones = lines[1].split('$');

                        for(var i=0;i<groupsOfAtoms.length;i++){    //restore atoms
                            var groupData = groupsOfAtoms[i].split(';');
                            activeSelection = atomNames[atomNames.indexOf(groupData[0])];
                            findAtom().forEach(obj => {
                                obj.material.color.setHex(parseInt(groupData[1]));
                            });
                            findAtom().forEach(obj => {
                                obj.material.metalness = parseFloat(groupData[2]);
                            });
                            findAtom().forEach(obj => {
                                obj.material.roughness = parseFloat(groupData[3]);
                            });
                        }
                        activeSelection = atomNames[0];


                        clearAllCylinders();
                        for(var i=0;i<groupsOfBones.length;i++){    //restore bones
                            var groupData = groupsOfBones[i].split(';');
                            //cambiar de cada vez la activeboneselection y redibujar bones/cylinders

                            boneGroups.push(new boneGroup(groupData[0],
                                parseFloat(groupData[1]),
                                parseFloat(groupData[2]),
                                new THREE.MeshStandardMaterial( {color: parseInt(groupData[4]),
                                    metalness: parseFloat(groupData[6]),
                                    roughness: parseFloat(groupData[7])} ),
                                parseFloat(groupData[5])));
    
                            boneGroupNames.push(groupData[0]);
                            activeBoneGroup = boneGroups.length-1;
                            for(var j=0;j<pairDistances.length;j++){
                                var row = [];
                                for(var k=0;k<pairDistances[j].length;k++){
                                    row.push(null);
                                }
                                boneGroups[activeBoneGroup].bonesAlreadyDrawn.push(row);
                            }

                            for(var j=0;j<atomNames.length;j++){
                                var row = [];
                                for(k=j;k<atomNames.length;k++){
                                    row.push(true);
                                }
                                boneGroups[activeBoneGroup].allowedElements.push(row);
                                var row2 = [];
                                for(k=j;k<atomNames.length;k++){
                                    row2.push(atomNames[k]);
                                }
                                boneGroups[activeBoneGroup].atomNamesCopy.push(row2);
                            }

                            //COPY ALLOWED MATRIX AND DONE

                            var allowedMatrix = groupData[3].split('-');
                            for(var j=0;j<allowedMatrix.length;j++){
                                var row = allowedMatrix[j].split(',');
                                for(var k=0;k<row.length;k++){
                                    if (row[k] == "true") boneGroups[activeBoneGroup].allowedElements[j][k] = true;
                                    else boneGroups[activeBoneGroup].allowedElements[j][k] = false;
                                }
                            }

                            redrawBones();
                            redrawCylinders();
                        }

                        activeBoneGroup = 0;
                        refreshAtomGui();
                        refreshBoneGui();
                    },				
                    // onProgress callback
                    function ( xhr ) {
                    },
                    // onError callback
                    function ( err ) {
                        window.alert("Could not load the file " + settingsFile + ", please refresh the browser and try again");
                    }
                );


            },
            "Save settings": function(){
                var content = "";

                var activeSelectionTemp = activeSelection;

                for(var i=0;i<atomNames.length;i++){
                    content += atomNames[i];
                    content += ";";

                    activeSelection = atomNames[i];
                    var currentGroup = findAtom();
                    content += currentGroup[0].material.color.getHex();
                    content += ";";
                    content += currentGroup[0].material.metalness;
                    content += ";";
                    content += currentGroup[0].material.roughness;
                    
                    if(i != atomNames.length - 1){
                        content += "$";
                    }
                }

                activeSelection = activeSelectionTemp;

                content += "#";

                for(var i=0;i<boneGroups.length;i++){
                    content += boneGroups[i].name;
                    content += ";";

                    content += boneGroups[i].minDistance;
                    content += ";";

                    content += boneGroups[i].maxDistance;
                    content += ";";

                    for(var j=0;j<boneGroups[i].allowedElements.length;j++){
                        for(var k=0;k<boneGroups[i].allowedElements[j].length;k++){
                            content += boneGroups[i].allowedElements[j][k];
                            if(k != boneGroups[i].allowedElements[j].length - 1){
                                content += ",";
                            }
                        }

                        if(j != boneGroups[i].allowedElements.length - 1){
                            content += "-"
                        }
                    }

                    content += ";";
                    content += boneGroups[i].material.color.getHex();
                    content += ";";
                    content += boneGroups[i].thickness;
                    content += ";";
                    content += boneGroups[i].material.metalness;
                    content += ";";
                    content += boneGroups[i].material.roughness;


                    if(i != boneGroups.length - 1){
                        content += "$";
                    }
                }

                var filename = fileName + "_settings.txt";

                var blob = new Blob([content], {
                type: "text/plain;charset=utf-8"
                });

                saveAs(blob, filename);
            }
        }

        guiSettings.add(settingsParameters, "Load settings");
        guiSettings.add(settingsParameters, "Save settings");
    }

    var gui = new dat.GUI();
    var guiAtom = gui.addFolder('Atom properties');
    var guiBone = gui.addFolder('Bone properties');
    var guiSettings = gui.addFolder('Manage settings');
    refreshAtomGui();
    refreshBoneGui();    
    refreshSettingsGui();
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