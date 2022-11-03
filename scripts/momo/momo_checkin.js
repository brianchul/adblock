const momoHeaders = {
  'Cookie': $prefs.valueForKey('momoCookie'),
  'Content-Type': 'application/json;charset=utf-8',
  'User-Agent': $prefs.valueForKey('momoUserAgent')
};

const noCookieHeaders = {
  'Cookie': $prefs.valueForKey('momoCookie'),
  'Content-Type': 'application/json;charset=utf-8',
  'User-Agent': $prefs.valueForKey('momoUserAgent')
};

function momoNotify(subtitle = '', message = '') {
  $notify('🍑 Momo 每日簽到', subtitle, message);
};

const mainPageRequest = {
  url: 'https://app.momoshop.com.tw/api/moecapp/goods/getMainPageV5',
  headers: momoHeaders,
  method: "POST", // Optional, default GET.
  body: JSON.stringify(
    {
      'ccsession': '',
      'custNo': '',
      'ccguid': '',
      'jsessionid': '',
      'isIphoneX': '1'
    }
  )
}

let eventPageRequest = {
  url: '',
  method: "GET", // Optional, default GET.
  headers: noCookieHeaders,
}

let jsCodeRequest = {
  url: '',
  method: "GET", // Optional, default GET.
  headers: momoHeaders,
}

let checkinRequest = {
  url: 'https://event.momoshop.com.tw/punch11.PROMO',
  method: "POST", // Optional, default GET.
  headers: {
    'Cookie': $prefs.valueForKey('momoCookie'),
    'Content-Type': 'application/json;charset=utf-8',
    'User-Agent': $prefs.valueForKey('momoUserAgent'),
    'Referer': 'https://www.momoshop.com.tw/',
  },
  body: JSON.parse($prefs.valueForKey('momoBody')),
};

function getEventPageUrl() {
  console.log('----------------------------------------------------');
  $task.fetch(mainPageRequest).then(response => {
    if (response.statusCode === 200) {
      try {
        const obj = JSON.parse(response.body);
        if (obj.success === true) {
          const mainInfo = obj.mainInfo;
          let found = false;
          for (const info of mainInfo) {
            if (info.adInfo && info.columnType === "3") {
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
          momoNotify(
            '取得活動頁面失敗 ‼️',
            obj.resultMessage
          );
          $done();
        }
      }
      catch (error) {
        momoNotify(
          '取得活動頁面失敗 ‼️',
          error
        );
        $done();
      }
    } else {
      momoNotify(
        'Cookie 已過期 ‼️',
        '請重新登入'
      );
      $done();
    }
  }, reason => {
    momoNotify(
      '取得活動頁面失敗 ‼️',
      '連線錯誤'
    );
    $done();
  });
}

function getJavascriptUrl() {
  console.log('----------------------------------------------------');
  $task.fetch(eventPageRequest).then(
    response => {
      if (response.statusCode === 200) {
        console.log('get javascript ok');
        try {
          const data = response.body
          const re = /https:\/\/(.*)\/promo-cloud-setPunch-v003\.js\?t=[0-9]{13}/i;
          const found = data.match(re);
          const url = found[0];
          jsCodeRequest.url = url;
          console.log('活動 JS URL 👉' + url);
          getPromoCloudConfig();
        }
        catch (error) {
          momoNotify(
            '取得 JS URL 失敗 ‼️',
            error
          );
          $done();
        }
      } else {
        momoNotify(
          '取得 JS URL 失敗 ‼️',
          response.status
        );
        $done();
      }
    }, reason => {
      momoNotify(
        '取得 JS URL 失敗 ‼️',
        '連線錯誤'
      );
      $done();
  });
}

function getPromoCloudConfig() {
  console.log('----------------------------------------------------');
  $task.fetch(jsCodeRequest).then(
    response => {
      if (response.statusCode === 200) {
        console.log('get promo cloud config ok');
        try {
          const data = response.body
          const pNoRe = /punchConfig\.pNo(.*)"(.*)"/i;
          const pNo = data.match(pNoRe)[2];
          console.log('Momo 活動 ID 👉' + pNo);
          checkinRequest.body.pNo = pNo;
          checkinRequest.body = JSON.stringify(checkinRequest.body);
          checkIn();
        }
        catch (error) {
          console.log(error);
          momoNotify(
            '取得活動 ID 失敗 ‼️',
            error
          );
          $done();
        }
      } else {
        momoNotify(
          'Cookie 已過期 ‼️',
          '請重新登入'
        );
        $done();
      }
    }, reason => {
      momoNotify(
        '取得活動 ID 失敗 ‼️',
        '連線錯誤'
      );
      $done();
    }
  );
}

function checkIn() {
  console.log('----------------------------------------------------');
  try{
    $task.fetch(checkinRequest).then(
      response => {
        if (response.statusCode === 200) {
          console.log('check in ok');
          const data = response.body
          const obj = JSON.parse(data);
          if (obj.data.status === 'OK') {
            momoNotify(
              '今日簽到成功 ✅',
              ''
            );
          } else if (obj.data.status === 'RA') {
            momoNotify(
              '簽到失敗 ‼️',
              '本日已簽到'
            );
          } else if (obj.data.status === 'D') {
            momoNotify(
              '簽到失敗 ‼️',
              '活動已到期'
            );
          } else if (obj.data.status === 'MAX') {
            momoNotify(
              '簽到失敗 ‼️',
              '簽到人數達到上限'
            );
          } else if (obj.data.status === 'EPN2') {
            momoNotify(
              '簽到失敗 ‼️',
              '活動不存在'
            );
          } else {
            momoNotify(
              '簽到失敗 ‼️',
              obj.data.status
            );
          }
        } else {
          momoNotify(
            'Cookie 已過期 ‼️',
            '請重新登入'
          );
        }
        $done()
      }, reason => {
        momoNotify(
          '簽到失敗 ‼️',
          '連線錯誤'
        );
        $done()
      }
    );
  }catch(error){console.log(error)}
}
console.log($prefs.valueForKey('momoCookie'))
console.log($prefs.valueForKey('momoBody'));
console.log($prefs.valueForKey('momoUserAgent'));
getEventPageUrl();
