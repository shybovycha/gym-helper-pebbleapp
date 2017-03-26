var ApiClient = require('api_client');

var DAYS_OF_WEEK = [
    'monday', 'tuesday', 'wednesday',
    'thursday', 'friday', 'saturday', 'sunday'
];

var programForToday = function() {
    if (!this.programs)
        this.fetchPrograms();

    console.log('program for today (' + JSON.stringify(this.today) + '): ' + JSON.stringify(this.programs[this.today]));

    return this.programs[this.today];
};

var excercisesForToday = function() {
    var program = this.programForToday();

    console.log('excercises for today: ' + JSON.stringify(program.excercises));

    return program.excercises;
};

var currentExcercise = function() {
    var excercises = this.excercisesForToday();

    return excercises[this.curExcerciseIndex];
};

var fetchPrograms = function() {
    this.programs = ApiClient.getPrograms();
};

var restoreState = function(oldExcerciseIndex) {
    this.curExcerciseIndex = oldExcerciseIndex;
};

var startNextExcercise = function() {
    console.log('Starting next excercise from : ' + JSON.stringify(this));

    var excercises = this.excercisesForToday();

    if (this.curExcerciseIndex === null) {
        this.curExcerciseIndex = 0;
        this.application.activityTracker.startTracking();
    } else if (this.curExcerciseIndex == excercises.length - 1) {
        this.application.activityTracker.stopTracking();
        this.application.uiManager.showFarewellScreen();
    } else {
        this.curExcerciseIndex++;
    }

    this.application.activityTracker.isStartedCurExcercise = false;

    this.application.uiManager.showNextExcerciseScreen();
};

function ProgramManager(application) {
    this.application = application;

    this.programs = null;
    this.curExcerciseIndex = null;
    this.today = DAYS_OF_WEEK[new Date().getDay()]; // returns the day of week name by its index

    // HACK FOR DEMO ONLY
    this.today = 'monday';

    this.programForToday = programForToday;
    this.excercisesForToday = excercisesForToday;
    this.currentExcercise = currentExcercise;
    this.fetchPrograms = fetchPrograms;
    this.restoreState = restoreState;
    this.startNextExcercise = startNextExcercise;
}

module.exports = ProgramManager;