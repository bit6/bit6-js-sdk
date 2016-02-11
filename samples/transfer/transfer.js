
// Initialize the application
// b6 - an instance of Bit6 SDK
function initApp(b6) {

    // Incoming call from another user
    b6.on('incomingCall', function(c) {
        console.log('Incoming call', c);
        attachCallEvents(c);
        $('#incomingCallFrom').text(b6.getNameFromIdentity(c.other) + ' is connecting...');
        $('#incomingCall')
            .data({'dialog': c})
            .show();
    });

    // Got a real-time notification
    b6.on('notification', function(m) {
        console.log('demo got rt notification', m);
    });

    // Common click handler for signup and login buttons
    function authClicked(type) {

        var onResponse = function(err) {
            if (err) {
                console.log('auth error', err);
                var msg = type;
                msg += ': ' + err.message;
                $('#authError').html('<p>' + msg + '</p>');
            }
            else {
                console.log('auth done');
                $('#authUsername').val('');
                $('#authPassword').val('');
                loginDone();
            }
        };

        $('#authError').html('');
        if (type === 'login' || type === 'signup') {
            // Convert username to an identity URI
            var ident = 'usr:' + $('#authUsername').val();
            var pass = $('#authPassword').val();
            var opts = {'identity': ident, 'password': pass};
            b6.session[type](opts, onResponse);
        }
        else {
            b6.session[type](onResponse);
        }
        return false;
    }

    // User has completed the login procedure
    function loginDone() {
        $('#welcome').toggle(false);
        $('#main').removeClass('hidden');
        $('#loggedInNavbar').removeClass('hidden');
        $('.loggedInUser').text( b6.getNameFromIdentity(b6.session.identity) );
        $('.loggedInIdent').text(b6.session.identity);
    }

    // Start an outgoing call
    function startOutgoingCall(to) {
        // Show InCall modal
        $('#incall').toggle(true);
        $('#connect').toggle(false);
        // Outgoing call params
        var opts = {
            audio: false,
            video: false,
            data: true
        };
        // Start the outgoing call
        var c = b6.startCall(to, opts);
        if (c) {
            attachCallEvents(c);
            $('#other').text(to);
            c.connect();
        }
    }

    // Attach call state events to a RtcDialog
    function attachCallEvents(c) {
        // Call progress
        c.on('progress', function() {
            console.log('CALL progress', c);
        });
        // Call answered
        c.on('answer', function() {
            console.log('CALL answered', c);
        });
        // Error during the call
        c.on('error', function() {
            console.log('CALL error', c);
        });
        // Call ended
        c.on('end', function() {
            console.log('CALL ended', c);
            if (b6.dialogs.length === 0) {
                $('#incall').toggle(false);
                $('#connect').toggle(true);
            }
            $('#incomingCall')
                .data({'dialog': null})
                .hide();
        });
        // P2P data transfer
        c.on('transfer', function(tr) {
            //console.log('Transfer', tr);
            var prefix = tr.outgoing ? 'send' : 'recv';
            $('#' + prefix + 'Name').text(tr.info.name);
            var s = tr.percentage() + '%';
            var dc = b6.dialogs[0].rtc.dc;
            if (dc && dc.bufferedAmount) {
                s += ' - buf: ' + dc.bufferedAmount;
            }
            $('#' + prefix + 'Status').text(s);
            if (tr.completed()) {
                s = tr.info.name + ' - ';
                s += tr.outgoing ? 'SENT' : 'RECEIVED';
                log(s);
                // This is an incoming transfer
                if (!tr.outgoing) {
                    // Show a thumbnail
                    var blob = new Blob([tr.data], tr.info);
                    var url = window.URL.createObjectURL(blob);
                    var el = null;
                    if (tr.info.type.indexOf('image') >= 0) {
                        el = $('<img src="' + url + '" alt="' + tr.info.name + '"/>');
                    }
                    else {
                        el = $('<span>' + tr.info.name + '</span>');
                    }
                    $('#recvImgs').append(el);
                    el[0].onclick = function() {
                      var link = document.createElement('a');
                      link.href = url;
                      link.download = tr.info.name;
                      link.click();
                    };
                }
            }
        });
    }

    function handleFiles(files) {
        // files is a FileList of File objects. List some properties.
        for (var i = 0, f; f = files[i]; i++) {
            log(f.name + ' - selected - type: ' + (f.type || 'n/a') + ' size: ' + f.size + 'b');
            // Send selected file via the current connection
            b6.dialogs[0].sendFile(f);
        }
    }

    function handleFileSelect(evt) {
        var files = evt.target.files; // FileList object
        handleFiles(files);
    }

    function handleDrop(e) {
        var evt = e.originalEvent;
        evt.stopPropagation();
        evt.preventDefault();
        var files = evt.dataTransfer.files; // FileList object.
        handleFiles(files);
    }

    function handleDragOver(e) {
        var evt = e.originalEvent;
        evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    }

    function log(s) {
        var e = $('#log');
        var t = e.html();
        e.html(s + '<br>\n' + t);
    }

    console.log('FT Demo Ready!');

    // Files selector
    $('#files').change(handleFileSelect);

    // Drag and Drop
    var dz = $('#dropzone');
    dz.on('dragover', function(e) {handleDragOver(e);});
    dz.on('drop', function(e) {handleDrop(e);});


    // Hide 'IncomingCall' alert
    $('#incomingCall').toggle(false);

    // Hide 'InCall' UI
    $('#incall').toggle(false);

    // Login click
    $('#loginButton').click(function() {return authClicked('login');});

    // Signup click
    $('#signupButton').click(function() {return authClicked('signup');});

    // Anonymous click
    $('#anonButton').click(function() {return authClicked('anonymous');});

    // Connect click
    $('#connectButton').click(function() {
        var to = $('#dest').val();
        if (to) {
            if (to.indexOf(':') < 0) {
                to = b6.session.identity.split(':')[0] + ':' + to;
            }
            var d = startOutgoingCall(to);
        }
        return false;
    });

    $('#dest').keyup(function(e) {
        var code = e.which;
        if (code === 13) {
            e.preventDefault();
            $('#connectButton').click();
        }
    });

    // Clear received images
    $('#clearReceived').click(function() {
        $('#recvImgs').html('');
        $('#log').html('');
    });

    // 'Answer Incoming Call' click
    $('#answer').click(function() {
        var e = $('#incomingCall').hide();
        var d = e.data();
        // Call controller
        if (d && d.dialog) {
            var c = d.dialog;
            // Prepare InCall UI
            $('#incall').toggle(true);
            $('#connect').toggle(false);
            $('#other').text(c.other);
            // Accept the call
            c.connect();
            e.data({'dialog': null});
        }
    });

    // 'Reject Incoming Call' click
    $('#reject').click(function() {
        var e = $('#incomingCall').hide();
        var d = e.data();
        // Call controller
        if (d && d.dialog) {
            // Reject call
            d.dialog.hangup();
            e.data({'dialog': null});
        }
    });

    // 'Call Hangup' click
    $('#hangup').click(function() {
        var x = b6.dialogs.slice();
        for (var i in x) {
            console.log('multi-hangup: ', x[i]);
            x[i].hangup();
        }
    });

    // Logout click
    $('#logout').click(function() {
        $('#welcome').toggle(true);
        $('#main').addClass('hidden');
        $('#loggedInNavbar').addClass('hidden');
        $('.loggedInUser').text('');
        $('.loggedInIdent').text('');
        $('#clearReceived').click();
        b6.session.logout();
    });

}
