var app = ons.bootstrap();
$.getJSON("https://devfest2015.gdgnantes.com/assets/prog.json", function(data) {
    localStorage.setItem("data", JSON.stringify(data));
});

var currentSession;
var currentSpeaker;
var currentImageData;

var db = null;
document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady() {
    db = window.sqlitePlugin.openDatabase({name: "sessions"});
    db.transaction(function(tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS NOTES (id integer primary key, comment text, sessionId text)');
        tx.executeSql('CREATE TABLE IF NOT EXISTS IMAGES (id integer primary key, url text, sessionId text)');
        tx.executeSql('CREATE TABLE IF NOT EXISTS CAPTURES (id integer primary key, path text, sessionId text, type text)');
    });
};

//Création de la page Session
$(document).on('pageinit', "#sessionsPage", function() {
    var data = JSON.parse(localStorage.getItem("data"));
    console.log(data);
    for(var category in data.categories) {
        $("#sessionList").append("<ons-list-header>" + category + "</ons-list-header>");
        data.sessions.forEach(function(session) {
            if(session.type === category){
                $("#sessionList").append("<ons-list-item modifier='chevron' onclick=\"app.navi.pushPage('views/sessionDetail.html', {id: \'" + session.id
                + "\'})\">" + session.title + "</ons-list-item>");
            }
        })
    };
    ons.compile(document.getElementById("sessionList"));
});

//Création de la page Présenteurs
$(document).on('pageinit', "#speakersPage", function() {
    var data = JSON.parse(localStorage.getItem("data"));
    data.speakers.forEach(function(speaker) {
        $("#speakerList").append("<ons-list-item modifier='chevron' class='list-item-container' onclick=\"app.navi.pushPage('views/speakerDetail.html', {id: \'" + speaker.id
        + "\'})\"><div class='list-item-left'><img src='data/images/"
        + speaker.image
        + "' class='avator'></div><div class='list-item-right'><div class='list-item-content'><div class='name'>"
        + getFullName(speaker)
        + "<span class='lucent'>@"
        + speaker.id
        + "</span></div><span class='desc'>" + speaker.about + "<i class='fa fa-meh-o' style='color: orangered;'></i></span></div></div></ons-list-item>");
    });
    ons.compile(document.getElementById("speakerList"));
});

//Création de la page Agenda
$(document).on('pageinit', "#agendaPage", function() {
    var data = JSON.parse(localStorage.getItem("data"));
    for(var hour in data.hours) {
        data.sessions.forEach(function(session) {
            if(hour === session.hour) {
                console.log(session);
                $("#agendaList").append("<ons-list-item modifier=\"chevron\" class=\"plan\" onclick=\"app.navi.pushPage('views/sessionDetail.html', {id: \'"
                + session.id
                + "\'})\"><ons-row><ons-col width=\"80px\" class=\"plan-left\"><div class=\"plan-date\">"
                + getHour(data.hours[hour])
                + "</div><div class=\"plan-duration\">"
                + getDuration(data.hours[hour])
                + "</div></ons-col><ons-col width=\"6px\" class=\"plan-center\" ng-style=\"{backgroundColor:a % 3 == 1 ? '#3399ff' : '#ccc'}\"></ons-col><ons-col class=\"plan-right\"><div class=\"plan-name\">"
                + session.title
                + "</div><div class=\"plan-info\"><div ng-hide=\"a % 4 == 0\"><ons-icon icon=\"fa-user\"></ons-icon>"
                + getSpeaker(session)
                + "</div><div ng-hide=\"a % 3 == 0\"><ons-icon icon=\"fa-map-marker\"></ons-icon>"
                + session.confRoom
                + "</div></div></ons-col></ons-row></ons-list-item>");
            }
        });
    };
    ons.compile(document.getElementById("agendaList"));
});

//Création de la page de détail pour un présentateur
$(document).on('pageinit', "#speakerDetailPage", function() {
    var data = JSON.parse(localStorage.getItem("data"));
    var speakerId = app.navi.getCurrentPage().options.id;
    data.speakers.forEach(function(speaker) {
        if(speaker.id === speakerId){
            currentSpeaker = speaker;
            $("#speakerDetail").append("<img id= \"avatar\" src=\"data/images/"
            + speaker.image
            + "\" class=\"profile-image\"><div id=\"profile_name\" class=\"profile-name\">"
            + getFullName(speaker)
            + "</div><div id=\"profile_id\" class=\"profile-id\">@" + speaker.id + "</div><div id=\"profile_desc\" class=\"profile-desc\">"
            + speaker.about
            + "</div>");
        }
    });
    var options = new ContactFindOptions();
    options.filter=currentSpeaker.firstname + " " + currentSpeaker.lastname;
    var fields = ["displayName", "name"];
    navigator.contacts.find(fields, function(contacts){
        if(contacts.length > 0){
            console.log("Contact exists");
            switchButton.setChecked(true);
        }
        else{
            console.log("Contact doesn't exist");
            switchButton.setChecked(false);
        }
    }, function(contactError){
        console.log("Error");
        switchButton.setChecked(false);
    }, options);
});

//Création de la page de détail pour une session
$(document).on('pageinit', "#sessionDetailPage", function() {
    var data = JSON.parse(localStorage.getItem("data"));
    var sessionId = app.navi.getCurrentPage().options.id;
    data.sessions.forEach(function(session) {
        if(session.id === sessionId){
            currentSession = session;
            $("#sessionTitle").append(session.title);
            $("#sessionSalle").append(session.confRoom);
            $("#sessionSpeaker").append("@" + session.speakers[0]);
            $("#sessionDesc").append(session.desc);
        }
    });
});

//Création de la page Note pour le détail d'une session
$(document).on('pageinit', "#notesPage", function() {
    $("#titleSessionNote").append(currentSession.title);
    db.transaction(function(tx) {
        tx.executeSql('SELECT * FROM NOTES WHERE id = ?', [currentSession.id], function(tx, res){
            $("#mesNotes").val(res.rows.item(0).comment);
        });
        tx.executeSql('SELECT * FROM IMAGES WHERE sessionId = ?', [currentSession.id], function(tx, res){
            for(var i = 0; i < res.rows.length; i++) {
                console.log(res.rows.item(i));
                $("#images").append("<img src=\"" + res.rows.item(i).url + "\" class=\"photos\" onclick=\"sharePicture('" + imageData + "')\"/>");
            }
        });
        tx.executeSql('SELECT * FROM CAPTURES WHERE sessionId = ?', [currentSession.id], function(tx, res){
            for(var i = 0; i < res.rows.length; i++) {
                if(res.rows.item(i).type === "audio") {
                    $("#audio").append("<audio controls=\"controls\"><source src=\"" + res.rows.item(i).path + "\"></audio>");
                }
                else if(res.rows.item(i).type === "video") {
                    $("#video").append("<video controls=\"controls\" width=\"100%\"><source src=\"" + res.rows.item(i).path + "\"></video>");
                }
                console.log(res.rows.item(i));

            }
        });
    });
});

//Création de la page Technique
$(document).on('pageinit', "#techniquesPage", function() {
    var networkState = navigator.connection.type;

    var states = {};
    states[Connection.UNKNOWN]  = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI]     = 'WiFi connection';
    states[Connection.CELL_2G]  = 'Cell 2G connection';
    states[Connection.CELL_3G]  = 'Cell 3G connection';
    states[Connection.CELL_4G]  = 'Cell 4G connection';
    states[Connection.CELL]     = 'Cell generic connection';
    states[Connection.NONE]     = 'No network connection';

    $("#available-item").append(device.isVirtual);
    $("#platform-item").append(device.platform);
    $("#version-item").append(device.version);
    $("#uuid-item").append(device.uuid);
    $("#cordova-item").append(device.cordova);
    $("#model-item").append(device.model);
    $("#manufacturer-item").append(device.manufacturer);
    $("#connexion-item").append(states[networkState]);
});

function onSuccess(contact){
    console.log("Contact created");
}
function onError(contactError){
    console.log("Creation failed");
}
function onSwitchChange() {
    var isChecked = switchButton.isChecked();
    console.log(isChecked);
    if(isChecked){
        var urls = [];
        currentSpeaker.socials.forEach(function(social) {
            var field = new ContactField();
            field.type = "url";
            field.value = social.link;
            field.pref = false;
            urls.push(field);
        });
        var newContact = navigator.contacts.create();
        newContact.displayName = currentSpeaker.firstname + " " + currentSpeaker.lastname;
        newContact.name = {"givenName": currentSpeaker.firstname, "familyName": currentSpeaker.lastname};
        newContact.nickname = currentSpeaker.id;
        newContact.urls = urls;
        newContact.note = currentSpeaker.about;
        var photo = new Image();
        var url_img = "../data/images/" + currentSpeaker.image;
        photo.onload = function() {
            console.log("IMAGE OK");
            callback(url_img);
        };
        photo.onerror = function(err) {
            console.log("IMAGE FAILED");
            url_img = "../data/images/" + currentSpeaker.image;
            callback("../data/images/" + currentSpeaker.image);
        }
        photo.src = url_img;
        newContact.photos = [new ContactField("photo", currentSpeaker.image, true)];
        var orga = new ContactOrganization(true, "company", currentSpeaker.company);
        newContact.organizations = [orga];
        newContact.save(onSuccess, onError);
    }
    else {
        var options = new ContactFindOptions();
        options.filter=currentSpeaker.firstname + " " + currentSpeaker.lastname;
        var fields = ["displayName", "name"];
        navigator.contacts.find(fields, function(contacts){
            contacts.forEach(function(contact){
                contact.remove(function(contact){
                    console.log("Success");
                }, function(contactError){
                    console.log("RemoveError");
                });
            })
        }, function(contactError){
            console.log("FindError");
        }, options);
    }
}



function onSaveNotes() {
    db.transaction(function(tx) {
        tx.executeSql('INSERT OR REPLACE INTO NOTES (id, comment, sessionId) VALUES (?,?,?)', [currentSession.id, $("#mesNotes").val(), currentSession.id]);
    });
}

function saveImagesDB(imageData) {
    db.transaction(function(tx) {
        console.log(imageData);
        tx.executeSql('INSERT OR REPLACE INTO NOTES (url, sessionId) VALUES (?,?)', [imageData, currentSession.id]);
    });
}
function saveCapturesDB(mediaFiles, type) {
    db.transaction(function(tx) {
        tx.executeSql('INSERT OR REPLACE INTO CAPTURES (path, sessionId, type) VALUES (?,?,?)', [mediaFiles[0].fullPath, currentSession.id, type]);
    });
}


function takePhoto() {
    navigator.camera.getPicture(function onSuccess(imageData){
        saveImage(imageData);
    }, function onError(message){
        console.log("Take photo failed : " + message);
    }, {quality: 50});
}

function pickImage() {
    navigator.camera.getPicture(function onSuccess(imageData){
        saveImage(imageData);
    }, function onError(message){
        console.log("Pick image failed : " + message);
    }, {quality: 50, sourceType: Camera.PictureSourceType.PHOTOLIBRARY});
}

function saveImage(imageData) {
    $("#images").append("<img src=\"" + imageData + "\" class=\"photos\" onclick=\"sharePicture('" + imageData + "')\"/>");
    saveImagesDB(imageData);
}

function recordSound() {
    navigator.device.capture.captureAudio(function(mediaFiles) {
        $("#audio").append("<audio controls=\"controls\"><source src=\"" + mediaFiles[0].fullPath + "\"></audio>");
        saveCapturesDB(mediaFiles, "audio");
    }, function(e) {
        console.log("Audio error : " + e);
    }, {limit: 1, duration: 10});

}
function recordVideo() {
    navigator.device.capture.captureVideo(function(mediaFiles) {
        $("#video").append("<video controls=\"controls\" width=\"100%\"><source src=\"" + mediaFiles[0].fullPath + "\"></video>");
        saveCapturesDB(mediaFiles, "video");
    }, function(e) {
        console.log("Video error : " + e);
    }, {limit: 1, duration: 10});
}

function sharePicture(imageData) {
    currentImageData = imageData;
    console.log(currentImageData);
    var options = {
        'androidTheme': window.plugins.actionsheet.ANDROID_THEMES.THEME_HOLO_LIGHT, // default is THEME_TRADITIONAL
        'title': 'Que faire avec l\'image ?',
        'buttonLabels': ['Partager'],
        'androidEnableCancelButton' : true, // default false
        'winphoneEnableCancelButton' : true, // default false
        'addCancelButtonWithLabel': 'Cancel',
        'addDestructiveButtonWithLabel' : 'Supprimer',
        'position': [20, 40] // for iPad pass in the [x, y] position of the popover
    };
    window.plugins.actionsheet.show(options, callback);
};
var callback = function(buttonIndex) {
    setTimeout(function() {
        switch(buttonIndex) {
            case 1:
            console.log("Remove");
            break;
            case 2:
            window.plugins.socialsharing.share('Partager', null, currentImageData, null)
            break;
            case 3:
            window.plugins.actionsheet.hide();
            break;
        }
    });
};

function openAuthorLink() {
    cordova.InAppBrowser.open("https://twitter.com/Gypp44", "_blank", "location=yes");
}

function getHour(hour) {
    return hour.hourStart + ":" + hour.minStart;
};
function getDuration(hour) {
    var start = parseInt(hour.hourStart) * 60 + parseInt(hour.minStart);
    var end = parseInt(hour.hourEnd) * 60 + parseInt(hour.minEnd);
    var duration = end - start;
    var min = duration%60 === 0 ? "00" : duration%60;
    return Math.floor(duration/60) + "h" + min;
}
function getSpeaker(session) {
    if(session.speakers !== undefined && session.speakers.length > 0){
        return "@" + session.speakers[0];
    }
    else {
        return "";
    }
}
function getFullName(speaker) {
    return speaker.firstname + " " + speaker.lastname;
};
