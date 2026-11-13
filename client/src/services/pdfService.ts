// client/src/services/pdfService.ts — Bóc tách nội dung PDF/DOCX/PPTX thực tế phía trình duyệt (Client-side)
import type JSZip from "jszip";
import { authFetch } from "./api";

const MAX_UPLOAD_FILE_BYTES = 20 * 1024 * 1024; // Đồng bộ giới hạn 20MB với LibraryPage
const MAX_DOCUMENT_PAGES = 200; // Tối đa 200 trang/slide
const MAX_ZIP_ENTRIES = 2000;
const MAX_ZIP_UNCOMPRESSED_BYTES = 60 * 1024 * 1024; // 60MB chống Zip Bomb

function validateZipSafety(zip: JSZip) {
  let entryCount = 0;
  let totalUncompressedSize = 0;
  zip.forEach((relativePath, entry) => {
    entryCount += 1;
    if (relativePath.includes("..") || relativePath.startsWith("/")) {
      throw new Error("Tệp nén chứa đường dẫn không an toàn.");
    }
    const rawSize = Number((entry as any)?._data?.uncompressedSize || 0);
    if (Number.isFinite(rawSize) && rawSize > 0) {
      totalUncompressedSize += rawSize;
    }
    if (entryCount > MAX_ZIP_ENTRIES || totalUncompressedSize > MAX_ZIP_UNCOMPRESSED_BYTES) {
      throw new Error("Tài liệu giải nén vượt quá giới hạn an toàn cho phép.");
    }
  });
}

let pdfjsLibPromise: Promise<typeof import("pdfjs-dist")> | null = null;
async function getPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]).then(([pdfjsLib, workerModule]) => {
      if (typeof window !== "undefined") {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
        } catch (err) {
          console.warn("Không thể gán PDF worker nội bộ:", err);
        }
      }
      return pdfjsLib;
    });
  }
  return pdfjsLibPromise;
}


export interface ExtractedDoc {
  totalPages: number;
  pages: string[];
}

function blobToBase64Async(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const commaIdx = result.indexOf(",");
      resolve(commaIdx !== -1 ? result.substring(commaIdx + 1) : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * Render một trang PDF sang hình ảnh bất đồng bộ qua canvas.toBlob (không khóa Main Thread như toDataURL)
 * Tự động giảm scale xuống 0.85 trên màn hình di động để tiết kiệm 45% RAM
 */
export async function renderPdfPageToImage(
  page: any,
  scale?: number
): Promise<{ base64: string; mimeType: string } | null> {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  try {
    const effectiveScale = scale ?? (window.innerWidth < 768 ? 0.85 : 1.15);
    const viewport = page.getViewport({ scale: effectiveScale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return null;

    // Nền trắng tiêu chuẩn
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    let mimeType = "image/webp";
    let blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.72));
    if (!blob || blob.type !== "image/webp") {
      mimeType = "image/jpeg";
      blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.72));
    }

    // Thu dọn canvas ngay lập tức để giải phóng bộ nhớ GPU/RAM
    canvas.width = 0;
    canvas.height = 0;

    if (!blob) return null;
    const base64 = await blobToBase64Async(blob);
    if (!base64) return null;

    return {
      base64,
      mimeType,
    };
  } catch (err) {
    console.warn("Không thể chụp ảnh trang PDF bằng canvas:", err);
    return null;
  }
}

/**
 * Upload mảng ảnh trang lên Supabase Storage bucket 'slides' theo từng đợt nhỏ
 */
export async function uploadPageImagesInBatches(
  imagesWithPage: { pageNum: number; base64: string; mimeType: string }[]
): Promise<Map<number, string>> {
  const urlMap = new Map<number, string>();
  if (!imagesWithPage || imagesWithPage.length === 0) return urlMap;

  const BATCH_SIZE = 3; // 3 trang / đợt
  for (let i = 0; i < imagesWithPage.length; i += BATCH_SIZE) {
    const batch = imagesWithPage.slice(i, i + BATCH_SIZE);
    try {
      const response = await authFetch("/api/documents/upload-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: batch.map((item) => ({
            base64: item.base64,
            mimeType: item.mimeType,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.results)) {
          data.results.forEach((res: { index: number; success: boolean; url: string }) => {
            if (res.success && res.url && batch[res.index]) {
              urlMap.set(batch[res.index].pageNum, res.url);
            }
          });
        }
      }
    } catch (batchErr) {
      console.warn(`Lỗi upload lô ảnh trang từ ${i + 1}:`, batchErr);
    }
  }

  return urlMap;
}

/**
 * Trích xuất text và chụp ảnh toàn bộ các trang từ file PDF thực tế theo cơ chế cuốn chiếu (Streaming Batch)
 * Tuyệt đối không tích trữ toàn bộ 200 ảnh Base64 trong RAM và không ghi Base64 fallback vào CSDL
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (currentPage: number, totalPages: number) => void
): Promise<ExtractedDoc> {
  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    throw new Error("Kích thước file PDF vượt quá giới hạn tối đa 20MB.");
  }
  try {
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: true,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    if (totalPages > MAX_DOCUMENT_PAGES) {
      throw new Error(`Tài liệu vượt quá giới hạn ${MAX_DOCUMENT_PAGES} trang. Vui lòng tách nhỏ file.`);
    }
    const rawPagesText: { pageNum: number; text: string }[] = [];
    let pendingUploadBatch: { pageNum: number; base64: string; mimeType: string }[] = [];
    const urlMap = new Map<number, string>();

    const flushUploadBatch = async () => {
      if (pendingUploadBatch.length === 0) return;
      const batchToUpload = pendingUploadBatch;
      pendingUploadBatch = [];
      try {
        const batchUrls = await uploadPageImagesInBatches(batchToUpload);
        batchUrls.forEach((url, pNum) => urlMap.set(pNum, url));
      } catch (upErr) {
        console.warn("Không thể upload lô ảnh trang PDF lên Storage:", upErr);
      }
    };

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        onProgress?.(pageNum, totalPages);
        const page = await pdf.getPage(pageNum);

        // 1. Trích xuất text cho AI và tìm kiếm
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        rawPagesText.push({ pageNum, text: pageText });

        // 2. Chụp ảnh trang PDF bất đồng bộ qua toBlob và đẩy cuốn chiếu từng cụm 3 trang
        const imgObj = await renderPdfPageToImage(page);
        if (imgObj && imgObj.base64) {
          pendingUploadBatch.push({ pageNum, base64: imgObj.base64, mimeType: imgObj.mimeType });
          if (pendingUploadBatch.length >= 3) {
            await flushUploadBatch();
          }
        }

        // Giải phóng tài nguyên trang PDF ngay sau khi xử lý xong
        try {
          page.cleanup?.();
        } catch {}

        // Nhả microtask mỗi trang để giao diện trình duyệt luôn mượt mà 60fps
        await new Promise((r) => setTimeout(r, 0));
      } catch (pageErr) {
        console.warn(`Lỗi bóc tách trang ${pageNum}:`, pageErr);
        rawPagesText.push({ pageNum, text: "" });
      }
    }

    // 3. Upload nốt các trang còn lại trong lô cuối cùng
    await flushUploadBatch();

    // 4. Ghép nội dung hoàn chỉnh cho từng trang (chỉ nhúng URL từ Storage, tuyệt đối không nhồi Base64 vào JSONB)
    const pages: string[] = [];
    for (const item of rawPagesText) {
      const imgUrl = urlMap.get(item.pageNum);
      const text = item.text;

      if (imgUrl) {
        if (text) {
          pages.push(`![Slide ${item.pageNum}](${imgUrl})\n\n${text}`);
        } else {
          pages.push(`![Slide ${item.pageNum}](${imgUrl})\n\n*(Slide thuyết trình dạng hình ảnh)*`);
        }
      } else {
        pages.push(text || `Trang ${item.pageNum} (Tài liệu dạng hình ảnh hoặc không có văn bản chọn lọc)`);
      }
    }

    return { totalPages, pages };
  } catch (err: any) {
    console.error("Lỗi khi đọc file PDF bằng pdfjs-dist:", err);
    if ((err as any)?.name === "PasswordException") {
      throw new Error("File PDF này có mật khẩu bảo vệ. Vui lòng gỡ mật khẩu trước khi tải lên.");
    }
    throw new Error("Không thể bóc tách nội dung file PDF. File có thể bị khóa hoặc lỗi định dạng.");
  }
}

/**
 * Làm sạch mã đánh dấu HTML nội bộ của Word (bookmark <a id="_Toc..."></a>, anchor rỗng, v.v.)
 */
export function sanitizeExtractedText(text: string): string {
  if (!text) return "";
  return text
    // 0. Loại bỏ các thẻ HTML nguy hiểm, trình xử lý sự kiện và URI javascript:/vbscript:/data:text/html
    .replace(/<\s*(script|iframe|object|embed|form|style|svg|math)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|form|link|meta|base)\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\b(?:javascript|vbscript)\s*:/gi, "")
    .replace(/data\s*:\s*text\/html[^)\s"']*/gi, "")
    // 1. Xóa các bookmark anchor rỗng của Word dạng <a id="_Toc..."></a> hoặc <a name="_Toc..."></a>
    .replace(/<a\s+[^>]*?(?:id|name)=["'][^"']*["'][^>]*>\s*<\/a>/gi, "")
    // 2. Xóa các thẻ tự đóng <a ... />
    .replace(/<a\s+[^>]*?\/>/gi, "")
    // 3. Xóa các thẻ <a></a> rỗng hoàn toàn
    .replace(/<a\b[^>]*>\s*<\/a>/gi, "")
    // 4. Nếu thẻ <a> bao quanh tiêu đề hoặc liên kết nội bộ TOC, giữ nguyên nội dung văn bản bên trong
    .replace(/<a\s+(?:id|name)=["'][^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<a\s+href=["']#_Toc[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, "$1")
    // 5. Chuẩn hóa khoảng trắng thừa do xóa thẻ tạo ra
    .replace(/[ \t]{2,}/g, " ");
}

/**
 * Trích xuất và đẩy toàn bộ ảnh Base64 trong Markdown lên Supabase Storage bucket 'slides'
 * Thay thế chuỗi Base64 bằng Public URL nhẹ nhàng, giảm 99% kích thước văn bản và tăng tốc độ xử lý
 */
export async function uploadExtractedImagesFromMarkdown(markdownText: string): Promise<string> {
  if (!markdownText || !markdownText.includes("data:image/")) {
    return markdownText;
  }

  // Thu thập tất cả các data:image/ URI
  const imageMatches: { fullUri: string; base64: string; mimeType: string }[] = [];
  let searchIdx = 0;

  while (true) {
    const startIdx = markdownText.indexOf("data:image/", searchIdx);
    if (startIdx === -1) break;

    const commaIdx = markdownText.indexOf(",", startIdx);
    if (commaIdx === -1 || commaIdx - startIdx > 40) {
      searchIdx = startIdx + 11;
      continue;
    }

    const mimePart = markdownText.substring(startIdx + 11, commaIdx);
    const mimeType = mimePart.split(";")[0].toLowerCase();

    // Tìm điểm kết thúc của data URI: ')' hoặc '"' hoặc '\'' hoặc khoảng trắng / newline
    let endIdx = -1;
    for (let i = commaIdx + 1; i < markdownText.length; i++) {
      const char = markdownText[i];
      if (char === ")" || char === '"' || char === "'" || char === "]" || char === ">" || char === "\n" || char === "\r") {
        endIdx = i;
        break;
      }
    }
    if (endIdx === -1) endIdx = markdownText.length;

    const fullUri = markdownText.substring(startIdx, endIdx);
    const rawBase64 = markdownText.substring(commaIdx + 1, endIdx);
    const cleanBase64 = rawBase64.replace(/\\/g, "").replace(/\s+/g, "");

    imageMatches.push({ fullUri, base64: cleanBase64, mimeType });
    searchIdx = endIdx + 1;
  }

  if (imageMatches.length === 0) return markdownText;

  try {
    const response = await authFetch("/api/documents/upload-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images: imageMatches.map((img) => ({
          base64: img.base64,
          mimeType: img.mimeType,
        })),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.results)) {
        let updatedMarkdown = markdownText;
        data.results.forEach((res: { index: number; success: boolean; url: string }) => {
          if (res.success && res.url) {
            const target = imageMatches[res.index]?.fullUri;
            if (target) {
              updatedMarkdown = updatedMarkdown.split(target).join(res.url);
            }
          }
        });
        return updatedMarkdown;
      }
    }
  } catch (err) {
    console.warn("Không thể upload ảnh lên Storage qua API backend, áp dụng fallback tối ưu:", err);
  }

  // Fallback an toàn: nếu không có server backend, thay thế data:image Base64 quá lớn bằng placeholder
  // để bảo vệ CSDL PostgreSQL không bị quá tải
  let fallbackMarkdown = markdownText;
  imageMatches.forEach((img, idx) => {
    fallbackMarkdown = fallbackMarkdown.split(img.fullUri).join(`[Hình ảnh minh họa ${idx + 1}]`);
  });
  return fallbackMarkdown;
}

/**
 * Trích xuất nội dung văn bản thực tế từ file Word (.docx) và phân trang thông minh
 */
export async function extractTextFromDocx(file: File): Promise<ExtractedDoc> {
  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    throw new Error("Kích thước file DOCX vượt quá giới hạn tối đa 20MB.");
  }
  try {
    const [{ default: JSZipLib }, { default: mammoth }] = await Promise.all([
      import("jszip"),
      import("mammoth"),
    ]);
    const arrayBuffer = await file.arrayBuffer();

    // 1. Đọc metadata số trang thực tế mà Microsoft Word đã tính toán và lưu trong docProps/app.xml
    let zip: JSZip | null = null;
    let wordDeclaredPages = 0;
    try {
      zip = await JSZipLib.loadAsync(arrayBuffer);
      validateZipSafety(zip);
      const appXmlFile = zip.file("docProps/app.xml");
      if (appXmlFile) {
        const appXml = await appXmlFile.async("text");
        const match = appXml.match(/<Pages>(\d+)<\/Pages>/i);
        if (match) {
          wordDeclaredPages = parseInt(match[1], 10);
        }
      }
    } catch (zipErr) {
      console.warn("Không thể đọc zip docProps/app.xml từ DOCX:", zipErr);
    }

    // 2. Kiểm tra ngắt trang vật lý (<w:br w:type="page"/> và <w:lastRenderedPageBreak/>) trong word/document.xml
    const PAGE_BREAK_DELIMITER = "\n\n[[--PERMIND_PAGE_BREAK--]]\n\n";
    let bufferToParse: ArrayBuffer = arrayBuffer;
    let hasExplicitBreaks = false;

    if (zip) {
      const docXmlFile = zip.file("word/document.xml");
      if (docXmlFile) {
        try {
          let docXml = await docXmlFile.async("text");
          if (docXml.includes('w:type="page"') || docXml.includes("lastRenderedPageBreak")) {
            docXml = docXml
              .replace(/<w:lastRenderedPageBreak\s*\/?>/gi, `<w:r><w:t>${PAGE_BREAK_DELIMITER}<\/w:t><\/w:r>`)
              .replace(/<w:br[^>]*w:type=["']page["'][^>]*\/?>/gi, `<w:r><w:t>${PAGE_BREAK_DELIMITER}<\/w:t><\/w:r>`);
            zip.file("word/document.xml", docXml);
            bufferToParse = await zip.generateAsync({ type: "arraybuffer" });
            hasExplicitBreaks = true;
          }
        } catch (breakErr) {
          console.warn("Không thể chèn delimiter ngắt trang vào docXml:", breakErr);
        }
      }
    }

    // 3. Chuyển đổi DOCX sang Markdown nhằm giữ nguyên tiêu đề (#, ##), danh sách, bảng biểu
    let text = "";
    try {
      const mdResult = await (mammoth as any).convertToMarkdown({ arrayBuffer: bufferToParse });
      text = (mdResult?.value || "").trim();
    } catch {
      // Fallback
    }

    // Nếu Markdown rỗng, thử trích xuất Raw Text
    if (!text) {
      const rawResult = await (mammoth as any).extractRawText({ arrayBuffer: bufferToParse });
      text = (rawResult?.value || "").trim();
    }

    if (!text) {
      return {
        totalPages: 1,
        pages: ["Tài liệu Word (.docx) này không chứa văn bản hoặc chứa toàn bộ là hình ảnh."],
      };
    }

    // Tách và upload toàn bộ hình ảnh nhúng lên Supabase Storage bucket 'slides'
    text = await uploadExtractedImagesFromMarkdown(text);

    // Làm sạch các thẻ Word bookmark HTML trước khi phân trang
    text = sanitizeExtractedText(text);

    // 4. Phân trang thông minh và chuẩn xác:
    let pages: string[] = [];

    // Trường hợp 4.1: File Word có đánh dấu ngắt trang vật lý rõ ràng
    if (hasExplicitBreaks && text.includes("[[--PERMIND_PAGE_BREAK--]]")) {
      const rawSplit = text
        .split(/\[\[--PERMIND_PAGE_BREAK--\]\]/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      if (rawSplit.length > 0) {
        pages = rawSplit;
      }
    }

    // Trường hợp 4.2: File Word có khai báo số trang chuẩn trong metadata Word (docProps/app.xml)
    if (pages.length === 0 && wordDeclaredPages > 1) {
      const rawParagraphs = text.split(/\n\s*\n/);
      // Ước lượng độ dài ký tự cho mỗi trang dựa trên số trang thực tế của Word
      const targetLen = Math.max(1800, Math.round(text.length / wordDeclaredPages));
      let currentPage = "";

      for (const para of rawParagraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        // Chỉ ngắt khi gặp tiêu đề lớn cấp 1 (# hoặc Chương/Phần)
        const isMajorHeading = /^#\s+/m.test(trimmed) || /^(chương\s+\d+|phần\s+\d+)/i.test(trimmed);

        if (
          (currentPage.length + trimmed.length > targetLen && currentPage.length >= 1200) ||
          (isMajorHeading && currentPage.length >= Math.round(targetLen * 0.75))
        ) {
          pages.push(currentPage.trim());
          currentPage = trimmed;
        } else {
          currentPage = currentPage ? `${currentPage}\n\n${trimmed}` : trimmed;
        }
      }

      if (currentPage.trim()) {
        pages.push(currentPage.trim());
      }
    }

    // Trường hợp 4.3: Fallback phân trang theo tiêu chuẩn A4 Word chuẩn (khoảng 3.200 - 3.800 ký tự / trang)
    if (pages.length === 0) {
      const rawParagraphs = text.split(/\n\s*\n/);
      const TARGET_PAGE_LENGTH = 3200;
      let currentPage = "";

      for (const para of rawParagraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        // Không ngắt trang ở danh sách đánh số \d+\., chỉ ngắt khi gặp tiêu đề lớn H1
        const isMajorHeading = /^#\s+/m.test(trimmed) || /^(chương\s+\d+|phần\s+\d+)/i.test(trimmed);

        if (
          (currentPage.length + trimmed.length > TARGET_PAGE_LENGTH && currentPage.length >= 2000) ||
          (isMajorHeading && currentPage.length >= 2400)
        ) {
          pages.push(currentPage.trim());
          currentPage = trimmed;
        } else {
          currentPage = currentPage ? `${currentPage}\n\n${trimmed}` : trimmed;
        }
      }

      if (currentPage.trim()) {
        pages.push(currentPage.trim());
      }
    }

    return {
      totalPages: Math.max(1, pages.length),
      pages: pages.length > 0 ? pages : [text],
    };
  } catch (err) {
    console.error("Lỗi khi đọc file DOCX bằng mammoth:", err);
    throw new Error("Không thể bóc tách nội dung file Word (.docx). Vui lòng thử lưu lại file.");
  }
}

/**
 * Trích xuất slide theo từng trang từ file trình chiếu PowerPoint (.pptx)
 */
export async function extractTextFromPptx(file: File): Promise<ExtractedDoc> {
  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    throw new Error("Kích thước file PPTX vượt quá giới hạn tối đa 20MB.");
  }
  try {
    const { default: JSZipLib } = await import("jszip");
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZipLib.loadAsync(arrayBuffer);
    validateZipSafety(zip);

    // Tìm tất cả các slide trong ppt/slides/slide{N}.xml
    const slideEntries: { num: number; file: JSZip.JSZipObject }[] = [];

    zip.forEach((relativePath, zipEntry) => {
      const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
      if (match) {
        slideEntries.push({
          num: parseInt(match[1], 10),
          file: zipEntry,
        });
      }
    });

    slideEntries.sort((a, b) => a.num - b.num);
    if (slideEntries.length > MAX_DOCUMENT_PAGES) {
      throw new Error(`File PowerPoint vượt quá giới hạn ${MAX_DOCUMENT_PAGES} slide.`);
    }

    const pages: string[] = [];

    for (const entry of slideEntries) {
      const xml = await entry.file.async("text");
      // Lấy tất cả văn bản trong thẻ <a:t>...</a:t>
      const textMatches = Array.from(xml.matchAll(/<a:t(?:\s+[^>]*)?>([^<]*)<\/a:t>/gi));
      const slideTexts = textMatches.map((m) => m[1]).filter(Boolean);
      const slideContent = slideTexts.join(" ").replace(/\s+/g, " ").trim();

      pages.push(
        slideContent ? `### Slide ${entry.num}\n\n${slideContent}` : `### Slide ${entry.num}\n\n*(Slide đồ họa/hình ảnh)*`
      );
    }

    return {
      totalPages: Math.max(1, pages.length),
      pages: pages.length > 0 ? pages : ["Không tìm thấy nội dung slide trong file PowerPoint."],
    };
  } catch (err) {
    console.error("Lỗi khi đọc file PPTX bằng JSZip:", err);
    throw new Error("Không thể bóc tách nội dung file PowerPoint (.pptx).");
  }
}

/**
 * Đọc file văn bản thuần túy (.txt, .md, .json)
 */
export async function extractTextFromTextFile(file: File): Promise<ExtractedDoc> {
  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    throw new Error("Kích thước file văn bản vượt quá giới hạn tối đa 30MB.");
  }
  const content = await file.text();
  const lines = content.split("\n");
  const chunkSize = 60; // 60 dòng 1 trang ước lượng
  const pages: string[] = [];

  for (let i = 0; i < lines.length; i += chunkSize) {
    const pageChunk = lines.slice(i, i + chunkSize).join("\n").trim();
    if (pageChunk) pages.push(pageChunk);
  }

  return {
    totalPages: Math.max(1, pages.length),
    pages: pages.length > 0 ? pages : [content.trim()],
  };
}

/**
 * Trích xuất văn bản từ bất kỳ file nào được hỗ trợ (.pdf, .docx, .pptx, .txt, .md)
 */
export async function extractDocumentContent(
  file: File,
  onProgress?: (currentPage: number, totalPages: number) => void
): Promise<ExtractedDoc> {
  const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

  if (ext === ".pdf") {
    return extractTextFromPDF(file, onProgress);
  }

  if (ext === ".docx") {
    return extractTextFromDocx(file);
  }

  if (ext === ".pptx") {
    return extractTextFromPptx(file);
  }

  if (ext === ".txt" || ext === ".md") {
    return extractTextFromTextFile(file);
  }

  return {
    totalPages: 1,
    pages: [`Tài liệu ${file.name}: Định dạng ${ext} chưa hỗ trợ bóc tách trực tiếp.`],
  };
}
