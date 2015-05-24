var UI = require('ui');
var Vector2 = require('vector2');
var Vibe = require('ui/vibe');

class UIManager {
    constructor(application) {
        this.TRAINING_DAY_TITLES = {
            true: 'Train hard or go home!',
            false: 'Take a rest for today'
        };

        this.application = application;
    }

    showNextExcerciseScreen() {
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
    }

    showFarewellScreen() {
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
    }

    showWelcomeScreen() {
        var isTrainingDay = this.application.programManager.programForToday().active;
        var todayTitle = this.TRAINING_DAY_TITLES[isTrainingDay];

        var mainWindow = new UI.Card({
            title: 'Gym\nHelper',
            icon: 'images/main_icon.png',
            subtitle: todayTitle,
            body: (isTrainingDay ? 'Press any button' : 'Nothing to do here today')
        });

        mainWindow.show();

        if (!isTrainingDay)
            return;

        mainWindow.on('click', 'up', this.application.programManager.startNextExcercise);
        mainWindow.on('click', 'select', this.application.programManager.startNextExcercise);
        mainWindow.on('click', 'down', this.application.programManager.startNextExcercise);
    }
}

module.exports = UIManager;