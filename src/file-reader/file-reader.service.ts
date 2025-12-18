import { Injectable } from "@nestjs/common";
import * as mammoth from "mammoth";
import * as pdfParseLib from "pdf-parse";

@Injectable()
export class FileReaderService {
  /**
   * Extract text content from a file buffer
   * @param buffer - File buffer
   * @param mimeType - File MIME type (e.g., 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
   * @returns Extracted text content
   */
  async extractTextFromBuffer(
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    // Determine file type from MIME type
    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      // DOCX or DOC file
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    if (mimeType === "application/pdf") {
      // PDF file
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(buffer);
      return data.text;
    }

    if (mimeType === "text/plain" || mimeType === "text/markdown") {
      // Plain text or markdown
      return buffer.toString("utf-8");
    }

    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  /**
   * Extract text from a Multer file
   * @param file - Express.Multer.File
   * @returns Extracted text content
   */
  async extractTextFromFile(file: Express.Multer.File): Promise<string> {
    if (!file.buffer) {
      throw new Error("File buffer is not available");
    }

    return this.extractTextFromBuffer(file.buffer, file.mimetype);
  }
}
