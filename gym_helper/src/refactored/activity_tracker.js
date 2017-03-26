var Accel = require('ui/accel');

var EXCERCISE_PATTERNS = {
    'sitting': { 'dx': -250, 'dy': 50, 'dz': -1000 },
    'staying': { 'dx': 700, 'dy': 100, 'dz': -100 },
    'walking': { 'dx': 1000, 'dy': 250, 'dz': -100 },
    'jumping': { 'dx': 1000, 'dy': 250, 'dz': 0 },
    'running': { 'dx': 1000, 'dy': 100, 'dz': 50 }
};

var MOTION_DETECTION_LAG = 5 * 1000; // 5 seconds of lag
var SHORT_MOTION_DETECTION_LAG = 300; // 1/3 of second of lag

var distance = function(x1, y1, z1, x2, y2, z2) {
    var sq1 = Math.pow((x1 - x2), 2),
        sq2 = Math.pow((y1 - y2), 2),
        sq3 = Math.pow((z1 - z2), 2);

    return Math.sqrt(sq1 + sq2 + sq3);
};

var startTracking = function() {
    this.averages = { sumX: 0, sumY: 0, sumZ: 0, cntX: 0, cntY: 0, cntZ: 0 };
    this.isTracking = true;
};

var stopTracking = function() {
    this.isTracking = false;
};

var detectExcercise = function() {
    var tx = (this.averages.sumX / this.averages.cntX),
        ty = (this.averages.sumY / this.averages.cntY),
        tz = (this.averages.sumZ / this.averages.cntZ),
        bestFit = null,
        bestMatch = null;

    console.log('detection: ' + JSON.stringify({ 'dx': tx, 'dy': ty, 'dz': tz }));

    // find the excercise, which is most likely to match one of the existing patterns
    Object.keys(EXCERCISE_PATTERNS).forEach(function(excerciseName) {
        var searched = EXCERCISE_PATTERNS[excerciseName];
        var fit = this.distance(tx, ty, tz, searched.dx, searched.dy, searched.dz);

        if ((bestFit === null) || (fit < bestFit)) {
            bestFit = fit;
            bestMatch = excerciseName;
        }
    });

    console.log('Best matched: ' + bestMatch);

    return bestMatch;
};

var trackMovement = function(evt) {
    if (!this.isTracking)
        return;

    var points = evt.accels;

    points.forEach(function(point) {
        this.averages.sumX += point.x;
        this.averages.sumY += point.y;
        this.averages.sumZ += point.z;
    });

    this.averages.cntX += evt.samples;
    this.averages.cntY += evt.samples;
    this.averages.cntZ += evt.samples;
};

var isLowMotion = function() {
    var excerciseName = this.detectExcercise();
    var lowMotionDetected = ([ 'walking', 'sitting', 'staying' ].indexOf(excerciseName) > -1);

    if (lowMotionDetected && this.lowMotionStartTime === null) {
        this.lowMotionStartTime = new Date().getTime();
        this.highMotionStartTime = null;
    }

    return (((new Date().getTime() - this.lowMotionStartTime) >= MOTION_DETECTION_LAG) && lowMotionDetected);
};

var isHighMotion = function() {
    var excerciseName = this.detectExcercise();
    var highMotionDetected = ([ 'walking', 'sitting', 'staying' ].indexOf(excerciseName) == -1);

    if (highMotionDetected && this.highMotionStartTime === null) {
        this.highMotionStartTime = new Date().getTime();
    }

    return (((new Date().getTime() - this.highMotionStartTime) >= MOTION_DETECTION_LAG) && highMotionDetected);
};

var isShortMotion = function() {
    var excerciseName = this.detectExcercise();
    var highMotionDetected = ([ 'walking', 'sitting', 'staying' ].indexOf(excerciseName) == -1);
    var lowMotionDetected = ([ 'walking', 'sitting', 'staying' ].indexOf(excerciseName) > -1);

    if (highMotionDetected && this.shortMotionStartTime === null) {
        this.shortMotionStartTime = new Date().getTime();
    }

    return (lowMotionDetected && (new Date().getTime() - this.shortMotionStartTime) >= SHORT_MOTION_DETECTION_LAG);
};

var onAccelerometerCallback = function(evt) {
    if (!this.isTracking)
        return;

    this.trackMovement(evt);

    if (!this.isStartedCurExcercise && this.isHighMotion()) {
        this.isStartedCurExcercise = true; // just started the next excercise
    } else if (this.isStartedCurExcercise && this.isLowMotion()) {
        this.application.programManager.startNextExcercise(); // run pause or next excercise
    }

    // detect the repetitions
    if (this.repetitions !== null) {
        if (this.isStartedCurExcercise && this.isShortMotion()) {
            this.repetitions--;
        }

        if (this.repetitions <= 0) {
            this.application.programManager.startNextExcercise();
        }
    }
};

var setUpAccelerometer = function() {
    Accel.init();

    Accel.config({
        rate: 100,
        samples: 25
    });

    Accel.on('data', this.onAccelerometerCallback);
};

function ActivityTracker(application) {
    this.isTracking = false;
    this.averages = null;
    this.repetitions = null;
    this.lowMotionStartTime = null;
    this.highMotionStartTime = null;
    this.shortMotionStartTime = null;
    this.isStartedCurExcercise = false;

    this.application = application;

    this.distance = distance;
    this.startTracking = startTracking;
    this.stopTracking = stopTracking;
    this.detectExcercise = detectExcercise;
    this.trackMovement = trackMovement;
    this.isLowMotion = isLowMotion;
    this.isHighMotion = isHighMotion;
    this.isShortMotion = isShortMotion;
    this.onAccelerometerCallback = onAccelerometerCallback;
    this.setUpAccelerometer = setUpAccelerometer;
}

module.exports = ActivityTracker;