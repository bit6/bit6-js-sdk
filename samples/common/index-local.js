
// Must not be included in the SDK

var myids = ['alex', 'julia', 'test', 'max', 'john'];
var myid = myids[0];
if (location.hash) {
    var h = location.hash;
    if (h.length === 2) {
        var idx = 1 * (h.substring(1));
        myid = myids[idx];
    }
}

$('#authUsername').val(myid);
$('#authPassword').val('abc');

$('#loginButton').click();
