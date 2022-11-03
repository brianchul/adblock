function momoNotify(subtitle = '', message = '') {
    console.log(subtitle, message);
    $notify('🍑 Momo token', subtitle, message);
  };
  
  if ($request.method === 'POST') {
    const cookie = $request.headers['Cookie'] || $request.headers['cookie'];
    const userAgent = $request.headers['User-Agent']
    if (cookie && $request.body) {
      try {
        let body = JSON.parse($request.body);
        if (body.doAction === 'list') {
          body.pNo = '';
          body.doAction = 'reg';
          
          const saveCookie = $prefs.setValueForKey(cookie, 'momoCookie');
          const saveBody = $prefs.setValueForKey(JSON.stringify(body), 'momoBody');
          const saveUserAgent = $prefs.setValueForKey(userAgent, "momoUserAgent")
          if (!(saveCookie && saveBody && saveUserAgent)) {
            if(!saveCookie)
                momoNotify(
                '保存失敗 cookie ‼️',
                '請稍後嘗試'
                );
            else if (!saveBody)
                momoNotify(
                    '保存失敗 body ‼️',
                    '請稍後嘗試'
                );
            else
                momoNotify(
                    '保存失敗 user agent ‼️',
                    '請稍後嘗試'
                );
          } else {
            momoNotify(
              '保存成功 🍪',
              ''
            );
          }
        }
      } catch (error) {
        momoNotify(
          '保存失敗 ‼️',
          error
        );
      }
    } else {
      momoNotify(
        '保存失敗 ‼️',
        '請重新登入'
      );
    }
  }
  $done({})
  