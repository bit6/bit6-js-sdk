
// Initialize the application
// b6 - an instance of Bit6 SDK
function initApp(b6) {

    // Disable all audio in this demo
    var disableAudio = false;

    var currentChatUri = null;
    var lastTypingSent = 0;
    var typingLabelTimer = 0;


    // Incoming call from another user
    b6.on('incomingCall', function(c) {
        console.log('Incoming call', c);
        attachCallEvents(c);
        $('#incomingCallFrom').text(b6.getNameFromIdentity(c.other) + ' is calling...');
        $('#incomingCall')
            .data({'dialog': c})
            .show();
    });

    // A conversation has changed
    b6.on('conversation', function(c, op) {
        //console.log('onConv', c);
        onConversationChange(c, op);
    });

    // A message has changed
    b6.on('message', function(m, op) {
        //console.log('onMsg', m);
        onMessageChange(m, op);
    });

    // Got a real-time notification
    b6.on('notification', function(m) {
        console.log('demo got rt notification', m);
        if (m.type == 'typing') {
            isSentToGroup = m.to.indexOf('grp:') == 0
            key = isSentToGroup ? m.to : m.from
            if (key == currentChatUri) {
                showUserTyping(m.from);
            }
        }
    });

    // Common click handler for signup and login buttons
    function authClicked(isNewUser) {
        $('#authError').html('');
        // Convert username to an identity URI
        var ident = 'usr:' + $('#authUsername').val();
        var pass = $('#authPassword').val();
        // Call either login or signup function
        var fn = isNewUser ? 'signup' : 'login';
        b6.session[fn]({'identity': ident, 'password': pass}, function(err) {
            if (err) {
                console.log('auth error', err);
                var msg = isNewUser ? 'New user' : 'Login'
                msg += ': ' + err.message;
                $('#authError').html('<p>' + msg + '</p>');
            }
            else {
                console.log('auth done');
                $('#authUsername').val('');
                $('#authPassword').val('');
                loginDone();
            }
        });
        return false;
    };

    // User has completed the login procedure
    function loginDone() {
        $('#welcome').toggle(false);
        $('#main').removeClass('hidden');
        $('#loggedInNavbar').removeClass('hidden');
        $('#loggedInUser').text( b6.getNameFromIdentity(b6.session.identity) );
        selectFirstChat();
        $('body').removeClass('detail');
    }

    // Show the first chat
    function selectFirstChat() {
        // Do we have more chats?
        var chats = $('#chatList').children();
        if (chats.length > 0) {
            // Simulate a click on the first chat
            console.log('Selecting first chat');
            chats.first().click();
        }
        // No more chats
        else {
            // Clear message lists etc
            console.log('No more chats to select');
            showMessages(null);
        }
    }


    // Update Conversation View
    function onConversationChange(c, op) {
        var chatList = $('#chatList');
        var tabId = tabDomIdForConversation(c);
        var msgsId = msgsDomIdForConversation(c);
        var tabDiv = $(tabId);
        var msgsDiv = $(msgsId);

        // Conversation deleted
        if (op < 0) {
            if (!c.deleted) {
                console.log('Warning: Deleting a conversation with no deleted property!', c);
            }
            if (tabDiv.length == 0 || msgsDiv.length == 0) {
                console.log('Warning: Deleting a conversation with no DOM element!', c);
            }
            tabDiv.remove();
            msgsDiv.remove();
            return
        }

        // New conversation
        if (op > 0) {
            if (c.deleted) {
                console.log('Error: Adding a deleted conversation', c);
                return;
            }
            if (tabDiv.length > 0 || msgsDiv.length > 0) {
                console.log('Error: Adding a conversation that has DOM elements!', c);
            }

            // Entry in the Chat List
            tabDiv = $('<div class="tab" />')
                .attr('id', tabId.substring(1))
                .append('<strong />')
                .append('<span />')
                .append('<em />');
            chatList.append(tabDiv);
            // Create a container for message list for this conversation
            msgsDiv = $('<div class="msgs" />')
                .attr('id', msgsId.substring(1))
                .hide();
            $('#msgList').append(msgsDiv);
        }


        // Update Conversation data
        var stamp = getRelativeTime(c.updated);
        var latestText = '';
        var lastMsg = c.getLastMessage();
        if (lastMsg) {
            // Show the text from the latest conversation
            if (lastMsg.content)
                latestText = lastMsg.content;
            // If no text, but has an attachment, show the mime type
            else if (lastMsg.data && lastMsg.data.type) {
                latestText = lastMsg.data.type;
            }
        }
        var title = b6.getNameFromIdentity(c.id);
        if (c.unread > 0) {
            title += ' (' + c.unread + ')';
        }

        // Apply data to DOM
        tabDiv.children('strong').html(title);
        tabDiv.children('span').html(latestText);
        tabDiv.children('em').html(stamp);

        // If the updated conversation is newer than the top one -
        // move this conversation to the top
        var top = chatList.children(':first');
        if (top.length > 0) {
            var topTabId = top.attr('id');
            var topConvId = domIdToConversationId(topTabId);
            var topConv = b6.getConversation(topConvId);
            if (topConv && topConv.id != c.id && c.updated > topConv.updated) {
                top.before(tabDiv);
            }
        }
    }

    // Update Message View
    function onMessageChange(m, op) {
        var divId = domIdForMessage(m);
        var div = $(divId);

        // Message deleted
        if (op < 0) {
            console.log('Deleting msg div', m);
            if (!m.deleted) {
                console.log('Warning: Deleting a message with no deleted property!', m);
            }
            if (div.length == 0) {
                console.log('Warning: Deleting a message with no DOM element!', m);
            }
            div.remove();
            return;
        }

        // Message added
        if (op > 0) {
            if (m.deleted) {
                console.log('Error: Adding a deleted message', m);
                return;
            }
            if (div.length > 0) {
                console.log('Error: Adding a message that has a DOM element!', m);
            }

            var cssClass = m.incoming() ? 'other' : 'me';

            div = $('<div class="msg ' + cssClass + '" />').attr('id', divId.substring(1));

            // This message has an attachment
            if (m.data) {
                // TODO: handle location and audio clips properly
                var attachType = m.data.type;
                var thumbImg = m.data.thumb;
                var href = m.data.attach;
                div.append('<a class="thumb" href="' + href + '" target="_new"><img src="' + thumbImg + '" /></a>');
            }
            // Text content
            if (m.content) {
                div.append('<span>' + m.content + '</span>');
            }
            // Timestamp
            div.append('<i />');
            // Message status
            div.append('<em />');

            // Find the container for this message
            var convId = m.getConversationId();
            var c = b6.getConversation(convId);
            var msgsDiv = $( msgsDomIdForConversation(c) );
            msgsDiv.append(div);

            // If the conversation for this message is visible
            if (msgsDiv.is(':visible')) {
                // Scroll to the bottom of the conversation
                scrollToLastMessage();
                // Mark this new message as read since it is on the screen
                if (m.incoming()) {
                    b6.markMessageAsRead(m);
                }
            }
        }

        // Update Message data

        // Latest updated stamp
        var stamp = getRelativeTime(m.updated);

        // Status string
        var status;
        if (m.incoming()) {
            status = b6.getNameFromIdentity(m.other) + ' ' + m.getStatusString();
        }
        else {
            status = getMessageStatusString(m);
        }

        // Apply data to DOM
        div.children('i').text(stamp);
        div.children('em').text(status);
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


    function getMessageStatusString(m) {
        // Is this an outgoing message?
        if (!m.incoming()) {
            // Multiple destinations
            if (m.others) {
                var d = [];
                // Was it delievered to any destinations?
                for(var i=0; i < m.others.length; i++) {
                    var o = m.others[i];
                    if (o.status == bit6.Message.DELIVERED || o.status == bit6.Message.READ) {
                        d.push(b6.getNameFromIdentity(o.uri) + ' ' + o.status);
                    }
                }
                // List destinations it was delivered to
                if (d.length) {
                    return d.join(', ');
                }
            }
        }

        return m.getStatusString();
    }

    function getRelativeTime(stamp) {
        var now = Date.now();
        // 24 hours in milliseconds
        var t24h = 24 * 60 * 60 * 1000;
        var d = new Date(stamp);
        var s = (now - stamp > t24h) ? d.toLocaleDateString() : d.toLocaleTimeString();
        return s;
    }

    function showMessages(uri) {
        console.log('Show messages for', uri);

        //if (uri.indexOf('grp:') == 0) {
        //    b6.api('/groups/'+uri.substring(4), function(err, g) {
        //        console.log('Got group err=', err, 'group=', g);
        //    });
        //}

        // Hide 'user typing' if switching to a different chat
        if (uri != currentChatUri) {
            showUserTyping(false);
        }

        // Current conversation identity
        currentChatUri = uri;

        // Nothing to show
        if (!uri) {
            $('#msgOtherName').text('');
            $('#chatButtons').toggle(false);
            $('body').removeClass('detail');
            return;
        }

        $('body').addClass('detail');

        var conv = b6.getConversation(uri);
        // Mark all messages as read
        if (b6.markConversationAsRead(conv) > 0) {
            // Some messages have been marked as read
            // update chat list
            console.log('Messages marked as read');
        }

        $('#msgOtherName').text( b6.getNameFromIdentity(conv.id) );
        $('#chatButtons').toggle(true);


        var msgsDiv = $( msgsDomIdForConversation(conv) );
        // Show only message container for this conversation
        // Hide all the other message containers
        msgsDiv.show().siblings().hide();
        // Scroll to the bottom of the conversation
        scrollToLastMessage();

        // Request focus for the compose message text field
        //$('#msgText').focus();
    }

    // Get jQuery selector for a Message
    function domIdForMessage(m) {
        return '#msg__' + m.domId();
    }

    // Get Chat Tab jQuery selector for a Conversation
    function tabDomIdForConversation(c) {
        return '#tab__' + c.domId();
    }

    // Get Messages Container jQuery selector for a Conversation
    function msgsDomIdForConversation(c) {
        return '#msgs__' + c.domId();
    }

    // Convert element id to a Conversation id
    function domIdToConversationId(id) {
        var r = id.split('__');
        id = r.length > 0 ? r[1] : id
        return bit6.Conversation.fromDomId(id);
    }

    // Convert element id to a Message id
    function domIdToMessageId(id) {
        var r = id.split('__');
        id = r.length > 0 ? r[1] : id
        return bit6.Message.fromDomId(id);
    }

    // Scroll to the last message in the messages list
    function scrollToLastMessage() {
        var t = $('#msgList');
        t.scrollTop( t[0].scrollHeight );
    }

    // I wonder what this function does...
    function sendMessage() {
        var content = $('#msgText').val();
        var other = currentChatUri;
        if (!content || !other) return
        lastTypingSent = 0;
        $('#msgText').val('');
        console.log ('Send message to=', other, 'content=', content);
        var m = {
            'other': other,
            'content': content
        };
        b6.sendMessage(m, function(err, result) {
            console.log('sendMessage result=', result, 'err=', err);
        });
    }

    // Start an outgoing call
    function startOutgoingCall(to, video) {
        // Outgoing call params
        var opts = {
            audio: !disableAudio,
            video: video
        };
        // Start the outgoing call
        var c = b6.startCall(to, opts);
        if (c) {
            attachCallEvents(c);
            showInCallUI(c);
        }
    }

    // Attach call state events to a RtcDialog
    function attachCallEvents(c) {
        // Call progress
        c.on('progress', function() {
            showInCallName();
            console.log('CALL progress', c);
        });
        // Number of video feeds/elements changed
        c.on('videos', function() {
            var container = $('#videoContainer');
            var elems = container.children();
            console.log('VIDEO elems: ', elems.length, elems);
            container.attr('class', elems.length > 2 ? 'grid' : 'simple');
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
            showInCallName();
            console.log('CALL ended', c);
            // Remove the remote media elem
            var e = c.options.remoteMediaEl;
            if (e && e.parentNode) {
                e.parentNode.removeChild(e);
            }
            // No more dialogs?
            if (b6.dialogs.length == 0) {
                // Hide InCall UI
                $('#detailPane').removeClass('hidden');
                $('#inCallPane').addClass('hidden');
            }
            // Hide Incoming Call dialog
            // TODO: check that it was for this dialog
            $('#incomingCall')
                .data({'dialog': null})
                .hide();
        });
    }

    function showInCallUI(c) {
        showInCallName();

        $('body').addClass('detail');

        $('#detailPane').addClass('hidden');
        $('#inCallPane').removeClass('hidden');

        // Do not show video feeds area for audio-only call
        var div = $('#videoContainer').toggle(c.options.video);

        // When starting a media connection, we need
        // to provide either:
        // 1) for audio call:
        //    a) <audio> element as remoteMediaEl, or
        //    b) nothing - let SDK handle it
        // 2) for video call:
        //    a) <video> elements as remoteMediaEl and localMediaEl, or
        //    b) containerEl that will be populated by <video> elements
        //       by the SDK. <video class="local"> / <video class="remote">
        var opts = {};
        // Video call
        if (c.options.video) {
            // Can set specific elements here
            //var rv = $('<video autoplay class="remote" />');
            //div.prepend(rv);
            //opts.remoteMediaEl = rv[0];
            //opts.localMediaEl = $('#localVideo')[0];
            // Container is required if not setting specific video elements
            opts.containerEl = div[0];
        }
        // Audio call
        else {
            // Can specify here, or let SDK handle it
            //var rv = $('<audio autoplay class="remote" />');
            //div.prepend(rv);
            //opts.remoteMediaEl = rv[0];
        }

        // Start the call connection
        c.connect(opts);
    }

    // Show all the call participants
    function showInCallName() {
        var s = '';
        for(var i in b6.dialogs) {
            var d = b6.dialogs[i];
            if (i == 0) {
                //s = d.options.video ? 'Video Call: ' : 'Voice Call: ';
            }
            else {
                s += ', ';
            }
            s += b6.getNameFromIdentity(d.other);
        }
        $('#inCallOther').text(s);
    }

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
    $('#loginButton').click(function() {return authClicked(false);});

    // Signup click
    $('#signupButton').click(function() {return authClicked(true);});

    // Click on a tab in the chat list shows the messages
    $('#chatList').on('click', '.tab', function(e) {
        var id = $(this).attr('id');
        var convId = domIdToConversationId(id);
        // Do we have ongoing calls?
        if (b6.dialogs.length > 0) {
            var d = b6.dialogs[0];
            // Add the user to the conversation
            startOutgoingCall(convId, d.options.video);
        }
        // No ongoing calls
        else {
            // Select the chat
            showMessages(convId);
        }
    });

    // Clicking on Navbar takes you back into the chat list
    // Useful on small screens
    $('#backToList').click(function() {
        $('body').removeClass('detail');
    });

    // Click on a message deletes it
    //$('#msgList').on('click', '.msg', function(e) {
    //    var id = $(this).attr('id');
    //    var msgId = domIdToMessageId(id);
    //    console.log('Clicked to delete message', msgId);
    //    b6.deleteMessage(msgId, function(err, result) {
    //        console.log('Msg deleted err=', err, 'result=', result);
    //    });
    //});

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
            b6.addEmptyConversation(uri);
            showMessages(uri);
        }
        return false;
    });


    // Send Message click
    $('#sendMsgButton').click(function() {
        console.log('Send message clicked');
        sendMessage();
    });

    // Delete a Conversation
    $('#deleteChatButton').click(function() {
        console.log('Delete current conversation');
        b6.deleteConversation(currentChatUri, function(err) {
            console.log('Conversation deleted');
            selectFirstChat();
        });
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
            // Accept the call
            showInCallUI(c);
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
        $('#detailPane').removeClass('hidden');
        $('#inCallPane').addClass('hidden');
        // Hangup all active calls
        var x = b6.dialogs.slice();
        for (var i in x) {
            console.log('multi-hangup: ', x[i]);
            x[i].hangup();
        }
    });

    // Logout click
    $('#logout').click(function() {
        currentChatUri = null;
        $('#welcome').toggle(true);
        $('#main').addClass('hidden');
        $('#loggedInNavbar').addClass('hidden');
        $('#loggedInUser').text('');
        $('#chatList').empty();
        $('#msgList').empty();
        b6.session.logout();
    });

}
