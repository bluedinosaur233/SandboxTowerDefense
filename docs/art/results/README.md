# 胜败结算美术

- `reference.png`：XEM Image API / gpt-image-2.5 生成的胜败结算方向稿。
- `frames.png`：根据方向稿编辑得到的空白胜败面板，独立文字、星星和按钮由运行时覆盖。
- `plated-star-reference.png`：用户选定的蓝粉晶体星星截图；三颗镀层星均使用同一形象。
- 两份 prompt 文本保留了生成要求。

`python3 scripts/prepare-result-art.py` 使用 Pillow / NumPy 提取透明背景面板 WebP 到 `public/art/ui/results/`。星星素材由 `scripts/prepare-result-stars.py` 独立导出；奖励流程不依赖整张静态画面。

2026-10-01 星星对齐修订：`star-aligned-source.png` 使用 XEM 按用户选定晶体星重制。`scripts/prepare-result-stars.py` 从同一高分辨率主图导出 `gold-star-v2.webp`、`plated-star-v2.webp` 和 `empty-star-v2.webp`；三个 512×512 素材的 alpha 逐像素相同，金色版只改变配色，保留相同切面与边缘。运行时三层使用相同的定位与大小，镀层擦除和金色擦除共享进度，不再使用旧 SVG 或额外放大。星辉镀层仅授予三星、携带英雄且整局零阵亡的胜利。
