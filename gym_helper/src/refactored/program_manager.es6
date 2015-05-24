var ApiClient = require('api_client');

class ProgramManager {
    constructor(application) {
        this.DAYS_OF_WEEK = [
            'monday', 'tuesday', 'wednesday',
            'thursday', 'friday', 'saturday', 'sunday'
        ];

        this.application = application;

        this.programs = null;
        this.curExcerciseIndex = null;
        this.today = this.DAYS_OF_WEEK[new Date().getDay()]; // returns the day of week name by its index

        // HACK FOR DEMO ONLY
        this.today = 'monday';
    }

    programForToday() {
        if (!this.programs)
            this.fetchPrograms();

        console.log('program for today (' + JSON.stringify(this.today) + '): ' + JSON.stringify(this.programs[this.today]))

        return this.programs[this.today];
    }

    excercisesForToday() {
        var program = this.programForToday();

        console.log('excercises for today: ' + JSON.stringify(program.excercises))

        return program.excercises;
    }

    currentExcercise() {
        var excercises = this.excercisesForToday();

        return excercises[this.curExcerciseIndex];
    }

    fetchPrograms() {
        this.programs = ApiClient.getPrograms();
    }

    restoreState(oldExcerciseIndex) {
        this.curExcerciseIndex = oldExcerciseIndex;
    }

    startNextExcercise() {
        console.log('Starting next excercise');

        var excercisesForToday = this.excercisesForToday();

        if (this.curExcerciseIndex === null) {
            this.curExcerciseIndex = 0;
            this.application.activityTracker.startTracking();
        } else if (this.curExcerciseIndex == excercisesForToday.length - 1) {
            this.application.activityTracker.stopTracking();
            this.application.uiManager.showFarewellScreen();
        } else {
            this.curExcerciseIndex++;
        }

        this.application.activityTracker.isStartedCurExcercise = false;

        this.application.uiManager.showNextExcerciseScreen();
    }
}

module.exports = ProgramManager;