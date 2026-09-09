# Offline reading font

Only `QiaomuReadingFangsong.woff2` is bundled. It is a reading subset derived from
Zhuque Fangsong v0.212 (technical preview), containing 7,554 Unicode codepoints:
GB2312 characters plus supported Latin, punctuation and full-width characters.
Glyph outlines and layout features are retained. Characters outside the subset
fall back to the device's system serif font. Users can also select device fonts.
No font network request or installation is performed.

Upstream: https://github.com/TrionesType/zhuque
Original `ZhuqueFangsong-Regular.ttf` SHA-256:
`558c62730844fe54ba220146ed62f859d4e2880188d92d985f8921c6e3743bc4`.

License: SIL Open Font License 1.1, Copyright (c) 2023 Zhejiang JadeFoci
Techonology Co. LTD. The upstream license is in `OFL.txt` and embedded in the
release banner. This subset is maintained by 向阳乔木 and is not an upstream release.

To reproduce using Python with fonttools 4.64.0 and brotli 1.2.0:

    python scripts/build-reading-font.py /path/to/ZhuqueFangsong-Regular.ttf

The generated WOFF2 is committed, so ordinary plugin builds need only npm ci
and npm run build. The build enforces a 5,000,000-byte budget on each release asset.

## 下载与安装 / Download and install

在“自定义字体”中选择本机已安装字体，或导入 `.ttf`、`.otf`、`.woff`、`.woff2` 文件。
导入后字体文件保存在仓库中，可随仓库同步；手机不支持本机枚举时使用文件导入。
除朱雀仿宋子集外，字体菜单中的命名字体需要用户自行安装；不可用时会回退到系统字体。

Select **Custom font** to browse installed device fonts or import a font file.
Imported fonts sync with the vault. Download fonts from their official projects:

- [完整朱雀仿宋 / Zhuque Fangsong](https://github.com/TrionesType/zhuque/releases)
- [霞鹜文楷 / LXGW WenKai Screen](https://github.com/lxgw/LxgwWenKai-Screen/releases)
- [霞鹜臻楷 / LXGW ZhenKai](https://github.com/lxgw/LxgwZhenKai/releases)
- [思源宋体 / Source Han Serif](https://github.com/adobe-fonts/source-han-serif/releases)
- [思源黑体 / Source Han Sans](https://github.com/adobe-fonts/source-han-sans/releases)

The plugin never downloads or installs fonts automatically.
