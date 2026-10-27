// client/src/services/pdfService.ts — Bóc tách nội dung PDF/DOCX/PPTX chuẩn xác phía trình duyệt (Client-side)
// Tách rõ ràng 2 khái niệm:
//   1. pages: danh sách trang THẬT dùng để hiển thị và trình chiếu (total_pages = số trang thật).
//   2. chunks: các đoạn text ~1.500 ký tự dùng cho AI RAG, mỗi chunk bắt buộc có page là số trang thật chứa nó.
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import JSZip from "jszip";
import { renderAsync } from "docx-preview";

// Cấu hình worker cho pdfjs-dist trong môi trường trình duyệt Vite
if (typeof window !== "undefined") {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.8.69"}/pdf.worker.min.mjs`;
  } catch (err) {
    console.warn("Không thể tải PDF worker từ CDN, fallback worker nội bộ:", err);
  }
}

export interface DocumentPage {
  page: number; // Số trang thật (1-based: 1, 2, 3...)
  text: string; // Nội dung trang thật
}

export interface DocumentChunk {
  page: number; // Số trang thật chứa chunk này
  text: string; // Đoạn text ~1.500 ký tự dùng cho AI
}

export interface ExtractedDoc {
  totalPages: number;
  pages: DocumentPage[];
  chunks: DocumentChunk[];
}

export type ProgressCallback = (current: number, total: number, message?: string) => void;

/**
 * Tạo danh sách chunks ~1.500 ký tự từ danh sách các trang thật.
 * Nguyên tắc bất di bất dịch:
 * - Mỗi chunk bắt buộc có page là số trang thật chứa nó.
 * - Tách theo ranh giới trang, TUYỆT ĐỐI không gộp text xuyên trang.
 */
export function buildChunksFromPages(pages: DocumentPage[], maxChunkLen = 1500): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  for (const p of pages) {
    const text = (p.text || "").trim();
    if (!text) continue;

    // Nếu trang ngắn hơn hoặc bằng 1.500 ký tự thì 1 trang = 1 chunk
    if (text.length <= maxChunkLen) {
      chunks.push({ page: p.page, text });
      continue;
    }

    // Nếu trang dài hơn 1.500 ký tự, tách nhỏ theo đoạn văn hoặc câu nhưng vẫn giữ đúng page_number
    const paragraphs = text.split(/\n\s*\n/);
    let currentChunk = "";

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      if (trimmedPara.length > maxChunkLen) {
        if (currentChunk) {
          chunks.push({ page: p.page, text: currentChunk.trim() });
          currentChunk = "";
        }
        let remaining = trimmedPara;
        while (remaining.length > maxChunkLen) {
          let breakIdx = remaining.lastIndexOf(". ", maxChunkLen);
          if (breakIdx === -1 || breakIdx < 500) {
            breakIdx = remaining.lastIndexOf(" ", maxChunkLen);
          }
          if (breakIdx === -1) {
            breakIdx = maxChunkLen;
          } else {
            breakIdx += 1;
          }
          chunks.push({ page: p.page, text: remaining.slice(0, breakIdx).trim() });
          remaining = remaining.slice(breakIdx).trim();
        }
        if (remaining) {
          currentChunk = remaining;
        }
      } else if (currentChunk.length + trimmedPara.length + 2 > maxChunkLen) {
        chunks.push({ page: p.page, text: currentChunk.trim() });
        currentChunk = trimmedPara;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({ page: p.page, text: currentChunk.trim() });
    }
  }

  return chunks;
}

/**
 * Làm sạch mã đánh dấu HTML nội bộ của Word (bookmark <a id="_Toc..."></a>, anchor rỗng, v.v.)
 */
export function sanitizeExtractedText(text: string): string {
  if (!text) return "";
  return text
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
 * Trích xuất và đẩy ảnh Base64 lên Supabase Storage bucket 'slides' (nếu có backend),
 * hoặc thay thế bằng placeholder tối ưu để không làm phình cơ sở dữ liệu.
 */
export async function uploadExtractedImagesFromMarkdown(markdownText: string): Promise<string> {
  if (!markdownText || !markdownText.includes("data:image/")) {
    return markdownText;
  }

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
    const apiBase = (import.meta.env?.VITE_API_URL as string) || "";
    const uploadUrl = apiBase ? `${apiBase.replace(/\/$/, "")}/api/documents/upload-images` : "/api/documents/upload-images";

    const response = await fetch(uploadUrl, {
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

  let fallbackMarkdown = markdownText;
  imageMatches.forEach((img, idx) => {
    fallbackMarkdown = fallbackMarkdown.split(img.fullUri).join(`[Hình ảnh minh họa ${idx + 1}]`);
  });
  return fallbackMarkdown;
}

/**
 * 1. PDF Parser (dùng pdfjs-dist)
 * - Lấy pdf.numPages: 1 trang PDF = 1 trang thật
 * - Lặp từng trang getPage(i).getTextContent()
 * - Ghép text theo thứ tự đọc (giữ xuống dòng theo toạ độ y)
 * - Xử lý tuần tự từng trang không treo giao diện, báo tiến trình i/N
 * - Báo lỗi chi tiết bằng tiếng Việt nếu có mật khẩu, file hỏng hoặc dạng scan không có text
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: ProgressCallback
): Promise<ExtractedDoc> {
  let pdf: any;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: true,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    pdf = await loadingTask.promise;
  } catch (err: any) {
    if (err?.name === "PasswordException") {
      throw new Error("File PDF này có mật khẩu bảo vệ. Vui lòng mở khóa file trước khi tải lên.");
    }
    if (err?.name === "InvalidPDFException") {
      throw new Error("File PDF bị hỏng hoặc không đúng định dạng chuẩn.");
    }
    console.error("Lỗi khi nạp file PDF:", err);
    throw new Error(err?.message || "Không thể mở file PDF. Vui lòng kiểm tra lại file.");
  }

  const totalPages = pdf.numPages;
  if (!totalPages || totalPages <= 0) {
    throw new Error("File PDF không có trang nào.");
  }

  const pages: DocumentPage[] = [];
  let totalExtractedChars = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum, totalPages, `Đang đọc trang ${pageNum}/${totalPages}...`);

    // Giải phóng microtask để UI mượt mà, không treo giao diện với file lớn
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Ghép text theo thứ tự đọc và giữ xuống dòng theo toạ độ y
      let pageText = "";
      let lastY: number | null = null;
      let lineText = "";

      for (const item of textContent.items as any[]) {
        if (!("str" in item) || !item.str) continue;

        const str = item.str;
        // item.transform = [scaleX, skewY, skewX, scaleY, transX, transY]
        const currentY = Array.isArray(item.transform) ? item.transform[5] : null;

        if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
          // Sang dòng mới
          if (lineText.trim()) {
            pageText += (pageText ? "\n" : "") + lineText.trim();
          }
          lineText = str;
        } else {
          if (lineText && !lineText.endsWith(" ") && !str.startsWith(" ")) {
            lineText += " ";
          }
          lineText += str;
        }

        if (currentY !== null) {
          lastY = currentY;
        }
      }

      if (lineText.trim()) {
        pageText += (pageText ? "\n" : "") + lineText.trim();
      }

      const cleanText = pageText.trim();
      if (cleanText) {
        totalExtractedChars += cleanText.length;
        pages.push({ page: pageNum, text: cleanText });
      } else {
        pages.push({
          page: pageNum,
          text: `[Trang ${pageNum}: Tài liệu dạng hình ảnh scan - không trích xuất được văn bản]`,
        });
      }
    } catch (pageErr) {
      console.warn(`Lỗi bóc tách trang ${pageNum}:`, pageErr);
      pages.push({
        page: pageNum,
        text: `[Trang ${pageNum}: Không thể đọc được nội dung trang này]`,
      });
    }
  }

  // Cảnh báo nếu PDF toàn ảnh scan không có text
  if (totalExtractedChars === 0) {
    console.warn("Cảnh báo: File PDF không trích xuất được văn bản (có thể là ảnh scan).");
  }

  const chunks = buildChunksFromPages(pages);
  return { totalPages, pages, chunks };
}

/**
 * 2. PPTX Parser (dùng JSZip)
 * - Đọc ppt/slides/slideN.xml
 * - Sắp xếp theo số N tăng dần (tránh slide10 đứng trước slide2)
 * - 1 slide = 1 trang thật
 * - Lấy text trong thẻ <a:t>, mỗi <a:p> là 1 dòng
 * - Đọc thêm ppt/notesSlides nếu có để lưu làm ghi chú
 */
export async function extractTextFromPptx(
  file: File,
  onProgress?: ProgressCallback
): Promise<ExtractedDoc> {
  let zip: JSZip;
  try {
    const arrayBuffer = await file.arrayBuffer();
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (err: any) {
    console.error("Lỗi khi giải nén PPTX bằng JSZip:", err);
    throw new Error("Không thể mở file PowerPoint (.pptx). File có thể bị hỏng hoặc có mật khẩu.");
  }

  // 1. Tìm tất cả các slide trong ppt/slides/slide{N}.xml
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

  if (slideEntries.length === 0) {
    throw new Error("Không tìm thấy slide nào trong file PowerPoint (.pptx).");
  }

  // 2. SẮP XẾP THEO SỐ N TĂNG DẦN (sắp xếp số học, không sắp theo chuỗi alphabet)
  slideEntries.sort((a, b) => a.num - b.num);

  const totalPages = slideEntries.length;
  const pages: DocumentPage[] = [];

  for (let idx = 0; idx < slideEntries.length; idx++) {
    const entry = slideEntries[idx];
    const pageNum = idx + 1; // 1-based index theo thứ tự slide

    onProgress?.(pageNum, totalPages, `Đang xử lý slide ${pageNum}/${totalPages}...`);
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const xml = await entry.file.async("text");

      // Mỗi <a:p> là một dòng
      const paragraphMatches = Array.from(xml.matchAll(/<a:p(?:\s+[^>]*)?>([\s\S]*?)<\/a:p>/gi));
      const lines: string[] = [];

      for (const pMatch of paragraphMatches) {
        const pContent = pMatch[1];
        // Lấy tất cả văn bản trong thẻ <a:t>...</a:t> bên trong đoạn này
        const tMatches = Array.from(pContent.matchAll(/<a:t(?:\s+[^>]*)?>([^<]*)<\/a:t>/gi));
        const lineStr = tMatches.map((m) => m[1]).join("").trim();
        if (lineStr) {
          lines.push(lineStr);
        }
      }

      let slideText = lines.join("\n").trim();

      // Kiểm tra xem có ghi chú tương ứng trong ppt/notesSlides/ không
      try {
        const noteFile =
          zip.file(`ppt/notesSlides/notesSlide${entry.num}.xml`) ||
          zip.file(`ppt/notesSlides/notesSlide${pageNum}.xml`);
        if (noteFile) {
          const noteXml = await noteFile.async("text");
          const noteMatches = Array.from(noteXml.matchAll(/<a:t(?:\s+[^>]*)?>([^<]*)<\/a:t>/gi));
          const noteLines = noteMatches
            .map((m) => m[1])
            .filter((t) => t && !t.includes("Slide") && isNaN(Number(t)));
          if (noteLines.length > 0) {
            const noteText = noteLines.join(" ").replace(/\s+/g, " ").trim();
            if (noteText) {
              slideText += `\n\n*(Ghi chú người thuyết trình: ${noteText})*`;
            }
          }
        }
      } catch {
        // Ghi chú là tuỳ chọn, bỏ qua nếu lỗi
      }

      if (!slideText) {
        slideText = `### Slide ${pageNum}\n\n*(Slide đồ họa hoặc hình ảnh không có văn bản)*`;
      } else {
        slideText = `### Slide ${pageNum}\n\n${slideText}`;
      }

      pages.push({ page: pageNum, text: slideText });
    } catch (slideErr) {
      console.warn(`Lỗi bóc tách slide ${pageNum}:`, slideErr);
      pages.push({
        page: pageNum,
        text: `### Slide ${pageNum}\n\n*(Không thể đọc được nội dung slide)*`,
      });
    }
  }

  const chunks = buildChunksFromPages(pages);
  return { totalPages, pages, chunks };
}

/**
 * 3. DOCX Parser (dùng docx-preview render ngoài màn hình, đếm section.docx = 1 trang)
 * - Fallback: đọc docProps/app.xml lấy thẻ <Pages> làm total_pages và chia đều text
 * - Ghi log cảnh báo khi dùng fallback
 */
export async function extractTextFromDocx(
  file: File,
  onProgress?: ProgressCallback
): Promise<ExtractedDoc> {
  const arrayBuffer = await file.arrayBuffer();
  let pages: DocumentPage[] = [];
  let useFallback = false;

  // Tạo container ẩn ngoài màn hình để docx-preview render phân trang chuẩn xác
  const container = document.createElement("div");
  container.id = "pm-docx-hidden-container-" + Date.now();
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "-99999px";
  container.style.width = "816px"; // Khổ giấy Letter 8.5in x 96dpi tiêu chuẩn của Word
  container.style.visibility = "hidden";
  container.style.pointerEvents = "none";
  container.style.zIndex = "-9999";
  document.body.appendChild(container);

  try {
    onProgress?.(1, 1, "Đang dựng trang Word với docx-preview...");
    await renderAsync(arrayBuffer, container, undefined, {
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
    });

    // Đếm các phần tử section.docx (mỗi phần tử = 1 trang chuẩn)
    const sections = container.querySelectorAll("section.docx");
    if (sections.length > 0) {
      pages = Array.from(sections).map((sec, idx) => {
        const raw = (sec as HTMLElement).innerText || sec.textContent || "";
        const clean = sanitizeExtractedText(raw.trim());
        return {
          page: idx + 1,
          text: clean || `Trang ${idx + 1}`,
        };
      });
    } else {
      useFallback = true;
    }
  } catch (renderErr) {
    console.warn("docx-preview render thất bại, đang chuyển sang fallback docProps/app.xml:", renderErr);
    useFallback = true;
  } finally {
    container.remove();
  }

  // Fallback: nếu render lỗi hoặc không lấy được section.docx
  if (useFallback || pages.length === 0) {
    console.warn("CẢNH BÁO: Đang sử dụng fallback phân trang DOCX qua docProps/app.xml");

    let declaredPages = 1;
    try {
      const zip = await JSZip.loadAsync(arrayBuffer);
      const appXml = await zip.file("docProps/app.xml")?.async("text");
      if (appXml) {
        const match = appXml.match(/<Pages>(\d+)<\/Pages>/i);
        if (match) {
          declaredPages = Math.max(1, parseInt(match[1], 10));
        }
      }
    } catch (zipErr) {
      console.warn("Lỗi đọc docProps/app.xml từ DOCX:", zipErr);
    }

    // Lấy toàn bộ văn bản qua mammoth
    let fullText = "";
    try {
      const result = await (mammoth as any).extractRawText({ arrayBuffer });
      fullText = sanitizeExtractedText((result?.value || "").trim());
    } catch {
      // Fallback nếu mammoth lỗi
    }

    if (!fullText) {
      pages = [{ page: 1, text: "Tài liệu Word (.docx) không chứa văn bản hoặc chỉ có hình ảnh." }];
    } else if (declaredPages > 1) {
      // Chia đều text theo số trang declaredPages
      pages = [];
      const chunkSize = Math.ceil(fullText.length / declaredPages);
      for (let i = 0; i < declaredPages; i++) {
        const slice = fullText.slice(i * chunkSize, (i + 1) * chunkSize).trim();
        pages.push({
          page: i + 1,
          text: slice || `Trang ${i + 1}`,
        });
      }
    } else {
      pages = [{ page: 1, text: fullText }];
    }
  }

  const totalPages = Math.max(1, pages.length);
  const chunks = buildChunksFromPages(pages);
  return { totalPages, pages, chunks };
}

/**
 * 4. Đọc file văn bản thuần túy (.txt, .md)
 */
export async function extractTextFromTextFile(file: File): Promise<ExtractedDoc> {
  const content = await file.text();
  const lines = content.split("\n");
  const chunkSize = 50; // Ước tính 50 dòng/trang
  const pages: DocumentPage[] = [];

  let pageNum = 1;
  for (let i = 0; i < lines.length; i += chunkSize) {
    const pageText = lines.slice(i, i + chunkSize).join("\n").trim();
    if (pageText) {
      pages.push({ page: pageNum++, text: pageText });
    }
  }

  if (pages.length === 0) {
    pages.push({ page: 1, text: content.trim() || "Tài liệu trống" });
  }

  const totalPages = pages.length;
  const chunks = buildChunksFromPages(pages);
  return { totalPages, pages, chunks };
}

/**
 * Router trích xuất chính cho tất cả các định dạng
 * Kiểm tra định dạng và báo lỗi rõ ràng nếu gặp .doc (định dạng Word cũ)
 */
export async function extractDocumentContent(
  file: File,
  onProgress?: ProgressCallback
): Promise<ExtractedDoc> {
  const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

  // DOC cũ: Trình duyệt không đọc được -> Báo lỗi rõ ràng tiếng Việt theo yêu cầu
  if (ext === ".doc") {
    throw new Error("Vui lòng lưu file thành .docx hoặc .pdf rồi tải lên lại");
  }

  if (ext === ".pdf") {
    return extractTextFromPDF(file, onProgress);
  }

  if (ext === ".docx") {
    return extractTextFromDocx(file, onProgress);
  }

  if (ext === ".pptx") {
    return extractTextFromPptx(file, onProgress);
  }

  if (ext === ".txt" || ext === ".md") {
    return extractTextFromTextFile(file);
  }

  throw new Error(`Định dạng "${ext}" chưa được hỗ trợ. Vui lòng tải file PDF, DOCX hoặc PPTX.`);
}
