import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import UploadForm from "./UploadForm";

const mockOnUploadComplete = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  mockOnUploadComplete.mockClear();
});

afterEach(cleanup);

describe("UploadForm", () => {
  it("renders drop zone with instructions", () => {
    render(<UploadForm onUploadComplete={mockOnUploadComplete} />);
    expect(screen.getByText(/drop an epub or pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/click to browse/i)).toBeInTheDocument();
  });

  it("has clickable upload area", () => {
    render(<UploadForm onUploadComplete={mockOnUploadComplete} />);
    expect(screen.getByRole("button", { name: "Upload book file" })).toBeInTheDocument();
  });

  it("shows error for unsupported file types on file select", async () => {
    render(<UploadForm onUploadComplete={mockOnUploadComplete} />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    const file = new File(["content"], "test.txt", { type: "text/plain" });

    Object.defineProperty(input, "files", { value: [file], writable: false });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Only EPUB and PDF files are supported."
      );
    });
  });

  it("auto-uploads on file select", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "1" }), { status: 201 })
    );

    render(<UploadForm onUploadComplete={mockOnUploadComplete} />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });

    Object.defineProperty(input, "files", { value: [file], writable: false });
    fireEvent.change(input);

    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalled();
    });
  });

  it("shows error on upload failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Parse failed" }), { status: 422 })
    );

    render(<UploadForm onUploadComplete={mockOnUploadComplete} />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    const file = new File(["content"], "bad.epub", { type: "application/epub+zip" });

    Object.defineProperty(input, "files", { value: [file], writable: false });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Parse failed");
    });
  });

  it("auto-uploads on drag and drop", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "1" }), { status: 201 })
    );

    render(<UploadForm onUploadComplete={mockOnUploadComplete} />);
    const dropZone = screen.getByRole("button", { name: "Upload book file" });

    const file = new File(["content"], "test.epub", { type: "application/epub+zip" });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalled();
    });
  });
});
