var UI = require('ui');
var Vector2 = require('vector2');
var Vibe = require('ui/vibe');

var TRAINING_DAY_TITLES = {
    true: 'Train hard or go home!',
    false: 'Take a rest for today'
};

var showNextExcerciseScreen = function() {
    Vibe.vibrate('short');

    var excercise = this.application.programManager.currentExcercise();

    console.log('Next excercise will be: ' + excercise.name);

    var window = new UI.Window({
        fullscreen: true
    });

    var image = new UI.Image({
        position: new Vector2(10, 10),
        image: 'images/' + excercise.image + '.png'
    });

    window.add(image);

    var text = new UI.Text({
        position: new Vector2(35, 10),
        size: new Vector2(144, 30),
        font: 'gothic-24-bold',
        text: excercise.name,
        textAlign: 'center'
    });

    window.add(text);

    var subtitleText = new UI.Text({
        position: new Vector2(10, 40),
        size: new Vector2(144, 30),
        font: 'gothic-18-bold',
        text: excercise.name,
        textAlign: 'center'
    });

    window.add(subtitleText);

    window.show();
};

var showFarewellScreen = function() {
    Vibe.vibrate('long');

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

    window.on('click', 'up', this.application.exit);
    window.on('click', 'select', this.application.exit);
    window.on('click', 'down', this.application.exit);
};

var showWelcomeScreen = function() {
    var isTrainingDay = this.application.programManager.programForToday().active;
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

    var pm = this.application.programManager,
        cb = pm.startNextExcercise;

    mainWindow.on('click', 'up', cb);
    mainWindow.on('click', 'select', cb);
    mainWindow.on('click', 'down', cb);
};

function UIManager(application) {
    this.application = application;

    this.showNextExcerciseScreen = showNextExcerciseScreen;
    this.showFarewellScreen = showFarewellScreen;
    this.showWelcomeScreen = showWelcomeScreen;
}

module.exports = UIManager;