# Kubeflow Pipeline Builder

Visual DAG エディタと Python コード補完機能を備えた Kubeflow Pipelines パイプライン構築ツール

## 概要

このプロジェクトは、Kubeflow Pipelines のパイプラインを視覚的に構築編集できるWebアプリケーションです。

**主な機能:**
-  リアクティブな DAG エディタ（ReactFlow）
-  ノード単位での Python コード編集
-  パラメータ自動管理
-  VSCode 風の Python コード補完
  - numpy, pandas, pathlib などの標準ライブラリ
  - KFP 2.0 APIの補完
  - 関数の引数情報付き
-  自動 KFP コード生成
-  Docker マルチコンテナ構成（フロント + LSP サーバー）

## クイックスタート

### 前提条件
- Docker & Docker Compose
- 3000, 8000 ポートが空いていること

### 起動

```bash
docker-compose up --build
```

### アクセス

- **フロントエンド**: http://localhost:3000
- **LSP サーバー** (ヘルスチェック): http://localhost:8000/health
- **API 補完エンドポイント**: http://localhost:8000/api/completion (POST)

## プロジェクト構成

```
kubeflow-pipeline-builder/
 docker-compose.yml          # マルチコンテナ定義
 .dockerignore
 .gitignore
 README.md                   # このファイル

 frontend/                   # React アプリケーション
    Dockerfile              # 2段階ビルド（NodeNginx）
    nginx.conf              # Nginx ルーティング設定
    package.json
    public/
    src/
       App.js              # メインコンポーネント (405 行)
       App.css
       index.js
       index.css
       components/         # UI コンポーネント（8 個、モジュール分割）
          ArgRow.jsx                 # パラメータ行
          ArgumentsSection.jsx       # パラメータセクション
          CodeEditorDialog.jsx       # Monaco + LSP 統合エディタ
          FlowArea.jsx               # ReactFlow エリア
          GeneratedCodeDialog.jsx    # 生成コード表示
          NodeHeader.jsx             # ノード情報ヘッダ
          OutputTypeSelector.jsx     # 出力型選択
          PipelineParamsEditor.jsx   # パイプラインパラメータ
          SidebarPanel.jsx           # サイドバー
       hooks/              # React Hooks
          useNodeArguments.js        # ノード引数管理
          usePipelineFlow.js         # パイプローフロー状態管理
       utils/              # ユーティリティ
           codeGenerator.js           # KFP コード生成
           lspClient.js               # LSP サーバー通信
    build/                  # ビルド出力（Nginx でサーブ）

 backend/                    # Python LSP サーバー
     Dockerfile              # Python 3.11-slim
     requirements.txt        # Python 依存パッケージ
     lsp_wrapper.py          # Flask LSP サーバー実装 (214 行)
```

## アーキテクチャ

### システム全体

```
[Browser (localhost:3000)]
           
    [Nginx Reverse Proxy]
           
      
               
  [SPA Assets] [/api/*  Backend]
               
    [Python LSP Server:8000]
               
    [Jedi Code Analysis Engine]
    [+ KFP Fallback Completion]
```

### フロントエンド

**Tech Stack**: React 19.2.0, ReactFlow 11.11.4, Monaco Editor, Material-UI 7.3.5

**フロー**:
1. **React App** - コンポーネント分割アーキテクチャ
   - usePipelineFlow hook - パイプライン状態管理
   - useNodeArguments hook - ノード引数管理
   - 8 個の小コンポーネント - 関心分離

2. **Monaco Editor** - コード編集
   - syntax highlighting
   - lspClient.js 経由で補完リクエスト

3. **Nginx** - 本番サーブ
   - 静的資産キャッシング (1年)
   - /api/* をバックエンドにプロキシ
   - SPA ルーティング対応 (try_files $uri /index.html)

### バックエンド

**Tech Stack**: Python 3.11-slim, Flask 3.0.0, Jedi 0.18.1, KFP 2.0.0

**lsp_wrapper.py** - Flask HTTP LSP サーバー

補完ロジック:
1. **段階 1: Jedi による解析** (標準ライブラリ + インストール済みパッケージ)
   ```python
   script = Script(code, path='untitled.py')
   completions = script.complete(line=line+1, column=character)
   ```
   対応: numpy, pandas, pathlib, os, sys, etc.

2. **段階 2: KFP フォールバック** (Jedi が結果 0 の場合)
   ```python
   KFP_COMPLETIONS = {
       'kfp': ['dsl', 'components', 'client', 'compiler', 'v2'],
       'kfp.dsl': ['pipeline', 'component', 'Pipeline', ...],
       'kfp.v2': [...]
   }
   ```
   - 正規表現: `r'(kfp(?:\.[a-zA-Z_]\w*)*)\s*\.\s*(\w*)$'`
   - モジュールパスをマッチング、静的リストから補完

**エンドポイント**:

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/health` | GET | サーバー状態確認 (応答: `{"status": "ok"}`) |
| `/api/completion` | POST | コード補完 |

**補完リクエスト形式**:
```json
{
  "code": "import numpy as np\nnp.",
  "line": 1,
  "character": 3
}
```

**補完レスポンス形式** (LSP 互換):
```json
{
  "completions": [
    {
      "label": "array",
      "kind": 12,
      "detail": "...",
      "documentation": "..."
    }
  ]
}
```

## 開発

### ローカル開発（Docker なし）

```bash
# フロント単体開発
cd frontend
npm install
npm start  # ローカル 3000 (dev サーバー)

# バック単体開発
cd backend
pip install -r requirements.txt
python lsp_wrapper.py  # ローカル 8000
```

### Docker でのビルド起動

```bash
# イメージのビルド
docker-compose build

# コンテナ起動（フォアグラウンド）
docker-compose up

# コンテナ起動（バックグラウンド）
docker-compose up -d

# ログ確認
docker-compose logs -f language-server  # バックログ
docker-compose logs -f frontend         # フロントログ

# サービス再起動
docker-compose restart language-server

# 停止削除
docker-compose down
```

## 機能詳細

### 1. DAG エディタ

- **ノード追加**: サイドバーの「+ Add Node」
- **ノード削除**: ノードの「」ボタン
- **エッジ（接続）**: ノードの出力  別ノードの入力ドラッグ
- **ノード移動**: ドラッグ&ドロップ
- **ノード編集**: ノードをクリック  右パネルで編集

### 2. ノード コード編集

- **Monaco Editor** - 正式な Python エディタ
- **リアルタイム補完**
  - トリガー: 空白、`.`、`(`
  - Jedi による標準ライブラリ解析
  - KFP API 補完
- **自動保存** - ノード保存時に状態反映
- **複数パラメータ** - 各ノードで独立した args/kwargs

### 3. パラメータ管理

- **動的パラメータ追加**
  - 各ノード内で `+ Add Argument` でパラメータ追加
  - 型選択: str, int, float, bool, list, dict

- **パイプラインパラメータ** (入力層)
  - 全ノードで共有可能な入力パラメータ
  - デフォルト値設定可能

### 4. コード生成

- **KFP DSL 2.0 形式** で Python コード生成
- **自動マッピング**
  - ノードの引数  パイプラインパラメータへの接続
  - エッジの依存関係  タスク依存性に変換
- **クリップボード** - 「Copy to Clipboard」で外部エディタへ

## トラブルシューティング

### Docker エラー: ポート 3000/8000 が既に使用中

```bash
# 既存コンテナを停止
docker-compose down

# ポート確認
netstat -ano | findstr :3000

# コンテナ削除
docker rm <container-id>
```

### LSP サーバーが応答しない

```bash
# ヘルスチェック
curl http://localhost:8000/health

# ログで詳細確認
docker-compose logs language-server

# サーバー再起動
docker-compose restart language-server
```

### 補完が出ない

1. **ブラウザコンソール確認** (F12  Console)
2. **LSP サーバーログ** (`docker-compose logs language-server`)
3. **コード形式** - Python 構文が正しいか確認
4. **遅延** - LSP 初期化に 5-10 秒かかることあり

### ノードの編集が保存されない

- **自動保存は未実装** - 「Save」ボタンをクリック必須
- 状態確認: サイドバーの「Node Arguments」に反映されているか

## パフォーマンス

| メトリクス | 値 |
|---|---|
| フロント ビルドサイズ | ~204KB (minified) |
| Nginx レスポンス | <1ms |
| LSP 補完レスポンス | 10-50ms (Jedi 解析) |
| LSP サーバー メモリ | ~200MB (Python + Jedi) |
| Docker イメージサイズ | frontend: 52MB, backend: 350MB |

## バージョン情報

- **Node.js**: 20-alpine
- **React**: 19.2.0
- **Python**: 3.11-slim
- **Flask**: 3.0.0
- **Jedi**: 0.18.1 (KFP 補完互換性のため <0.19.0)
- **python-lsp-server**: 1.7.4
- **KFP**: 2.0.0
- **numpy**: 1.24.3
- **pandas**: 2.0.3

## ライセンス

MIT

## 参考リンク

- [Kubeflow Pipelines 公式](https://www.kubeflow.org/docs/components/pipelines/)
- [ReactFlow ドキュメント](https://reactflow.dev/)
- [Jedi - Python Autocompletion](https://jedi.readthedocs.io/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Flask](https://flask.palletsprojects.com/)
- [Nginx](https://nginx.org/)
