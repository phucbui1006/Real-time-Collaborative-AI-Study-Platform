import { useState, useEffect } from "react";
import { X, Key, Check, AlertCircle, ExternalLink, Trash2, Sparkles, Eye, EyeOff } from "lucide-react";
import {
  getGeminiApiKey,
  setGeminiApiKey,
  removeGeminiApiKey,
  testGeminiApiKey,
  hasGeminiApiKey,
} from "../../services/geminiClient";

type AIKeyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: () => void;
};

export function AIKeyModal({ isOpen, onClose, onKeyUpdated }: AIKeyModalProps) {
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeyInput(getGeminiApiKey());
      setTestResult(null);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!keyInput.trim()) {
      setTestResult({ success: false, message: "Vui lòng nhập API Key để kiểm tra." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiApiKey(keyInput.trim());
      setTestResult(res);
    } catch {
      setTestResult({ success: false, message: "Lỗi kết nối kiểm tra." });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setGeminiApiKey(keyInput.trim());
    setSavedSuccess(true);
    onKeyUpdated?.();
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleRemove = () => {
    removeGeminiApiKey();
    setKeyInput("");
    setTestResult(null);
    onKeyUpdated?.();
  };

  const isConfigured = hasGeminiApiKey();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-sm text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-sm bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Cài đặt Trí tuệ Nhân tạo (Gemini AI)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kết nối Google Gemini 2.0 Flash để trả lời RAG tài liệu &amp; sinh đề thi tự động.
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-4 p-3 rounded-[4px] border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-slate-300 font-medium">Trạng thái AI hiện tại:</span>
          {isConfigured ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-sharp border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Đã kích hoạt Gemini AI
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-sharp border border-amber-200 dark:border-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Chế độ mô phỏng dự phòng
            </span>
          )}
        </div>

        {/* Key Input Field */}
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Google Gemini API Key</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-normal text-[11px]"
              >
                <span>Lấy key miễn phí tại đây</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </span>
            <div className="relative mt-1.5">
              <input
                type={showKey ? "text" : "password"}
                placeholder="AIzaSy..."
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setTestResult(null);
                  setSavedSuccess(false);
                }}
                className="w-full rounded-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 pr-20 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                title={showKey ? "Ẩn key" : "Xem key"}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {/* Test & Result Alerts */}
          {testResult && (
            <div
              className={`p-3 rounded-[4px] border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              )}
              <div className="leading-relaxed">{testResult.message}</div>
            </div>
          )}

          {savedSuccess && (
            <div className="p-2.5 rounded-[4px] border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Đã lưu API Key! Đang áp dụng...</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={testing || !keyInput.trim()}
              className="px-3.5 py-2 rounded-sm text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {testing ? "Đang thử nghiệm..." : "Kiểm tra kết nối"}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex-1 px-4 py-2 rounded-pill text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Lưu API Key</span>
            </button>

            {isConfigured && (
              <button
                type="button"
                onClick={handleRemove}
                className="p-2 rounded-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                title="Xóa Key đã lưu"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 3 Step Tutorial */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Hướng dẫn 3 bước lấy API Key Miễn phí (1 phút):
          </p>
          <ol className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 list-decimal list-inside">
            <li>
              Vào{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 dark:text-indigo-400 underline font-medium"
              >
                aistudio.google.com
              </a>{" "}
              và đăng nhập bằng tài khoản Google bất kỳ.
            </li>
            <li>Bấm nút <strong>Create API Key</strong> và chọn dự án Google Cloud có sẵn hoặc tạo mới.</li>
            <li>Sao chép chuỗi mã bắt đầu bằng <code>AIzaSy...</code> và dán vào ô trên.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
