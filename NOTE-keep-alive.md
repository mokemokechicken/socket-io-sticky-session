はじめに
=======

npmの `socket-io-sticky-session` が AWSのALBなどのProxyサーバの後ろにいて、
ProxyサーバからKeep-Alive接続される場合、
X-Forwarded-Forなどのヘッダによって正しいWorkerに割り振られないことがある。

という検証です。

このライブラリは最初のTCP接続の際にWorkerを割り振るために、
その接続を別のHTTPリクエストが再利用しても再振り分けされないということなのだと思います。

検証方法
=======
ソースをちょっと修正
--------------
まず、簡単に再現性を確保するために、Masterのseedを1に固定します。
(この `for_test_keep-alive` branch では修正済み)

example/cluster.js を実行
--------------
レスポンスをちょっと修正した cluster.js を実行します。
(この `for_test_keep-alive` branch では修正済み)

```
node example/cluster.js
```

HTTP リクエスト用のファイルを作成しておく
------------------
以下のmsg1, msg2 というtextファイルを作っておきます。

### msg1
```text:msg1
GET / HTTP/1.1
Host: localhost
X-Forwarded-For: 10.10.10.10
Connection: keep-alive

```

### msg2
```text:msg2
GET / HTTP/1.1
Host: localhost
X-Forwarded-For: 10.10.12.11
Connection: keep-alive

```

HTTPリクエストなので、２つとも最後の空行は重要です。

検証
-------
検証することは
「msg1, msg2 単発だと worker1, 2にそれぞれ割り振られる」が
「msg1 msg2 を同じTCP接続で続けて送ると両方とも最初のworkerに割り振られる」
ことです。

※ `netcat` という コマンドを使うので、 `brew` や `yum` などで installしておきます。

### msg1, msg2 単発だと worker1, 2にそれぞれ割り振られる
#### msg1 は worker 1に割り振られる
```
% cat msg1 | netcat localhost 3000
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Thu, 31 Aug 2017 02:21:18 GMT
Connection: keep-alive
Transfer-Encoding: chunked

47
Hello World! From worker 1 x-forwarded-for=10.10.10.10 with pid: 3499

0
```

#### msg2 は worker 2に割り振られる
```
% cat msg2 | netcat localhost 3000
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Thu, 31 Aug 2017 02:22:29 GMT
Connection: keep-alive
Transfer-Encoding: chunked

47
Hello World! From worker 2 x-forwarded-for=10.10.12.11 with pid: 3500

0
```

#### msg1 msg2 は 両方ともworker1に割り振られる
```
% cat msg1 msg2 | netcat localhost 3000
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Thu, 31 Aug 2017 02:23:12 GMT
Connection: keep-alive
Transfer-Encoding: chunked

47
Hello World! From worker 1 x-forwarded-for=10.10.10.10 with pid: 3499

0

HTTP/1.1 200 OK
Content-Type: text/plain
Date: Thu, 31 Aug 2017 02:23:12 GMT
Connection: keep-alive
Transfer-Encoding: chunked

47
Hello World! From worker 1 x-forwarded-for=10.10.12.11 with pid: 3499

0
```
#### msg2 msg1 は 両方ともworker2に割り振られる

```
% cat msg2 msg1 | netcat localhost 3000
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Thu, 31 Aug 2017 02:23:42 GMT
Connection: keep-alive
Transfer-Encoding: chunked

47
Hello World! From worker 2 x-forwarded-for=10.10.12.11 with pid: 3500

0

HTTP/1.1 200 OK
Content-Type: text/plain
Date: Thu, 31 Aug 2017 02:23:42 GMT
Connection: keep-alive
Transfer-Encoding: chunked

47
Hello World! From worker 2 x-forwarded-for=10.10.10.10 with pid: 3500

0
```
