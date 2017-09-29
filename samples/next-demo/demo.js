
// Initialize the application
function initApp() {

    function fetchToken(identity, device, cb) {
        var data = {
            identity: identity,
            device: device
        };

        var url = 'https://bit6-demo-token-svc.herokuapp.com/token';
        //var url = 'https://localhost:5001/token';

        // Use browser url to determine if we want to connect to dev or prod Bit6 API
        if (location.search.indexOf('env=dev') > 0) {
            url += '?env=dev';
        }

        $.ajax({
            type: 'POST',
            url: url,
            data: data,
            success: function(resp) {cb(null, resp.token);}
        });
    }

    // Common click handler for signup and login buttons
    function authClicked(isNewUser) {
        $('#authError').html('');
        // Convert username to an identity URI
        var ident = $('#authUsername').val().trim();
        var pass = $('#authPassword').val().trim();
        // Call either login or signup function
        var fn = isNewUser ? 'signup' : 'login';
        var deviceId = 'web' + Math.floor((Math.random() * 1000) + 1);
        fetchToken(ident, deviceId, function(err, token) {
            console.log('Got token', token, err);
            if (err) {
                console.log('auth error', err);
                var msg = isNewUser ? 'New user' : 'Login';
                msg += ': ' + err.message;
                $('#authError').html('<p>' + msg + '</p>');
            }
            else {
                console.log('auth done');
                $('#authUsername').val('');
                $('#authPassword').val('');
                authDone(token);
            }
        });
        return false;
    }

    // Login click
    $('#loginButton').click(function() {return authClicked(false);});

    // Signup click
    $('#signupButton').click(function() {return authClicked(true);});


    // Bit6 Services
    var accessToken, signalSvc, chatSvc, videoSvc;
    // Disable all audio in this demo
    var disableAudio = false;
    // Use 'mix' media mode for new calls
    var useMixMediaMode = false;
    // Current Chat
    var currentConvId = null;
    // Is GroupInfo UI modal displayed?
    var groupInfoShown = false;


    function authDone(token) {

        accessToken = new bit6.AccessToken(token);
        accessToken.on('expired', function(t) {
            console.log('AccessToken expired, need to renew', t);
            // Fetch the new token from your application server or Bit6 Auth service
            // Then update it by calling:
            // t.update('new-token-here');
        });
        console.log('AccessToken', accessToken);
        // Init Signal Service
        signalSvc = new bit6.Signal(accessToken);

        // Update the UI
        $('#welcome').toggle(false);
        $('#main').removeClass('hidden');
        $('#loggedInNavbar').removeClass('hidden');
        $('#loggedInUser').text( accessToken.claims.sub );
        $('body').removeClass('detail');


        chatSvc = new bit6.Chat(signalSvc, {sync: true});
        videoSvc  = new bit6.Video(signalSvc);

        // Expose the services into global namespace
        // for easier access from browser dev console
        window.chatSvc = chatSvc;
        window.videoSvc = videoSvc;

        // A conversation has changed
        chatSvc.on('conversation', function(c, op) {
            //console.log('onConv', c);
            onConversationChange(c, op);
        });

        // We will get direct messages about call invite / hangup
        signalSvc.on('message', function(msg) {
            switch(msg.type) {
                // Incoming call invitation
                case 'invite':
                    onInviteSignal(msg);
                    break;
                // Incoming call was handled by another device of the same user
                case 'accepted':
                case 'declined':
                    onInviteHandledSignal(msg);
                    break;
                // Incoming call that was sent from this client was declined
                case 'decline':
                    onDeclineSignal(msg);
                    break;
            }
        });

        // Video session created / updated / deleted
        videoSvc.on('session', function(session, op) {
            console.log('Video session', op, session);
            // Adjust UI
            // New Video Session added
            if (op > 0) {
                //$('.sessionId').text(session.id);
                // Listen to the changes in the Participants in this Session
                session.on('participant', function(p, op) {
                    // New remote Participant joined
                    if (op > 0) {
                        // Subscribe to all media published by this remote Participant
                        p.subscribe({audio: true, video: true});
                    }
                    // Participant has left
                    else if (op < 0) {
                        // If this was the last remote Participant, let's leave the session too
                        // since we are simulating a person to person calling
                        //session.leave();
                    }
                });
                // Handle Video elements from this session
                session.on('video', function(v, p, op) {
                    onVideoElemChange(v, session, p, op);
                });
                // Publish local audio + video into the Session
                //session.me.publish({audio: true, video: true});
            }
            // Video Session removed
            else if (op < 0) {
                $('.sessionId').text('');
            }
        });

        // Local video feed element available
        videoSvc.capture.on('video', function(v, op) {
            console.log('Local video elem', op, v);
            onVideoElemChange(v, null, null, op);
        });
    }

    function onInviteSignal(msg) {
        // Sender will contain a full addres of the other
        // user's client connection: identity/device/route
        var sender = msg.from;
        var ident = sender.split('/')[0];
        var sessionId = msg.data.session;
        var convId = msg.data.conversation;
        var media = msg.data.media;
        console.log('Invite from', ident, 'in Conv id=', convId, 'to join Session id=', sessionId);

        var fromName = ident;
        // Do we have a group name for this call?
        var groupName; // = i.group_name;
        // Let's format the incoming call message based on the information above
        var vid = media.video ? ' video' : '';
        var fromStr, info;
        // Do we have a group name?
        if (typeof groupName !== 'undefined') {
            fromStr = groupName.length > 0 ? groupName : 'a group';
            fromStr = 'Join ' + fromStr + vid + ' call...';
            info = 'Invited by ' + fromName;
        }
        // No group name
        else {
            fromStr = fromName + ' is' + vid + ' calling...';
            info = 'Do you dare to answer this call?';
        }
        $('#incomingCallFrom').text(fromStr);
        $('#incomingCallInfo').text(info);
        $('#incomingCall')
            .data({'invite': msg})
            .show();
    }

    function onInviteHandledSignal(msg) {
        var e = $('#incomingCall');
        var d = e.data();
        var invite = d ? d.invite : null;
        if (invite) {
            // This Incoming Call invite was handled by another device of this user
            if (invite.data.session === msg.data.session) {
                // Dismiss this Incoming Call UI
                e.data({'invite': null});
                e.hide();
            }
        }
    }

    function onDeclineSignal(msg) {
        console.log('My call invite was declined', msg);
    }


    // Changes in video elements
    // v - video element to add or remove
    // s - Video Session. null for a local video feed
    // p - Participant. null for local video feed
    // op - operation. 1 - add, 0 - update, -1 - remove
    function onVideoElemChange(v, s, p, op) {
        var vc = $('#videoContainer');
        if (op < 0) {
            vc[0].removeChild(v);
        }
        else if (op > 0) {
            // Remote video
            if (p) {
                v.setAttribute('class', 'remote');
                vc.append(v);
            }
            // Local video, insert as the first child node
            else {
                v.setAttribute('class', 'local');
                vc.prepend(v);
            }
        }
        // Total number of video elements (local and remote)
        var n = vc[0].children.length;
        if (op !== 0) {
            vc.toggle(n > 0);
        }
        console.log('VIDEO elems.count: ' + n);
        // Use number of remote video elems to determine the layout using CSS
        var rn = vc.children('.remote').length;
        var kl = rn > 1 ? 'grid' : 'simple';
        vc.attr('class', kl);
    }


    // Show the first chat
    function selectFirstChat() {
        setTimeout(_selectFirstChat, 100);
    }

    function _selectFirstChat() {
        // Do we have more chats?
        var chats = $('#chatList').children();
        if (chats.length > 0) {
            if (!currentConvId) {
                // Simulate a click on the first chat
                console.log('Selecting first chat');
                chats.first().click();
            }
        }
        // No more chats
        else {
            // Clear message lists etc
            console.log('No more chats to select');
            showChat(null);
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
            if (tabDiv.length === 0 || msgsDiv.length === 0) {
                console.log('Warning: Deleting a conversation with no DOM element!', c);
            }
            tabDiv.remove();
            msgsDiv.remove();
            // Current conversation was deleted
            if (c.id === currentConvId) {
                currentConvId = null;
                // Select the first chat
                selectFirstChat();
            }
            return;
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

            c.on('message', function(m, op) {
                onMessageChange(m, c, op);
            });
            c.on('participant', function(p, op) {
                onParticipantChange(p, c, op);
            });
            // Listen to changes on 'me' participant
            c.me.on('change', function() {
                console.log('Me changed', c.me.id, 'seenId=', c.me.seenId);
                // 'seen' for me has potentially changed.
                // This affects the ConversationList UI with unread counts
                onConversationChange(c, 0);
            });
        }


        // Update Conversation List UI
        var latestText = '';
        var lastMsg = getLastConversationMessage(c);
        var timestamp = lastMsg ? lastMsg.created : c.created;
        var stamp = getRelativeTime(timestamp);
        if (lastMsg) {
            // Show the text from the latest conversation
            if (lastMsg.text) {
                latestText = lastMsg.text;
            }
            // If no text, but has an attachment, show the mime type
            else if (lastMsg.data && lastMsg.data.type) {
                latestText = lastMsg.data.type;
            }
            latestText = lastMsg.from + ': ' + latestText;
        }
        var title = getConversationTitle(c);
        var unread = c.getUnreadCount(c.me);
        if (unread > 0) {
            title += ' (' + unread + ')';
        }
        //console.log('LastMessage', lastMsg, 'convId', c.id);
        // Apply data to DOM
        tabDiv.children('strong').html(title);
        tabDiv.children('span').html(latestText);
        tabDiv.children('em').html(stamp);

        // If the updated conversation is newer than the top one -
        // move this conversation to the top
        var top = chatList.children(':first');
        if (top.length > 0 && lastMsg) {
            var topTabId = top.attr('id');
            var topConvId = domIdToConversationId(topTabId);
            var topConv = chatSvc.conversations[topConvId];
            if (topConv && topConv.id !== c.id) {
                var topLastMsg = getLastConversationMessage(topConv);
                if (!topLastMsg || lastMsg.created > topLastMsg.created) {
                    top.before(tabDiv);
                }
            }
        }
        // Is this the first conversation? Show it!
        if (!currentConvId) {
            selectFirstChat();
        }
        // Is this the current conversation?
        else if (c.id === currentConvId) {
            // Update chat title
            showChatTitle();
        }
        if (groupInfoShown) {
            // Update GroupInfo modal UI
            populateGroupInfoModal(c);
        }
    }

    // Update Message View
    function onMessageChange(m, c, op) {
        var incoming = m.from !== c.me.id;
        var divId = domIdForMessage(m);
        var div = $(divId);

        // Message deleted
        if (op < 0) {
            console.log('Deleting msg div', m);
            if (!m.deleted) {
                console.log('Warning: Deleting a message with no deleted property!', m);
            }
            if (div.length === 0) {
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

            var cssClass = incoming ? 'other' : 'me';

            div = $('<div class="msg ' + cssClass + '" />').attr('id', divId.substring(1));

            // This message has an attachment
            if (m.data && m.data.type) {
                var attachType = m.data.type;
                var href = m.data.attach;
                // this is not an audio file, thumbnail may be missing(an empty bubble in that case)
                if (attachType.indexOf('audio/') < 0) {
                    var thumbImg = m.data.thumb;
                    div.append('<a class="thumb" href="' + href + '" target="_new"><img src="' + thumbImg + '" /></a>');
                }
                // Show Play button
                else {
                    var btn = $('<button class="btn btn-info"/>')
                        .text('Play')
                        .data('src', href)
                        .click(function() {
                            var src = $(this).data('src');
                            var audio = new Audio(src);
                            audio.play();
                        });
                    div.append(btn);
                }
            }
            // Message content to show
            var text = m.text;

            // This is a call history item
            /*
            if (m.isCall()) {
                var ch = m.channel();
                var r = [];
                if (ch & bit6.Message.AUDIO) {
                    r.push('Audio');
                }
                if (ch & bit6.Message.VIDEO) {
                    r.push('Video');
                }
                if (ch & bit6.Message.DATA) {
                    if (r.length === 0) {
                        r.push('Data');
                    }
                }
                text = r.join(' + ') + ' Call';
                if (m.data && m.data.duration) {
                    var dur = m.data.duration;
                    var mins = Math.floor(dur / 60);
                    var secs = dur % 60;
                    text += ' - ' + (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
                }
            }
            */
            // Text content
            if (text) {
                div.append('<span>' + text + '</span>');
            }
            // Timestamp
            div.append('<i />');
            // Message status
            div.append('<em />');

            // Find the container for this message
            var msgsDiv = $( msgsDomIdForConversation(c) );
            msgsDiv.append(div);

            // If the conversation for this message is visible
            if (msgsDiv.is(':visible')) {
                // Scroll to the bottom of the conversation
                scrollToLastMessage();
                // Update own Seen horizon to this message
                c.me.updateSeen(m);
            }
        }

        // Update Message data

        // Latest updated stamp
        var stamp = getRelativeTime(m.created);

        // Status string
        var status;
        if (incoming) {
            status = m.from;
        } else {
            status = getOutgoingMessageStatus(c, m);
        }

        // Apply data to DOM
        div.children('i').text(stamp);
        div.children('em').text(status);

        // TODO: Check if this message change affects the conversation item view
        // in the left column
        onConversationChange(c, 0);
    }

    // Update Conversation View based on Participants changes
    function onParticipantChange(p, c, op) {
        // When information about participants in a conversation
        // changes this affects the ConversatioList UI
        // Let's just re-render it, simulating conversation change event
        onConversationChange(c, 0);
        // Listen to typing indications
        if (op > 0) {
            p.on('typing', function(flag) {
                console.log('Typing: conv=', c.id, 'participant=', p.id, 'typing=', flag);
                // Display typing label only in the current message area.
                // Can also easily add logic to display in conversations list etc if needed.
                if (c.id === currentConvId) {
                    showUsersTyping();
                }
            });
            // Listen to participant changes
            p.on('change', function() {
                console.log('Participant changed', p.id, 'seenId=', p.seenId);
                // 'seen' for this participant has potentially changed.
                // This affects the message status info in the message list
                updateMessagesStatuses(c);
            });
            updateMessagesStatuses(c);
        }
    }


    function showUsersTyping() {
        var c = chatSvc.conversations[currentConvId];
        var typists = [];
        for(var id in c.participants) {
            var p = c.participants[id];
            if (p.typing) {
                typists.push(id);
            }
        }
        if (typists.length > 0) {
            typists.sort();
            var txt = typists.join(', ');
            txt += typists.length === 1 ? ' is typing...' : ' are typing...';
            $('#msgOtherTyping').html(txt);
        }
        $('#msgOtherTyping').toggle(typists.length > 0);
    }

    // Update message statuses based on 'seen' values of the
    // conversation participants. In our UI we just set 'Seen by ...'
    // in every message. Another option is to show a label after
    // the chat bubble last seen by a participant
    function updateMessagesStatuses(c) {
        console.log('updating message statuses for', c.id, 'len=', c.messages.length);
        var msgsId = msgsDomIdForConversation(c);
        var msgsDiv = $(msgsId);
        //var msgs = msgsDiv.children();
        var readers = {};
        // Start with the newest message in a conversation and loop to the oldest
        for(var i = c.messages.length - 1; i >= 0; i--) {
            var m = c.messages[i];
            readers = getMessageReaders(c, m, readers);
            // Consider messages only sent by me
            if (m.from === c.me.id) {
                // We know who has seen this message now:
                //console.log('Message', m.id, 'was seen by', Object.keys(readers).join(', '));
                var divId = domIdForMessage(m);
                var div = $(divId);
                div.children('em').text('Seen by ' + Object.keys(readers).sort().join(', '));
            }
        }
    }


    function getMessageReaders(c, m, readers) {
        if (!readers) {
            readers = {};
        }
        // Check if this is the last seen message by a participant
        for(var id in c.participants) {
            // We do not have the last seen for this participant yet
            if (!readers[id]) {
                var p = c.participants[id];
                // This is the last message this participant has seen
                // This means that it has seen all the older messages
                if (p.seenId === m.id || p.seen > m.created) {
                    readers[id] = id;
                }
            }
        }
        return readers;
    }

    function getOutgoingMessageStatus(c, m) {
        console.log('getting outgoing status', m);
        // Is the message being sent?
        if (m.sending) {
            // Do we have upload progress info?
            if (m.progress && m.total) {
                var s = '' + m.progress;
                // We know total size of the message attachments
                if (m.total > 0) {
                    var perc = Math.floor(m.progress * 100 / m.total);
                    s = perc + '% of ' + ( m.total < 1024 ? m.total : (m.total >> 10) + 'k' );
                }
                return s;
            }
            return 'Sending';
        }
        // Has the sending process failed?
        if (m.failed) {
            return 'Failed';
        }
        // Who has seen this message?
        var readers = getMessageReaders(c, m);
        var arr = Object.keys(readers).sort();
        if (arr.length > 0) {
            return 'Seen by ' + arr.join(', ');
        }
        return 'Sent';
    }

    function getRelativeTime(stamp) {
        if (!stamp) {
            return '';
        }
        var now = Date.now();
        // 24 hours in milliseconds
        var t24h = 24 * 60 * 60 * 1000;
        var d = new Date(stamp);
        var s = (now - stamp > t24h) ? d.toLocaleDateString() : d.toLocaleTimeString();
        return s;
    }

    function getConversationTitle(c) {
        if (!c) {
            return '';
        }
        if (c.state && c.state.title) {
            return c.state.title;
        }
        // Let make the title from the participants' identities
        var r = [];
        for(var id in c.participants) {
            r.push(id);
        }
        if (r.length > 0) {
            r.sort();
            if (r.length < 4) {
                return r.join(', ');
            }
            else {
                return r[0] + ', ' + r[1] + ' + ' + (r.length - 2) + ' more';
            }
        }
        else {
            return 'Untitled';
        }
    }

    function getLastConversationMessage(c) {
        var len = c.messages.length;
        return len > 0 ? c.messages[len - 1] : null;
    }

    function showChat(convId) {
        console.log('Show messages for', convId);

        // Current conversation
        currentConvId = convId;

        // Update users' typing label when switching to a new conversation
        showUsersTyping();

        // Show current Chat title - participants
        showChatTitle();

        // Nothing to show
        if (!convId) {
            $('#chatButtons').toggle(false);
            $('body').removeClass('detail');
            return;
        }

        $('body').addClass('detail');

        var conv = chatSvc.conversations[convId];
        // Mark all messages as read
        if (conv.me.updateSeen(getLastConversationMessage(conv))) {
            // Adjusting last seen may change the unread count
            // in the Conversaton List UI
            onConversationChange(conv, 0);
        }

        $('#chatButtons').toggle(true);
        $('#groupInfoButton').toggle(true);//conv.isGroup());

        var msgsDiv = $( msgsDomIdForConversation(conv) );
        // Show only message container for this conversation
        // Hide all the other message containers
        msgsDiv.show().siblings().hide();
        // Scroll to the bottom of the conversation
        scrollToLastMessage();

        // Request focus for the compose message text field
        //$('#msgText').focus();
    }

    function showChatTitle() {
        var uri = currentConvId;
        var t = '';
        if (uri) {
            var c = chatSvc.conversations[uri];
            t = getConversationTitle(c);
        }
        $('#chatTitle').text(t);
    }

    // Get jQuery selector for a Message
    function domIdForMessage(m) {
        return '#msg__' + m.id;
    }

    // Get Chat Tab jQuery selector for a Conversation
    function tabDomIdForConversation(c) {
        return '#tab__' + c.id;
    }

    // Get Messages Container jQuery selector for a Conversation
    function msgsDomIdForConversation(c) {
        return '#msgs__' + c.id;
    }

    // Convert element id to a Conversation id
    function domIdToConversationId(id) {
        var r = id.split('__');
        id = r.length > 0 ? r[1] : id;
        return id;
    }

    // Convert element id to a Message id
    function domIdToMessageId(id) {
        var r = id.split('__');
        id = r.length > 0 ? r[1] : id;
        return id;
    }

    // Scroll to the last message in the messages list
    function scrollToLastMessage() {
        var t = $('#msgList');
        t.scrollTop( t[0].scrollHeight );
    }

    // I wonder what this function does...
    function sendMessage() {
        var text = $('#msgText').val();
        if (!text || !currentConvId) {
            return;
        }
        $('#msgText').val('');
        console.log ('Send message to=', currentConvId, 'content=', text);
        var c = chatSvc.conversations[currentConvId];
        c.compose().text(text).send();
    }

    function sendControlSignal(to, type, data) {
        var opts = {
            to: to,
            type: type,
            data: data
        };
        signalSvc.send(opts);
    }

    // User selected file(s) to attach to a message
    function handleAttachFiles(files) {
        // files is a FileList of File objects. List some properties.
        for (var i = 0, f; f = files[i]; i++) {
            console.log(f.name + ' - selected - type: ' + (f.type || 'n/a') + ' size: ' + f.size + 'b');
            handleAttachFile(f);
        }
    }

    // Send each attached file as a separate message
    function handleAttachFile(f) {
        if (!f || !currentConvId) {
            return;
        }
        console.log ('Send attachment to=', currentConvId, 'file=', f);
        var c = chatSvc.conversations[currentConvId];
        c.compose().attach(f).send();
    }

    // User dropped files in the chat messages area
    function handleAttachFilesDrop(e) {
        var evt = e.originalEvent;
        evt.stopPropagation();
        evt.preventDefault();
        // FileList object
        var files = evt.dataTransfer.files;
        handleAttachFiles(files);
    }

    // User is dragging files over the chat messages area
    function handleAttachFilesDragOver(e) {
        var evt = e.originalEvent;
        evt.stopPropagation();
        evt.preventDefault();
        // Explicitly show this is a copy
        evt.dataTransfer.dropEffect = 'copy';
    }

    // Start an outgoing call
    function startOutgoingCall(to, video, screen) {
        // Start the outgoing call
        prepareInCallUI();

        videoSvc.create({}, function(err, session) {
            console.log('Started session', err, session);
            // What media we will be publishing
            var media = {
                audio: !disableAudio,
                video: video,
                screen: screen
            };
            // Start publishing
            session.me.publish(media);

            var c = chatSvc.conversations[currentConvId];
            // Let's send Session ID to the recipients so they can join.
            // We invent our own signaling format.
            var inviteInfo = {
                session: session.id,
                conversation: c.id,
                media: media
            };
            // We can publish the invite to the Signal Channel corresponding
            // to the Chat Conversation. Or just send it to each individual
            // Conversation Participant.
            for(var id in c.participants) {
                sendControlSignal(id, 'invite', inviteInfo);
            }
        });
    }

    // Start an outgoing phone call
    function startPhoneCall(to) {
    }

    function prepareInCallUI() {
        showInCallName();
        $('body').addClass('detail');
        $('#detailPane').addClass('hidden');
        $('#inCallPane').removeClass('hidden');
    }

    function updateInCallUI() {
        showInCallName();
    }

    // Show all the call participants
    function showInCallName() {
        var s = '';
        $('#inCallOther').text(s);
    }

    // Show Group Info modal
    function showGroupInfo(c) {
        groupInfoShown = true;
        // Populate the UI
        populateGroupInfoModal(c);
        // Show modal
        $('#groupInfoModal').modal('show');
    }

    function populateGroupInfoModal(c) {
        $('#groupInfoId').text(c.id);
        $('#groupInfoMetaRaw').text(JSON.stringify(c.state, null, 2));
        //$('#groupInfoPermsRaw').text(JSON.stringify(c.permissions, null, 2));
        $('#groupInfoMembersRaw').text(JSON.stringify(c.participants, null, 2));
        var tbody = $('#groupInfoMembers').empty();
        // Add Me info
        var p = c.me;
        var tr = $('<tr/>');
        tr.append('<td>' + p.id + ' (me)</td>');
        tr.append('<td>' + p.role + '</td>');
        tr.append('<td>' + (p.status ? p.status : '') + '</td>');
        tr.append('<td><a href="#me">leave</a></td>');
        tbody.append(tr);
        // Add Remote Participants
        for(var i in c.participants) {
            p = c.participants[i];
            console.log('Participant', p);
            tr = $('<tr/>');
            tr.append('<td>' + p.id + '</td>');
            tr.append('<td>' + p.role + '</td>');
            tr.append('<td>' + (p.status ? p.status : '') + '</td>');
            tr.append('<td><a href="#' + p.id + '">kick</a></td>');
            tbody.append(tr);
        }
    }


    console.log('Bit6 Demo Ready! SDK version ' + bit6.version);

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


    // Click on a tab in the chat list shows the messages
    $('#chatList').on('click', '.tab', function(e) {
        var id = $(this).attr('id');
        var convId = domIdToConversationId(id);
        showChat(convId);
    });

    // Clicking on Navbar takes you back into the chat list
    // Useful on small screens
    $('#backToList').click(function() {
        $('body').removeClass('detail');
    });

    // GroupInfo modal is closed
    $('#groupInfoModal').on('hidden.bs.modal', function () {
        groupInfoShown = false;
    });

    // When user clicks on New Chat, give focus to Username
    $('#newChatDropdown').on('shown.bs.dropdown', function () {
        $('#newChatUsername').val('');
        setTimeout(function() {$('#newChatUsername').focus();}, 100);
    });

    // Start a new chat
    $('#newChatStart').click(function() {
        var v = $('#newChatUsername').val().trim();
        console.log('Start chat with' + v);
        // Closes the dropdown but then you cannot open it again
        //$('#newChatDropdown').dropdown('toggle');
        // Slightly hackier way to close the dropdown
        $('body').trigger('click');
        // Create a new Conversation and invite a Participant
        chatSvc.create({}, function(err, c) {
            if (err) {
                console.log('Error creating new conversation', err);
            } else {
                c.add(v);
                showChat(c.id);
            }
        });
        return false;
    });

    // Create a new Group
    $('#newGroupCreate').click(function() {
        var t = $('#newGroupTitle').val().trim();
        console.log('Create a group with title: ' + t);
        // Closes the dropdown but then you cannot open it again
        //$('#newChatDropdown').dropdown('toggle');
        // Slightly hackier way to close the dropdown
        $('body').trigger('click');
        var opts = {};
        if (t) {
            opts.state = {title: t};
        }
        // Create a new Conversation and invite a Participant
        chatSvc.create(opts, function(err, c) {
            if (err) {
                console.log('Error creating new conversation', err);
            } else {
                showChat(c.id);
            }
        });
        return false;
    });

    // Add a new group member
    $('#newMemberButton').click(function() {
        var v = $('#newMemberUsername').val().trim();
        var c = chatSvc.conversations[currentConvId];
        if (v && c) {
            $('#newMemberUsername').val('');
            // Add a Participant
            c.add(v);
        }
        return false;
    });

    // Send Message click
    $('#sendMsgButton').click(function() {
        console.log('Send message clicked');
        sendMessage();
    });

    // Selected attachment file
    $('#attachFile').change(function(evt) {
        console.log('Attach clicked');
        var files = evt.target.files; // FileList object
        handleAttachFiles(files);
    });

    // Files to attach can be dropped in the messages area
    $('#detailPane')
        .on('dragover', handleAttachFilesDragOver)
        .on('drop', handleAttachFilesDrop);


    // Delete a Conversation
    $('#deleteChatButton').click(function() {
        console.log('Delete current conversation');
        return false;
    });

    // Show Group info
    $('#groupInfoButton').click(function() {
        var c = chatSvc.conversations[currentConvId];
        console.log('Show group info for ' + currentConvId, c);
        if (c) {
            showGroupInfo(c);
        }
        return false;
    });

    // Member action in GroupInfo Modal
    $('#groupInfoMembers').on('click', 'a', function(e) {
        console.log(e);
        var t = $(this);
        var ident = t.attr('href').substring(1);
        var c = chatSvc.conversations[currentConvId];
        if (c) {
            if (ident === 'me') {
                c.leave();
            } else {
                c.kick(ident);
            }
        }
    });

    // Change Media Mode for new calls
    $('#mediaModeButton').click(function() {
        useMixMediaMode = !useMixMediaMode;
        $(this).text(useMixMediaMode ? 'Media mode: Mix' : 'Media mode: P2P');
    });

    // Start a voice call
    $('#audioCallButton').click(function() {
        console.log('Audio call clicked');
        startOutgoingCall(currentConvId, false, false);
    });

    // Start a video call
    $('#videoCallDefault').click(function() {
       startOutgoingCall(currentConvId, true, false);
    });

    $('#videoCallFrontCam').click(function() {
       var videoOpt = {facingMode: 'user'};
       startOutgoingCall(currentConvId, videoOpt, false);
    });

    $('#videoCallBackCam').click(function() {
       var videoOpt = {facingMode: 'environment'};
       startOutgoingCall(currentConvId, videoOpt, false);
    });

    // Start a screen sharing call
    $('#screenCallButton').click(function() {
        console.log('ScreenShare call clicked');
        startOutgoingCall(currentConvId, false, true);
    });

    // Start a phone call
    $('#phoneCallButton').click(function() {
        console.log('Phone call clicked');
        // For this demo, call a helpdesk of a well-known store
        startPhoneCall('+18004663337');
    });

    // Key down event in compose input field
    $('#msgText').keydown(function() {
        //console.log('keydown in compose');
        var c = chatSvc.conversations[currentConvId];
        if (c) {
            c.me.sendTyping(true);
        }
    });

    // Send message when user hits Enter
    $('#msgText').keyup(function(e) {
        var code = e.which;
        if (code === 13) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Paste event. If a file is pasted - send it as an attachment
    $('#msgText').on('paste', function(e) {
        var files = [];
        var evt = e.originalEvent;
        var clipboardData = evt.clipboardData || {};
        var items = clipboardData.items || [];
        for (var i = 0; i < items.length; i++) {
            var f = items[i].getAsFile();
            if (f) {
                files.push(f);
            }
        }
        if (files.length > 0) {
            evt.stopPropagation();
            evt.preventDefault();
            handleAttachFiles(files);
        }
    });


    // 'Answer Incoming Call' click
    $('#answerAudio').click(function() {
        var e = $('#incomingCall').hide();
        var d = e.data();
        var invite = d ? d.invite : null;
        if (invite) {
            e.data({'invite': null});
            // Tell this user's other devices, that the call is accepted
            sendControlSignal(invite.to, 'accepted', invite.data);
            // SessionId
            var id = invite.data.session;
            // Accept the call, send local audio only
            prepareInCallUI();
            videoSvc.join(id, function(err, session) {
                console.log('Join session', id, err);
                session.me.publish({audio: true});
            });
        }
    });

    $('#answerVideo').click(function() {
        var e = $('#incomingCall').hide();
        var d = e.data();
        var invite = d ? d.invite : null;
        if (invite) {
            e.data({'invite': null});
            // Tell this user's other devices, that the call is accepted
            sendControlSignal(invite.to, 'accepted', invite.data);
            // SessionId
            var id = invite.data.session;
            // Accept the call, send local audio+video
            prepareInCallUI();
            videoSvc.join(id, function(err, session) {
                console.log('Join session', id, err);
                session.me.publish({audio: !disableAudio, video: true});
            });
        }
    });

    // 'Decline Incoming Call' click
    $('#decline').click(function() {
        var e = $('#incomingCall').hide();
        var d = e.data();
        var invite = d ? d.invite : null;
        if (invite) {
            e.data({'invite': null});
            // Tell this user's other devices, that the call is declined
            sendControlSignal(invite.to, 'declined', invite.data);
            // Decline call - tell the caller's device
            sendControlSignal(invite.from, 'decline', invite.data);
        }
    });

    $('#incallRecord').click(function() {
        // TODO
    });


    $('#incallVideo').click(function() {
        // Toggle video publishing for all sessions
        for(var id in videoSvc.sessions) {
            var s = videoSvc.sessions[id];
            s.me.publish({video: !s.me.pub.video});
            updateInCallUI();
        }
    });

    $('#incallScreen').click(function() {
        // TODO
    });

    // 'Call Hangup' click
    $('#hangup').click(function() {
        $('#detailPane').removeClass('hidden');
        $('#inCallPane').addClass('hidden');
        // End all active sessions
        for(var id in videoSvc.sessions) {
            var s = videoSvc.sessions[id];
            s.leave();
        }
    });

    // Logout click
    $('#logout').click(function() {
        currentConvId = null;
        groupInfoShown = false;
        showChatTitle();
        $('#welcome').toggle(true);
        $('#main').addClass('hidden');
        $('#loggedInNavbar').addClass('hidden');
        $('#loggedInUser').text('');
        $('#chatList').empty();
        $('#msgList').empty();
        chatSvc.destroy();
        videoSvc.destroy();
        signalSvc.destroy();
        accessToken.destroy();
        window.chatSvc = null;
        window.videoSvc = null;
    });

}



$(function() {
    initApp();
});

