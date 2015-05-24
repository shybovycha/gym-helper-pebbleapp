var ProgramManager = require('program_manager');
var UIManager = require('ui_manager');
var ActivityTracker = require('activity_tracker');
var ApiClient = require('api_client');
var Settings = require('settings');
var Wakeup = require('wakeup');

class Application {
    constructor() {
        this.programManager = new ProgramManager(this);
        this.uiManager = new UIManager(this);
        this.activityTracker = new ActivityTracker(this);
        this.isReady = false;
    }

    init() {
        if (this.isReady)
            return;

        // open config window on a mobile phone to retrieve auth token
        Pebble.addEventListener('showConfiguration', function(e) {
            console.log('Configuration window opened');
            ApiClient.openConfigurationWindow();
        });

        // fired when app is ready - either when an app was started
        // or when a set of programs was fetched
        Pebble.addEventListener('ready', function(e) {
            console.log('READY event fired!');
            this.run();
        }, function(err) {
            console.error(err);
        });

        // fired when settings window is closed on mobile phone
        // (or an auth token is received)
        Pebble.addEventListener('webviewclosed', function(e) {
            console.log('Configuration window returned: ' + e.response);
            Settings.data('auth_token', e.response);

            var programs = Settings.data('programs');

            console.log('starting fetching programs');
            this.programManager.fetchPrograms();
        });

        // fired when an app is woke up due to nextExcercise timer
        Wakeup.launch(function(e) {
            if (e.wakeup) {
                console.log('Woke up to ' + e.id + '! data: ' + JSON.stringify(e.data));

                this.init();
                this.programManager.restoreState(e.data);
                this.programManager.startNextExcercise();
            } else {
                console.log('Regular launch not by a wakeup event.');
            }
        });

        this.isReady = true;
        // setUpAccelerometer();
    }

    run() {
        this.init();
        this.uiManager.showWelcomeScreen();
    }

    exit() {
        Pebble.sendAppMessage({ quit: true });
    }
}

module.exports = Application;