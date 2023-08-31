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
    $notify('🍑 Momo 每日簽到', subtitle, message);
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

const checkInAction = "reg"
const taskAction = "taskFinished"

const newRequest = {
    url: '',
    method: 'POST', // Optional, default GET.
    headers: {
        Cookie: $prefs.valueForKey('momoCookie'),
        'Content-Type': 'application/json;charset=utf-8',
        'User-Agent': $prefs.valueForKey('momoUserAgent'),
        Referer: 'https://www.momoshop.com.tw/',
    },
    body: {"pNo":"","doAction": ""},
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
                                // 舊版
                                // for (const adInfo of info.adInfo) {
                                //   if (adInfo.adTitle && adInfo.adTitle === '天天簽到') {
                                //     const actionUrl = adInfo.action.actionValue;
                                //     console.log('Momo 簽到活動頁面 👉' + actionUrl);
                                //     found = true;
                                //     eventPageRequest.url = actionUrl;
                                //     eventPageRequest.headers.cookie = '';
                                //     getJavascriptUrl();
                                //   }
                                // }
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

                    try{
                        const endTimeRe = /year\:\s'(.*)'\,.*\n.*\n.*timeend:\s'(.*)'/i;
                        const endTimeMatch = data.match(endTimeRe);
                        const endTime = endTimeMatch[1]+endTimeMatch[2];
                        momoNotify('本輪簽到結束時間', endTime);
                    }
                    catch(err){
                        momoNotify('無法取得結束時間','');
                    }

                    const re =
                        /https:\/\/(.*)\/promo-cloud-setPunch(.*)\.js\?t=[0-9]{13}/i;
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

                    


                    checkIn(pUrl, pNo, checkInAction);
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

function checkIn(pUrl, pNo, action) {
    console.log('----------------------------------------------------');
    newRequest.url = pUrl;
    newRequest.body.pNo = pNo;
    newRequest.body.doAction = action
    newRequest.body = JSON.stringify(newRequest.body);
    const responses = {
        'D'             : '請於活動時間內參加活動',
        'L'             : '請重新登入',
        'APP'           : '請在APP參加此活動',
        'ERR'           : '很抱歉 目前系統繁忙 請稍後再試',
        'ERROR'         : 'ERROR 很抱歉，目前系統繁忙，請稍後再試',
        'EPN'           : 'ERROR 活動不存在',
        'EPN2'           : 'ERROR 活動不存在',
        //punch(簽到)專用訊息
        'OK'          : '簽到成功，感謝您對本活動的支持',
        'RA'          : '今日已完成簽到',
        'MAX'         : '簽到已達上限',
        'E_task'      : '請先完成任務'
    }
    try {
        $task.fetch(newRequest).then(
            (response) => {
                if (response.statusCode === 200) {
                    const data = response.body;
                    const obj = JSON.parse(data);
                    if (obj.data.status === 'OK') {
                        console.log('check in ok');
                        momoNotify('今日簽到成功 ✅', '');
                    } else if (obj.data.status === 'E_task') {
                        checkIn(pUrl, pNo, taskAction).then(() => {
                            setTimeout(() => checkIn(pUrl, pNo, checkInAction), 10 * 1000);
                        });
                    } else {
                        momoNotify('簽到失敗 ‼️', responses[obj.data.status] || obj.data.status);
                    }
                } else {
                    momoNotify('Cookie 已過期 ‼️', '請重新登入');
                }
                
            },
            (reason) => {
                momoNotify('簽到失敗 ‼️', '連線錯誤');
                $done();
            }
        );
        if(action === checkInAction) $done();
    } catch (error) {
        console.log(error);
        $done();
    }
}
console.log($prefs.valueForKey('momoCookie'));
console.log($prefs.valueForKey('momoUserAgent'));
const rtime = Math.floor(Math.random() * 600);
console.log(`wait for ${rtime} seconds to run`);
setTimeout(() => getEventPageUrl(), rtime * 1000);
