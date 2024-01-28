var noise = new SimplexNoise();

// Config
var config = {
    circleWireframe: true,
    planeWireframe: true,
    color: 0x6904ce,
    colorChangeSpeed: 0.00002,
    circleAmplitude: 7,
    circleFrequency: 0.00001,
    planeAmplitude: 2,
};

// Check if the URL has any configs
if (window.location.href.split('/')[3].includes("?")) {
    // Change the configs based on the URL
    var urlParams = new URLSearchParams(window.location.href.split('/')[3].split('?')[1]);
    config.circleWireframe = urlParams.get('circleWireframe') == 'true' ? true : false;
    config.planeWireframe = urlParams.get('planeWireframe') == 'true' ? true : false;
    config.color = parseInt(urlParams.get('color')) || 0x6904ce;
    config.colorChangeSpeed = parseFloat(urlParams.get('colorChangeSpeed')) || 0.00002;
    config.circleAmplitude = parseInt(urlParams.get('circleAmplitude')) || 7;
    config.circleFrequency = parseFloat(urlParams.get('circleFrequency')) || 0.00001;
    config.planeAmplitude = parseInt(urlParams.get('planeAmplitude')) || 2;

    if (urlParams.get('wireframe') == 'true') {
        config.circleWireframe = true;
        config.planeWireframe = true;
    } else if (urlParams.get('wireframe') == 'false') {
        config.circleWireframe = false;
        config.planeWireframe = false;
    }
}

// Audio
var vizInit = function () {

    var file = document.getElementById("thefile");
    var audio = document.getElementById("audio");
    var fileLabel = document.querySelector("label.file");

    var playPauseButton = document.getElementById("playpause");
    var isPlaying = false;

    var volumeSlider = document.getElementById("volume-slider");

    document.onload = function (e) {
        console.log(e);
        audio.play();
        play();
    }

    file.onchange = function () {
        fileLabel.classList.add('normal');
        audio.classList.add('active');
        var files = this.files;

        if (files[0].type.startsWith('audio')) {
            // Handle audio file
            audio.src = URL.createObjectURL(files[0]);
            audio.load();
            audio.play();
        } else if (files[0].type.startsWith('video')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                audio.src = URL.createObjectURL(files[0]);
                audio.load();
                audio.play();
            };
            reader.readAsDataURL(files[0]);
        }

        play();
        // Change the audio volume to 0.5
        audio.volume = 0.25;

        // Check if the audio metadata is loaded
        audio.addEventListener("loadedmetadata", function () {
            document.getElementById("customaudiocontrol").style.display = "flex";
            setupPlayPause();
            setupVolumeControl();
            isPlaying = true;
        });
    }

    function setupPlayPause() {
        playPauseButton.addEventListener("click", function () {
            if (isPlaying) {
                audio.pause();
            } else {
                audio.play();
            }

            isPlaying = !isPlaying;
            updatePlayPauseIcon();
        });

        function updatePlayPauseIcon() {
            if (isPlaying) {
                playPauseButton.classList.remove("pause");
                playPauseButton.classList.add("play");
            } else {
                playPauseButton.classList.remove("play");
                playPauseButton.classList.add("pause");
            }
        }
    }

    function setupVolumeControl() {
        // Set up initial volume slider position based on the audio's current volume
        volumeSlider.value = audio.volume * 100;
        document.getElementById("audiovolume").innerHTML = volumeSlider.value + "%";

        // Update volume when slider is changed
        volumeSlider.addEventListener("input", function () {
            var newVolume = volumeSlider.value / 100;
            audio.volume = newVolume;
            // Update label when slider is changed
            var newVolume = volumeSlider.value;
            document.getElementById("audiovolume").innerHTML = newVolume + "%";
        });

    }

    function play() {
        var context = new AudioContext();
        var src = context.createMediaElementSource(audio);
        var analyser = context.createAnalyser();
        src.connect(analyser);
        analyser.connect(context.destination);
        analyser.fftSize = 512;
        var bufferLength = analyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);
        var scene = new THREE.Scene();
        var group = new THREE.Group();
        var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 100);
        camera.lookAt(scene.position);
        scene.add(camera);

        var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        var planeGeometry = new THREE.PlaneGeometry(800, 800, 20, 20);
        var planeMaterial = new THREE.MeshLambertMaterial({
            color: config.color,
            side: THREE.DoubleSide,
            wireframe: config.planeWireframe,
        });

        var plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -0.5 * Math.PI;
        plane.position.set(0, 30, 0);
        group.add(plane);

        var plane2 = new THREE.Mesh(planeGeometry, planeMaterial);
        plane2.rotation.x = -0.5 * Math.PI;
        plane2.position.set(0, -30, 0);
        group.add(plane2);

        var icosahedronGeometry = new THREE.IcosahedronGeometry(10, 4);
        var lambertMaterial = new THREE.MeshLambertMaterial({
            wireframe: config.circleWireframe,
        });

        var ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
        ball.position.set(0, 0, 0);
        group.add(ball);

        var ambientLight = new THREE.AmbientLight(0xaaaaaa);
        scene.add(ambientLight);

        var spotLight = new THREE.SpotLight(0xffffff);
        spotLight.intensity = 0.9;
        spotLight.position.set(-10, 40, 20);
        spotLight.lookAt(ball);
        spotLight.castShadow = true;
        scene.add(spotLight);

        scene.add(group);

        document.getElementById('out').appendChild(renderer.domElement);

        window.addEventListener('resize', onWindowResize, false);

        render();

        function render() {
            analyser.getByteFrequencyData(dataArray);

            var lowerHalfArray = dataArray.slice(0, (dataArray.length / 2) - 1);
            var upperHalfArray = dataArray.slice((dataArray.length / 2) - 1, dataArray.length - 1);

            //var overallAvg = avg(dataArray);
            var lowerMax = max(lowerHalfArray);
            //var lowerAvg = avg(lowerHalfArray);
            //var upperMax = max(upperHalfArray);
            var upperAvg = avg(upperHalfArray);

            var lowerMaxFr = lowerMax / lowerHalfArray.length;
            //var lowerAvgFr = lowerAvg / lowerHalfArray.length;
            //var upperMaxFr = upperMax / upperHalfArray.length;
            var upperAvgFr = upperAvg / upperHalfArray.length;

            makeRoughGround(plane, modulate(upperAvgFr, 0, 1, 0.5, 4));
            makeRoughGround(plane2, modulate(lowerMaxFr, 0, 1, 0.5, 4));

            makeRoughBall(ball, modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 8), modulate(upperAvgFr, 0, 1, 0, 4));

            group.rotation.y += 0.005;
            renderer.render(scene, camera);
            requestAnimationFrame(render);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function makeRoughBall(mesh, bassFr, treFr) {
            var colorRange = modulate(treFr, 0, 1, 0, 1);
            var time = Date.now() * config.colorChangeSpeed; // Altere este valor para alterar a velocidade da mudança de cor
            var hue = (time % 1);
            var saturation = colorRange + modulate(bassFr, 0, 1, 0, 0.5);
            var lightness = Math.sin(time * 0.001) * 0.5 + 0.75;
            
            var color = new THREE.Color().setHSL(hue, saturation, lightness);

            mesh.material.color = color;

            mesh.geometry.vertices.forEach(function (vertex, i) {
                var offset = mesh.geometry.parameters.radius;
                var amp = config.circleAmplitude;
                var time = window.performance.now();
                vertex.normalize();
                var rf = config.circleFrequency;
                var distance = (offset + bassFr) + noise.noise3D(vertex.x + time * rf * 7, vertex.y + time * rf * 8, vertex.z + time * rf * 9) * amp * treFr;
                vertex.multiplyScalar(distance);
            });

            mesh.geometry.verticesNeedUpdate = true;
            mesh.geometry.normalsNeedUpdate = true;
            mesh.geometry.computeVertexNormals();
            mesh.geometry.computeFaceNormals();
        }

        function makeRoughGround(mesh, distortionFr) {
            mesh.geometry.vertices.forEach(function (vertex, i) {
                var amp = config.planeAmplitude;
                var time = Date.now();
                var distance = (noise.noise2D(vertex.x + time * 0.0003, vertex.y + time * 0.0001) + 0) * distortionFr * amp;
                vertex.z = distance;
            });
            mesh.geometry.verticesNeedUpdate = true;
            mesh.geometry.normalsNeedUpdate = true;
            mesh.geometry.computeVertexNormals();
            mesh.geometry.computeFaceNormals();
        }

        // Countdown
        audio.addEventListener("timeupdate", function () {
            var timeleft = document.getElementById('timeleft'),
                duration = parseInt(audio.duration),
                currentTime = parseInt(audio.currentTime),
                timeLeft = duration - currentTime,
                s, m;


            s = timeLeft % 60;
            m = Math.floor(timeLeft / 60) % 60;

            s = s < 10 ? "0" + s : s;
            m = m < 10 ? "0" + m : m;

            timeleft.innerHTML = m + ":" + s;

        }, false);
    };
}
window.onload = vizInit();

document.body.addEventListener('touchend', function (ev) { context.resume(); });

function fractionate(val, minVal, maxVal) {
    return (val - minVal) / (maxVal - minVal);
}

function modulate(val, minVal, maxVal, outMin, outMax) {
    var fr = fractionate(val, minVal, maxVal);
    var delta = outMax - outMin;
    return outMin + (fr * delta);
}

function avg(arr) {
    var total = arr.reduce(function (sum, b) { return sum + b; });
    return (total / arr.length);
}

function max(arr) {
    return arr.reduce(function (a, b) { return Math.max(a, b); })
}