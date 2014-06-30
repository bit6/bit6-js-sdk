
var opts = {
    // IMPORTANT! Set your own Bit6 API key
    'apikey': 'MyApiKey',

    // Uncomment if you run multiple instances on the same computer
    // and do not want to get mic feedback
    // 'disableAudio': true,

    'onRtMessage': onRtMessage,
    'onMessagesUpdated': onMessagesUpdated,
    'onIncomingCall': onIncomingCall,
    'onCallEnded': onCallEnded
};

var b6 = new Bit6(opts);



var currentChatUri = null;
var lastTypingSent = 0;
var typingLabelTimer = 0;
var incomingCallFrom = null;
var incomingCallVideo = false;

function showUserTyping(flag) {
    clearInterval(typingLabelTimer);
    if (flag) {
        typingLabelTimer = setTimeout(function() {
            $('#msgOtherTyping').toggle(false);
        }, 10000);
    }
    else {
    }
    $('#msgOtherTyping').toggle(flag);
}

function onMessagesUpdated() {
    showUserTyping(false);
    populateChatList();
}

function onIncomingCall(from, video) {
    $('#incomingCallFrom').text(from + ' is calling...');
    $('#incomingCall')
        .data({'from': from, 'video': video})
        .show();
}

function onCallEnded(other) {
    console.log('Call ended other=', other);
    $('#inCallModal').modal('hide');
}

function onRtMessage(m) {
    console.log('demo got rt message', m);
    if (!m.type) return;
    if (m.type == 'typing') {
        if (m.from == currentChatUri) {
            showUserTyping(true);
        }
    }
}

function loginDone() {
    $('#welcome').toggle(false);
    $('#main').removeClass('hidden');
    $('#loggedInNavbar').removeClass('hidden');
    $('#loggedInUser').text(b6.loginIdentity);
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
                .append($('<strong>' + c.title + '</strong>'))
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

// <temp> Will be moved to the SDK

function isIncomingMessage(m) {
    return (m.flags & 0x1000) != 0;
}

function getMessageStatusString(m) {
    var t = m.flags & 0x000f;
    switch(t) {
        case 0x0001: return 'Sending';
        case 0x0002: return 'Sent';
        case 0x0003: return 'Failed';
        case 0x0004: return 'Delivered';
        case 0x0005: return 'Read';
    }
    return '';
}

// </temp>

function showMessages(uri) {
    console.log('Show messages for ', uri);
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

    $('#msgOtherName').text(conv.title);
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
        if (!isIncoming) {
            msgDiv.append($('<em>' + getMessageStatusString(m) + '</em>'));
        }
        msgList.append(msgDiv);
    }
    $('#msgList').scrollTop($('#msgList')[0].scrollHeight);
}

function sendMessage() {
    var content = $('#msgText').val();
    var me = b6.loginIdentity;
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


$(function() {
    console.log( "ready!" );

    // Hide 'Typing' notification
    $('#msgOtherTyping').toggle(false);
    // Hide 'IncomingCall' alert
    $('#incomingCall').toggle(false);

    // Fix input elements within dropdown click problem
    $('.dropdown input, .dropdown label').click(function(e) {
        e.stopPropagation();
    });

    if (b6.options.disableAudio) {
        $('#inCallAudioDisabled').removeClass('hidden');
    }


    // Login click
    $('#loginButton').click(function() {
        $('#loginError').html('');
        // Convert username to an identity URI
        var ident = 'usr:' + $('#loginUsername').val();
        var pass = $('#loginPassword').val();
        b6.login({'identity': ident, 'password': pass}, function(err) {
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
        b6.signup({'identity': ident, 'password': pass}, function(err) {
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
        b6.startCall(currentChatUri, false, function(err) {
            console.log('voice call res', err);
            $('#inCallOther').text(currentChatUri);
            $('#inCallModal').modal('show');
            b6.initCallerWebRTC(currentChatUri, false);
        });
    });

    // Start a video call
    $('#videoCallButton').click(function() {
        console.log('Video call clicked');
        b6.startCall(currentChatUri, true, function(err) {
            console.log('video call res', err);
            $('#inCallOther').text(currentChatUri);
            $('#inCallModal').modal('show');
            b6.initCallerWebRTC(currentChatUri, true);
        });
    });

    // Key down event in compose input field
    $('#msgText').keydown(function() {
        console.log('keydown in compose');
        var now = Date.now();
        if (now - lastTypingSent > 7000) {
            lastTypingSent = now;
            b6.sendRtTyping(currentChatUri);
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

    // Answer Incoming call click
    $('#answer').click(function() {
        var e = $('#incomingCall');
        var d = e.data();
        e.hide();
        $('#inCallOther').text(d.from);
        $('#inCallModal').modal('show');
        b6.answerIncomingCall(d.from, d.video);
    });

    // Reject Incoming call click
    $('#reject').click(function() {
        var e = $('#incomingCall');
        var d = e.data();
        e.hide();
        b6.rejectIncomingCall(d.from, d.video);
    });

    // Call Hangup click
    $('#hangup').click(function() {
        $('#inCallModal').modal('hide');
        b6.endCall();
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
        b6.logout();
    });

});
