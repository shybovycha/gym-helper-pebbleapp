var UI = require('ui');
var Vector2 = require('vector2');
var Settings = require('settings');
var Accel = require('ui/accel');
var Vibe = require('ui/vibe');
var Wakeup = require('wakeup');

var API_ROOT = 'http://gymhelper-env.elasticbeanstalk.com/';
var DAYS_OF_WEEK = [ 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday' ];
var TRAINING_DAY_TITLES = { true: 'Train hard or go home!', false: 'Take a rest for today' };
var EXCERCISE_PATTERNS = {
    'sitting': { 'dx': -250, 'dy': 50, 'dz': -1000 },
    'staying': { 'dx': 700, 'dy': 100, 'dz': -100 },
    'walking': { 'dx': 1200, 'dy': 250, 'dz': -100 },
    'jumping': { 'dx': 700, 'dy': 250, 'dz': 0 },
    'running': { 'dx': 900, 'dy': 100, 'dz': 50 }
};
var MOTION_DETECTION_LAG = 2 * 1000; // 2 seconds of lag
var SHORT_MOTION_DETECTION_LAG = 0.75 * 1000; // 3/4 of second of lag

var isReady = false, isTracking = false;
var averages = null, repetitions = null;
var programForToday = null, excercisesForToday = null;
var isTrainingDay = false, curExcerciseIndex = null;
var isStartedCurExcercise = false;
var lowMotionStartTime = null, highMotionStartTime = null, shortMotionStartTime = null;

function distance(x1, y1, z1, x2, y2, z2) {
    var sq1 = Math.pow((x1 - x2), 2),
        sq2 = Math.pow((y1 - y2), 2),
        sq3 = Math.pow((z1 - z2), 2);

    return Math.sqrt(sq1 + sq2 + sq3);
}

function getCurrentExcercise() {
    return excercisesForToday[curExcerciseIndex];
}

function startTracking() {
    averages = { sumX: 0, sumY: 0, sumZ: 0, cntX: 0, cntY: 0, cntZ: 0 };
    isTracking = true;
}

function stopTracking() {
    isTracking = false;
}

function detectExcercise() {
    var tx = (averages.sumX / averages.cntX),
        ty = (averages.sumY / averages.cntY),
        tz = (averages.sumZ / averages.cntZ),
        bestFit = null,
        bestMatch = null;

    //console.log('detection: ' + JSON.stringify({ 'dx': tx, 'dy': ty, 'dz': tz }));

    // find the excercise, which is most likely to match one of the existing patterns
    Object.keys(EXCERCISE_PATTERNS).forEach(function(excerciseName) {
        var searched = EXCERCISE_PATTERNS[excerciseName];
        var fit = distance(tx, ty, tz, searched.dx, searched.dy, searched.dz);

        if ((bestFit === null) || (fit < bestFit)) {
            bestFit = fit;
            bestMatch = excerciseName;
        }
    });

    //console.log('Best matched: ' + bestMatch);

    return bestMatch;
}

function trackMovement(evt) {
    if (!isTracking)
        return;

    var points = evt.accels;

    points.forEach(function(point) {
        averages.sumX += point.x;
        averages.sumY += point.y;
        averages.sumZ += point.z;
    });

    averages.cntX += evt.samples;
    averages.cntY += evt.samples;
    averages.cntZ += evt.samples;
}

function isLowMotion() {
    var excerciseName = detectExcercise();
    var lowMotionDetected = ([ 'walking', 'sitting', 'staying' ].indexOf(excerciseName) > -1);

    if (lowMotionDetected && lowMotionStartTime === null) {
        lowMotionStartTime = new Date().getTime();
        highMotionStartTime = null;
    }

    return (((new Date().getTime() - lowMotionStartTime) >= MOTION_DETECTION_LAG) && lowMotionDetected);
}

function isHighMotion() {
    var excerciseName = detectExcercise();
    var highMotionDetected = ([ 'walking', 'sitting', 'staying' ].indexOf(excerciseName) == -1);

    if (highMotionDetected && highMotionStartTime === null) {
        highMotionStartTime = new Date().getTime();
    }

    return (((new Date().getTime() - highMotionStartTime) >= MOTION_DETECTION_LAG) && highMotionDetected);
}

function isShortMotion() {
    var excerciseName = detectExcercise();
    var highMotionDetected = ([ 'walking', 'sitting', 'staying' ].indexOf(excerciseName) == -1);
    var lowMotionDetected = ([ 'walking', 'sitting', 'staying' ].indexOf(excerciseName) > -1);

    if (highMotionDetected && shortMotionStartTime === null) {
        shortMotionStartTime = new Date().getTime();
    }

    return (lowMotionDetected && (new Date().getTime() - shortMotionStartTime) >= SHORT_MOTION_DETECTION_LAG);
}

function onAccelerometerCallback(evt) {
    if (!isTracking)
        return;

    trackMovement(evt);

    if (!isStartedCurExcercise && isHighMotion()) {
        console.log('DETECTED EXC STARTED');
        isStartedCurExcercise = true; // just started the next excercise
    } else if (isStartedCurExcercise && isLowMotion()) {
        console.log('DETECTED EXC FINISHED');
        startNextExcercise(); // run pause or next excercise
    }

    // detect the repetitions
    if (repetitions !== null) {
        if (isStartedCurExcercise && isShortMotion()) {
            console.log('REPETITIONS LEFT:' + JSON.stringify(repetitions));
            repetitions--;
        }

        if (repetitions <= 0) {
            startNextExcercise();
        }
    }
}

function setUpAccelerometer() {
    Accel.init();

    Accel.config({
        rate: 100,
        samples: 25
    });

    Accel.on('data', onAccelerometerCallback);
}

function setUpExcercises() {
    var programs = getPrograms();
    var day = DAYS_OF_WEEK[new Date().getDay()]; // returns the day of week name by its index
    // HACK FOR DEMO ONLY
    day = 'monday';
    programForToday = programs[day];
    excercisesForToday = programForToday.excercises;
    isTrainingDay = programForToday.active;
}

function fetchPrograms() {
    console.log('fetching programs...');

    var xhr = new XMLHttpRequest();
    var authToken = Settings.data('auth_token');

    // construct the url for the api
    var url = API_ROOT + '/fetch_programs?auth_token=' + authToken;

    console.log('Fetching programs via URL: ' + JSON.stringify(url));

    xhr.open('GET', url, true);

    xhr.onload = function() {
        console.log('programs fetched: ' + xhr.responseText);

        Settings.data('programs', JSON.parse(xhr.responseText));
    };

    xhr.send();
}

function getPrograms() {
    var existing = Settings.data('programs');

    if (!existing) {
        fetchPrograms();
        existing = Settings.data('programs');
    }

    return existing;
}

function startNextExcercise() {
    console.log('STARTING NEXT EXCERCISE');

    if (curExcerciseIndex === null) {
        curExcerciseIndex = 0;
        startTracking();
    } else if (curExcerciseIndex == excercisesForToday.length - 1) {
        stopTracking();
        showFarewellScreen();
    } else {
        curExcerciseIndex++;
    }

    isStartedCurExcercise = false;

    showNextExcerciseScreen();
}

function showNextExcerciseScreen() {
    Vibe.vibrate('short');

    var excercise = getCurrentExcercise();

    console.log('>> NEXT: ' + excercise.name);

    var window = new UI.Window({
        fullscreen: true
    });

    var image = new UI.Image({
        position: new Vector2(10, 10),
        image: 'images/' + excercise.image + '.png'
    });

    window.add(image);

    var text = new UI.Text({
        position: new Vector2(65, 5),
        size: new Vector2(60, 50),
        font: 'gothic-24-bold',
        text: 'next:\n' + excercise.name,
        textAlign: 'center'
    });

    window.add(text);

    var subtitleText = new UI.Text({
        position: new Vector2(10, 65),
        size: new Vector2(144, 30),
        font: 'gothic-24-bold',
        text: excercise.name + ' for ' + (excercise.duration_text || excercise.repetitions_text),
        textAlign: 'left'
    });

    window.add(subtitleText);

    window.show();
}

function showFarewellScreen() {
    Vibe.vibrate('long');

    stopTracking();

    var window = new UI.Window({
        fullscreen: true
    });

    var image = new UI.Image({
        position: new Vector2(10, 10),
        image: 'images/rest.png'
    });

    window.add(image);

    var text = new UI.Text({
        position: new Vector2(65, 10),
        size: new Vector2(144, 30),
        font: 'gothic-24-bold',
        text: 'See you next time!',
        textAlign: 'center'
    });

    window.add(text);

    window.show();

    window.on('click', 'up', exit);
    window.on('click', 'select', exit);
    window.on('click', 'down', exit);
}

function showWelcomeScreen() {
    var todayTitle = TRAINING_DAY_TITLES[isTrainingDay];

    var mainWindow = new UI.Card({
        title: 'Gym\nHelper',
        icon: 'images/main_icon.png',
        subtitle: todayTitle,
        body: (isTrainingDay ? 'Press any button' : 'Nothing to do here today')
    });

    mainWindow.show();

    if (!isTrainingDay)
        return;

    mainWindow.on('click', 'up', startNextExcercise);
    mainWindow.on('click', 'select', startNextExcercise);
    mainWindow.on('click', 'down', startNextExcercise);
}

function init() {
    setUpExcercises();
    isReady = true;
    setUpAccelerometer();
}

function run() {
    init();
    showWelcomeScreen();
}

function exit() {
    Pebble.sendAppMessage({ quit: true });
}

// open config window on a mobile phone to retrieve auth token
Pebble.addEventListener('showConfiguration', function(e) {
    console.log('Configuration window opened');
    Pebble.openURL(API_ROOT + '/retrieve_auth_token');
});

// fired when app is ready - either when an app was started
// or when a set of programs was fetched
Pebble.addEventListener('ready', function(e) {
    console.log('READY event fired!');
    run();
}, function(err) {
    console.error(err);
});

// fired when settings window is closed on mobile phone
// (or an auth token is received)
Pebble.addEventListener('webviewclosed', function(e) {
    console.log('Configuration window returned: ' + e.response);
    Settings.data('auth_token', e.response);

    var programs = Settings.data('programs');

    console.log('auth_token at Settings:' + JSON.stringify(Settings.data('auth_token')));
    console.log('programs at Settings:' + JSON.stringify(programs));

    console.log('starting fetching programs');
    fetchPrograms();
});

// fired when an app is woke up due to nextExcercise timer
Wakeup.launch(function(e) {
    if (e.wakeup) {
        console.log('Woke up to ' + e.id + '! data: ' + JSON.stringify(e.data));

        init();
        curExcerciseIndex = e.data;
        startNextExcercise();
    } else {
        console.log('Regular launch not by a wakeup event.');
    }
});

run();