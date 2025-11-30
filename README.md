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

**Docker & Docker Compose** が必須です。以下のバージョン以上推奨：

| 環境 | インストール方法 | バージョン |
|---|---|---|
| **Windows / macOS** | [Docker Desktop](https://www.docker.com/products/docker-desktop) | 20.10+ |
| **Linux** | [Docker Engine](https://docs.docker.com/engine/install/) | 20.10+ |

ポート確認（既に使用されていないことを確認）：
- `3000` - フロントエンド
- `8000` - LSP サーバー

### 起動

```bash
# リポジトリをクローン
git clone https://github.com/hiro134103/kubeflow-pipeline-builder.git
cd kubeflow-pipeline-builder

# Docker コンテナをビルド & 起動
docker-compose up --build
```

**すべてのプラットフォームで同一のコマンドで動作します。** ✅

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
   - `usePipelineFlow` hook - パイプライン状態管理
   - `useNodeArguments` hook - ノード引数管理
   - 8 個の小コンポーネント - 各コンポーネントが単一の役割を担当

2. **Monaco Editor** - Python コード編集
   - シンタックスハイライト
   - `lspClient.js` を経由して LSP サーバーに補完リクエスト

3. **Nginx** - 本番環境でのサーバー
   - CSS / JavaScript などのファイルをブラウザに長期保存させる（アクセス高速化）
   - `/api/*` をバックエンドにプロキシ
   - SPA ルーティング対応（存在しないパスへのリクエストは `index.html` を返す）

### バックエンド

**Tech Stack**: Python 3.11-slim, Flask 3.0.0, Jedi 0.18.1, KFP 2.0.0, scikit-learn 1.3.2

**lsp_wrapper.py** - Flask HTTP LSP サーバー

補完ロジック:
1. **段階 1: Jedi による解析** (標準ライブラリ + インストール済みパッケージ)
   ```python
   script = Script(code, path='untitled.py')
   completions = script.complete(line=line+1, column=character)
   ```
   対応: numpy, pandas, pathlib, scikit-learn, os, sys, etc.

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

**補完対象ライブラリを増やす方法**:

Jedi が自動的に解析するライブラリを増やすには、`backend/requirements.txt` に追加してください。

```bash
# 例: TensorFlow を追加
echo "tensorflow==2.13.0" >> backend/requirements.txt

# または PyTorch
echo "torch==2.0.0" >> backend/requirements.txt
```

Docker を再ビルドすると、インストールされたライブラリは自動的に Jedi による補完の対象になります：

```bash
docker-compose build language-server
docker-compose up
```

**現在対応しているライブラリ**:
- numpy, pandas, pathlib (Python 標準)
- scikit-learn
- KFP 2.0 (フォールバック)

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

## 使用イメージ

### DAG エディタ & パイプライン構築

パイプラインを視覚的に構築できます。以下のスクリーンショットは実際の UI です：

![Pipeline Builder UI](https://github.com/hiro134103/kubeflow-pipeline-builder/raw/main/.github/images/pipeline-builder.png)

**主な機能**：
- **左パネル**: パイプラインパラメータ（init_path, image_pattern など）とコンポーネント/ノード一覧
- **中央**: ReactFlow による DAG キャンバス
  - ノードをドラッグ&ドロップで配置
  - ノード間をドラッグして接続
  - クリックでノードを選択・編集
- **右パネル**: 選択ノードの詳細編集
  - 関数名、引数、出力型、説明を設定
  - Monaco Editor による Python コード編集（LSP 補完対応）

### コード生成結果

ビジュアルエディタで構築したパイプラインから、KFP 2.0 互換の Python コードが自動生成されます：

![Generated Pipeline Code](https://github.com/hiro134103/kubeflow-pipeline-builder/raw/main/.github/images/generated-code.png)

**生成される内容例**：
```python
# Pipeline: MyPipeline
# Generated by Pipeline Builder
# Params: [("id":"1","key":"init_path",...), ("id":"2","key":"image_pattern",...), ...]

from kfp.dsl import pipeline, component

@component()
def evaluation(inference_image_path: str) -> Any:
    """Evaluates the inference results."""
    print(f"Evaluating results from: {inference_image_path}")
    # Logic for calculating metrics

@component()
def inference_image(pattern: str) -> str:
    """Performs inference using the trained model on specified images."""
    print(f"Performing inference on matching '{pattern}' using model: {model_uri}")
    with open(inference_result_path, 'w') as f:
        f.write("Inference Results URI")
    return "Inference Results URI"

@component()
def visualize(inference_result_path: str) -> Dataset:
    """Visualizes the inference results."""
    print(f"Visualizing inference from: {inference_result_path}")
    # Logic for generating plots/dashboards

@component()
def model_training(model_path: str) -> Model:
    """Trains a model and saves it to a specified path."""
    print(f"Training model using data from: {data_path}")
    # In a real component, the model would be saved to model_path
    with open(model_path, 'w') as f:
        f.write("Model v1 URI")
    return "Model v1 URI"

@pipeline(name='MyPipeline')
def MyPipeline(init_path: str = 's3://directory', image_pattern: str = '*.png', warning_up_rate: float = 8.0):
    step0 = evaluation(step1.output)
    step1 = inference_image(image_pattern)
    step2 = visualize(step1.output)
    step3 = model_training(init_path)
    step1.after(step3)
```

**ダウンロード機能**: 「DOWNLOAD PYTHON」ボタンでコードを .py ファイルとして保存可能

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
- **Flask-CORS**: 4.0.0
- **Jedi**: 0.18.1 (KFP 補完互換性のため <0.19.0)
- **KFP**: 2.0.0
- **scikit-learn**: 1.3.2
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
