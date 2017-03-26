var Accel = require('ui/accel');

class ActivityTracker {
    constructor(application) {
        this.EXCERCISE_PATTERNS = {
            'sitting': { 'dx': -250, 'dy': 50, 'dz': -1000 },
            'staying': { 'dx': 700, 'dy': 100, 'dz': -100 },
            'walking': { 'dx': 1000, 'dy': 250, 'dz': -100 },
            'jumping': { 'dx': 1000, 'dy': 250, 'dz': 0 },
            'running': { 'dx': 1000, 'dy': 100, 'dz': 50 }
        };

        this.MOTION_DETECTION_LAG = 5 * 1000; // 5 seconds of lag
        this.SHORT_MOTION_DETECTION_LAG = 300; // 1/3 of second of lag

        this.isTracking = false;
        this.averages = null;
        this.repetitions = null;
        this.lowMotionStartTime = null;
        this.highMotionStartTime = null;
        this.shortMotionStartTime = null;
        this.isStartedCurExcercise = false;

        this.application = application;
    }

    distance(x1, y1, z1, x2, y2, z2) {
        var sq1 = Math.pow((x1 - x2), 2),
            sq2 = Math.pow((y1 - y2), 2),
            sq3 = Math.pow((z1 - z2), 2);

        return Math.sqrt(sq1 + sq2 + sq3);
    }

    startTracking() {
        this.averages = { sumX: 0, sumY: 0, sumZ: 0, cntX: 0, cntY: 0, cntZ: 0 };
        this.isTracking = true;
    }

    stopTracking() {
        this.isTracking = false;
    }

    detectExcercise() {
        var tx = (this.averages.sumX / this.averages.cntX),
            ty = (this.averages.sumY / this.averages.cntY),
            tz = (this.averages.sumZ / this.averages.cntZ),
            bestFit = null,
            bestMatch = null;

        console.log('detection: ' + JSON.stringify({ 'dx': tx, 'dy': ty, 'dz': tz }));

        // find the excercise, which is most likely to match one of the existing patterns
        Object.keys(this.EXCERCISE_PATTERNS).forEach(function(excerciseName) {
            var searched = this.EXCERCISE_PATTERNS[excerciseName];
            var fit = this.distance(tx, ty, tz, searched.dx, searched.dy, searched.dz);

            if ((bestFit === null) || (fit < bestFit)) {
                bestFit = fit;
                bestMatch = excerciseName;
            }
        });

        console.log('Best matched: ' + bestMatch);

        return bestMatch;
    }

    trackMovement(evt) {
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
    }

    isLowMotion() {
        var excerciseName = this.detectExcercise();
        var lowMotionDetected = ([ 'walking', 'sitting', 'staying' ].indexOf(excerciseName) > -1);

        if (lowMotionDetected && this.lowMotionStartTime === null) {
            this.lowMotionStartTime = new Date().getTime();
            this.highMotionStartTime = null;
        }

        return (((new Date().getTime() - this.lowMotionStartTime) >= this.MOTION_DETECTION_LAG) && lowMotionDetected);
    }

    isHighMotion() {
        var excerciseName = this.detectExcercise();
        var highMotionDetected = ([ 'walking', 'sitting', 'staying' ].indexOf(excerciseName) == -1);

        if (highMotionDetected && this.highMotionStartTime === null) {
            this.highMotionStartTime = new Date().getTime();
        }

        return (((new Date().getTime() - this.highMotionStartTime) >= this.MOTION_DETECTION_LAG) && highMotionDetected);
    }

    isShortMotion() {
        var excerciseName = this.detectExcercise();
        var highMotionDetected = ([ 'walking', 'sitting', 'staying' ].indexOf(excerciseName) == -1);
        var lowMotionDetected = ([ 'walking', 'sitting', 'staying' ].indexOf(excerciseName) > -1);

        if (highMotionDetected && this.shortMotionStartTime === null) {
            this.shortMotionStartTime = new Date().getTime();
        }

        return (lowMotionDetected && (new Date().getTime() - this.shortMotionStartTime) >= this.SHORT_MOTION_DETECTION_LAG);
    }

    onAccelerometerCallback(evt) {
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
    }

    setUpAccelerometer() {
        Accel.init();

        Accel.config({
            rate: 100,
            samples: 25
        });

        Accel.on('data', this.onAccelerometerCallback);
    }
}

module.exports = ActivityTracker;