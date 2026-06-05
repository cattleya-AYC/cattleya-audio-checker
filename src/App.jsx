import React, { useState } from 'react';
import { Upload, Play, Zap, CheckCircle, AlertCircle, Copy, Link2 } from 'lucide-react';

export default function AudioTextChecker() {
  const [apiKey, setApiKey] = useState(() => {
    // アプリ起動時に localStorage から復元
    try {
      const saved = localStorage.getItem('openai_api_key');
      return saved || '';
    } catch {
      return '';
    }
  });
  const [googleDriveLink, setGoogleDriveLink] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [audioFileName, setAudioFileName] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [matchPercentage, setMatchPercentage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [wordDifferences, setWordDifferences] = useState([]);
  const [wordTimestamps, setWordTimestamps] = useState([]);
  const [markedTextSegments, setMarkedTextSegments] = useState([]);
  const [showTimeSegments, setShowTimeSegments] = useState(false);

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

  const extractFileId = (url) => {
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/,
      /[?&]id=([a-zA-Z0-9-_]+)/,
      /\/d\/([a-zA-Z0-9-_]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleLoadFromDrive = async () => {
    if (!googleDriveLink.trim()) {
      setError('Google Driveのリンクを入力してください');
      return;
    }

    const fileId = extractFileId(googleDriveLink);
    if (!fileId) {
      setError('リンクが無効です。Google Driveの共有リンクを正しくコピーしてください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const downloadUrls = [
        `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
        `https://drive.google.com/uc?export=download&id=${fileId}`,
        `https://www.googledrive.com/host/${fileId}`,
      ];

      let blob = null;
      let fileName = 'audio_file.mp3';

      for (const downloadUrl of downloadUrls) {
        try {
          const response = await fetch(downloadUrl);

          if (response.ok) {
            blob = await response.blob();

            const contentDisposition = response.headers.get('content-disposition');
            if (contentDisposition) {
              const fileNameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?(.+?)(?:;|$)/);
              if (fileNameMatch) {
                fileName = decodeURIComponent(fileNameMatch[1]);
              }
            }

            console.log('✅ ダウンロード成功:', downloadUrl);
            break;
          }
        } catch (err) {
          console.log('❌ 方法失敗:', downloadUrl, err.message);
          continue;
        }
      }

      if (!blob) {
        setError('⚠️ ファイルの取得に失敗しました\n\n以下を確認してください：\n\n1️⃣ Google Drive でファイルを右クリック\n2️⃣ 「共有」をクリック\n3️⃣ アクセス権限が「リンクを知っている全員」に設定されているか確認\n\nそれでもダメな場合は、ファイルを本体にダウンロードしてからアップロードしてください');
        return;
      }

      setAudioFile(blob);
      setAudioFileName(fileName);
      setGoogleDriveLink('');
    } catch (err) {
      setError('予期しないエラーが発生しました。別のリンク形式を試すか、ファイルを本体にダウンロードしてください');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      setAudioFileName(file.name);
      setError('');
    }
  };

  const handleTextUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setReferenceText(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[、。，。？！]/g, '')
      .trim();
  };

  const calculateSimilarity = (text1, text2) => {
    const norm1 = normalizeText(text1);
    const norm2 = normalizeText(text2);

    if (norm1 === norm2) return 100;

    const longer = norm1.length > norm2.length ? norm1 : norm2;
    const shorter = norm1.length > norm2.length ? norm2 : norm1;

    if (longer.length === 0) return 100;

    const editDistance = levenshteinDistance(longer, shorter);
    return Math.round((1 - editDistance / longer.length) * 100);
  };

  const levenshteinDistance = (a, b) => {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  };

  // 単語レベルの差分を抽出（Levenshtein距離で部分一致も検出）
  const extractWordDifferences = (refText, recText, timestamps) => {
    const refWords = normalizeText(refText).split(' ').filter(w => w);
    const recWords = normalizeText(recText).split(' ').filter(w => w);

    const differences = [];
    let recIdx = 0;

    for (let refIdx = 0; refIdx < refWords.length; refIdx++) {
      let found = false;

      // 完全一致を探す（前後3語の範囲内で）
      for (let i = recIdx; i < Math.min(recIdx + 3, recWords.length); i++) {
        if (refWords[refIdx] === recWords[i]) {
          recIdx = i + 1;
          found = true;
          break;
        }
      }

      if (!found) {
        // 完全一致がない場合、部分一致を確認
        let bestMatch = -1;
        let bestDistance = Infinity;

        for (let i = recIdx; i < Math.min(recIdx + 3, recWords.length); i++) {
          const distance = levenshteinDistance(refWords[refIdx], recWords[i]);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = i;
          }
        }

        // 距離が1-2なら部分一致（誤認識）
        if (bestMatch >= 0 && bestDistance <= 2 && bestDistance > 0) {
          differences.push({
            type: 'mismatch',
            word: refWords[refIdx],
            recognized: recWords[bestMatch],
            timestamp: timestamps[bestMatch],
            description: `誤認識: 『${refWords[refIdx]}』→『${recWords[bestMatch]}』${timestamps[bestMatch] ? ` (${formatTime(timestamps[bestMatch].start)} - ${formatTime(timestamps[bestMatch].end)})` : ''}`
          });
          recIdx = bestMatch + 1;
        } else {
          // 距離が大きい、または見つからない → 未認識
          differences.push({
            type: 'missing',
            word: refWords[refIdx],
            timestamp: null,
            description: `未認識: 『${refWords[refIdx]}』`
          });
        }
      }
    }

    // 認識されたが照合テキストにない単語
    while (recIdx < recWords.length) {
      const timestamp = timestamps[recIdx];
      differences.push({
        type: 'extra',
        word: recWords[recIdx],
        timestamp: timestamp,
        description: `過剰認識: 『${recWords[recIdx]}』${timestamp ? ` (${formatTime(timestamp.start)} - ${formatTime(timestamp.end)})` : ''}`
      });
      recIdx++;
    }

    return differences;
  };

  // 文字単位で差分を検出してマーク
  const calculateCharDifferences = (refText, recText) => {
    const refChars = refText.split('');
    const recChars = recText.split('');

    // 簡単な文字ごとの比較（LCS の代わりにシンプルな実装）
    let refIdx = 0;
    let recIdx = 0;
    const diffs = [];

    // 認識テキストの各文字に対して、元テキストでの対応位置を探す
    for (let i = 0; i < recChars.length; i++) {
      let found = false;

      // 前後10文字の範囲で同じ文字を探す
      for (let j = Math.max(0, refIdx - 5); j < Math.min(refChars.length, refIdx + 15); j++) {
        if (recChars[i] === refChars[j]) {
          refIdx = j + 1;
          found = true;
          break;
        }
      }

      if (!found) {
        // 該当する文字が見つからない = 誤認識
        diffs.push({ idx: i, char: recChars[i], type: 'extra' });
      }
    }

    return diffs;
  };

  // マーク付きテキストを生成
  const markDifferencesInText = (text, diffs) => {
    const chars = text.split('');
    const markedChars = chars.map((char, idx) => {
      const isDiff = diffs.some(d => d.idx === idx);
      if (isDiff) {
        return `<span style="color:red;font-weight:bold;">${char}</span>`;
      }
      return char;
    });

    return markedChars.join('');
  };

  // テキストを時間で 60 分割
  const divideTextByTime = (text, totalDurationSeconds, timestamps) => {
    const segments = [];
    const segmentDuration = totalDurationSeconds / 60; // 60 分割

    let currentPos = 0;
    let totalChars = text.length;
    const charsPerSegment = Math.ceil(totalChars / 60);

    for (let i = 0; i < 60; i++) {
      const startTime = i * segmentDuration;
      const endTime = (i + 1) * segmentDuration;
      const segmentStartIdx = i * charsPerSegment;
      const segmentEndIdx = Math.min((i + 1) * charsPerSegment, totalChars);

      const segmentText = text.substring(segmentStartIdx, segmentEndIdx);

      if (segmentText.trim()) {
        segments.push({
          segmentNum: i + 1,
          startTime,
          endTime,
          text: segmentText
        });
      }
    }

    return segments;
  };

  const highlightDifferences = () => {
    const norm1 = normalizeText(referenceText);
    const norm2 = normalizeText(transcribedText);

    const chars1 = norm1.split('');
    const chars2 = norm2.split('');

    let result1 = [];
    let result2 = [];
    let i = 0,
      j = 0;

    while (i < chars1.length || j < chars2.length) {
      if (i < chars1.length && j < chars2.length && chars1[i] === chars2[j]) {
        result1.push({ char: chars1[i], match: true });
        result2.push({ char: chars2[j], match: true });
        i++;
        j++;
      } else if (j >= chars2.length || (i < chars1.length && chars1[i] !== chars2[j])) {
        result1.push({ char: chars1[i], match: false });
        i++;
      } else {
        result2.push({ char: chars2[j], match: false });
        j++;
      }
    }

    return { result1, result2 };
  };

  const handleTranscribe = async () => {
    if (!apiKey.trim()) {
      setError('OpenAI APIキーを入力してください');
      return;
    }

    if (!audioFile) {
      setError('音声ファイルを選択してください');
      return;
    }

    if (!referenceText.trim()) {
      setError('照合する文字データを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');
    setTranscribedText('');
    setWordDifferences([]);
    setWordTimestamps([]);

    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('model', 'whisper-1');
      formData.append('language', 'ja');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities', 'word');

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
      const transcribed = data.text;
      setTranscribedText(transcribed);

      // 単語ごとのタイムスタンプを抽出
      const words = data.words || [];
      setWordTimestamps(words);

      // 単語レベルの差分を計算
      const diffs = extractWordDifferences(referenceText, transcribed, words);
      setWordDifferences(diffs);

      // 🆕 文字単位の差分を検出
      const charDiffs = calculateCharDifferences(referenceText, transcribed);
      
      // 🆕 認識テキストにマークを付ける
      const markedText = markDifferencesInText(transcribed, charDiffs);
      
      // 🆕 マーク付きテキストを時間で 60 分割
      const duration = data.duration || 60; // デフォルト 60 秒
      const segments = divideTextByTime(markedText, duration, words);
      setMarkedTextSegments(segments);
      setShowTimeSegments(true);

      const similarity = calculateSimilarity(referenceText, transcribed);
      setMatchPercentage(similarity);
      setShowDiff(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const { result1, result2 } = showDiff
    ? highlightDifferences()
    : { result1: [], result2: [] };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
              音声テキスト照合
            </h1>
          </div>
          <p className="text-slate-600">
            Google Driveの音声ファイルを自動で文字起こしして、文字データと照合します
          </p>
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <label className="block text-sm font-semibold text-slate-700 mb-4">
              📁 音声ファイル
            </label>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">
                  ローカルファイル
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
                    className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition"
                  >
                    <span className="text-2xl mb-1">📤</span>
                    <span className="text-sm font-medium text-slate-600">
                      ファイルを選択
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {audioFile && (
              <p className="mt-4 text-sm text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {audioFileName}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <label className="block text-sm font-semibold text-slate-700 mb-4">
              📝 照合テキスト
            </label>
            <textarea
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              placeholder="照合する文字データをペーストするか、ファイルアップロード"
              className="w-full h-32 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-sm resize-none"
            />
            <div className="mt-3 flex gap-2">
              <label className="flex-1">
                <input
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleTextUpload}
                  className="hidden"
                />
                <span className="block text-xs text-slate-500 cursor-pointer hover:text-emerald-600 transition">
                  📎 ファイルアップロード
                </span>
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleTranscribe}
          disabled={isLoading || !audioFile || !referenceText.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2 mb-6"
        >
          <Play className="w-5 h-5" />
          {isLoading ? '処理中...' : '音声を認識して照合'}
        </button>

        {matchPercentage !== null && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl shadow-sm border border-emerald-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-slate-700">
                  照合スコア
                </span>
                <span
                  className={`text-4xl font-bold ${
                    matchPercentage >= 90
                      ? 'text-emerald-600'
                      : matchPercentage >= 70
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}
                >
                  {matchPercentage}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    matchPercentage >= 90
                      ? 'bg-emerald-600'
                      : matchPercentage >= 70
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${matchPercentage}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-3">
                {matchPercentage >= 90
                  ? '✅ ほぼ完全に一致しています'
                  : matchPercentage >= 70
                  ? '⚠️ 部分的な相違があります'
                  : '❌ 大きな相違があります'}
              </p>
            </div>

            {/* 🆕 差分 + タイムスタンプ一覧 */}
            {/* 🆕 タイム別テキスト（マーク付き） */}
            {showTimeSegments && markedTextSegments.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">
                  🕐 タイム別テキスト（違い箇所は赤でマーク）
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {markedTextSegments.map((segment, idx) => (
                    <div
                      key={idx}
                      className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded border border-slate-200"
                    >
                      <div className="text-xs font-semibold text-slate-600 mb-2">
                        ⏱️ {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      </div>
                      <div className="text-sm text-slate-700 leading-relaxed">
                        <div
                          dangerouslySetInnerHTML={{ __html: segment.text }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  📌 テキスト全体を 60 分割。赤い文字 = 元のテキストに存在しない（誤認識または追加）
                </p>
              </div>
            )}

            {wordDifferences.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">
                  ⏱️ 修正が必要な部分（タイムスタンプ付き）
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {wordDifferences.map((diff, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded border text-sm ${
                        diff.type === 'missing'
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-blue-50 border-blue-200 text-blue-800'
                      }`}
                    >
                      <div className="font-semibold">{diff.description}</div>
                      {diff.timestamp && (
                        <div className="text-xs mt-1 opacity-75">
                          {formatTime(diff.timestamp.start)} - {formatTime(diff.timestamp.end)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  🔴 赤: 未認識（音声では認識されなかった）
                  <br />
                  🔵 青: 誤認識（正しくない単語が認識された）
                </p>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700">
                  🎤 自動認識テキスト
                </h3>
                <button
                  onClick={() => copyToClipboard(transcribedText)}
                  className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  コピー
                </button>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded border border-slate-200">
                {transcribedText}
              </p>
            </div>

            {showDiff && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">
                  📊 差分ハイライト（文字レベル）
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2">
                      照合テキスト
                    </p>
                    <div className="bg-slate-50 p-4 rounded border border-slate-200 text-sm leading-relaxed overflow-y-auto max-h-48">
                      {result1.map((item, idx) => (
                        <span
                          key={idx}
                          className={
                            item.match
                              ? 'text-slate-700'
                              : 'bg-red-200 text-red-900 font-semibold'
                          }
                        >
                          {item.char}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2">
                      自動認識テキスト
                    </p>
                    <div className="bg-slate-50 p-4 rounded border border-slate-200 text-sm leading-relaxed overflow-y-auto max-h-48">
                      {result2.map((item, idx) => (
                        <span
                          key={idx}
                          className={
                            item.match
                              ? 'text-slate-700'
                              : 'bg-blue-200 text-blue-900 font-semibold'
                          }
                        >
                          {item.char}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  🔴 赤はテキストに存在するが認識されなかった部分
                  <br />
                  🔵 青は認識されたが照合テキストにない部分
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-12 text-center text-xs text-slate-500">
          <p>設定不要版 • Privacy-first approach • ⏱️ タイムスタンプ付き差分表示</p>
        </div>
      </div>
    </div>
  );
}
