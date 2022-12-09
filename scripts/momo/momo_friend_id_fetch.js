function momoNotify(subtitle = '', message = '') {
    console.log(subtitle, message);
    $notify('🍑 Momo 好友ID', subtitle, message);
  };

const url = $request.url;
const re = /employeeNO\=(.*)\&/i;
const found = url.match(re);
if(!isNaN(found[1])){
    $prefs.setValueForKey(found[1], "momoShareFriendID")
    momoNotify(
        '保存成功 🍪',
        found[1]
    );
}else{
    momoNotify(
        '保存失敗 !!',
        "請重新確認分享網址"
    );
}
$done({})
