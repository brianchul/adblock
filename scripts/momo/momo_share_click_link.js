const momoHeaders = {
    Cookie: $prefs.valueForKey('momoCookie'),
    'Content-Type': 'application/json;charset=utf-8',
    'User-Agent': $prefs.valueForKey('momoUserAgent'),
};

const noCookieHeaders = {
    Cookie: $prefs.valueForKey('momoCookie'),
    'Content-Type': 'application/json;charset=utf-8',
    'User-Agent': $prefs.valueForKey('momoUserAgent'),
};

function momoNotify(subtitle = '', message = '') {
    $notify('🍑 Momo 每日分享', subtitle, message);
}

const mainPageRequest = {
    url: 'https://app.momoshop.com.tw/api/moecapp/goods/getMainPageV5',
    headers: momoHeaders,
    method: 'POST', // Optional, default GET.
    body: JSON.stringify({
        ccsession: '',
        custNo: '',
        ccguid: '',
        jsessionid: '',
        isIphoneX: '1',
    }),
};

const eventPageRequest = {
    url: '',
    method: 'GET', // Optional, default GET.
    headers: noCookieHeaders,
};

const jsCodeRequest = {
    url: '',
    method: 'GET', // Optional, default GET.
    headers: momoHeaders,
};

const shareCheckInRequest = {
    url: '',
    method: 'POST', // Optional, default GET.
    headers: {
        Cookie: $prefs.valueForKey('momoCookie'),
        'Content-Type': 'application/json;charset=utf-8',
        'User-Agent': $prefs.valueForKey('momoUserAgent'),
        Referer: 'https://www.momoshop.com.tw/',
    },
    body:  {
        pNo : '',
        doAction : 'link',
        employeeID: $prefs.valueForKey('momoShareFriendID')
      },
};

function getEventPageUrl() {
    console.log('----------------------------------------------------');
    $task.fetch(mainPageRequest).then(
        (response) => {
            if (response.statusCode === 200) {
                try {
                    const obj = JSON.parse(response.body);
                    if (obj.success === true) {
                        const mainInfo = obj.mainInfo;
                        let found = false;
                        for (const info of mainInfo) {
                            if (info.adInfo && info.columnType === '3') {
                                const adInfo = info.adInfo[0];
                                const actionUrl = adInfo.action.actionValue;
                                console.log('Momo 簽到活動頁面 👉' + actionUrl);
                                found = true;
                                eventPageRequest.url = actionUrl;
                                eventPageRequest.headers.Cookie = '';
                                getJavascriptUrl();
                            }
                        }
                        if (!found) {
                            console.log('找不到簽到活動頁面');
                            $done();
                        }
                    } else {
                        momoNotify('取得活動頁面失敗 ‼️', obj.resultMessage);
                        $done();
                    }
                } catch (error) {
                    momoNotify('取得活動頁面失敗 ‼️', error);
                    $done();
                }
            } else {
                momoNotify('Cookie 已過期 ‼️', '請重新登入');
                $done();
            }
        },
        (reason) => {
            momoNotify('取得活動頁面失敗 ‼️', '連線錯誤');
            $done();
        }
    );
}

function getJavascriptUrl() {
    console.log('----------------------------------------------------');
    $task.fetch(eventPageRequest).then(
        (response) => {
            if (response.statusCode === 200) {
                console.log('get javascript ok');
                try {
                    const data = response.body;
                    const re =
                        /https:\/\/(.*)\/promo-cloud-setPunch-[a-z0-9]{3,}\.js\?t=[0-9]{13}/i;
                    const found = data.match(re);
                    const url = found[0];
                    jsCodeRequest.url = url;
                    console.log('活動 JS URL 👉' + url);
                    getPromoCloudConfig();
                } catch (error) {
                    momoNotify('取得 JS URL 失敗 ‼️', error);
                    $done();
                }
            } else {
                momoNotify('取得 JS URL 失敗 ‼️', response.status);
                $done();
            }
        },
        (reason) => {
            momoNotify('取得 JS URL 失敗 ‼️', '連線錯誤');
            $done();
        }
    );
}

function getPromoCloudConfig() {
    console.log('----------------------------------------------------');
    $task.fetch(jsCodeRequest).then(
        (response) => {
            if (response.statusCode === 200) {
                console.log('get promo cloud config ok');
                try {
                    const data = response.body;
                    const pNoRe = /punchConfig\.pNo(.*)"(.*)"/i;
                    const pNo = data.match(pNoRe)[2];
                    console.log('Momo 活動 ID 👉' + pNo);

                    const pUrlRe = /punchConfig\.serviceUrl(.*)'(.*)'/i;
                    const pUrl = data.match(pUrlRe)[2];

                    shareCheckInRequest.url = pUrl;
                    shareCheckInRequest.body.pNo = pNo;
                    shareCheckInRequest.body = JSON.stringify(shareCheckInRequest.body);
                    shareCheckIn()
                } catch (error) {
                    console.log(error);
                    momoNotify('取得活動 ID 失敗 ‼️', error);
                    $done();
                }
            } else {
                momoNotify('Cookie 已過期 ‼️', '請重新登入');
                $done();
            }
        },
        (reason) => {
            momoNotify('取得活動 ID 失敗 ‼️', '連線錯誤');
            $done();
        }
    );
}
function shareCheckIn() {
    console.log('----------------------------------------------------');
    try {
        $task.fetch(shareCheckInRequest).then(
            (response) => {
                if (response.statusCode === 200) {
                    console.log('share ok');
                    const data = response.body;
                    const obj = JSON.parse(data);
                    const responses = {
                        'D'             : '請於活動時間內參加活動',
                        'L'             : '請重新登入',
                        'APP'           : '請在APP參加此活動',
                        'ERR'           : '很抱歉 目前系統繁忙 請稍後再試',
                        'ERROR'         : 'ERROR 很抱歉，目前系統繁忙，請稍後再試',
                        'EPN'           : 'ERROR 活動不存在',
                        'EPN2'           : 'ERROR 活動不存在',
                        //link(連結)專用訊息
                        'OK'          : '恭喜！成功幫好友簽到完成',
                        'linked'      : '已有他人協助好友完成簽到',//幫好友簽到已達今日上限
                        'MAX'         : '您的好友已達活動分享上限',//幫好友簽到已達活動上限
                        'linkedFriend': '今日已幫好友簽到完成',
                        'notshared'   : '此連結已過期，需請好友重新分享今日連結',
                        'E_LINK'      : '不能分享給自己'
                      }
                    
                    if (obj.data.status === 'OK') {
                        momoNotify('今日分享成功 ✅', '');
                    } else {
                        momoNotify('分享失敗 ‼️', responses[obj.data.status]);
                        console.log(obj.data.status);
                    }
                } else {
                    momoNotify('Cookie 已過期 ‼️', '請重新登入');
                }
                $done();
            },
            (reason) => {
                momoNotify('分享失敗 ‼️', '連線錯誤');
                $done();
            }
        );
    } catch (error) {
        console.log(error);
        $done();
    }
}
console.log($prefs.valueForKey('momoCookie'));
console.log($prefs.valueForKey('momoUserAgent'));
console.log($prefs.valueForKey('momoShareFriendID'));
const rtime = Math.floor(Math.random() * 300);
console.log(`wait for ${rtime} seconds to run`);
setTimeout(() => getEventPageUrl(), rtime * 1000);
