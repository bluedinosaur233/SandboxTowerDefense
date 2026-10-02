# 暮河守望 · Riverwatch

一款浏览器里的 3D 体素西幻塔防原型。在大陆上探索关卡，修筑城墙、改造地形，搭配防御塔、兵营与英雄守住要塞。当前可游玩「风渡前哨」十五波战役，包含精英敌军、首领战和星级结算。

## 本地启动

需要 Node.js 20.19+ 或 22.12+，以及支持 WebGL 的现代浏览器。

```sh
npm install
npm run dev
```

打开终端显示的地址。进入主界面前会统一加载图片、音乐和音效，完成后点击「进入大陆」。

```sh
npm run build    # 生成 dist/ 静态游戏文件
npm run preview  # 本地预览构建结果
npm test         # 运行测试
```

战场中左键拖动或 WASD 平移，右键旋转，滚轮缩放；点击底部卡牌建造，Enter 开始下一波，Space 暂停。进度保存在当前浏览器，暂不支持战斗存档和多人联机。

## 素材与版权

- 配乐：Kevin MacLeod，CC BY 4.0；见[音乐署名](public/audio/music/CREDITS.md)。
- 随仓库提供的音效：CC0 / CC BY；见[音效来源与授权](public/audio/sfx/CREDITS.md)。
- Mixkit / Pixabay 可选音效受各自许可约束，不随源码分发；缺少时自动使用仓库内备用音效。见[授权说明](public/audio/LICENSED-CREDITS.md)与[本地准备方法](docs/audio/README.md)。
- 插画与界面素材的生成记录见[美术说明](docs/art/README.md)。
