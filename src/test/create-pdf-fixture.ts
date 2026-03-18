import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const FIXTURES_DIR = path.join(__dirname, "fixtures");
const pdfPath = path.join(FIXTURES_DIR, "test.pdf");

if (!fs.existsSync(pdfPath)) {
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  doc.fontSize(20).text("Chapter One", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text("The quick brown fox jumps over the lazy dog.");
  doc.text("This is the second paragraph of chapter one.");

  doc.addPage();
  doc.fontSize(20).text("Chapter Two", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text("Speed reading is a collection of techniques used to increase reading speed.");

  doc.end();
  stream.on("finish", () => console.log("Created test.pdf"));
}
