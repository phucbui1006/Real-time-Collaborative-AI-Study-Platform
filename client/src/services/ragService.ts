// client/src/services/ragService.ts — Thuật toán RAG tìm kiếm ngữ cảnh trang tài liệu thông minh
// Lọc ra các trang/đoạn sát nhất với câu hỏi của sinh viên để gửi cho Gemini kèm nguồn trích dẫn

export interface RelevantChunk {
  pageNumber: number;
  text: string;
  score: number;
}

// Từ dừng phổ biến tiếng Việt để lọc nhiễu khi so khớp từ khóa
const VI_STOP_WORDS = new Set([
  "là", "của", "và", "các", "những", "trong", "để", "với", "cho", "về",
  "khi", "có", "được", "này", "đó", "thì", "mà", "ở", "tại", "từ",
  "như", "hay", "hoặc", "một", "bị", "bởi", "do", "bạn", "mình",
  "gì", "sao", "thế", "nào", "hỏi", "biết", "xin", "giúp"
]);

/**
 * Tách từ khóa quan trọng từ câu hỏi
 */
function extractKeywords(query: string): string[] {
  const clean = query
    .toLowerCase()
    .replace(/[/\\?%*:|"<>.,!()[\]{}_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = clean.split(" ").filter((w) => w.length > 1 && !VI_STOP_WORDS.has(w));
  return Array.from(new Set(words));
}

/**
 * Tìm các trang liên quan nhất trong tài liệu dựa trên thuật toán TF-IDF / Term Matching kết hợp nhận diện số trang
 */
export function findRelevantPages(
  query: string,
  pages: string[],
  topK = 4,
  currentPage?: number
): RelevantChunk[] {
  if (!pages || pages.length === 0) return [];
  if (pages.length <= topK) {
    return pages.map((text, idx) => ({
      pageNumber: idx + 1,
      text,
      score: 1.0,
    }));
  }

  // 1. Kiểm tra xem người dùng có chỉ định số trang cụ thể không (ví dụ: "trang 3", "trang số 3", "page 3", "slide 3")
  const pageMatch = query.match(/(?:trang|page|slide|mục)\s*(?:số\s*)?(\d+)/i);
  if (pageMatch) {
    const targetPageNum = parseInt(pageMatch[1], 10);
    if (targetPageNum >= 1 && targetPageNum <= pages.length) {
      const chunks: RelevantChunk[] = [
        {
          pageNumber: targetPageNum,
          text: pages[targetPageNum - 1],
          score: 100,
        },
      ];
      // Bổ sung thêm trang kế tiếp hoặc trước đó để AI có mạch ngữ cảnh nếu cần
      if (topK > 1 && targetPageNum < pages.length) {
        chunks.push({
          pageNumber: targetPageNum + 1,
          text: pages[targetPageNum],
          score: 50,
        });
      }
      if (topK > 2 && targetPageNum > 1) {
        chunks.unshift({
          pageNumber: targetPageNum - 1,
          text: pages[targetPageNum - 2],
          score: 40,
        });
      }
      return chunks.slice(0, topK);
    }
  }

  // 2. Nếu người dùng hỏi về "trang này", "slide này" và có currentPage hợp lệ
  if (currentPage && currentPage >= 1 && currentPage <= pages.length) {
    const lowerQuery = query.toLowerCase();
    if (
      lowerQuery.includes("trang này") ||
      lowerQuery.includes("slide này") ||
      lowerQuery.includes("đoạn này") ||
      lowerQuery.includes("nội dung này") ||
      lowerQuery.includes("hiện tại")
    ) {
      return [
        {
          pageNumber: currentPage,
          text: pages[currentPage - 1],
          score: 100,
        },
      ];
    }
  }

  // 3. TF-IDF / Term Matching
  const keywords = extractKeywords(query);
  if (keywords.length === 0) {
    if (currentPage && currentPage >= 1 && currentPage <= pages.length) {
      return [
        {
          pageNumber: currentPage,
          text: pages[currentPage - 1],
          score: 1.0,
        },
      ];
    }
    return pages.slice(0, topK).map((text, idx) => ({
      pageNumber: idx + 1,
      text,
      score: 0.5,
    }));
  }

  const scoredPages: RelevantChunk[] = pages.map((pageText, idx) => {
    const textLower = pageText.toLowerCase();
    let score = 0;

    for (const kw of keywords) {
      if (textLower.includes(kw)) {
        // Tần suất xuất hiện
        const count = textLower.split(kw).length - 1;
        score += count * (kw.length > 4 ? 2.5 : 1.5);

        // Điểm thưởng nếu xuất hiện ở đầu trang (thường là tiêu đề hoặc khái niệm cốt lõi)
        const firstPos = textLower.indexOf(kw);
        if (firstPos < 200) {
          score += 2.0;
        }
      }
    }

    // Nếu trang này thuần túy là trang Mục lục (chứa danh mục đề mục), giảm nhẹ điểm để ưu tiên trang nội dung thực tế
    const isTocPage = textLower.includes("mục lục") || textLower.includes("_toc") || (textLower.match(/\.{4,}/g)?.length || 0) > 3;
    if (isTocPage && score > 0) {
      score = score * 0.4;
    }

    // Nếu là trang người dùng đang mở, ưu tiên nhẹ
    if (currentPage && idx === currentPage - 1 && score > 0) {
      score += 3.0;
    }

    return {
      pageNumber: idx + 1,
      text: pageText,
      score,
    };
  });

  // Sắp xếp theo điểm liên quan giảm dần
  scoredPages.sort((a, b) => b.score - a.score);

  // Lọc ra các trang có điểm > 0 hoặc lấy tối thiểu trang top 1
  const topResults = scoredPages.filter((p) => p.score > 0).slice(0, topK);

  if (topResults.length === 0) {
    if (currentPage && currentPage >= 1 && currentPage <= pages.length) {
      return [
        {
          pageNumber: currentPage,
          text: pages[currentPage - 1],
          score: 1.0,
        },
      ];
    }
    return scoredPages.slice(0, topK);
  }

  // Sắp xếp lại kết quả theo thứ tự số trang tự nhiên để AI dễ đọc theo mạch
  return topResults.sort((a, b) => a.pageNumber - b.pageNumber);
}

/**
 * Định dạng khối ngữ cảnh RAG hoàn chỉnh đưa vào Prompt cho Gemini
 */
export function buildRAGContext(chunks: RelevantChunk[]): string {
  if (chunks.length === 0) return "Tài liệu chưa có nội dung văn bản bóc tách.";

  return chunks
    .map(
      (c) => {
        // Làm sạch chuỗi Base64 ảnh và định dạng liên kết ảnh để AI nhận ngữ cảnh văn bản thuần khiết, phản hồi nhanh và chuẩn xác
        const cleanText = c.text
          .replace(/!\[(.*?)\]\(data:image\/[^;]+;base64,[A-Za-z0-9+/=\s\\]+\)/g, "[Hình ảnh minh họa: $1]")
          .replace(/!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, "[Hình ảnh minh họa: $1]");
        return `--- [TRANG ${c.pageNumber}] ---\n${cleanText.slice(0, 3500)}`;
      }
    )
    .join("\n\n");
}
