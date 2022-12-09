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

const shareRequest = {
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
        doAction : 'share',
        shareBy: 'line'
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

                    shareRequest.url = pUrl;
                    shareRequest.body.pNo = pNo;
                    shareRequest.body = JSON.stringify(shareRequest.body);
                    generateShareLink();
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
function generateShareLink() {
    $task.fetch(shareRequest).then(
        (response) => {
            if (response.statusCode === 200) {
                console.log('share link ok');
                momoNotify('分享連結已產生 ✅', '');
            }
        })
}
console.log($prefs.valueForKey('momoCookie'));
console.log($prefs.valueForKey('momoUserAgent'));
console.log($prefs.valueForKey('momoShareFriendID'));
const rtime = Math.floor(Math.random() * 300);
console.log(`wait for ${rtime} seconds to run`);
setTimeout(() => getEventPageUrl(), rtime * 1000);
