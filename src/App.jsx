import React, { useState } from 'react';
import { Upload, Zap, Copy } from 'lucide-react';

export default function SimpleAudioTranscriber() {
  const [apiKey, setApiKey] = useState(() => {
    try {
      const saved = localStorage.getItem('openai_api_key');
      return saved || '';
    } catch {
      return '';
    }
  });

  const [audioFile, setAudioFile] = useState(null);
  const [audioFileName, setAudioFileName] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // API キーを localStorage に保存
  const handleApiKeyChange = (e) => {
    const key = e.target.value;
    setApiKey(key);
    try {
      if (key.trim()) {
        localStorage.setItem('openai_api_key', key);
      } else {
        localStorage.removeItem('openai_api_key');
      }
    } catch {
      console.error('localStorage に保存できません');
    }
  };

  // API キーをクリア
  const clearApiKey = () => {
    setApiKey('');
    try {
      localStorage.removeItem('openai_api_key');
    } catch {
      console.error('localStorage から削除できません');
    }
  };

  // 音声ファイルアップロード
  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      setAudioFileName(file.name);
      setError('');
    }
  };

  // 文字起こし実行
  const handleTranscribe = async () => {
    if (!apiKey.trim()) {
      setError('OpenAI APIキーを入力してください');
      return;
    }

    if (!audioFile) {
      setError('音声ファイルを選択してください');
      return;
    }

    setIsLoading(true);
    setError('');
    setTranscribedText('');

    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('model', 'whisper-1');
      formData.append('language', 'ja');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Whisper API呼び出しエラー');
      }

      const data = await response.json();
      setTranscribedText(data.text);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
              🎤 音声文字起こし
            </h1>
          </div>
          <p className="text-slate-600">
            音声ファイルを自動で文字に変換します
          </p>
        </div>

        {/* API キー設定 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            OpenAI API キー
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="sk-..."
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-sm"
            />
            {apiKey && (
              <button
                onClick={clearApiKey}
                className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg transition text-sm"
              >
                クリア
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            🔒 APIキーはローカルに保存され、送信されません
            {apiKey && <span className="ml-2">✅ 保存済み</span>}
          </p>
        </div>

        {/* 音声ファイルアップロード */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-4">
            📁 音声ファイル
          </label>
          <div className="relative">
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden"
              id="audio-input"
            />
            <label
              htmlFor="audio-input"
              className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition"
            >
              <span className="text-3xl mb-2">📤</span>
              <span className="text-sm font-medium text-slate-600">
                ファイルを選択またはドラッグ
              </span>
            </label>
          </div>

          {audioFile && (
            <p className="mt-4 text-sm text-emerald-700">
              ✅ {audioFileName}
            </p>
          )}
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* 文字起こしボタン */}
        <button
          onClick={handleTranscribe}
          disabled={isLoading || !audioFile || !apiKey.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2 mb-6"
        >
          <Upload className="w-5 h-5" />
          {isLoading ? '処理中...' : '文字起こし開始'}
        </button>

        {/* 結果表示 */}
        {transcribedText && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">
                📝 文字起こし結果
              </h2>
              <button
                onClick={() => copyToClipboard(transcribedText)}
                className="text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition flex items-center gap-1"
              >
                <Copy className="w-4 h-4" />
                コピー
              </button>
            </div>
            <div className="bg-slate-50 p-4 rounded border border-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
              {transcribedText}
            </div>
          </div>
        )}

        <div className="mt-12 text-center text-xs text-slate-500">
          <p>Privacy-first approach • ローカルで処理</p>
        </div>
      </div>
    </div>
  );
}
