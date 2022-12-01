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
    $notify('🍑 Momo 抽獎', subtitle, message);
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

const checkinRequest = {
    url: 'https://event.momoshop.com.tw/promoMechReg.PROMO',
    method: 'POST', // Optional, default GET.
    headers: {
        Cookie: $prefs.valueForKey('momoCookie'),
        'Content-Type': 'application/json;charset=utf-8',
        'User-Agent': $prefs.valueForKey('momoUserAgent'),
        Referer: 'https://www.momoshop.com.tw/',
    },
    body: {
        enCustNo: 0,
        m_promo_no: '',
        dt_promo_no: '',
        edm_npn: null,
        edm_lpn: null,
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
                            if (info.adInfo && info.columnType === '30') {
                                const adInfo = info.adInfo[1];
                                const actionUrl = adInfo.action.actionValue;
                                console.log('Momo 簽到活動頁面 👉' + actionUrl);
                                found = true;
                                eventPageRequest.url = actionUrl;
                                eventPageRequest.headers.Cookie = '';

                                const EDM_URL = new URL(actionUrl);
                                checkinRequest.body.edm_npn =
                                    EDM_URL.searchParams.get('npn');
                                checkinRequest.body.edm_lpn =
                                    EDM_URL.searchParams.get('lpn');
                                const enCusRe = /ck\_encust=(\d*)\;/i;
                                const enCus = $prefs
                                    .valueForKey('momoCookie')
                                    .match(enCusRe)[1];
                                checkinRequest.body.enCustNo = enCus;

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
                    const re =
                        /https:\/\/(.*)\/promoCloud_red\.js\?t=[0-9]{13}/i;
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
                    const mpNoRe = /cloudLotterySetting\.m_promo_no(.*)'(.*)'/i;
                    const mpNo = data.match(mpNoRe)[2];
                    console.log('Momo 活動 mID 👉' + mpNo);

                    const dtNoRe =
                        /cloudLotterySetting\.dt_promo_no(.*)'(.*)'/i;
                    const dtNo = data.match(dtNoRe)[2];
                    console.log('Momo 活動 dtID 👉' + dtNo);

                    checkinRequest.body.m_promo_no = mpNo;
                    checkinRequest.body.dt_promo_no = dtNo;
                    checkinRequest.body = JSON.stringify(checkinRequest.body);
                    checkIn();
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

function checkIn() {
    console.log('----------------------------------------------------');
    try {
        $task.fetch(checkinRequest).then(
            (response) => {
                if (response.statusCode === 200) {
                    console.log('check in ok');
                    const data = response.body;
                    const obj = JSON.parse(data);
                    const returnMsg = {
                        D: '請於活動時間內參加活動',
                        W: '請於指定星期參加活動',
                        WP: '競標金額錯誤',
                        L: '請先登入會員',
                        A: '您已參與過本次搶購物金活動囉!', // '您已登記過此活動',本時段您已經領過了喔!!
                        A_EX: '您已參與過本次搶購物金活動囉!', // '您已登記過其他活動',每日限玩一次，您已經領過了喔!!
                        EA: '您不符合登記資格',
                        FULL: '本時段已經發放完畢!!', // '登記已額滿',
                        NOT_USED: '很抱歉，活動暫不開放',
                        NOT_APP: '請在momo APP參加活動',
                        NOT_WEB: '請在momo網頁版參加活動',
                        NOT_NC: '您非活動期間新客',
                        NOT_WFB: '您非活動期間首購',
                        NO_PT: '點數不足',
                        INS: '獎項已歸戶，感謝您對本活動的支持', // '兌換成功',//'登記成功，感謝您對本活動的支持',
                        ERR: '很抱歉，目前系統繁忙，請稍後再試',
                        ERROR: 'ERROR\n很抱歉，目前系統繁忙，請稍後再試',
                        E_CN: '請重新登入',
                    };
                    if (obj.returnMsg === 'INS') {
                        momoNotify('今日抽獎成功 ✅', '');
                    } else {
                        momoNotify('抽獎失敗 ‼️', returnMsg[obj.returnMsg]);
                    }
                } else {
                    momoNotify('Cookie 已過期 ‼️', '請重新登入');
                }
                $done();
            },
            (reason) => {
                momoNotify('抽獎失敗 ‼️', '連線錯誤');
                $done();
            }
        );
    } catch (error) {
        console.log(error);
        $done();
    }
}
console.log($prefs.valueForKey('momoCookie'));
console.log($prefs.valueForKey('momoBody'));
console.log($prefs.valueForKey('momoUserAgent'));
getEventPageUrl()
