// client/src/services/pdfService.ts — Bóc tách nội dung PDF/DOCX/PPTX thực tế phía trình duyệt (Client-side)
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import JSZip from "jszip";

// Cấu hình worker cho pdfjs-dist trong môi trường trình duyệt Vite
if (typeof window !== "undefined") {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.8.69"}/pdf.worker.min.mjs`;
  } catch (err) {
    console.warn("Không thể tải PDF worker từ CDN, fallback worker nội bộ:", err);
  }
}

export interface ExtractedDoc {
  totalPages: number;
  pages: string[];
}

/**
 * Trích xuất text từng trang từ file PDF thực tế
 */
export async function extractTextFromPDF(file: File): Promise<ExtractedDoc> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: true,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    const pages: string[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        pages.push(pageText || `Trang ${pageNum} (Tài liệu dạng hình ảnh hoặc không có văn bản chọn lọc)`);
      } catch (pageErr) {
        console.warn(`Lỗi bóc tách trang ${pageNum}:`, pageErr);
        pages.push(`Trang ${pageNum}`);
      }
    }

    return { totalPages, pages };
  } catch (err) {
    console.error("Lỗi khi đọc file PDF bằng pdfjs-dist:", err);
    throw new Error("Không thể bóc tách nội dung file PDF. File có thể bị khóa hoặc lỗi định dạng.");
  }
}

/**
 * Trích xuất nội dung văn bản thực tế từ file Word (.docx) và phân trang thông minh
 */
export async function extractTextFromDocx(file: File): Promise<ExtractedDoc> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // 1. Chuyển đổi DOCX sang Markdown nhằm giữ nguyên tiêu đề (#, ##), danh sách, bảng biểu
    let text = "";
    try {
      const mdResult = await (mammoth as any).convertToMarkdown({ arrayBuffer });
      text = (mdResult?.value || "").trim();
    } catch {
      // Fallback
    }

    // 2. Nếu Markdown rỗng, thử trích xuất Raw Text
    if (!text) {
      const rawResult = await (mammoth as any).extractRawText({ arrayBuffer });
      text = (rawResult?.value || "").trim();
    }

    if (!text) {
      return {
        totalPages: 1,
        pages: ["Tài liệu Word (.docx) này không chứa văn bản hoặc chứa toàn bộ là hình ảnh."],
      };
    }

    // 3. Phân trang thông minh cho tài liệu Word:
    // Tiêu chuẩn 1 trang A4 Word: ~1,400 - 1,800 ký tự (khoảng 250 - 350 từ).
    // Tách theo đoạn văn và tiêu đề để các phần không bị ngắt quãng vô lý.
    const rawParagraphs = text.split(/\n\s*\n/);
    const pages: string[] = [];
    let currentPage = "";
    const TARGET_PAGE_LENGTH = 1500;

    for (const para of rawParagraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      const isHeading = /^#{1,3}\s/.test(trimmed) || /^(chương|bài|phần|mục|\d+\.)/i.test(trimmed);

      // Nếu đoạn văn bản khiến trang vượt độ dài mục tiêu, hoặc gặp Tiêu đề lớn khi trang đã có nội dung
      if (
        (currentPage.length + trimmed.length > TARGET_PAGE_LENGTH && currentPage.length > 500) ||
        (isHeading && currentPage.length > 800)
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
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

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
export async function extractDocumentContent(file: File): Promise<ExtractedDoc> {
  const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

  if (ext === ".pdf") {
    return extractTextFromPDF(file);
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
