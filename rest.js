crypto = require('crypto')

fetch = require('node-fetch')

domain = 'https://www.binance.com'

encode = _ => _
    ? '?' + Object.keys(_)
        .map(k => encodeURIComponent(k) + '=' +  encodeURIComponent(_[k]))
        .join('&')
    : ''

public = (url, data, method) =>
    fetch(
        url + encode(data),
        { method, json: true, headers: {} }
    ).then(_ => _.json())

private = (url, data, method) =>
    fetch(
        url + (data && Object.keys(data).length ? encode(data) : ''),
        { method, json: true, headers: { 'X-MBX-APIKEY': apiKey } }
    ).then(_ => _.json())

sign = (data, timestamp = Date.now()) => ({
    ...data,
    timestamp,
    signature: crypto
        .createHmac('sha256', apiSecret)
        .update(encode({ ...data, timestamp }).substr(1))
        .digest('hex')
})

module.exports.exchangeInfo = _ => public(domain + '/api/v3/exchangeInfo', _, 'GET')
module.exports.hr24 = _ => public(domain + '/api/v3/ticker/24hr', _, 'GET')
module.exports.account = _ => private(domain + '/api/v3/account', sign(_), 'GET')
module.exports.getUserData = _ => private(domain + '/api/v3/userDataStream', _, 'POST')
module.exports.keepUserData = _ => private(domain + '/api/v3/userDataStream', sign(_), 'PUT')
module.exports.closeUserData = _ => private(domain + '/api/v3/userDataStream', sign(_), 'DELETE')
