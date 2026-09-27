# 用自己的电脑临时分享游戏

游戏是静态网页，可以由本机提供文件，通过 Cloudflare Quick Tunnel 获得临时 HTTPS 公网链接。每位访客独立运行自己的战役，无需注册游戏账号。

## 启动

首次安装隧道工具：

```sh
brew install cloudflared
```

在项目目录的终端中构建并启动静态服务（仅提供 `dist` 文件）：

```sh
npm run build
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

保持这个终端运行，再开一个终端：

```sh
cloudflared tunnel --url http://127.0.0.1:4173 --protocol http2
```

将输出中的 `https://…trycloudflare.com` 地址发给朋友。此链接公开可访问，每次重新启动隧道通常会变化；不需要修改路由器端口转发。

## 运行与关闭

- 保持电脑开机、联网且不休眠，两个服务进程都必须运行。
- 如需临时阻止空闲休眠，可另开终端运行 `caffeinate -i`，分享结束后按 Ctrl+C。
- 更新代码后运行 `npm run build`，构建完成后朋友刷新即可加载新版本。
- 分享结束，在隧道和静态服务的终端中分别按 Ctrl+C。
- 此方式适合短期试玩；Quick Tunnel 无可用性保证，部分网络访问可能较慢。长期分享建议静态托管。
