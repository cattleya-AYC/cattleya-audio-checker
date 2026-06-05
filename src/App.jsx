import React, { useState } from 'react';
import { Compare2, CheckCircle, AlertCircle, Copy } from 'lucide-react';

export default function TextComparisonChecker() {
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [matchPercentage, setMatchPercentage] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [markedText1, setMarkedText1] = useState([]);
  const [markedText2, setMarkedText2] = useState([]);

  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[、。，。？！]/g, '')
      .trim();
  };

  const calculateSimilarity = (t1, t2) => {
    const norm1 = normalizeText(t1);
    const norm2 = normalizeText(t2);

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

  const highlightDifferences = () => {
    const norm1 = normalizeText(text1);
    const norm2 = normalizeText(text2);

    const chars1 = norm1.split('');
    const chars2 = norm2.split('');

    let result1 = [];
    let result2 = [];
    let i = 0, j = 0;

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

  const handleCompare = () => {
    if (!text1.trim() || !text2.trim()) {
      return;
    }

    const similarity = calculateSimilarity(text1, text2);
    setMatchPercentage(similarity);

    const { result1, result2 } = highlightDifferences();
    setMarkedText1(result1);
    setMarkedText2(result2);
    setShowDiff(true);
  };

  const handleTextFileUpload = (fileIndex, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (fileIndex === 1) {
          setText1(e.target.result);
        } else {
          setText2(e.target.result);
        }
      };
      reader.readAsText(file);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Compare2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
              テキスト比較ツール
            </h1>
          </div>
          <p className="text-slate-600">
            2つのテキストを比較して、違いをハイライト表示します
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* テキスト1 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <label className="block text-sm font-semibold text-slate-700 mb-4">
              📝 テキスト 1（元のテキスト）
            </label>
            <textarea
              value={text1}
              onChange={(e) => setText1(e.target.value)}
              placeholder="照合するテキストを入力またはペースト"
              className="w-full h-48 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm resize-none"
            />
            <div className="mt-3">
              <label className="text-xs text-slate-500 cursor-pointer hover:text-blue-600 transition">
                <input
                  type="file"
                  accept=".txt"
                  onChange={(e) => handleTextFileUpload(1, e)}
                  className="hidden"
                />
                📎 ファイルアップロード
              </label>
            </div>
            {text1 && (
              <p className="mt-2 text-xs text-slate-500">
                文字数: {text1.length}
              </p>
            )}
          </div>

          {/* テキスト2 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <label className="block text-sm font-semibold text-slate-700 mb-4">
              📝 テキスト 2（比較対象）
            </label>
            <textarea
              value={text2}
              onChange={(e) => setText2(e.target.value)}
              placeholder="比較するテキストを入力またはペースト"
              className="w-full h-48 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm resize-none"
            />
            <div className="mt-3">
              <label className="text-xs text-slate-500 cursor-pointer hover:text-blue-600 transition">
                <input
                  type="file"
                  accept=".txt"
                  onChange={(e) => handleTextFileUpload(2, e)}
                  className="hidden"
                />
                📎 ファイルアップロード
              </label>
            </div>
            {text2 && (
              <p className="mt-2 text-xs text-slate-500">
                文字数: {text2.length}
              </p>
            )}
          </div>
        </div>

        {/* 比較ボタン */}
        <button
          onClick={handleCompare}
          disabled={!text1.trim() || !text2.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2 mb-6"
        >
          <Compare2 className="w-5 h-5" />
          比較
        </button>

        {/* 結果 */}
        {matchPercentage !== null && (
          <div className="space-y-6">
            {/* スコア */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl shadow-sm border border-blue-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-slate-700">
                  一致度
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

            {/* 差分ハイライト */}
            {showDiff && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">
                  📊 差分ハイライト
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2">
                      テキスト 1
                    </p>
                    <div className="bg-slate-50 p-4 rounded border border-slate-200 text-sm leading-relaxed overflow-y-auto max-h-64">
                      {markedText1.map((item, idx) => (
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
                      テキスト 2
                    </p>
                    <div className="bg-slate-50 p-4 rounded border border-slate-200 text-sm leading-relaxed overflow-y-auto max-h-64">
                      {markedText2.map((item, idx) => (
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
                  🔴 赤 = テキスト 1 にあるが、テキスト 2 にない部分
                  <br />
                  🔵 青 = テキスト 2 にあるが、テキスト 1 にない部分
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-12 text-center text-xs text-slate-500">
          <p>Privacy-first approach • ローカルで処理</p>
        </div>
      </div>
    </div>
  );
}
