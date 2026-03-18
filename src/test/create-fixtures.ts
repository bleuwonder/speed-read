import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import archiver from "archiver";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

// Create a minimal valid EPUB (it's just a zip with specific structure)
async function createTestEpub() {
  const epubPath = path.join(FIXTURES_DIR, "test.epub");
  if (fs.existsSync(epubPath)) return;

  const output = fs.createWriteStream(epubPath);
  const archive = archiver("zip", { store: true });
  archive.pipe(output);

  // mimetype must be first, uncompressed
  archive.append("application/epub+zip", { name: "mimetype" });

  archive.append(
    `<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    { name: "META-INF/container.xml" }
  );

  archive.append(
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test Book</dc:title>
    <dc:creator>Test Author</dc:creator>
    <dc:identifier id="uid">test-book-001</dc:identifier>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="toc">
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`,
    { name: "OEBPS/content.opf" }
  );

  archive.append(
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <navMap>
    <navPoint id="ch1" playOrder="1">
      <navLabel><text>Chapter One</text></navLabel>
      <content src="chapter1.xhtml"/>
    </navPoint>
    <navPoint id="ch2" playOrder="2">
      <navLabel><text>Chapter Two</text></navLabel>
      <content src="chapter2.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`,
    { name: "OEBPS/toc.ncx" }
  );

  archive.append(
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter One</title></head>
<body>
<h1>Chapter One</h1>
<p>The quick brown fox jumps over the lazy dog.</p>
<p>This is the second paragraph of chapter one.</p>
</body>
</html>`,
    { name: "OEBPS/chapter1.xhtml" }
  );

  archive.append(
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter Two</title></head>
<body>
<h1>Chapter Two</h1>
<p>Speed reading is a collection of techniques used to increase reading speed.</p>
</body>
</html>`,
    { name: "OEBPS/chapter2.xhtml" }
  );

  await archive.finalize();
  await new Promise((resolve) => output.on("close", resolve));
  console.log("Created test.epub");
}

createTestEpub().catch(console.error);
