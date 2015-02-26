
var opts = {
    // IMPORTANT! Set your own Bit6 API key
    //'apikey': 'MyApiKey',
};
if (!opts.apikey) {
    alert('Missing "apikey".\nSpecify it in bit6.Client() constructor!');
}

var b6 = new bit6.Client(opts);

// Disable all audio in this demo
var disableAudio = false;

var currentChatUri = null;
var lastTypingSent = 0;
var typingLabelTimer = 0;


// Incoming call from another user
b6.on('incomingCall', function(c) {
    console.log('Incoming call', c);
    callEvents(c);
    $('#incomingCallFrom').text(b6.getNameFromIdentity(c.other) + ' is calling...');
    $('#incomingCall')
        .data({'dialog': c})
        .show();
});

// Messages have been changed, UI should be refreshed
b6.on('messages', function() {
    showUserTyping(false);
    populateChatList();    
});

// Got a real-time notification
b6.on('notification', function(m) {
    console.log('demo got rt message', m);
    if (m.type == 'typing') {
        isSentToGroup = m.to.indexOf('grp:') == 0
        key = isSentToGroup ? m.to : m.from
        if (key == currentChatUri) {
            showUserTyping(m.from);
        }
    }
});



function loginDone() {
    $('#welcome').toggle(false);
    $('#main').removeClass('hidden');
    $('#loggedInNavbar').removeClass('hidden');
    $('#loggedInUser').text( b6.getNameFromIdentity(b6.session.identity) );
    populateChatList();
}

function populateChatList() {
    var chatList = $('#chatList').html('');
    for(var i=0; i < b6.conversations.length; i++) {
        var c = b6.conversations[i];
        if (!currentChatUri) {
            currentChatUri = c.uri;
        }
        var d = new Date(c.updated);
        var stamp = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
        var latestText = '';
        // Find the latest message in the conversation
        if (c.messages && c.messages.length > 0) {
            var latestMsg = c.messages[c.messages.length-1];
            // Show the text from the latest conversation
            if (latestMsg.content)
                latestText = latestMsg.content;
            // If no text, but has an attachment, show the mime type
            else if (latestMsg.data && latestMsg.data.type) {
                latestText = latestMsg.data.type;
            }
        }
        chatList.append(
            $('<div />')
                .append($('<strong>' + b6.getNameFromIdentity(c.uri) + '</strong>'))
                .append($('<span>' + latestText + '</span>'))
                .append($('<em>' + stamp + '</em>'))
                .on('click', {'uri': c.uri}, function(e) {
                    showMessages(e.data.uri);
                })
        );
    }
    // Refresh the messages for the current conversation
    showMessages(currentChatUri);
}

function showUserTyping(ident) {
    clearInterval(typingLabelTimer);
    if (ident) {
        typingLabelTimer = setTimeout(function() {
            $('#msgOtherTyping').toggle(false);
        }, 10000);
        ident = b6.getNameFromIdentity(ident);
        var txt = ident + ' is typing...';
        $('#msgOtherTyping').html(txt);
    }
    $('#msgOtherTyping').toggle(ident ? true : false);
}


// TODO: Will be moved to the SDK

function isIncomingMessage(m) {
    return (m.flags & 0x1000) != 0;
}

function getMessageStatusString(m) {
    // Status value
    var t = m.flags & 0x000f;

    // Is this an outgoing message?
    if (!isIncomingMessage(m)) {
        // Multiple destinations
        if (m.others) {
            var d = [];
            // Was it delievered to any destinations?
            for(var i=0; i < m.others.length; i++) {
                var o = m.others[i];
                if (o.status == 0x0004) {
                    d.push(b6.getNameFromIdentity(o.uri));
                }
            }
            // List destinations it was delivered to
            if (d.length) {
                return d.join(', ');
            }
        }
    }

    switch(t) {
        case 0x0001: return 'Sending';
        case 0x0002: return 'Sent';
        case 0x0003: return 'Failed';
        case 0x0004: return 'Delivered';
        case 0x0005: return 'Read';
    }
    return '';
}


function showMessages(uri) {
    console.log('Show messages for ', uri);

    if (uri.indexOf('grp:') == 0) {
        b6.api('/groups/'+uri.substring(4), function(err, g) {
            console.log('Got group err=', err, 'group=', g);            
        });
    }

    if (uri != currentChatUri) {
        showUserTyping(false);
    }

    if (!uri) {
        $('#msgOtherName').text('');
        $('#voiceCallButton').toggle(false);
        $('#videoCallButton').toggle(false);
        return;
    }

    currentChatUri = uri;
    var conv = b6.getConversationByUri(uri);

    $('#msgOtherName').text( b6.getNameFromIdentity(conv.uri) );
    $('#voiceCallButton').toggle(true);
    $('#videoCallButton').toggle(true);

    var now = Date.now();
    // 24 hours in milliseconds
    var t24h = 24 * 60 * 60 * 1000;

    // TODO: will do incemental updates later
    var msgList = $('#msgList').html('');

    for(var i = 0; i < conv.messages.length; i++) {
        var m = conv.messages[i];
        var isIncoming = isIncomingMessage(m);
        var cssClass = isIncoming ? 'other' : 'me';
        var d = new Date(m.updated);
        var stamp = (now - m.updated > t24h) ? d.toLocaleDateString() : d.toLocaleTimeString();

        var msgDiv = $('<div class="' + cssClass + '" />');
        // This message has an attachment
        if (m.data) {
            // TODO: handle location and audio clips properly
            var attachType = m.data.type;
            var thumbImg = m.data.thumb;
            var href = m.data.attach;
            msgDiv.append($('<a class="thumb" href="' + href + '" target="_new"><img src="' + thumbImg + '" /></a>'));            
        }
        if (m.content) {
            msgDiv.append($('<span>' + m.content + '</span>'));
        }
        msgDiv.append($('<i>' + stamp + '</i>'));
        if (isIncoming) {
            msgDiv.append($('<em>' + b6.getNameFromIdentity(m.other) + '</em>'));
        }
        else {
            msgDiv.append($('<em>' + getMessageStatusString(m) + '</em>'));
        }
        msgList.append(msgDiv);
    }
    $('#msgList').scrollTop($('#msgList')[0].scrollHeight);
}

function sendMessage() {
    var content = $('#msgText').val();
    var me = b6.session.identity;
    var other = currentChatUri;
    if (!content || !other) return
    $('#msgText').val('');
    console.log ('Send message from=', me, 'to=', other, 'content=', content);
    var m = {
        'me': me,
        'other': other,
        'content': content
    };
    lastTypingSent = 0;
    b6.sendMessage(m, function(err, result) {
        console.log('sendMessage result=', result, 'err=', err);
    });
}

function startOutgoingCall(to, video) {
    // Show InCall modal
    $('#inCallOther').text( b6.getNameFromIdentity(to) );
    $('#inCallModal').modal('show');
    // Outgoing call params
    var opts = {
        audio: !disableAudio,
        video: video
    };
    // Start the outgoing call
    var c = b6.startCall(to, opts);
    callEvents(c);
    callUI(c);
}

function callEvents(c) {
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
        $('#inCallModal')
            .data({'dialog': null})
            .modal('hide');        
        $('#incomingCall')
            .data({'dialog': null})
            .hide();
    });
}

function callUI(c) {
    // Store a reference to call controller
    // in the InCallModal
    $('#inCallModal').data({'dialog': c})

    // Do not show video feeds area for audio-only call
    $('#videoContainer').toggle(c.options.video);

    // When starting a media connection, we need
    // to provide media elements - <audio> or <video>
    // For audio-only calls <video> also seem to work
    var opts = {};
    // Video call
    if (c.options.video) {
        opts.localMediaEl = $('#localVideo')[0];
        opts.remoteMediaEl = $('#remoteVideo')[0];
    }
    // Audio call
    else {
        opts.remoteMediaEl = $('#remoteAudio')[0];
    }

    // Start the call connection
    c.connect(opts);
}


$(function() {
    console.log('Bit6 Demo Ready!');

    // Hide 'Typing' notification
    $('#msgOtherTyping').toggle(false);
    // Hide 'IncomingCall' alert
    $('#incomingCall').toggle(false);

    // Fix input elements within dropdown click problem
    $('.dropdown input, .dropdown label').click(function(e) {
        e.stopPropagation();
    });

    if (disableAudio) {
        $('#inCallAudioDisabled').removeClass('hidden');
    }


    // Login click
    $('#loginButton').click(function() {
        $('#loginError').html('');
        // Convert username to an identity URI
        var ident = 'usr:' + $('#loginUsername').val();
        var pass = $('#loginPassword').val();
        b6.session.login({'identity': ident, 'password': pass}, function(err) {
            if (err) {
                console.log('login error', err);
                $('#loginError').html('<p>' + err.message + '</p>');
            }
            else {
                console.log('login done');
                loginDone();
            }
        });
        return false;
    });

    // Signup click
    $('#signupButton').click(function() {
        $('#signupError').html('');
        // Convert username to an identity URI
        var ident = 'usr:' + $('#signupUsername').val();
        var pass = $('#signupPassword').val();
        b6.session.signup({'identity': ident, 'password': pass}, function(err) {
            if (err) {
                console.log('signup error', err);
                $('#signupError').html('<p>' + err.message + '</p>');
            }
            else {
                console.log('signup done');
                loginDone();
            }
        });
        return false;
    });

    // When user clicks on New Chat, give focus to Username
    $('#newChatDropdown').on('shown.bs.dropdown', function () {
        $('#newChatUsername').val('');
        setTimeout(function() {$('#newChatUsername').focus();}, 100);
    })

    // Start a new chat
    $('#newChatStart').click(function() {
        var v = $('#newChatUsername').val().trim();
        console.log('Start chat with' + v);
        // Closes the dropdown but then you cannot open it again
        //$('#newChatDropdown').dropdown('toggle');
        // Slightly hackier way to close the dropdown
        $('body').trigger('click');
        if (v) {
            var uri = 'usr:' + v;
            currentChatUri = uri;
            b6.addEmptyConversation(uri);
        }
        return false;
    });


    // SendMessage click
    $('#sendMsgButton').click(function() {
        console.log('Send message clicked');
        sendMessage();
    });

    // Start a voice call
    $('#voiceCallButton').click(function() {
        console.log('Voice call clicked');
        startOutgoingCall(currentChatUri, false);
    });

    // Start a video call
    $('#videoCallButton').click(function() {
        console.log('Video call clicked');
        startOutgoingCall(currentChatUri, true);
    });

    // Start a phone call
    $('#phoneCallButton').click(function() {
        console.log('Phone call clicked');
        // For this demo call a helpdesk of a well-known store
        startOutgoingCall('pstn:+18004663337', false);
    });

    // Key down event in compose input field
    $('#msgText').keydown(function() {
        console.log('keydown in compose');
        var now = Date.now();
        if (now - lastTypingSent > 7000) {
            lastTypingSent = now;
            b6.sendTypingNotification(currentChatUri);
        }
    });

    // Send message when user hits Enter
    $('#msgText').keyup(function(e) { 
        var code = e.which;
        if (code == 13) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 'Answer Incoming Call' click
    $('#answer').click(function() {
        var e = $('#incomingCall').hide();
        var d = e.data();
        // Call controller
        if (d && d.dialog) {
            var c = d.dialog;
            // Prepare InCall UI
            $('#inCallOther').text( b6.getNameFromIdentity(c.other) );
            $('#inCallModal').modal('show');
            // Accept the call
            callUI(c);
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
        var e = $('#inCallModal').modal('hide');
        var d = e.data();
        // Call controller
        if (d && d.dialog) {
            // Hangup the call
            d.dialog.hangup();
            e.data({'dialog': null});
        }
    });

    // Logout click
    $('#logout').click(function() {
        currentChatUri = null;
        $('#welcome').toggle(true);
        $('#main').addClass('hidden');
        $('#loggedInNavbar').addClass('hidden');
        $('#loggedInUser').text('');
        $('#chatList').html('');
        $('#msgList').html('');
        b6.session.logout();
    });

});
