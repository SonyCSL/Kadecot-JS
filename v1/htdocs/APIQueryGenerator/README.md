# APIQueryGenerator

## Building this app

### Development

```bash
npm run watch
```

### build

```bash
npm run build
```

## About Assets

### assets/yaml

- 設定ファイルが YAML 形式で入っている
  - 書き方は https://github.com/sowd/APIQueryGenerator/blob/master/assets/yaml/irkit/irkit.yml 参照

#### 更新したら
- `node makeDeviceList.js` すると，デバイス一覧が `yaml/devicelist.yml` に生成される
  - すべて列挙されるので，必要に応じてあとでコメントアウトする

#### 旧 json ファイルの変換
- `allConvert.sh` で 旧ファイルをコンバートできる
