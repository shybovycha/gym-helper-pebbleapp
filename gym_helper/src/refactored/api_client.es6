var Settings = require('settings');

const API_ROOT = 'http://gym-helper-env-j2pgt7yfvp.elasticbeanstalk.com';

class APIClient {
    static _fetchPrograms() {
        console.log('fetching programs...');

        var xhr = new XMLHttpRequest();
        var authToken = Settings.data('auth_token');

        // construct the url for the api
        var url = API_ROOT + '/fetch_programs?auth_token=' + authToken;

        console.log('fetching programs via URL: ' + JSON.stringify(url));

        xhr.open('GET', url, true);

        xhr.onload = function() {
            console.log('programs fetched: ' + xhr.responseText);

            Settings.data('programs', JSON.parse(xhr.responseText));
        };

        xhr.send();
    }

    static getPrograms() {
        var existing = Settings.data('programs');

        if (!existing) {
            APIClient._fetchPrograms();
            existing = Settings.data('programs');
        }

        return existing;
    }

    static openConfigurationWindow() {
        Pebble.openURL(API_ROOT + '/retrieve_auth_token');
    }
}

module.exports = APIClient;